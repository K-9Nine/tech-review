# Proxy Server Setup Checklist

## 1. Environment Setup
- [ ] Create `.env` file with required variables:
  ```env
  NODE_ENV=development
  TARGET_URL=http://localhost:3000
  ADDRESS_LOOKUP_URL=https://api.os.uk/search/places/v1
  OS_API_KEY=your-key-here
  PORT=8080  # Optional, defaults to 8080
  ```
- [ ] Verify all API keys are valid
- [ ] Check all target URLs are accessible
- [ ] Remove any placeholder/example values

## 2. Package Configuration
- [ ] Verify package.json:
  ```json
  {
    "type": "module",  // Required for ES modules
    "scripts": {
      "start": "node proxy.js",
      "dev": "cross-env NODE_ENV=development node proxy.js"
    }
  }
  ```
- [ ] Install required dependencies:
  ```bash
  npm install express cors http-proxy-middleware dotenv cross-env
  ```
- [ ] Check all file paths in scripts are correct
- [ ] Verify all dependencies are at compatible versions

## 3. Proxy Configuration
- [ ] Verify route mappings in proxy.js:
  ```javascript
  router: {
    '/api/address-lookup': process.env.ADDRESS_LOOKUP_URL
  }
  ```
- [ ] Check URL rewriting rules:
  ```javascript
  pathRewrite: {
    '^/api': ''
  }
  ```
- [ ] Configure CORS settings
- [ ] Set appropriate timeouts (default: 5 minutes)
- [ ] Add error handling for all routes

## 4. Client Configuration
- [ ] Update vite.config.js:
  ```javascript
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      }
    }
  }
  ```
- [ ] Verify client API calls use correct paths
- [ ] Check path aliases are properly configured

## 5. Connection Error Troubleshooting
- [ ] Verify proxy server is running (check correct port)
- [ ] Test target services directly:
  ```bash
  # Test OS API directly
  curl "https://api.os.uk/search/places/v1/search?query=s3%208jy&key=YOUR_API_KEY"
  ```
- [ ] Check for ECONNREFUSED errors:
  1. Verify proxy server port matches vite config
  2. Ensure no firewall blocking
  3. Check if target service is accessible
  4. Verify network connectivity

## 6. Common Issues & Solutions
### ECONNREFUSED Error
```javascript
// Add specific error handling in proxy.js
onError: function (err, req, res) {
  if (err.code === 'ECONNREFUSED') {
    console.error('Connection refused. Check if:');
    console.error('1. Proxy server is running');
    console.error('2. Target URL is correct');
    console.error('3. Port is available');
  }
  // ... rest of error handling
}
```

### Port Conflicts
- [ ] Check if port is in use:
  ```bash
  # Windows
  netstat -ano | findstr :8081
  # Linux/Mac
  lsof -i :8081
  ```
- [ ] Kill process if needed or use different port

## 7. Testing Checklist
1. Start proxy server first:
   ```bash
   npm run dev
   ```
2. Verify server started (check console)
3. Test endpoints with curl before using client:
   ```bash
   curl "http://localhost:8081/api/address-lookup?search=s3%208jy"
   ```
4. Check proxy logs for request/response cycle
5. Verify error handling works

## 8. Logging & Debugging
- [ ] Enable detailed logging:
  ```javascript
  logLevel: 'debug',
  onProxyReq: (proxyReq, req) => {
    console.log('Proxy Request:', {
      url: req.url,
      headers: proxyReq.getHeaders()
    });
  }
  ```
- [ ] Monitor server console for errors
- [ ] Check browser network tab
- [ ] Verify request/response in proxy logs
