# SafeSpan v1.0.0 – API Design

This document describes the Express API endpoints for SafeSpan v1.0.0, deployed as Firebase HTTPS Cloud Functions.

---

## Base URL

```
Production: https://<region>-<project-id>.cloudfunctions.net/api
Local:      http://localhost:5001/<project-id>/<region>/api
```

All endpoints require Firebase Authentication. Include the ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

---

## Response Format

All responses follow this structure:

```javascript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message"
  }
}
```

HTTP status codes:
- `200` – Success
- `201` – Created
- `400` – Bad request / validation error
- `401` – Unauthorized (missing or invalid token)
- `404` – Resource not found
- `500` – Internal server error

---

## Endpoints

### Overview

#### `GET /api/overview`

Returns the complete dashboard state in a single request. This is the primary endpoint users hit on app load.

**Response:**

```javascript
{
  "success": true,
  "data": {
    "account": {
      "id": "checking_main",
      "name": "Primary Checking",
      "type": "checking",
      "currentBalance": 3245.67
    },
    "paySchedule": {
      "frequency": "biweekly",
      "netPayAmount": 2450.00,
      "nextPayDate": "2025-06-06"
    },
    "currentPeriod": {
      "id": "2025-05-24",
      "periodStart": "2025-05-24",
      "periodEnd": "2025-06-06",
      "incomeTotal": 2450.00,
      "billsTotal": 1450.00,
      "discretionaryTotal": 234.56,
      "netChange": 765.44
    },
    "upcomingBills": [
      {
        "id": "rent",
        "name": "Rent",
        "amount": 1200.00,
        "dueDate": "2025-06-01",
        "isPaidThisPeriod": false,
        "isAutoPay": true
      },
      {
        "id": "electric",
        "name": "Electric Bill",
        "amount": 85.00,
        "dueDate": "2025-06-05",
        "isPaidThisPeriod": false,
        "isAutoPay": true
      }
    ],
    "safeToSpend": {
      "currentBalance": 3245.67,
      "requiredReserve": 1285.00,
      "safeAmount": 1960.67
    },
    "recentTransactions": [
      {
        "id": "txn_abc123",
        "date": "2025-05-28",
        "amount": 45.67,
        "description": "Grocery Store",
        "type": "debit_purchase",
        "accountId": "checking_main",
        "billId": null
      }
      // ... last 7 days of transactions
    ],
    "lastUpdated": "2025-05-28T14:32:00.000Z"
  }
}
```

**Calculation Notes:**
- `nextPayDate` is computed from `payFrequency` and `payAnchorDate`
- `upcomingBills` includes bills with due dates between now and next pay date
- `requiredReserve` is sum of unpaid upcoming bills
- `safeAmount` = `currentBalance` - `requiredReserve`

---

### Settings

#### `GET /api/settings`

Returns user settings including pay schedule.

**Response:**

```javascript
{
  "success": true,
  "data": {
    "payFrequency": "biweekly",
    "payAnchorDate": "2025-01-03",
    "netPayAmount": 2450.00,
    "semimonthlyDays": null,
    "primaryAccountId": "checking_main"
  }
}
```

#### `PUT /api/settings`

Updates user settings.

**Request Body:**

```javascript
{
  "payFrequency": "biweekly",        // optional
  "payAnchorDate": "2025-01-03",     // optional
  "netPayAmount": 2450.00,           // optional
  "semimonthlyDays": [1, 15]         // optional, required if frequency is semimonthly
}
```

**Response:**

```javascript
{
  "success": true,
  "data": {
    "payFrequency": "biweekly",
    "payAnchorDate": "2025-01-03",
    "netPayAmount": 2450.00,
    "semimonthlyDays": null,
    "primaryAccountId": "checking_main",
    "updatedAt": "2025-05-28T14:32:00.000Z"
  }
}
```

---

### Accounts

#### `GET /api/accounts`

Returns all accounts for the user.

**Response:**

```javascript
{
  "success": true,
  "data": [
    {
      "id": "checking_main",
      "name": "Primary Checking",
      "type": "checking",
      "currentBalance": 3245.67,
      "creditLimit": null,
      "apr": null
    }
  ]
}
```

#### `GET /api/accounts/:accountId`

