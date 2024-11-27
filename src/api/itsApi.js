// itsApiService.js
import axios from 'axios';

class ITSApiService {
    constructor() {
        this.client = axios.create({
            baseURL: '/api/its', // Using our proxy endpoint
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    async checkAvailability(site, connection) {
        try {
            // Construct the request payload
            const payload = {
                address: {
                    postcode: site.address.postcode,
                    address_line_1: site.address.address_line_1,
                    town: site.address.town,
                    latitude: site.address.latitude,
                    longitude: site.address.longitude,
                    uprn: site.address.uprn
                },
                connections: [{
                    bearer: parseInt(connection.speed) * 10, // Bearer is 10x speed
                    speed: parseInt(connection.speed)
                }],
                term_months: [36, 60],
                its_only: false
            };

            // Make the request to our proxy endpoint
            const response = await this.client.post('/availability', payload);

            if (!response.data) {
                throw new Error('No data received from availability check');
            }

            // Process the response
            return {
                termPrices: this.extractTermPrices(response.data),
                installCosts: this.extractInstallCosts(response.data),
                productName: this.extractProductName(response.data),
                supplier: 'ITS Technology Group',
                quotes: response.data.quotes || []
            };

        } catch (error) {
            // Enhanced error handling
            const errorMessage = this.handleError(error);
            throw new Error(`Availability check failed: ${errorMessage}`);
        }
    }

    extractTermPrices(response) {
        if (!response.data?.quotes) return {};

        return response.data.quotes.reduce((acc, quote) => {
            if (quote.monthly_cost && quote.term_months) {
                acc[quote.term_months] = quote.monthly_cost;
            }
            return acc;
        }, {});
    }

    extractInstallCosts(response) {
        if (!response.data?.quotes) return {};

        return response.data.quotes.reduce((acc, quote) => {
            if (quote.install_cost && quote.term_months) {
                acc[quote.term_months] = quote.install_cost;
            }
            return acc;
        }, {});
    }

    extractProductName(response) {
        if (!response.data?.quotes?.[0]) return '';
        return response.data.quotes[0].product_name || '';
    }

    handleError(error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;
            return data.error || data.message || `Server error: ${error.response.status}`;
        } else if (error.request) {
            // The request was made but no response was received
            return 'No response received from server';
        } else {
            // Something happened in setting up the request that triggered an Error
            return error.message || 'An unexpected error occurred';
        }
    }
}

export const itsApiService = new ITSApiService();