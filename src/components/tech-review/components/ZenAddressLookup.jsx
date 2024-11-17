import React, { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ZenAddressLookup = ({ onSelect, showSelected = true }) => {
    const [postcode, setPostcode] = useState('');
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const CLIENT_ID = 'ws-api-amvia';
    const CLIENT_SECRET = 'vpvDuEEpSqd2GkmbkeLTXibNNffvhnGcKT69bkgMoV';

    const getOAuthToken = async () => {
        try {
            const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
            const body = 'grant_type=client_credentials&scope=read-exchange indirect-availability';

            const response = await axios.post('/connect/token', body, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Cache-Control': 'no-cache',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            return response.data.access_token;
        } catch (err) {
            console.error('OAuth error:', err);
            throw new Error('Authentication failed');
        }
    };

    const searchAddresses = async () => {
        if (!postcode.trim()) {
            setError('Please enter a postcode');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = await getOAuthToken();
            console.log('Got token, searching addresses...');

            const response = await axios.get(`/zen-api/self-service/api/address/search?postcode=${encodeURIComponent(postcode.trim())}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('Address search response:', response.data);

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid response format from address search');
            }

            const validAddresses = response.data
                .filter(addr => {
                    return addr.addressReference?.addressReferenceNumber &&
                        addr.addressReference?.districtCode &&
                        addr.address?.thoroughfareName &&
                        addr.address?.postCode;
                })
                .sort((a, b) => {
                    // First sort by organization name if present
                    if (a.address.organisationName && !b.address.organisationName) return -1;
                    if (!a.address.organisationName && b.address.organisationName) return 1;

                    // Then sort by building number
                    const numA = parseInt(a.address.thoroughfareNumber) || 0;
                    const numB = parseInt(b.address.thoroughfareNumber) || 0;
                    return numA - numB;
                });

            if (validAddresses.length === 0) {
                setError('No addresses found for this postcode');
                setAddresses([]);
                return;
            }

            setAddresses(validAddresses);

        } catch (err) {
            console.error('Address lookup error:', err);
            setError(err.response?.data?.message || err.message || 'Error fetching addresses. Please try again.');
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePostcodeChange = (e) => {
        const value = e.target.value.toUpperCase();
        setPostcode(value);
        if (error) setError('');
    };

    const formatAddressDisplay = (addr) => {
        const parts = [];

        // Add organisation name if present
        if (addr.address.organisationName) {
            parts.push(addr.address.organisationName);
        }

        // Add sub premises if present
        if (addr.address.subPremises) {
            parts.push(addr.address.subPremises);
        }

        // Add building identifier (number or name)
        if (addr.address.thoroughfareNumber || addr.address.premisesName) {
            parts.push(addr.address.thoroughfareNumber || addr.address.premisesName);
        }

        // Add street name
        if (addr.address.thoroughfareName) {
            parts.push(addr.address.thoroughfareName);
        }

        // Add locality if different from post town
        if (addr.address.locality && addr.address.locality !== addr.address.postTown) {
            parts.push(addr.address.locality);
        }

        // Add post town
        if (addr.address.postTown) {
            parts.push(addr.address.postTown);
        }

        // Add post code
        if (addr.address.postCode) {
            parts.push(addr.address.postCode);
        }

        return parts.join(', ');
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <div className="flex-1">
                    <input
                        type="text"
                        value={postcode}
                        onChange={handlePostcodeChange}
                        placeholder="Enter postcode"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={searchAddresses}
                    disabled={loading || !postcode.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Searching...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            <span>Search</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="flex items-center text-red-600 text-sm bg-red-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {addresses.length > 0 && (
                <div className="mt-2">
                    <select
                        onChange={(e) => {
                            const selectedAddress = addresses[e.target.value];
                            if (selectedAddress) {
                                console.log('Raw selected address:', selectedAddress);
                                const formattedAddress = {
                                    building: selectedAddress.address.thoroughfareNumber || selectedAddress.address.premisesName,
                                    street: selectedAddress.address.thoroughfareName,
                                    city: selectedAddress.address.postTown,
                                    postcode: selectedAddress.address.postCode,
                                    addressReferenceNumber: selectedAddress.addressReference.addressReferenceNumber,
                                    districtCode: selectedAddress.addressReference.districtCode
                                };
                                console.log('Formatted address:', formattedAddress);
                                onSelect(formattedAddress);
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                    >
                        <option value="" disabled>Select an address</option>
                        {addresses.map((addr, index) => (
                            <option key={addr.addressReference.addressReferenceNumber || index} value={index}>
                                {formatAddressDisplay(addr)}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default ZenAddressLookup;