import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader, X } from 'lucide-react';

const API_BASE = 'http://localhost:5000'; // Change to use HTTP instead of HTTPS

const AddressLookup = ({ onAddressSelect, initialAddress = null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(initialAddress);
    const searchTimeout = useRef(null);
    const componentRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (componentRef.current && !componentRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchAddresses = async (term) => {
        if (term.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('Fetching addresses for:', term); // Debug log
            const response = await fetch(
                `${API_BASE}/api/address/autocomplete/${encodeURIComponent(term)}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Response status:', response.status); // Debug log

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Response data:', data); // Debug log

            setSuggestions(data.suggestions || []);
        } catch (err) {
            console.error('Error details:', err); // Debug log
            setError('Error fetching addresses. Please try again or enter manually.');
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (value) => {
        setSearchTerm(value);
        setShowSuggestions(true);
        setError(''); // Clear any previous errors

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            searchAddresses(value);
        }, 300);
    };

    const handleAddressSelect = async (suggestion) => {
        try {
            setLoading(true);
            const response = await fetch(
                `${API_BASE}/api/address/get/${encodeURIComponent(suggestion.id)}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch address details');
            }

            const addressDetails = await response.json();

            const formattedAddress = {
                building: addressDetails.building || suggestion.address.split(',')[0],
                street: addressDetails.street || suggestion.address.split(',')[1],
                city: addressDetails.town || suggestion.address.split(',')[2],
                county: addressDetails.county,
                postcode: addressDetails.postcode || suggestion.address.split(',').pop()
            };

            setSelectedAddress(formattedAddress);
            onAddressSelect(formattedAddress);
            setShowSuggestions(false);
            setSearchTerm(suggestion.address);
        } catch (err) {
            console.error('Error fetching address details:', err);
            setError('Error fetching address details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        setSelectedAddress(null);
        setSuggestions([]);
        setError('');
        onAddressSelect(null);
    };

    const handleManualEntry = () => {
        setShowSuggestions(false);
        // Add manual entry logic here
    };

    return (
        <div className="relative" ref={componentRef}>
            <div className="relative">
                <input
                    type="text"
                    className={`w-full pl-10 pr-10 py-2 border rounded-md transition-colors
                     ${error ? 'border-red-300' : 'border-gray-300'}
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Start typing an address or postcode..."
                    value={searchTerm}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                {searchTerm && !loading && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Loader className="animate-spin text-blue-500" size={20} />
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-1 text-sm text-red-500">
                    {error}
                </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.id || index}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-start
                         ${index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''}`}
                            onClick={() => handleAddressSelect(suggestion)}
                        >
                            <MapPin className="text-gray-400 mt-1 mr-2 flex-shrink-0" size={16} />
                            <span className="text-sm text-gray-700">{suggestion.address}</span>
                        </button>
                    ))}
                </div>
            )}

            {selectedAddress && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-700">
                        {[
                            selectedAddress.building,
                            selectedAddress.street,
                            selectedAddress.city,
                            selectedAddress.county,
                            selectedAddress.postcode
                        ]
                            .filter(Boolean)
                            .join(', ')}
                    </div>
                </div>
            )}

            <button
                onClick={handleManualEntry}
                className="mt-2 text-sm text-blue-500 hover:text-blue-600"
            >
                Enter address manually
            </button>
        </div>
    );
};

export default AddressLookup;