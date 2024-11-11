import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, Phone, Settings, ExternalLink } from 'lucide-react';
import { getPhoneSystemPrices } from '../../../api/phoneApi';

const PhoneSystemForm = ({ formData, setFormData }) => {
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [availablePrices, setAvailablePrices] = useState([]);
    const [showPriceComparison, setShowPriceComparison] = useState(false);

    const phoneSystemTypes = [
        { value: 'onpremise', label: 'On-Premise PBX' },
        { value: 'cloud', label: 'Cloud-Based VoIP' },
        { value: 'hybrid', label: 'Hybrid System' },
        { value: 'virtual', label: 'Virtual PBX' },
        { value: 'hosted', label: 'Hosted VoIP' }
    ];

    const commonFeatures = [
        { value: 'voicemail', label: 'Voicemail' },
        { value: 'ivr', label: 'IVR/Auto-Attendant' },
        { value: 'conferencing', label: 'Conference Calling' },
        { value: 'call_recording', label: 'Call Recording' },
        { value: 'mobile_app', label: 'Mobile App Integration' },
        { value: 'crm', label: 'CRM Integration' },
        { value: 'analytics', label: 'Call Analytics' },
        { value: 'queuing', label: 'Call Queuing' },
        { value: 'presence', label: 'Presence Management' }
    ];

    const handsetTypes = [
        { value: 'yealink_t48s', label: 'Yealink T48S' },
        { value: 'yealink_t54w', label: 'Yealink T54W' },
        { value: 'poly_vvx450', label: 'Poly VVX450' },
        { value: 'cisco_8845', label: 'Cisco 8845' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        if (formData.sites[0].phoneSystems?.length > 0) {
            checkPrices();
        }
    }, [formData.sites[0].phoneSystems]);

    const checkPrices = async () => {
        setLoading(true);
        try {
            const currentSystems = formData.sites[0].phoneSystems;
            const pricePromises = currentSystems.map(system =>
                getPhoneSystemPrices(system.type, system.users)
            );
            const prices = await Promise.all(pricePromises);
            setAvailablePrices(prices);
            setShowPriceComparison(true);
        } catch (error) {
            console.error('Error checking phone system prices:', error);
        } finally {
            setLoading(false);
        }
    };

    const validatePhoneSystem = (system) => {
        const errors = {};

        if (!system.type) errors.type = 'Phone system type is required';
        if (!system.provider) errors.provider = 'Provider is required';
        if (!system.users || isNaN(system.users) || system.users < 1) {
            errors.users = 'Number of users is required';
        }
        if (!system.cost || isNaN(system.cost)) errors.cost = 'Valid monthly cost is required';
        if (!system.term || isNaN(system.term)) errors.term = 'Contract term is required';

        return errors;
    };

    const handlePhoneSystemChange = (index, field, value) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].phoneSystems) {
            updatedSites[0].phoneSystems = [];
        }

        if (!updatedSites[0].phoneSystems[index]) {
            updatedSites[0].phoneSystems[index] = {
                features: []
            };
        }

        // Handle features array separately
        if (field === 'features') {
            const features = updatedSites[0].phoneSystems[index].features || [];
            const featureIndex = features.indexOf(value);

            if (featureIndex === -1) {
                features.push(value);
            } else {
                features.splice(featureIndex, 1);
            }
            updatedSites[0].phoneSystems[index].features = features;
        } else {
            updatedSites[0].phoneSystems[index][field] = value;
        }

        // Clear validation error when field is changed
        if (validationErrors[`phoneSystem${index}`]?.[field]) {
            const newErrors = { ...validationErrors };
            delete newErrors[`phoneSystem${index}`][field];
            setValidationErrors(newErrors);
        }

        setFormData({ ...formData, sites: updatedSites });
    };

    const addPhoneSystem = () => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].phoneSystems) {
            updatedSites[0].phoneSystems = [];
        }

        updatedSites[0].phoneSystems.push({
            type: '',
            provider: '',
            users: '',
            features: [],
            handsets: '',
            cost: '',
            term: 12,
            notes: ''
        });

        setFormData({ ...formData, sites: updatedSites });
    };

    const removePhoneSystem = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].phoneSystems.splice(index, 1);
        setFormData({ ...formData, sites: updatedSites });
    };

    const renderPriceComparison = () => {
        if (!showPriceComparison || !availablePrices.length) return null;

        return (
            <div className="bg-white rounded-lg border p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Price Comparison</h3>
                    <button
                        onClick={() => setShowPriceComparison(false)}
                        className="text-sm text-gray-500"
                    >
                        Hide
                    </button>
                </div>
                <div className="space-y-4">
                    {formData.sites[0].phoneSystems?.map((system, index) => {
                        const prices = availablePrices[index] || [];
                        const currentCost = Number(system.cost);
                        const betterPrices = prices.filter(price => price.monthlyCost < currentCost);

                        return (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium">System {index + 1}</span>
                                    <span className="text-gray-600">Current: £{currentCost}/month</span>
                                </div>
                                {betterPrices.length > 0 ? (
                                    <div className="space-y-2">
                                        {betterPrices.map((price, pidx) => (
                                            <div key={pidx} className="flex justify-between items-center bg-green-50 p-2 rounded">
                                                <div>
                                                    <span className="font-medium text-green-700">
                                                        {price.provider}
                                                    </span>
                                                    <span className="text-sm text-green-600 ml-2">
                                                        Save £{(currentCost - price.monthlyCost).toFixed(2)}/month
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        handlePhoneSystemChange(index, 'cost', price.monthlyCost);
                                                        handlePhoneSystemChange(index, 'provider', price.provider);
                                                    }}
                                                    className="text-sm text-green-700 hover:text-green-800"
                                                >
                                                    Apply Price
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">No better prices available</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {loading && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2">Checking phone system prices...</span>
                </div>
            )}

            {/* Price Comparison Section */}
            {renderPriceComparison()}

            {/* Phone Systems Section */}
            <div className="space-y-4">
                {(!formData.sites[0].phoneSystems || formData.sites[0].phoneSystems.length === 0) && (
                    <div className="text-center py-8">
                        <Phone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No phone systems added yet</p>
                        <button
                            onClick={addPhoneSystem}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Phone System
                        </button>
                    </div>
                )}

                {formData.sites[0].phoneSystems?.map((system, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Phone System {index + 1}</h3>
                            <button
                                onClick={() => removePhoneSystem(index)}
                                className="text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    System Type
                                </label>
                                <select
                                    value={system.type}
                                    onChange={(e) => handlePhoneSystemChange(index, 'type', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`phoneSystem${index}`]?.type
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="">Select Type</option>
                                    {phoneSystemTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                {validationErrors[`phoneSystem${index}`]?.type && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`phoneSystem${index}`].type}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Provider
                                </label>
                                <input
                                    type="text"
                                    value={system.provider || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'provider', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`phoneSystem${index}`]?.provider
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="e.g., RingCentral, 8x8, Mitel"
                                />
                                {validationErrors[`phoneSystem${index}`]?.provider && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`phoneSystem${index}`].provider}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Users
                                </label>
                                <input
                                    type="number"
                                    value={system.users || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'users', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`phoneSystem${index}`]?.users
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    min="1"
                                    step="1"
                                />
                                {validationErrors[`phoneSystem${index}`]?.users && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`phoneSystem${index}`].users}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Handset Model
                                </label>
                                <select
                                    value={system.handsets || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'handsets', e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Handset</option>
                                    {handsetTypes.map(handset => (
                                        <option key={handset.value} value={handset.value}>
                                            {handset.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monthly Cost (£)
                                </label>
                                <input
                                    type="number"
                                    value={system.cost || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'cost', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`phoneSystem${index}`]?.cost
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                                {validationErrors[`phoneSystem${index}`]?.cost && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`phoneSystem${index}`].cost}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contract Term (months)
                                </label>
                                <input
                                    type="number"
                                    value={system.term || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'term', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`phoneSystem${index}`]?.term
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    min="0"
                                    step="1"
                                />
                                {validationErrors[`phoneSystem${index}`]?.term && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`phoneSystem${index}`].term}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Features
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {commonFeatures.map(feature => (
                                        <label key={feature.value} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={system.features?.includes(feature.value)}
                                                onChange={() => handlePhoneSystemChange(index, 'features', feature.value)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">{feature.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={system.notes || ''}
                                    onChange={(e) => handlePhoneSystemChange(index, 'notes', e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                    placeholder="Any additional information..."
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {formData.sites[0].phoneSystems?.length > 0 && (
                    <button
                        onClick={addPhoneSystem}
                        className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Another Phone System
                    </button>
                )}
            </div>

            {/* Summary Section */}
            {formData.sites[0].phoneSystems?.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">System Summary</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {formData.sites[0].phoneSystems.reduce((sum, system) =>
                                    sum + (Number(system.users) || 0), 0)} total users
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Monthly Cost</p>
                            <p className="text-lg font-bold text-blue-600">
                                £{formData.sites[0].phoneSystems.reduce((sum, system) =>
                                sum + (Number(system.cost) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Check Prices Button */}
            {formData.sites[0].phoneSystems?.length > 0 && (
                <button
                    onClick={checkPrices}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <Settings className="w-5 h-5 mr-2" />
                    )}
                    Check for Better Prices
                </button>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Phone className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Phone System Information</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Add all phone systems and handsets. We'll analyze your current setup and
                            recommend cost-effective alternatives. Consider cloud-based solutions for
                            better scalability and modern features.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhoneSystemForm;