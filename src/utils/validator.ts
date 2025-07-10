import type { Request } from 'express';
import { z } from 'zod';

type RequestSchemas<TParams, TQuery, TBody> = Partial<{
    params: z.ZodSchema<TParams>;
    query: z.ZodSchema<TQuery>;
    body: z.ZodSchema<TBody>;
}>;

export interface ValidatedRequest<TParams = any, TQuery = any, TBody = any> extends Request {
    validated: {
        params: TParams;
        query: TQuery;
        body: TBody;
    };
}

/**
 * Global validator function that can be called inside controllers
 * Returns typed, validated data or throws validation errors
 */
export const validateSchema = <TParams = any, TQuery = any, TBody = any>(
    req: any,
    schemas: RequestSchemas<TParams, TQuery, TBody>
): { params: TParams; query: TQuery; body: TBody } => {
    const errors: {
        type: 'Query' | 'Params' | 'Body';
        errors: z.ZodError<any>;
    }[] = [];

    const validatedData = {
        params: {} as TParams,
        query: {} as TQuery,
        body: {} as TBody,
    };

    // Validate params
    if (schemas.params) {
        const obj: any = {};
        for (const key in req.params) {
            if (!req.params[key]?.startsWith(':')) {
                obj[key] = req.params[key];
            }
        }
        const parsedParams = schemas.params.safeParse(obj);
        if (parsedParams.success) {
            validatedData.params = parsedParams.data;
        } else {
            errors.push({ type: 'Params', errors: parsedParams.error });
        }
    }

    // Validate body
    if (schemas.body) {
        const parsedBody = schemas.body.safeParse(req.body);
        if (parsedBody.success) {
            validatedData.body = parsedBody.data;
        } else {
            errors.push({ type: 'Body', errors: parsedBody.error });
        }
    }

    // Validate query
    if (schemas.query) {
        const parsedQuery = schemas.query.safeParse(req.query);
        if (parsedQuery.success) {
            validatedData.query = parsedQuery.data;
        } else {
            errors.push({ type: 'Query', errors: parsedQuery.error });
        }
    }

    // If there are validation errors, throw them
    if (errors.length > 0) {
        const errorMessages = errors.map((error) => ({
            type: error.type,
            errors: error.errors.issues.map((issue: any) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        }));

        const validationError = new Error('Validation failed');
        (validationError as any).statusCode = 400;
        (validationError as any).code = 'VALIDATION_ERROR';
        (validationError as any).details = errorMessages;
        throw validationError;
    }

    return validatedData;
};

/**
 * Helper function to validate only request body
 */
export const validateBody = <TBody>(req: any, schema: z.ZodSchema<TBody>): TBody => {
    return validateSchema(req, { body: schema }).body;
};

/**
 * Helper function to validate only request params
 */
export const validateParams = <TParams>(req: any, schema: z.ZodSchema<TParams>): TParams => {
    return validateSchema(req, { params: schema }).params;
};

/**
 * Helper function to validate only request query
 */
export const validateQuery = <TQuery>(req: any, schema: z.ZodSchema<TQuery>): TQuery => {
    return validateSchema(req, { query: schema }).query;
}; 