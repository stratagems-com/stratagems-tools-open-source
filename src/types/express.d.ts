export { };

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                firstName?: string | null;
                lastName?: string | null;
            };
            session?: {
                id: string;
                ipAddress: string;
                country?: string | null;
                region?: string | null;
                city?: string | null;
            };
            authenticatedApp?: App;
        }
    }
}