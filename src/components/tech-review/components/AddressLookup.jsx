import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_KEY = '9Y3EkqpJr0GAkwmk0drSLg44309';

const AddressLookup = ({ onSelect }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const debounceTimeout = useRef(null);

    const searchAddresses = async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(
                `/address-api/autocomplete/${searchQuery}?api-key=${API_KEY}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            setSuggestions(response.data.suggestions || []);
        } catch (error) {
            console.error('Address lookup error:', error);
            setError('Failed to fetch address suggestions');
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
            const response = await axios.get(
                `/address-api/get/${suggestion.id}?api-key=${API_KEY}`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const addressData = response.data;
            const formattedAddress = {
                building: addressData.building_number || addressData.building_name || '',
                street: addressData.thoroughfare || addressData.line_1 || '',
                city: addressData.town_or_city || '',
                county: addressData.county || '',
                postcode: addressData.postcode || suggestion.postcode || '',
                formatted: addressData.formatted_address?.join(', ') || ''
            };

            if (typeof onSelect === 'function') {
                onSelect(formattedAddress);
            }

            setQuery('');
            setSuggestions([]);
        } catch (error) {
            console.error('Error fetching address details:', error);
            setError('Error fetching address details');
        } finally {
            setLoading(false);
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

                {error && (
                    <div className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {error}
                    </div>
                )}

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