import { Request, Response } from "express";
import { AuthService } from "../../services/auth.service";
import { prisma } from "../../utils/database";
import { validateSchema } from "../../utils/validator";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
} from "../../validations/auth.validation";

const authService = new AuthService(prisma);

const getClientInfo = (req: Request) => ({
  ipAddress: req.ip || req.connection.remoteAddress || "unknown",
  userAgent: req.get("User-Agent"),
});

export const register = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, { body: registerSchema.shape.body });
    const clientInfo = getClientInfo(req);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    const user = await authService.register({
      ...body,
      ...clientInfo,
      username: body.username || "",
      role: body.role || "ADMIN",
      userAgent: clientInfo.userAgent || "",
      firstName: body.firstName || "",
      lastName: body.lastName || "",
      ipAddress: clientInfo.ipAddress || "",
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, { body: loginSchema.shape.body });
    const clientInfo = getClientInfo(req);

    const result = await authService.login({
      ...body,
      ...clientInfo,
      userAgent: clientInfo.userAgent || null,
      totpToken: body.totpToken || null,
    });

    res.json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      if (error.message === "2FA token required") {
        return res.status(200).json({
          requiresTwoFactor: true,
          message: "Two-factor authentication required",
        });
      }

      if (error.message.includes("Too many failed attempts")) {
        return res.status(429).json({ error: error.message });
      }
    }

    res.status(401).json({ error: "Invalid credentials" });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, {
      body: refreshTokenSchema.shape.body,
    });
    const clientInfo = getClientInfo(req);

    const result = await authService.refreshToken(
      body.refreshToken,
      clientInfo.ipAddress,
      clientInfo.userAgent
    );

    res.json({
      message: "Token refreshed successfully",
      ...result,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);
    const clientInfo = getClientInfo(req);

    if (token) {
      await authService.logout(
        token,
        clientInfo.ipAddress,
        clientInfo.userAgent
      );
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        avatar: true,
        timezone: true,
        language: true,
        phoneNumber: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, {
      body: updateProfileSchema.shape.body,
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName: body.firstName || null,
        lastName: body.lastName || null,
        username: body.username || null,
        timezone: body.timezone || null,
        language: body.language || null,
        phoneNumber: body.phoneNumber || null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        timezone: true,
        language: true,
        phoneNumber: true,
      },
    });

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user!.id,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        country: true,
        region: true,
        city: true,
        deviceType: true,
        browserName: true,
        browserVersion: true,
        osName: true,
        osVersion: true,
        createdAt: true,
        lastAccessedAt: true,
        isTrusted: true,
      },
      orderBy: { lastAccessedAt: "desc" },
    });

    res.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Failed to get sessions" });
  }
};

export const revokeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    await prisma.session.updateMany({
      where: {
        id: sessionId as string,
        userId: req.user!.id,
      },
      data: { isActive: false },
    });

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    console.error("Revoke session error:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { firstName: { contains: search as string, mode: "insensitive" } },
        { lastName: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: { sessions: { where: { isActive: true } } },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
};

export const getSecurityEvents = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, severity, type, isResolved } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (severity) where.severity = severity;
    if (type) where.type = type;
    if (isResolved !== undefined) where.isResolved = isResolved === "true";

    const [events, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        select: {
          id: true,
          type: true,
          severity: true,
          description: true,
          ipAddress: true,
          country: true,
          region: true,
          userId: true,
          isResolved: true,
          resolvedAt: true,
          createdAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.securityEvent.count({ where }),
    ]);

    res.json({
      events,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get security events error:", error);
    res.status(500).json({ error: "Failed to get security events" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const id = req.user?.id;
    if (!id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
};

export const getDashboardAnalytics = async (_: Request, res: Response) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      activeSessions,
      recentLogins,
      failedLogins24h,
      securityEvents24h,
      topCountries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.session.count({
        where: {
          isActive: true,
          expiresAt: { gt: now },
        },
      }),
      prisma.loginAttempt.count({
        where: {
          success: true,
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.loginAttempt.count({
        where: {
          success: false,
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.securityEvent.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.session.groupBy({
        by: ["country"],
        where: {
          isActive: true,
          country: { not: null },
          createdAt: { gte: last7Days },
        },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
    ]);

    res.json({
      summary: {
        totalUsers,
        activeUsers,
        activeSessions,
        recentLogins,
        failedLogins24h,
        securityEvents24h,
      },
      topCountries: topCountries.map((item) => ({
        country: item.country,
        count: item._count.country,
      })),
    });
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, { body: passwordResetRequestSchema.shape.body });
    const result = await authService.requestPasswordReset(body.email);
    
    res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
      // TODO: Remove token from response in production
      ...(result.token && { token: result.token })
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to process password reset request" 
    });
  }
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, { body: passwordResetConfirmSchema.shape.body });
    await authService.confirmPasswordReset(body.token, body.newPassword);
    
    res.json({
      success: true,
      message: "Password has been reset successfully"
    });
  } catch (error) {
    console.error("Confirm password reset error:", error);
    res.status(400).json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset password" 
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { body } = validateSchema(req, { body: changePasswordSchema.shape.body });
    const userId = req.user!.id;
    
    await authService.changePassword(userId, body.currentPassword, body.newPassword);
    
    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(400).json({ 
      success: false,
      error: error instanceof Error ? error.message : "Failed to change password" 
    });
  }
};
