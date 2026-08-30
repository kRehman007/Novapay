# Payroll Service

NovaPay Payroll Service - Bulk payments, queue management, and crash recovery.

## Overview

The Payroll Service handles batch salary payments for employers with queue-based processing, progress tracking, and resumability after crashes.

## Features

| Feature | Description |
|---------|-------------|
| **Bulk Payments** | Process multiple employee salaries in one batch |
| **Queue Management** | BullMQ with concurrency=1 per employer |
| **Progress Tracking** | Real-time stats (processed, successful, failed) |
| **Crash Recovery** | Resumes from last checkpoint on restart |
| **Pause/Resume** | Pause processing and resume later |
| **Retry Logic** | 3 attempts with exponential backoff |

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- Redis (ioredis) + BullMQ for queue
- Winston for logging
- Helmet for security
- Morgan for HTTP logging
- Jest + Supertest for testing

## Service Structure

```
src/
├── server.js                 # Entry point, queue init, recovery
├── app.js                    # Express app configuration
├── config/
│   ├── database.js           # MongoDB connection
│   └── redis.js              # Redis connection
├── controllers/
│   └── payroll.controller.js # HTTP request handlers
├── middleware/
│   ├── auth.middleware.js    # Service key auth
│   └── error.middleware.js   # Error handling
├── models/
│   ├── payrollBatch.model.js # Batch records
│   └── payrollItem.model.js  # Individual payments
├── repositories/
│   └── payroll.repository.js # Database operations
├── routes/
│   └── payroll.routes.js     # API routes
├── services/
│   └── payroll.services.js   # Core business logic + queue
├── test/
│   ├── payroll.test.js       # Unit tests
│   └── payroll.integration.test.js # Supertest tests
└── utils/
    ├── idGenerator.js        # ID generation
    └── logger.js             # Winston logger
```

## Data Models

### PayrollBatch

```javascript
{
  batchId: "bat_xxx",
  employerId: "usr_employer",
  employerWalletId: "wal_employer",
  name: "August Salaries",
  currency: "PKR",
  status: "PROCESSING",       // PENDING | PROCESSING | COMPLETED | PARTIAL | FAILED | PAUSED
  totalItems: 100,
  processedItems: 75,
  successfulItems: 70,
  failedItems: 5,
  totalAmountMinor: 10000000,
  processedAmountMinor: 7500000,
  lastProcessedIndex: 75,
  idempotencyKey: "iky_xxx"
}
```

### PayrollItem

```javascript
{
  itemId: "pay_xxx",
  batchId: "bat_xxx",
  employeeId: "usr_emp",
  employeeWalletId: "wal_emp",
  amountMinor: 50000,
  status: "COMPLETED",        // PENDING | PROCESSING | COMPLETED | FAILED
  transactionId: "txn_xxx",
  failureReason: null,
  retryCount: 0,
  maxRetries: 3,
  idempotencyKey: "iky_xxx_0"
}
```

## API Endpoints

All endpoints require `X-Service-Key` header for authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payroll/batches` | Create new payroll batch |
| GET | `/api/payroll/batches` | Get recent batches |
| GET | `/api/payroll/batches/:batchId` | Get batch status and progress |
| GET | `/api/payroll/batches/:batchId/items` | Get individual items in batch |
| GET | `/api/payroll/batches/:batchId/stats` | Get batch statistics |
| POST | `/api/payroll/batches/:batchId/start` | Start batch processing |
| POST | `/api/payroll/batches/:batchId/pause` | Pause batch processing |
| POST | `/api/payroll/batches/:batchId/resume` | Resume batch processing |
| POST | `/api/payroll/recovery` | Recover incomplete batches |

## Batch Processing Flow

### Creating a Batch

```
1. Validate request
   - employerId, employerWalletId, name, currency required
   - items array must have at least 1 item

2. Calculate totalAmountMinor
   - Sum all item amounts

3. Create PayrollBatch record
   - Status: PENDING
   - totalItems: items.length

4. Create PayrollItem records
   - All items: status: PENDING

5. Return batch info
```

### Starting a Batch

```
1. Validate batch exists
   - Status must be PENDING or PARTIAL

2. Update status to PROCESSING
   - Set startedAt

3. Queue all pending items
   - Each item becomes a BullMQ job
   - Concurrency: 1 per employer

4. Return queued count
```

### Processing an Item

```
1. Mark item as PROCESSING

2. Call Transaction Service
   - POST /api/transfers/domestic
   - sender: employer wallet
   - receiver: employee wallet

3. On success:
   - Mark item COMPLETED
   - Set transactionId
   - Update batch progress

4. On failure:
   - If retries < maxRetries:
     - Mark item PENDING (will retry)
   - If retries >= maxRetries:
     - Mark item FAILED
     - Update batch progress

5. Check if batch complete
   - If all items done: COMPLETED or PARTIAL
```

### Pause/Resume

```
Pause:
  1. Update batch status to PAUSED
  2. Pause all queued jobs for this batch

Resume:
  1. Update batch status to PROCESSING
  2. Resume all paused jobs for this batch
```

### Crash Recovery

```
On startup:
  1. Find all PROCESSING or PARTIAL batches
  2. For each batch:
     - Update status to PARTIAL
     - Re-queue pending items
  3. Log recovery results
```

## Batch States

```
PENDING → PROCESSING → COMPLETED
    │          │
    │          ├──→ PARTIAL (some items failed)
    │          │
    │          └──→ PAUSED → PROCESSING
    │
    └──→ FAILED
```

## Environment Variables

```bash
PORT=4005
MONGODB_URI=mongodb://127.0.0.1:27017/novapay_payroll_db?replicaSet=rs0
SERVICE_KEY=7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH
LOG_LEVEL=info
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
TRANSACTION_SERVICE_URL=http://localhost:4002
ACCOUNT_SERVICE_URL=http://localhost:4001
PAYROLL_CONCURRENCY=1
PAYROLL_MAX_RETRIES=3
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

# Run manual tests (requires MongoDB + Redis)
npm run test:manual
```

## Manual Testing

1. Start MongoDB and Redis
2. Start Transaction Service (port 4002)
3. Start Payroll Service:
   ```bash
   npm start
   ```
4. Run manual tests:
   ```bash
   npm run test:manual
   ```

## Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | At least one item required | Empty items array |
| 400 | Cannot start batch in status | Invalid batch status for action |
| 403 | Invalid service key | Missing or wrong X-Service-Key |
| 404 | Batch not found | Batch ID doesn't exist |
| 409 | Duplicate value | Idempotency key already used |
