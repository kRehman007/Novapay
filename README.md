# NovaPay

A microservices-based financial platform designed for high-throughput (1,000+ RPS), crash-resilient payment processing with strict financial invariants.

## System Overview

NovaPay consists of 7 microservices, each with its own MongoDB database, connected via an API Gateway with Nginx reverse proxy.

| Service | Port | Description |
|---------|------|-------------|
| **Nginx** | 80 | Reverse proxy, rate limiting, security headers |
| **API Gateway** | 4000 | Routing, service discovery, health aggregation |
| **Account Service** | 4001 | User profiles, wallets, KYC, authentication |
| **Transaction Service** | 4002 | Transfer orchestration, idempotency, crash recovery |
| **Ledger Service** | 4003 | Double-entry bookkeeping, hash-chained audit logs |
| **FX Service** | 4004 | Exchange rates, time-locked quotes (60s TTL) |
| **Payroll Service** | 4005 | Bulk payments, BullMQ queue processing |
| **Admin Service** | 4006 | Dashboard, disputes, alerts, reports |

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 20 |
| Framework | Express |
| Database | MongoDB 7 (Mongoose 9) |
| Cache | Redis 7 (ioredis) |
| Queue | BullMQ |
| Auth | JWT + Service Keys |
| Metrics | prom-client (Prometheus) |
| Logging | Winston, Morgan |
| Testing | Jest, Supertest |
| Containers | Docker, Docker Compose |
| Proxy | Nginx |
| Monitoring | Prometheus + Grafana |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Quick Start (Docker)

```bash
# Clone and start all services
git clone https://github.com/your-org/novapay.git
cd novapay
cd infra
docker-compose up -d --build

# Verify all services are healthy
curl http://localhost/health
```

This starts 17 containers:
- 7 microservices (ports 4000-4006)
- 6 MongoDB instances (ports 27017-27022)
- 1 Redis (port 6379)
- 1 Prometheus (port 9090)
- 1 Grafana (port 3000)
- 1 Nginx (port 80)

### Running Locally (without Docker)

```bash
# Install dependencies for each service
cd services/api-gateway && npm install
cd ../account-service && npm install
cd ../transaction-service && npm install
cd ../ledger-service && npm install
cd ../fx-service && npm install
cd ../payroll-service && npm install
cd ../admin-service && npm install

# Start each service (each needs its own terminal)
cd services/api-gateway && npm start
cd services/account-service && npm start
# ... etc
```

### Running Tests

```bash
# Test each service
cd services/account-service && npm test
cd services/transaction-service && npm test
cd services/ledger-service && npm test
cd services/fx-service && npm test
cd services/payroll-service && npm test
cd services/admin-service && npm test
cd services/api-gateway && npm test
```

## API Endpoints

All endpoints are accessible through the API Gateway at `http://localhost` (port 80 via Nginx).

### Authentication

```bash
POST   /api/accounts                    # Register new user
POST   /api/accounts/auth               # Login, get JWT token
```

### Accounts

```bash
GET    /api/accounts/:userId            # Get user profile
PUT    /api/accounts/:userId            # Update user profile
POST   /api/accounts/:userId/wallets    # Create wallet
GET    /api/accounts/:userId/wallets    # List wallets
GET    /api/accounts/:userId/balance    # Get balance (?currency=USD)
POST   /api/accounts/:userId/kyc        # Submit KYC documents
GET    /api/accounts/:userId/kyc        # Check KYC status
```

### Transfers

```bash
POST   /api/transfers/domestic          # Domestic transfer
POST   /api/transfers/international     # International transfer (FX)
GET    /api/transfers/:id               # Get transfer details
GET    /api/transfers/user/:userId      # Get user's transfers
POST   /api/transfers/:id/reverse       # Reverse a transfer
```

### FX (Foreign Exchange)

