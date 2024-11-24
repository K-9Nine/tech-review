const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = 5000; // Proxy server port

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); // Allow requests from the frontend
app.use(express.json()); // Parse JSON bodies

// Proxy route for ITS API
app.post('/proxy/availability', async (req, res) => {
    console.log('==== Incoming Request ====');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        console.log('Forwarding request to external API...');

        const response = await axios.post(
            'https://api.itstechnologygroup.com/api/v1/availability/search/create',
            req.body,
            {
                headers: {
                    'Authorization': '528|uAibHnZo7mvcP2HXkqt0IfTqRaNXIpd3YnYzb6gw2ed12aac',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );

        console.log('==== External API Response ====');
        console.log('Status Code:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

        // Send the API response back to the client
        res.json(response.data);
    } catch (error) {
        console.error('==== Error Occurred ====');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('No response received from external API.');
        }

        // Send error details to the client
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data || 'Unknown error',
        });
    }
});

// Test route to verify server is running
app.get('/test', (req, res) => {
    console.log('==== Test Route Accessed ====');
    res.send('Proxy server is working!');
});

// Start the proxy server
app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});

