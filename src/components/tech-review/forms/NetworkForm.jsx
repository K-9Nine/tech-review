/**
 * NetworkForm Component
 * Version: 1.0.0
 * Last Updated: 2024-01-09
 * 
 * Features:
 * - Enhanced polling logic with configurable timeouts
 * - Improved error handling and user feedback
 * - Detailed pricing summary with loading states
 * - Debug logging functionality
 */

import React, { useState } from 'react';
import { Trash2, Plus, Loader2, PoundSterling, MapPin, Building2, CalendarClock, Award } from 'lucide-react';
import { AddressLookup } from '../../../components/AddressLookup';
import PricingComparison from './PricingComparison';
import { toast } from 'react-toastify';

// Speed options array
const speedOptions = [
    '100',
    '200',
    '300',
    '500',
    '1000'
];

const NetworkForm = ({ formData, setFormData }) => {
    // Add loading state
    const [loadingConnections, setLoadingConnections] = useState({});
    const [pricingData, setPricingData] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);
    const [pollProgress, setPollProgress] = useState({});

    // Get pricing for a specific connection
    const getPricing = (siteIndex, connectionIndex) => {
        return pricingData[`${siteIndex}-${connectionIndex}`];
    };

    // Add missing functions
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
        updatedSites[siteIndex].connections[connectionIndex][field] = value;
        setFormData({ ...formData, sites: updatedSites });
    };

    const addDebugLog = (type, message, data) => {
        const timestamp = new Date().toISOString();
        setDebugLogs(prev => [...prev, {
            timestamp,
            type,
            message,
            data
        }]);
    };

    const handlePricingCheck = async (siteIndex, connectionIndex) => {
        const pricingKey = `${siteIndex}-${connectionIndex}`;
        setLoadingConnections(prev => ({ ...prev, [pricingKey]: true }));
        
        try {
            const site = formData.sites[siteIndex];
            const connection = site.connections[connectionIndex];

            if (!site.address?.uprn) {
                throw new Error('Please select an address first');
            }

            // Extract postcode from the full address if not directly available
            const postcode = site.address.postcode || 
                            site.address.display_address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/g)?.[0];

            if (!postcode) {
                throw new Error('Could not determine postcode from address');
            }

            // Split address into parts and remove postcode and town
            const addressParts = site.address.display_address
                .split(',')
                .map(part => part.trim())
                .filter(part => 
                    part !== postcode && 
                    !part.match(/^SHEFFIELD\s*$/i) &&
                    part !== '');

            // Use first two parts of address (e.g. "1" and "NORTH BANK")
            const addressLine1 = addressParts.slice(0, 2).join(', ');

            const requestBody = {
                uprn: site.address.uprn,
                postcode: postcode,
                address_line_1: addressLine1,
                town: site.address.town || 'SHEFFIELD',
                term_months: [12, 24, 36, 60],
                its_only: false,
                connections: [{
                    bearer: 1000,
                    speed: parseInt(connection.speed)
                }]
            };

            addDebugLog('request', 'ITS API Request', requestBody);

            // Initial request to get UUID
            const initialResponse = await fetch('/api/its/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!initialResponse.ok) {
                throw new Error('Failed to initiate pricing check');
            }

            const { data: { uuid } } = await initialResponse.json();
            
            // Set initial empty pricing data
            setPricingData(prev => ({
                ...prev,
                [pricingKey]: {
                    quotes: [],
                    on_net_distance: null,
                    on_net_nearest: null,
                    total_on_net_quotes: 0,
                    total_off_net_quotes: 0
                }
            }));

            // Increase max attempts and polling interval
            let attempts = 0;
            const maxAttempts = 15; // Increased from 10 to 15
            const pollInterval = 3000; // Increased from 2000 to 3000ms
            
            // Add initial delay before first poll
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before first poll
            
            while (attempts < maxAttempts) {
                setPollProgress(prev => ({
                    ...prev,
                    [pricingKey]: {
                        current: attempts + 1,
                        total: maxAttempts
                    }
                }));

                const pollResponse = await fetch(`/api/its/availability/${uuid}`);
                const pollData = await pollResponse.json();
                
                // Update pricing data with latest poll results
                setPricingData(prev => ({
                    ...prev,
                    [pricingKey]: pollData.data
                }));

                // Check if we have quotes and they're fully processed
                if (pollData.data?.quotes?.length > 0) {
                    // Add additional delay to ensure all quotes are processed
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Final poll to get complete data
                    const finalPollResponse = await fetch(`/api/its/availability/${uuid}`);
                    const finalPollData = await finalPollResponse.json();
                    
                    setPricingData(prev => ({
                        ...prev,
                        [pricingKey]: finalPollData.data
                    }));

                    toast.success(`Retrieved ${finalPollData.data.quotes.length} pricing quotes`);
                    break;
                }

                attempts++;
                
                if (attempts === maxAttempts) {
                    throw new Error('Timeout while waiting for pricing data');
                }

                // Wait for the polling interval
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }

            // Clear progress when done
            setPollProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[pricingKey];
                return newProgress;
            });

        } catch (error) {
            console.error('Pricing check error:', error);
            toast.error(error.message || 'Failed to check pricing');
            
            // Clear any partial pricing data
            setPricingData(prev => {
                const newData = { ...prev };
                delete newData[pricingKey];
                return newData;
            });
        } finally {
            setLoadingConnections(prev => ({ ...prev, [pricingKey]: false }));
        }
    };

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

    const handleSiteChange = (siteIndex, field, value) => {
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex][field] = value;
        setFormData({ ...formData, sites: updatedSites });
    };

    const renderSiteConnections = (site, siteIndex) => {
        return (
            <div className="space-y-4">
                {site.connections.map((connection, connectionIndex) => {
                    const pricingKey = `${siteIndex}-${connectionIndex}`;
                    const isLoading = loadingConnections[pricingKey];
                    const pricing = pricingData[pricingKey];

                    return (
                        <div key={connection.id} className="border rounded-lg p-4 bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-medium">Connection {connectionIndex + 1}</h3>
                                <button
                                    onClick={() => removeConnection(siteIndex, connectionIndex)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Speed (Mbps)
                                    </label>
                                    <select
                                        value={connection.speed || ''}
                                        onChange={(e) => handleConnectionUpdate(siteIndex, connectionIndex, 'speed', e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                        value="1000"
                                        disabled
                                        className="w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-600"
                                    >
                                        <option value="1000">1000 Mbps</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => handlePricingCheck(siteIndex, connectionIndex)}
                                    disabled={!connection.speed || isLoading}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-md text-white
                                        ${isLoading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}
                                        transition-colors disabled:opacity-50
                                    `}
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

                            {pricing && (
                                <div className="mt-4 border-t pt-4">
                                    {pricing.error ? (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                                            <p className="font-medium">Error retrieving quotes</p>
                                            <p className="text-sm">{pricing.error}</p>
                                            <button 
                                                onClick={() => handlePricingCheck(siteIndex, connectionIndex)}
                                                className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Debug log */}
                                            {console.log('Pricing data received:', pricing)}
                                            
                                            {/* Summary Section */}
                                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                                <h4 className="font-medium text-lg mb-3">Pricing Summary</h4>
                                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {/* Distance Info */}
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-medium">Network Distance</p>
                                                            <p className="text-sm text-gray-600">
                                                                {pricing.on_net_distance ? 
                                                                    `${parseFloat(pricing.on_net_distance).toFixed(2)}m` : 
                                                                    'Calculating...'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Quotes Count */}
                                                    <div className="flex items-start gap-2">
                                                        <Building2 className="h-5 w-5 text-gray-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-medium">Total Quotes</p>
                                                            <p className="text-sm text-gray-600">
                                                                {pricing.quotes?.length || 0} available options
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* On/Off Net Split */}
                                                    <div className="flex items-start gap-2">
                                                        <Award className="h-5 w-5 text-gray-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-medium">Network Coverage</p>
                                                            <p className="text-sm text-gray-600">
                                                                {pricing.total_on_net_quotes || 0} On-Net, {pricing.total_off_net_quotes || 0} Off-Net
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Add loading indicator when quotes are being fetched */}
                                                    {!pricing.quotes?.length && (
                                                        <div className="col-span-full flex items-center justify-center gap-2 text-gray-500">
                                                            <Loader2 className="animate-spin h-4 w-4" />
                                                            <span>Fetching quotes...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Pricing Comparison Component */}
                                            {pricing.quotes?.length > 0 ? (
                                                <PricingComparison 
                                                    quotes={pricing.quotes}
                                                    onNetDistance={pricing.on_net_distance}
                                                    onNetNearest={pricing.on_net_nearest}
                                                />
                                            ) : (
                                                <div className="text-gray-500 p-4 text-center border rounded-lg flex items-center justify-center gap-2">
                                                    <Loader2 className="animate-spin h-4 w-4" />
                                                    <span>Retrieving pricing quotes... This may take a few moments.</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                <button
                    onClick={() => addConnection(siteIndex)}
                    className="w-full py-3 border-2 border-dashed rounded-lg text-blue-500 hover:text-blue-600 hover:border-blue-500 flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Another Connection
                </button>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Network Infrastructure</h2>
                <button
                    onClick={addSite}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Site
                </button>
            </div>

            {formData.sites.map((site, siteIndex) => (
                <div key={siteIndex} className="bg-white rounded-lg shadow-md border p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">Site {siteIndex + 1}</h3>
                        {formData.sites.length > 1 && (
                            <button
                                onClick={() => removeSite(siteIndex)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Provider
                            </label>
                            <input
                                type="text"
                                value={site.currentService || ''}
                                onChange={(e) => handleSiteChange(siteIndex, 'currentService', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Speed (Mbps)
                            </label>
                            <input
                                type="text"
                                value={site.currentSpeed || ''}
                                onChange={(e) => handleSiteChange(siteIndex, 'currentSpeed', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Current Monthly Cost (£)
                            </label>
                            <input
                                type="text"
                                value={site.currentPrice || ''}
                                onChange={(e) => handleSiteChange(siteIndex, 'currentPrice', e.target.value)}
                                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <AddressLookup
                            siteIndex={siteIndex}
                            formData={formData}
                            setFormData={setFormData}
                        />
                    </div>

                    {renderSiteConnections(site, siteIndex)}
                </div>
            ))}

            {/* Debug Console */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-900 text-gray-100 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Debug Console</h3>
                        <button 
                            onClick={() => setDebugLogs([])}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="h-64 overflow-auto font-mono text-sm">
                        {debugLogs.map((log, index) => (
                            <div 
                                key={index} 
                                className={`mb-2 p-2 rounded ${
                                    log.type === 'error' ? 'bg-red-900/50' :
                                    log.type === 'success' ? 'bg-green-900/50' :
                                    log.type === 'info' ? 'bg-blue-900/50' :
                                    'bg-gray-800/50'
                                }`}
                            >
                                <div className="text-xs text-gray-400">{log.timestamp}</div>
                                <div className="font-semibold">{log.message}</div>
                                {log.data && (
                                    <pre className="mt-1 text-xs overflow-auto">
                                        {JSON.stringify(log.data, null, 2)}
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