# Messaging API Security Audit & Fixes

**Date**: 2026-02-07  
**Audited File**: `app/api/messaging/messages/route.ts`  
**Status**: ✅ **CRITICAL VULNERABILITIES FIXED**

---

## 🚨 CRITICAL VULNERABILITIES FOUND & FIXED

### 1. **CRITICAL: Cross-Tenant Data Leak in POST /api/messaging/messages**

**Severity**: 🔴 **CRITICAL** (10/10)  
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Issue**:
The endpoint created messages WITHOUT verifying that the `channelId` or `conversationId` belonged to the user's organization. This allowed a malicious user to:
1. Discover a valid `channelId` from another organization
2. Send messages to channels in OTHER organizations
3. Corrupt the database with cross-tenant data
4. Potentially exfiltrate data from other tenants

**Attack Scenario**:
```typescript
// Attacker from OrgA with valid auth token
POST /api/messaging/messages
{
  "channelId": "chn-000042",  // ← Channel from OrgB (discovered via enumeration)
  "content": "Malicious message"
}

// Result: Message created with:
// - organizationId = OrgA (from attacker's token)
// - channelId = chn-000042 (from OrgB)
// → Database corruption + potential data leak
```

**Fix Applied**:
- Added `organizationId` verification for both `channelId` and `conversationId` BEFORE message creation
- Added membership/participation verification to ensure user has access
- Added validation for channel ownership

```typescript
// BEFORE (VULNERABLE):
const message = await prismadb.message.create({
  data: {
    organizationId,  // From auth
    channelId,       // ❌ NOT VERIFIED
    conversationId,  // ❌ NOT VERIFIED
    ...
  }
});

// AFTER (SECURE):
// First verify channel belongs to user's org AND user is a member
if (channelId) {
  const channel = await prismadb.channel.findFirst({
    where: { id: channelId, organizationId } // ✅ Tenant verification
  });
  if (!channel) return 404;
  
  const membership = await prismadb.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } }
  });
  if (!membership) return 403;
}
// Then create message...
```

---

### 2. **CRITICAL: Cross-Tenant Data Access in GET /api/messaging/messages**

**Severity**: 🔴 **CRITICAL** (9/10)  
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Issue**:
The GET endpoint fetched messages WITHOUT verifying:
1. The channel/conversation belongs to the user's organization
2. The user is a member/participant
3. Messages filtered by `organizationId`

**Attack Scenario**:
```typescript
// Attacker from OrgA
GET /api/messaging/messages?channelId=chn-000099  // OrgB's channel

// Result: Returns ALL messages from OrgB's channel
// → Data leak across tenants
```

**Fix Applied**:
- Added `organizationId` to WHERE clause when fetching messages
- Added membership/participation verification BEFORE fetching
- Added `organizationId` verification for pagination cursors

```typescript
// BEFORE (VULNERABLE):
const messages = await prismadb.message.findMany({
  where: {
    channelId,  // ❌ No tenant isolation
    isDeleted: false,
  }
});

// AFTER (SECURE):
// Verify access first
const membership = await prismadb.channelMember.findFirst({
  where: { 
    channelId, 
    userId,
    channel: { organizationId } // ✅ Tenant verification
  }
});
if (!membership) return 403;

// Then fetch with organizationId filter
const messages = await prismadb.message.findMany({
  where: {
    organizationId, // ✅ Tenant isolation
    channelId,
    isDeleted: false,
  }
});
```

---

### 3. **CRITICAL: Cross-Tenant Notification Spam in POST /api/messaging/messages**

**Severity**: 🔴 **HIGH** (7/10)  
**CWE**: CWE-400 (Uncontrolled Resource Consumption)

**Issue**:
The notification logic:
1. Did NOT verify channel/conversation belonged to user's org
2. Sent individual notifications to EVERY member without batching
3. Had NO rate limiting or throttling
4. Could overwhelm Resend API and rack up costs

**Attack Scenario**:
```typescript
// Attacker joins large channel (500 members)
for (let i = 0; i < 1000; i++) {
  POST /api/messaging/messages { channelId, content: "spam" }
}
// Result: 500,000 notifications sent
// → DoS + cost explosion + Resend account suspension
```

