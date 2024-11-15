import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';

const AddressLookup = ({ onSelect, showSelected = true }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const debounceTimeout = useRef(null);

    const searchAddresses = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `https://api.getaddress.io/autocomplete/${searchQuery}?api-key=${import.meta.env.VITE_GETADDRESS_API_KEY}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            setError('Error fetching address suggestions');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        if (query.length >= 3) {
            debounceTimeout.current = setTimeout(() => {
                searchAddresses(query);
            }, 300);
        } else {
            setSuggestions([]);
        }

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [query]);

    const handleSuggestionClick = async (suggestion) => {
        try {
            setLoading(true);
            const response = await fetch(
                `https://api.getaddress.io/get/${suggestion.id}?api-key=${import.meta.env.VITE_GETADDRESS_API_KEY}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch address details');
            }

            const data = await response.json();

            const formattedAddress = {
                building: data.building_number || data.building_name || '',
                street: data.thoroughfare || data.line_1 || '',
                city: data.town_or_city || '',
                county: data.county || '',
                postcode: data.postcode || suggestion.postcode || '',
                formatted: data.formatted_address?.join(', ') || ''
            };

            setSelectedAddress(formattedAddress);
            if (onSelect) {
                onSelect(formattedAddress);
            }
        } catch (error) {
            setError('Error fetching address details');
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setQuery(''); // Clear the input
            setSuggestions([]); // Clear suggestions
        }
    };

    return (
        <div className="w-full">
            <div className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start typing an address or postcode..."
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {loading ? (
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {error}
                    </div>
                )}

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none"
                            >
                                {suggestion.address}
                            </button>
                        ))}
                    </div>
                )}

                {/* Minimum Characters Notice */}
                {query.length > 0 && query.length < 3 && (
                    <p className="mt-2 text-sm text-gray-500">
                        Please enter at least 3 characters to search
                    </p>
                )}
            </div>
        </div>
    );
};

export default AddressLookup;