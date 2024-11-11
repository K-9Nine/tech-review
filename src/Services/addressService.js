import { config } from '../config';

export const lookupPostcode = async (postcode) => {
    try {
        const response = await fetch(`${config.apiBaseUrl}/find/${postcode}`, {
            headers: {
                'api-key': config.addressApiKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to lookup address');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error('Address lookup failed');
    }
};