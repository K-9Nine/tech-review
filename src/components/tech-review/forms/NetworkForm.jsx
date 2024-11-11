import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, Network, ExternalLink } from 'lucide-react';
import { checkITSAvailability, getITSPrices, checkITSOptimization } from '../../../api/itsApi';
import AddressLookup from '../components/AddressLookup';

const NetworkForm = ({ formData, setFormData }) => {
    const [loading, setLoading] = useState(false);
    const [itsAvailability, setITSAvailability] = useState(null);
    const [itsOptimizations, setITSOptimizations] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [showManualEntry, setShowManualEntry] = useState(false);

    const connectionTypes = [
        { value: 'ethernet', label: 'Ethernet' },
        { value: 'dark_fibre', label: 'Dark Fibre' },
        { value: 'leased_line', label: 'Leased Line' },
        { value: 'mpls', label: 'MPLS' },
        { value: 'wavelength', label: 'Wavelength' },
        { value: 'broadband', label: 'Broadband' }
    ];

    const speedOptions = {
        ethernet: ['100Mbps', '1Gbps', '10Gbps'],
        dark_fibre: ['1Gbps', '10Gbps', '100Gbps'],
        leased_line: ['10Mbps', '100Mbps', '1Gbps'],
        mpls: ['10Mbps', '100Mbps', '1Gbps'],
        wavelength: ['1Gbps', '10Gbps', '100Gbps'],
        broadband: ['Up to 80Mbps', 'Up to 330Mbps', 'Up to 1Gbps']
    };

    useEffect(() => {
        const checkAvailability = async () => {
            if (formData.sites[0].address?.postcode && formData.sites[0].address?.building) {
                setLoading(true);
                try {
                    const { postcode, building } = formData.sites[0].address;

                    // Check ITS availability
                    const availability = await checkITSAvailability(postcode, building);
                    setITSAvailability(availability);

                    // If there are existing connections, check for optimizations
                    if (formData.sites[0].connections?.length > 0) {
                        const optimizations = await checkITSOptimization({
                            connections: formData.sites[0].connections,
                            address: formData.sites[0].address
                        });
                        setITSOptimizations(optimizations);
                    }

                    // Get prices for available services
                    if (availability?.services) {
                        const pricesPromises = availability.services.map(service =>
                            getITSPrices(service.type, service.speed)
                        );
                        const prices = await Promise.all(pricesPromises);
                        setITSAvailability(prev => ({
                            ...prev,
                            prices: prices.flat()
                        }));
                    }
                } catch (error) {
                    console.error('Error checking ITS services:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkAvailability();
    }, [formData.sites[0].address]);

    const validateConnection = (connection) => {
        const errors = {};

        if (!connection.type) errors.type = 'Connection type is required';
        if (!connection.speed) errors.speed = 'Speed is required';
        if (!connection.cost || isNaN(connection.cost)) errors.cost = 'Valid monthly cost is required';
        if (!connection.term || isNaN(connection.term)) errors.term = 'Contract term is required';

        return errors;
    };

    const handleConnectionChange = (index, field, value) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].connections) {
            updatedSites[0].connections = [];
        }

        if (!updatedSites[0].connections[index]) {
            updatedSites[0].connections[index] = {};
        }

        updatedSites[0].connections[index][field] = value;

        // Clear validation error when field is changed
        if (validationErrors[`connection${index}`]?.[field]) {
            const newErrors = { ...validationErrors };
            delete newErrors[`connection${index}`][field];
            setValidationErrors(newErrors);
        }

        // If type changes, reset speed
        if (field === 'type') {
            updatedSites[0].connections[index].speed = '';
        }

        setFormData({ ...formData, sites: updatedSites });
    };

    const addConnection = () => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].connections) {
            updatedSites[0].connections = [];
        }

        updatedSites[0].connections.push({
            type: '',
            speed: '',
            cost: '',
            term: 36, // Default to 36 months for network connections
            notes: '',
            backup: false
        });

        setFormData({ ...formData, sites: updatedSites });
        setShowManualEntry(true);
    };

    const removeConnection = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].connections.splice(index, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const handleSelectService = (service, pricing) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].connections) {
            updatedSites[0].connections = [];
        }

        updatedSites[0].connections.push({
            type: service.type,
            speed: service.speed,
            provider: 'ITS',
            cost: pricing?.price || '',
            term: pricing?.term || 36,
            notes: '',
            backup: false
        });

        setFormData({ ...formData, sites: updatedSites });
    };

    const renderITSAvailability = () => {
        if (!itsAvailability) return null;

        return (
            <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Network className="w-5 h-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Available ITS Services</h3>
                    </div>
                    <button
                        onClick={() => setShowManualEntry(!showManualEntry)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                    >
                        Manual Entry
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {itsAvailability.services?.map((service, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-900">{service.type}</h4>
                                    <p className="text-sm text-gray-600">{service.speed}</p>
                                    {service.features?.map((feature, fidx) => (
                                        <span
                                            key={fidx}
                                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mt-2"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                                {itsAvailability.prices?.[index] && (
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            £{itsAvailability.prices[index].price}/month
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {itsAvailability.prices[index].term} month contract
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleSelectService(service, itsAvailability.prices?.[index])}
                                className="mt-3 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                            >
                                Select This Service
                            </button>
                        </div>
                    ))}
                </div>

                {itsOptimizations && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Optimization Opportunities</h4>
                        <div className="space-y-3">
                            {itsOptimizations.recommendations.map((rec, index) => (
                                <div key={index} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-green-900">{rec.description}</p>
                                            <p className="text-sm text-green-700 mt-1">
                                                New: {rec.newSpeed} at £{rec.newPrice}/month
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-green-600">
                                                Save £{(rec.currentPrice - rec.newPrice).toFixed(2)}/month
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSelectService({
                                            type: rec.type,
                                            speed: rec.newSpeed
                                        }, { price: rec.newPrice, term: rec.term })}
                                        className="mt-2 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                                    >
                                        Apply Optimization
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Address Lookup */}
            <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Site Address</h3>
                <AddressLookup
                    formData={formData}
                    setFormData={setFormData}
                    siteIndex={0}
                />
            </div>

            {loading && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2">Checking ITS availability...</span>
                </div>
            )}

            {/* ITS Availability Section */}
            {renderITSAvailability()}

            {/* Manual Entry Section */}
            {(showManualEntry || !itsAvailability) && (
                <div className="space-y-4">
                    {(!formData.sites[0].connections || formData.sites[0].connections.length === 0) && (
                        <div className="text-center py-8">
                            <Network className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No network connections added yet</p>
                            <button
                                onClick={addConnection}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Add Network Connection
                            </button>
                        </div>
                    )}

                    {formData.sites[0].connections?.map((connection, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Connection {index + 1}</h3>
                                <button
                                    onClick={() => removeConnection(index)}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={connection.type}
                                        onChange={(e) => handleConnectionChange(index, 'type', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`connection${index}`]?.type
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    >
                                        <option value="">Select Type</option>
                                        {connectionTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[`connection${index}`]?.type && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`connection${index}`].type}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Speed
                                    </label>
                                    <select
                                        value={connection.speed}
                                        onChange={(e) => handleConnectionChange(index, 'speed', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`connection${index}`]?.speed
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        disabled={!connection.type}
                                    >
                                        <option value="">Select Speed</option>
                                        {connection.type && speedOptions[connection.type].map(speed => (
                                            <option key={speed} value={speed}>
                                                {speed}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[`connection${index}`]?.speed && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`connection${index}`].speed}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Cost (£)
                                    </label>
                                    <input
                                        type="number"
                                        value={connection.cost || ''}
                                        onChange={(e) => handleConnectionChange(index, 'cost', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`connection${index}`]?.cost
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                    {validationErrors[`connection${index}`]?.cost && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`connection${index}`].cost}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contract Term (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={connection.term || ''}
                                        onChange={(e) => handleConnectionChange(index, 'term', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`connection${index}`]?.term
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        min="0"
                                        step="1"
                                    />
                                    {validationErrors[`connection${index}`]?.term && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`connection${index}`].term}
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={connection.backup || false}
                                            onChange={(e) => handleConnectionChange(index, 'backup', e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            This is a backup connection
                                        </span>
                                    </label>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={connection.notes || ''}
                                        onChange={(e) => handleConnectionChange(index, 'notes', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows="2"
                                        placeholder="Any additional information..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {formData.sites[0].connections?.length > 0 && (
                        <button
                            onClick={addConnection}
                            className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Another Connection
                        </button>
                    )}
                </div>
            )}

            {/* Summary Section */}
            {formData.sites[0].connections?.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Connection Summary</h3>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Monthly Cost</p>
                            <p className="text-lg font-bold text-blue-600">
                                £{formData.sites[0].connections.reduce((sum, conn) =>
                                sum + (Number(conn.cost) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-gray-600">
                            {formData.sites[0].connections.length} connection{formData.sites[0].connections.length !== 1 ? 's' : ''} configured
                        </p>
                        <p className="text-sm text-gray-600">
                            {formData.sites[0].connections.filter(conn => conn.backup).length} backup connection(s)
                        </p>
                    </div>
                </div>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Network className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Network Connection Information</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Add all network connections for this site. Consider adding backup connections
                            for critical services. We'll check ITS availability and recommend optimizations
                            based on your current setup.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkForm;