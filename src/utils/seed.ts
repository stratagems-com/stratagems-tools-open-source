import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from './config';
import logger from './logger';

const prisma = new PrismaClient();

const createSuperAdmin = async () => {
    if (!config.SUPER_ADMIN_EMAIL || !config.SUPER_ADMIN_PASSWORD) {
        logger.warn('SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set, skipping super admin creation');
        return;
    }

    const existingSuperAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
    });

    if (existingSuperAdmin) {
        logger.info('Super admin already exists');
        return;
    }

    const hashedPassword = await bcrypt.hash(config.SUPER_ADMIN_PASSWORD, 12);

    const superAdmin = await prisma.user.create({
        data: {
            email: config.SUPER_ADMIN_EMAIL,
            username: "superadmin",
            firstName: "Super",
            lastName: "Admin",
            passwordHash: hashedPassword,
            role: 'SUPER_ADMIN',
            isEmailVerified: true,
        },
    });

    logger.info('Created super admin account', { userId: superAdmin.id });
};

// Generate random 5-digit ID
const generateId = (): string => {
    return Math.floor(10000 + Math.random() * 90000).toString();
};

// Generate Business Central formatted ID
const generateBCId = (prefix: string): string => {
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}/${id}`;
};

// Check if data already exists
const checkExistingData = async () => {
    const appCount = await prisma.app.count();
    const setCount = await prisma.set.count();
    const lookupCount = await prisma.lookup.count();
    const setValueCount = await prisma.setValue.count();
    const lookupValueCount = await prisma.lookupValue.count();

    return {
        hasApp: appCount > 0,
        hasSets: setCount > 0,
        hasLookups: lookupCount > 0,
        hasSetValues: setValueCount > 0,
        hasLookupValues: lookupValueCount > 0,
        hasAnyData: appCount > 0 || setCount > 0 || lookupCount > 0 || setValueCount > 0 || lookupValueCount > 0
    };
};

// Create test app
const createTestApp = async () => {
    const app = await prisma.app.create({
        data: {
            name: 'Test App',
            description: 'Test application for development',
            secret: 'st_XXXXXXXXXXXXXXXXXXXXX',
            isActive: true,
            permission: 'WRITE'
        }
    });

    logger.info('Created test app', { appId: app.id });
    return app;
};

// Create test sets
const createTestSets = async () => {
    const setNames = ['orders', 'customers', 'products', 'collections'];
    const sets = [];

    for (const name of setNames) {
        const set = await prisma.set.create({
            data: {
                name,
                description: `Test ${name} set`,
                allowDuplicates: false,
                strictChecking: true
            }
        });

        logger.info(`Created set '${name}'`, { setId: set.id });
        sets.push(set);
    }

    return sets;
};

// Create test lookups
const createTestLookups = async () => {
    const lookupConfigs = [
        { name: 'orders', leftSystem: 'shopify', rightSystem: 'bc' },
        { name: 'customers', leftSystem: 'bc', rightSystem: 'shopify' },
        { name: 'products', leftSystem: 'pim', rightSystem: 'shopify' },
        { name: 'collections', leftSystem: 'bc', rightSystem: 'shopify' }
    ];

    const lookups = [];

    for (const config of lookupConfigs) {
        const lookup = await prisma.lookup.create({
            data: {
                name: config.name,
                description: `Test ${config.name} lookup`,
                leftSystem: config.leftSystem,
                rightSystem: config.rightSystem,
                allowLeftDups: false,
                allowRightDups: false,
                allowLeftRightDups: true,
                strictChecking: true
            }
        });

        logger.info(`Created lookup '${config.name}'`, { lookupId: lookup.id });
        lookups.push(lookup);
    }

    return lookups;
};

// Generate and insert test data
const generateTestData = async () => {
    const sets = await createTestSets();
    const lookups = await createTestLookups();

    // Generate 100-150 items for each set
    const itemCount = Math.floor(20); // 100-150

    for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const lookup = lookups[i];

        // Type safety check
        if (!set || !lookup) {
            logger.error('Missing set or lookup data', { index: i });
            continue;
        }

        logger.info(`Generating ${itemCount} items for ${set.name}`);

        for (let j = 0; j < itemCount; j++) {
            // Generate source ID (left side)
            const sourceId = generateId();

            // Generate destination ID (right side) based on lookup configuration
            let destinationId: string;

            if (set.name === 'orders') {
                destinationId = generateBCId('SO');
            } else if (set.name === 'customers') {
                destinationId = generateBCId('CUS');
            } else if (set.name === 'products') {
                destinationId = generateId(); // PIM to Shopify, both are numeric
            } else if (set.name === 'collections') {
                destinationId = generateBCId('GRO');
            } else {
                destinationId = generateId();
            }

            // Create set value
            await prisma.setValue.create({
                data: {
                    setId: set.id,
                    value: sourceId,
                    metadata: { generated: true, timestamp: new Date().toISOString() }
                }
            });

            // Create lookup value
            await prisma.lookupValue.create({
                data: {
                    lookupId: lookup.id,
                    left: sourceId,
                    right: destinationId,
                    leftMetadata: { system: lookup.leftSystem },
                    rightMetadata: { system: lookup.rightSystem }
                }
            });
        }

        logger.info(`Completed generating data for ${set.name}`);
    }
};

// Main seeding function
export const seed = async () => {
    try {
        logger.info('Starting database seeding...');

        await createSuperAdmin();

        if (config.TEST_DATA) {
            const existingData = await checkExistingData();

            if (existingData.hasAnyData) {
                logger.info('Data already exists in the system, skipping test data generation');
            } else {
                logger.info('No existing data found, creating test data...');
                await createTestApp();
                await generateTestData();
            }
        }

        logger.info('Database seeding completed successfully');
    } catch (error) {
        logger.error('Error seeding data', { error });
        throw error;
    }
};

// Export for use in other files
export default seed;