import { config } from '@/utils/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import geoip from 'geoip-lite';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { UAParser } from 'ua-parser-js';
interface LoginRequest {
    email: string;
    password: string;
    totpToken?: string | null;
    ipAddress: string;
    userAgent?: string | null;
}

interface SessionInfo {
    userId: string;
    ipAddress: string;
    userAgent?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    deviceId?: string;
    browserName?: string;
    browserVersion?: string;
    osName?: string;
    osVersion?: string;
    deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'BOT' | 'UNKNOWN';
    isMobile: boolean;
    isBot: boolean;
    riskScore: number;
}

export class AuthService {
    private prisma: PrismaClient;
    private jwtSecret: string;
    private jwtExpiresIn: string;
    private refreshTokenExpiresIn: string;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.jwtSecret = config.JWT_SECRET || 'your-secret-key';
        this.jwtExpiresIn = config.JWT_EXPIRES_IN || '15m';
        this.refreshTokenExpiresIn = config.REFRESH_TOKEN_EXPIRES_IN || '7d';
    }

    /**
     * Register a new user
     */
    async register(data: {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        role?: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
        ipAddress: string;
        userAgent?: string;
    }) {
        const hashedPassword = await bcrypt.hash(data.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: hashedPassword,
                firstName: data.firstName || null,
                lastName: data.lastName || null,
                username: data.username || null,
                role: data.role || 'ADMIN',
            },
        });

        // Log the registration
        await this.logAuditEvent({
            userId: user.id,
            action: 'USER_REGISTERED',
            resource: 'user',
            resourceId: user.id,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent || '',
        });

        return user;
    }

    /**
     * Authenticate user and create session
     */
    async login(loginData: LoginRequest) {
        const { email, password, totpToken, ipAddress, userAgent } = loginData;

        try {
            // Check for too many failed attempts before starting a transaction
            await this.checkBruteForce(email, ipAddress);

            // Start a transaction to ensure atomicity
            return await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({
                    where: { email },
                });

                if (!user || !user.isActive) {
                    await this.logLoginAttempt({
                        email,
                        success: false,
                        failureReason: 'USER_NOT_FOUND',
                        ipAddress,
                        userAgent: userAgent ?? '',
                    });
                    throw new Error('Invalid credentials');
                }

                const validPassword = await bcrypt.compare(password, user.passwordHash);
                if (!validPassword) {
                    await this.logLoginAttempt({
                        userId: user.id,
                        email,
                        success: false,
                        failureReason: 'INVALID_PASSWORD',
                        ipAddress,
                        userAgent: userAgent ?? '',
                    });
                    throw new Error('Invalid credentials');
                }

                // Check 2FA if enabled
                if (user.twoFactorEnabled && user.twoFactorSecret) {
                    if (!totpToken) {
                        throw new Error('2FA token required');
                    }

                    const verified = speakeasy.totp.verify({
                        secret: user.twoFactorSecret,
                        encoding: 'base32',
                        token: totpToken,
                        window: 2,
                    });

                    if (!verified) {
                        await this.logLoginAttempt({
                            userId: user.id,
                            email,
                            success: false,
                            failureReason: 'INVALID_2FA',
                            ipAddress,
                            userAgent: userAgent ?? '',
                        });
                        throw new Error('Invalid 2FA token');
                    }
                }

                // Create session
                const sessionInfo = this.extractSessionInfo(user.id, ipAddress, userAgent ?? '');
                const session = await this.createSession(user.id, sessionInfo, tx);

                // Update user last login
                await tx.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });

                // Log successful login
                await this.logLoginAttempt({
                    userId: user.id,
                    email,
                    success: true,
                    ipAddress,
                    userAgent: userAgent ?? '',
                });

                await this.logAuditEvent({
                    userId: user.id,
                    action: 'LOGIN',
                    ipAddress,
                    userAgent: userAgent ?? '',
                    details: {
                        sessionId: session.id,
                        location: `${sessionInfo.city}, ${sessionInfo.region}, ${sessionInfo.country}`,
                    },
                });

                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                    },
                    accessToken: session.token,
                    refreshToken: session.refreshToken,
                    expiresAt: session.expiresAt,
                };
            });
        } catch (error) {
            // Assess security threat outside of the transaction
            await this.assessSecurityThreat(email, ipAddress, userAgent ?? '');
            throw error;
        }
    }

    /**
     * Create a new session
     */
    private async createSession(
        userId: string,
        sessionInfo: SessionInfo,
        prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
    ) {
        const accessToken = this.generateAccessToken(userId);
        const refreshToken = this.generateRefreshToken();

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + this.parseTimeToSeconds(this.jwtExpiresIn));

        const refreshExpiresAt = new Date();
        refreshExpiresAt.setSeconds(refreshExpiresAt.getSeconds() + this.parseTimeToSeconds(this.refreshTokenExpiresIn));

        return await prisma.session.create({
            data: {
                userId,
                token: accessToken,
                refreshToken,
                expiresAt,
                refreshExpiresAt,
                ipAddress: sessionInfo.ipAddress,
                userAgent: sessionInfo.userAgent ?? '',
                country: sessionInfo.country ?? null,
                region: sessionInfo.region ?? null,
                city: sessionInfo.city ?? null,
                latitude: sessionInfo.latitude ?? null,
                longitude: sessionInfo.longitude ?? null,
                timezone: sessionInfo.timezone ?? null,
                deviceId: sessionInfo.deviceId ?? null,
                browserName: sessionInfo.browserName ?? null,
                browserVersion: sessionInfo.browserVersion ?? null,
                osName: sessionInfo.osName ?? null,
                osVersion: sessionInfo.osVersion ?? null,
                deviceType: sessionInfo.deviceType,
                isMobile: sessionInfo.isMobile,
                isBot: sessionInfo.isBot,
                riskScore: sessionInfo.riskScore,
            },
        });
    }

    /**
     * Extract session information from request
     */
    private extractSessionInfo(userId: string, ipAddress: string, userAgent?: string): SessionInfo {
        const geo = geoip.lookup(ipAddress);
        const ua = new UAParser(userAgent);
        const deviceInfo = ua.getResult();

        // Generate device fingerprint
        const deviceId = crypto
            .createHash('md5')
            .update(`${userAgent}-${ipAddress}-${deviceInfo.os.name}-${deviceInfo.browser.name}`)
            .digest('hex');

        // Determine device type
        let deviceType: SessionInfo['deviceType'] = 'UNKNOWN';
        if (deviceInfo.device.type === 'mobile') deviceType = 'MOBILE';
        else if (deviceInfo.device.type === 'tablet') deviceType = 'TABLET';
        else if (deviceInfo.cpu.architecture) deviceType = 'DESKTOP';

        // Bot detection (basic)
        const isBot = this.detectBot(userAgent || '');

        // Risk assessment (basic scoring)
        const riskScore = this.calculateRiskScore({
            isBot,
            unknownLocation: !geo,
            deviceType,
            userAgent: userAgent || '',
        });

        return {
            userId,
            ipAddress,
            userAgent: userAgent ?? '',
            country: geo?.country ?? '',
            region: geo?.region ?? '',
            city: geo?.city ?? '',
            latitude: geo?.ll?.[0] ?? 0,
            longitude: geo?.ll?.[1] ?? 0,
            timezone: geo?.timezone ?? '',
            deviceId,
            browserName: deviceInfo.browser.name ?? '',
            browserVersion: deviceInfo.browser.version ?? '',
            osName: deviceInfo.os.name ?? '',
            osVersion: deviceInfo.os.version ?? '',
            deviceType,
            isMobile: deviceInfo.device.type === 'mobile',
            isBot,
            riskScore,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string, ipAddress: string, userAgent?: string) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true },
        });

        if (!session || !session.isActive || session.refreshExpiresAt! < new Date()) {
            throw new Error('Invalid refresh token');
        }

        // Update session with new access token and activity
        const newAccessToken = this.generateAccessToken(session.userId);
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + this.parseTimeToSeconds(this.jwtExpiresIn));

        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                token: newAccessToken,
                expiresAt,
                lastAccessedAt: new Date(),
                // Update location if it changed
                ipAddress,
                userAgent: userAgent ?? null,
            },
        });

        return {
            accessToken: newAccessToken,
            expiresAt,
        };
    }

    /**
     * Logout user
     */
    async logout(token: string, ipAddress: string, userAgent?: string) {
        const session = await this.prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });

        if (session) {
            await this.prisma.session.update({
                where: { id: session.id },
                data: { isActive: false },
            });

            await this.logAuditEvent({
                userId: session.userId,
                action: 'LOGOUT',
                ipAddress,
                userAgent: userAgent ?? "",
                details: { sessionId: session.id },
            });
        }
    }

    /**
     * Validate session token
     */
    async validateSession(token: string) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };


            const session = await this.prisma.session.findUnique({
                where: { token },
                include: { user: true },
            });

            if (!session || !session.isActive || session.expiresAt < new Date()) {
                return null;
            }

            // Update last accessed time
            await this.prisma.session.update({
                where: { id: session.id },
                data: { lastAccessedAt: new Date() },
            });

            return {
                user: session.user,
                session,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Check for brute force attempts
     */
    private async checkBruteForce(email: string, ipAddress: string) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const recentFailures = await this.prisma.loginAttempt.count({
            where: {
                OR: [{ email }, { ipAddress }],
                success: false,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentFailures >= 5) {
            await this.logSecurityEvent({
                type: 'BRUTE_FORCE_ATTEMPT',
                severity: 'HIGH',
                description: `Multiple failed login attempts for ${email} from ${ipAddress}`,
                ipAddress,
                details: { email, failureCount: recentFailures },
            });
            throw new Error('Too many failed attempts. Please try again later.');
        }
    }

    /**
     * Log login attempt
     */
    private async logLoginAttempt(data: {
        userId?: string;
        email: string;
        success: boolean;
        failureReason?: string;
        ipAddress: string;
        userAgent?: string;
    }) {
        const geo = geoip.lookup(data.ipAddress);
        const isBot = this.detectBot(data.userAgent || '');

        await this.prisma.loginAttempt.create({
            data: {
                userId: data.userId ?? null,
                email: data.email,
                success: data.success,
                failureReason: data.failureReason ?? null,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent ?? null,
                country: geo?.country ?? null,
                region: geo?.region ?? null,
                city: geo?.city ?? null,
                isBot,
                isSuspicious: !data.success && isBot,
                riskScore: this.calculateRiskScore({
                    isBot,
                    unknownLocation: !geo,
                    deviceType: 'UNKNOWN',
                    userAgent: data.userAgent || '',
                }),
            },
        });
    }

    /**
     * Log audit event
     */
    private async logAuditEvent(data: {
        userId?: string;
        action: string;
        resource?: string;
        resourceId?: string;
        ipAddress: string;
        userAgent?: string;
        success?: boolean;
        errorMessage?: string;
        details?: any;
    }) {
        const geo = geoip.lookup(data.ipAddress);

        await this.prisma.auditLog.create({
            data: {
                userId: data.userId ?? null,
                action: data.action,
                resource: data.resource ?? null,
                resourceId: data.resourceId ?? null,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent ?? null,
                country: geo?.country ?? null,
                region: geo?.region ?? null,
                success: data.success ?? true,
                errorMessage: data.errorMessage ?? null,
                details: data.details,
            },
        });
    }

    /**
     * Log security event
     */
    private async logSecurityEvent(data: {
        type: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        description: string;
        ipAddress: string;
        userAgent?: string;
        userId?: string;
        details?: any;
    }) {
        const geo = geoip.lookup(data.ipAddress);

        await this.prisma.securityEvent.create({
            data: {
                type: data.type as any,
                severity: data.severity,
                description: data.description,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent ?? null,
                userId: data.userId ?? null,
                country: geo?.country ?? null,
                region: geo?.region ?? null,
                details: data.details,
            },
        });
    }

    /**
     * Assess security threat
     */
    private async assessSecurityThreat(email: string, ipAddress: string, userAgent?: string) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const recentFailures = await this.prisma.loginAttempt.count({
            where: {
                email,
                success: false,
                createdAt: { gte: oneHourAgo },
            },
        });

        if (recentFailures >= 3) {
            await this.logSecurityEvent({
                type: 'MULTIPLE_FAILED_LOGINS',
                severity: recentFailures >= 10 ? 'CRITICAL' : 'HIGH',
                description: `${recentFailures} failed login attempts for ${email}`,
                ipAddress,
                userAgent: userAgent ?? "",
                details: { email, failureCount: recentFailures },
            });
        }
    }

    /**
     * Utility methods
     */
    private generateAccessToken(userId: string): string {
        const options: jwt.SignOptions = {
            expiresIn: this.parseTimeToSeconds(this.jwtExpiresIn),
        };
        return jwt.sign({ userId }, this.jwtSecret, options);
    }

    private generateRefreshToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private detectBot(userAgent: string): boolean {
        const botPatterns = [
            /bot/i, /crawl/i, /spider/i, /scrape/i,
            /curl/i, /wget/i, /python/i, /java/i,
            /postman/i, /insomnia/i
        ];
        return botPatterns.some(pattern => pattern.test(userAgent));
    }

    private calculateRiskScore(factors: {
        isBot: boolean;
        unknownLocation: boolean;
        deviceType: string;
        userAgent: string;
    }): number {
        let score = 0;

        if (factors.isBot) score += 30;
        if (factors.unknownLocation) score += 20;
        if (factors.deviceType === 'UNKNOWN') score += 15;
        if (!factors.userAgent) score += 25;

        return Math.min(score, 100);
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists, just return success
            return { success: true };
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

        // Delete any existing reset requests for this user
        await this.prisma.passwordReset.deleteMany({
            where: { userId: user.id },
        });

        // Create new password reset request
        await this.prisma.passwordReset.create({
            data: {
                userId: user.id,
                token,
                expiresAt,
            },
        });

        // TODO: Send password reset email with token
        // For now, just return the token (remove this in production)
        return { success: true, token };
    }

    /**
     * Confirm password reset
     */
    async confirmPasswordReset(token: string, newPassword: string) {
        const resetRequest = await this.prisma.passwordReset.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetRequest || resetRequest.expiresAt < new Date()) {
            throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password and delete reset request
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: resetRequest.userId },
                data: { passwordHash: hashedPassword },
            }),
            this.prisma.passwordReset.delete({
                where: { token },
            }),
            // Invalidate all existing sessions for security
            this.prisma.session.deleteMany({
                where: { userId: resetRequest.userId },
            }),
        ]);

        // Log the password reset
        await this.logAuditEvent({
            userId: resetRequest.userId,
            action: 'PASSWORD_RESET',
            resource: 'user',
            resourceId: resetRequest.userId,
            ipAddress: 'system',
            userAgent: 'password-reset',
        });

        return { success: true };
    }

    /**
     * Change user password (requires current password)
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword },
        });

        // Log the password change
        await this.logAuditEvent({
            userId,
            action: 'PASSWORD_CHANGED',
            resource: 'user',
            resourceId: userId,
            ipAddress: 'system',
            userAgent: 'password-change',
        });

        return { success: true };
    }

    private parseTimeToSeconds(time: string): number {
        const match = time.match(/^(\d+)([smhd])$/);
        if (!match) return 900; // Default 15 minutes

        const value = parseInt(match[1] || '0', 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 60 * 60 * 24;
            default:
                return 900;
        }
    }
}