Returns a single account.

#### `POST /api/accounts`

Creates a new account. (Primarily for v2.0.0+, but endpoint exists now.)

**Request Body:**

```javascript
{
  "name": "Savings",
  "type": "savings",           // "checking" | "savings"
  "currentBalance": 1000.00
}
```

#### `PUT /api/accounts/:accountId`

Updates an account (name, balance correction).

**Request Body:**

```javascript
{
  "name": "Primary Checking",  // optional
  "currentBalance": 3300.00    // optional, use for manual balance correction
}
```

#### `DELETE /api/accounts/:accountId`

Soft-deletes an account. Returns error if it's the primary account and no other checking account exists.

---

### Bills

#### `GET /api/bills`

Returns all active bills.

**Query Parameters:**
- `includeInactive=true` – also return inactive bills

**Response:**

```javascript
{
  "success": true,
  "data": [
    {
      "id": "rent",
      "name": "Rent",
      "amount": 1200.00,
      "frequency": "monthly",
      "dueDay": 1,
      "isAutoPay": true,
      "autoPayAccountId": "checking_main",
      "categoryId": null,
      "lastPaidDate": "2025-05-01",
      "isActive": true
    }
  ]
}
```

#### `GET /api/bills/:billId`

Returns a single bill.

#### `POST /api/bills`

Creates a new bill.

**Request Body:**

```javascript
{
  "name": "Internet",
  "amount": 79.99,
  "frequency": "monthly",      // "monthly" for v1.0.0
  "dueDay": 15,
  "isAutoPay": true,
  "autoPayAccountId": "checking_main"  // optional, defaults to primary account
}
```

**Response:** `201 Created` with the created bill object.

#### `PUT /api/bills/:billId`

Updates a bill.

**Request Body:**

```javascript
{
  "name": "Internet Service",  // optional
  "amount": 89.99,             // optional
  "dueDay": 20,                // optional
  "isAutoPay": false,          // optional
  "isActive": true             // optional
}
```

#### `DELETE /api/bills/:billId`

Soft-deletes a bill (sets `isActive: false`).

---

### Transactions

#### `GET /api/transactions`

Returns transactions with pagination and filtering.

**Query Parameters:**
- `payPeriodId` – filter by pay period (e.g., `2025-05-24`)
- `startDate` – filter transactions on or after this date
- `endDate` – filter transactions on or before this date
- `limit` – max results (default: 50, max: 100)
- `offset` – pagination offset

**Response:**

