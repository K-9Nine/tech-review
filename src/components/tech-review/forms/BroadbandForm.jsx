import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Loader2, Wifi, ExternalLink, Edit2, Building2 } from 'lucide-react';
import {
    checkZenAvailability,
    getZenPrices,
    formatPrice
} from '../../../api/zenAuth';
import ZenAddressLookup from '../components/ZenAddressLookup';

const BroadbandForm = ({ formData, setFormData }) => {
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [editingIndex, setEditingIndex] = useState(null);

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

    const validateBroadband = (broadband) => {
        const errors = {};

        if (!broadband.type) errors.type = 'Broadband type is required';
        if (!broadband.speed) errors.speed = 'Speed is required';
        if (!broadband.provider) errors.provider = 'Provider is required';
        if (!broadband.cost || isNaN(broadband.cost)) errors.cost = 'Valid monthly cost is required';
        if (!broadband.term || isNaN(broadband.term)) errors.term = 'Contract term is required';
        if (!broadband.address) errors.address = 'Installation address is required';

        return errors;
    };

    const handleAddressSelect = async (index, address) => {
        try {
            // Debug log the incoming address data
            console.log('Full address data received:', address);

            const updatedSites = [...formData.sites];
            if (!updatedSites[0].broadband[index]) {
                updatedSites[0].broadband[index] = {};
            }
            updatedSites[0].broadband[index].address = address;
            setFormData({ ...formData, sites: updatedSites });

            if (address?.addressReferenceNumber && address?.districtCode) {
                setLoading(true);
                try {
                    console.log('Checking availability with:', {
                        addressReferenceNumber: address.addressReferenceNumber,
                        districtCode: address.districtCode
                    });

                    const availability = await checkZenAvailability(
                        address.addressReferenceNumber,
                        address.districtCode
                    );

                    // Store the results
                    const updatedSitesWithZen = [...formData.sites];
                    updatedSitesWithZen[0].broadband[index].zenAvailability = availability;
                    setFormData({ ...formData, sites: updatedSitesWithZen });

                } catch (error) {
                    console.error('Zen API Error:', {
                        message: error.message,
                        response: error.response?.data,
                    });
                } finally {
                    setLoading(false);
                }
            } else {
                console.warn('Missing required data for Zen check:', {
                    addressReferenceNumber: address?.addressReferenceNumber,
                    districtCode: address?.districtCode
                });
            }
        } catch (error) {
            console.error('Error in handleAddressSelect:', error);
            setLoading(false);
        }
    };

    const handleSelectService = (index, technology, pricing) => {
        const updatedSites = [...formData.sites];
        if (!updatedSites[0].broadband[index]) {
            updatedSites[0].broadband[index] = {};
        }

        updatedSites[0].broadband[index] = {
            ...updatedSites[0].broadband[index],
            type: technology.type,
            speed: `${technology.downloadSpeed}/${technology.uploadSpeed}Mbps`,
            provider: 'Zen',
            cost: pricing?.monthlyPrice || '',
            term: pricing?.contractLength || 12,
            selectedZenService: {
                technology: technology.technology,
                downloadSpeed: technology.downloadSpeed,
                uploadSpeed: technology.uploadSpeed,
                monthlyPrice: pricing?.monthlyPrice,
                contractLength: pricing?.contractLength
            }
        };

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
            notes: '',
            address: null,
            zenAvailability: null,
            selectedZenService: null
        });

        setFormData({ ...formData, sites: updatedSites });
    };

    const removeBroadband = (index) => {
        const updatedSites = [...formData.sites];
        updatedSites[0].broadband.splice(index, 1);
        setFormData({ ...formData, sites: updatedSites });
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

        if (validationErrors[`broadband${index}`]?.[field]) {
            const newErrors = { ...validationErrors };
            delete newErrors[`broadband${index}`][field];
            setValidationErrors(newErrors);
        }

        if (field === 'type') {
            updatedSites[0].broadband[index].speed = '';
        }

        setFormData({ ...formData, sites: updatedSites });
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

    return (
        <div className="space-y-6">
            {loading && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2">Checking Zen availability...</span>
                </div>
            )}

            {/* Broadband Services List */}
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

                        {/* Address Section */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Installation Address
                            </label>
                            <div className="bg-white rounded-md border border-gray-300 p-4">
                                {broadband.address ? (
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 text-gray-900">
                                            <Building2 className="w-4 h-4" />
                                            <span className="font-medium">
                                                {formatAddress(broadband.address)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleBroadbandChange(index, 'address', null)}
                                            className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <ZenAddressLookup
                                        onSelect={(address) => handleAddressSelect(index, address)}
                                        showSelected={false}
                                    />
                                )}
                            </div>
                            {validationErrors[`broadband${index}`]?.address && (
                                <p className="mt-1 text-sm text-red-600 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {validationErrors[`broadband${index}`].address}
                                </p>
                            )}
                        </div>

                        {/* Zen Availability Section */}
                        {broadband.zenAvailability && (
                            <div className="mb-4 bg-white rounded-lg border p-4">
                                <div className="flex items-center mb-3">
                                    <Wifi className="w-5 h-5 text-blue-500 mr-2" />
                                    <h4 className="font-medium">Available Zen Services</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {broadband.zenAvailability.technologies?.map((tech, techIndex) => (
                                        <div key={techIndex} className="bg-gray-50 p-3 rounded border">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="font-medium">{tech.technology}</h5>
                                                    <p className="text-sm text-gray-600">
                                                        {tech.downloadSpeed} down / {tech.uploadSpeed} up
                                                    </p>
                                                </div>
                                                {tech.prices?.[0] && (
                                                    <div className="text-right">
                                                        <p className="font-medium">
                                                            {formatPrice(tech.prices[0].monthlyPrice)}/month
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {tech.prices[0].contractLength} month contract
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleSelectService(index, tech, tech.prices?.[0])}
                                                className={`mt-2 w-full px-3 py-1 rounded text-sm ${
                                                    broadband.selectedZenService?.technology === tech.technology
                                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                                }`}
                                            >
                                                {broadband.selectedZenService?.technology === tech.technology
                                                    ? 'Selected'
                                                    : 'Select Service'
                                                }
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Service Details Form */}
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

            {/* Summary Section */}
            {formData.sites[0].broadband?.length > 0 && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Service Summary</h3>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Monthly Cost</p>
                            <p className="text-lg font-bold text-blue-600">
                                {formatPrice(formData.sites[0].broadband.reduce((sum, service) =>
                                    sum + (Number(service.cost) || 0), 0))}
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
                            to include installation addresses, contract terms, and monthly costs for accurate assessment.
                        </p>
                    </div>
                </div>
            </div>

            {/* Validation Messages */}
            {Object.keys(validationErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Please check the following:</h3>
                            <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                                {Object.values(validationErrors).map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Text */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start">
                    <ExternalLink className="w-5 h-5 text-gray-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-gray-800">Need Help?</h3>
                        <p className="mt-1 text-sm text-gray-600">
                            If you need assistance determining the best broadband options for your business,
                            our team can help analyze your requirements and recommend suitable solutions.
                            Contact your account manager or support team for personalized guidance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BroadbandForm;