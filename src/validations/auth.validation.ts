import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        username: z.string().min(3).max(30).optional(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VIEWER']).optional(),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string(),
        totpToken: z.string().length(6).optional(),
    }),
});

export const refreshTokenSchema = z.object({
    body: z.object({
        refreshToken: z.string(),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        username: z.string().min(3).max(30).optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
        phoneNumber: z.string().optional(),
    }),
});

export const passwordResetRequestSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const passwordResetConfirmSchema = z.object({
    body: z.object({
        token: z.string(),
        newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
        confirmPassword: z.string(),
    }),
}).refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ['body', 'confirmPassword'],
});

export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
        confirmPassword: z.string(),
    }),
}).refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ['body', 'confirmPassword'],
});