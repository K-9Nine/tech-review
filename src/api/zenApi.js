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

        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('scope', 'read-exchange indirect-availability');

        const response = await axios.post('http://localhost:3002/zen/token', formData, {
            headers: {
                'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            }
        });

        accessToken = response.data.access_token;
        tokenExpiry = Date.now() + ((response.data.expires_in || 3600) * 1000) - 60000;
        return accessToken;
    } catch (error) {
        console.error('OAuth error:', error);
        throw new Error('Authentication failed: ' + error.message);
    }
};

const parseSpeedString = (speedString) => {
    if (!speedString) return 0;
    return parseInt(speedString.replace('Mbit/s', ''));
};

export const checkAvailability = async (site, addDebugLog = console.log) => {
    try {
        addDebugLog('Starting Zen availability check', { site });
        const token = await getAccessToken();

        const requestBody = {
            phoneNumber: null,
            goldAddressKeyAvailabilityRequest: {
                addressReferenceNumber: site.address.addressReferenceNumber,
                districtCode: site.address.districtCode
            },
            uprn: null
        };

        const response = await axios.post(
            'http://localhost:3002/zen/availability/check',
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        addDebugLog('Raw API response', response.data);

        if (!response.data || !response.data.broadbandGroups) {
            throw new Error('Invalid availability response format');
        }

        const getSpeedsForTechnology = (technology, lineDetails) => {
            const technologyMap = {
                'FTTC': {
                    details: lineDetails.fttc,
                    speedFields: {
                        downloadMin: 'rangeADownstreamBottomSpeedValue',
                        downloadMax: 'rangeADownstreamTopSpeedValue',
                        uploadMin: 'rangeAUpstreamBottomSpeedValue',
                        uploadMax: 'rangeAUpstreamTopSpeedValue'
                    }
                },
                'SOGEA': {
                    details: lineDetails.sogea,
                    speedFields: {
                        downloadMin: 'rangeADownstreamBottomSpeedValue',
                        downloadMax: 'rangeADownstreamTopSpeedValue',
                        uploadMin: 'rangeAUpstreamBottomSpeedValue',
                        uploadMax: 'rangeAUpstreamTopSpeedValue'
                    }
                },
                'FTTP': {
                    details: lineDetails.fttp,
                    speedFields: {
                        downloadMax: 'maxDownstreamSpeedValue',
                        uploadMax: 'maxUpstreamSpeedValue'
                    }
                },
                'GFAST': {
                    details: lineDetails.gfast,
                    speedFields: {
                        downloadMin: 'rangeADownstreamBottomSpeedValue',
                        downloadMax: 'rangeADownstreamTopSpeedValue',
                        uploadMin: 'rangeAUpstreamBottomSpeedValue',
                        uploadMax: 'rangeAUpstreamTopSpeedValue'
                    }
                },
                'ADSL': {
                    details: lineDetails.adsl,
                    speedFields: {
                        downloadMin: 'speedRangeMinValue',
                        downloadMax: 'speedRangeMaxValue'
                    }
                }
            };

            const techConfig = technologyMap[technology];
            if (!techConfig || !techConfig.details) return null;

            const speeds = {
                download: {
                    min: 0,
                    max: 0
                },
                upload: {
                    min: 0,
                    max: 0
                }
            };

            const { details, speedFields } = techConfig;

            // Set download speeds
            if (speedFields.downloadMin) {
                speeds.download.min = details[speedFields.downloadMin] ? details[speedFields.downloadMin] / 1000 : 0;
            }
            if (speedFields.downloadMax) {
                speeds.download.max = details[speedFields.downloadMax] ? details[speedFields.downloadMax] / 1000 : 0;
            }

            // Set upload speeds
            if (speedFields.uploadMin) {
                speeds.upload.min = details[speedFields.uploadMin] ? details[speedFields.uploadMin] / 1000 : 0;
            }
            if (speedFields.uploadMax) {
                speeds.upload.max = details[speedFields.uploadMax] ? details[speedFields.uploadMax] / 1000 : 0;
            }

            // For FTTP, set min to 0 if not provided
            if (technology === 'FTTP') {
                speeds.download.min = 0;
                speeds.upload.min = 0;
            }

            // For ADSL, set upload speeds to standard values if not provided
            if (technology === 'ADSL') {
                speeds.upload.min = 0;
                speeds.upload.max = 1;
            }

            return speeds;
        };

        const parseProductSpeed = (productName) => {
            if (!productName) return { download: 0, upload: 0 };

            const parts = productName.split(' ');
            if (parts.length < 2) return { download: 0, upload: 0 };

            const speeds = parts[1].split('/');
            return {
                download: parseFloat(speeds[0]) || 0,
                upload: parseFloat(speeds[1]) || 0
            };
        };

        return {
            services: response.data.broadbandGroups.map(group => {
                const speeds = getSpeedsForTechnology(group.broadbandType, response.data.lineDetails);

                return {
                    technology: group.broadbandType,
                    speeds,
                    products: group.products.map(product => ({
                        name: product.productName,
                        code: product.productCode,
                        speed: parseProductSpeed(product.name),
                        isOrderable: product.isOrderable,
                        provisionType: product.provisionType,
                        minimumActivationDate: product.minimumActivationDate
                    }))
                };
            }),
            lineDetails: {
                fttc: response.data.lineDetails?.fttc || null,
                sogea: response.data.lineDetails?.sogea || null,
                fttp: response.data.lineDetails?.fttp || null,
                gfast: response.data.lineDetails?.gFast || null,
                adsl: response.data.lineDetails?.adsl2Plus || null
            }
        };
    } catch (error) {
        addDebugLog('Availability check error', error);
        throw new Error('Availability check failed: ' + error.message);
    }
};

export const mapTechnology = (type) => {
    const technologies = {
        0: 'ADSL',
        1: 'FTTC',
        2: 'FTTP',
        3: 'GFAST',
        4: 'SOGEA'
    };
    return technologies[type] || 'Unknown';
};

export const getServiceDetails = (lineDetails, technology) => {
    const serviceMap = {
        'FTTC': lineDetails?.fttc,
        'SOGEA': lineDetails?.sogea,
        'FTTP': lineDetails?.fttp,
        'GFAST': lineDetails?.gfast,
        'ADSL': lineDetails?.adsl2Plus
    };
    return serviceMap[technology] || null;
};

export const formatSpeed = (speed) => {
    if (!speed) return 'N/A';
    return `${speed}Mbps`;
};

export const formatSpeedRange = (speeds) => {
    if (!speeds) return 'N/A';
    return `${speeds.min}-${speeds.max}Mbps`;
};

export const parseLineDetails = (serviceDetails) => {
    if (!serviceDetails) return null;

    return {
        status: serviceDetails.rag,
        statusDescription: serviceDetails.ragDescription,
        downloadSpeed: {
            min: parseSpeedString(serviceDetails.rangeADownstreamBottomSpeed),
            max: parseSpeedString(serviceDetails.rangeADownstreamTopSpeed)
        },
        uploadSpeed: {
            min: parseSpeedString(serviceDetails.rangeAUpstreamBottomSpeed),
            max: parseSpeedString(serviceDetails.rangeAUpstreamTopSpeed)
        },
        readyDate: serviceDetails.readyDate,
        exchange: {
            name: serviceDetails.exchangeName || serviceDetails.mdfSiteName,
            code: serviceDetails.exchangeCode || serviceDetails.mdfSiteId
        }
    };
};