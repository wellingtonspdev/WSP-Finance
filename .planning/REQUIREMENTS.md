# Requirements: WSP Finance Phase 2

**Defined:** 2026-05-31
**Core Value:** Manual and imported financial records must stay tenant-safe, auditable, and consistent with account balances.

## v1 Requirements

### Manual Transactions

- [ ] **TX-01**: Client can create a manual transaction without sending `accountId`.
- [ ] **TX-02**: Backend resolves a default workspace account when `accountId` is absent.
- [ ] **TX-03**: Backend still accepts an explicit `accountId` only when it belongs to the current workspace.
- [ ] **TX-04**: Paid transactions created without `accountId` update the resolved account balance correctly.

### ID Contracts

- [ ] **ID-01**: `Transaction.id` remains a string UUID contract across Phase 2 changes.
- [ ] **ID-02**: `Account.id` remains a numeric contract.
- [ ] **ID-03**: `Workspace.id` remains a numeric contract.

### Taxes and Marketplace

- [ ] **TAX-01**: New transactions save `taxAmount = null` even when `Workspace.taxRate > 0`.
- [ ] **TAX-02**: New transactions save `netValue = null` even when `Workspace.taxRate > 0`.
- [ ] **MKT-01**: Marketplace fields are preserved and allowed fields are not removed.
- [ ] **MKT-02**: Marketplace `finalAmount` behavior based on gross amount, platform fee, and shipping remains intact, without tax provisioning.

## v2 Requirements

### Deferred

- **TAX-03**: Reintroduce tax provisioning with a product-approved model.
- **TX-05**: Add explicit persisted default-account configuration if name/type fallback is insufficient.

## Out of Scope

| Feature | Reason |
|---------|--------|
| BridgeService changes | Explicitly excluded from Phase 2 |
| OFX/OpenFinance import changes | Explicitly excluded unless separately approved |
| Telegram/OCR changes | Baseline must remain preserved |
| Pro-labore recurrence | Explicitly excluded from Phase 2 |
| Broad frontend redesign | Phase 2 is backend contract-focused |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TX-01 | Phase 2 | Pending |
| TX-02 | Phase 2 | Pending |
| TX-03 | Phase 2 | Pending |
| TX-04 | Phase 2 | Pending |
| ID-01 | Phase 2 | Pending |
| ID-02 | Phase 2 | Pending |
| ID-03 | Phase 2 | Pending |
| TAX-01 | Phase 2 | Pending |
| TAX-02 | Phase 2 | Pending |
| MKT-01 | Phase 2 | Pending |
| MKT-02 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-05-31*
*Last updated: 2026-05-31 after GSD Phase 2 bootstrap*