```javascript
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "date": "2025-05-28",
        "amount": 45.67,
        "description": "Grocery Store",
        "type": "debit_purchase",
        "accountId": "checking_main",
        "toAccountId": null,
        "billId": null,
        "categoryId": null,
        "payPeriodId": "2025-05-24"
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### `GET /api/transactions/:txnId`

Returns a single transaction.

#### `POST /api/transactions`

Creates a new transaction. Atomically updates account balance and pay period summary.

**Request Body:**

```javascript
{
  "date": "2025-05-28",
  "amount": 45.67,
  "description": "Grocery Store",
  "type": "debit_purchase",    // "income" | "debit_purchase" | "bill_payment"
  "accountId": "checking_main", // optional, defaults to primary account
  "billId": null               // optional, link to bill if paying a bill
}
```

**Type Behavior:**
- `income`: adds to account balance, adds to period's `incomeTotal`
- `debit_purchase`: subtracts from account balance, adds to period's `discretionaryTotal`
- `bill_payment`: subtracts from account balance, adds to period's `billsTotal`, updates bill's `lastPaidDate`

**Response:** `201 Created` with the created transaction and updated account balance.

```javascript
{
  "success": true,
  "data": {
    "transaction": {
      "id": "txn_xyz789",
      "date": "2025-05-28",
      "amount": 45.67,
      "description": "Grocery Store",
      "type": "debit_purchase",
      "accountId": "checking_main",
      "payPeriodId": "2025-05-24",
      "createdAt": "2025-05-28T14:32:00.000Z"
    },
    "accountBalance": 3200.00
  }
}
```

#### `PUT /api/transactions/:txnId`

Updates a transaction. Recalculates affected account balances and period summaries.

**Request Body:**

```javascript
{
  "date": "2025-05-27",        // optional
  "amount": 50.00,             // optional
  "description": "Groceries",  // optional
  "type": "debit_purchase",    // optional
  "billId": null               // optional
}
```

**Note:** Changing `date` may move the transaction to a different pay period, requiring updates to two period summaries.

#### `DELETE /api/transactions/:txnId`

Deletes a transaction. Reverses the balance and summary changes.

---

### Pay Periods

#### `GET /api/pay-periods`

Returns pay period summaries.

**Query Parameters:**
- `limit` – number of periods (default: 3, max: 12)
- `before` – get periods before this date

**Response:**

```javascript
{
  "success": true,
  "data": [
    {
      "id": "2025-05-24",
      "periodStart": "2025-05-24",
      "periodEnd": "2025-06-06",
      "incomeTotal": 2450.00,
      "billsTotal": 1450.00,
      "discretionaryTotal": 234.56,
      "netChange": 765.44,
      "transactionCount": 12
    }
  ]
}
```

#### `GET /api/pay-periods/:periodId`

Returns a single pay period with full transaction list.

**Response:**

```javascript
{
  "success": true,
  "data": {
    "period": {
      "id": "2025-05-24",
      "periodStart": "2025-05-24",
      "periodEnd": "2025-06-06",
      "incomeTotal": 2450.00,
      "billsTotal": 1450.00,
      "discretionaryTotal": 234.56,
      "netChange": 765.44,
      "transactionCount": 12
    },
    "transactions": [
      // all transactions in this period
    ]
  }
}
```

---

## v1.1.0 Preview: Sync Endpoint

This endpoint will be implemented in v1.1.0 for offline transaction sync.

#### `POST /api/sync-transactions`

Syncs a batch of offline-created transactions.

**Request Body:**

```javascript
{
  "transactions": [
    {
      "clientId": "uuid-generated-client-side",
      "date": "2025-05-28",
      "amount": 45.67,
      "description": "Grocery Store",
      "type": "debit_purchase",
      "accountId": "checking_main"
    },
    {
      "clientId": "another-uuid",
      "date": "2025-05-28",
      "amount": 12.00,
      "description": "Coffee",
      "type": "debit_purchase"
    }
  ]
}
```

**Behavior:**
- Deduplicates by `clientId` (skips if transaction with that clientId already exists)
- Processes all transactions in a batched write
- Updates account balances and period summaries atomically
- Returns created transactions and final account state

**Response:**

```javascript
{
  "success": true,
  "data": {
    "synced": [
      { "clientId": "uuid-1", "id": "txn_abc", "status": "created" },
      { "clientId": "uuid-2", "id": "txn_def", "status": "created" },
      { "clientId": "uuid-3", "id": "txn_xyz", "status": "duplicate_skipped" }
    ],
    "accountBalance": 3100.00,
    "currentPeriodSummary": {
      "incomeTotal": 2450.00,
      "billsTotal": 1450.00,
      "discretionaryTotal": 291.67,
      "netChange": 708.33
    }
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid auth token |
| `NOT_FOUND` | Resource doesn't exist |
| `VALIDATION_ERROR` | Invalid request body or parameters |
| `INVALID_TRANSACTION_TYPE` | Unknown transaction type |
| `INVALID_PAY_FREQUENCY` | Unknown pay frequency |
| `ACCOUNT_REQUIRED` | Operation requires at least one account |
| `INSUFFICIENT_BALANCE` | Transaction would make balance negative (warning only, not blocking) |
| `DUPLICATE_CLIENT_ID` | Transaction with this clientId already exists |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Express Router Structure

```
functions/
  src/
    index.js              # Cloud Function entry point
    api/
      index.js            # Express app setup, middleware
      routes/
        overview.js       # GET /overview
        settings.js       # GET/PUT /settings
        accounts.js       # CRUD /accounts
        bills.js          # CRUD /bills
        transactions.js   # CRUD /transactions
        payPeriods.js     # GET /pay-periods
      middleware/
        auth.js           # Firebase Auth verification
        errorHandler.js   # Consistent error responses
      services/
        payPeriod.js      # Pay period calculation logic
        summary.js        # Summary update logic
      utils/
        dates.js          # Date helpers
        response.js       # Response formatters
```
