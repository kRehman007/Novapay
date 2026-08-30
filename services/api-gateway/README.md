# API Gateway

NovaPay API Gateway - Single entry point for all client requests with JWT authentication, rate limiting, and request routing.

## Overview

The API Gateway serves as the unified entry point for all NovaPay API consumers. It handles authentication, rate limiting, and routes requests to the appropriate backend microservice.

## Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Validates tokens before routing to services |
| **Rate Limiting** | Configurable per-client rate limits |
| **Request Routing** | Automatic routing to correct backend service |
| **Health Aggregation** | Checks health of all backend services |
| **CORS** | Cross-origin resource sharing enabled |
| **Security Headers** | Helmet.js security headers |

## Tech Stack

- Node.js + Express
- Axios for HTTP proxying
- JWT for token validation
- Helmet for security
- Morgan for HTTP logging
- Winston for structured logging

## Service Structure

```
src/
├── server.js                 # Entry point
├── app.js                    # Express app configuration
├── middleware/
│   ├── auth.middleware.js    # JWT token validation
│   ├── error.middleware.js   # Error handling
│   └── rateLimit.middleware.js # Rate limiting
├── routes/
│   └── gateway.routes.js    # Request routing
├── services/
│   └── gateway.service.js   # Service discovery and proxy
└── test/
    ├── gateway.test.js       # Unit tests
    └── gateway.integration.test.js # Supertest tests
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Gateway health + all service statuses |
| ALL | `/api/*` | Proxied to backend service (requires JWT) |

### Routing Rules

| Path Prefix | Target Service |
|-------------|----------------|
| `/api/accounts` | Account Service (4001) |
| `/api/transfers` | Transaction Service (4002) |
| `/api/ledger` | Ledger Service (4003) |
| `/api/fx` | FX Service (4004) |
| `/api/payroll` | Payroll Service (4005) |
| `/api/admin` | Admin Service (4006) |

## Request Flow

```
Client → API Gateway (4000)
         ├── JWT Validation
         ├── Rate Limiting
         └── Route to Service
              ├── Account Service (4001)
              ├── Transaction Service (4002)
              ├── Ledger Service (4003)
              ├── FX Service (4004)
              ├── Payroll Service (4005)
              └── Admin Service (4006)
```

## Environment Variables

```bash
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
JWT_SECRET=novapay_jwt_secret_2024
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
SERVICE_KEY=7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH

# Backend Service URLs
ACCOUNT_SERVICE_URL=http://localhost:4001
TRANSACTION_SERVICE_URL=http://localhost:4002
LEDGER_SERVICE_URL=http://localhost:4003
FX_SERVICE_URL=http://localhost:4004
PAYROLL_SERVICE_URL=http://localhost:4005
ADMIN_SERVICE_URL=http://localhost:4006
```

## Testing

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run manual tests
npm run test:manual
```

## Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Access token required | Missing Authorization header |
| 403 | Invalid token | Expired or malformed JWT |
| 404 | Route not found | No service handles this path |
| 429 | Too many requests | Rate limit exceeded |
| 502 | Service unavailable | Backend service is down |
