# Setting Up HTTPS for Local Development

This guide explains how to set up HTTPS for local development to resolve Cloudflare CAPTCHA protocol mismatch errors.

## Why HTTPS is Needed

Cloudflare Turnstile CAPTCHA (used by Clerk's bot protection) requires HTTPS. When running on `http://localhost:3000`, you'll encounter protocol mismatch errors because the CAPTCHA frame uses HTTPS while your app uses HTTP.

## Quick Setup (macOS)

### 1. Install mkcert

```bash
brew install mkcert
```

### 2. Install the local CA

```bash
mkcert -install
```

### 3. Generate SSL certificates

Run this command in the project root:

```bash
mkcert localhost 127.0.0.1 ::1
```

This will create two files:
- `localhost.pem` (certificate)
- `localhost-key.pem` (private key)

### 4. Start the development server

```bash
pnpm dev
```

The server will automatically detect the certificates and start on `https://localhost:3000`.

## Alternative: Linux/Windows Setup

### Linux (Ubuntu/Debian)

```bash
# Install mkcert
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/

# Install CA and generate certificates
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

### Windows

1. Download mkcert from: https://github.com/FiloSottile/mkcert/releases
2. Run PowerShell as Administrator:
   ```powershell
   .\mkcert.exe -install
   .\mkcert.exe localhost 127.0.0.1 ::1
   ```

## Fallback to HTTP

If you don't want to use HTTPS, you can:

1. Use the HTTP-only dev script:
   ```bash
   pnpm dev:http
   ```

2. Note: CAPTCHA may not work properly on HTTP. For testing CAPTCHA functionality, HTTPS is required.

## Troubleshooting

### Certificate Not Found

If you see "SSL certificates not found", make sure:
- `localhost.pem` and `localhost-key.pem` exist in the project root
- Files are readable (check permissions)

### Browser Security Warning

Browsers may show a security warning for self-signed certificates. This is normal for local development. Click "Advanced" → "Proceed to localhost" to continue.

### Port Already in Use

If port 3000 is already in use, you can change it in `server.js`:

```javascript
const port = 3001; // or any available port
```

## Notes

- Certificate files (`*.pem`) are already in `.gitignore` and won't be committed
- Certificates are only needed for local development
- Production deployments typically handle HTTPS through reverse proxies (nginx, Vercel, etc.)