```bash
POST   /api/fx/quote                    # Create locked quote (60s TTL)
GET    /api/fx/quote/:quoteId           # Get quote details
GET    /api/fx/quote/:quoteId/validate  # Validate quote is still usable
PUT    /api/fx/quote/:quoteId/use       # Mark quote as used
GET    /api/fx/rate/:source/:target     # Get current exchange rate
GET    /api/fx/rates                    # List recent rates
GET    /api/fx/quotes                   # List recent quotes
GET    /api/fx/history/:source/:target  # Quote history for pair
```

### Payroll

```bash
POST   /api/payroll/batches             # Create payroll batch
GET    /api/payroll/batches             # List batches
GET    /api/payroll/batches/:batchId    # Get batch details
GET    /api/payroll/batches/:batchId/items   # Get batch items
GET    /api/payroll/batches/:batchId/stats   # Get batch statistics
POST   /api/payroll/batches/:batchId/start   # Start processing
POST   /api/payroll/batches/:batchId/pause   # Pause processing
POST   /api/payroll/batches/:batchId/resume  # Resume processing
POST   /api/payroll/recovery            # Recover crashed batches
```

### Ledger

```bash
POST   /api/ledger/entries              # Create double-entry pair
GET    /api/ledger/entries/:txId        # Get entries for transaction
GET    /api/ledger/account/:accountId/balance  # Get account balance
GET    /api/ledger/account/:accountId/entries  # Get entries for account
GET    /api/ledger/transaction/:txId    # Get ledger transaction
GET    /api/ledger/transactions         # List recent transactions
GET    /api/ledger/integrity            # Verify hash-chain integrity
GET    /api/ledger/audit-logs           # Get audit trail
```

### Admin

```bash
GET    /api/admin/dashboard             # System health overview
GET    /api/admin/transactions/search   # Search transactions (?userId=X)
GET    /api/admin/transactions/:txId    # Get transaction detail
GET    /api/admin/transactions/:txId/audit  # Get audit trail

POST   /api/admin/disputes              # Create dispute
GET    /api/admin/disputes              # List disputes
GET    /api/admin/disputes/:disputeId   # Get dispute
PUT    /api/admin/disputes/:disputeId   # Update dispute status

POST   /api/admin/alerts                # Create alert
GET    /api/admin/alerts                # List alerts
GET    /api/admin/alerts/:alertId       # Get alert
PUT    /api/admin/alerts/:alertId/acknowledge  # Acknowledge alert
PUT    /api/admin/alerts/:alertId/resolve      # Resolve alert

POST   /api/admin/reports               # Generate report
GET    /api/admin/reports               # List reports
GET    /api/admin/reports/:reportId     # Get report
```

### Internal (Service-to-Service)

```bash
GET    /api/internal/accounts/:userId          # Get user (S2S)
GET    /api/internal/accounts/:userId/balance  # Get balance (S2S)
POST   /api/accounts/validate                  # Validate wallets (S2S)
```

### Utility

```bash
GET    /health                         # Gateway health check
GET    /metrics                         # Prometheus metrics
```

## Project Structure

```
NovaPay/
├── ARCHITECTURE.md                    # System architecture documentation
├── decisions.md                       # 12 architectural decisions
├── README.md                          # This file
├── services/
│   ├── api-gateway/                   # API Gateway (Port 4000)
│   │   ├── src/
│   │   │   ├── app.js
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── test/
│   │   └── Dockerfile
│   ├── account-service/               # Account Service (Port 4001)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/                # User, Wallet, KYC
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   ├── utils/                 # encryption.js
│   │   │   └── test/
│   │   └── Dockerfile
│   ├── transaction-service/           # Transaction Service (Port 4002)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── test/
│   │   └── Dockerfile
│   ├── ledger-service/                # Ledger Service (Port 4003)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/                # LedgerEntry, LedgerTransaction, AuditLog
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── test/
│   │   └── Dockerfile
│   ├── fx-service/                    # FX Service (Port 4004)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── test/
│   │   └── Dockerfile
│   ├── payroll-service/               # Payroll Service (Port 4005)
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── test/
│   │   └── Dockerfile
│   └── admin-service/                 # Admin Service (Port 4006)
│       ├── src/
│       │   ├── controllers/
│       │   ├── models/                # Dispute, Alert, Report
│       │   ├── repositories/
│       │   ├── services/
│       │   └── test/
│       └── Dockerfile
├── infra/                             # Infrastructure
│   ├── docker-compose.yml             # 17 containers
│   ├── nginx/
│   │   └── nginx.conf                 # Reverse proxy config
│   ├── prometheus/
│   │   └── prometheus.yml             # Scrape config (all 7 services)
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml
│           └── dashboards/
│               └── default.yml
├── github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI/CD
```

