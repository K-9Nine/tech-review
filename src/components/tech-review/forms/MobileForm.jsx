import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, Smartphone, ExternalLink } from 'lucide-react';
import { getMobilePrices } from '../../../api/mobileApi';

const MobileForm = ({ formData, setFormData }) => {
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [availablePrices, setAvailablePrices] = useState([]);
    const [showPriceComparison, setShowPriceComparison] = useState(false);

    const networkProviders = [
        { value: 'ee', label: 'EE' },
        { value: 'vodafone', label: 'Vodafone' },
        { value: 'o2', label: 'O2' },
        { value: 'three', label: 'Three' },
        { value: 'virgin', label: 'Virgin Mobile' },
        { value: 'other', label: 'Other' }
    ];

    const contractTypes = [
        { value: 'handset', label: 'Handset & Airtime' },
        { value: 'sim', label: 'SIM Only' },
        { value: 'business', label: 'Business Fleet' },
        { value: 'shared', label: 'Shared Data Plan' }
    ];

    const dataAllowances = [
        '1GB', '2GB', '5GB', '10GB', '20GB', '30GB',
        '50GB', '100GB', 'Unlimited'
    ];

    const handsetOptions = [
        { value: 'iphone_14', label: 'iPhone 14' },
        { value: 'iphone_13', label: 'iPhone 13' },
        { value: 'samsung_s23', label: 'Samsung S23' },
        { value: 'samsung_s22', label: 'Samsung S22' },
        { value: 'google_pixel', label: 'Google Pixel' },
        { value: 'other', label: 'Other' }
    ];

    useEffect(() => {
        if (formData.sites[0].mobileServices?.length > 0) {
            checkPrices();
        }
    }, [formData.sites[0].mobileServices]);

    const checkPrices = async () => {
        setLoading(true);
        try {
            const currentServices = formData.sites[0].mobileServices;
            const pricePromises = currentServices.map(service =>
                getMobilePrices(service.data, service.type)
            );
            const prices = await Promise.all(pricePromises);
            setAvailablePrices(prices);
            setShowPriceComparison(true);
        } catch (error) {
            console.error('Error checking mobile prices:', error);
        } finally {
            setLoading(false);
        }
    };

    const validateMobileService = (service) => {
        const errors = {};

        if (!service.provider) errors.provider = 'Network provider is required';
        if (!service.type) errors.type = 'Contract type is required';
        if (!service.connections || isNaN(service.connections) || service.connections < 1) {
            errors.connections = 'Number of connections is required';
        }
        if (!service.data) errors.data = 'Data allowance is required';
        if (!service.cost || isNaN(service.cost)) errors.cost = 'Valid monthly cost is required';
        if (!service.term || isNaN(service.term)) errors.term = 'Contract term is required';

        return errors;
    };

    const handleMobileServiceChange = (index, field, value) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].mobileServices) {
            updatedSites[0].mobileServices = [];
        }

        if (!updatedSites[0].mobileServices[index]) {
            updatedSites[0].mobileServices[index] = {};
        }

        updatedSites[0].mobileServices[index][field] = value;

        // Clear validation error when field is changed
        if (validationErrors[`mobileService${index}`]?.[field]) {
            const newErrors = { ...validationErrors };
            delete newErrors[`mobileService${index}`][field];
            setValidationErrors(newErrors);
        }

        setFormData({ ...formData, sites: updatedSites });
    };

    const addMobileService = () => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].mobileServices) {
            updatedSites[0].mobileServices = [];
        }

        updatedSites[0].mobileServices.push({
            provider: '',
            type: '',
            connections: '',
            data: '',
            cost: '',
            term: 24,
            handsets: '',
            sharedData: '',
            notes: ''
        });

        setFormData({ ...formData, sites: updatedSites });
    };

    const removeMobileService = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].mobileServices.splice(index, 1);
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
                    {formData.sites[0].mobileServices?.map((service, index) => {
                        const prices = availablePrices[index] || [];
                        const currentCost = Number(service.cost);
                        const betterPrices = prices.filter(price => price.monthlyCost < currentCost);

                        return (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium">Service {index + 1}</span>
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
                                                    onClick={() => handleMobileServiceChange(index, 'cost', price.monthlyCost)}
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
                    <span className="ml-2">Checking mobile prices...</span>
                </div>
            )}

            {/* Price Comparison Section */}
            {renderPriceComparison()}

            {/* Mobile Services Section */}
            <div className="space-y-4">
                {(!formData.sites[0].mobileServices || formData.sites[0].mobileServices.length === 0) && (
                    <div className="text-center py-8">
                        <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No mobile services added yet</p>
                        <button
                            onClick={addMobileService}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Mobile Service
                        </button>
                    </div>
                )}

                {formData.sites[0].mobileServices?.map((service, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">Mobile Service {index + 1}</h3>
                            <button
                                onClick={() => removeMobileService(index)}
                                className="text-red-500 hover:text-red-600"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Provider
                                </label>
                                <select
                                    value={service.provider}
                                    onChange={(e) => handleMobileServiceChange(index, 'provider', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.provider
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="">Select Provider</option>
                                    {networkProviders.map(provider => (
                                        <option key={provider.value} value={provider.value}>
                                            {provider.label}
                                        </option>
                                    ))}
                                </select>
                                {validationErrors[`mobileService${index}`]?.provider && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].provider}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contract Type
                                </label>
                                <select
                                    value={service.type}
                                    onChange={(e) => handleMobileServiceChange(index, 'type', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.type
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="">Select Type</option>
                                    {contractTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                {validationErrors[`mobileService${index}`]?.type && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].type}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Connections
                                </label>
                                <input
                                    type="number"
                                    value={service.connections || ''}
                                    onChange={(e) => handleMobileServiceChange(index, 'connections', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.connections
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    min="1"
                                    step="1"
                                />
                                {validationErrors[`mobileService${index}`]?.connections && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].connections}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data Allowance
                                </label>
                                <select
                                    value={service.data}
                                    onChange={(e) => handleMobileServiceChange(index, 'data', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.data
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="">Select Data Allowance</option>
                                    {dataAllowances.map(allowance => (
                                        <option key={allowance} value={allowance}>
                                            {allowance}
                                        </option>
                                    ))}
                                </select>
                                {validationErrors[`mobileService${index}`]?.data && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].data}
                                    </p>
                                )}
                            </div>

                            {service.type === 'shared' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Shared Data Pool
                                    </label>
                                    <input
                                        type="text"
                                        value={service.sharedData || ''}
                                        onChange={(e) => handleMobileServiceChange(index, 'sharedData', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 500GB shared"
                                    />
                                </div>
                            )}

                            {service.type === 'handset' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Handset Model
                                    </label>
                                    <select
                                        value={service.handsets || ''}
                                        onChange={(e) => handleMobileServiceChange(index, 'handsets', e.target.value)}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Handset</option>
                                        {handsetOptions.map(handset => (
                                            <option key={handset.value} value={handset.value}>
                                                {handset.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monthly Cost (£)
                                </label>
                                <input
                                    type="number"
                                    value={service.cost || ''}
                                    onChange={(e) => handleMobileServiceChange(index, 'cost', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.cost
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                />
                                {validationErrors[`mobileService${index}`]?.cost && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].cost}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contract Term (months)
                                </label>
                                <input
                                    type="number"
                                    value={service.term || ''}
                                    onChange={(e) => handleMobileServiceChange(index, 'term', e.target.value)}
                                    className={`w-full rounded-md border ${
                                        validationErrors[`mobileService${index}`]?.term
                                            ? 'border-red-300'
                                            : 'border-gray-300'
                                    } px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    min="0"
                                    step="1"
                                />
                                {validationErrors[`mobileService${index}`]?.term && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {validationErrors[`mobileService${index}`].term}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={service.notes || ''}
                                    onChange={(e) => handleMobileServiceChange(index, 'notes', e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="2"
                                    placeholder="Any additional information..."
                                />
                            </div>
                        </div>
                    </div>
                ))}

                {formData.sites[0].mobileServices?.length > 0 && (
                    <button
                        onClick={addMobileService}
                        className="flex items-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Another Mobile Service
                    </button>
                )}
            </div>

            {/* Summary Section */}
            {formData.sites[0].mobileServices?.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">Service Summary</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {formData.sites[0].mobileServices.reduce((sum, service) =>
                                    sum + (Number(service.connections) || 0), 0)} total connections
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Monthly Cost</p>
                            <p className="text-lg font-bold text-blue-600">
                                £{formData.sites[0].mobileServices.reduce((sum, service) =>
                                sum + (Number(service.cost) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Check Prices Button */}
            {formData.sites[0].mobileServices?.length > 0 && (
                <button
                    onClick={checkPrices}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center"
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                        <Smartphone className="w-5 h-5 mr-2" />
                    )}
                    Check for Better Prices
                </button>
            )}

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Mobile Service Information</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Add all mobile services and devices. We'll check for better prices and plans
                            based on your usage. Consider shared data plans for multiple connections to
                            optimize costs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileForm;