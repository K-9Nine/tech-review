import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import proj4 from 'proj4';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Make sure the OS API key is loaded
const OS_API_KEY = process.env.OS_API_KEY;
if (!OS_API_KEY) {
    console.error('OS_API_KEY is not set in environment variables');
    process.exit(1);
}

// Constants
const API_BASE_URL = 'https://api.itstechnologygroup.com/api/v1';
const AUTH_TOKEN = '532|ze1eYWNeAZ43YNPEOLniYCsv4Rjrs0h1dMyvZKKPb317472d';

// Middleware
app.use(cors());
app.use(express.json());

// Define the coordinate systems
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");

// Add this function to convert BNG (OSGB36) coordinates to WGS84 (lat/long)
function bngToLatLong(easting, northing) {
    const [lng, lat] = proj4("EPSG:27700", "EPSG:4326", [easting, northing]);
    return { lat, lng };
}

// Helper function to poll for results
const pollForResults = async (searchId, maxAttempts = 30) => {
    let allQuotes = [];
    let lastResultsCount = 0;
    
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
        
        // If we have new quotes, add them to our collection
        if (data?.data?.quotes?.length > 0) {
            data.data.quotes.forEach(quote => {
                if (!allQuotes.some(q => q.uuid === quote.uuid)) {
                    allQuotes.push(quote);
                }
            });
        }

        // Log progress
        console.log('Polling status:', {
            attempt: attempt + 1,
            processing_status: data?.meta?.processing_status,
            suppliers_processed: `${data?.meta?.suppliers_processed}/${data?.meta?.suppliers_count}`,
            quotes_received: `${allQuotes.length}/${data?.meta?.results_count}`,
            quotes_this_poll: data?.data?.quotes?.length || 0
        });

        // Only return if:
        // 1. Processing is complete
        // 2. All suppliers have been processed
        // 3. We have all expected quotes OR quotes haven't changed for 2 attempts
        if (data?.meta?.processing_status === 'complete' && 
            data?.meta?.suppliers_count === data?.meta?.suppliers_processed &&
            (allQuotes.length === data?.meta?.results_count || 
             (allQuotes.length > 0 && allQuotes.length === lastResultsCount && attempt > 2))) {
            
            console.log('Processing complete, returning results');
            console.log('Total quotes collected:', allQuotes.length);
            return {
                ...data,
                data: {
                    ...data.data,
                    quotes: allQuotes
                }
            };
        }

        lastResultsCount = allQuotes.length;
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // If we timeout but have some quotes, return what we have
    if (allQuotes.length > 0) {
        console.log('Timeout reached, returning partial results');
        console.log('Total quotes collected:', allQuotes.length);
        return {
            data: {
                quotes: allQuotes
            },
            meta: {
                processing_status: 'timeout',
                results_count: allQuotes.length,
                suppliers_processed: 'unknown'
            }
        };
    }

    throw new Error('Timeout waiting for results');
};

// Create Search endpoint
app.post('/api/its/availability', async (req, res) => {
    try {
        console.log('Received request:', req.body);

        const response = await fetch(`${API_BASE_URL}/availability/search/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        console.log('ITS API response status:', response.status);

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
        console.log('ITS API response data:', data);
        
        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Add this new endpoint for address lookup
app.get('/api/its/availability/search/address', async (req, res) => {
    try {
        const searchTerm = req.query.search;
        console.log('Address search term:', searchTerm);

        const response = await fetch(
            `${API_BASE_URL}/availability/search/address?search=${encodeURIComponent(searchTerm)}`,
            {
                headers: {
                    "Authorization": `Bearer ${AUTH_TOKEN}`,
                    "Accept": "application/json"
                }
            }
        );

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
        res.json(data);

    } catch (error) {
        console.error('Address Search Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Add this endpoint for OS Places API
app.get('/api/address-lookup', async (req, res) => {
    try {
        const searchTerm = req.query.search;
        console.log('Address search term:', searchTerm);

        const response = await fetch(
            `https://api.os.uk/search/places/v1/find?query=${encodeURIComponent(searchTerm)}&maxresults=10&key=${OS_API_KEY}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`OS API returned status ${response.status}`);
        }

        const data = await response.json();
        console.log('Raw OS API response:', data);
        
        // Transform OS API response to match your expected format
        const transformedResults = data.results.map(result => {
            const dpa = result.DPA;
            
            let lat = null;
            let lng = null;
            
            if (dpa.X_COORDINATE && dpa.Y_COORDINATE) {
                const coords = bngToLatLong(
                    parseFloat(dpa.X_COORDINATE),
                    parseFloat(dpa.Y_COORDINATE)
                );
                lat = coords.lat;
                lng = coords.lng;
            }
            
            return {
                UPRN: dpa.UPRN,
                ADDRESS: dpa.ADDRESS,
                POST_TOWN: dpa.POST_TOWN,
                POSTCODE: dpa.POSTCODE,
                LAT: lat,
                LNG: lng
            };
        });

        console.log('Transformed results:', transformedResults);

        res.json({
            data: transformedResults
        });

    } catch (error) {
        console.error('Address Search Error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Endpoint to fetch results using UUID
app.get('/api/its/availability/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        const response = await fetch(
            `${API_BASE_URL}/availability/search/${uuid}`,
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`ITS API returned status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: VERSION,
        timestamp: new Date().toISOString()
    });
});

const VERSION = '1.0.0';

app.listen(port, () => {
    console.log(`ITS Pricing API v${VERSION}`);
    console.log(`Server started at ${new Date().toISOString()}`);
    console.log(`API Proxy running at http://localhost:${port}`);
});
