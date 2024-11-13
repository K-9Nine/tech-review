import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, AlertCircle, MapPin } from 'lucide-react';

const AddressLookup = ({ formData, setFormData }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // UK Postcode Regex
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

    const fetchAddresses = async (postcode) => {
        try {
            const API_KEY = import.meta.env.VITE_GETADDRESS_API_KEY;
            const response = await fetch(
                `https://api.getaddress.io/find/${encodeURIComponent(postcode)}?api-key=${API_KEY}&expand=true`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (response.status === 429) {
                throw new Error('Too many requests. Please try again later.');
            }

            if (!response.ok) {
                throw new Error('Failed to fetch addresses');
            }

            const data = await response.json();

            if (data.addresses && data.addresses.length > 0) {
                return data.addresses.map((address, index) => ({
                    id: `${postcode}-${index}`,
                    building: address.building_number || address.building_name || '',
                    street: address.thoroughfare || address.street || '',
                    city: address.town_or_city || address.locality || '',
                    county: address.county || '',
                    postcode: postcode,
                    latitude: data.latitude || '',
                    longitude: data.longitude || '',
                    formatted: address.formatted_address?.join(', ') || '',
                    line1: address.line_1 || '',
                    line2: address.line_2 || '',
                    displayAddress: address.formatted_address?.[0] || ''
                }));
            }
            return [];
        } catch (error) {
            console.error('Address lookup error:', error);
            throw error;
        }
    };

    const handleSearch = async (searchValue) => {
        if (!searchValue) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const cleanSearch = searchValue.trim().toUpperCase();

            // If it's a complete postcode, get full addresses
            if (postcodeRegex.test(cleanSearch)) {
                const addresses = await fetchAddresses(cleanSearch);
                setSuggestions(addresses);
            }
            // Otherwise, use autocomplete
            else if (cleanSearch.length >= 2) {
                const API_KEY = import.meta.env.VITE_GETADDRESS_API_KEY;
                const response = await fetch(
                    `https://api.getaddress.io/autocomplete/${encodeURIComponent(cleanSearch)}?api-key=${API_KEY}&all=true&fuzzy=true`,
                    {
                        headers: {
                            'Accept': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch suggestions');
                }

                const data = await response.json();

                // Format autocomplete suggestions
                const formattedSuggestions = data.suggestions?.map(suggestion => ({
                    id: suggestion.id,
                    postcode: suggestion.postcode,
                    displayAddress: suggestion.address,
                    isPostcode: suggestion.postcode_only === true
                })) || [];

                setSuggestions(formattedSuggestions);
            }

            setShowSuggestions(true);
            setSelectedIndex(-1);

        } catch (error) {
            console.error('Search error:', error);
            setError(error.message || 'Failed to fetch addresses. Please try again.');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setError(null);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            handleSearch(value);
        }, 300);
    };

    const handleSuggestionClick = async (suggestion) => {
        // If it's a postcode suggestion, fetch full addresses
        if (suggestion.isPostcode) {
            setSearchTerm(suggestion.postcode);
            const addresses = await fetchAddresses(suggestion.postcode);
            setSuggestions(addresses);
            return;
        }

        // If it's an address suggestion with a postcode, create site
        if (suggestion.postcode && !suggestion.isPostcode) {
            handleAddressSelect(suggestion);
        }
    };

    const handleAddressSelect = (address) => {
        const newSite = {
            id: crypto.randomUUID(),
            address: {
                building: address.building,
                street: address.street,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                county: address.county,
                postcode: address.postcode,
                latitude: address.latitude,
                longitude: address.longitude
            },
            formattedAddress: address.formatted || address.displayAddress,
            connections: []
        };

        setFormData(prev => ({
            ...prev,
            sites: [...(prev.sites || []), newSite]
        }));

        // Reset form
        setSearchTerm('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                break;
            default:
                break;
        }
    };

    // Refs and cleanup
    const searchTimeout = useRef(null);
    const componentRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (componentRef.current && !componentRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    return (
        <div ref={componentRef} className="relative">
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by postcode or start typing an address..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10"
                    autoComplete="off"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-gray-400" />
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none space-y-1 
                                ${index === selectedIndex ? 'bg-gray-50' : ''}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{suggestion.displayAddress}</p>
                                    {suggestion.city && (
                                        <p className="text-sm text-gray-500">
                                            {[suggestion.city, suggestion.postcode].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                                {suggestion.isPostcode && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Postcode
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressLookup;