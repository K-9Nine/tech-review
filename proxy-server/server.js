const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3001;

// Request logging middleware
const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
};

// Middleware
app.use(requestLogger);
app.use(cors());
app.use(express.json());

// Your API key
const ITS_API_KEY = '528|uAibHnZo7mvcP2HXkqt0IfTqRaNXIpd3YnYzb6gw2ed12aac';

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'ITS API Proxy Server',
        status: 'running',
        time: new Date().toISOString()
    });
});

// ITS API proxy route for search creation
app.post('/api/its/availability', async (req, res) => {
    try {
        console.log('Creating search with body:', JSON.stringify(req.body, null, 2));

        const response = await axios.post(
            'https://api.itstechnologygroup.com/api/v1/availability/search/create',
            req.body,
            {
                headers: {
                    'Authorization': `Bearer ${ITS_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('Search creation response:', JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        console.error('Search creation error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || 'Internal server error'
        });
    }
});

// ITS API proxy route for getting results
app.get('/api/its/results/:searchId', async (req, res) => {
    try {
        const searchId = req.params.searchId;
        console.log(`Fetching results for search ID: ${searchId}`);

        // Log all request headers for debugging
        console.log('Request headers:', req.headers);

        const response = await axios.get(
            `https://api.itstechnologygroup.com/api/v1/availability/search/results/${searchId}`,
            {
                headers: {
                    'Authorization': `Bearer ${ITS_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                validateStatus: function (status) {
                    return status < 500; // Don't reject if status is less than 500
                }
            }
        );

        console.log('Results response status:', response.status);
        console.log('Results response headers:', response.headers);
        console.log('Results response data:', JSON.stringify(response.data, null, 2));

        // Check if the response includes quotes
        if (response.data?.data?.quotes) {
            res.json(response.data);
        } else if (response.status === 404 || response.status === 202) {
            res.status(202).json({
                status: 'processing',
                message: 'Results are still being processed'
            });
        } else {
            res.status(response.status).json(response.data);
        }
    } catch (error) {
        console.error('Results fetch error:', {
            message: error.message,
            response: {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            },
            stack: error.stack
        });

        // Send a more descriptive error response
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: {
                status: error.response?.status,
                data: error.response?.data,
                message: 'Failed to fetch results'
            }
        });
    }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`ITS API Proxy running at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log(`  GET  http://localhost:${port}/`);
    console.log(`  POST http://localhost:${port}/api/its/availability`);
    console.log(`  GET  http://localhost:${port}/api/its/results/:searchId`);
});

// Error handling
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', error);
    }
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
