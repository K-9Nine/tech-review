import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import NodeGeocoder from 'node-geocoder';

const app = express();
const port = process.env.PORT || 3001;

// Constants
const API_BASE_URL = 'https://api.itstechnologygroup.com/api/v1';
const AUTH_TOKEN = '532|ze1eYWNeAZ43YNPEOLniYCsv4Rjrs0h1dMyvZKKPb317472d';

// Middleware
app.use(cors());
app.use(express.json());

// Setup geocoder
const geocoder = NodeGeocoder({
    provider: 'openstreetmap',
    formatter: null
});

// Helper function to wait for results
const pollForResults = async (searchId, maxAttempts = 10, delayMs = 2000) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const url = new URL(
            `${API_BASE_URL}/availability/search/results/${searchId}`
        );

        const headers = {
            "Authorization": `Bearer ${AUTH_TOKEN}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        const response = await fetch(url, {
            method: "GET",
            headers,
        });

        const data = await response.json();

        // If processing is complete or we have results, return them
        if (data.meta.processing_status === 'complete' || 
            (data.data.quotes && data.data.quotes.length > 0)) {
            return data;
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // If we get here, we've run out of attempts
    throw new Error('Timeout waiting for results');
};

// Create Search endpoint
app.post('/api/its/availability', async (req, res) => {
    try {
        console.log('Received request body:', req.body);  // Debug log

        // Create the search payload
        const searchPayload = {
            postcode: req.body.postcode,
            address_line_1: req.body.address_line_1,
            town: req.body.town,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            term_months: [36, 60],
            its_only: false,
            connections: [{
                bearer: parseInt(req.body.connections[0].speed, 10),
                speed: parseInt(req.body.connections[0].speed, 10)
            }]
        };

        // Validate all required fields exist
        const requiredFields = ['postcode', 'address_line_1', 'town', 'latitude', 'longitude'];
        const missingFields = requiredFields.filter(field => !searchPayload[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields,
                receivedPayload: searchPayload
            });
        }

        console.log('Sending search payload:', searchPayload);  // Debug log

        const response = await fetch(`${API_BASE_URL}/availability/search/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(searchPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('API Error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: 'Server error',
            message: error.message 
        });
    }
});

// Get Search Results endpoint
app.get('/api/its/results/:searchId', async (req, res) => {
    try {
        const { searchId } = req.params;
        
        // Poll for results instead of single request
        const data = await pollForResults(searchId);

        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            message: "An unexpected error occurred",
            error: error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`API Proxy running at http://localhost:${port}`);
});
