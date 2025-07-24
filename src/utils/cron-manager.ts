import cron from "node-cron";
import logger from "./logger";

/**
 * Cron Manager - Handles scheduled tasks
 *
 * @description Manages cron jobs for the application
 */
export class CronManager {
  private static jobs = new Map<string, any>();

  /**
   * Register a new cron job
   *
   * @param name - Unique name for the job
   * @param schedule - Cron schedule expression
   * @param task - Function to execute
   * @param options - Additional options
   */
  static registerJob(
    name: string,
    schedule: string,
    task: () => Promise<void> | void,
    options: {
      timezone?: string;
      runOnInit?: boolean;
      scheduled?: boolean;
    } = {}
  ): void {
    try {
      // Validate cron expression
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron schedule: ${schedule}`);
      }

      // Stop existing job if it exists
      if (this.jobs.has(name)) {
        this.stopJob(name);
      }

      // Create wrapped task with error handling
      const wrappedTask = async () => {
        try {
          logger.info(`Starting cron job: ${name}`);
          const startTime = Date.now();

          await task();

          const duration = Date.now() - startTime;
          logger.info(`Completed cron job: ${name}`, {
            duration: `${duration}ms`,
          });
        } catch (error) {
          logger.error(`Error in cron job: ${name}`, { 
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name
            } : error 
          });
        }
      };

      // Create and register the job
      const job = cron.schedule(schedule, wrappedTask, {
        timezone: options.timezone,
        runOnInit: options.runOnInit || false,
        scheduled: options.scheduled !== false, // Default to true
      });

      this.jobs.set(name, job);
      logger.info(`Cron job registered: ${name}`, { schedule });
    } catch (error) {
      logger.error(`Failed to register cron job: ${name}`, { error });
      throw error;
    }
  }

  /**
   * Start a specific job
   *
   * @param name - Job name
   */
  static startJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      logger.info(`Started cron job: ${name}`);
    } else {
      logger.warn(`Cron job not found: ${name}`);
    }
  }

  /**
   * Stop a specific job
   *
   * @param name - Job name
   */
  static stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    } else {
      logger.warn(`Cron job not found: ${name}`);
    }
  }

  /**
   * Stop and remove a job
   *
   * @param name - Job name
   */
  static removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      logger.info(`Removed cron job: ${name}`);
    } else {
      logger.warn(`Cron job not found: ${name}`);
    }
  }

  /**
   * Start all registered jobs
   */
  static startAll(): void {
    this.jobs.forEach((job, name) => {
      job.start();
      logger.info(`Started cron job: ${name}`);
    });
  }

  /**
   * Stop all registered jobs
   */
  static stopAll(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    });
  }

  /**
   * Get all registered job names
   */
  static getJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Check if a job is running
   *
   * @param name - Job name
   * @returns true if job is running
   */
  static isJobRunning(name: string): boolean {
    const job = this.jobs.get(name);
    return job ? job.getStatus() === "scheduled" : false;
  }

  /**
   * Get status of all jobs
   */
  static getStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.jobs.forEach((job, name) => {
      status[name] = job.getStatus();
    });
    return status;
  }
}
