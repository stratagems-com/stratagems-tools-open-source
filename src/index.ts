import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config, isTest } from "./utils/config";
import { CronManager } from "./utils/cron-manager";
import { connectDatabase, disconnectDatabase } from "./utils/database";
import logger from "./utils/logger";

// Import middleware
import { errorHandler } from "./middleware/error-handler";
import { healthCheck } from "./middleware/health-check";
import { notFoundHandler } from "./middleware/not-found-handler";

// Import v1 routes
import { validateApiKey } from "./middleware/auth.middleware";
import appRoutes from "./routes/v1/app.routes";
import authRoutes from "./routes/v1/auth.routes";
import lookupRoutes from "./routes/v1/lookup.routes";
import setRoutes from "./routes/v1/set.routes";
import userRoutes from "./routes/v1/user.routes";
import warningRoutes from "./routes/v1/warning.routes";
import { seed } from "./utils/seed";

const app = express() as express.Express;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_DURATION * 1000,
  max: config.RATE_LIMIT_POINTS,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

// Compression
app.use(compression());

// Request logging
app.use((req, _, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
  next();
});
app.use(validateApiKey);
// Health check endpoint
app.get("/health", healthCheck);

// API versioning - v1 routes (auth routes don't need API key validation)
app.use("/api/v1/auth", authRoutes);

// Apply API key validation to protected routes

app.use("/api/v1/apps", appRoutes);
app.use("/api/v1/lookups", lookupRoutes);
app.use("/api/v1/sets", setRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/warnings", warningRoutes);

// API info endpoint
app.get("/api/info", (_, res) => {
  res.json({
    name: "StratagemsTools Open Source API",
    version: config.VERSION,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      v1: {
        apps: "/api/v1/apps",
        lookups: "/api/v1/lookups",
        sets: "/api/v1/sets",
        warnings: "/api/v1/warnings",
      },
    },
    health: "/health",
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize cron jobs
const initializeCronJobs = () => {
  if (isTest()) {
    logger.info("Skipping cron jobs in test environment");
    return;
  }

  // logger.info("Initializing cron jobs...");

  // // Warning detection job - runs every 10 minutes
  // CronManager.registerJob(
  //   "warning-detection",
  //   "*/10 * * * *", // Every 10 minutes
  //   WarningDetectionJob.execute,
  //   {
  //     timezone: "UTC",
  //     runOnInit: false, // Don't run immediately on startup
  //   }
  // );

  // // Start all cron jobs
  // CronManager.startAll();
  logger.info("Cron jobs initialized successfully");
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop all cron jobs
    CronManager.stopAll();

    await disconnectDatabase();
    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    await seed();

    // Initialize cron jobs
    initializeCronJobs();

    // Start listening
    app.listen(config.PORT, () => {
      logger.info(`Server started successfully`, {
        port: config.PORT,
        environment: config.NODE_ENV,
        version: config.VERSION,
        testData: config.TEST_DATA,
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

// Start the server
if (!isTest()) {
  startServer();
}

export default { app };
