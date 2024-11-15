// src/api/zenApi.js
import axios from 'axios';

class ZenApiService {
    constructor(authConfig) {
        this.authConfig = authConfig;
        this.token = null;
        this.tokenExpiry = null;
        this.isRefreshing = false;
        this.failedQueue = [];

        this.axiosInstance = axios.create({
            baseURL: '',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Process failed queue
        const processQueue = (error, token = null) => {
            this.failedQueue.forEach(prom => {
                if (error) {
                    prom.reject(error);
                } else {
                    prom.resolve(token);
                }
            });
            this.failedQueue = [];
        };

        // Add request interceptor
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                if (config.url !== '/connect/token') {
                    const token = await this.getValidToken();
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        try {
                            const token = await new Promise((resolve, reject) => {
                                this.failedQueue.push({ resolve, reject });
                            });
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return this.axiosInstance(originalRequest);
                        } catch (err) {
                            return Promise.reject(err);
                        }
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        // Reset token and get a new one
                        this.token = null;
                        this.tokenExpiry = null;
                        const token = await this.getValidToken();

                        processQueue(null, token);
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return this.axiosInstance(originalRequest);
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    async getValidToken() {
        try {
            // If we have a valid token, return it
            if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
                return this.token;
            }

            const credentials = btoa(`${this.authConfig.clientId}:${this.authConfig.clientSecret}`);

            const response = await axios({
                method: 'post',
                url: '/connect/token',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache',
                    'Accept': 'application/json'
                },
                data: `grant_type=client_credentials&scope=${this.authConfig.scope}`
            });

            if (!response.data.access_token) {
                throw new Error('No access token in response');
            }

            this.token = response.data.access_token;
            this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));

            return this.token;
        } catch (error) {
            console.error('Token request failed:', error);
            throw error;
        }
    }

    async checkAvailability(postcode, building) {
        try {
            this.validateAddress({ postcode, premises: building });

            const response = await this.axiosInstance.post(
                '/self-service/api/availability/check',
                {
                    postcode,
                    premises: building
                }
            );

            if (!response.data.products) {
                return { technologies: [] };
            }

            const productsWithPrices = await Promise.all(
                response.data.products.map(async (product) => {
                    const prices = await this.getPricing(product.technology, {
                        downloadSpeed: product.downloadSpeed,
                        uploadSpeed: product.uploadSpeed
                    });
                    return { ...product, prices };
                })
            );

            return {
                technologies: productsWithPrices.map(product => ({
                    type: this.mapProductTypeToUI(product.technology),
                    speed: `${product.downloadSpeed}/${product.uploadSpeed}Mbps`,
                    technology: product.technology,
                    downloadSpeed: product.downloadSpeed,
                    uploadSpeed: product.uploadSpeed,
                    prices: product.prices || []
                }))
            };
        } catch (error) {
            console.error('Availability check failed:', error);
            throw error;
        }
    }

    async getPricing(technology, speed) {
        try {
            const response = await this.axiosInstance.post(
                '/self-service/api/broadband/pricing',
                {
                    technology,
                    downloadSpeed: speed.downloadSpeed,
                    uploadSpeed: speed.uploadSpeed
                }
            );

            return response.data.prices?.map(price => ({
                monthlyPrice: price.monthlyPrice,
                oneOffPrice: price.oneOffPrice,
                contractLength: price.contractLength,
                features: price.features || []
            })) || [];
        } catch (error) {
            console.error('Pricing request failed:', error);
            throw error;
        }
    }

    validateAddress(address) {
        const required = ['postcode', 'premises'];
        const missing = required.filter(field => !address[field]);
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        return true;
    }

    mapProductTypeToUI(zenTechnology) {
        const mapping = {
            'FTTC': 'fttc',
            'FTTP': 'fttp',
            'ADSL': 'adsl',
            'ETHERNET': 'ethernet',
            'EFM': 'efm',
            'GFAST': 'gfast'
        };
        return mapping[zenTechnology] || zenTechnology.toLowerCase();
    }

    mapUITypeToZen(uiType) {
        const mapping = {
            'fttc': 'FTTC',
            'fttp': 'FTTP',
            'adsl': 'ADSL',
            'ethernet': 'ETHERNET',
            'efm': 'EFM',
            'gfast': 'GFAST'
        };
        return mapping[uiType] || uiType.toUpperCase();
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(price);
    }

    static getContractEndDate(startDate, contractLength) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + contractLength);
        return date;
    }
}

// Create single instance
const zenApi = new ZenApiService({
    clientId: 'ws-api-amvia',
    clientSecret: 'vpvDuEEpSqd2GkmbkeLTXibNNffvhnGcKT69bkgMoV',
    scope: 'read-exchange'
});

// Export functions using the instance
const checkZenAvailability = (postcode, building) => zenApi.checkAvailability(postcode, building);
const getZenPrices = (technology, speed) => zenApi.getPricing(technology, speed);
const formatPrice = ZenApiService.formatPrice;
const validateAddress = (address) => zenApi.validateAddress(address);
const getContractEndDate = ZenApiService.getContractEndDate;
const mapProductTypeToUI = (type) => zenApi.mapProductTypeToUI(type);
const mapUITypeToZen = (type) => zenApi.mapUITypeToZen(type);

export {
    zenApi,
    checkZenAvailability,
    getZenPrices,
    formatPrice,
    validateAddress,
    getContractEndDate,
    mapProductTypeToUI,
    mapUITypeToZen
};

export default ZenApiService;