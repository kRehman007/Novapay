# Ledger Service

NovaPay Ledger Service - Double-entry bookkeeping, invariant checks, and hash-chained audit logs.

## Overview

The Ledger Service is the **source of truth** for all financial records. Every money movement is recorded as double-entry ledger entries with immutable, hash-chained audit logs.

## Features

| Feature | Description |
|---------|-------------|
| **Double-Entry Bookkeeping** | Every transaction requires DEBIT + CREDIT entries that balance |
| **Invariant Check** | `totalDebit === totalCredit` enforced for domestic transfers |
| **FX Transfers** | Different debit/credit amounts allowed with `fxRate` required |
| **Hash-Chained Audit Logs** | Each audit log contains `previousHash` creating an immutable chain |
| **Audit Log Integrity Verification** | Verify the entire chain is unbroken |

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
│   └── ledger.controller.js  # HTTP request handlers
├── middleware/
│   ├── auth.middleware.js    # Service key auth
│   └── error.middleware.js   # Error handling
├── models/
│   ├── ledgerAccount.model.js    # Account definitions
│   ├── ledgerEntry.model.js      # Individual entries (DEBIT/CREDIT)
│   ├── ledgerTransaction.model.js # Transaction groupings
│   └── auditLog.model.js         # Hash-chained audit trail
├── repositories/
│   └── ledger.repository.js  # Database operations
├── routes/
│   └── ledger.routes.js      # API routes
├── services/
│   └── ledger.services.js    # Core business logic
├── test/
│   ├── ledger.test.js        # Unit tests
│   └── ledger.integration.test.js  # Supertest tests
└── utils/
    ├── idGenerator.js        # ID generation + hashing
    └── logger.js             # Winston logger
```

## Data Models

### LedgerAccount

```javascript
{
  accountId: "lac_xxx",      // Unique identifier
  ownerId: "usr_xxx",        // Owner (user/system)
  ownerType: "USER",         // USER | SYSTEM | FEE_ACCOUNT
  accountType: "WALLET",     // WALLET | FEE | SYSTEM
  currency: "USD",           // 3-letter currency code
  status: "ACTIVE",          // ACTIVE | SUSPENDED | CLOSED
  normalBalance: "DEBIT"     // DEBIT | CREDIT
}
```

### LedgerEntry

```javascript
{
  entryId: "len_xxx",
  transactionId: "ltx_xxx",  // Links to LedgerTransaction
  accountId: "lac_xxx",      // Which account
  entryType: "DEBIT",        // DEBIT | CREDIT
  amountMinor: 10000,        // Amount in minor units (cents)
  currency: "USD",
  fxRate: 0.92,              // Optional, for FX transfers
  fxQuoteId: "fxq_xxx",      // Optional, for FX transfers
  feeEntryType: "MAIN"       // MAIN | FEE
}
```

### LedgerTransaction

```javascript
{
  transactionId: "ltx_xxx",
  type: "TRANSFER",          // TRANSFER | PAYROLL | FEE | REFUND | FX_TRANSFER | REVERSAL
  status: "COMPLETED",       // PENDING | COMPLETED | FAILED | REVERSED
  reference: "txn_xxx",      // External reference
  totalDebitMinor: 10000,
  totalCreditMinor: 10000,
  isInvariantBalanced: true
}
```

### AuditLog

```javascript
{
  logId: "aud_xxx",
  transactionId: "ltx_xxx",
  action: "ENTRY_CREATED",   // Action type
  actorId: "SYSTEM",         // Who performed action
  details: {},               // Action-specific data
  previousHash: "abc123...",  // Hash of previous log
  hash: "def456..."          // This log's hash
}
```

## API Endpoints

All endpoints require `X-Service-Key` header for authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ledger/entries` | Create double-entry ledger entries |
| GET | `/api/ledger/entries/:transactionId` | Get entries for a transaction |
| GET | `/api/ledger/account/:accountId/entries` | Get entries for an account |
| GET | `/api/ledger/account/:accountId/balance` | Get account balance |
| GET | `/api/ledger/transaction/:transactionId` | Get ledger transaction |
| GET | `/api/ledger/transactions` | Get recent transactions |
| GET | `/api/ledger/integrity` | Verify audit log chain integrity |
| GET | `/api/ledger/audit-logs` | Get audit logs |

## Ledger Entry Flow

### Creating Entries

```
1. Validate request
   - At least 2 entries required
   - transactionId and type required

2. Invariant check (domestic transfers)
   - totalDebit must equal totalCredit
   - For FX transfers: amounts differ (different currencies)

3. Log audit: TRANSACTION_CREATED

4. Create LedgerTransaction record

5. Create all LedgerEntry records

6. For each entry: Log audit: ENTRY_CREATED

7. Log audit: INVARIANT_CHECK_PASSED (or FAILED)

8. Update status: COMPLETED

9. Log audit: TRANSACTION_COMPLETED

10. Return result
```

### Hash-Chained Audit Logs

```
Log 1: { previousHash: null,           hash: "aaa..." }
Log 2: { previousHash: "aaa...",       hash: "bbb..." }
Log 3: { previousHash: "bbb...",       hash: "ccc..." }
```

Each log's hash depends on the previous log's hash, creating an immutable chain. If any log is tampered with, the chain breaks.

### Integrity Verification

```
GET /api/ledger/integrity

Response:
{
  "valid": true,
  "totalLogs": 150
}
```

If `valid: false`, the response includes:
```json
{
  "valid": false,
  "brokenAt": "aud_xxx",
  "expected": "aaa...",
  "actual": "bbb..."
}
```

## Double-Entry Bookkeeping

### Domestic Transfer

```
DEBIT:  wal_sender    -10000 USD
CREDIT: wal_receiver  +10000 USD

Total Debit:  10000
Total Credit: 10000
Balanced:     YES
```

### FX Transfer

```
DEBIT:  wal_usd  -10000 USD (fxRate: 0.92)
CREDIT: wal_eur  +9200 EUR  (fxRate: 0.92)

Total Debit:  10000 (USD)
Total Credit: 9200  (EUR)
Balanced:     YES (different currencies, same value)
```

### Reversal

```
Original:
  DEBIT:  wal_a  -10000 USD
  CREDIT: wal_b  +10000 USD

Reversal:
  DEBIT:  wal_b  -10000 USD
  CREDIT: wal_a  +10000 USD
```

## Environment Variables

```bash
PORT=4003
MONGODB_URI=mongodb://127.0.0.1:27017/novapay_ledger_db?replicaSet=rs0
SERVICE_KEY=test-service-key
LOG_LEVEL=info
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
2. Start Ledger Service:
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
| 400 | At least 2 entries required | Double-entry needs minimum 2 entries |
| 400 | Invariant check failed | Debits != Credits |
| 400 | FX entries must include valid fxRate | FX transfer missing rate |
| 400 | transactionId is required | Missing required field |
| 400 | type is required | Missing required field |
| 403 | Invalid service key | Missing or wrong X-Service-Key |
| 404 | Ledger transaction not found | Transaction ID doesn't exist |
| 409 | Duplicate value | Transaction ID already exists |
