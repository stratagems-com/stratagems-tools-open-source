import { z } from 'zod';

export const inviteUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
    }),
});

export const acceptInvitationSchema = z.object({
    body: z.object({
        token: z.string(),
        password: z.string().min(8),
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
    }),
});

export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        username: z.string().min(3).max(30),
        firstName: z.string().min(1).max(50),
        lastName: z.string().min(1).max(50),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VIEWER']).default('VIEWER'),
        phoneNumber: z.string().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
    }),
});

export const updateUserSchema = z.object({
    body: z.object({
        username: z.string().min(3).max(30).optional(),
        firstName: z.string().min(1).max(50).optional(),
        lastName: z.string().min(1).max(50).optional(),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VIEWER']).optional(),
        isActive: z.boolean().optional(),
        phoneNumber: z.string().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
    }),
});