## Key Design Decisions

### 1. String IDs (Not ObjectId)

All services use prefixed string IDs instead of MongoDB ObjectId:

| Prefix | Entity |
|--------|--------|
| `usr_` | User accounts |
| `txn_` | Transactions |
| `wal_` | Wallets |
| `dsp_` | Disputes |
| `alt_` | Alerts |
| `rpt_` | Reports |
| `fxq_` | FX quotes |
| `ltx_` | Ledger transactions |
| `bat_` | Payroll batches |
| `emp_` | Employees |

### 2. Idempotency

24-hour TTL on idempotency keys prevents duplicate transactions. Replaying a request with the same key returns the original result.

### 3. Double-Entry Ledger

Every financial transaction creates balanced debit/credit entries. The system verifies `sum(credits) == sum(debits)` before committing.

### 4. Hash-Chained Audit Logs

Audit log entries include the hash of the previous entry, creating a tamper-evident chain for compliance.

### 5. FX Quote Locking

Exchange rates are locked for 60 seconds with single-use enforcement. After use or expiry, a new quote must be requested.

### 6. Field-Level Encryption

PII data (KYC documents) encrypted using AES-256-GCM with the `ENCRYPTION_KEY` environment variable.

### 7. Service-to-Service Auth

Internal service calls use `X-Service-Key` header. User-facing endpoints use JWT tokens.

## Service Communication

### Synchronous (HTTP via Gateway)

```
Client → Nginx (80) → API Gateway (4000) → Service (4001-4006)
```

- Transaction → Account: Validate wallets, check balance
- Transaction → FX: Validate quote
- Transaction → Ledger: Create entries
- Admin → All: Aggregate dashboard data

### Asynchronous (BullMQ Queue)

- Payroll → Transaction: Process batch payments (concurrency=1)

## Infrastructure

### Docker Compose

```bash
cd infra
docker-compose up -d --build     # Start all 17 containers
docker-compose down              # Stop all containers
docker-compose logs -f           # Follow logs
docker-compose ps                # Container status
```

### MongoDB Port Mapping

| Port | Database | Data |
|------|----------|------|
| 27017 | novapay_account_db | Users, wallets, KYC |
| 27018 | novapay_txn_db | Transfers |
| 27019 | novapay_ledger_db | Ledger entries, audit logs |
| 27020 | novapay_fx_db | FX quotes, rates |
| 27021 | novapay_payroll_db | Payroll batches, items |
| 27022 | novapay_admin_db | Disputes, alerts, reports |

### Monitoring

**Prometheus** (`http://localhost:9090`): Scrapes all 7 services every 15s for `http_requests_total`, `http_request_duration_seconds`, `http_errors_total`.

**Grafana** (`http://localhost:3000`, admin/admin):
- **NovaPay Overview**: Request rates, error rates, latency p50/p95/p99 across all services
- **NovaPay Details**: Per-service drill-down (ledger, transactions, FX, payroll, admin)

### Environment Variables

| Variable | Services | Description |
|----------|----------|-------------|
| `PORT` | All | Service port |
| `MONGODB_URI` | All | MongoDB connection string |
| `REDIS_HOST` / `REDIS_PORT` | Account, Transaction | Redis connection |
| `JWT_SECRET` | Account, Transaction, Gateway | JWT signing secret |
| `SERVICE_KEY` | All | Inter-service auth key |
| `ENCRYPTION_KEY` | Account | AES-256-GCM key (32 bytes) |

## CI/CD

GitHub Actions workflow at `.github/workflows/ci.yml` runs unit tests for all 7 services on push/PR.

## License

MIT
