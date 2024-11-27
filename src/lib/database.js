// Add your database configuration here
export const db = {
  // your database config
} 

export async function searchAddresses(searchText) {
    try {
        const params = new URLSearchParams({
            query: searchText,
            key: import.meta.env.VITE_OS_PLACES_API_KEY,
            maxresults: '10',
            dataset: 'DPA',
            output_srs: 'WGS84'
        });

        const response = await fetch(
            `https://api.os.uk/search/places/v1/find?${params}`
        );

        if (!response.ok) {
            throw new Error(`OS Places API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results.map(result => ({
                uprn: result.DPA.UPRN,
                address: result.DPA.ADDRESS,
                postTown: result.DPA.POST_TOWN,
                postcode: result.DPA.POSTCODE,
                position: {
                    lat: result.DPA.LAT,
                    lon: result.DPA.LNG
                }
            }));
        }
        
        return [];
    } catch (error) {
        console.error('OS Places API error:', error);
        return [];
    }
} 