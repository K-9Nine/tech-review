import React, { useState } from 'react';
import { Trash2, Network, AlertCircle, MapPin, Plus, X, PoundSterling } from 'lucide-react';
import AddressLookup from '../components/AddressLookup';

const NetworkForm = ({ formData, setFormData }) => {
    const [showConnectionForm, setShowConnectionForm] = useState(false);
    const [currentSiteId, setCurrentSiteId] = useState(null);
    const [newConnection, setNewConnection] = useState({
        type: '',
        speed: '',
        cost: '',
        backup: false,
        term: '36'
    });

    const formatAddress = (address) => {
        if (!address) return '';
        const parts = [];
        if (address.building) parts.push(address.building);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.postcode) parts.push(address.postcode);
        return parts.join(', ');
    };

    // Site Management
    const removeSite = (siteId) => {
        const updatedSites = formData.sites.filter(site => site.id !== siteId);
        setFormData({
            ...formData,
            sites: updatedSites
        });
    };

    // Connection Management
    const addConnection = () => {
        if (!currentSiteId || !newConnection.type || !newConnection.speed || !newConnection.cost) return;

        const updatedSites = formData.sites.map(site => {
            if (site.id === currentSiteId) {
                return {
                    ...site,
                    connections: [...(site.connections || []), { ...newConnection }]
                };
            }
            return site;
        });

        setFormData({
            ...formData,
            sites: updatedSites
        });

        // Reset form
        setNewConnection({
            type: '',
            speed: '',
            cost: '',
            backup: false,
            term: '36'
        });
        setShowConnectionForm(false);
        setCurrentSiteId(null);
    };

    const removeConnection = (siteId, connectionIndex) => {
        const updatedSites = formData.sites.map(site => {
            if (site.id === siteId) {
                const updatedConnections = site.connections.filter((_, idx) => idx !== connectionIndex);
                return {
                    ...site,
                    connections: updatedConnections
                };
            }
            return site;
        });

        setFormData({
            ...formData,
            sites: updatedSites
        });
    };

    // Helper functions
    const calculateSiteCosts = (site) => {
        const connections = site.connections || [];
        return {
            totalConnections: connections.length,
            backupLinks: connections.filter(c => c.backup).length,
            totalSpeed: connections.reduce((total, conn) => total + parseFloat(conn.speed), 0),
            monthlyCost: connections.reduce((total, conn) => total + parseFloat(conn.cost), 0),
            annualCost: connections.reduce((total, conn) => total + (parseFloat(conn.cost) * 12), 0)
        };
    };

    const calculateTotalCosts = () => {
        return (formData.sites || []).reduce((totals, site) => {
            const costs = calculateSiteCosts(site);
            return {
                sites: totals.sites + 1,
                connections: totals.connections + costs.totalConnections,
                backups: totals.backups + costs.backupLinks,
                speed: totals.speed + costs.totalSpeed,
                monthlyCost: totals.monthlyCost + costs.monthlyCost,
                annualCost: totals.annualCost + costs.annualCost
            };
        }, { sites: 0, connections: 0, backups: 0, speed: 0, monthlyCost: 0, annualCost: 0 });
    };

    return (
        <div className="space-y-6">
            {/* Add New Site Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Network Requirements</h3>
                    <div className="text-sm text-gray-500">
                        {formData.sites?.length || 0} sites added
                    </div>
                </div>
                <AddressLookup formData={formData} setFormData={setFormData} />
            </div>

            {/* Existing Sites Display */}
            {formData.sites?.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Added Sites</h3>
                    <div className="space-y-4">
                        {formData.sites.map((site) => (
                            <div key={site.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="w-5 h-5 text-gray-400" />
                                            <span className="font-medium">
                                                {site.formattedAddress || formatAddress(site.address)}
                                            </span>
                                        </div>

                                        {/* Connections List */}
                                        <div className="pl-7 text-sm text-gray-600">
                                            {site.connections?.length ? (
                                                <div className="space-y-1">
                                                    {site.connections.map((conn, idx) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-4">
                                                                <Network className="w-4 h-4" />
                                                                <span>
                                                                    {conn.type} - {conn.speed}Mbps
                                                                    {conn.backup && " (Backup)"}
                                                                </span>
                                                                <div className="text-gray-500">
                                                                    £{parseFloat(conn.cost).toFixed(2)}/month
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => removeConnection(site.id, idx)}
                                                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                                                    <span>No connections configured</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Site Actions */}
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                setCurrentSiteId(site.id);
                                                setShowConnectionForm(true);
                                            }}
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-150"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => removeSite(site.id)}
                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Site Summary */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="grid grid-cols-5 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500">Connections:</span>{' '}
                                            <span className="font-medium">{site.connections?.length || 0}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Backup Links:</span>{' '}
                                            <span className="font-medium">
                                                {site.connections?.filter(c => c.backup)?.length || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Total Speed:</span>{' '}
                                            <span className="font-medium">
                                                {calculateSiteCosts(site).totalSpeed}Mbps
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Monthly Cost:</span>{' '}
                                            <span className="font-medium">
                                                £{calculateSiteCosts(site).monthlyCost.toFixed(2)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Annual Cost:</span>{' '}
                                            <span className="font-medium">
                                                £{calculateSiteCosts(site).annualCost.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Network Summary */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-base font-medium mb-4">Network Summary</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-blue-600">Total Sites</div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            {calculateTotalCosts().sites}
                                        </div>
                                    </div>
                                    <MapPin className="w-8 h-8 text-blue-500" />
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-purple-600">Total Speed</div>
                                        <div className="text-2xl font-bold text-purple-700">
                                            {calculateTotalCosts().speed}Mbps
                                        </div>
                                    </div>
                                    <Network className="w-8 h-8 text-purple-500" />
                                </div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-green-600">Monthly Cost</div>
                                        <div className="text-2xl font-bold text-green-700">
                                            £{calculateTotalCosts().monthlyCost.toFixed(2)}
                                        </div>
                                    </div>
                                    <PoundSterling className="w-8 h-8 text-green-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Connection Modal */}
            {showConnectionForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Add Connection</h3>
                            <button
                                onClick={() => setShowConnectionForm(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Connection Type
                                </label>
                                <select
                                    value={newConnection.type}
                                    onChange={(e) => setNewConnection({...newConnection, type: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">Select Type</option>
                                    <option value="Ethernet">Ethernet</option>
                                    <option value="Dark Fibre">Dark Fibre</option>
                                    <option value="Broadband">Broadband</option>
                                    <option value="4G">4G</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Speed (Mbps)
                                </label>
                                <input
                                    type="number"
                                    value={newConnection.speed}
                                    onChange={(e) => setNewConnection({...newConnection, speed: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                    min="0"
                                    step="1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Monthly Cost (£)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">£</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={newConnection.cost}
                                        onChange={(e) => setNewConnection({...newConnection, cost: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contract Term
                                </label>
                                <select
                                    value={newConnection.term}
                                    onChange={(e) => setNewConnection({...newConnection, term: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="12">12 Months</option>
                                    <option value="36">36 Months</option>
                                    <option value="60">60 Months</option>
                                </select>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="backup"
                                    checked={newConnection.backup}
                                    onChange={(e) => setNewConnection({...newConnection, backup: e.target.checked})}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <label htmlFor="backup" className="ml-2 text-sm text-gray-700">
                                    Backup Connection
                                </label>
                            </div>

                            {/* Validation Error Messages */}
                            {(!newConnection.type || !newConnection.speed || !newConnection.cost) && (
                                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    <div className="flex items-center space-x-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Please fill in all required fields:</span>
                                    </div>
                                    <ul className="list-disc ml-5 mt-1">
                                        {!newConnection.type && <li>Connection type is required</li>}
                                        {!newConnection.speed && <li>Speed is required</li>}
                                        {!newConnection.cost && <li>Monthly cost is required</li>}
                                    </ul>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowConnectionForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addConnection}
                                    disabled={!newConnection.type || !newConnection.speed || !newConnection.cost}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                                >
                                    Add Connection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NetworkForm;