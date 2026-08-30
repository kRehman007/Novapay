# NovaPay Architecture

## System Overview

NovaPay is a microservices-based financial platform designed for high-throughput (1,000+ RPS), crash-resilient payment processing with strict financial invariants.


## Service Communication Patterns

### Synchronous Communication (HTTP/REST)

Used for operations that require immediate response:

| Caller | Callee | Endpoint | Purpose |
|--------|--------|----------|---------|
| Transaction Service | Account Service | `GET /accounts/:id/balance` | Check sufficient balance |
| Transaction Service | Account Service | `GET /accounts/:id/validate` | Validate wallet exists & active |
| Transaction Service | FX Service | `GET /fx/quote/:id` | Validate quote before transfer |
| Transaction Service | Ledger Service | `POST /ledger/entries` | Record debit/credit entries |
| Ledger Service | Account Service | `GET /accounts/:id` | Get account details for balance calc |
| Admin Service | All Services | `GET /internal/*` | Aggregate data for dashboard |

### Asynchronous Communication (Queue)

Used for operations that can be processed later:

| Producer | Consumer | Queue | Purpose |
|----------|----------|-------|---------|
| Transaction Service | Transaction Service | `transfer-processing` | Process individual transfers |
| Payroll Service | Transaction Service | `payroll-transfers` | Process batch salary payments |
| All Services | All Services | `audit-logging` | Write audit log entries |

### Event-Driven Communication

Used for notifications and side effects:

| Producer | Event | Consumers |
|----------|-------|-----------|
| Transaction Service | `transfer.completed` | Account Service (update balance cache), Admin Service (log) |
| Transaction Service | `transfer.failed` | Admin Service (alert), Payroll Service (mark item failed) |
| Ledger Service | `invariant.violated` | Admin Service (CRITICAL ALERT) |

## Service Boundaries

### Account Service (Port 4001)

**Owns:**
- User profiles and authentication
- Wallet creation and management
- Balance calculation (derived from ledger entries)
- KYC verification status

**Does NOT Own:**
- Recording money movements (Ledger Service)
- Initiating transfers (Transaction Service)
- Exchange rates (FX Service)

**API Endpoints:**
```
POST   /accounts              Create new wallet
GET    /accounts/:id          Get account details
GET    /accounts/:id/balance  Get current balance
GET    /accounts/user/:userId Get all accounts for user
PUT    /accounts/:id/status   Update account status (freeze/unfreeze)
POST   /accounts/validate     Validate multiple accounts exist
```

### Transaction Service (Port 4002)

**Owns:**
- Transfer initiation and orchestration
- Idempotency key management
- Transaction status tracking
- Crash recovery and retry logic

**Does NOT Own:**
- Recording entries (Ledger Service)
- Balance calculation (Ledger Service)
- Account management (Account Service)
- FX rate fetching (FX Service)

**API Endpoints:**
```
POST   /transfers/domestic      Initiate domestic transfer
POST   /transfers/international Initiate international transfer (requires FX quote)
GET    /transfers/:id           Get transfer status
GET    /transfers/:id/history   Get transfer timeline
POST   /transfers/:id/reverse   Reverse a completed transfer
GET    /transfers/pending       Get pending transfers (for recovery)
PUT    /transfers/:id/complete  Mark transfer as completed (recovery)
PUT    /transfers/:id/failed    Mark transfer as failed (recovery)
```

### Ledger Service (Port 4003)

**Owns:**
- Double-entry bookkeeping records
- Balance calculation from entries
- Audit log with hash chaining
- Financial invariant enforcement

**Does NOT Own:**
- Transfer orchestration (Transaction Service)
- Account management (Account Service)
- FX quotes (FX Service)

