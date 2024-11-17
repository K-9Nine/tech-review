const CLIENT_ID = 'ws-api-amvia';
const CLIENT_SECRET = 'vpvDuEEpSqd2GkmbkeLTXibNNffvhnGcKT69bkgMoV';

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
    try {
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return accessToken;
        }

        const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
        const body = 'grant_type=client_credentials&scope=read-exchange indirect-availability';

        const response = await fetch('/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Failed to obtain access token: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;
        return accessToken;
    } catch (error) {
        console.error('OAuth error:', error);
        throw error;
    }
};

// New function for address search
export const searchAddresses = async (postcode) => {
    try {
        const token = await getAccessToken();

        const response = await fetch(`/self-service/api/address/search?postcode=${encodeURIComponent(postcode)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to search addresses: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();
        return data.addresses || [];
    } catch (error) {
        console.error('Address search error:', error);
        throw error;
    }
};

// New function for address matching
export const matchAddress = async (addressDetails) => {
    try {
        const token = await getAccessToken();

        const response = await fetch('/self-service/api/address/match', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                buildingNumber: addressDetails.building,
                thoroughfareName: addressDetails.street,
                postTown: addressDetails.city,
                postcode: addressDetails.postcode
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to match address: ${response.statusText}. ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Address match error:', error);
        throw error;
    }
};

export const checkZenAvailability = async (postcode, building) => {
    try {
        const token = await getAccessToken();

        // First, try to match the address
        const addressMatch = await matchAddress({
            building: building,
            postcode: postcode
        });

        const addressResponse = await fetch('/self-service/api/availability/check', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                addressReference: {
                    goldKey: addressMatch.goldKey,
                    districtCode: addressMatch.districtCode
                }
            })
        });

        if (!addressResponse.ok) {
            const errorText = await addressResponse.text();
            throw new Error(`Failed to validate address: ${addressResponse.statusText}. ${errorText}`);
        }

        const addressData = await addressResponse.json();

        const productsWithPrices = await Promise.all(
            addressData.products?.map(async (product) => {
                const prices = await getZenPrices(product.technology, {
                    downloadSpeed: product.downloadSpeed,
                    uploadSpeed: product.uploadSpeed
                });
                return {
                    ...product,
                    prices
                };
            }) || []
        );

        return {
            technologies: productsWithPrices.map(product => ({
                type: mapProductTypeToUI(product.technology),
                speed: `${product.downloadSpeed}/${product.uploadSpeed}Mbps`,
                technology: product.technology,
                downloadSpeed: product.downloadSpeed,
                uploadSpeed: product.uploadSpeed,
                prices: product.prices
            })) || []
        };
    } catch (error) {
        console.error('Zen availability check error:', error);
        throw error;
    }
};

// Rest of your existing code remains the same
export const getZenPrices = async (technology, speed) => {
    // ... existing implementation
};

export const mapProductTypeToUI = (zenTechnology) => {
    // ... existing implementation
};

export const mapUITypeToZen = (uiType) => {
    // ... existing implementation
};

export const formatPrice = (price) => {
    // ... existing implementation
};

export const validateAddress = (address) => {
    // ... existing implementation
};

export const getContractEndDate = (startDate, contractLength) => {
    // ... existing implementation
};