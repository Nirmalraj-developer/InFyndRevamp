# Role Management Lifecycle - Simple Flow

## Overview

Role-based access control lifecycle from trial user registration to paid workspace with team migration.

---

## REGISTRATION →

```
User completes OTP verification
    ↓
WorkspaceAccess.create({
  workspaceId: SYSTEM_WORKSPACE._id,
  userId: newUser._id,
  roleId: freeRoleId
})
```

**Result:** User record created in WorkspaceAccess table linking to SYSTEM_WORKSPACE

---

## SYSTEM WORKSPACE ACCESS →

```
User exists in WorkspaceAccess:
  - workspaceId: SYSTEM_WORKSPACE
  - userId: user_123
  - roleId: FREE_USER_ROLE_ID
```

**Result:** User has access to SYSTEM_WORKSPACE with FREE_USER role

---

## TRIAL ROLE →

```
WorkspaceRole (FREE_USER):
  - workspaceId: SYSTEM_WORKSPACE
  - roleName: 'FREE_USER'
  - permissions: ['dashboard.view', 'profile.view', 'profile.edit']
```

**Result:** User permissions resolved via WorkspaceRole.permissions array

---

## PERMISSION CHECK (TRIAL) →

```
API Request → checkPermission('export.10k')
    ↓
WorkspaceAccess.findOne({ userId, workspaceId: SYSTEM_WORKSPACE })
    ↓
WorkspaceRole.findById(roleId)
    ↓
Check: permissions.includes('export.10k')
    ↓
Result: false → 403 PERMISSION_DENIED
```

**Result:** Permission denied because FREE_USER role lacks 'export.10k' permission

---

## PAYMENT →

```
Payment webhook received
    ↓
subscription.service.handlePaymentSuccess({ userId, tenantId })
    ↓
Transaction starts
```

**Result:** Payment triggers workspace migration transaction

---

## WORKSPACE CREATION →

```
workspaceInitService.createWorkspaceWithRoles({
  ownerId: userId,
  tenantId: 'user_company',
  planName: 'PRO',
  memberLimit: 5
})
    ↓
Creates:
  - Workspace document
  - 2 WorkspaceRole documents (OWNER, MEMBER)
```

**Result:** Personal workspace created with 4 system roles

---

## ROLE MIGRATION →

```
Step 1: Remove from SYSTEM_WORKSPACE
WorkspaceAccess.deleteOne({
  userId,
  workspaceId: SYSTEM_WORKSPACE._id
})

Step 2: Add to Personal Workspace
WorkspaceAccess.create({
  workspaceId: newWorkspace._id,
  userId,
  roleId: ownerRoleId
})
```

**Result:** User moved from SYSTEM_WORKSPACE (FREE_USER) to Personal Workspace (OWNER)

---

## TEAM MIGRATION →

```
Find invited members:
WorkspaceAccess.find({
  workspaceId: SYSTEM_WORKSPACE._id,
  invitedBy: userId
})

For each member:
  1. Delete from SYSTEM_WORKSPACE
  2. Create in Personal Workspace with MEMBER role

WorkspaceAccess.create({
  workspaceId: newWorkspace._id,
  userId: member.userId,
  roleId: memberRoleId,
  invitedBy: userId
})
```

**Result:** Team members migrated from SYSTEM_WORKSPACE to Personal Workspace with MEMBER role

---

## PAID ACCESS →

```
Owner Request → checkPermission('export.10k')
    ↓
WorkspaceAccess.findOne({ userId, workspaceId: personalWorkspace })
    ↓
WorkspaceRole.findById(ownerRoleId)
    ↓
Check: permissions.includes('export.10k')
    ↓
Result: true → 200 OK

Member Request → checkPermission('billing.view')
    ↓
WorkspaceAccess.findOne({ userId: memberId, workspaceId: personalWorkspace })
    ↓
WorkspaceRole.findById(memberRoleId)
    ↓
Check: permissions.includes('billing.view')
    ↓
Result: false → 403 PERMISSION_DENIED
```

**Result:** OWNER has full access, MEMBER has limited access (no billing/subscription)

---

## Database State Transitions

### Trial User State

```javascript
WorkspaceAccess {
  workspaceId: SYSTEM_WORKSPACE_ID,
  userId: 'user_123',
  roleId: FREE_USER_ROLE_ID
}
```

### After Payment (Owner)

```javascript
WorkspaceAccess {
  workspaceId: PERSONAL_WORKSPACE_ID,
  userId: 'user_123',
  roleId: OWNER_ROLE_ID
}
```

### After Payment (Migrated Member)

```javascript
WorkspaceAccess {
  workspaceId: PERSONAL_WORKSPACE_ID,
  userId: 'member_456',
  roleId: MEMBER_ROLE_ID,
  invitedBy: 'user_123'
}
```

---

## Key Implementation Points

1. **Single WorkspaceAccess record per user per workspace**
2. **Role change = Delete old WorkspaceAccess + Create new WorkspaceAccess**
3. **Permission check always queries WorkspaceAccess → WorkspaceRole**
4. **SYSTEM_WORKSPACE used for all trial users**
5. **Personal workspace created only after payment**
6. **Team migration preserves invitedBy relationship**
7. **MEMBER role excludes billing/subscription permissions**
8. **All operations wrapped in MongoDB transactions**