**API Endpoints:**
```
POST   /ledger/entries              Create entry pair (debit + credit)
GET    /ledger/entries/:txnId       Get all entries for transaction
GET    /ledger/accounts/:id/balance Get balance for account
GET    /ledger/accounts/:id/history Get entry history for account
POST   /ledger/audit                Create audit log entry
GET    /ledger/audit/:txnId         Get audit trail for transaction
GET    /ledger/invariant/check      Verify all transactions balance
```

### FX Service (Port 4004)

**Owns:**
- Exchange rate fetching from providers
- Time-locked quote generation (60s TTL)
- Quote validation and single-use enforcement
- Rate history storage

**Does NOT Own:**
- Transfer execution (Transaction Service)
- Ledger recording (Ledger Service)

**API Endpoints:**
```
POST   /fx/quote           Create locked rate quote (60s TTL)
GET    /fx/quote/:id       Get quote details and time remaining
PUT    /fx/quote/:id/use   Mark quote as used (single-use enforcement)
GET    /fx/rates/:from/:to Get current rate (for display only, not for transfers)
GET    /fx/history         Get rate history
```

### Payroll Service (Port 4005)

**Owns:**
- Bulk payment file processing
- Queue management for batch transfers
- Progress tracking and checkpointing
- Resumability after crashes

**Does NOT Own:**
- Individual transfer execution (Transaction Service)
- Account management (Account Service)

**API Endpoints:**
```
POST   /payroll/batches           Create new payroll batch
GET    /payroll/batches/:id       Get batch status and progress
GET    /payroll/batches/:id/items Get individual items in batch
POST   /payroll/batches/:id/pause Pause batch processing
POST   /payroll/batches/:id/resume Resume batch processing
GET    /payroll/batches/:id/stats Get batch statistics
```

### Admin Service (Port 4006)

**Owns:**
- System health monitoring
- Transaction search and investigation
- Dispute resolution
- Compliance reporting
- Incident response actions

**Does NOT Own:**
- Any financial operations (read-only except for incident response)

**API Endpoints:**
```
GET    /admin/dashboard           Get system health overview
GET    /admin/transactions/search Search transactions by criteria
GET    /admin/transactions/:id    Get full transaction detail
GET    /admin/audit/trail/:txnId  Get complete audit trail
POST   /admin/accounts/:id/freeze Freeze account (incident response)
POST   /admin/accounts/:id/unfreeze Unfreeze account
POST   /admin/transfers/:id/reverse Reverse transfer (with justification)
GET    /admin/compliance/report   Generate compliance report
```

## Database Isolation

Each service has its own database. No shared collections between services.

| Service | Database Name | Collections |
|---------|---------------|-------------|
| Account Service | novapay_account_db | users, wallets, kyc_records |
| Transaction Service | novapay_txn_db | transactions, idempotency_keys |
| Ledger Service | novapay_ledger_db | ledgerAccounts, ledgerTransactions, ledgerEntries, auditLogs |
| FX Service | novapay_fx_db | fxQuotes, fxRates, fxRateHistory |
| Payroll Service | novapay_payroll_db | payrollBatches, payrollItems |
| Admin Service | novapay_admin_db | disputes, alerts, reports |

## Cross-Service References

Services reference each other using string IDs (not MongoDB ObjectId refs):

```
Transaction Service
├── senderWalletId → Account Service wallet._id
├── receiverWalletId → Account Service wallet._id
├── fxQuoteId → FX Service fxQuote._id
└── ledgerTransactionId → Ledger Service ledgerTransaction._id

Ledger Service
├── accountId → Account Service wallet._id
└── transactionId → Transaction Service transaction._id

Payroll Service
├── employerAccountId → Account Service wallet._id
└── transactionIds → Transaction Service transaction._id (array)
```

## High Availability Design

### Load Balancing
- Each service runs 2+ instances behind a load balancer
- Round-robin distribution for stateless services
- Session affinity not required (no in-memory sessions)

### Database Replication
- MongoDB replica set (rs0) for each service database
- Primary for writes, secondaries for reads
- Automatic failover on primary failure

