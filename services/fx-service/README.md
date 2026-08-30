# FX Service

NovaPay FX Service - Exchange rates, time-locked quotes, and single-use enforcement.

## Overview

The FX Service handles currency exchange operations with time-locked quotes (60s TTL) and single-use enforcement to prevent stale rate application.

## Features

| Feature | Description |
|---------|-------------|
| **Time-Locked Quotes** | 60-second TTL, expires automatically |
| **Single-Use Enforcement** | Quote can only be used once |
| **Rate Caching** | 5-minute cache for exchange rates |
| **Multiple Providers** | Simulated ECB provider with realistic rates |
| **Rate History** | Stores rate history for audit |

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- Winston for logging
- Helmet for security
- Morgan for HTTP logging
- Jest + Supertest for testing

## Service Structure

```
src/
├── server.js                 # Entry point
├── app.js                    # Express app configuration
├── config/
│   └── database.js           # MongoDB connection
├── controllers/
│   └── fx.controller.js      # HTTP request handlers
├── middleware/
│   ├── auth.middleware.js    # Service key auth
│   └── error.middleware.js   # Error handling
├── models/
│   ├── fxQuote.model.js      # Time-locked quotes
│   └── fxRate.model.js       # Exchange rate cache
├── repositories/
│   └── fx.repository.js      # Database operations
├── routes/
│   └── fx.routes.js          # API routes
├── services/
│   └── fx.services.js        # Core business logic
├── test/
│   ├── fx.test.js            # Unit tests
│   └── fx.integration.test.js # Supertest tests
└── utils/
    ├── idGenerator.js        # ID generation
    └── logger.js             # Winston logger
```

## Data Models

### FxQuote

```javascript
{
  quoteId: "fxq_xxx",
  sourceCurrency: "USD",
  targetCurrency: "EUR",
  sourceAmountMinor: 10000,
  targetAmountMinor: 9200,
  rate: 0.92,
  provider: "ECB",
  status: "ACTIVE",           // ACTIVE | USED | EXPIRED
  usedByTransactionId: null,
  expiresAt: "2024-01-01T10:01:00Z"
}
```

### FxRate

```javascript
{
  pair: "USDEUR",
  sourceCurrency: "USD",
  targetCurrency: "EUR",
  rate: 0.92,
  provider: "ECB",
  fetchedAt: "2024-01-01T10:00:00Z",
  expiresAt: "2024-01-01T10:05:00Z"
}
```

## API Endpoints

All endpoints require `X-Service-Key` header for authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fx/quote` | Create locked rate quote (60s TTL) |
| GET | `/api/fx/quote/:quoteId` | Get quote details |
| GET | `/api/fx/quote/:quoteId/validate` | Validate quote (exists, active, not expired) |
| PUT | `/api/fx/quote/:quoteId/use` | Mark quote as used (single-use enforcement) |
| GET | `/api/fx/rate/:source/:target` | Get current rate (for display) |
| GET | `/api/fx/quotes` | Get recent quotes |
| GET | `/api/fx/rates` | Get recent rates |
| GET | `/api/fx/history/:source/:target` | Get quote history for pair |

## Quote Flow

### Creating a Quote

```
1. Validate request
   - Source and target currencies must be different
   - sourceAmountMinor must be >= 1

2. Get exchange rate
   - Check cache (5-minute TTL)
   - If expired: fetch from provider
   - Store in cache

3. Calculate target amount
   - targetAmountMinor = sourceAmountMinor * rate

4. Create quote with 60s TTL
   - Status: ACTIVE
   - expiresAt: now + 60 seconds

5. Return quote
```

### Using a Quote

```
1. Validate quote
   - Quote must exist
   - Status must be ACTIVE
   - Must not be expired

2. Mark as USED
   - Set status: USED
   - Set usedByTransactionId

3. Return updated quote
```

### Quote Lifecycle

```
ACTIVE → USED (on first use)
    │
    └──→ EXPIRED (after 60 seconds)
```

## Supported Currency Pairs

| Pair | Rate | Provider |
|------|------|----------|
| USD/EUR | 0.92 | ECB |
| USD/GBP | 0.79 | ECB |
| USD/PKR | 280.50 | ECB |
| EUR/USD | 1.087 | ECB |
| GBP/USD | 1.266 | ECB |
| EUR/PKR | 304.89 | ECB |

## Environment Variables

```bash
PORT=4004
MONGODB_URI=mongodb://127.0.0.1:27017/novapay_fx_db?replicaSet=rs0
SERVICE_KEY=7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH
LOG_LEVEL=info
FX_QUOTE_TTL_SECONDS=60
FX_RATE_CACHE_TTL_SECONDS=300
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

# Run manual tests (requires MongoDB)
npm run test:manual
```

## Manual Testing

1. Start MongoDB
2. Start FX Service:
   ```bash
   npm start
   ```
3. Run manual tests:
   ```bash
   npm run test:manual
   ```

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Source and target currencies must be different | Same currency pair |
| 400 | sourceAmountMinor must be at least 1 | Invalid amount |
| 400 | FX quote is expired | Quote TTL exceeded |
| 400 | FX quote is used | Quote already used |
| 403 | Invalid service key | Missing or wrong X-Service-Key |
| 404 | FX quote not found | Quote ID doesn't exist |
