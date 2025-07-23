# Test Data Seeding

This document explains how to use the automatic test data seeding feature in the ST Open Source API.

## Overview

When `TEST_DATA` is set to `true` in your environment configuration, the application will automatically create test data on startup. This includes:

- **Test App**: A development app with token `st_XXXXXXXXXXXXXXXXXXXXX`
- **Test Sets**: `orders`, `customers`, `products`, `collections`
- **Test Lookups**: Corresponding lookup mappings for each set
- **Test Data**: 100-150 items per set with corresponding lookup values

## Configuration

### Enable Test Data

Set the following environment variable:

```bash
TEST_DATA=true
```

### Environment File

Add to your `.env` file:

```env
# Test Data (Development Only)
# Set to true to automatically seed test data on startup
TEST_DATA=false
```

## Data Structure

### Sets Created

1. **orders** - Contains processed order IDs (5-digit format: `XXXXX`)
2. **customers** - Contains processed customer IDs (5-digit format: `XXXXX`)
3. **products** - Contains processed product IDs (5-digit format: `XXXXX`)
4. **collections** - Contains processed collection IDs (5-digit format: `XXXXX`)

### Lookups Created

1. **orders** lookup:
   - Left: `shopify` (source)
   - Right: `bc` (Business Central)
   - Format: `shopify_id` → `SO/XXXX`

2. **customers** lookup:
   - Left: `bc` (Business Central)
   - Right: `shopify` (destination)
   - Format: `CUS/XXXX` → `shopify_id`

3. **products** lookup:
   - Left: `pim` (source)
   - Right: `shopify` (destination)
   - Format: `pim_id` → `shopify_id`

4. **collections** lookup:
   - Left: `bc` (Business Central)
   - Right: `shopify` (destination)
   - Format: `GRO/XXXX` → `shopify_id`

### Test App

- **Name**: Test App
- **Description**: Test application for development
- **Secret**: `st_XXXXXXXXXXXXXXXXXXXXX`
- **Permission**: WRITE
- **Status**: Active

## Usage

### Starting with Test Data

1. Set `TEST_DATA=true` in your environment
2. Start the application:
   ```bash
   npm run dev
   # or
   docker-compose up
   ```

3. The application will automatically seed test data on startup

### API Endpoints

Once seeded, you can access the test data through the API:

```bash
# Get all sets
GET /api/v1/sets

# Get all lookups
GET /api/v1/lookups

# Get all apps
GET /api/v1/apps

# Check specific set values
GET /api/v1/sets/orders/values

# Check specific lookup values
GET /api/v1/lookups/orders/values
```

## Data Prevention

The seeding system prevents data generation when any data already exists:

- **Complete Check**: Checks for apps, sets, lookups, set values, and lookup values
- **Skip Generation**: If any data exists, the seeding process is skipped entirely
- **Clean Slate**: Only generates data when the database is completely empty

This ensures test data is only created in fresh environments and prevents accidental data generation in production or development databases with existing data.

## Development Workflow

### First Time Setup

1. Set up your database
2. Set `TEST_DATA=true`
3. Start the application
4. Test data will be automatically created

### Subsequent Runs

- If any data exists in the system, seeding will be skipped entirely
- You can safely restart with `TEST_DATA=true` or `TEST_DATA=false`
- To reset test data, manually delete from database or use database reset
- The system will log when seeding is skipped due to existing data

## Business Logic

The test data follows the application's business logic:

1. **Processing Flow**: When an item is processed from source A to source B:
   - A lookup value is created mapping A's ID to B's ID
   - The source A ID is stored in the corresponding set (marking it as processed)

2. **Set Values**: Contain the source IDs that have been processed
3. **Lookup Values**: Map source IDs to their corresponding destination IDs

## Example Data

### Orders Set
```
Set Value: 12345 (Shopify order ID)
Lookup: 12345 (shopify) → SO/1234 (Business Central)
```

### Customers Set
```
Set Value: CUS/5678 (Business Central customer ID)
Lookup: CUS/5678 (bc) → 98765 (Shopify customer ID)
```

## Security Notes

- **Development Only**: This feature should only be used in development environments
- **Test Token**: The test app token is publicly documented and should not be used in production
- **Data Volume**: Creates 400-600 total records (100-150 per set)

## Troubleshooting

### No Data Created

1. Check that `TEST_DATA=true` is set
2. Verify database connection
3. Check application logs for seeding messages
4. Ensure database schema is up to date

### No Data Created

1. Check that `TEST_DATA=true` is set
2. Verify database connection
3. Check application logs for seeding messages
4. Ensure database schema is up to date
5. **Check if data already exists** - seeding is skipped if any data is present

### Performance

- Seeding creates 400-600 records
- Should complete within a few seconds
- Monitor database performance during seeding 