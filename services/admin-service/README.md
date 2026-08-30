# Admin Service

NovaPay Admin Service - Dashboard, transaction search, dispute resolution, and compliance reporting.

## Overview

The Admin Service is the operations center that aggregates data from other services, handles disputes, manages alerts, and generates compliance reports.

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | System health overview with dispute/alert stats |
| **Transaction Search** | Search and investigate transactions |
| **Audit Trail** | Complete audit trail for any transaction |
| **Dispute Resolution** | Create, assign, and resolve disputes |
| **Alert Management** | Create, acknowledge, and resolve alerts |
| **Report Generation** | Generate compliance and financial reports |
| **Account Actions** | Freeze/unfreeze accounts (incident response) |

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- Axios for inter-service calls
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
│   └── admin.controller.js   # HTTP request handlers
├── middleware/
│   ├── auth.middleware.js    # Service key auth
│   └── error.middleware.js   # Error handling
├── models/
│   ├── dispute.model.js      # Customer disputes
│   ├── alert.model.js        # System alerts
│   └── report.model.js       # Generated reports
├── repositories/
│   └── admin.repository.js   # Database operations
├── routes/
│   └── admin.routes.js       # API routes
├── services/
│   └── admin.services.js     # Core business logic
├── test/
│   ├── admin.test.js         # Unit tests
│   └── admin.integration.test.js # Supertest tests
└── utils/
    ├── idGenerator.js        # ID generation
    └── logger.js             # Winston logger
```

## Data Models

### Dispute

```javascript
{
  disputeId: "dsp_xxx",
  transactionId: "txn_xxx",
  userId: "usr_xxx",
  type: "DUPLICATE_CHARGE",   // DUPLICATE_CHARGE | NOT_RECEIVED | WRONG_AMOUNT | UNAUTHORIZED | OTHER
  status: "OPEN",             // OPEN | INVESTIGATING | RESOLVED | REJECTED
  description: "Charged twice",
  resolution: null,
  assignedTo: null,
  resolvedAt: null
}
```

### Alert

```javascript
{
  alertId: "alt_xxx",
  type: "INVARIANT_VIOLATION", // INVARIANT_VIOLATION | HIGH_FAILURE_RATE | SUSPICIOUS_ACTIVITY | SYSTEM_ERROR
  severity: "CRITICAL",        // CRITICAL | HIGH | MEDIUM | LOW
  status: "ACTIVE",            // ACTIVE | ACKNOWLEDGED | RESOLVED
  message: "Debit != Credit detected",
  transactionId: null,
  acknowledgedBy: null,
  resolvedBy: null
}
```

### Report

```javascript
{
  reportId: "rpt_xxx",
  type: "DAILY_SUMMARY",       // DAILY_SUMMARY | COMPLIANCE | AUDIT_TRAIL | FINANCIAL
  generatedBy: "admin",
  parameters: {},
  status: "COMPLETED",         // PENDING | COMPLETED | FAILED
  fileUrl: null
}
```

## API Endpoints

All endpoints require `X-Service-Key` header for authentication.

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get system health overview |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/transactions/search` | Search transactions by userId |
| GET | `/api/admin/transactions/:transactionId` | Get full transaction detail |
| GET | `/api/admin/transactions/:transactionId/audit` | Get complete audit trail |

### Disputes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/disputes` | Create new dispute |
| GET | `/api/admin/disputes` | Get disputes (filter by status, userId, type) |
| GET | `/api/admin/disputes/:disputeId` | Get dispute details |
| PUT | `/api/admin/disputes/:disputeId` | Update dispute (status, resolution, assign) |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/alerts` | Create new alert |
| GET | `/api/admin/alerts` | Get alerts (filter by status, type, severity) |
| GET | `/api/admin/alerts/:alertId` | Get alert details |
| PUT | `/api/admin/alerts/:alertId/acknowledge` | Acknowledge alert |
| PUT | `/api/admin/alerts/:alertId/resolve` | Resolve alert |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/reports` | Generate new report |
| GET | `/api/admin/reports` | Get reports (filter by type) |
| GET | `/api/admin/reports/:reportId` | Get report details |

### Account Actions

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/admin/accounts/:accountId/freeze` | Freeze account (incident response) |
| PUT | `/api/admin/accounts/:accountId/unfreeze` | Unfreeze account |

## Dashboard Flow

```
1. Get dispute stats
   - Total, Open, Investigating, Resolved, Rejected

2. Get alert stats
   - Active, Acknowledged, Resolved
   - By severity: CRITICAL, HIGH, MEDIUM, LOW

3. Return combined dashboard
```

## Dispute Flow

```
1. Create dispute
   - Link to transaction
   - Set type and description
   - Status: OPEN

2. Assign to investigator
   - Update assignedTo
   - Status: INVESTIGATING

3. Resolve or reject
   - Set resolution text
   - Set resolvedAt timestamp
   - Status: RESOLVED or REJECTED
```

## Alert Flow

```
1. Create alert
   - Set type, severity, message
   - Status: ACTIVE

2. Acknowledge
   - Set acknowledgedBy, acknowledgedAt
   - Status: ACKNOWLEDGED

3. Resolve
   - Set resolvedBy, resolvedAt
   - Status: RESOLVED
```

## Environment Variables

```bash
PORT=4006
MONGODB_URI=mongodb://127.0.0.1:27017/novapay_admin_db?replicaSet=rs0
SERVICE_KEY=7fK9xP2mQ8vL4nR6tY3wZ1aB5kT0eH
LOG_LEVEL=info
ACCOUNT_SERVICE_URL=http://localhost:4001
TRANSACTION_SERVICE_URL=http://localhost:4002
LEDGER_SERVICE_URL=http://localhost:4003
FX_SERVICE_URL=http://localhost:4004
PAYROLL_SERVICE_URL=http://localhost:4005
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
2. Start Admin Service:
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
| 400 | transactionId is required | Missing required field |
| 400 | type is required | Missing required field |
| 400 | severity is required | Missing required field |
| 403 | Invalid service key | Missing or wrong X-Service-Key |
| 404 | Dispute not found | Dispute ID doesn't exist |
| 404 | Alert not found | Alert ID doesn't exist |
| 404 | Report not found | Report ID doesn't exist |
| 409 | Dispute already exists | Duplicate dispute for transaction |
