export const checkZenAvailability = async (postcode, buildingNumber) => {
    try {
        // Mock response for now - replace with actual Zen API endpoint
        const response = await fetch('https://api.zen.co.uk/availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ZEN_API_KEY'
            },
            body: JSON.stringify({
                postcode,
                buildingNumber
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking Zen availability:', error);
        throw error;
    }
};

// Get prices from your database based on technology
export const getZenPrices = async (technology, speed) => {
    try {
        const response = await fetch(`/api/zen-prices?technology=${technology}&speed=${speed}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Zen prices:', error);
        throw error;
    }
};