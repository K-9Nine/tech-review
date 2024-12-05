export async function lookupAddress(search) {
    console.log('Starting address lookup request:', {
        search,
        url: `/api/address-lookup?search=${encodeURIComponent(search)}`
    });

    try {
        const response = await fetch(`/api/address-lookup?search=${encodeURIComponent(search)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response received:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        const text = await response.text();
        console.log('Raw response text:', text);

        let data;
        try {
            data = JSON.parse(text);
            console.log('Parsed response data:', data);
        } catch (e) {
            console.error('JSON parse error:', e);
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            throw new Error(`Address lookup failed: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('Address lookup error:', error);
        throw error;
    }
} 