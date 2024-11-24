import React, { useState } from 'react';
import { Trash2, Network, AlertCircle, MapPin, Plus, PoundSterling, TrendingDown, Loader2, CheckCircle } from 'lucide-react';
import ZenAddressLookup from '../components/ZenAddressLookup';

// Constants
const SPEED_TIERS = {
    ULTRA_FAST: 1000,
    SUPER_FAST: 330,
    FAST: 100
};

const connectionTypes = [
    "Software Defined Ethernet",
    "Ethernet First Mile",
    "Dedicated Ethernet",
    "Dark Fibre"
];

const speedOptions = {
    "Software Defined Ethernet": ["100", "200", "500", "1000"],
    "Ethernet First Mile": ["10", "20", "50", "100"],
    "Dedicated Ethernet": ["100", "1000", "10000"],
    "Dark Fibre": ["1000", "10000"]
};

const initialConnectionState = {
    type: '',
    speed: '',
    proposedCost: '',
    term: '36',
    isBackup: false
};

const initialSiteState = {
    id: Date.now(),
    name: '',
    address: null,
    connections: []
};

const NetworkForm = ({ formData, setFormData }) => {
    // State
    const [loadingIndex, setLoadingIndex] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [loadingConnections, setLoadingConnections] = useState({});
    const [pricingResults, setPricingResults] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);
    const [formErrors, setFormErrors] = useState([]);

    // Helper Functions
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

    const getSpeedTierBadge = (speed) => {
        const speedValue = typeof speed === 'string' ? parseInt(speed) : speed;
        if (speedValue >= SPEED_TIERS.ULTRA_FAST) {
            return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Ultra-Fast</span>;
        } else if (speedValue >= SPEED_TIERS.SUPER_FAST) {
            return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Super-Fast</span>;
        } else if (speedValue >= SPEED_TIERS.FAST) {
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

    // Validation
    const validateSites = (sites) => {
        const errors = [];
        sites.forEach((site, index) => {
            if (!site.name?.trim()) {
                errors.push(`Site ${index + 1} name is required`);
            }
        });
        return errors;
    };

    // API Functions
    const checkITSPricing = async (site, connection) => {
        try {
            addDebugLog('Starting ITS pricing check', { site, connection });

            const getBearerAndSpeed = (connectionType, speed) => {
                const speedNum = parseInt(speed, 10);
                let bearer;

                if (connectionType === "Ethernet First Mile") {
                    bearer = 100;
                } else {
                    bearer = 1000;
                }

                let adjustedSpeed = speedNum;
                if (bearer === 100) {
                    adjustedSpeed = Math.ceil(speedNum / 10) * 10;
                } else if (bearer === 1000) {
                    adjustedSpeed = Math.ceil(speedNum / 100) * 100;
                } else if (bearer === 10000) {
                    adjustedSpeed = Math.ceil(speedNum / 1000) * 1000;
                }

                return { bearer, speed: adjustedSpeed };
            };

            const { bearer, speed } = getBearerAndSpeed(connection.type, connection.speed);

            const searchBody = {
                postcode: site.address.postcode.toUpperCase().replace(/\s/g, ''),
                address_line_1: site.address.building
                    ? `${site.address.building} ${site.address.street}`.trim()
                    : site.address.street || '',
                town: site.address.city || '',
                county: site.address.county || '',
                premise_type: "BUSINESS",
                term_months: [parseInt(connection.term, 10)],
                connections: [
                    {
                        bearer,
                        speed
                    }
                ]
            };

            if (site.address.addressReferenceNumber) {
                const numericUprn = parseInt(site.address.addressReferenceNumber.replace(/\D/g, ''), 10);
                if (!isNaN(numericUprn)) {
                    searchBody.uprn = numericUprn;
                }
            }

            addDebugLog('Making initial request', searchBody);

            const searchResponse = await fetch('http://localhost:3001/api/its/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchBody)
            });

            if (!searchResponse.ok) {
                const errorData = await searchResponse.json();
                addDebugLog('Search failed', errorData);
                throw new Error(errorData.error || `Search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            if (!searchData.data?.uuid) {
                addDebugLog('Invalid search response', searchData);
                throw new Error('No search ID returned');
            }

            addDebugLog('Search successful', searchData);

            // Poll for results
            let attempts = 0;
            const maxAttempts = 10;
            const waitTime = 3000;

            while (attempts < maxAttempts) {
                addDebugLog(`Checking results (Attempt ${attempts + 1}/${maxAttempts})`);

                await new Promise(resolve => setTimeout(resolve, waitTime));

                try {
                    const resultsResponse = await fetch(`http://localhost:3001/api/its/results/${searchData.data.uuid}`, {
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const resultsData = await resultsResponse.json();
                    addDebugLog(`Results attempt ${attempts + 1}`, resultsData);

                    if (resultsResponse.status === 404) {
                        addDebugLog('Results not ready', resultsData);
                        attempts++;
                        continue;
                    }

                    if (!resultsResponse.ok) {
                        addDebugLog('Results request failed', resultsData);
                        throw new Error(resultsData.error || `Results failed: ${resultsResponse.status}`);
                    }

                    if (resultsData.data?.quotes && resultsData.data.quotes.length > 0) {
                        // Group quotes by term
                        const quotesByTerm = resultsData.data.quotes.reduce((acc, quote) => {
                            const term = quote.term_months.toString();
                            if (!acc[term] || quote.monthly_cost < acc[term].monthly_cost) {
                                acc[term] = quote;
                            }
                            return acc;
                        }, {});

                        // Get the best quote for each term
                        return {
                            termPrices: {
                                '12': quotesByTerm['12']?.monthly_cost || null,
                                '24': quotesByTerm['24']?.monthly_cost || null,
                                '36': quotesByTerm['36']?.monthly_cost || null,
                                '60': quotesByTerm['60']?.monthly_cost || null
                            },
                            installCosts: {
                                '12': quotesByTerm['12']?.install_cost || null,
                                '24': quotesByTerm['24']?.install_cost || null,
                                '36': quotesByTerm['36']?.install_cost || null,
                                '60': quotesByTerm['60']?.install_cost || null
                            },
                            supplier: quotesByTerm[connection.term]?.supplier?.name || '',
                            productName: quotesByTerm[connection.term]?.product_name || '',
                            additionalInfo: quotesByTerm[connection.term]?.additionalInformation || []
                        };
                    }

                    addDebugLog('No quotes found in response', resultsData);
                    attempts++;

                } catch (error) {
                    addDebugLog('Error checking results', error);
                    attempts++;
                }
            }

            throw new Error('Could not get quotes after multiple attempts');

        } catch (error) {
            addDebugLog('Fatal error in checkITSPricing', error);
            throw error;
        }
    };

    // Event Handlers
    const handleCheckPricing = async (siteIndex) => {
        setLoadingIndex(siteIndex);
        setApiError(null);
        addDebugLog('Starting price check for site', { siteIndex });

        try {
            const site = formData.sites[siteIndex];

            if (!site.name?.trim()) {
                throw new Error('Site name is required');
            }

            for (let connectionIndex = 0; connectionIndex < site.connections.length; connectionIndex++) {
                const connection = site.connections[connectionIndex];
                addDebugLog('Checking connection', { connectionIndex, connection });

                setLoadingConnections(prev => ({
                    ...prev,
                    [`${siteIndex}-${connectionIndex}`]: true
                }));

                try {
                    const data = await checkITSPricing(site, connection);
                    addDebugLog('Received pricing data', data);
                    setPricingResults(prev => ({
                        ...prev,
                        [`${siteIndex}-${connectionIndex}`]: data
                    }));
                } finally {
                    setLoadingConnections(prev => ({
                        ...prev,
                        [`${siteIndex}-${connectionIndex}`]: false
                    }));
                }
            }
        } catch (error) {
            addDebugLog('Error in handleCheckPricing', { error: error.message });
            setApiError(error.message);
        } finally {
            setLoadingIndex(null);
        }
    };

    // Site Management Functions
    const addSite = () => {
        addDebugLog('Adding new site');
        setFormData({
            ...formData,
            sites: [
                ...formData.sites,
                { ...initialSiteState, id: Date.now() }
            ]
        });
    };

    const removeSite = (siteIndex) => {
        addDebugLog('Removing site', { siteIndex });
        const updatedSites = formData.sites.filter((_, index) => index !== siteIndex);
        setFormData({ ...formData, sites: updatedSites });
    };

    // Connection Management Functions
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
        updatedSites[siteIndex].connections[connectionIndex] = {
            ...updatedSites[siteIndex].connections[connectionIndex],
            [field]: value
        };
        setFormData({ ...formData, sites: updatedSites });
    };

    // Render Functions
    const renderPricingComparison = (connection, pricingKey) => {
        const pricingData = pricingResults[pricingKey];
        if (!pricingData || !pricingData.termPrices) return null;

        // Filter out null prices and get available prices
        const validPrices = Object.entries(pricingData.termPrices)
            .filter(([_, price]) => price !== null)
            .reduce((acc, [term, price]) => {
                acc[term] = price;
                return acc;
            }, {});

        if (Object.keys(validPrices).length === 0) return null;

        const currentCost = parseFloat(connection.proposedCost) || 0;

        // Get the price for the selected term or the lowest available price
        const selectedTerm = connection.term || '12';
        const recommendedPrice = validPrices[selectedTerm] ||
            Math.min(...Object.values(validPrices));

        const savings = currentCost - recommendedPrice;
        const savingsPercentage = currentCost > 0 ? ((savings / currentCost) * 100).toFixed(1) : 0;

        // Safely get installation cost
        const termInstallCost = pricingData.installCosts &&
        pricingData.installCosts[selectedTerm] &&
        !isNaN(pricingData.installCosts[selectedTerm]) ?
            Number(pricingData.installCosts[selectedTerm]) : 0;

        return (
            <div className="mt-4 space-y-4">
                {savings > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium flex items-center gap-2 text-blue-700">
                            <TrendingDown className="h-4 w-4" />
                            Potential Cost Savings
                        </h4>
                        <div className="grid gap-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-sm">Current Monthly Cost:</span>
                                <span className="font-medium">£{currentCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">Recommended Price:</span>
                                <span className="font-medium">£{recommendedPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-blue-600 font-medium pt-2 border-t border-blue-100">
                                <span>Monthly Savings:</span>
                                <span>£{savings.toFixed(2)} ({savingsPercentage}%)</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {termInstallCost > 0 && (
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Installation Fee:</span> £{termInstallCost.toFixed(2)}
                        </div>
                    )}
                    <div className="text-sm text-gray-600">
                        <span className="font-medium">Provider:</span> Amvia
                    </div>
                    {pricingData.productName && (
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">Product:</span> {pricingData.productName}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const handleContractTermSelect = (siteIndex, connectionIndex, term) => {
        setFormData(prevFormData => {
            const newFormData = { ...prevFormData };
            newFormData.sites[siteIndex].connections[connectionIndex].term = term;
            return newFormData;
        });
    };

    const renderContractOptions = (connection, siteIndex, connectionIndex, pricing) => {
        if (!pricing || !pricing.termPrices) return null;

        // Filter out null prices and get available prices
        const validPrices = Object.entries(pricing.termPrices)
            .filter(([_, price]) => price !== null)
            .reduce((acc, [term, price]) => {
                acc[term] = price;
                return acc;
            }, {});

        if (Object.keys(validPrices).length === 0) return null;

        // Find the highest monthly price to calculate savings
        const basePrice = Math.max(...Object.values(validPrices));

        return (
            <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Contract Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(validPrices).map(([term, monthlyPrice]) => {
                        const monthlySavings = basePrice - monthlyPrice;
                        const isSelected = connection.term === term;
                        const installCost = pricing.installCosts &&
                        pricing.installCosts[term] &&
                        !isNaN(pricing.installCosts[term]) ?
                            Number(pricing.installCosts[term]) : 0;

                        return (
                            <div
                                key={term}
                                className={`
                                p-4 rounded-lg cursor-pointer transition-all
                                ${isSelected
                                    ? 'border-2 border-blue-500 bg-blue-50'
                                    : 'border border-gray-200 hover:border-blue-300'}
                            `}
                                onClick={() => handleContractTermSelect(siteIndex, connectionIndex, term)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">{term} Months</span>
                                    {isSelected && (
                                        <CheckCircle className="w-4 h-4 text-blue-500" />
                                    )}
                                </div>

                                <div className="text-lg font-bold text-gray-900">
                                    £{monthlyPrice.toFixed(2)}/mo
                                </div>

                                {monthlySavings > 0 && (
                                    <div className="text-sm text-green-600 mt-1">
                                        Save £{monthlySavings.toFixed(2)}/mo
                                    </div>
                                )}

                                {installCost > 0 && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        £{installCost.toFixed(2)} install
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderSiteConnections = (site, siteIndex) => {
        if (!site.connections.length) {
            return (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-md">
                    <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No connections added yet</p>
                    <button
                        onClick={() => addConnection(siteIndex)}
                        className="mt-2 text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1 mx-auto"
                    >
                        <Plus className="h-4 w-4" /> Add your first connection
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {site.connections.map((connection, connectionIndex) => {
                    const pricingKey = `${siteIndex}-${connectionIndex}`;
                    const isLoading = loadingConnections[pricingKey];
                    const pricing = pricingResults[pricingKey];

                    return (
                        <div key={connection.id} className="border rounded-md p-4 relative">
                            <button
                                onClick={() => removeConnection(siteIndex, connectionIndex)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            <div className="space-y-4">
                                {/* Header section with badges */}
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-500 text-white text-xs font-medium px-2.5 py-0.5 rounded">
                                        {connection.type}
                                    </span>
                                    {connection.speed && getSpeedTierBadge(connection.speed)}
                                </div>

                                {/* Connection Form */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Connection Type
                                        </label>
                                        <select
                                            value={connection.type || ''}
                                            onChange={(e) => {
                                                updateConnectionField(siteIndex, connectionIndex, 'type', e.target.value);
                                                updateConnectionField(siteIndex, connectionIndex, 'speed', '');
                                            }}
                                            className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Type</option>
                                            {connectionTypes.map((type) => (
                                                <option key={type} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Speed
                                        </label>
                                        <select
                                            value={connection.speed || ''}
                                            onChange={(e) =>
                                                updateConnectionField(siteIndex, connectionIndex, 'speed', e.target.value)
                                            }
                                            className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            disabled={!connection.type}
                                        >
                                            <option value="">Select Speed</option>
                                            {connection.type && speedOptions[connection.type]?.map((speed) => (
                                                <option key={speed} value={speed}>
                                                    {parseInt(speed, 10) >= 1000
                                                        ? `${parseInt(speed, 10)/1000}Gbps`
                                                        : `${speed}Mbps`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Current Monthly Cost
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">£</span>
                                            <input
                                                type="number"
                                                value={connection.proposedCost || ''}
                                                onChange={(e) =>
                                                    updateConnectionField(siteIndex, connectionIndex, 'proposedCost', e.target.value)
                                                }
                                                className="w-full border rounded-md pl-6 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Backup Connection
                                        </label>
                                        <div className="flex items-center h-10">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={connection.isBackup || false}
                                                    onChange={(e) =>
                                                        updateConnectionField(siteIndex, connectionIndex, 'isBackup', e.target.checked)
                                                    }
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">This is a backup connection</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Loading State */}
                                {isLoading && (
                                    <div className="flex items-center text-blue-500">
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                        <span className="text-sm">Checking prices...</span>
                                    </div>
                                )}

                                {/* Pricing Results */}
                                {pricing && (
                                    <div className="space-y-4">
                                        {renderContractOptions(connection, siteIndex, connectionIndex, pricing)}
                                        {renderPricingComparison(connection, pricingKey)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Main render
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Network Infrastructure</h2>
                <button
                    onClick={addSite}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Site
                </button>
            </div>

            {/* Error Messages */}
            {formErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium">Please fix the following errors:</h4>
                            <ul className="text-sm mt-1 list-disc list-inside">
                                {formErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Sites */}
            {formData.sites.map((site, siteIndex) => (
                <div key={site.id} className="border rounded-lg shadow-sm bg-white">
                    {/* Site Header */}
                    <div className="p-4 border-b">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Network className="h-5 w-5 text-blue-500" />
                                Site {siteIndex + 1}
                            </h3>
                            <button
                                onClick={() => removeSite(siteIndex)}
                                className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Site Name*
                                </label>
                                <input
                                    type="text"
                                    value={site.name || ''}
                                    onChange={(e) => {
                                        const updatedSites = [...formData.sites];
                                        updatedSites[siteIndex] = {
                                            ...site,
                                            name: e.target.value
                                        };
                                        setFormData({ ...formData, sites: updatedSites });
                                        setFormErrors(validateSites(updatedSites));
                                    }}
                                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Head Office, Warehouse, Branch Location"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Site Address
                                </label>
                                <ZenAddressLookup
                                    value={site.address}
                                    onSelect={(address) => {
                                        addDebugLog('Address selected', address);
                                        const updatedSites = [...formData.sites];
                                        updatedSites[siteIndex].address = address;
                                        setFormData({ ...formData, sites: updatedSites });
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Site Content */}
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-gray-700">Connections</h4>
                            <button
                                onClick={() => addConnection(siteIndex)}
                                className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Add Connection
                            </button>
                        </div>

                        {renderSiteConnections(site, siteIndex)}

                        {site.connections.length > 0 && (
                            <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-between items-center border-t pt-4">
                                <div className="text-sm text-gray-500">
                                    {site.connections.length} connection{site.connections.length !== 1 ? 's' : ''} configured
                                    {site.connections.filter(c => c.isBackup).length > 0 &&
                                        ` (${site.connections.filter(c => c.isBackup).length} backup)`
                                    }
                                </div>

                                <button
                                    onClick={() => handleCheckPricing(siteIndex)}
                                    className={`
                                        flex items-center px-4 py-2 rounded-md text-white
                                        ${loadingIndex === siteIndex
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'}
                                        transition-colors
                                    `}
                                    disabled={loadingIndex === siteIndex || !site.address?.postcode}
                                >
                                    {loadingIndex === siteIndex ? (
                                        <>
                                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                            Checking All Prices...
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="h-4 w-4 mr-2" />
                                            Check All Prices
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* API Error Display */}
                        {apiError && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-start gap-2 text-red-600">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Error checking prices</h4>
                                        <p className="text-sm mt-1">{apiError}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Site Address Footer */}
                    {site.address && (
                        <div className="bg-gray-50 px-4 py-3 border-t">
                            <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-2" />
                                {site.address.building} {site.address.street}, {site.address.city}, {site.address.postcode}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Empty State */}
            {formData.sites.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
                    <Network className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sites added yet</h3>
                    <p className="text-gray-500 mb-4">Add your first site to begin configuring network connections</p>
                    <button
                        onClick={addSite}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Your First Site
                    </button>
                </div>
            )}

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
        </div>
    );
};

export default NetworkForm;