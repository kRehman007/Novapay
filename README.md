# NovaPay

A microservices-based financial platform designed for high-throughput (1,000+ RPS), crash-resilient payment processing with strict financial invariants.

## System Overview

NovaPay consists of 7 microservices, each with its own MongoDB database:

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 4000 | Single entry point, JWT auth, rate limiting |
| **Account Service** | 4001 | User profiles, wallets, authentication |
| **Transaction Service** | 4002 | Transfer orchestration, idempotency |
| **Ledger Service** | 4003 | Double-entry bookkeeping, audit logs |
| **FX Service** | 4004 | Exchange rates, time-locked quotes |
| **Payroll Service** | 4005 | Bulk payments, queue processing |
| **Admin Service** | 4006 | Dashboard, disputes, alerts, reports |

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Framework | Express |
| Database | MongoDB (Mongoose) |
| Cache | Redis (ioredis) |
| Queue | BullMQ |
| Auth | JWT |
| Logging | Winston, Morgan |
| Testing | Jest, Supertest |

## API Endpoints

### Authentication

```bash
POST /api/accounts              # Create user account
POST /api/accounts/auth         # Login, get JWT token
```

### Accounts

```bash
GET    /api/accounts/:userId        # Get user profile
PUT    /api/accounts/:userId        # Update user
POST   /api/accounts/:userId/wallets # Create wallet
GET    /api/accounts/:userId/wallets # List wallets
GET    /api/accounts/:userId/balance # Get balance
POST   /api/accounts/:userId/kyc    # Submit KYC
GET    /api/accounts/:userId/kyc    # Check KYC status
```

### Transfers

```bash
POST /api/transfers/domestic        # Domestic transfer
POST /api/transfers/international   # International transfer (FX)
GET  /api/transfers/:id             # Get transfer status
POST /api/transfers/:id/reverse     # Reverse transfer
```

### FX

```bash
POST /api/fx/quote           # Create locked quote (60s TTL)
GET  /api/fx/quote/:id       # Get quote details
PUT  /api/fx/quote/:id/use   # Mark quote as used
GET  /api/fx/rates/:from/:to # Get current rate
```

### Payroll

```bash
POST /api/payroll/batches           # Create batch
GET  /api/payroll/batches/:id       # Get batch status
POST /api/payroll/batches/:id/pause # Pause batch
POST /api/payroll/batches/:id/resume # Resume batch
```

### Ledger

```bash
POST /api/ledger/entries              # Create entry pair
GET  /api/ledger/entries/:txnId       # Get entries for txn
GET  /api/ledger/accounts/:id/balance # Get account balance
GET  /api/ledger/invariant/check      # Verify invariants
```

### Admin

```bash
GET  /api/admin/dashboard             # System health overview
GET  /api/admin/transactions/search   # Search transactions
POST /api/admin/disputes              # Create dispute
POST /api/admin/alerts                # Create alert
POST /api/admin/reports               # Generate report
```

## Project Structure

```
NovaPay/
├── ARCHITECTURE.md           # System architecture documentation
├── decisions.md              # Architectural decisions
├── services/
│   ├── api-gateway/          # API Gateway (Port 4000)
│   ├── account-service/      # Account Service (Port 4001)
│   ├── transaction-service/  # Transaction Service (Port 4002)
│   ├── ledger-service/       # Ledger Service (Port 4003)
│   ├── fx-service/           # FX Service (Port 4004)
│   ├── payroll-service/      # Payroll Service (Port 4005)
│   └── admin-service/        # Admin Service (Port 4006)
├── infra/                    # Infrastructure configs
│   ├── docker-compose.yml
│   ├── prometheus/
│   └── grafana/
└── github/                   # GitHub Actions CI/CD
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 7.0+ (with replica set)
- Redis 7.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/novapay.git
cd novapay

# Install dependencies for each service
cd services/api-gateway && npm install
cd ../account-service && npm install
cd ../transaction-service && npm install
cd ../ledger-service && npm install
cd ../fx-service && npm install
cd ../payroll-service && npm install
cd ../admin-service && npm install
```

### Running Services

```bash
# Start API Gateway
cd services/api-gateway && npm start

# Start Account Service
cd services/account-service && npm start

# Start Transaction Service
cd services/transaction-service && npm start

# Start Ledger Service
cd services/ledger-service && npm start

# Start FX Service
cd services/fx-service && npm start

# Start Payroll Service
cd services/payroll-service && npm start

# Start Admin Service
cd services/admin-service && npm start
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

## Key Design Decisions

### 1. String IDs (Not ObjectId)

All services use string IDs with prefixes instead of MongoDB ObjectId references:

- `usr_` - User accounts
- `txn_` - Transactions
- `wlt_` - Wallets
- `dsp_` - Disputes
- `alt_` - Alerts

### 2. Idempotency

24-hour TTL on idempotency keys to prevent duplicate transactions.

### 3. Double-Entry Ledger

Every financial transaction creates balanced debit/credit entries with hash-chained audit logs.

### 4. FX Quote Locking

Exchange rates locked for 60 seconds with single-use enforcement.

### 5. Field-Level Encryption

PII data encrypted using envelope encryption with master key + data key.

### 6. Hash-Chained Audit

Audit logs are hash-chained for tamper-evident compliance.

## Service Communication

### Synchronous (HTTP)

- Transaction → Account: Validate wallet, check balance
- Transaction → FX: Validate quote
- Transaction → Ledger: Create entries
- Admin → All: Aggregate dashboard

### Asynchronous (Queue)

- Payroll → Transaction: Process batch payments
- Transaction → Account: Update balance cache

### Event-Driven

- `transfer.completed` → Account, Admin
- `transfer.failed` → Admin, Payroll
- `invariant.violated` → Admin (CRITICAL)

## Database Isolation

| Service | Database |
|---------|----------|
| Account | novapay_account_db |
| Transaction | novapay_txn_db |
| Ledger | novapay_ledger_db |
| FX | novapay_fx_db |
| Payroll | novapay_payroll_db |
| Admin | novapay_admin_db |

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run `npm test` in the affected service
5. Submit a pull request

## License

MIT
