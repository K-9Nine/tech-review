import React, { useState } from 'react';
import { Trash2, Wifi, AlertCircle, MapPin, Plus, Signal, Loader2, TrendingDown } from 'lucide-react';
import ZenAddressLookup from '../components/ZenAddressLookup';
import { checkAvailability, mapTechnology } from '../../../api/zenApi';
import { initialPrices } from '../../../admin/components/PriceManagement';

// Constants
const SPEED_TIERS = {
    ULTRA_FAST: 1000,
    SUPER_FAST: 330,
    FAST: 100
};

const connectionTypes = [
    "FTTP",
    "FTTC",
    "ADSL",
    "G.Fast"
];

const speedOptions = {
    "FTTP": ["80/20", "115/20", "160/30", "220/30", "330/50", "550/75", "1000/115"],
    "FTTC": ["40/10", "55/10", "80/20"],
    "ADSL": ["24/1"],
    "G.Fast": ["160/30", "220/30", "330/50"]
};

const initialConnectionState = {
    type: '',
    speed: '',
    proposedCost: '',
    term: '12',
    isBackup: false
};

const serviceTypes = ["ADSL", "FTTC", "FTTP", "SOGEA"];

const BroadbandForm = ({ formData, setFormData }) => {
    // State declarations remain the same as before...
    const [loadingIndex, setLoadingIndex] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [loadingConnections, setLoadingConnections] = useState({});
    const [availabilityResults, setAvailabilityResults] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);

    // Debugging helper
    const addDebugLog = (message, data = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            message,
            data: data ? JSON.stringify(data, null, 2) : null
        };
        console.log(`[${timestamp}] ${message}`, data);
        setDebugLogs(prev => [logEntry, ...prev]);
    };

    // Helper functions
    const getSpeedTierBadge = (speed) => {
        const downloadSpeed = parseInt(speed.split('/')[0]);
        if (downloadSpeed >= SPEED_TIERS.ULTRA_FAST) {
            return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Ultra-Fast</span>;
        } else if (downloadSpeed >= SPEED_TIERS.SUPER_FAST) {
            return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Super-Fast</span>;
        } else if (downloadSpeed >= SPEED_TIERS.FAST) {
            return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Fast</span>;
        }
        return null;
    };

    const formatActivationDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    // Cost savings renderer
    const renderCostSavings = (connection, currentPrice) => {
        if (!connection.proposedCost || !currentPrice) return null;

        const recommendedPrice = parseFloat(connection.proposedCost);
        const currentCost = parseFloat(currentPrice);
        const savings = currentCost - recommendedPrice;
        const savingsPercentage = currentCost > 0 ? ((savings / currentCost) * 100).toFixed(1) : 0;

        if (savings <= 0) return null;

        return (
            <div className="mt-4 p-4 bg-blue-50 rounded-md space-y-4">
                <h4 className="font-medium flex items-center gap-2 text-blue-700">
                    <TrendingDown className="h-4 w-4" />
                    Potential Cost Savings
                </h4>

                <div className="grid gap-2">
                    <div className="flex justify-between">
                        <span className="text-sm">Current Monthly Cost:</span>
                        <span className="font-medium">£{currentCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm">Proposed Monthly Cost:</span>
                        <span className="font-medium">£{recommendedPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 font-medium pt-2 border-t border-blue-100">
                        <span>Monthly Savings:</span>
                        <span>£{savings.toFixed(2)} ({savingsPercentage}%)</span>
                    </div>
                </div>

                {connection.installFee > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                        <span>One-time installation fee: £{connection.installFee.toFixed(2)}</span>
                    </div>
                )}
            </div>
        );
    };

    const handleTermSelect = (serviceId, term) => {
        setFormData(prev => ({
            ...prev,
            services: prev.services.map(service =>
                service.id === serviceId
                    ? { ...service, term }
                    : service
            )
        }));
    };

    // Core functions
    const checkZenAvailability = async (site) => {
        try {
            addDebugLog('Starting Zen availability check', { site });

            if (!site.address?.addressReferenceNumber || !site.address?.districtCode) {
                throw new Error('Invalid address reference data');
            }

            const requestBody = {
                phoneNumber: null,
                goldAddressKeyAvailabilityRequest: {
                    addressReferenceNumber: site.address.addressReferenceNumber,
                    districtCode: site.address.districtCode
                },
                uprn: null
            };

            addDebugLog('Making Zen API availability request', requestBody);

            const response = await fetch('http://localhost:3002/zen/availability/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const availabilityData = await response.json();

            if (!response.ok) {
                addDebugLog('Zen API request failed', availabilityData);
                throw new Error(availabilityData.error || `Request failed: ${response.status}`);
            }

            addDebugLog('Received availability data', availabilityData);
            return availabilityData;

        } catch (error) {
            addDebugLog('Error in checkZenAvailability', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    };

    const handleCheckAvailability = async (siteIndex) => {
        setLoadingIndex(siteIndex);
        setApiError(null);
        addDebugLog('Starting availability check for site', { siteIndex });

        addDebugLog('Available prices', initialPrices);

        try {
            const site = formData.sites[siteIndex];
            if (!site.address?.addressReferenceNumber) {
                throw new Error('Please select a valid address first');
            }

            setLoadingConnections(prev => ({...prev, [siteIndex]: true}));

            addDebugLog('Checking availability for site', { site });
            const data = await checkAvailability(site, addDebugLog);
            addDebugLog('Received data from checkAvailability', data);

            if (data.services?.length) {
                addDebugLog('Processing services', data.services);
                const updatedSites = [...formData.sites];
                updatedSites[siteIndex].connections = data.services.map(service => {
                    const availableProducts = service.products || [];
                    const maxDownloadSpeed = service.speeds?.download?.max;

                    const bestProduct = availableProducts.reduce((best, current) => {
                        const currentSpeed = parseInt(current.name.split(' ')[1].split('/')[0]);
                        const bestSpeed = best ? parseInt(best.name.split(' ')[1].split('/')[0]) : 0;

                        if (!best) return current;
                        if (currentSpeed <= maxDownloadSpeed && currentSpeed > bestSpeed) {
                            return current;
                        }
                        return best;
                    }, null);

                    const productSpeedMatch = bestProduct?.name.match(/(\d+)\/(\d+)/);
                    const speedString = productSpeedMatch ? productSpeedMatch[0] : '0/0';

                    const matchingPrice = initialPrices.find(price => {
                        if (!bestProduct?.code) return false;

                        const speedFromProduct = bestProduct.name.split(' ')[1];
                        const isSogea = service.technology.toLowerCase() === 'sogea';

                        if (isSogea) {
                            const speedMatches =
                                price.serviceType.toLowerCase().includes(speedFromProduct.toLowerCase()) ||
                                price.serviceType.toLowerCase().startsWith(speedFromProduct.toLowerCase());

                            addDebugLog('SOGEA price matching attempt', {
                                priceServiceType: price.serviceType,
                                speedFromProduct,
                                productCode: bestProduct.code,
                                isSogea,
                                speedMatches,
                                wouldMatch: isSogea && speedMatches
                            });

                            return isSogea && speedMatches;
                        } else {
                            const serviceTypeMatches = price.serviceType.toLowerCase().includes(service.technology.toLowerCase());
                            const speedMatches = price.serviceType.toLowerCase().startsWith(speedFromProduct.toLowerCase());

                            addDebugLog('Standard price matching attempt', {
                                priceServiceType: price.serviceType,
                                technology: service.technology,
                                speedFromProduct,
                                serviceTypeMatches,
                                speedMatches,
                                wouldMatch: serviceTypeMatches && speedMatches
                            });

                            return serviceTypeMatches && speedMatches;
                        }
                    });

                    addDebugLog('Price match result', {
                        technology: service.technology,
                        bestProduct: bestProduct?.name,
                        speedFromProduct: bestProduct?.name.split(' ')[1],
                        matchingPrice,
                        proposedCost: matchingPrice?.monthlyRental?.months12
                    });

                    const mappedService = {
                        id: Date.now() + Math.random(),
                        type: service.technology,
                        speed: bestProduct ?
                            `${bestProduct.name.split(' ')[1]} Mbps` :
                            `${service.speeds.download.max} Mbps Download / ${service.speeds.upload.max} Mbps Upload`,
                        term: '12',
                        proposedCost: matchingPrice?.monthlyRental?.months12 || null,
                        installFee: matchingPrice?.installFee?.months12 || null,
                        router: matchingPrice?.router || '',
                        isOrderable: bestProduct?.isOrderable || false,
                        minimumActivationDate: bestProduct?.minimumActivationDate || null,
                        isBackup: false,
                        productCode: bestProduct?.code || null
                    };

                    addDebugLog('Final mapped service', {
                        service: mappedService,
                        matchingPrice
                    });

                    return mappedService;
                });

                setFormData({ ...formData, sites: updatedSites });
                setAvailabilityResults({ ...availabilityResults, [siteIndex]: data });
            } else {
                addDebugLog('No services found in response');
            }

        } catch (error) {
            addDebugLog('Error in handleCheckAvailability', { error: error.message });
            setApiError(error.message);
        } finally {
            setLoadingConnections(prev => ({...prev, [siteIndex]: false}));
            setLoadingIndex(null);
        }
    };

    // Site management functions
    const addSite = () => {
        addDebugLog('Adding new site');
        setFormData({
            ...formData,
            sites: [
                ...formData.sites,
                {
                    id: Date.now(),
                    address: null,
                    connections: [],
                    currentService: '',
                    currentSpeed: '',
                    currentPrice: ''
                }
            ]
        });
    };

    const removeSite = (siteIndex) => {
        addDebugLog('Removing site', { siteIndex });
        const updatedSites = formData.sites.filter((_, index) => index !== siteIndex);
        setFormData({ ...formData, sites: updatedSites });
    };

    // Connection management functions
    const addConnection = (siteIndex) => {
        addDebugLog('Adding new connection', { siteIndex });
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].connections.push({
            ...initialConnectionState,
            id: Date.now()
        });
        setFormData({ ...formData, sites: updatedSites });
    };

    const removeConnection = (siteIndex, connectionIndex) => {
        addDebugLog('Removing connection', { siteIndex, connectionIndex });
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].connections.splice(connectionIndex, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const updateConnectionField = (siteIndex, connectionIndex, field, value) => {
        addDebugLog('Updating connection field', { siteIndex, connectionIndex, field, value });
        const updatedSites = [...formData.sites];
        const connection = updatedSites[siteIndex].connections[connectionIndex];
        connection[field] = value;

        if (field === 'type' || field === 'term') {
            const price = getServicePrice(connection.type, connection.term);
            if (price) {
                connection.proposedCost = price;
            }
        }

        setFormData({ ...formData, sites: updatedSites });
    };

    const updateSiteField = (siteIndex, field, value) => {
        addDebugLog('Updating site field', { siteIndex, field, value });
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex] = {
            ...updatedSites[siteIndex],
            [field]: value
        };
        setFormData({ ...formData, sites: updatedSites });
    };

    const getServicePrice = (serviceType, term) => {
        const price = initialPrices.find(price => price.serviceType.includes(serviceType));
        if (!price) return null;

        const termKey = `months${term}`;
        return price.monthlyRental[termKey];
    };

    // Render functions
    // Updated renderAvailabilityResults
    const renderAvailabilityResults = (site, siteIndex) => {
        if (!availabilityResults[siteIndex]) return null;

        return (
            <div className="mt-6">
                <h4 className="font-semibold text-gray-700 mb-4">Available Services</h4>
                <div className="space-y-4">
                    {site.connections.map((connection, connectionIndex) => (
                        <div key={connection.id} className="border rounded-md p-4 relative bg-white">
                            <button
                                onClick={() => removeConnection(siteIndex, connectionIndex)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            {/* Header section with badges */}
                            <div className="flex items-center gap-2 mb-4">
                            <span className="bg-blue-500 text-white text-xs font-medium px-2.5 py-0.5 rounded">
                                {connection.type}
                            </span>
                                {getSpeedTierBadge(connection.speed)}
                            </div>

                            {/* Connection details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Speed
                                    </label>
                                    <div className="text-lg font-semibold text-gray-900">{connection.speed}</div>
                                </div>

                                {/* Activation date */}
                                {connection.minimumActivationDate && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Available From
                                        </label>
                                        <div className="text-sm text-gray-600">
                                            {formatActivationDate(connection.minimumActivationDate)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pricing comparison card */}
                            <div className="mt-4 bg-gray-50 rounded-lg p-4">
                                <h5 className="font-medium text-gray-900 mb-3">Contract Options</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['12', '24', '36'].map((term) => {
                                        const isSelected = connection.term === term;
                                        const termPrice = getServicePrice(connection.type, term);
                                        const savings = term === '12' ? 0 :
                                            ((getServicePrice(connection.type, '12') * 12) - (termPrice * parseInt(term))) / parseInt(term);

                                        return (
                                            <div
                                                key={term}
                                                className={`relative rounded-lg border p-4 cursor-pointer transition-all
                                                ${isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-200'}`}
                                                onClick={() => updateConnectionField(siteIndex, connectionIndex, 'term', term)}
                                            >
                                                <div className="text-lg font-semibold mb-1">
                                                    {term} Months
                                                </div>
                                                <div className="text-2xl font-bold text-blue-600 mb-2">
                                                    £{termPrice?.toFixed(2)}
                                                    <span className="text-sm text-gray-500 font-normal">/mo</span>
                                                </div>
                                                {savings > 0 && (
                                                    <div className="text-sm text-green-600">
                                                        Save £{savings.toFixed(2)}/mo
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="mt-4 space-y-2">
                                {/* Cost savings comparison */}
                                {renderCostSavings(connection, site.currentPrice)}

                                {/* Installation fee */}
                                {connection.installFee > 0 && (
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Installation Fee:</span> £{connection.installFee.toFixed(2)}
                                    </div>
                                )}

                                {/* Router information */}
                                {connection.router && (
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Router:</span> {connection.router}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderContractOptions = (service, matchingPrice) => {
        if (!matchingPrice) return null;

        const { monthlyRental, installFee } = matchingPrice;
        const validTerms = Object.keys(monthlyRental)
            .filter(term => monthlyRental[term] !== null)
            .map(term => term.replace('months', ''));

        const basePrice = Math.max(...Object.values(monthlyRental).filter(price => price !== null));

        return (
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Contract Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {validTerms.map(term => {
                        const termKey = `months${term}`;
                        const monthlyPrice = monthlyRental[termKey];
                        const monthlySavings = basePrice - monthlyPrice;
                        const isSelected = service.term === term;
                        const termInstallFee = installFee[termKey];

                        return (
                            <div
                                key={term}
                                className={`
                                p-4 rounded-lg cursor-pointer transition-all
                                ${isSelected
                                    ? 'border-2 border-blue-500 bg-blue-50'
                                    : 'border border-gray-200 hover:border-blue-300'}
                            `}
                                onClick={() => handleTermSelect(service.id, term)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">{term} Months</span>
                                    {isSelected && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                </div>

                                <div className="text-lg font-bold text-gray-900">
                                    £{monthlyPrice.toFixed(2)}/mo
                                </div>

                                {monthlySavings > 0 && (
                                    <div className="text-sm text-green-600 mt-1">
                                        Save £{monthlySavings.toFixed(2)}/mo
                                    </div>
                                )}

                                {termInstallFee > 0 && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        £{termInstallFee.toFixed(2)} install
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Main render
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Broadband Infrastructure</h2>
                <button
                    onClick={addSite}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Site
                </button>
            </div>

            {/* Debug Panel */}
            {debugLogs.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Debug Logs</h3>
                    <div className="max-h-40 overflow-auto">
                        {debugLogs.map((log, index) => (
                            <div key={index} className="text-sm mb-2">
                                <div className="text-gray-500">{log.timestamp}</div>
                                <div>{log.message}</div>
                                {log.data && (
                                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                        {log.data}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {formData.sites.map((site, siteIndex) => (
                <div key={site.id} className="border rounded-lg shadow-sm bg-white">
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-blue-500" />
                                Site {siteIndex + 1}
                            </h3>
                            <button
                                onClick={() => removeSite(siteIndex)}
                                className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site Address
                            </label>
                            <ZenAddressLookup
                                value={site.address}
                                onSelect={(address) => {
                                    addDebugLog('Address selected', address);
                                    const updatedSites = [...formData.sites];
                                    updatedSites[siteIndex].address = address;
                                    updatedSites[siteIndex].connections = [];
                                    setFormData({ ...formData, sites: updatedSites });
                                    setAvailabilityResults(prev => {
                                        const newResults = { ...prev };
                                        delete newResults[siteIndex];
                                        return newResults;
                                    });
                                }}
                            />
                        </div>
                    </div>

                    <div className="p-4">
                        {site.address && (
                            <>
                                <div className="flex items-center text-sm text-gray-600 mb-6">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    {site.address.premisesName || site.address.thoroughfareNumber} {site.address.thoroughfareName},
                                    {site.address.postTown && ` ${site.address.postTown},`} {site.address.postCode}
                                </div>

                                {/* Current Service Information Section */}
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-700 mb-4">Current Service Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Service Type
                                            </label>
                                            <select
                                                value={site.currentService || ''}
                                                onChange={(e) => updateSiteField(siteIndex, 'currentService', e.target.value)}
                                                className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Service Type</option>
                                                {serviceTypes.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Speed
                                            </label>
                                            <input
                                                type="text"
                                                value={site.currentSpeed || ''}
                                                onChange={(e) => updateSiteField(siteIndex, 'currentSpeed', e.target.value)}
                                                placeholder="e.g. 80/20"
                                                className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Monthly Cost
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-gray-500">£</span>
                                                <input
                                                    type="number"
                                                    value={site.currentPrice || ''}
                                                    onChange={(e) => updateSiteField(siteIndex, 'currentPrice', e.target.value)}
                                                    className="w-full border rounded-md pl-6 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Check Availability Button */}
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => handleCheckAvailability(siteIndex)}
                                        className={`
                                            flex items-center px-4 py-2 rounded-md text-white
                                            ${loadingIndex === siteIndex
                                            ? 'bg-blue-400 cursor-not-allowed'
                                            : 'bg-blue-500 hover:bg-blue-600'}
                                            transition-colors
                                        `}
                                        disabled={loadingIndex === siteIndex}
                                    >
                                        {loadingIndex === siteIndex ? (
                                            <>
                                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                                Checking Availability...
                                            </>
                                        ) : (
                                            <>
                                                <Signal className="h-4 w-4 mr-2" />
                                                Check Available Services
                                            </>
                                        )}
                                    </button>
                                </div>

                                {loadingConnections[siteIndex] && (
                                    <div className="mt-4 flex items-center justify-center p-8 text-blue-500">
                                        <Loader2 className="animate-spin h-8 w-8" />
                                    </div>
                                )}

                                {/* Render availability results */}
                                {renderAvailabilityResults(site, siteIndex)}

                                {apiError && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <div className="flex items-start gap-2 text-red-600">
                                            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium">Error checking availability</h4>
                                                <p className="text-sm mt-1">{apiError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}

            {formData.sites.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
                    <Wifi className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sites added yet</h3>
                    <p className="text-gray-500 mb-4">Add your first site to begin configuring broadband services</p>
                    <button
                        onClick={addSite}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Your First Site
                    </button>
                </div>
            )}
        </div>
    );
};

export default BroadbandForm;