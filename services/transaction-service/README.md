# Transaction Service

NovaPay Transaction Service - Handles idempotent transfers, FX transfers, reversals, and crash recovery.

## Overview

The Transaction Service is the **orchestrator** that coordinates money movements between accounts by calling other services (Account, Ledger, FX).

## Features

| Feature | Description |
|---------|-------------|
| **Idempotency** | 24h TTL keys, request hash validation, payload mismatch detection |
| **Transfer Orchestration** | Validate → Debit → Credit → Complete |
| **Crash Recovery** | Detects PENDING transactions, checks ledger entries, recovers or fails |
| **FX Transfers** | Validates quote (exists, expired, used), locked rate on ledger |
| **Reversal** | Creates reverse ledger entries, updates balance cache |

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- Redis (ioredis) for balance caching
- BullMQ (planned for async processing)
- Jest + Supertest for testing

## Service Structure

```
src/
├── server.js                 # Entry point, startup recovery
├── app.js                    # Express app configuration
├── config/
│   ├── database.js           # MongoDB connection
│   └── redis.js              # Redis connection
├── controllers/
│   └── transaction.controller.js
├── middleware/
│   ├── auth.middleware.js    # JWT + Service key auth
│   └── error.middleware.js   # Error handling
├── models/
│   ├── transaction.model.js
│   └── idempotencyKey.model.js
├── repositories/
│   └── transaction.repository.js
├── routes/
│   └── transaction.routes.js
├── services/
│   └── transaction.services.js  # Core business logic
├── test/
│   ├── transaction.test.js      # Unit tests
│   └── transaction.integration.test.js  # Supertest tests
└── utils/
    ├── idGenerator.js
    └── logger.js
```

## API Endpoints

### Authenticated (JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transfers/domestic` | Send money (same currency) |
| POST | `/api/transfers/international` | Send money (with FX quote) |
| GET | `/api/transfers/:id` | Get transfer status |
| GET | `/api/transfers/user/:userId` | Get user transfers |
| POST | `/api/transfers/:id/reverse` | Reverse transfer |

### Service-to-Service (X-Service-Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transfers/pending` | Get incomplete transfers |
| PUT | `/api/transfers/:id/complete` | Mark completed (recovery) |
| POST | `/api/transfers/recovery` | Run recovery |

## Transfer Flow

### Domestic Transfer (createTransfer)

```
1. Check idempotency key
   - If exists + same payload → Return cached response
   - If exists + different payload → ERROR (409)
   - If no key → Continue

2. Validate wallets (call Account Service)
   - Both wallets must exist and be ACTIVE

3. Check sender balance (call Account Service)
   - Sender must have sufficient balance

4. Create idempotency key (status: PROCESSING)

5. Create transaction record (status: PROCESSING)

6. Create ledger entries (call Ledger Service)
   - DEBIT sender
   - CREDIT receiver

7. Update status to COMPLETED

8. Update balance cache (Redis)

9. Return response
```

### FX Transfer (createFxTransfer)

```
1. Check idempotency key

2. Validate FX quote (call FX Service)
   - Quote must exist, be ACTIVE, not expired

3. Validate wallets

4. Check sender balance

5. Create idempotency key

6. Create transaction with FX rate
   - amountMinor: 10000 (USD sent)
   - fxRate: 0.92
   - convertedAmountMinor: 9200 (EUR received)

7. Create ledger entries with FX rate

8. Mark FX quote as used (single-use enforcement)

9. Update status & cache
```

### Reversal (reverseTransaction)

```
1. Find original transaction
   - Must be COMPLETED
   - Cannot reverse a REVERSAL

2. Create reversal transaction
   - SWAP sender and receiver

3. Create reverse ledger entries

4. Update statuses
   - Original: COMPLETED → REVERSED
   - Reversal: PROCESSING → COMPLETED

5. Update balance caches
```

### Crash Recovery (recoverTransaction)

```
1. Find stuck transaction (PENDING/PROCESSING)

2. Check if ledger entries exist

3. If entries exist → Mark COMPLETED
4. If no entries → Mark FAILED
```

## Transaction States

```
PENDING → PROCESSING → COMPLETED
    │          │
    │          └──→ FAILED
    │
    └──→ FAILED

COMPLETED → REVERSED
```

## Environment Variables

```bash
PORT=4002
MONGODB_URI=mongodb://127.0.0.1:27017/novapay_transaction_db?replicaSet=rs0
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your-secret-key
SERVICE_KEY=test-service-key
ACCOUNT_SERVICE_URL=http://localhost:4001
LEDGER_SERVICE_URL=http://localhost:4003
FX_SERVICE_URL=http://localhost:4004
IDEMPOTENCY_TTL_HOURS=24
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

# Run manual tests (requires running servers)
npm run test:manual
```

## Manual Testing

1. Start MongoDB and Redis
2. Start Account Service (port 4001)
3. Start Ledger Service (port 4003)
4. Start FX Service (port 4004)
5. Start Transaction Service:
   ```bash
   npm start
   ```
6. Run manual tests:
   ```bash
   npm run test:manual
   ```

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Insufficient balance | Sender has insufficient funds |
| 400 | Invalid wallet | Wallet doesn't exist or is inactive |
| 400 | FX quote expired | Quote TTL has expired |
| 409 | Idempotency key reused | Same key with different payload |
| 409 | Transfer in progress | Duplicate request for same transfer |
| 404 | Transaction not found | Transfer ID doesn't exist |
