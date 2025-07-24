import { WarningSeverity } from "@prisma/client";
import { prisma } from "../utils/database";
import logger from "../utils/logger";

interface DuplicateResult {
  _id: {
    lookupId: string;
    left?: string;
    right?: string;
  };
  count: number;
  ids: string[];
  lookupName: string;
  lookupId: string;
}

/**
 * Warning Detection Job
 *
 * @description Detects duplicates in lookup values and creates warnings
 * This job runs periodically to identify data quality issues
 */
export class WarningDetectionJob {
  /**
   * Execute the warning detection process
   */
  static async execute(): Promise<void> {
    logger.info("Starting warning detection job...");

    try {
      // Check for lookup duplicates
      await this.checkLookupDuplicates();

      // TODO: Add other warning checks here (e.g., set duplicates)
      // await this.checkSetDuplicates();

      logger.info("Warning detection job completed successfully");
    } catch (error) {
      logger.error("Error in warning detection job", { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error 
      });
      throw error;
    }
  }

  /**
   * Check for duplicates in lookup values
   */
  private static async checkLookupDuplicates(): Promise<void> {
    logger.info("Checking for lookup duplicates...");

    try {
      // Test database connection first
      logger.info("Testing database connection...");
      await prisma.$queryRaw`SELECT 1`;
      logger.info("Database connection successful");
      
      logger.info("Fetching lookups with values from database...");
      // Get all lookup data with values for duplicate detection
      const lookups = await prisma.lookup.findMany({
        include: {
          values: true,
        },
      });
      
      logger.info(`Found ${lookups.length} lookups to check for duplicates`);

      const warnings: Array<{
        type: string;
        typeName: string;
        typeId: string;
        itemId: string;
        leftDuplicate: boolean;
        rightDuplicate: boolean;
        leftRightDuplicate: boolean;
        severity: WarningSeverity;
        details?: any;
      }> = [];

      for (const lookup of lookups) {
        const leftDuplicates = this.findLeftDuplicates(lookup.values);
        const rightDuplicates = this.findRightDuplicates(lookup.values);
        const leftRightDuplicates = this.findLeftRightDuplicates(lookup.values);

        logger.info(`Found duplicates for lookup ${lookup.name}`, {
          leftDuplicates: leftDuplicates.length,
          rightDuplicates: rightDuplicates.length,
          leftRightDuplicates: leftRightDuplicates.length,
        });

        // Process left duplicates
        for (const dup of leftDuplicates) {
          for (const valueId of dup.ids) {
            // Skip if this item is already covered by left-right duplicate
            if (leftRightDuplicates.some((d) => d.ids.includes(valueId))) {
              continue;
            }

            warnings.push({
              type: "lookup",
              typeName: lookup.name,
              typeId: lookup.id,
              itemId: valueId,
              leftDuplicate: true,
              rightDuplicate: false,
              leftRightDuplicate: false,
              severity: WarningSeverity.MEDIUM,
              details: {
                duplicateValue: dup.value,
                duplicateType: "left",
                duplicateCount: dup.count,
              },
            });
          }
        }

        // Process right duplicates
        for (const dup of rightDuplicates) {
          for (const valueId of dup.ids) {
            // Skip if this item is already covered by left-right duplicate
            if (leftRightDuplicates.some((d) => d.ids.includes(valueId))) {
              continue;
            }

            warnings.push({
              type: "lookup",
              typeName: lookup.name,
              typeId: lookup.id,
              itemId: valueId,
              leftDuplicate: false,
              rightDuplicate: true,
              leftRightDuplicate: false,
              severity: WarningSeverity.MEDIUM,
              details: {
                duplicateValue: dup.value,
                duplicateType: "right",
                duplicateCount: dup.count,
              },
            });
          }
        }

        // Process left-right duplicates (highest priority)
        for (const dup of leftRightDuplicates) {
          for (const valueId of dup.ids) {
            warnings.push({
              type: "lookup",
              typeName: lookup.name,
              typeId: lookup.id,
              itemId: valueId,
              leftDuplicate: false,
              rightDuplicate: false,
              leftRightDuplicate: true,
              severity: WarningSeverity.HIGH,
              details: {
                duplicateLeft: dup.left,
                duplicateRight: dup.right,
                duplicateType: "left-right",
                duplicateCount: dup.count,
              },
            });
          }
        }
      }

      // Clear existing lookup warnings
      logger.info("Clearing existing lookup warnings...");
      const deleteResult = await prisma.warning.deleteMany({
        where: { type: "lookup" },
      });
      logger.info(`Deleted ${deleteResult.count} existing lookup warnings`);
      
      logger.info(`Preparing to create ${warnings.length} new warnings`);

      // Insert new warnings
      if (warnings.length > 0) {
        logger.info(`Creating ${warnings.length} new warnings...`);
        await prisma.warning.createMany({
          data: warnings,
          skipDuplicates: true,
        });
        logger.info("Successfully created new warnings");
      } else {
        logger.info("No duplicates found, no new warnings created");
      }
    } catch (error) {
      logger.error("Error checking lookup duplicates", { 
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error 
      });
      throw error;
    }
  }

  /**
   * Find duplicates based on left values
   */
  private static findLeftDuplicates(values: any[]): Array<{
    value: string;
    count: number;
    ids: string[];
  }> {
    const leftGroups = new Map<string, string[]>();

    // Group by left value
    values.forEach((value) => {
      const key = value.left;
      if (!leftGroups.has(key)) {
        leftGroups.set(key, []);
      }
      leftGroups.get(key)!.push(value.id);
    });

    // Find groups with more than one item
    const duplicates: Array<{ value: string; count: number; ids: string[] }> =
      [];
    leftGroups.forEach((ids, leftValue) => {
      if (ids.length > 1) {
        duplicates.push({
          value: leftValue,
          count: ids.length,
          ids,
        });
      }
    });

    return duplicates;
  }

  /**
   * Find duplicates based on right values
   */
  private static findRightDuplicates(values: any[]): Array<{
    value: string;
    count: number;
    ids: string[];
  }> {
    const rightGroups = new Map<string, string[]>();

    // Group by right value
    values.forEach((value) => {
      const key = value.right;
      if (!rightGroups.has(key)) {
        rightGroups.set(key, []);
      }
      rightGroups.get(key)!.push(value.id);
    });

    // Find groups with more than one item
    const duplicates: Array<{ value: string; count: number; ids: string[] }> =
      [];
    rightGroups.forEach((ids, rightValue) => {
      if (ids.length > 1) {
        duplicates.push({
          value: rightValue,
          count: ids.length,
          ids,
        });
      }
    });

    return duplicates;
  }

  /**
   * Find duplicates based on left-right pairs
   */
  private static findLeftRightDuplicates(values: any[]): Array<{
    left: string;
    right: string;
    count: number;
    ids: string[];
  }> {
    const pairGroups = new Map<string, string[]>();

    // Group by left-right pair
    values.forEach((value) => {
      const key = `${value.left}|${value.right}`;
      if (!pairGroups.has(key)) {
        pairGroups.set(key, []);
      }
      pairGroups.get(key)!.push(value.id);
    });

    // Find groups with more than one item
    const duplicates: Array<{
      left: string;
      right: string;
      count: number;
      ids: string[];
    }> = [];
    pairGroups.forEach((ids, pairKey) => {
      if (ids.length > 1) {
        const [left, right] = pairKey.split("|");
        if (!left || !right) {
          logger.warn(`Invalid pair key: ${pairKey}`);
          return;
        }
        duplicates.push({
          left,
          right,
          count: ids.length,
          ids,
        });
      }
    });

    return duplicates;
  }
}
