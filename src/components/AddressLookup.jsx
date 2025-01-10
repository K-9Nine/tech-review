import { useState, useEffect } from 'react';
import { lookupAddress } from '../lib/api';
import { Loader2, X } from 'lucide-react';

export function AddressLookup({ siteIndex, formData, setFormData }) {
    const [search, setSearch] = useState('');
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('AddressLookup props:', { siteIndex, formData });
    }, [siteIndex, formData]);

    const handleSearch = async (e) => {
        e.preventDefault();
        console.log('Search initiated:', search);

        if (!search.trim()) {
            setError('Please enter a search term');
            return;
        }

        setLoading(true);
        setError(null);
        setAddresses([]);

        try {
            console.log('Making API request for:', search);
            const data = await lookupAddress(search);
            console.log('API response:', data);

            if (!data?.results) {
                console.error('Invalid response format:', data);
                throw new Error('Invalid response format from server');
            }

            setAddresses(data.results);
            
            if (data.results.length === 0) {
                console.log('No addresses found in response');
                setError('No addresses found');
            } else {
                console.log(`Found ${data.results.length} addresses`);
            }
        } catch (error) {
            console.error('Search error:', error);
            setError(error.message || 'Failed to search for addresses');
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSelect = (address) => {
        console.log('Raw address data:', address);

        // Only store what we need for display and the UPRN for API calls
        const updatedSites = [...formData.sites];
        updatedSites[siteIndex].address = {
            uprn: address.UPRN,
            // Keep these just for display purposes
            display_address: address.ADDRESS,
            town: address.POST_TOWN,
            postcode: address.POSTCODE
        };

        console.log('Updated address object:', updatedSites[siteIndex].address);
        setFormData({ ...formData, sites: updatedSites });
        setAddresses([]);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Address
            </label>
            <p className="text-sm text-gray-500 mb-2">
                Enter a postcode or address to search
            </p>
            <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Enter postcode or address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="p-3 mb-4 text-red-700 bg-red-100 border border-red-300 rounded-md">
                    {error}
                </div>
            )}

            {addresses.length > 0 && (
                <ul className="space-y-2">
                    {addresses.map((address, index) => (
                        <li 
                            key={`${address.UPRN}-${index}`}
                            onClick={() => handleAddressSelect(address)}
                            className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                        >
                            <div className="font-medium">{address.ADDRESS}</div>
                            <div className="text-sm text-gray-600">
                                {address.POST_TOWN}, {address.POSTCODE}
                                {address.STATUS !== 'APPROVED' && (
                                    <span className="ml-2 text-amber-600">
                                        ({address.STATUS})
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {formData.sites[siteIndex].address && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md relative">
                    <button
                        onClick={() => {
                            const updatedSites = [...formData.sites];
                            updatedSites[siteIndex].address = null;
                            setFormData({ ...formData, sites: updatedSites });
                        }}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <h4 className="font-medium mb-2">Selected Address:</h4>
                    <p>{formData.sites[siteIndex].address.address_line_1}</p>
                    <p>{formData.sites[siteIndex].address.town}, {formData.sites[siteIndex].address.postcode}</p>
                    {process.env.NODE_ENV === 'development' && (
                        <pre className="mt-2 text-xs text-gray-500">
                            {JSON.stringify(formData.sites[siteIndex].address, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
} 