---

## Summary Flow

```
REGISTRATION
  → Add to SYSTEM_WORKSPACE with FREE_USER role

TRIAL USAGE
  → Permission check via WorkspaceRole.permissions

PAYMENT SUCCESS
  → Remove from SYSTEM_WORKSPACE
  → Create Personal Workspace
  → Add to Personal Workspace with OWNER role
  → Migrate team members with MEMBER role

POST-PAYMENT
  → Permission check via WorkspaceRole.permissions (same logic, different workspace)
```

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  ROLE LIFECYCLE FLOW DIAGRAM                    │
└─────────────────────────────────────────────────────────────────┘

                        USER REGISTRATION
                              ↓
                    ┌─────────────────┐
                    │ OTP Verification│
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │ WorkspaceAccess │
                    │ CREATE          │
                    │ ┌─────────────┐ │
                    │ │workspaceId: │ │
                    │ │SYSTEM_WS    │ │
                    │ │roleId:      │ │
                    │ │FREE_USER    │ │
                    │ └─────────────┘ │
                    └────────┬────────┘
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                    TRIAL PERIOD                                │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │ API Request  │─────▶│WorkspaceAccess│─────▶│WorkspaceRole│ │
│  │              │      │ (SYSTEM_WS)  │      │ (FREE_USER) │ │
│  └──────────────┘      └──────────────┘      └──────┬──────┘ │
│                                                      ↓        │
│                                              ┌───────────────┐│
│                                              │ Permissions:  ││
│                                              │ - dashboard   ││
│                                              │ - profile     ││
│                                              └───────────────┘│
└────────────────────────────────────────────────────────────────┘
                             ↓
                    ┌─────────────────┐
                    │ PAYMENT SUCCESS │
                    └────────┬────────┘
                             ↓
┌────────────────────────────────────────────────────────────────┐
│              WORKSPACE MIGRATION (Transaction)                 │
│                                                                │
│  STEP 1: Remove from SYSTEM_WORKSPACE                          │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ WorkspaceAccess.deleteOne({                          │     │
│  │   userId,                                            │     │
│  │   workspaceId: SYSTEM_WORKSPACE                      │     │
│  │ })                                                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                             ↓                                 │
│  STEP 2: Create Personal Workspace                            │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Workspace.create({                                   │     │
│  │   ownerId: userId,                                   │     │
│  │   tenantId: 'user_company',                          │     │
│  │   planName: 'PRO'                                    │     │
│  │ })                                                   │     │
│  │                                                      │     │
│  │ + Create 2 WorkspaceRoles:                           │     │
│  │   - OWNER, MEMBER                                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                             ↓                                 │
│  STEP 3: Assign OWNER Role                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ WorkspaceAccess.create({                             │     │
│  │   workspaceId: newWorkspace._id,                     │     │
│  │   userId,                                            │     │
│  │   roleId: ownerRoleId                                │     │
│  │ })                                                   │     │
│  └──────────────────────────────────────────────────────┘     │
│                             ↓                                  │
│  STEP 4: Migrate Team Members (if any)                         │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Find: WorkspaceAccess.find({                         │     │
│  │   workspaceId: SYSTEM_WORKSPACE,                     │     │
│  │   invitedBy: userId                                  │     │
│  │ })                                                   │     │
│  │                                                      │     │
│  │ For each member:                                     │     │
│  │   - Delete from SYSTEM_WORKSPACE                     │     │
│  │   - Create in Personal Workspace (MEMBER role)       │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
                             ↓
┌────────────────────────────────────────────────────────────────┐
│                    PAID USER ACCESS                            │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │ API Request  │─────▶│WorkspaceAccess│─────▶│WorkspaceRole│ │
│  │              │      │ (Personal WS)│      │   (OWNER)   │ │
│  └──────────────┘      └──────────────┘      └──────┬──────┘ │
│                                                      ↓        │
│                                              ┌───────────────┐│
│                                              │ Permissions:  ││
│                                              │ - export.10k  ││
│                                              │ - billing     ││
│                                              │ - invite      ││
│                                              │ + 20 more     ││
│                                              └───────────────┘│
└────────────────────────────────────────────────────────────────┘
```

---

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              USER STATE TRANSITIONS                             │
└─────────────────────────────────────────────────────────────────┘

STATE 1: TRIAL USER
┌─────────────────────────────────┐
│ WorkspaceAccess                 │
│ ┌─────────────────────────────┐ │
│ │ workspaceId: SYSTEM_WS      │ │
│ │ userId: user_123            │ │
│ │ roleId: FREE_USER_ROLE      │ │
│ └─────────────────────────────┘ │
│                                 │
│ Permissions: 3                  │
│ - dashboard.view                │
│ - profile.view                  │
│ - profile.edit                  │
└─────────────┬───────────────────┘
              │
              │ Payment Success
              ↓
STATE 2: PAID USER (OWNER)
┌─────────────────────────────────┐
│ WorkspaceAccess                 │
│ ┌─────────────────────────────┐ │
│ │ workspaceId: PERSONAL_WS    │ │
│ │ userId: user_123            │ │
│ │ roleId: OWNER_ROLE          │ │
│ └─────────────────────────────┘ │
│                                 │
│ Permissions: 23                 │
│ - All FREE_USER permissions     │
│ - export.10k                    │
│ - export.prospect               │
│ - user.invite                   │
│ - billing.manage                │
│ - + 18 more                     │
└─────────────────────────────────┘

STATE 3: TEAM MEMBER (MIGRATED)
┌─────────────────────────────────┐
│ WorkspaceAccess                 │
│ ┌─────────────────────────────┐ │
│ │ workspaceId: PERSONAL_WS    │ │
│ │ userId: member_456          │ │
│ │ roleId: MEMBER_ROLE         │ │
│ │ invitedBy: user_123         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Permissions: 8                  │
│ - dashboard.view                │
│ - export.prospect               │
│ - export.company                │
│ - contact.download              │
│ - + 4 more                      │
│                                 │
│ Denied:                         │
│ - billing.* (no billing access) │
│ - user.invite (no invite)       │
└─────────────────────────────────┘
```

