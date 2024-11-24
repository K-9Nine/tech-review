const BASE_URL = 'https://api.itstechnologygroup.com/api/v1';
const AUTH_HEADER = {
    Authorization: '528|uAibHnZo7mvcP2HXkqt0IfTqRaNXIpd3YnYzb6gw2ed12aac', // Replace with your real access key
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

// Create availability search and get UUID
export const createAvailabilitySearch = async (payload) => {
    const response = await fetch(`${BASE_URL}/availability/search/create`, {
        method: 'POST',
        headers: AUTH_HEADER,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create availability search: ${errorText}`);
    }

    return response.json();
};

// Fetch quotes using UUID
export const getQuotesByUUID = async (uuid) => {
    const response = await fetch(`${BASE_URL}/availability/search/results/${uuid}`, {
        method: 'GET',
        headers: AUTH_HEADER,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch quotes: ${errorText}`);
    }

    return response.json();
};

// Check ITS pricing (integrates createAvailabilitySearch and getQuotesByUUID)
export const checkITSPricing = async (site) => {
    try {
        const payload = {
            postcode: site.address.postcode,
            address_line_1: site.address.building,
            address_line_2: site.address.street,
            town: site.address.city,
            county: site.address.county,
            latitude: site.address.latitude,
            longitude: site.address.longitude,
            connections: [{ bearer: 1000, speed: 1000 }], // Example connection data
            term_months: [12],
            its_only: false,
        };

        // Step 1: Create availability search
        const { uuid } = await createAvailabilitySearch(payload);

        // Step 2: Fetch quotes using UUID
        const quotes = await getQuotesByUUID(uuid);

        // Return the fetched quotes
        return quotes;
    } catch (error) {
        console.error('Error checking ITS pricing:', error);
        throw error;
    }
};