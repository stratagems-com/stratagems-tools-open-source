import { z } from 'zod';

// =============================================================================
// APP VALIDATION SCHEMAS
// =============================================================================

export const createAppSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, hyphens, and underscores'),
    description: z.string().max(500, 'Description too long').optional(),
    activeUntil: z.string().optional(),
    permission: z.enum(['READ', 'WRITE', 'NONE']).default('WRITE'),
    isActive: z.boolean().default(true),
});

export const updateAppSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, hyphens, and underscores')
        .optional(),
    description: z.string().max(500, 'Description too long').optional(),
    isActive: z.boolean().optional(),
    activeUntil: z.string().optional(),
    permission: z.enum(['READ', 'WRITE', 'NONE']).default('WRITE').optional(),
});

export const appIdParamSchema = z.object({
    id: z.string().min(1, 'Invalid app ID'),
});

export const appHealthSchema = z.object({
    // No input validation needed for health check
});

// =============================================================================
// LOOKUP VALIDATION SCHEMAS
// =============================================================================

export const createLookupSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, hyphens, and underscores'),
    description: z.string().max(500, 'Description too long').optional(),
    leftSystem: z.string().optional(),
    rightSystem: z.string().optional(),
    allowLeftDups: z.boolean().default(true),
    allowRightDups: z.boolean().default(true),
    allowLeftRightDups: z.boolean().default(true),
    strictChecking: z.boolean().default(false),
});

export const addLookupValueSchema = z.object({
    left: z.string().min(1, 'Left value is required').max(255, 'Left value too long'),
    right: z.string().min(1, 'Right value is required').max(255, 'Right value too long'),
    leftMetadata: z.record(z.string(), z.unknown()).optional(),
    rightMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const addLookupValuesBulkSchema = z.object({
    values: z.array(addLookupValueSchema).min(1, 'At least one value is required').max(1000, 'Maximum 1000 values per request'),
});


export const searchLookupValuesSchema = z.object({
    left: z.string().optional().nullable(),
    right: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    search: z.string().optional(),
});

export const lookupIdParamSchema = z.object({
    lookup: z.string().min(1, 'Invalid lookup ID'),
});

export const lookupValueIdParamSchema = z.object({
    lookup: z.string().min(1, 'Invalid lookup ID'),
    valueId: z.string().min(1, 'Invalid value ID'),
});

// =============================================================================
// SET VALIDATION SCHEMAS
// =============================================================================

export const createSetSchema = z.object({
    name: z.string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Name can only contain letters, numbers, hyphens, and underscores'),
    description: z.string().max(500, 'Description too long').optional(),
    allowDuplicates: z.boolean().default(true),
    strictChecking: z.boolean().default(false),
});

export const addSetValueSchema = z.object({
    value: z.string().min(1, 'Value is required').max(255, 'Value too long'),
    metadata: z.record(z.string(), z.unknown()).nullish(),
});

export const addSetValuesBulkSchema = z.object({
    values: z.array(addSetValueSchema).min(1, 'At least one value is required').max(1000, 'Maximum 1000 values per request'),
});

export const checkSetValueSchema = z.object({
    value: z.string().min(1, 'Value parameter is required'),
});

export const checkSetValuesBulkSchema = z.object({
    values: z.array(z.string().min(1, 'Value is required').max(255, 'Value too long')).min(1, 'At least one value is required').max(1000, 'Maximum 1000 values per request'),
});

export const setIdParamSchema = z.object({
    set: z.string().min(1, 'Invalid set ID'),
});

export const setValueIdParamSchema = z.object({
    set: z.string().min(1, 'Invalid set ID'),
    valueId: z.string().min(1, 'Invalid value ID'),
});

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

export const successResponseSchema = z.object({
    success: z.literal(true),
    data: z.any(),
});

export const errorResponseSchema = z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string(),
});

export const paginatedResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(z.any()),
    pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        pages: z.number(),
    }),
}); 