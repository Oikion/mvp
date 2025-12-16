const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = Number.parseInt(process.env.PORT || '3000', 10);

// Try to load SSL certificates for HTTPS
let httpsOptions = null;
const certPath = path.join(__dirname, 'localhost.pem');
const keyPath = path.join(__dirname, 'localhost-key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log('✓ SSL certificates found. Starting HTTPS server...');
} else {
  console.warn('⚠ SSL certificates not found. Using HTTP (CAPTCHA may not work).');
  console.warn('  To enable HTTPS:');
  console.warn('  1. Install mkcert: brew install mkcert (macOS)');
  console.warn('  2. Run: mkcert -install');
  console.warn('  3. Run: mkcert localhost app.localhost 127.0.0.1 ::1');
  console.warn('     (includes app.localhost for local app subdomain testing)');
  console.warn('  4. Move the generated files to project root:');
  console.warn('     mv localhost+3.pem localhost.pem && mv localhost+3-key.pem localhost-key.pem');
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  if (httpsOptions) {
    // HTTPS server
    createServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on https://${hostname}:${port}`);
    });
  } else {
    // Fallback to HTTP if certificates not found
    const http = require('http');
    http.createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('⚠ Running on HTTP - CAPTCHA may not work properly');
    });
  }
});

