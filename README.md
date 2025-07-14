# Stratagems Automation Tools

A lightweight data synchronization and memory layer for automation workflows. Built with Node.js, Express, and PostgreSQL, it gives tools like **n8n**, **Zapier**, and internal scripts a persistent way to:

- Track which items were already processed  
- Map IDs between systems (ERP, CRM, Shopify...)  
- Lock resources to prevent duplicate or concurrent processing  

Use it to build **reliable**, **idempotent**, and **traceable** automations with ease.

---

## 💡 Core Concepts

| Feature    | Description                                                                                   | Example Use Case                                                                |
|------------|-----------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| **Set**    | Tracks unique values you've already processed                                                 | Avoid processing the same Shopify order twice in n8n                           |
| **Lookup** | Stores a mapping between two systems' IDs (with optional metadata)                            | Link a customer's ERP ID to their Shopify ID                                   |
| **Lock**   | Temporarily locks a resource to prevent simultaneous access from multiple workflows           | Prevent race conditions while syncing orders or stock                          |

---

## ⚙️ Example: n8n + Shopify + ERP

You're syncing Shopify orders to your ERP using n8n. Here's how `n8n-statebox` fits in:

1. **Check if the order was already processed**
    ```http
    GET /api/v1/sets/{setId}/contains?value=shopify_order_123
    ```

2. **If not, create it in the ERP**

3. **Store the ID mapping**
    ```http
    POST /api/v1/lookups/{lookupId}/values
    {
      "left": "shopify_order_123",
      "right": "erp_order_456"
    }
    ```

4. **Mark the order as processed**
    ```http
    POST /api/v1/sets/{setId}/values
    {
      "value": "shopify_order_123"
    }
    ```

5. **(Optional)** Lock it to prevent duplicates:
    ```http
    POST /api/v1/locks/acquire
    {
      "resource": "shopify_order_123"
    }
    ```

👉 See [`examples/`](./examples/) for ready-to-use n8n workflows, curl commands, and templates.

---

## 🚀 Features

### Core

- ✅ **Multi-tenant** application support with API key auth
- 🔁 **Lookup System** for cross-platform ID mappings
- 🔒 **Lock API** to avoid concurrent processing
- 📌 **Set Tracker** for idempotent workflows

### Benefits

- 🔐 **Secure**: API key protection
- 🚀 **Fast**: Indexed PostgreSQL + optional Redis
- 📊 **Scalable**: Built with multi-tenancy in mind
- 🔍 **Auditable**: Winston-based structured logs
- 🐳 **Containerized**: Docker + version-tagged builds
- 🏗️ **Clean Code**: MVC structure with Prisma and middleware


## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or pnpm

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/st-open-source.git
   cd st-open-source
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

### Project Structure

```
src/
├── controllers/
│   └── v1/
│       ├── app.controller.ts
│       ├── lookup.controller.ts
│       └── set.controller.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── error-handler.ts
│   ├── health-check.ts
│   └── not-found-handler.ts
├── routes/
│   └── v1/
│       ├── app.routes.ts
│       ├── lookup.routes.ts
│       └── set.routes.ts
├── utils/
│   ├── config.ts
│   ├── database.ts
│   └── logger.ts
└── index.ts
```

### Core Entities

```
App (Application)
├── Lookup (ID Mapping)
│   └── LookupValue (Left ↔ Right pairs)
└── Set (Value Tracking)
    └── SetValue (Unique values)
```

### API Structure

- `/api/v1/apps` - Application management
- `/api/v1/lookups` - Lookup system
- `/api/v1/sets` - Set management

## 📚 API Documentation

### Authentication

All API endpoints require an `X-API-Key` header with a valid application secret.

### Apps

#### Get App Info
```http
GET /api/v1/apps
X-API-Key: your-app-secret
```

#### App Health Check
```http
GET /api/v1/apps/health
X-API-Key: your-app-secret
```

### Lookups

#### List Lookups
```http
GET /api/v1/lookups
X-API-Key: your-app-secret
```

#### Create Lookup
```http
POST /api/v1/lookups
X-API-Key: your-app-secret
Content-Type: application/json

{
  "name": "customer-mapping",
  "description": "Map customer IDs between ERP and Shopify",
  "leftSystem": "erp",
  "rightSystem": "shopify"
}
```

#### Add Lookup Value
```http
POST /api/v1/lookups/{lookupId}/values
X-API-Key: your-app-secret
Content-Type: application/json

{
  "left": "ERP_CUSTOMER_123",
  "right": "SHOPIFY_CUSTOMER_456",
  "leftMetadata": { "name": "John Doe" },
  "rightMetadata": { "email": "john@example.com" }
}
```

#### Search Lookup Values
```http
GET /api/v1/lookups/{lookupId}/search?left=ERP_CUSTOMER_123
X-API-Key: your-app-secret
```

### Sets

#### List Sets
```http
GET /api/v1/sets
X-API-Key: your-app-secret
```

#### Create Set
```http
POST /api/v1/sets
X-API-Key: your-app-secret
Content-Type: application/json

{
  "name": "processed-orders",
  "description": "Track processed order IDs"
}
```

#### Add Value to Set
```http
POST /api/v1/sets/{setId}/values
X-API-Key: your-app-secret
Content-Type: application/json

{
  "value": "ORDER_12345",
  "metadata": { "processedAt": "2024-01-01T10:00:00Z" }
}
```

#### Check Value in Set
```http
GET /api/v1/sets/{setId}/contains?value=ORDER_12345
X-API-Key: your-app-secret
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `JWT_SECRET` | JWT secret (min 32 chars) | Required |
| `RATE_LIMIT_POINTS` | Rate limit requests | `500` |
| `RATE_LIMIT_DURATION` | Rate limit window (seconds) | `120` |
| `LOG_LEVEL` | Logging level | `info` |
| `DOCKER_TAG` | Docker tag (auto-set) | `latest` |

### Database Setup

1. Create a PostgreSQL database
2. Update `DATABASE_URL` in your `.env` file
3. Run `npm run db:push` to apply the schema

## 🐳 Docker

### Build with Version Tag
```bash
# Build with package.json version
npm run docker:build:tag

# Build latest tag
npm run docker:build:latest

# Build without version
npm run docker:build
```

### Run Container
```bash
# Run latest
npm run docker:run

# Run specific version
npm run docker:run:tag
```

### Docker Compose
```bash
npm run docker:compose
```

### Docker Tag Versioning

The application automatically detects its version from:
1. `DOCKER_TAG` environment variable (set during build)
2. `VERSION` environment variable
3. `package.json` version (fallback)

Build with specific version:
```bash
docker build --build-arg DOCKER_TAG=v1.2.3 --build-arg VERSION=v1.2.3 -t st-open-source:v1.2.3 .
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📦 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run format` - Format code
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run database migrations
- `npm run docker:build:tag` - Build Docker with version tag

### Code Quality

This project uses:
- **Biome** for linting and formatting
- **TypeScript** for type safety
- **Prisma** for database management
- **Winston** for logging
- **MVC Pattern** with controllers and middleware

### API Versioning

The API uses folder-based versioning:
- `controllers/v1/` - Version 1 controllers
- `routes/v1/` - Version 1 routes
- Future versions: `v2/`, `v3/`, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages
- Follow MVC pattern with controllers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/your-org/st-open-source/wiki)
- 🐛 [Issues](https://github.com/your-org/st-open-source/issues)
- 💬 [Discussions](https://github.com/your-org/st-open-source/discussions)

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database powered by [Prisma](https://www.prisma.io/)
- Logging with [Winston](https://github.com/winstonjs/winston) 
