# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Oikion seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed
- Exploit the vulnerability beyond what is necessary to demonstrate it

### Please DO:

1. **Email us directly** at security@oikion.com with details of the vulnerability
2. **Include the following information**:
   - Type of vulnerability (e.g., SQL injection, XSS, authentication bypass)
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the vulnerability and how an attacker might exploit it
   - Any suggested fixes (if you have them)

3. **Allow us time to respond** - We will acknowledge your email within 48 hours and provide a more detailed response within 7 days

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Investigation**: We will investigate and validate the vulnerability
3. **Fix Development**: We will develop and test a fix
4. **Disclosure**: We will coordinate with you on the disclosure timeline
5. **Credit**: We will credit you in our security advisory (unless you prefer to remain anonymous)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - **Critical**: Within 7 days
  - **High**: Within 14 days
  - **Medium**: Within 30 days
  - **Low**: Within 90 days

## Security Best Practices

### For Users

#### Environment Variables

- **Never commit** `.env` or `.env.local` files to version control
- **Use strong secrets** for all sensitive variables
- **Rotate credentials** regularly, especially after team member departures
- **Limit access** to production environment variables

#### Database Security

- **Use connection pooling** with appropriate limits
- **Enable SSL/TLS** for database connections
- **Restrict database access** to specific IP addresses when possible
- **Regular backups** with encryption at rest
- **Separate databases** for development, staging, and production

#### Authentication & Authorization

- **Enable 2FA** for all team members in Clerk
- **Use strong passwords** and password managers
- **Review permissions** regularly
- **Implement least privilege** access control
- **Monitor authentication logs** for suspicious activity

#### API Security

- **Rotate API keys** regularly
- **Use scoped API keys** with minimal required permissions
- **Implement rate limiting** on all API endpoints
- **Monitor API usage** for anomalies
- **Use HTTPS only** for all API communications

#### File Uploads

- **Validate file types** before upload
- **Scan files** for malware when possible
- **Limit file sizes** appropriately
- **Use signed URLs** for file access
- **Store files** in secure, isolated storage

### For Developers

#### Code Security

- **Input Validation**: Always validate and sanitize user input
- **Output Encoding**: Encode output to prevent XSS attacks
- **Parameterized Queries**: Use Prisma ORM to prevent SQL injection
- **Authentication Checks**: Verify authentication on all protected routes
- **Authorization Checks**: Verify user permissions before data access
- **Error Handling**: Don't expose sensitive information in error messages

#### Dependencies

- **Keep dependencies updated**: Run `pnpm update` regularly
- **Audit dependencies**: Run `pnpm audit` before releases
- **Review new dependencies**: Check for known vulnerabilities
- **Use lock files**: Commit `pnpm-lock.yaml` to ensure consistent versions
- **Minimize dependencies**: Only add necessary packages

#### Secrets Management

- **Never hardcode secrets** in source code
- **Use environment variables** for all sensitive data
- **Use secret management tools** in production (e.g., Vercel Environment Variables)
- **Rotate secrets** after potential exposure
- **Use different secrets** for different environments

#### Secure Coding Practices

```typescript
// ✅ Good: Validate input
const email = z.string().email().parse(input.email);

// ❌ Bad: No validation
const email = input.email;

// ✅ Good: Check authorization
const property = await prismaForOrg(session.user.organizationId)
  .property.findUnique({ where: { id } });

// ❌ Bad: No tenant isolation
const property = await prisma.property.findUnique({ where: { id } });

// ✅ Good: Handle errors safely
try {
  await dangerousOperation();
} catch (error) {
  console.error("Operation failed");
  return { error: "An error occurred" };
}

// ❌ Bad: Expose error details
try {
  await dangerousOperation();
} catch (error) {
  return { error: error.message }; // May expose sensitive info
}
```

## Known Security Considerations

### Multi-Tenancy

- All data is isolated by `organizationId`
- Always use `prismaForOrg()` helper for tenant-scoped queries
- Never trust client-provided organization IDs
- Verify user membership before allowing organization access

### Rate Limiting

- API endpoints are rate-limited based on user tier
- External API (`/api/v1/*`) has stricter limits
- Rate limit bypass requires platform admin privileges
- Monitor rate limit violations for abuse

### File Storage

- Files are stored in Vercel Blob or AWS S3
- Access is controlled via signed URLs
- File types are validated before upload
- File size limits are enforced

### Real-time Messaging

- Ably channels are organization-scoped
- Message history is limited
- File attachments are scanned for malware
- Users can only access their organization's channels

### Webhooks

- All webhooks use signature verification
- Webhook secrets must be kept secure
- Failed webhook deliveries are logged
- Webhook endpoints have separate rate limits

## Security Features

### Built-in Protections

- ✅ **SQL Injection**: Protected via Prisma ORM
- ✅ **XSS**: React automatically escapes output
- ✅ **CSRF**: Next.js built-in protection
- ✅ **Clickjacking**: X-Frame-Options headers
- ✅ **HTTPS**: Enforced in production
- ✅ **Rate Limiting**: Implemented via Upstash
- ✅ **Input Validation**: Zod schemas throughout
- ✅ **Authentication**: Clerk with session management
- ✅ **Authorization**: Role-based access control

### Security Headers

The following security headers are configured:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Compliance

### Data Protection

- **GDPR Compliance**: User data can be exported and deleted
- **Data Encryption**: Data encrypted at rest and in transit
- **Data Retention**: Configurable retention policies
- **Data Portability**: Export functionality available

### Audit Logging

- Platform admin actions are logged
- Authentication events are tracked
- API access is monitored
- Database changes are auditable

## Security Checklist for Deployment

Before deploying to production, ensure:

- [ ] All environment variables are set correctly
- [ ] Database connection uses SSL/TLS
- [ ] API keys are rotated from development values
- [ ] CORS is configured appropriately
- [ ] Rate limiting is enabled
- [ ] Webhook secrets are configured
- [ ] File upload limits are set
- [ ] Error messages don't expose sensitive data
- [ ] Authentication is required for all protected routes
- [ ] Authorization checks are in place
- [ ] Dependencies are up to date
- [ ] Security audit has been performed
- [ ] Backup and recovery procedures are tested
- [ ] Monitoring and alerting are configured

## Incident Response

In case of a security incident:

1. **Contain**: Immediately isolate affected systems
2. **Assess**: Determine the scope and impact
3. **Notify**: Inform affected users if data was compromised
4. **Remediate**: Fix the vulnerability
5. **Review**: Conduct post-incident review
6. **Improve**: Update security measures

## Contact

For security concerns, please contact:

- **Email**: security@oikion.com
- **PGP Key**: Available upon request

For general support:

- **GitHub Issues**: https://github.com/Oikion/mvp/issues
- **Email**: support@oikion.com

---

Thank you for helping keep Oikion and our users safe! 🔒
