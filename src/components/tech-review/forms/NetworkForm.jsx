import React, { useState, useCallback } from 'react';
import { Trash2, Network, AlertCircle, MapPin, Plus, PoundSterling, Loader2, CheckCircle, TrendingDown } from 'lucide-react';
import AddressLookup from './AddressLookup';
import debounce from 'lodash/debounce';

// Constants
const SPEED_TIERS = {
    ULTRA_FAST: 1000,
    SUPER_FAST: 330,
    FAST: 100
};

const speedOptions = ["10", "20", "50", "100", "200", "500", "1000"];

const getSpeedTierBadge = (speed) => {
    const speedNum = parseInt(speed, 10);
    let color = '';
    let text = '';

    if (speedNum >= SPEED_TIERS.ULTRA_FAST) {
        color = 'bg-purple-100 text-purple-800';
        text = 'Ultra Fast';
    } else if (speedNum >= SPEED_TIERS.SUPER_FAST) {
        color = 'bg-green-100 text-green-800';
        text = 'Super Fast';
    } else {
        color = 'bg-yellow-100 text-yellow-800';
        text = 'Fast';
    }

    return (
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${color}`}>
            {text} ({speedNum >= 1000 ? `${speedNum/1000}Gbps` : `${speedNum}Mbps`})
        </span>
    );
};

const initialFormData = {
    sites: [
        {
            address: null,
            connections: [
                {
                    id: Date.now(),
                    speed: '',
                    isBackup: false
                }
            ]
        }
    ]
};

const NetworkForm = ({ formData, setFormData }) => {
    // State declarations
    const [loadingConnections, setLoadingConnections] = useState({});
    const [apiError, setApiError] = useState(null);
    const [pricingResults, setPricingResults] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);
    const [formErrors, setFormErrors] = useState([]);
    const [apiData, setApiData] = useState(null);
    const [addressInput, setAddressInput] = useState('');
    const [addressResults, setAddressResults] = useState([]);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Utility functions
    const addDebugLog = (message, data = null) => {
        const timestamp = new Date().toISOString();
        setDebugLogs(prev => [...prev, {
            timestamp,
            message,
            data: data ? JSON.stringify(data, null, 2) : null
        }]);
    };

    // API interaction functionsS
    const checkITSPricing = async (site, connection) => {
        try {
            // First get coordinates from OS API
            const geocodeResponse = await fetch(
                `https://api.os.uk/search/places/v1/find?${new URLSearchParams({
                    query: `${site.address.address_line_1}, ${site.address.postcode}`,
                    key: import.meta.env.VITE_OS_PLACES_API_KEY,
                    maxresults: '1',
                    output_srs: 'WGS84'
                })}`
            );

            const geocodeData = await geocodeResponse.json();
            console.log('Geocode response:', geocodeData);

            if (!geocodeData.results?.[0]) {
                throw new Error('Could not geocode address');
            }

            // Clean up address data - more precise formatting
            const cleanAddress = site.address.address_line_1
                .split(',')[1]  // Get part after first comma
                .trim()         // Remove whitespace
                .replace(/SHEFFIELD/i, '')  // Remove SHEFFIELD
                .replace(/S3 8JY/i, '')     // Remove postcode
                .replace(/,/g, '')          // Remove any remaining commas
                .trim()                     // Final trim
                .replace(/^(\d+)\s*,?\s*(.*)$/i, '$1 $2')  // Format number and street
                .replace(/\s+/g, ' ');      // Normalize spaces

            // Format request payload
            const requestPayload = {
                postcode: site.address.postcode,
                address_line_1: cleanAddress,
                town: "Sheffield",          // Hardcoded proper case
                latitude: geocodeData.results[0].DPA.LAT,
                longitude: geocodeData.results[0].DPA.LNG,
                term_months: [36, 60],
                its_only: false,
                connections: [
                    {
                        bearer: parseInt(site.connections[0].speed, 10),
                        speed: parseInt(site.connections[0].speed, 10)
                    }
                ]
            };

            console.log('Request payload:', requestPayload);

            console.log('🔍 POST Request:', {
                url: '/api/its/availability',
                payload: requestPayload
            });

            const searchResponse = await fetch('/api/its/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            const searchData = await searchResponse.json();
            const searchId = searchData?.data?.uuid;
            
            console.log('🔑 Search ID:', searchId);

            // Polling logic
            let attempts = 0;
            const maxAttempts = 30;  // 5 minutes total
            let previousQuoteCount = 0;
            let noNewQuotesCount = 0;

            while (attempts < maxAttempts) {
                console.log(`📊 GET Request attempt ${attempts + 1}/${maxAttempts}`);
                
                const resultsResponse = await fetch(`/api/its/results/${searchId}`);
                const resultsData = await resultsResponse.json();
                
                const currentQuoteCount = resultsData.data.quotes?.length || 0;
                const newQuotes = currentQuoteCount - previousQuoteCount;
                
                if (newQuotes === 0) noNewQuotesCount++; else noNewQuotesCount = 0;
                previousQuoteCount = currentQuoteCount;

                // Exit if we have quotes and no new ones for 3 attempts
                if (currentQuoteCount > 0 && noNewQuotesCount >= 3) {
                    return resultsData;
                }

                await new Promise(resolve => setTimeout(resolve, 10000));
                attempts++;
            }

            throw new Error('Timeout waiting for quotes');

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    };

    // Helper function to process quotes
    const processQuotes = (quotes = []) => {
        if (!quotes.length) return null;

        // Sort quotes by monthly cost
        const sortedQuotes = [...quotes].sort((a, b) => a.monthly_cost - b.monthly_cost);
        
        // Get the best quote (lowest monthly cost)
        const bestQuote = sortedQuotes[0];

        return {
            bestQuote,
            allQuotes: sortedQuotes
        };
    };

    const handlePricingCheck = async (siteIndex, connectionIndex) => {
        const site = formData.sites[siteIndex];
        
        // Create minimal connection object
        const connection = {
            speed: site.connections[connectionIndex].speed,
            isBackup: site.connections[connectionIndex].isBackup || false
        };

        addDebugLog('Starting pricing check for:', {
            siteIndex,
            connectionIndex,
            site,
            connection
        });

        setLoadingConnections(prev => ({
            ...prev,
            [`${siteIndex}-${connectionIndex}`]: true
        }));

        try {
            const results = await checkITSPricing(site, connection);
            addDebugLog('Pricing results:', results);

            setPricingResults(prev => ({
                ...prev,
                [`${siteIndex}-${connectionIndex}`]: results
            }));

        } catch (error) {
            addDebugLog('Pricing check failed:', error.message);
            setApiError(`Failed to get pricing: ${error.message}`);
        } finally {
            setLoadingConnections(prev => ({
                ...prev,
                [`${siteIndex}-${connectionIndex}`]: false
            }));
        }
    };

    // Site management functions
    const addSite = () => {
        setFormData({
            ...formData,
            sites: [
                ...formData.sites,
                {
                    address: null,
                    connections: [
                        {
                            id: Date.now(),
                            speed: '',
                            isBackup: false
                        }
                    ]
                }
            ]
        });
    };

    const removeSite = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites.splice(index, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const addConnection = (siteIndex) => {
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].connections.push({
            id: Date.now(),
            speed: '',
            isBackup: false
        });
        
        setFormData({ ...formData, sites: updatedSites });
    };

    const removeConnection = (siteIndex, connectionIndex) => {
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].connections.splice(connectionIndex, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const handleConnectionUpdate = (siteIndex, connectionIndex, field, value) => {
        const updatedSites = [...formData.sites];
        const connection = updatedSites[siteIndex].connections[connectionIndex];
        
        updatedSites[siteIndex].connections[connectionIndex] = {
            id: connection.id,
            speed: field === 'speed' ? value : connection.speed,
            isBackup: field === 'isBackup' ? value : connection.isBackup
        };
        
        setFormData({ ...formData, sites: updatedSites });
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
                        <div key={connectionIndex} className="border rounded-md p-4 relative">
                            <button
                                onClick={() => removeConnection(siteIndex, connectionIndex)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>

                            <div className="space-y-4">
                                {/* Connection Form */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Speed (Mbps)
                                        </label>
                                        <select
                                            value={connection.speed || ''}
                                            onChange={(e) => handleConnectionUpdate(siteIndex, connectionIndex, 'speed', e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            <option value="">Select Speed</option>
                                            {speedOptions.map((speed) => (
                                                <option key={speed} value={speed}>{speed}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Bearer
                                        </label>
                                        <select
                                            value={connection.bearer}
                                            onChange={(e) => handleConnectionUpdate(siteIndex, connectionIndex, 'bearer', e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        >
                                            <option value="1000">1000 Mbps</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Check Pricing Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handlePricingCheck(siteIndex, connectionIndex)}
                                        disabled={!connection.speed || isLoading}
                                        className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="animate-spin h-4 w-4" />
                                                Checking Prices...
                                            </>
                                        ) : (
                                            <>
                                                <PoundSterling className="h-4 w-4" />
                                                Check Pricing
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Pricing Results */}
                                {pricing && pricing.data.quotes && pricing.data.quotes.length > 0 && (
                                    <div className="mt-4 space-y-4">
                                        {/* Best Quote Summary */}
                                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="text-green-500 w-5 h-5" />
                                                <h4 className="font-medium">Best Quote</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {pricing.data.quotes[0].logo && (
                                                            <img 
                                                                src={pricing.data.quotes[0].logo} 
                                                                alt={pricing.data.quotes[0].supplier.name} 
                                                                className="h-6" 
                                                            />
                                                        )}
                                                        <span className="font-medium">
                                                            {pricing.data.quotes[0].supplier.name}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {pricing.data.quotes[0].product_name}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold">
                                                        £{pricing.data.quotes[0].monthly_cost.toFixed(2)}
                                                    </div>
                                                    <p className="text-sm text-gray-600">per month</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* All Quotes Table */}
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            SUPPLIER
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                                            PRODUCT
                                                        </th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                                            MONTHLY
                                                        </th>
                                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                                            INSTALL
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {pricing.data.quotes.map((quote) => (
                                                        <tr key={quote.uuid} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    {quote.logo && (
                                                                        <img 
                                                                            src={quote.logo} 
                                                                            alt={quote.supplier.name} 
                                                                            className="h-4" 
                                                                        />
                                                                    )}
                                                                    {quote.supplier.name}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-sm text-gray-600">
                                                                {quote.product_name}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                £{quote.monthly_cost.toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-2 text-right">
                                                                £{parseFloat(quote.install_cost).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Handle address selection for a specific site
    const handleAddressSelect = (siteIndex, address) => {
        console.log('Selecting address for site:', siteIndex, address);

        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].address = {
            uprn: address.DPA.UPRN,
            address_line_1: address.DPA.ADDRESS,
            town: address.DPA.POST_TOWN,
            postcode: address.DPA.POSTCODE,
            lat: address.DPA.LAT,
            lon: address.DPA.LNG
        };

        setFormData({
            ...formData,
            sites: updatedSites
        });

        // Clear the search results after selection
        setAddressResults([]);
        setAddressInput(address.DPA.ADDRESS);
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (text) => {
            if (text.length < 3) return;
            
            setIsSearching(true);
            try {
                const response = await fetch(
                    `https://api.os.uk/search/places/v1/find?${new URLSearchParams({
                        query: text,
                        key: import.meta.env.VITE_OS_PLACES_API_KEY,
                        maxresults: '10',
                        dataset: 'DPA',
                        output_srs: 'WGS84'
                    })}`
                );

                if (!response.ok) {
                    throw new Error(`OS Places API error: ${response.status}`);
                }

                const data = await response.json();
                console.log('API response:', data); // Debug log
                
                if (data.results && data.results.length > 0) {
                    setAddressResults(data.results);
                } else {
                    setAddressResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setAddressResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300),
        []
    );

    // Render site address lookup
    const renderSiteAddress = (site, siteIndex) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Address
            </label>
            <div className="relative">
                <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => {
                        setAddressInput(e.target.value);
                        debouncedSearch(e.target.value);
                    }}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="Start typing an address..."
                />

                {/* Loading indicator */}
                {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                    </div>
                )}

                {/* Address results dropdown */}
                {addressResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <ul className="py-1">
                            {addressResults.map((result) => (
                                <li
                                    key={result.DPA.UPRN}
                                    onClick={() => handleAddressSelect(siteIndex, result)}
                                    className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                                >
                                    <div className="font-medium">{result.DPA.ADDRESS}</div>
                                    <div className="text-xs text-gray-500">{result.DPA.POSTCODE}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Selected address display */}
            {site.address && (
                <div className="mt-2 text-sm text-gray-600">
                    <p className="font-medium">Selected Address:</p>
                    <p>{site.address.address_line_1}</p>
                    <p>{site.address.town}</p>
                    <p>{site.address.postcode}</p>
                    <p className="text-xs text-gray-500">UPRN: {site.address.uprn}</p>
                </div>
            )}
        </div>
    );

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

            {formData.sites.map((site, siteIndex) => (
                <div key={siteIndex} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <Network className="w-5 h-5 text-gray-500" />
                            <h3 className="font-medium">Site {siteIndex + 1}</h3>
                        </div>
                        <button
                            onClick={() => removeSite(siteIndex)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {renderSiteAddress(site, siteIndex)}

                    {renderSiteConnections(site, siteIndex)}

                    <button
                        onClick={() => addConnection(siteIndex)}
                        className="text-blue-500 hover:text-blue-700 flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Connection
                    </button>
                </div>
            ))}

            {apiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {apiError}
                </div>
            )}

            {/* Debug Logs Section */}
            <div className="mt-8 space-y-2">
                <h3 className="font-medium">Debug Logs</h3>
                {debugLogs.map((log, index) => (
                    <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                        <div className="text-gray-500">{log.timestamp}</div>
                        <div>{log.message}</div>
                        {log.data && <pre className="text-xs mt-1">{log.data}</pre>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NetworkForm;