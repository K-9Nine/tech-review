import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import debounce from 'lodash.debounce';
import { searchAddresses } from '@/lib/database';

const AddressLookup = ({ value, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const handleSearch = async (postcode) => {
        try {
            setLoading(true);
            console.log('Searching addresses for postcode:', postcode);

            const addresses = await searchAddresses(postcode);
            console.log('Address lookup results:', addresses);

            setSuggestions(addresses);
            setShowDropdown(addresses.length > 0);
            setError(addresses.length === 0 ? 'No addresses found' : null);
        } catch (error) {
            console.error('Address lookup error:', error);
            setError('Failed to find addresses');
            setSuggestions([]);
            setShowDropdown(false);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        setError(null);

        if (term.length >= 2) {
            const timeoutId = setTimeout(() => {
                handleSearch(term);
            }, 300);

            return () => clearTimeout(timeoutId);
        } else {
            setSuggestions([]);
            setShowDropdown(false);
        }
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (text) => {
            if (text.length < 3) return;
            
            setLoading(true);
            try {
                const results = await searchAddresses(text);
                setSuggestions(results);
                setShowDropdown(results.length > 0);
                setError(results.length === 0 ? 'No addresses found' : null);
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <input
                    type="text"
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start typing postcode or address..."
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (searchTerm.length >= 2) {
                            handleSearch(searchTerm);
                        }
                    }}
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-2 text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            onClick={() => onSelect({
                                postcode: suggestion.postcode,
                                address_line_1: suggestion.address_line_1,
                                town: suggestion.town,
                                uprn: suggestion.uprn
                            })}
                        >
                            <div className="text-sm">
                                <div className="font-medium">
                                    {suggestion.address}
                                </div>
                                <div className="text-gray-500">{suggestion.postcode}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AddressLookup;