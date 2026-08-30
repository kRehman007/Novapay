# Account Service

NovaPay Account Service - User management, wallets, and balance reads.

## Overview

The Account Service manages:
- User registration and authentication
- Wallet creation (multi-currency)
- Balance reads with Redis caching
- KYC verification
- Account status management (freeze/unfreeze)

## Setup

### Prerequisites
- Node.js 18+
- MongoDB with replica set
- Redis

### Installation
```bash
cd services/account-service
npm install
```

### Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Start Service
```bash
npm run dev
```

## API Endpoints

### Public Endpoints

#### Create User
```http
POST /api/accounts
Content-Type: application.json

{
  "email": "john@example.com",
  "password": "securepass123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_a1b2c3d4e5f6",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "ACTIVE",
    "kycStatus": "PENDING"
  }
}
```

#### Authenticate User
```http
POST /api/accounts/auth
Content-Type: application.json

{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "usr_a1b2c3d4e5f6",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER"
    }
  }
}
```

### Protected Endpoints (Require JWT)

#### Get User
```http
GET /api/accounts/:userId
Authorization: Bearer <token>
```

#### Create Wallet
```http
POST /api/accounts/:userId/wallets
Authorization: Bearer <token>
Content-Type: application.json

{
  "currency": "USD"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "walletId": "wal_x1y2z3",
    "userId": "usr_a1b2c3d4e5f6",
    "currency": "USD",
    "status": "ACTIVE",
    "balanceCached": 0
  }
}
```

#### Get Balance
```http
GET /api/accounts/:userId/balance?currency=USD
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": 5000
  }
}
```

### Service-to-Service Endpoints

#### Validate Wallets
```http
POST /api/accounts/validate
X-Service-Key: <service-key>
Content-Type: application.json

{
  "walletIds": ["wal_x1y2z3", "wal_a4b5c6"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": [
      {
        "walletId": "wal_x1y2z3",
        "userId": "usr_a1b2c3d4e5f6",
        "currency": "USD"
      }
    ],
    "invalid": ["wal_a4b5c6"]
  }
}
```

## Balance Read Flow

```
Client → Account Service → Redis Cache
                              ↓ (cache hit)
                           Return cached balance
                              
                              ↓ (cache miss)
                           MongoDB → Update cache → Return balance
```

**Cache TTL:** 5 minutes

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Duplicate email | 409 | Email already registered |
| Invalid credentials | 401 | Invalid credentials |
| Inactive account | 403 | Account is not active |
| User not found | 404 | User not found |
| Wallet exists | 409 | Wallet already exists for this currency |

## Testing

```bash
npm test
```


