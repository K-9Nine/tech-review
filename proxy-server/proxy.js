import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.OS_API_KEY) {
  console.error('OS_API_KEY is not set in environment variables');
  process.exit(1);
}

const app = express();

// Enable CORS for all routes
app.use(cors());

// Add body parsing middleware
app.use(express.json());

// Log all incoming requests before any processing
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Raw incoming request: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  next();
});

// Track both polling attempts and initial requests
const pollingAttempts = new Map();
const initialRequests = new Map();

// Debug middleware to log all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  
  if (req.url.includes('/pricing/poll')) {
    const uuid = req.url.split('/').pop();
    const attempts = pollingAttempts.get(uuid) || 0;
    pollingAttempts.set(uuid, attempts + 1);
    
    const initialReq = initialRequests.get(uuid);
    console.log(`[${timestamp}] [${requestId}] Polling attempt ${attempts + 1} for UUID: ${uuid}. Initial request data:`, initialReq);
  } else if (req.url.includes('/pricing') && req.method === 'POST') {
    console.log(`[${timestamp}] [${requestId}] Initial pricing request:`, {
      method: req.method,
      path: req.url,
      headers: req.headers,
      body: req.body
    });
  }
  
  next();
});

// Add detailed request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;

  console.log(`[${timestamp}] [${requestId}] Incoming request:`, {
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept,
      'user-agent': req.headers['user-agent'],
      'origin': req.headers.origin,
      'referer': req.headers.referer
    },
    query: req.query,
    body: req.body
  });

  // Log response
  const oldSend = res.send;
  res.send = function(data) {
    console.log(`[${timestamp}] [${requestId}] Outgoing response:`, {
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      body: data.substring(0, 200) + '...' // Log first 200 chars
    });
    return oldSend.apply(res, arguments);
  };

  next();
});

// Update the address lookup handler
app.get('/api/address-lookup', async (req, res) => {
  const timestamp = new Date().toISOString();
  const search = req.query.search;
  const apiKey = process.env.OS_API_KEY;

  console.log(`[${timestamp}] [${req.requestId}] Processing address lookup:`, {
    search,
    headers: req.headers
  });

  try {
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    const isPostcode = postcodeRegex.test(search);
    
    // Construct parameters according to API docs
    const params = new URLSearchParams({
      key: apiKey,
      dataset: 'DPA,LPI',
      maxresults: '100',
      output_srs: 'EPSG:27700'
    });

    // Add search parameter based on type
    if (isPostcode) {
      params.set('postcode', search);
    } else {
      params.set('query', search);
    }

    const baseUrl = 'https://api.os.uk/search/places/v1';
    const endpoint = isPostcode ? 'postcode' : 'find';
    const url = `${baseUrl}/${endpoint}?${params.toString()}`;

    console.log(`[${timestamp}] Making request to:`, url.replace(apiKey, 'REDACTED'));

    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log(`[${timestamp}] OS API Response Status:`, response.status);

    // Transform the response
    const addresses = response.data.results?.map(result => {
      const address = result.DPA || result.LPI;
      if (!address) return null;

      // Filter out HISTORICAL addresses unless specifically requested
      if (address.STATUS === 'HISTORICAL' && !req.query.includeHistorical) {
        return null;
      }

      return {
        UPRN: address.UPRN,
        ADDRESS: address.ADDRESS.replace(/,\s+/g, ', '), // Clean up spacing in address
        POST_TOWN: address.POST_TOWN || address.TOWN_NAME,
        POSTCODE: address.POSTCODE || address.POSTCODE_LOCATOR,
        COORDINATES: {
          lat: address.Y_COORDINATE,
          lng: address.X_COORDINATE
        },
        STATUS: address.STATUS,
        CLASSIFICATION: address.CLASSIFICATION_CODE_DESCRIPTION,
        TYPE: result.DPA ? 'Postal' : 'Location'
      };
    }).filter(Boolean);

    // Sort addresses by status (APPROVED first) and then by address
    addresses.sort((a, b) => {
      if (a.STATUS === 'APPROVED' && b.STATUS !== 'APPROVED') return -1;
      if (a.STATUS !== 'APPROVED' && b.STATUS === 'APPROVED') return 1;
      return a.ADDRESS.localeCompare(b.ADDRESS);
    });

    res.json({
      results: addresses,
      timestamp: timestamp,
      total: addresses.length,
      metadata: {
        postcode: search,
        searchType: postcodeRegex.test(search) ? 'postcode' : 'address',
        filtered: addresses.length !== response.data.results?.length
      }
    });

  } catch (error) {
    console.error(`[${timestamp}] OS API Error:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    res.status(error.response?.status || 500).json({
      error: 'OS Places API Error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Add this test endpoint
app.get('/api/test-os', async (req, res) => {
  const apiKey = process.env.OS_API_KEY;
  const testUrl = `https://api.os.uk/search/places/v1/postcode?postcode=S3%208JY&key=${apiKey}`;
  
  try {
    const response = await axios.get(testUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    res.json({
      status: 'success',
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      response: error.response?.data,
      config: {
        url: testUrl.replace(apiKey, 'REDACTED'),
        headers: error.config?.headers
      }
    });
  }
});

// Error handling middleware with detailed logging
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${req.requestId}] Server Error:`, {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers
  });

  res.status(500).send({
    error: 'Server Error',
    message: err.message,
    timestamp,
    requestId: req.requestId,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: server.address().port
  });
});

// Near the top of the file, after dotenv.config()
const DEFAULT_PORT = 8081;

// Update the server startup to use DEFAULT_PORT
const startServer = (initialPort) => {
  console.log(`[${new Date().toISOString()}] Attempting to start server on port ${initialPort}...`);
  
  const server = app.listen(initialPort)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[${new Date().toISOString()}] Port ${initialPort} is in use, trying ${initialPort + 1}...`);
        startServer(initialPort + 1);
      } else {
        console.error(`[${new Date().toISOString()}] Server error:`, err);
        process.exit(1); // Exit on critical errors
      }
    })
    .on('listening', () => {
      const address = server.address();
      console.log(`[${new Date().toISOString()}] Proxy server is running at http://localhost:${address.port}`);
      console.log(`[${new Date().toISOString()}] Try: curl http://localhost:${address.port}/health`);
    });

  return server;
};

// Start the server and store the reference
const server = startServer(process.env.PORT || DEFAULT_PORT);

// Handle process termination
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Process terminated`);
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection:`, reason);
}); 