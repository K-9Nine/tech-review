import axios from 'axios';

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

        const response = await axios.post('/connect/token', body, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + ((response.data.expires_in || 3600) * 1000) - 60000;
        return accessToken;
    } catch (error) {
        console.error('OAuth error:', error);
        throw error;
    }
};

export const checkZenAvailability = async (addressReferenceNumber, districtCode) => {
    try {
        const token = await getAccessToken();

        // Exact format from API documentation
        const requestData = {
            phoneNumber: null,  // or "" if null not accepted
            goldAddressKeyAvailabilityRequest: {
                addressReferenceNumber: addressReferenceNumber,
                districtCode: districtCode
            },
            uprn: null  // or "" if null not accepted
        };

        console.log('Attempting availability check with data:', JSON.stringify(requestData, null, 2));

        const response = await axios.post('/zen-api/self-service/api/availability/check',
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        console.log('Success response:', response.data);
        return response.data;
    } catch (error) {
        console.error('API Request Details:', {
            url: '/zen-api/self-service/api/availability/check',
            method: 'POST',
            requestData: JSON.parse(error.config?.data || '{}'),
            response: error.response?.data
        });

        throw error;
    }
};

export const getZenPrices = async (technology, speed) => {
    try {
        const token = await getAccessToken();

        const response = await axios.post('/zen-api/self-service/api/broadband/pricing', {
            technology: technology,
            downloadSpeed: speed.downloadSpeed,
            uploadSpeed: speed.uploadSpeed
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        return response.data.prices?.map(price => ({
            monthlyPrice: price.monthlyPrice,
            oneOffPrice: price.oneOffPrice,
            contractLength: price.contractLength,
            features: price.features || []
        })) || [];
    } catch (error) {
        console.error('Zen pricing error:', error);
        throw error;
    }
};

export const mapProductTypeToUI = (zenTechnology) => {
    const mapping = {
        'FTTC': 'fttc',
        'FTTP': 'fttp',
        'ADSL': 'adsl',
        'ETHERNET': 'ethernet',
        'EFM': 'efm',
        'GFAST': 'gfast'
    };
    return mapping[zenTechnology] || zenTechnology.toLowerCase();
};

export const formatPrice = (price) => {
    if (!price && price !== 0) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
    }).format(price);
};