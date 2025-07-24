import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class UserService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async inviteUser(email: string, invitedById: string) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        return this.prisma.userInvitation.create({
            data: {
                email,
                token,
                expiresAt,
                invitedById,
            },
        });
    }

    async acceptInvitation(token: string, data: { password: any; firstName: any; lastName: any; }) {
        const invitation = await this.prisma.userInvitation.findUnique({
            where: { token },
        });

        if (!invitation || invitation.isUsed || invitation.expiresAt < new Date()) {
            throw new Error('Invalid or expired invitation token');
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: invitation.email,
                passwordHash: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                isEmailVerified: true,
            },
        });

        await this.prisma.userInvitation.update({
            where: { id: invitation.id },
            data: { isUsed: true, usedAt: new Date() },
        });

        return user;
    }

    async getUsers() {
        return this.prisma.user.findMany();
    }

    async getUserById(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async updateUser(id: string, data: Partial<User>) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async deleteUser(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }

    async createUser(data: {
        email: string;
        username: string;
        firstName: string;
        lastName: string;
        role: 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';
        phoneNumber?: string;
        timezone?: string;
        language?: string;
    }) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.username }
                ]
            }
        });

        if (existingUser) {
            throw new Error('User with this email or username already exists');
        }

        // Generate a temporary password
        const temporaryPassword = crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                phoneNumber: data.phoneNumber || null,
                timezone: data.timezone || null,
                language: data.language || null,
                passwordHash: hashedPassword,
                isActive: true,
                isEmailVerified: false,
            },
        });

        // TODO: Send welcome email with temporary password
        // For now, return the temporary password (remove this in production)
        return {
            ...user,
            temporaryPassword, // Remove this in production
        };
    }

    async toggleUserStatus(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return this.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive },
        });
    }

    async resetUserPassword(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Generate a new temporary password
        const temporaryPassword = crypto.randomBytes(12).toString('hex');
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

        await this.prisma.user.update({
            where: { id },
            data: { passwordHash: hashedPassword },
        });

        // Invalidate all existing sessions for security
        await this.prisma.session.deleteMany({
            where: { userId: id },
        });

        // TODO: Send email with new temporary password
        // For now, return the temporary password (remove this in production)
        return {
            temporaryPassword, // Remove this in production
        };
    }
}