import { Router } from "express";
import * as authController from "../../controllers/v1/auth.controller";
import {
  authenticate,
  authorize,
  authRateLimit,
} from "../../middleware/auth.middleware";

const router: Router = Router();

// Auth routes
router.post("/login", authRateLimit, authController.login);
router.post("/register", authRateLimit, authController.register);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authenticate, authController.logout);

// Password reset routes
router.post("/password-reset/request", authRateLimit, authController.requestPasswordReset);
router.post("/password-reset/confirm", authRateLimit, authController.confirmPasswordReset);
router.post("/password/change", authenticate, authController.changePassword);

// Profile routes
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, authController.updateProfile);

// Admin endpoint that supports both session auth and admin API key
router.get("/me", authenticate, authController.getMe);

// Session routes
router.get("/sessions", authenticate, authController.getSessions);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  authController.revokeSession
);

// Admin routes
router.get(
  "/users",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  authController.getUsers
);
router.get(
  "/security-events",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  authController.getSecurityEvents
);
router.get(
  "/dashboard-analytics",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  authController.getDashboardAnalytics
);

export default router;
