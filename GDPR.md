# GDPR Compliance Implementation

This document outlines the GDPR-compliant endpoints and data handling practices implemented in the Fastodigama backend.

## Implemented Endpoints

### 1. User Data Export (Right to Portability)
**Endpoint:** `GET /api/user/export`  
**Authentication:** Required (user session)

**Response:** JSON file download containing:
- User profile (email, name, nickname, role)
- All comments made by the user
- Consent history (timestamps, IP addresses, user agents)
- Activity logs (last seen timestamps)

**Usage:**
```bash
curl -X GET https://api.fastodigama.com/api/user/export \
  -H "Cookie: FastodigamaSession=..." \
  --output user-data.json
```

---

### 2. User Account Deletion (Right to be Forgotten)
**Endpoint:** `DELETE /api/user/account`  
**Authentication:** Required (user session)

**Request Body:**
```json
{
  "confirmPassword": "user_password"
}
```

**Actions performed:**
1. ✅ Deletes all consent records
2. ✅ Anonymizes user's comments (sets author to null, name to "Deleted User")
3. ✅ Deletes profile picture from R2 storage
4. ✅ Deletes user account from database
5. ✅ Destroys user session

**Note:** Comments are anonymized rather than deleted to preserve public discourse and article context.

**Usage:**
```bash
curl -X DELETE https://api.fastodigama.com/api/user/account \
  -H "Content-Type: application/json" \
  -H "Cookie: FastodigamaSession=..." \
  -d '{"confirmPassword": "mypassword"}'
```

---

### 3. Consent Records (Proof of Consent)

#### Log Consent
**Endpoint:** `POST /api/consent`  
**Authentication:** Required (user session)

**Request Body:**
```json
{
  "consentType": "analytics",  // "analytics" | "marketing" | "all"
  "granted": true
}
```

**Captured Data:**
- Timestamp (automatic)
- IP address (automatic)
- User agent (automatic)
- User ID (from session)

**Usage:**
```bash
curl -X POST https://api.fastodigama.com/api/consent \
  -H "Content-Type: application/json" \
  -H "Cookie: FastodigamaSession=..." \
  -d '{"consentType": "analytics", "granted": true}'
```

#### Get User's Consent History
**Endpoint:** `GET /api/consent`  
**Authentication:** Required (user session)

**Response:**
```json
{
  "success": true,
  "consents": [
    {
      "consentType": "analytics",
      "granted": true,
      "timestamp": "2026-03-02T10:30:00.000Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

#### Get Consent History for Any User (Admin Only)
**Endpoint:** `GET /api/admin/consent/:userId`  
**Authentication:** Required (admin role)

**Response:** Same as above, but for specified user.

---

## Data Retention Policy

### Recommended Implementation

1. **Inactive Accounts**
   - Delete accounts inactive for 12+ months
   - Send email warning at 11 months
   - Implement via cron job or scheduled task

2. **Orphaned Data**
   - Anonymized comments: Keep indefinitely (no personal data)
   - Consent logs: Keep for 3 years (legal requirement)
   - Activity logs: Delete after 2 years

3. **Profile Pictures**
   - Deleted immediately when account is deleted
   - Stored in Cloudflare R2 bucket

### Example Cron Job (Node.js)
```javascript
import cron from "node-cron";
import userModel from "./components/User/model.js";

// Run at midnight on the 1st of every month
cron.schedule("0 0 1 * *", async () => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Find inactive users
  const inactiveUsers = await User.find({
    lastLoginAt: { $lt: oneYearAgo }
  });
  
  console.log(`Found ${inactiveUsers.length} inactive accounts`);
  // Send warning emails or delete accounts
});
```

---

## Frontend Integration

Your frontend ConsentManager component already handles cookie consent. To integrate with these endpoints:

```javascript
// When user grants/revokes consent
const handleConsentChange = async (consentType, granted) => {
  await fetch('/api/consent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentType, granted })
  });
};

// Export user data
const exportUserData = async () => {
  const response = await fetch('/api/user/export', {
    method: 'GET',
    credentials: 'include'
  });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-data.json';
  a.click();
};

// Delete account
const deleteAccount = async (password) => {
  const response = await fetch('/api/user/account', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmPassword: password })
  });
  
  if (response.ok) {
    window.location.href = '/';
  }
};
```

---

## GDPR Compliance Checklist

✅ **Right to Access** - Users can view their data via export  
✅ **Right to Portability** - Data exported in machine-readable JSON format  
✅ **Right to be Forgotten** - Account deletion with data anonymization  
✅ **Consent Tracking** - Timestamps, IP, user agent logged  
✅ **Data Minimization** - Only collect necessary data  
✅ **Security** - Password confirmation required for deletion  
✅ **Transparency** - Clear documentation of data handling  

### Still Needed:
- 📋 Privacy Policy page on frontend
- 📋 Cookie banner integration (already built, needs consent endpoint calls)
- 📋 Data retention automation (cron job for old data cleanup)
- 📋 Email notifications for account deletion warnings

---

## Legal References

- **GDPR Article 12-13-14**: Transparency and information  
- **GDPR Article 15**: Right of access  
- **GDPR Article 17**: Right to erasure ("right to be forgotten")  
- **GDPR Article 20**: Right to data portability  

Full text: https://gdpr-info.eu/art-12-13-14/

---

## Testing

### Test User Data Export
1. Create a test user account
2. Add some comments
3. Log consent changes
4. Call `GET /api/user/export`
5. Verify JSON contains all user data

### Test Account Deletion
1. Create a test user with comments
2. Call `DELETE /api/user/account` with password
3. Verify:
   - User account deleted
   - Comments show "Deleted User"
   - Profile picture removed from R2
   - Session destroyed

### Test Consent Logging
1. Log consent: `POST /api/consent`
2. Retrieve: `GET /api/consent`
3. Verify timestamp, IP, user agent recorded

---

## Support

For questions about GDPR compliance, contact your legal team or data protection officer (DPO).