**Fix Applied**:
- Added `organizationId` verification when fetching channel members
- Limited member fetching to 100 (channels) / 50 (conversations)
- Batched notifications with `Promise.allSettled()`
- Truncated message preview to 200 characters
- Added error handling for notification failures

```typescript
// BEFORE (VULNERABLE):
const channel = await prismadb.channel.findUnique({
  where: { id: channelId }, // ❌ No tenant check
  include: { members: { ... } } // ❌ No limit
});
for (const member of channel.members) {
  await notifyNewMessage(...); // ❌ Sequential, no error handling
}

// AFTER (SECURE):
const channel = await prismadb.channel.findFirst({
  where: { id: channelId, organizationId }, // ✅ Tenant check
  include: { 
    members: { 
      ..., 
      take: 100 // ✅ Limit to prevent DoS
    } 
  }
});

const promises = channel.members.map(m => notifyNewMessage(...));
await Promise.allSettled(promises).catch(...); // ✅ Batched + error handling
```

---

### 4. **HIGH: Cross-Tenant Message Edit/Delete (PATCH/DELETE)**

**Severity**: 🟠 **HIGH** (8/10)  
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)

**Issue**:
Both PATCH and DELETE endpoints fetched messages using `findUnique()` WITHOUT `organizationId` filter, allowing users to potentially edit/delete messages from other organizations.

**Fix Applied**:
- Changed `findUnique()` to `findFirst()` with `organizationId` filter
- Added content validation for PATCH (max 10KB)

```typescript
// BEFORE (VULNERABLE):
const message = await prismadb.message.findUnique({
  where: { id: messageId } // ❌ No tenant check
});

// AFTER (SECURE):
const message = await prismadb.message.findFirst({
  where: { 
    id: messageId, 
    organizationId // ✅ Tenant verification
  }
});
```

---

### 5. **MEDIUM: Missing Input Validation**

**Severity**: 🟡 **MEDIUM** (5/10)  

**Issues Fixed**:
- ✅ Added content length limit (10KB max) to prevent database issues
- ✅ Added attachment count limit (10 max) to prevent spam
- ✅ Added mention count limit (50 max) to prevent spam
- ✅ Added limit validation for GET (1-200 range) to prevent abuse

---

### 6. **LOW: Silent Ably Failures**

**Severity**: 🟢 **LOW** (2/10)  

**Issue**:
Ably publish failures were silently swallowed, leading to messages being created but not delivered in real-time.

**Fix Applied**:
- Added proper error logging for Ably failures
- Log warnings when Ably is not configured
- Messages still work without Ably (degraded mode)

---

### 7. **INFO: Rate Limiting Configuration**

**Severity**: ℹ️ **INFO**  

**Fix Applied**:
Added messaging endpoints to "burst" tier in `lib/rate-limit.ts`:
- `/api/messaging/messages` → 30 requests per 10 seconds
- `/api/messaging/reactions` → burst tier
- `/api/messaging/typing` → burst tier

---

## 📊 IMPACT ASSESSMENT

| Vulnerability | Severity | Exploitability | Impact | Status |
|--------------|----------|----------------|--------|--------|
| Cross-tenant message creation | CRITICAL | Easy | Complete tenant isolation bypass | ✅ FIXED |
| Cross-tenant message reading | CRITICAL | Easy | Data leak across organizations | ✅ FIXED |
| Notification spam/DoS | HIGH | Easy | Cost explosion, service disruption | ✅ FIXED |
| Cross-tenant edit/delete | HIGH | Medium | Message tampering | ✅ FIXED |
| Missing input validation | MEDIUM | Easy | Database issues, spam | ✅ FIXED |
| Silent Ably failures | LOW | N/A | Poor UX | ✅ FIXED |

---

## 🔒 SECURITY CHECKLIST (POST-FIX)

- [x] All endpoints verify `organizationId` for tenant isolation
- [x] All channel/conversation access is verified before operations
- [x] Input validation for content, attachments, mentions
- [x] Rate limiting configured for messaging endpoints
- [x] Notifications batched and limited to prevent DoS
- [x] Proper error logging for debugging
- [x] Pagination cursors validated for tenant ownership
- [x] No client-controlled organization IDs accepted