### Queue Resilience
- Redis Cluster for BullMQ
- Persistent queues (survive Redis restart)
- Dead letter queue for permanently failed items

### Circuit Breaker Pattern
- External FX provider calls use circuit breaker
- Open state: Return error immediately (never use stale cache)
- Half-open state: Try one request to test provider recovery

## Request Flow Examples

### Domestic Transfer ($100 USD from User A to User B)

```
1. Client → API Gateway: POST /transfers/domestic {sender, receiver, amount: 10000, currency: "USD", idempotencyKey: "key-123"}

2. API Gateway → Transaction Service: Forward request

3. Transaction Service:
   a. Check idempotency_key table for "key-123"
      - Found? Return cached response (Scenario A)
      - Not found? Continue
   b. Store idempotency_key with status: PROCESSING
   c. Account Service: Validate sender wallet exists & active
   d. Account Service: Validate receiver wallet exists & active
   e. Ledger Service: Get sender balance
   f. Verify balance >= $100
   g. Ledger Service: Create entries
      - DEBIT sender_wallet: 10000
      - CREDIT receiver_wallet: 10000
   h. Update transaction status: COMPLETED
   i. Update idempotency_key with response

4. Transaction Service → Client: {transactionId: "txn_xyz", status: "COMPLETED"}
```

### International Transfer ($2000 USD to EUR with FX Quote)

```
1. Client → API Gateway: POST /fx/quote {from: "USD", to: "EUR", amount: 200000}

2. FX Service → Client: {quoteId: "fxq_abc", rate: 0.92, expiresAt: "2024-01-01T10:01:00Z"}

3. Client → API Gateway: POST /transfers/international {sender, receiver, amount: 200000, currency: "USD", fxQuoteId: "fxq_abc", idempotencyKey: "key-456"}

4. Transaction Service:
   a. Idempotency check
   b. FX Service: Validate fxq_abc (exists? expired? already used?)
   c. FX Service: Mark fxq_abc as USED
   d. Account Service: Validate wallets
   e. Ledger Service: Create entries
      - DEBIT sender_wallet: 200000 USD
      - CREDIT receiver_wallet: 184000 EUR (200000 * 0.92)
      - fxQuoteId: "fxq_abc" on both entries
   f. Complete transaction

5. Transaction Service → Client: {transactionId: "txn_def", status: "COMPLETED"}
```

## Failure Scenarios and Recovery

### Crash Before Ledger Write
- Transaction status remains PENDING
- On startup, Transaction Service queries PENDING transactions
- If sender debited but no credit entries: REVERSE the debit
- If no entries at all: Mark as FAILED

### FX Provider Down
- Transaction Service calls FX Service
- FX Service attempts provider call, fails
- FX Service returns error: "FX_PROVIDER_UNAVAILABLE"
- Transaction Service returns error to client
- Client must retry later

### Database Write Failure
- All financial writes use transactions (MongoDB sessions)
- Either all entries written or none
- If partial write detected: Rollback and retry

## Performance Considerations

### Read Optimization
- Balance caching in Account Service (Redis)
- Denormalized data where appropriate
- Database indexes on all query patterns

### Write Optimization
- Batch writes for payroll (bulk insert)
- Async audit logging (queue-based)
- Connection pooling per service

### Query Optimization
- Paginated responses for all list endpoints
- Cursor-based pagination for large datasets
- Materialized views for analytics queries

## Security Model

### Authentication
- JWT tokens validated at API Gateway
- Service-to-service: mTLS or shared secret

### Authorization
- Role-based access control (RBAC)
- Admin actions require additional verification

### Data Encryption
- Field-level encryption for PII (envelope encryption)
- Two-key hierarchy: Master Key + Data Key
- Encrypted fields: SSN, bank account numbers, etc.

### Audit Trail
- Every financial action logged
- Hash-chained audit logs (tamper-evident)
- Immutable once written
