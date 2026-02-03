# Active Directory Integration - Backend Functions

## 📋 Overview

This directory contains backend function templates for integrating the Reimbursement Portal with enterprise Active Directory (AD).

## 🔧 Required Setup

### 1. Enable Backend Functions
- Go to Base44 Dashboard → Settings
- Enable "Backend Functions"
- Deploy changes

### 2. Configure AD Connector
- Add Microsoft AD / Azure AD connector
- Configure with your tenant ID and credentials
- Request scopes: `User.Read`, `User.ReadBasic.All`, `Directory.Read.All`

### 3. Deploy Backend Functions
All `.js` files in `/functions` directory are automatically deployed when backend functions are enabled.

## 📁 Backend Functions

### `handleADLogin.js`
**Purpose:** Handles SSO authentication via AD

**Trigger:** User initiates login

**Flow:**
1. Redirect user to AD login page
2. Receive AD token after successful authentication
3. Verify token and extract user info
4. Create/update user session in Base44
5. Sync user data from AD
6. Redirect to Dashboard

**Usage:**
```javascript
// Frontend call
const response = await base44.callFunction('handleADLogin', {
  ad_code: authCode // From AD callback
});
```

---

### `syncUserFromAD.js`
**Purpose:** Syncs user data and manager hierarchy from AD

**Trigger:** 
- First login
- Scheduled task (daily)
- Manual admin trigger

**Updates:**
- `ad_user_id`
- `department`
- `designation`
- `manager_ad_id`
- `manager_name`
- `manager_email`
- `last_ad_sync`

**Usage:**
```javascript
const response = await base44.callFunction('syncUserFromAD', {
  ad_user_id: 'AD001',
  email: 'user@company.com'
});
```

---

### `resolveApprover.js`
**Purpose:** Determines next approver using hybrid model (portal role + AD manager)

**Hybrid Logic:**
- **Verification:** Junior Admin (portal role)
- **Manager Approval:** Employee's AD manager (from `manager_email`)
- **Admin Head:** Admin Head (portal role)
- **CRO:** CRO (portal role)
- **CFO:** CFO (portal role)
- **Finance:** Finance team (portal role)

**Special Cases:**
- If employee has no manager in AD → Skip manager stage
- If torch bearer → Skip verification stage

**Usage:**
```javascript
const response = await base44.callFunction('resolveApprover', {
  claim_id: 'claim_123',
  current_status: 'submitted'
});
```

---

## 🔄 Scheduled Tasks

### Daily AD Sync
Create a scheduled task to sync all users:

```javascript
// Task: syncAllUsersFromAD
// Schedule: Daily at 2:00 AM

const users = await base44.entities.User.list();
for (const user of users) {
  if (user.ad_user_id) {
    await base44.callFunction('syncUserFromAD', {
      ad_user_id: user.ad_user_id,
      email: user.email
    });
  }
}
```

---

## 🎯 Frontend Changes Required

### 1. Remove Manual Login Page
Delete or hide the manual email/password login form.

### 2. Implement AD SSO Redirect
```javascript
// pages/Login.jsx
const handleADLogin = () => {
  const tenantId = 'YOUR_TENANT_ID';
  const clientId = 'YOUR_CLIENT_ID';
  const redirectUri = 'https://yourapp.com/auth/callback';
  
  window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid%20profile%20email`;
};
```

### 3. Create Callback Handler
```javascript
// pages/AuthCallback.jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  
  if (code) {
    base44.callFunction('handleADLogin', { ad_code: code })
      .then(response => {
        if (response.success) {
          window.location.href = createPageUrl('Dashboard');
        } else {
          toast.error(response.error);
        }
      });
  }
}, []);
```

---

## 🧪 Testing

### Test with Sample Users
Use the 7 sample AD users created in User Management:
- AD001: Rajesh Sharma (CEO, no manager)
- AD002: Anjali Mehta (VP - Engineering, reports to AD001)
- AD003: Suresh Iyer (Manager, reports to AD002)
- AD004: Priya Nair (Developer, reports to AD003)
- AD005: Amit Verma (Developer, reports to AD003)
- AD006: Kavita Rao (HR Manager, reports to AD001)
- AD007: Rohit Kulkarni (HR Executive, reports to AD006)

### Test Scenarios
1. **Normal Flow:** Priya submits claim → Junior Admin → Suresh (her manager) → Admin Head → CRO → CFO → Finance
2. **No Manager:** Rajesh submits claim → Skips manager stage
3. **Manager Change:** Update AD → Next sync reflects new manager

---

## 📞 Support

For AD connector configuration issues:
- Check Base44 documentation for AD connector setup
- Verify AD permissions and scopes
- Test AD connection in Base44 dashboard

For approval workflow issues:
- Check `resolveApprover.js` logic
- Verify user `portal_role` assignments
- Check claim status transitions in `Claim` entity