---

## 🧪 TESTING RECOMMENDATIONS

### 1. **Tenant Isolation Tests**
```bash
# Test 1: Cannot send messages to other org's channels
- User from OrgA tries to POST with OrgB's channelId
- Expected: 404 "Channel not found or access denied"

# Test 2: Cannot read messages from other org's channels
- User from OrgA tries to GET messages from OrgB's channelId
- Expected: 403 "Channel not found or access denied"

# Test 3: Cannot edit messages from other orgs
- User from OrgA tries to PATCH message from OrgB
- Expected: 404 "Message not found"

# Test 4: Cannot delete messages from other orgs
- User from OrgA tries to DELETE message from OrgB
- Expected: 404 "Message not found"
```

### 2. **Input Validation Tests**
```bash
# Test 1: Content length limit
- POST message with 10,001 characters
- Expected: 400 "Message content exceeds maximum length"

# Test 2: Attachment limit
- POST message with 11 attachments
- Expected: 400 "Maximum 10 attachments per message"

# Test 3: Mention limit
- POST message with 51 mentions
- Expected: 400 "Maximum 50 mentions per message"

# Test 4: Invalid limit parameter
- GET messages with limit=500
- Expected: 400 "Limit must be between 1 and 200"
```

### 3. **Rate Limiting Tests**
```bash
# Test: Burst protection
- Send 31 messages in 10 seconds
- Expected: 429 "Too many requests"
```

---

## 📝 ADDITIONAL RECOMMENDATIONS

### **Immediate (Next Sprint)**:
1. ✅ Deploy these fixes to production IMMEDIATELY (security hotfix)
2. 🔍 Audit database for any cross-tenant messages created before fix
3. 📊 Add monitoring/alerting for failed authorization attempts
4. 🔐 Consider adding audit logging for all message operations

### **Short-term (This Month)**:
1. Implement end-to-end encryption for sensitive conversations
2. Add message retention policies and automated deletion
3. Implement webhook signing for external integrations
4. Add CAPTCHA for public-facing message forms (if any)

### **Long-term (This Quarter)**:
1. Conduct full security audit of ALL API routes
2. Implement automated tenant isolation testing in CI/CD
3. Add honeypot fields to detect automated attacks
4. Consider implementing message approval workflow for high-risk scenarios

---

## 🎯 PRODUCTION DEPLOYMENT CHECKLIST

Before deploying to production:

- [x] All security fixes applied
- [ ] Linter warnings addressed (optional - only complexity warnings)
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Database backup taken
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Security team notified
- [ ] Changelog updated
- [ ] Users notified (if necessary)

---

## 📞 INCIDENT RESPONSE

**If you suspect exploitation BEFORE this fix was deployed**:

1. **Immediate**:
   - Check application logs for unauthorized access attempts
   - Query database for messages with mismatched `organizationId` and `channelId`/`conversationId`
   - Notify security team and affected customers

2. **Investigation**:
   ```sql
   -- Find potentially corrupted messages
   SELECT m.id, m.organizationId, c.organizationId as channel_org
   FROM "Message" m
   JOIN "Channel" c ON m.channelId = c.id
   WHERE m.organizationId != c.organizationId;
   
   -- Find messages in conversations from different orgs
   SELECT m.id, m.organizationId, conv.organizationId as conv_org
   FROM "Message" m
   JOIN "Conversation" conv ON m.conversationId = conv.id
   WHERE m.organizationId != conv.organizationId;
   ```

3. **Remediation**:
   - Delete or quarantine affected messages
   - Notify affected organizations
   - Document incident for compliance

---

## ✅ CONCLUSION

All **CRITICAL** and **HIGH** severity vulnerabilities have been fixed. The messaging API now properly enforces:
- ✅ Tenant isolation (organizationId filtering)
- ✅ Authorization (membership/participation verification)
- ✅ Input validation (content, attachments, mentions)
- ✅ Rate limiting (burst tier for messaging)
- ✅ DoS prevention (notification batching and limits)

**Recommendation**: Deploy these fixes as a **security hotfix** immediately.
