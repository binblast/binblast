# Partner Employee Payroll System

## Overview

This document outlines the system needed to handle partner employees separately from Bin Blast employees, ensuring that partners pay their own team members rather than Bin Blast paying them.

## Current State

### ✅ What's Already Working:
1. **Employee Creation**: Partner team members are created as employees with `role: "employee"`
2. **Partner Linking**: Employees are linked to partners via `partnerId` field
3. **Basic Functionality**: Partner employees can:
   - Clock in/out
   - Complete jobs
   - View their assigned jobs
   - See their earnings (currently calculated same as Bin Blast employees)

### ❌ What's Missing:
1. **Payroll Separation**: No distinction between Bin Blast employees and partner employees in payroll
2. **Partner Payment System**: No way for partners to pay their employees
3. **Cost Tracking**: Partner employee costs aren't tracked or deducted from partner commissions
4. **Partner Dashboard**: No UI for partners to manage team payroll
5. **Job Assignment Logic**: Jobs aren't filtered by partner (partner employees could work on any job)

## Required System Components

### 1. Employee Type Detection
- ✅ **DONE**: Added `partnerId` to Employee interface
- ✅ **DONE**: Added helper functions `getEmployeePartnerId()` and `isPartnerEmployee()`

### 2. Partner Employee Earnings API
**Endpoint**: `/api/partners/team-members/[employeeId]/earnings`

**Purpose**: Track earnings for partner employees separately from Bin Blast employees

**Features**:
- Calculate earnings based on completed jobs
- Only count jobs assigned to partner bookings (if applicable)
- Return earnings data for partner dashboard
- Track earnings over time periods (today, week, month)

**Status**: ⏳ **TO BE BUILT**

### 3. Partner Payroll Dashboard
**Location**: Partner Dashboard → Team Members → Payroll

**Features**:
- View all team members and their earnings
- See total payroll costs
- Pay employees (via Stripe Connect or manual tracking)
- View payroll history
- Export payroll reports

**Status**: ⏳ **TO BE BUILT**

### 4. Job Assignment Logic Updates
**Current Issue**: Partner employees can be assigned to any job, including Bin Blast customer jobs

**Solution Options**:
- **Option A**: Only assign partner employees to jobs from their partner's bookings
- **Option B**: Allow partner employees to work on any job, but track which jobs belong to which partner
- **Option C**: Hybrid - prefer partner bookings, but allow overflow to Bin Blast jobs

**Recommendation**: Option A (partner employees only work on partner bookings)

**Status**: ⏳ **TO BE BUILT**

### 5. Partner Commission Deduction
**Purpose**: Deduct partner employee costs from partner commissions

**Logic**:
- When calculating partner payouts, subtract total employee payroll costs
- Track employee costs separately in `partnerPayouts` collection
- Show net commission (gross commission - employee costs) in partner dashboard

**Status**: ⏳ **TO BE BUILT**

### 6. Earnings API Update
**Current**: `/api/operator/employees/[employeeId]/earnings` treats all employees the same

**Update Needed**:
- Check if employee belongs to a partner
- If partner employee, redirect to partner earnings API or return different data
- Ensure Bin Blast only pays Bin Blast employees

**Status**: ⏳ **TO BE BUILT**

## Database Schema Changes

### New Collections Needed:

#### `partnerEmployeeEarnings`
```typescript
{
  id: string;
  employeeId: string;
  partnerId: string;
  date: string; // YYYY-MM-DD
  completedJobs: number;
  earnings: number;
  payRatePerJob: number;
  status: "pending" | "paid" | "cancelled";
  paidAt?: Timestamp;
  paidBy?: string; // partnerId or "binblast"
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `partnerPayrollPayments`
```typescript
{
  id: string;
  partnerId: string;
  employeeId: string;
  amount: number;
  period: string; // "YYYY-MM-DD" or "YYYY-MM" for monthly
  paymentMethod: "stripe" | "manual" | "bank_transfer";
  stripeTransferId?: string;
  status: "pending" | "completed" | "failed";
  paidAt?: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Updates to Existing Collections:

#### `partnerPayouts`
Add fields:
```typescript
{
  // ... existing fields
  employeeCosts: number; // Total employee payroll costs for this period
  netCommission: number; // grossCommission - employeeCosts
  employeePayrollBreakdown?: {
    employeeId: string;
    employeeName: string;
    earnings: number;
  }[];
}
```

## Implementation Priority

### Phase 1: Core Functionality (High Priority)
1. ✅ Update Employee interface and helper functions
2. ⏳ Create partner employee earnings API
3. ⏳ Update job assignment to prefer partner bookings for partner employees
4. ⏳ Update earnings API to check employee type

### Phase 2: Partner Dashboard (Medium Priority)
5. ⏳ Add payroll section to partner dashboard
6. ⏳ Show team member earnings and totals
7. ⏳ Add payment functionality

### Phase 3: Commission Integration (Medium Priority)
8. ⏳ Track employee costs in partner payouts
9. ⏳ Deduct employee costs from commissions
10. ⏳ Show net commission in partner dashboard

### Phase 4: Advanced Features (Low Priority)
11. ⏳ Payroll history and reports
12. ⏳ Automated payroll via Stripe Connect
13. ⏳ Payroll export/CSV functionality

## Testing Checklist

- [ ] Partner employees can only see/complete jobs from their partner's bookings
- [ ] Partner employee earnings are tracked separately
- [ ] Bin Blast employees are not affected by changes
- [ ] Partners can view team member earnings
- [ ] Partners can pay employees
- [ ] Employee costs are deducted from partner commissions
- [ ] Payroll history is tracked correctly

## Notes

- **Important**: Bin Blast should NOT pay partner employees. Only partners pay their employees.
- Partner employees should function like Bin Blast employees in terms of:
  - Clock in/out
  - Job completion
  - Training requirements
  - Photo documentation
- The main difference is WHO pays them (partner vs Bin Blast)