---

## Permission Check Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│           PERMISSION CHECK (TRIAL vs PAID)                      │
└─────────────────────────────────────────────────────────────────┘

TRIAL USER REQUEST                    PAID USER REQUEST
       ↓                                     ↓
┌──────────────┐                      ┌──────────────┐
│ GET /export  │                      │ GET /export  │
└──────┬───────┘                      └──────┬───────┘
       ↓                                     ↓
┌──────────────────────┐              ┌──────────────────────┐
│ WorkspaceAccess      │              │ WorkspaceAccess      │
│ workspaceId:         │              │ workspaceId:         │
│ SYSTEM_WORKSPACE     │              │ PERSONAL_WORKSPACE   │
└──────┬───────────────┘              └──────┬───────────────┘
       ↓                                     ↓
┌──────────────────────┐              ┌──────────────────────┐
│ WorkspaceRole        │              │ WorkspaceRole        │
│ roleName: FREE_USER  │              │ roleName: OWNER      │
│ permissions: [       │              │ permissions: [       │
│   'dashboard.view',  │              │   'dashboard.view',  │
│   'profile.view'     │              │   'export.10k',      │
│ ]                    │              │   'billing.manage'   │
└──────┬───────────────┘              │   ... (23 total)     │
       ↓                              └──────┬───────────────┘
┌──────────────────────┐                     ↓
│ Check:               │              ┌──────────────────────┐
│ 'export.10k' in      │              │ Check:               │
│ permissions?         │              │ 'export.10k' in      │
│                      │              │ permissions?         │
│ Result: FALSE ❌     │              │                      │
└──────┬───────────────┘              │ Result: TRUE ✅      │
       ↓                              └──────┬───────────────┘
┌──────────────────────┐                     ↓
│ 403 PERMISSION_DENIED│              ┌──────────────────────┐
└──────────────────────┘              │ 200 OK               │
                                      │ Export Allowed       │
                                      └──────────────────────┘
```

---

## Team Migration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│              TEAM MIGRATION ON PAYMENT                          │
└─────────────────────────────────────────────────────────────────┘

BEFORE PAYMENT (SYSTEM_WORKSPACE)
┌─────────────────────────────────────────────────────────────────┐
│ SYSTEM_WORKSPACE                                                │
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│ │ User A (Owner)  │  │ User B (Member) │  │ User C (Member) │ │
│ │ FREE_USER role  │  │ FREE_USER role  │  │ FREE_USER role  │ │
│ │ invitedBy: null │  │ invitedBy: A    │  │ invitedBy: A    │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             ↓
                    User A Makes Payment
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              MIGRATION TRANSACTION                              │
│                                                                 │
│ 1. Delete User A from SYSTEM_WORKSPACE                          │
│ 2. Delete User B from SYSTEM_WORKSPACE                          │
│ 3. Delete User C from SYSTEM_WORKSPACE                          │
│                                                                 │
│ 4. Create Personal Workspace for User A                         │
│                                                                 │
│ 5. Add User A to Personal Workspace (OWNER role)                │
│ 6. Add User B to Personal Workspace (MEMBER role)               │
│ 7. Add User C to Personal Workspace (MEMBER role)               │
└─────────────────────────────────────────────────────────────────┘
                             ↓
AFTER PAYMENT (PERSONAL_WORKSPACE)
┌─────────────────────────────────────────────────────────────────┐
│ PERSONAL_WORKSPACE (User A's)                                   │
│                                                                 │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│ │ User A (Owner)  │  │ User B (Member) │  │ User C (Member) │ │
│ │ OWNER role      │  │ MEMBER role     │  │ MEMBER role     │ │
│ │ 23 permissions  │  │ 8 permissions   │  │ 8 permissions   │ │
│ │ invitedBy: null │  │ invitedBy: A    │  │ invitedBy: A    │ │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```
