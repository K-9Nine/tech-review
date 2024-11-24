const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');

const app = express();
const port = 3002;

// Create custom HTTPS agent with fixed TLS config
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
});

// Zen API credentials and config
const ZEN_CLIENT_ID = 'ws-api-amvia';
const ZEN_CLIENT_SECRET = 'vpvDuEEpSqd2GkmbkeLTXibNNffvhnGcKT69bkgMoV';
const ZEN_AUTH_URL = 'https://id.zen.co.uk/connect/token';
const ZEN_API_BASE_URL = 'https://gateway.api.indirect.zen.co.uk/self-service/api';

// Create basic auth token
const basicAuth = Buffer.from(`${ZEN_CLIENT_ID}:${ZEN_CLIENT_SECRET}`).toString('base64');

// Token management
let accessToken = null;
let tokenExpiry = null;

// Get or refresh access token
async function getAccessToken() {
    try {
        // Check if we have a valid token
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return accessToken;
        }

        console.log('Requesting new access token...');

        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        // Updated scope to include 'indirect-availability'
        formData.append('scope', 'read-exchange indirect-availability');

        const response = await fetch(ZEN_AUTH_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            agent: httpsAgent
        });

        const responseText = await response.text();
        console.log('Token response:', responseText);

        if (!response.ok) {
            throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (!data.access_token) {
            throw new Error('Invalid token response');
        }

        accessToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;

        console.log('New access token obtained');
        return accessToken;

    } catch (error) {
        console.error('Token error:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        throw error;
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

app.post('/zen/token', async (req, res) => {
    try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('scope', 'read-exchange indirect-availability');

        const response = await fetch(ZEN_AUTH_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            agent: httpsAgent
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Token endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Availability check endpoint
app.post('/zen/availability/check', async (req, res) => {
    try {
        const token = await getAccessToken();
        console.log('Making availability check request with token');

        const response = await fetch(`${ZEN_API_BASE_URL}/availability/check`, {
            method: 'POST',
            body: JSON.stringify(req.body),
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            agent: httpsAgent
        });

        const responseText = await response.text();
        console.log('Raw availability response:', responseText);

        if (!response.ok) {
            console.error('Zen API error response:', responseText);
            res.status(response.status).json({ error: responseText });
            return;
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }

        console.log('Availability response received:', response.status);
        res.json(data);

    } catch (error) {
        console.error('Availability check error:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });

        res.status(500).json({
            error: error.message,
            details: 'Internal server error'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Zen proxy server running on port ${port}`);
    getAccessToken()
        .then(() => console.log('Initial access token obtained successfully'))
        .catch(error => console.error('Failed to obtain initial access token:', error.message));
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
