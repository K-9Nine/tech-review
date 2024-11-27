import { NextApiRequest, NextApiResponse } from 'next';

const API_KEYS = {
    'api.ideal-postcodes.co.uk': process.env.IDEAL_POSTCODES_API_KEY,
    'api.itstechnologygroup.com': process.env.ITS_API_KEY
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const targetUrl = req.headers['x-target-url'] as string;
        if (!targetUrl) {
            return res.status(400).json({ error: 'Missing target URL' });
        }

        const url = new URL(targetUrl);
        const apiKey = API_KEYS[url.hostname];
        
        if (!apiKey) {
            return res.status(400).json({ error: 'Invalid target host' });
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        // Add appropriate authorization header based on the API
        if (url.hostname === 'api.ideal-postcodes.co.uk') {
            headers['Authorization'] = `IDEALPOSTCODES api_key="${apiKey}"`;
        } else if (url.hostname === 'api.itstechnologygroup.com') {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(url.toString(), {
            method: req.method,
            headers,
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy request failed' });
    }
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb'
        }
    }
}; 