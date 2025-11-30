# SafeSpan v1.0.0 – Firestore Data Model

This document describes the Firestore collections, document structures, and indexing strategy for SafeSpan v1.0.0. The model is designed to:

1. Minimize read/write costs for typical user flows
2. Support future expansion (multi-account, credit cards, categories) without major restructuring
3. Enable efficient pay-period-based queries

---

## Collection Structure

All user data is scoped under `/users/{userId}/...` for simple security rules.

```
/users/{userId}
  └── settings                    (single document)
  └── accounts/{accountId}        (collection)
  └── bills/{billId}              (collection)
  └── transactions/{txnId}        (collection)
  └── payPeriods/{periodId}       (collection)
```

---

## Document Schemas

### 1. `/users/{userId}/settings`

Single document per user containing pay schedule and app preferences.

```javascript
{
  // Pay schedule
  payFrequency: "biweekly",       // "weekly" | "biweekly" | "semimonthly" | "monthly"
  payAnchorDate: "2025-01-03",    // ISO date string, reference point for calculating periods
  netPayAmount: 2450.00,          // net income per paycheck
  
  // For semimonthly: which days of month (e.g., [1, 15] or [15, 31])
  semimonthlyDays: null,          // [number, number] | null
  
  // Primary account reference (for v1.0.0 single-account)
  primaryAccountId: "checking_main",
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Notes:**
- `payAnchorDate` is used to calculate pay period boundaries dynamically
- `semimonthlyDays` only used when `payFrequency === "semimonthly"`

---

### 2. `/users/{userId}/accounts/{accountId}`

```javascript
{
  id: "checking_main",
  name: "Primary Checking",
  type: "checking",              // "checking" | "savings" | "credit" (v3.0+)
  currentBalance: 3245.67,
  
  // Credit card fields (v3.0.0+, null for checking/savings)
  creditLimit: null,             // number | null
  apr: null,                     // number | null (e.g., 0.2199 for 21.99%)
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Notes:**
- For v1.0.0, only one checking account exists
- `creditLimit` and `apr` are included now but unused until v3.0.0
- Balance is updated on every transaction affecting this account

---

### 3. `/users/{userId}/bills/{billId}`

```javascript
{
  id: "rent",
  name: "Rent",
  amount: 1200.00,
  
  // Recurrence
  frequency: "monthly",          // "weekly" | "biweekly" | "monthly" | "yearly"
  dueDay: 1,                     // day of month (1-31) for monthly
  // For weekly/biweekly, we'd use a different anchor approach (v2.0+)
  
  // Auto-pay tracking
  isAutoPay: true,
  autoPayAccountId: "checking_main",  // which account it pulls from
  
  // Category (v3.1.0+)
  categoryId: null,              // string | null
  
  // Soft tracking of payment status
  lastPaidDate: "2025-05-01",    // ISO date string | null
  
  // Status
  isActive: true,
  
  // Timestamps  
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Notes:**
- `lastPaidDate` enables "is this bill paid for current period?" logic without per-instance documents
- `dueDay` of 31 means "last day of month" (normalized in code)

---

### 4. `/users/{userId}/transactions/{txnId}`

```javascript
{
  id: "txn_abc123",
  
  // Core fields
  date: "2025-05-28",            // ISO date string
  amount: 45.67,                 // always positive
  description: "Grocery Store",
  
  // Type and direction
  type: "debit_purchase",        // see Transaction Types below
  
  // Account references
  accountId: "checking_main",    // primary account affected
  toAccountId: null,             // for transfers (v2.0.0+)
  
  // Linkages
  billId: null,                  // string | null, links to bill if this pays a bill
  categoryId: null,              // string | null (v3.1.0+)
  
  // Pay period reference (denormalized for efficient queries)
  payPeriodId: "2025-05-24",     // matches payPeriods doc ID
  
  // Sync metadata (v1.1.0+)
  clientId: null,                // UUID generated client-side for offline dedup
  syncedAt: null,                // Timestamp | null
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Transaction Types (v1.0.0):**
- `income` – money in (paycheck, etc.)
- `debit_purchase` – spending from checking/savings
- `bill_payment` – paying a recurring bill (auto-linked via billId)

**Transaction Types (v2.0.0+):**
- `internal_transfer` – move between own accounts

**Transaction Types (v3.0.0+):**
- `credit_purchase` – purchase on credit card
- `credit_payment` – payment toward credit card balance

---

### 5. `/users/{userId}/payPeriods/{periodId}`

The `periodId` is the ISO date string of the period start date (e.g., `"2025-05-24"`).

```javascript
{
  id: "2025-05-24",
  periodStart: "2025-05-24",     // ISO date string
  periodEnd: "2025-06-06",       // ISO date string (exclusive, day before next period)
  
  // Precomputed totals (updated on each transaction)
  incomeTotal: 2450.00,
  billsTotal: 1450.00,
  discretionaryTotal: 234.56,
  netChange: 765.44,             // income - bills - discretionary
  
  // Future: category breakdown (v3.1.0+)
  categoryTotals: {},            // { [categoryId]: amount }
  
  // Transaction count (useful for pagination hints)
  transactionCount: 12,
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Notes:**
- Created lazily when first transaction in that period occurs, or when overview is fetched
- Summary fields updated atomically with each transaction write
- `periodEnd` is inclusive (last day of period)

---

## Indexes

Firestore automatically indexes all single fields. These composite indexes are needed:

### Required Composite Indexes

```
Collection: users/{userId}/transactions
Fields: payPeriodId ASC, date DESC

Collection: users/{userId}/transactions  
Fields: accountId ASC, date DESC

Collection: users/{userId}/transactions
Fields: date DESC

Collection: users/{userId}/bills
Fields: isActive ASC, dueDay ASC
```

### Index for Recent Transactions (Overview)

```
Collection: users/{userId}/transactions
Fields: date DESC
```

This supports the "last 7 days" query for the overview endpoint.

---

## Security Rules (Sketch)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Cost Analysis (v1.0.0 Typical Usage)

**Dashboard load (`GET /api/overview`):**
- 1 read: settings doc
- 1 read: primary account doc  
- 1 read: current pay period summary
- N reads: active bills (typically 5-15 bills)
- M reads: recent transactions (last 7 days, typically 10-30)
- **Total: ~20-50 reads per dashboard load**

**Add transaction (`POST /api/transactions`):**
- 1 read: settings (to determine pay period)
- 1 read: account (to get current balance)
- 1 read: pay period summary (to update totals)
- 1 write: transaction doc
- 1 write: account doc (update balance)
- 1 write: pay period summary (update totals)
- Optional 1 write: bill doc (update lastPaidDate if billId provided)
- **Total: 3 reads, 3-4 writes per transaction**

**Offline sync (`POST /api/sync-transactions` – v1.1.0):**
- Batches multiple transactions into single Cloud Function invocation
- Uses Firestore batched writes (up to 500 ops per batch)
- Amortizes the settings/account reads across all synced transactions

---

## Future-Proofing Notes

1. **Multi-account (v2.0.0):** Schema already supports multiple accounts. Add `toAccountId` usage for transfers.

2. **Credit cards (v3.0.0):** Account schema has `creditLimit` and `apr` fields. Add new transaction types.

3. **Categories (v3.1.0):** Transaction and bill schemas have `categoryId`. Add `/users/{userId}/categories/{categoryId}` collection.

4. **Historical summaries (v3.2.0):** Pay period docs already store summaries. Add monthly rollup docs or query across periods.
