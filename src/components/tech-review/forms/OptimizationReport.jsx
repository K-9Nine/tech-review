import React, { useState, useCallback } from 'react';
import { Loader2, TrendingUp, TrendingDown, PoundSterling, AlertCircle } from 'lucide-react';

const OptimizationReport = ({ formData }) => {
    const [optimizations, setOptimizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [geocodeCache, setGeocodeCache] = useState({});

    // Geocoding Helper Functions
    const createCacheKey = (address) => {
        return `${address.building} ${address.street} ${address.city} ${address.postcode}`.toLowerCase().trim();
    };

    const getCoordinates = useCallback(async (address) => {
        const cacheKey = createCacheKey(address);

        if (geocodeCache[cacheKey]) {
            return geocodeCache[cacheKey];
        }

        try {
            const response = await fetch(
                `https://api.postcodes.io/postcodes/${encodeURIComponent(address.postcode)}`
            );
            const data = await response.json();

            if (data?.result?.latitude && data?.result?.longitude) {
                const coords = {
                    latitude: data.result.latitude,
                    longitude: data.result.longitude
                };

                setGeocodeCache(prev => ({
                    ...prev,
                    [cacheKey]: coords
                }));

                return coords;
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }

        throw new Error(`Could not geocode address: ${address.building} ${address.street}, ${address.postcode}`);
    }, [geocodeCache]);

    // ITS API Functions
    const normalizeConnectionSpeed = (speed, bearer) => {
        speed = parseFloat(speed);
        if (bearer === 100) {
            return Math.ceil(speed / 10) * 10;
        } else if (bearer === 1000) {
            return Math.ceil(speed / 100) * 100;
        } else if (bearer === 10000) {
            return Math.ceil(speed / 1000) * 1000;
        }
        return speed;
    };

    const checkITSPricing = async (connection, address) => {
        try {
            const API_KEY = import.meta.env.VITE_ITS_API_KEY;
            const coords = await getCoordinates(address);

            const speed = parseFloat(connection.speed) || 100;
            let bearer = 1000;
            if (speed <= 100) bearer = 100;
            else if (speed <= 1000) bearer = 1000;
            else bearer = 10000;

            const normalizedSpeed = normalizeConnectionSpeed(speed, bearer);

            const searchBody = {
                postcode: address.postcode,
                address_line_1: address.building || '',
                address_line_2: address.street || '',
                town: address.city || '',
                county: address.county || '',
                term_months: [connection.term || 36],
                its_only: false,
                latitude: coords.latitude,
                longitude: coords.longitude,
                connections: [{
                    bearer: bearer,
                    speed: normalizedSpeed
                }]
            };

            const searchResponse = await fetch('/its-api/api/v1/availability/search/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(searchBody)
            });

            if (!searchResponse.ok) {
                const errorData = await searchResponse.json();
                throw new Error(`ITS API Error: ${JSON.stringify(errorData.errors)}`);
            }

            const { data: { uuid } } = await searchResponse.json();
            let attempts = 0;
            const maxAttempts = 10;
            const delay = 2000;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));

                const resultsResponse = await fetch(`/its-api/api/v1/availability/search/results/${uuid}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Accept': 'application/json'
                    }
                });

                if (!resultsResponse.ok) {
                    throw new Error(`Failed to get ITS results: ${resultsResponse.status}`);
                }

                const results = await resultsResponse.json();

                if (results.meta?.processing_status === 'complete') {
                    return results.data?.quotes || [];
                }

                attempts++;
            }

            throw new Error('Timed out waiting for results');

        } catch (error) {
            console.error('Error checking ITS pricing:', error);
            throw error;
        }
    };

    const analyzeQuotes = (quotes, currentConnection) => {
        const currentSpeed = parseFloat(currentConnection.speed) || 0;
        const currentCost = parseFloat(currentConnection.cost) || 0;
        const opportunities = [];

        const quotesBySpeed = quotes.reduce((acc, quote) => {
            const speed = quote.speed;
            if (!acc[speed]) acc[speed] = [];
            acc[speed].push(quote);
            return acc;
        }, {});

        // Check for cost savings at current speed
        if (quotesBySpeed[currentSpeed]) {
            const bestPriceQuote = quotesBySpeed[currentSpeed].reduce((best, quote) =>
                (!best || quote.monthly_cost < best.monthly_cost) ? quote : best
            );

            if (bestPriceQuote.monthly_cost < currentCost) {
                opportunities.push({
                    type: 'cost_saving',
                    connectionType: currentConnection.type,
                    currentSpeed: currentSpeed,
                    currentCost: currentCost,
                    newCost: bestPriceQuote.monthly_cost,
                    monthlySaving: currentCost - bestPriceQuote.monthly_cost,
                    annualSaving: (currentCost - bestPriceQuote.monthly_cost) * 12,
                    provider: bestPriceQuote.supplier.name,
                    term: bestPriceQuote.term_months,
                    installCost: bestPriceQuote.install_cost,
                    details: `Same speed via ${bestPriceQuote.supplier.name}`,
                    additionalInfo: bestPriceQuote.additionalInformation,
                    product: bestPriceQuote.product_name
                });
            }
        }

        // Check for speed upgrades
        Object.entries(quotesBySpeed).forEach(([speed, speedQuotes]) => {
            const numSpeed = parseFloat(speed);
            if (numSpeed > currentSpeed) {
                const bestPriceQuote = speedQuotes.reduce((best, quote) =>
                    (!best || quote.monthly_cost < best.monthly_cost) ? quote : best
                );

                const priceDifference = ((bestPriceQuote.monthly_cost - currentCost) / currentCost) * 100;

                if (priceDifference <= 10) {
                    opportunities.push({
                        type: 'speed_upgrade',
                        connectionType: currentConnection.type,
                        currentSpeed: currentSpeed,
                        newSpeed: numSpeed,
                        speedIncrease: ((numSpeed - currentSpeed) / currentSpeed * 100).toFixed(0),
                        currentCost: currentCost,
                        newCost: bestPriceQuote.monthly_cost,
                        provider: bestPriceQuote.supplier.name,
                        term: bestPriceQuote.term_months,
                        installCost: bestPriceQuote.install_cost,
                        details: `Faster speed via ${bestPriceQuote.supplier.name}`,
                        additionalInfo: bestPriceQuote.additionalInformation,
                        product: bestPriceQuote.product_name
                    });
                }
            }
        });

        return opportunities;
    };

    const checkOptimizations = async () => {
        setLoading(true);
        setError(null);
        const optimizationResults = [];

        try {
            for (const site of formData.sites) {
                const siteOptimizations = {
                    siteId: site.id,
                    address: site.address,
                    opportunities: [],
                    totalSavings: 0,
                    speedUpgrades: 0
                };

                for (const connection of site.connections) {
                    try {
                        const quotes = await checkITSPricing(connection, site.address);
                        const opportunities = analyzeQuotes(quotes, connection);

                        opportunities.forEach(opp => {
                            siteOptimizations.opportunities.push(opp);
                            if (opp.type === 'cost_saving') {
                                siteOptimizations.totalSavings += opp.monthlySaving;
                            } else if (opp.type === 'speed_upgrade') {
                                siteOptimizations.speedUpgrades++;
                            }
                        });

                    } catch (error) {
                        console.error(`Error processing connection for ${formatAddress(site.address)}:`, error);
                    }
                }

                if (siteOptimizations.opportunities.length > 0) {
                    optimizationResults.push(siteOptimizations);
                }
            }

            setOptimizations(optimizationResults);
        } catch (error) {
            setError('Failed to check optimization opportunities');
            console.error('Optimization check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalSavings = () => {
        const monthlySavings = optimizations.reduce((total, site) =>
            total + site.totalSavings, 0);
        return {
            monthly: monthlySavings,
            annual: monthlySavings * 12
        };
    };

    const formatAddress = (address) => {
        if (!address) return '';
        const parts = [];
        if (address.building) parts.push(address.building);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.postcode) parts.push(address.postcode);
        return parts.join(', ');
    };

    // Render Methods
    const renderOpportunity = (opp) => (
        <div
            className={`p-4 rounded-lg ${
                opp.type === 'cost_saving'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
            }`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <div className="font-medium text-lg mb-2">
                        {opp.type === 'cost_saving' ? 'Cost Saving Available' : 'Speed Upgrade Available'}
                    </div>
                    <div className="text-sm space-y-2">
                        <p className="font-medium">{opp.product}</p>
                        <p>Provider: {opp.provider}</p>
                        <p>Connection Type: {opp.connectionType}</p>

                        {opp.type === 'cost_saving' ? (
                            <>
                                <p>Current Cost: £{opp.currentCost.toFixed(2)}/month</p>
                                <p>New Cost: £{opp.newCost.toFixed(2)}/month</p>
                                <p className="font-medium text-green-700">
                                    Monthly Saving: £{opp.monthlySaving.toFixed(2)}
                                </p>
                                <p className="font-medium text-green-700">
                                    Annual Saving: £{opp.annualSaving.toFixed(2)}
                                </p>
                            </>
                        ) : (
                            <>
                                <p>Current Speed: {opp.currentSpeed}Mbps</p>
                                <p>Available Speed: {opp.newSpeed}Mbps</p>
                                <p className="font-medium text-blue-700">
                                    {opp.speedIncrease}% Speed Increase
                                </p>
                                <p>Monthly Cost: £{opp.newCost.toFixed(2)}</p>
                            </>
                        )}

                        <p>Contract Term: {opp.term} months</p>
                        <p>Installation Cost: £{parseFloat(opp.installCost).toFixed(2)}</p>

                        {opp.type === 'cost_saving' && (
                            <div className="mt-3 p-3 bg-white rounded-md border border-green-200">
                                <p className="font-medium text-sm">Return on Investment</p>
                                <p className="text-sm text-gray-600">
                                    Installation cost recovered in{' '}
                                    {(parseFloat(opp.installCost) / opp.monthlySaving).toFixed(1)}{' '}
                                    months through savings
                                </p>
                            </div>
                        )}

                        {opp.additionalInfo?.map((info, i) => (
                            <div key={i} className="mt-3 p-3 bg-white rounded-md border border-gray-200">
                                <p className="font-medium text-sm">{info.title}</p>
                                <p className="text-sm text-gray-600">{info.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {opp.type === 'cost_saving' ? (
                    <TrendingDown className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                    <TrendingUp className="w-8 h-8 text-blue-500 flex-shrink-0" />
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            {optimizations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Potential Annual Savings</p>
                                <p className="text-2xl font-bold text-green-700">
                                    £{calculateTotalSavings().annual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <PoundSterling className="w-8 h-8 text-green-500" />
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Monthly Savings</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    £{calculateTotalSavings().monthly.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <TrendingDown className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">Speed Upgrades Available</p>
                                <p className="text-2xl font-bold text-purple-700">
                                    {optimizations.reduce((total, site) => total + site.speedUpgrades, 0)}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Network Optimization Opportunities</h3>
                    <button
                        onClick={checkOptimizations}
                        disabled={loading || !formData.sites?.length}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Checking Opportunities...
                            </>
                        ) : (
                            'Check for Optimizations'
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-red-800 font-medium">Error Checking Optimizations</h4>
                            <p className="text-red-700 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {optimizations.length > 0 ? (
                    <div className="space-y-6">
                        {optimizations.map((site, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="font-medium text-lg mb-4">{formatAddress(site.address)}</div>

                                <div className="space-y-4">
                                    {site.opportunities.map((opp, oppIndex) => renderOpportunity(opp))}
                                </div>

                                {/* Site Summary */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Monthly Savings Potential</p>
                                            <p className="text-lg font-medium text-green-700">
                                                £{site.totalSavings.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Speed Upgrades Available</p>
                                            <p className="text-lg font-medium text-blue-700">
                                                {site.speedUpgrades}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : !loading && (
                    <div className="text-center py-8">
                        <div className="text-gray-500">
                            No optimization opportunities found yet.
                            {!formData.sites?.length && (
                                <p className="mt-2 text-sm">Add some sites to check for optimizations.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Recommendations Section */}
            {optimizations.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Recommendations Summary</h3>
                    <div className="space-y-4">
                        {optimizations.some(site => site.totalSavings > 0) && (
                            <div className="flex items-start space-x-3">
                                <TrendingDown className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Cost Saving Opportunities</p>
                                    <p className="text-sm text-gray-600">
                                        Total potential annual savings of £
                                        {calculateTotalSavings().annual.toFixed(2)} across all sites
                                    </p>
                                </div>
                            </div>
                        )}

                        {optimizations.some(site => site.speedUpgrades > 0) && (
                            <div className="flex items-start space-x-3">
                                <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Speed Upgrade Opportunities</p>
                                    <p className="text-sm text-gray-600">
                                        {optimizations.reduce((total, site) => total + site.speedUpgrades, 0)}{' '}
                                        potential speed upgrades available with minimal cost impact
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptimizationReport;