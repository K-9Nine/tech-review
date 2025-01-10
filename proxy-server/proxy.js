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

if (!process.env.ITS_AUTH_TOKEN) {
  console.error('ITS_AUTH_TOKEN is not set in environment variables');
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

// Add this function at the top of the file
function bngToLatLong(easting, northing) {
    // Validate inputs
    if (!easting || !northing) {
        console.warn('Invalid coordinates:', { easting, northing });
        return { lat: null, lng: null };
    }

    try {
        // Constants for the OSGB36 to WGS84 transformation
        const a = 6377563.396;  // Semi-major axis
        const b = 6356256.909;  // Semi-minor axis
        const e2 = (a*a - b*b)/(a*a);
        const n = (a-b)/(a+b);
        const n0 = -100000;
        const e0 = 400000;
        const f0 = 0.9996012717;
        const φ0 = 49 * Math.PI/180;  // Origin latitude
        const λ0 = -2 * Math.PI/180;  // Origin longitude

        // Normalize coordinates
        const E = easting - e0;
        const N = northing - n0;

        // Initial value
        let φ = φ0;
        let M = 0;

        do {
            φ = (N - M)/(a * f0) + φ;
            
            M = (1 + n + (5/4)*Math.pow(n,2) + (5/4)*Math.pow(n,3)) * (φ - φ0)
                - (3*n + 3*Math.pow(n,2) + (21/8)*Math.pow(n,3)) * Math.sin(φ - φ0) * Math.cos(φ + φ0)
                + ((15/8)*Math.pow(n,2) + (15/8)*Math.pow(n,3)) * Math.sin(2*(φ - φ0)) * Math.cos(2*(φ + φ0))
                - (35/24)*Math.pow(n,3) * Math.sin(3*(φ - φ0)) * Math.cos(3*(φ + φ0));
        } while (N - M >= 0.00001);  // Accuracy threshold

        const ν = a * f0 * Math.pow(1 - e2 * Math.pow(Math.sin(φ),2), -0.5);
        const ρ = a * f0 * (1 - e2) * Math.pow(1 - e2 * Math.pow(Math.sin(φ),2), -1.5);
        const η2 = ν/ρ - 1;

        const tanφ = Math.tan(φ);
        const tan2φ = Math.pow(tanφ,2);
        const tan4φ = Math.pow(tanφ,4);
        const tan6φ = Math.pow(tanφ,6);

        const secφ = 1/Math.cos(φ);

        const VII = tanφ/(2*ρ*ν);
        const VIII = tanφ/(24*ρ*Math.pow(ν,3))*(5+3*tan2φ+η2-9*tan2φ*η2);
        const IX = tanφ/(720*ρ*Math.pow(ν,5))*(61+90*tan2φ+45*tan4φ);
        const X = secφ/ν;
        const XI = secφ/(6*Math.pow(ν,3))*(ν/ρ+2*tan2φ);
        const XII = secφ/(120*Math.pow(ν,5))*(5+28*tan2φ+24*tan4φ);
        const XIIA = secφ/(5040*Math.pow(ν,7))*(61+662*tan2φ+1320*tan4φ+720*tan6φ);

        const φ1 = φ - VII*Math.pow(E,2) + VIII*Math.pow(E,4) - IX*Math.pow(E,6);
        const λ1 = λ0 + X*E - XI*Math.pow(E,3) + XII*Math.pow(E,5) - XIIA*Math.pow(E,7);

        // Convert to degrees and validate results
        const lat = φ1 * 180/Math.PI;
        const lng = λ1 * 180/Math.PI;

        if (isNaN(lat) || isNaN(lng)) {
            console.warn('Conversion produced invalid coordinates:', { lat, lng });
            return { lat: null, lng: null };
        }

        return { lat, lng };
    } catch (error) {
        console.error('Error converting coordinates:', error);
        return { lat: null, lng: null };
    }
}

// Add the address lookup endpoint
app.get('/api/address-lookup', async (req, res) => {
    try {
        const searchTerm = req.query.search;
        
        // Increase maxresults and add dataset parameter
        const response = await axios.get(
            `https://api.os.uk/search/places/v1/find`, {
                params: {
                    query: searchTerm,
                    maxresults: 100,  // Increased from 20
                    dataset: 'DPA,LPI',  // Include both Delivery Point Address and Local Property Identifier
                    key: process.env.OS_API_KEY
                }
            }
        );

        // Log the raw response for debugging
        console.log('OS Places API response:', {
            total: response.data.results?.length,
            header: response.data.header
        });

        const transformedResults = response.data.results
            .filter(result => result.DPA || result.LPI) // Accept both DPA and LPI results
            .map(result => {
                const address = result.DPA || result.LPI;
                return {
                    UPRN: address.UPRN,
                    ADDRESS: address.ADDRESS,
                    POST_TOWN: address.POST_TOWN || address.TOWN_NAME,
                    POSTCODE: address.POSTCODE,
                    STATUS: address.STATUS || 'APPROVED'
                };
            });

        // Log transformed results
        console.log('Transformed results:', {
            total: transformedResults.length,
            results: transformedResults.slice(0, 2) // Log first 2 for brevity
        });

        res.json({
            results: transformedResults,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Address lookup error:', error);
        res.status(500).json({ error: error.message });
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

// Constants for ITS API
const API_BASE_URL = 'https://api.itstechnologygroup.com/api/v1';

// ITS availability endpoint
app.post('/api/its/availability', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ITS availability request:`, req.body);

    try {
        const response = await axios.post(
            `${API_BASE_URL}/availability/search/create`,
            req.body,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ITS_AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log(`[${timestamp}] ITS API Response:`, {
            status: response.status,
            data: response.data
        });

        res.json(response.data);
    } catch (error) {
        console.error(`[${timestamp}] ITS API Error:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(error.response?.status || 500).json({
            error: 'ITS API Error',
            message: error.message,
            details: error.response?.data
        });
    }
});

// ITS polling endpoint
app.get('/api/its/availability/:uuid', async (req, res) => {
    const timestamp = new Date().toISOString();
    const { uuid } = req.params;
    console.log(`[${timestamp}] ITS availability poll:`, { uuid });

    try {
        const response = await axios.get(
            `${API_BASE_URL}/availability/search/${uuid}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.ITS_AUTH_TOKEN}`,
                    'Accept': 'application/json'
                }
            }
        );

        console.log(`[${timestamp}] ITS Poll Response:`, {
            status: response.status,
            data: response.data
        });

        res.json(response.data);
    } catch (error) {
        console.error(`[${timestamp}] ITS Poll Error:`, {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        res.status(error.response?.status || 500).json({
            error: 'ITS Poll Error',
            message: error.message,
            details: error.response?.data
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