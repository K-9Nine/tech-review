import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

const AddressLookup = ({ siteIndex, formData, setFormData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/address-lookup?search=${encodeURIComponent(searchTerm)}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                setResults(data.data);
            } else {
                setResults([]);
                setError('No addresses found');
            }
        } catch (err) {
            console.error('Address lookup error:', err);
            setError(err.message || 'Failed to search addresses');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (address) => {
        console.log('Selected address from OS API:', address);
        
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].address = {
            uprn: address.UPRN,
            address_line_1: address.ADDRESS,
            town: address.POST_TOWN,
            postcode: address.POSTCODE,
            latitude: parseFloat(address.LAT),
            longitude: parseFloat(address.LNG)
        };
        
        console.log('Transformed address:', updatedSites[siteIndex].address);
        
        setFormData({ ...formData, sites: updatedSites });
        setResults([]);
        setSearchTerm('');
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Address
                </label>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Enter postcode or address"
                            className="w-full border rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !searchTerm}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}

            {results.length > 0 && (
                <div className="border rounded-md divide-y">
                    {results.map((address) => (
                        <button
                            key={address.uprn}
                            onClick={() => handleSelect(address)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-start gap-3"
                        >
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-medium">{address.address_line_1}</div>
                                <div className="text-sm text-gray-500">
                                    {address.town}, {address.postcode}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {formData.sites[siteIndex].address && (
                <div className="bg-gray-50 rounded-md p-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <div className="font-medium">Selected Address:</div>
                            <div>{formData.sites[siteIndex].address.address_line_1}</div>
                            <div className="text-sm text-gray-500">
                                {formData.sites[siteIndex].address.town}, {formData.sites[siteIndex].address.postcode}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddressLookup;