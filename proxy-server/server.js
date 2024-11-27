import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3001;

// Constants
const API_BASE_URL = 'https://api.itstechnologygroup.com/api/v1';
const AUTH_TOKEN = '532|ze1eYWNeAZ43YNPEOLniYCsv4Rjrs0h1dMyvZKKPb317472d';

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to poll for results
const pollForResults = async (searchId, maxAttempts = 15) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(
            `${API_BASE_URL}/availability/search/results/${searchId}`,
            {
                headers: {
                    "Authorization": `Bearer ${AUTH_TOKEN}`,
                    "Accept": "application/json"
                }
            }
        );

        const data = await response.json();

        if (data?.data?.quotes?.length > 0) {
            return data;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout waiting for results');
};

// Create Search endpoint
app.post('/api/its/availability', async (req, res) => {
    try {
        console.log('Received request:', req.body);

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

        const response = await fetch(`${API_BASE_URL}/availability/search/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(searchPayload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('ITS API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: text
            });
            throw new Error(`ITS API returned status ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log('ITS API Response:', data);

        if (!data?.data?.uuid) {
            throw new Error('No search ID returned from API');
        }

        const results = await pollForResults(data.data.uuid);
        res.json(results);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

app.listen(port, () => {
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`API Proxy running at http://localhost:${port}`);
});
