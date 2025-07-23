# =============================================================================
# ST Open Source - Production Dockerfile (Fixed)
# =============================================================================

# Use Node.js 18 Alpine as base image for smaller size and security
FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base AS deps

# Install all dependencies (including dev dependencies for build tools)
RUN pnpm install --frozen-lockfile --prod=false

# =============================================================================
# Build Stage
# =============================================================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Install tsc-alias for path resolution (if not already in devDependencies)
RUN pnpm add -D tsc-alias

# Build the application with path resolution
RUN pnpm build

# =============================================================================
# Production Stage
# =============================================================================
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy the generated Prisma client from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma schema for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]