# CivicLens API Documentation

## Overview
CivicLens API provides endpoints for all 6 anti-corruption modules. Base URL: `https://your-convex-deployment.convex.cloud`

## Authentication
Uses Convex auth with magic links:
```javascript
// Send magic link
await convex.mutation(api.auth.sendMagicLink, { email: "user@example.com" });
// Verify token
await convex.mutation(api.auth.verifyMagicLink, { token: "received-token" });
```

## Module APIs

### 1. ProcureLens (Procurement)
- `GET /api/procurement/tenders` - List tenders with risk analysis
- `GET /api/procurement/tenders/{id}` - Detailed tender info
- `POST /api/procurement/risk-analysis` - Real-time risk scoring
- `GET /api/procurement/suppliers` - Supplier directory

### 2. FeeCheck (Service Fees)
- `GET /api/services/catalog` - Government service catalog
- `POST /api/services/report-overcharge` - Report fee overcharge
- `GET /api/services/overcharge-analytics` - Overcharge statistics

### 3. RTI Copilot
- `POST /api/rti/requests` - Submit RTI request
- `GET /api/rti/requests/{id}` - Track RTI status
- `GET /api/rti/agencies` - Government agencies list
- `GET /api/rti/repository` - Public RTI outcomes

### 4. FairLine (Bribe Logging)
- `POST /api/bribe-logs/report` - Log bribe incident
- `GET /api/bribe-logs/verify/{logId}` - Verify hash chain integrity
- `GET /api/bribe-logs/analytics` - Anonymized bribe statistics
- `POST /api/bribe-logs/export` - Export evidence bundle

### 5. PermitPath (Delay Detection)
- `POST /api/permits/applications` - Track permit application
- `GET /api/permits/applications/{id}` - Check permit status
- `GET /api/permits/delay-statistics` - Delay benchmarks
- `POST /api/permits/escalation-letter` - Generate escalation letter

### 6. WardWallet (Budget Transparency)
- `GET /api/budgets/projects` - Public budget projects
- `POST /api/budgets/citizen-reports` - Submit progress report
- `GET /api/budgets/analytics` - Budget analysis
- `GET /api/budgets/unit-costs` - Cost benchmarks

## Data Models

### Tender
```json
{
  "_id": "tender_001",
  "title": "Construction Project",
  "amount": 2500000000,
  "riskScore": 75,
  "riskLevel": "high",
  "riskFlags": ["single_bidder", "high_value"],
  "status": "active",
  "deadline": "2024-03-15T00:00:00.000Z"
}
```

### Service
```json
{
  "_id": "service_001",
  "name": "National ID Card",
  "officialFee": 125,
  "averageTime": "7-10 days",
  "office": "Election Commission"
}
```

### RTI Request
```json
{
  "_id": "rti_001",
  "requestId": "RTI-240215-001",
  "subject": "Budget Information Request",
  "status": "in_progress",
  "deadline": "2024-03-16T00:00:00.000Z",
  "daysRemaining": 25
}
```

### Bribe Log
```json
{
  "_id": "bribe_log_001",
  "logId": "BL-240215-001",
  "service": "License Renewal",
  "amount": 500,
  "hashChainId": "chain_001",
  "blockHash": "a1b2c3d4e5f6...",
  "verified": true
}
```

## Error Handling
All APIs return standardized error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": { "field": "amount", "issue": "must be positive" }
  }
}
```

## Rate Limits
- Authenticated users: 1000 requests/hour
- Anonymous reporting: 100 requests/hour
- Bulk operations: 50 requests/hour

## WebSocket Events
Real-time updates via Convex subscriptions:
- `tender_risk_update` - New risk analysis
- `rti_status_change` - RTI status updates
- `permit_delay_alert` - Delay notifications
- `budget_progress_update` - Project progress updates