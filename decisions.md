# NovaPay Architectural Decisions

## Checkpoint 1: Architecture and Design

### 1. Microservices Architecture

**Decision:** Use microservices architecture with 6 independent services.

**Rationale:**
- Each service has a single responsibility
- Independent scaling (Transaction Service needs more instances than Admin Service)
- Fault isolation (FX Service failure doesn't crash Account Service)
- Team autonomy (different teams can work on different services)

**Tradeoffs:**
- Increased operational complexity
- Network latency between services
- Distributed transaction challenges

---

### 2. Database Isolation

**Decision:** Each service owns its own database. No shared collections between services.

**Rationale:**
- Prevents tight coupling between services
- Each service can evolve its schema independently
- Prevents cross-service queries that break encapsulation
- Enables independent database scaling and optimization

**Implementation:**
| Service | Database |
|---------|----------|
| Account Service | novapay_account_db |
| Transaction Service | novapay_txn_db |
| Ledger Service | novapay_ledger_db |
| FX Service | novapay_fx_db |
| Payroll Service | novapay_payroll_db |
| Admin Service | novapay_admin_db |

---

### 3. String IDs Instead of MongoDB Refs

**Decision:** Use string IDs (UUID/ULID) instead of MongoDB ObjectId refs between services.

**Rationale:**
- Service independence (no schema dependency)
- Flexible ID formats (prefixed IDs like `txn_`, `usr_`)
- Cross-database compatibility (can switch to PostgreSQL)
- No need for `.populate()` (avoids N+1 queries)

**Implementation:**
```javascript
// Instead of:
senderWalletId: { type: ObjectId, ref: 'Wallet' }

// Use:
senderWalletId: { type: String, required: true }
```

---

### 4. Double-Entry Bookkeeping

**Decision:** Implement double-entry bookkeeping in Ledger Service.

**Rationale:**
- Financial regulations require complete audit trail
- Every transaction creates balanced debit/credit pairs
- Money is never created or destroyed (invariant enforcement)
- Enables balance calculation from entry history

**Invariant:**
```
For every completed transaction:
  SUM(debit amounts) = SUM(credit amounts)

If violated → CRITICAL ALERT (money created or destroyed)
```

---

### 5. Idempotency Key Strategy

**Decision:** Use 24-hour TTL idempotency keys with request hash validation.

**Rationale:**
- Prevents duplicate processing (same key = same result)
- Detects payload mismatch (same key, different amount = error)
- Auto-expires old keys (storage cleanup)
- Enables safe retries after network failures

**Implementation:**
- Store idempotency key with request hash
- On duplicate key: compare hashes, return cached result
- TTL: 24 hours (MongoDB TTL index)

---

### 6. FX Quote Time-Locking

**Decision:** FX quotes have 60-second TTL and are single-use.

**Rationale:**
- Prevents stale rate application (rates change every second)
- Single-use prevents quote reuse across transfers
- Clear error on expiry (force re-initiation)
- Audit trail shows exact rate applied

**Implementation:**
- Quote created with `expiresAt: now + 60 seconds`
- Status: ACTIVE → USED (on first use)
- Validation: exists? expired? already used?
- If provider unavailable: return error (never use cache)

---

### 7. Payroll Queue Design

**Decision:** Use BullMQ with concurrency=1 per employer.

**Rationale:**
- Prevents one employer from starving others
- Enables resumability after crashes (checkpoint)
- Handles traffic spikes (200 clients × 1000 employees)
- Dead letter queue for permanently failed items

**Implementation:**
- Queue: `payroll-transfers`
- Concurrency: 1 per employer (separate queues per employer)
- Checkpoint: `lastProcessedIndex` field
- Retry: 3 attempts with exponential backoff

---

### 8. Hash-Chained Audit Logs

**Decision:** Implement blockchain-like hash chaining for audit logs.

**Rationale:**
- Tamper-evident (deleting/changing records breaks chain)
- Regulatory compliance (immutable audit trail)
- Fraud detection (internal employees can't cover tracks)
- Legal proof (court-admissible evidence)

**Implementation:**
```javascript
// Each record:
{
  previousHash: "abc123",  // Hash of previous record
  hash: "def456"           // Hash of this record (SHA-256)
}

// Tampering detection:
// Delete record 2 → Record 3's previousHash no longer matches
// Chain broken = tampering detected
```

---

### 9. Field-Level Encryption

**Decision:** Implement envelope encryption with two-key hierarchy.

**Rationale:**
- Sensitive PII (SSN, bank accounts) never stored in plaintext
- Master key rotation without re-encrypting all data
- Compliance with data protection regulations
- Reduces breach impact (encrypted data is useless without keys)

**Implementation:**
- Master Key: Stored in AWS KMS / HashiCorp Vault
- Data Key: Generated per record, encrypted with Master Key
- Encrypted fields: `documentNumberEncrypted`, `bankAccountEncrypted`
- Decryption: Only at API response time (never in logs)

---

### 10. Service Communication Patterns

**Decision:** Use synchronous HTTP for validation, async queue for processing.

**Rationale:**
- Synchronous: Balance checks, quote validation (need immediate response)
- Asynchronous: Payroll processing, audit logging (can be deferred)
- Prevents cascading failures (queue absorbs spikes)

**Implementation:**
| Pattern | Use Cases |
|---------|-----------|
| HTTP/REST | Account validation, FX quote validation, balance checks |
| BullMQ Queue | Payroll batch processing, transfer processing |
| Events | Audit logging, alerts, notifications |

---

### 11. API Gateway Pattern

**Decision:** Single entry point for all frontend traffic.

**Rationale:**
- Rate limiting (prevent abuse)
- Authentication (JWT validation)
- Routing (direct to correct service)
- SSL termination (single certificate)

**Implementation:**
- Port: 3000
- Routes: `/accounts/*` → Account Service, `/transfers/*` → Transaction Service
- Rate limit: 1000 RPS per client

---

### 12. Crash Recovery Strategy

**Decision:** Transaction Service runs recovery on startup.

**Rationale:**
- Detects incomplete transactions (PENDING status)
- Reverses debits without credits (money recovery)
- Prevents stuck transactions
- Ensures ledger consistency

**Implementation:**
```javascript
// On startup:
1. Find all PENDING transactions older than 5 minutes
2. For each:
   a. Check ledger entries
   b. If debit exists but no credit: REVERSE
   c. If no entries: Mark as FAILED
3. Log recovery actions
```

---

## Data Model Summary

### Account Service (3 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| User | User profiles | userId, email, passwordHash, kycStatus |
| Wallet | Financial accounts | walletId, userId, currency, balanceCached |
| KycRecord | KYC verification | kycId, documentNumberEncrypted, status |

### Transaction Service (2 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Transaction | Transfer records | transactionId, idempotencyKey, status |
| IdempotencyKey | Deduplication | key, requestHash, expiresAt |

### Ledger Service (4 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| LedgerAccount | Account records | accountId, ownerId, normalBalance |
| LedgerTransaction | Transaction records | transactionId, totalDebitMinor, totalCreditMinor |
| LedgerEntry | Debit/credit entries | entryId, entryType, amountMinor, fxQuoteId |
| AuditLog | Tamper-proof history | logId, hash, previousHash |

### FX Service (2 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| FxQuote | Locked quotes | quoteId, rate, expiresAt, status |
| FxRate | Rate history | pair, rate, fetchedAt, expiresAt |

### Payroll Service (2 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| PayrollBatch | Batch records | batchId, employerId, status, lastProcessedIndex |
| PayrollItem | Individual payments | itemId, employeeId, status, retryCount |

### Admin Service (3 models)
| Model | Purpose | Key Fields |
|-------|---------|------------|
| Dispute | Customer disputes | disputeId, transactionId, status |
| Alert | System alerts | alertId, type, severity, status |
| Report | Generated reports | reportId, type, fileUrl |

---

## Total: 16 Data Models Across 6 Services

| Service | Models | Database |
|---------|--------|----------|
| Account Service | 3 | novapay_account_db |
| Transaction Service | 2 | novapay_txn_db |
| Ledger Service | 4 | novapay_ledger_db |
| FX Service | 2 | novapay_fx_db |
| Payroll Service | 2 | novapay_payroll_db |
| Admin Service | 3 | novapay_admin_db |
| **Total** | **16** | **6 databases** |
