import React, { useState } from 'react';
import { Trash2, Plus, Loader2, PoundSterling } from 'lucide-react';
import { AddressLookup } from '../../../components/AddressLookup';
import PricingComparison from './PricingComparison';

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
    const [pricingResults, setPricingResults] = useState({});

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

    const handlePricingCheck = async (siteIndex, connectionIndex) => {
        const pricingKey = `${siteIndex}-${connectionIndex}`;
        setLoadingConnections(prev => ({ ...prev, [pricingKey]: true }));

        try {
            // Get site and connection from formData
            const site = formData.sites[siteIndex];
            const connection = site.connections[connectionIndex];

            // Step 1: Initial request to get UUID
            const initialResponse = await fetch('/api/its/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    postcode: site.address.postcode,
                    address_line_1: site.address.address_line_1,
                    town: site.address.town,
                    uprn: site.address.uprn,
                    latitude: site.address.latitude,
                    longitude: site.address.longitude,
                    term_months: [12, 24, 36, 60],
                    its_only: false,
                    connections: [{
                        bearer: parseInt(connection.speed),
                        speed: parseInt(connection.speed)
                    }]
                })
            });

            if (!initialResponse.ok) {
                throw new Error('Failed to initiate pricing check');
            }

            const { data: { uuid } } = await initialResponse.json();
            console.log('Received UUID:', uuid);

            // Step 2: Poll for results using the UUID
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = 2000; // 2 seconds

            while (attempts < maxAttempts) {
                const resultsResponse = await fetch(`/api/its/availability/${uuid}`, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (!resultsResponse.ok) {
                    throw new Error('Failed to fetch pricing results');
                }

                const resultsData = await resultsResponse.json();
                console.log('Polling response:', resultsData);

                // Check if results are ready
                if (resultsData.data.status === 'completed') {
                    setPricingResults(prev => ({
                        ...prev,
                        [pricingKey]: resultsData.data
                    }));
                    break;
                }

                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
            }

            if (attempts >= maxAttempts) {
                throw new Error('Timeout waiting for pricing results');
            }

        } catch (error) {
            console.error('Failed to check pricing:', error);
            alert(error.message);
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
                    const pricing = pricingResults[pricingKey];

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
                                        value={connection.bearer || '1000'}
                                        onChange={(e) => handleConnectionUpdate(siteIndex, connectionIndex, 'bearer', e.target.value)}
                                        className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                <div className="mt-4 p-4 border rounded-lg">
                                    <h4 className="font-semibold mb-2">Pricing Results</h4>
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {JSON.stringify(pricing, null, 2)}
                                    </pre>
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
        </div>
    );
};

export default NetworkForm;