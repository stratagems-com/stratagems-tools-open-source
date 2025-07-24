import { config } from "@/utils/config";
import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { AuthService } from "../services/auth.service";
import { prisma } from "../utils/database";

const authService = new AuthService(prisma);

export const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      if (req.user) {
        return `${req.ip}-${req.user.id}`;
      }
      return req.ip || "127.0.0.1";
    },
  });
};

export const authRateLimit = createRateLimiter(15 * 60 * 1000, 5);
export const apiRateLimit = createRateLimiter(15 * 60 * 1000, 100);
export const strictRateLimit = createRateLimiter(60 * 1000, 3);

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token required" });
    }

    const token = authHeader.substring(7);
    const result = await authService.validateSession(token);

    if (!result) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      firstName: result.user.firstName ?? null,
      lastName: result.user.lastName ?? null,
    };

    req.session = {
      id: result.session.id,
      ipAddress: result.session.ipAddress,
      country: result.session.country ?? null,
      region: result.session.region ?? null,
      city: result.session.city ?? null,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient privileges" });
    }

    next();
  };
};

export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(401).json({ error: "API key is required" });
  }

  try {
    // First check if it's the admin API key from environment
    const adminApiKey = config.API_KEY;
    if (adminApiKey && apiKey === adminApiKey) {
      return next();
    }

    // If not admin key, check if it's an app API key in the database
    const app = await prisma.app.findUnique({
      where: { secret: apiKey },
    });

    if (!app || !app.isActive) {
      return res.status(403).json({ error: "Invalid or inactive API key" });
    }

    // App API key - attach app info to request
    req.authenticatedApp = app;
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
