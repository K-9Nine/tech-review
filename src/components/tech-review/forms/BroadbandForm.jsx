import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, Wifi, ExternalLink, Edit2 } from 'lucide-react';
import { checkZenAvailability, getZenPrices } from '../../../api/zenApi';

const BroadbandForm = ({ formData, setFormData }) => {
    const [loading, setLoading] = useState(false);
    const [zenAvailability, setZenAvailability] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [editingIndex, setEditingIndex] = useState(null);
    const [showManualEntry, setShowManualEntry] = useState(false);

    const broadbandTypes = [
        { value: 'fttc', label: 'FTTC (Fibre to the Cabinet)' },
        { value: 'fttp', label: 'FTTP (Fibre to the Premises)' },
        { value: 'adsl', label: 'ADSL' },
        { value: 'ethernet', label: 'Ethernet' },
        { value: 'cable', label: 'Cable' }
    ];

    const speedOptions = {
        fttc: ['Up to 40Mbps', 'Up to 80Mbps'],
        fttp: ['100Mbps', '300Mbps', '500Mbps', '900Mbps', '1Gbps'],
        adsl: ['Up to 24Mbps'],
        ethernet: ['100Mbps', '1Gbps', '10Gbps'],
        cable: ['100Mbps', '200Mbps', '500Mbps', '1Gbps']
    };

    useEffect(() => {
        const checkAvailability = async () => {
            if (formData.sites[0].address?.postcode && formData.sites[0].address?.building) {
                setLoading(true);
                try {
                    const { postcode, building } = formData.sites[0].address;
                    const availability = await checkZenAvailability(postcode, building);
                    setZenAvailability(availability);

                    if (availability?.technologies) {
                        const pricesPromises = availability.technologies.map(tech =>
                            getZenPrices(tech.type, tech.speed)
                        );
                        const prices = await Promise.all(pricesPromises);
                        setZenAvailability(prev => ({
                            ...prev,
                            prices: prices.flat()
                        }));
                    }
                } catch (error) {
                    console.error('Error checking Zen availability:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        checkAvailability();
    }, [formData.sites[0].address]);

    const validateBroadband = (broadband) => {
        const errors = {};

        if (!broadband.type) errors.type = 'Broadband type is required';
        if (!broadband.speed) errors.speed = 'Speed is required';
        if (!broadband.provider) errors.provider = 'Provider is required';
        if (!broadband.cost || isNaN(broadband.cost)) errors.cost = 'Valid monthly cost is required';
        if (!broadband.term || isNaN(broadband.term)) errors.term = 'Contract term is required';

        return errors;
    };

    const handleBroadbandChange = (index, field, value) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].broadband) {
            updatedSites[0].broadband = [];
        }

        if (!updatedSites[0].broadband[index]) {
            updatedSites[0].broadband[index] = {};
        }

        updatedSites[0].broadband[index][field] = value;

        // Clear validation error when field is changed
        if (validationErrors[`broadband${index}`]?.[field]) {
            const newErrors = { ...validationErrors };
            delete newErrors[`broadband${index}`][field];
            setValidationErrors(newErrors);
        }

        // If type changes, reset speed
        if (field === 'type') {
            updatedSites[0].broadband[index].speed = '';
        }

        setFormData({ ...formData, sites: updatedSites });
    };

    const addBroadband = () => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].broadband) {
            updatedSites[0].broadband = [];
        }

        updatedSites[0].broadband.push({
            type: '',
            speed: '',
            provider: '',
            cost: '',
            term: 12,
            notes: ''
        });

        setFormData({ ...formData, sites: updatedSites });
        setShowManualEntry(true);
    };

    const removeBroadband = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].broadband.splice(index, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const handleSelectService = (technology, pricing) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].broadband) {
            updatedSites[0].broadband = [];
        }

        updatedSites[0].broadband.push({
            type: technology.type,
            speed: technology.speed,
            provider: 'Zen',
            cost: pricing?.price || '',
            term: pricing?.term || 12,
            notes: ''
        });

        setFormData({ ...formData, sites: updatedSites });
    };

    const renderZenAvailability = () => {
        if (!zenAvailability) return null;

        return (
            <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Wifi className="w-5 h-5 text-blue-500 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Available Zen Services</h3>
                    </div>
                    <button
                        onClick={() => setShowManualEntry(!showManualEntry)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                        {showManualEntry ? 'Hide' : 'Show'} Manual Entry
                        <Edit2 className="w-4 h-4 ml-1" />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {zenAvailability.technologies?.map((tech, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-900">{tech.type}</h4>
                                    <p className="text-sm text-gray-600">Up to {tech.speed}</p>
                                </div>
                                {zenAvailability.prices?.[index] && (
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            £{zenAvailability.prices[index].price}/month
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {zenAvailability.prices[index].term} month contract
                                        </p>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => handleSelectService(tech, zenAvailability.prices?.[index])}
                                className="mt-3 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                            >
                                Select This Service
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {loading && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2">Checking Zen availability...</span>
                </div>
            )}

            {/* Zen Availability Section */}
            {renderZenAvailability()}

            {/* Manual Entry Section */}
            {(showManualEntry || !zenAvailability) && (
                <div className="space-y-4">
                    {(!formData.sites[0].broadband || formData.sites[0].broadband.length === 0) && (
                        <div className="text-center py-8">
                            <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">No broadband services added yet</p>
                            <button
                                onClick={addBroadband}
                                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Add Broadband Service
                            </button>
                        </div>
                    )}

                    {formData.sites[0].broadband?.map((broadband, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Broadband Service {index + 1}</h3>
                                <button
                                    onClick={() => removeBroadband(index)}
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
                                        value={broadband.type}
                                        onChange={(e) => handleBroadbandChange(index, 'type', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`broadband${index}`]?.type
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    >
                                        <option value="">Select Type</option>
                                        {broadbandTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[`broadband${index}`]?.type && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`broadband${index}`].type}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Speed
                                    </label>
                                    <select
                                        value={broadband.speed}
                                        onChange={(e) => handleBroadbandChange(index, 'speed', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`broadband${index}`]?.speed
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        disabled={!broadband.type}
                                    >
                                        <option value="">Select Speed</option>
                                        {broadband.type && speedOptions[broadband.type].map(speed => (
                                            <option key={speed} value={speed}>
                                                {speed}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors[`broadband${index}`]?.speed && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`broadband${index}`].speed}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Provider
                                    </label>
                                    <input
                                        type="text"
                                        value={broadband.provider || ''}
                                        onChange={(e) => handleBroadbandChange(index, 'provider', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`broadband${index}`]?.provider
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="e.g., BT, Virgin, TalkTalk"
                                    />
                                    {validationErrors[`broadband${index}`]?.provider && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`broadband${index}`].provider}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Cost (£)
                                    </label>
                                    <input
                                        type="number"
                                        value={broadband.cost || ''}
                                        onChange={(e) => handleBroadbandChange(index, 'cost', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`broadband${index}`]?.cost
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                    {validationErrors[`broadband${index}`]?.cost && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`broadband${index}`].cost}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contract Term (months)
                                    </label>
                                    <input
                                        type="number"
                                        value={broadband.term || ''}
                                        onChange={(e) => handleBroadbandChange(index, 'term', e.target.value)}
                                        className={`w-full rounded-md border ${
                                            validationErrors[`broadband${index}`]?.term
                                                ? 'border-red-300'
                                                : 'border-gray-300'
                                        } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                        min="0"
                                        step="1"
                                    />
                                    {validationErrors[`broadband${index}`]?.term && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center">
                                            <AlertCircle className="w-4 h-4 mr-1" />
                                            {validationErrors[`broadband${index}`].term}
                                        </p>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        value={broadband.notes || ''}
                                        onChange={(e) => handleBroadbandChange(index, 'notes', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows="2"
                                        placeholder="Any additional information..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {formData.sites[0].broadband?.length > 0 && (
                        <button
                            onClick={addBroadband}
                            className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Another Broadband Service
                        </button>
                    )}
                </div>
            )}

            {/* Summary Section */}
            {formData.sites[0].broadband?.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Service Summary</h3>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Monthly Cost</p>
                            <p className="text-lg font-bold text-blue-600">
                                £{formData.sites[0].broadband.reduce((sum, service) =>
                                sum + (Number(service.cost) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="mt-2">
                        <p className="text-sm text-gray-600">
                            {formData.sites[0].broadband.length} service{formData.sites[0].broadband.length !== 1 ? 's' : ''} configured
                        </p>
                    </div>
                </div>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Wifi className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Broadband Service Information</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Add all broadband services currently in use. You can check Zen availability
                            for new services or manually enter details for existing services. Make sure
                            to include contract terms and monthly costs for accurate assessment.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BroadbandForm;