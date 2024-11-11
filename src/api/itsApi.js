export const checkITSAvailability = async (postcode, buildingNumber) => {
    try {
        // Mock response for now - replace with actual ITS API endpoint
        const response = await fetch('https://api.its.co.uk/availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ITS_API_KEY'
            },
            body: JSON.stringify({
                postcode,
                buildingNumber
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking ITS availability:', error);
        throw error;
    }
};

export const getITSPrices = async (technology, speed) => {
    try {
        const response = await fetch(`/api/its-prices?technology=${technology}&speed=${speed}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching ITS prices:', error);
        throw error;
    }
};

// Check for better ITS options
export const checkITSOptimization = async (currentServices) => {
    try {
        const response = await fetch('https://api.its.co.uk/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_ITS_API_KEY'
            },
            body: JSON.stringify(currentServices)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking ITS optimizations:', error);
        throw error;
    }
};