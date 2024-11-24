import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { ChevronUp, ChevronDown, Search } from 'lucide-react';
import { usePricing } from '../../contexts/PricingContext';

export const initialPrices = [
    {
        id: 1,
        serviceType: "ADSL2+ Bband Only",
        monthlyRental: {
            months12: 18.00,
            months24: 19.50,
            months36: 25.00
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 45.00
        },
        router: "Zyxel VMG-1312",
        notes: ""
    },
    {
        id: 2,
        serviceType: "ADSL2+ w/PSTN Lvl2",
        monthlyRental: {
            months12: 27.00,
            months24: 28.50,
            months36: 34.00
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 45.00
        },
        router: "Zyxel VMG-1312",
        notes: ""
    },
    {
        id: 3,
        serviceType: "40/10 FTTC Bband Only",
        monthlyRental: {
            months12: 24.00,
            months24: 25.50,
            months36: 38.00
        },
        installFee: {
            months12: 0.00,
            months24: 0.00,
            months36: 0.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 4,
        serviceType: "40/10 FTTC w/phone line",
        monthlyRental: {
            months12: 34.00,
            months24: 35.50,
            months36: 38.00
        },
        installFee: {
            months12: 0.00,
            months24: 39.00,
            months36: 69.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 5,
        serviceType: "80/20 FTTC Bband Only",
        monthlyRental: {
            months12: 25.00,
            months24: 26.50,
            months36: 29.00
        },
        installFee: {
            months12: 0.00,
            months24: 0.00,
            months36: 0.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 6,
        serviceType: "80/20 FTTC w/phone line",
        monthlyRental: {
            months12: 35.00,
            months24: 36.50,
            months36: 39.00
        },
        installFee: {
            months12: 0.00,
            months24: 39.00,
            months36: 69.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 7,
        serviceType: "80/20 SoGEA",
        monthlyRental: {
            months12: 30.00,
            months24: 31.00,
            months36: 35.00
        },
        installFee: {
            months12: 25.00,
            months24: 45.00,
            months36: 65.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 8,
        serviceType: "160/30 Gfast",
        monthlyRental: {
            months12: 43.50,
            months24: 45.50,
            months36: null
        },
        installFee: {
            months12: 175.00,
            months24: 175.00,
            months36: null
        },
        router: "Zyxel DX3301",
        notes: ""
    },
    {
        id: 9,
        serviceType: "330/50 Gfast",
        monthlyRental: {
            months12: 48.50,
            months24: 50.50,
            months36: null
        },
        installFee: {
            months12: 175.00,
            months24: 175.00,
            months36: null
        },
        router: "Zyxel DX3301",
        notes: ""
    },
    {
        id: 10,
        serviceType: "80/20 FTTP",
        monthlyRental: {
            months12: 42.00,
            months24: 44.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "80Mbps-FTTP-Business-Broadband-GBP-Monthly"
    },
    {
        id: 11,
        serviceType: "115/20 FTTP",
        monthlyRental: {
            months12: 44.00,
            months24: 46.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 12,
        serviceType: "160/30 FTTP",
        monthlyRental: {
            months12: 46.00,
            months24: 48.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 13,
        serviceType: "220/30 FTTP",
        monthlyRental: {
            months12: 50.00,
            months24: 52.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 14,
        serviceType: "330/50 FTTP",
        monthlyRental: {
            months12: 53.00,
            months24: 55.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 15,
        serviceType: "550/75 FTTP",
        monthlyRental: {
            months12: 57.00,
            months24: 59.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 16,
        serviceType: "1000/115 FTTP",
        monthlyRental: {
            months12: 65.00,
            months24: 67.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 17,
        serviceType: "0.5/0.5 SoGEA",
        monthlyRental: {
            months12: 25.00,
            months24: 26.00,
            months36: 30.00
        },
        installFee: {
            months12: 25.00,
            months24: 45.00,
            months36: 65.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 18,
        serviceType: "40/10 SoGEA",
        monthlyRental: {
            months12: 28.00,
            months24: 29.00,
            months36: 33.00
        },
        installFee: {
            months12: 25.00,
            months24: 45.00,
            months36: 65.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 19,
        serviceType: "55/10 SoGEA",
        monthlyRental: {
            months12: 29.00,
            months24: 30.00,
            months36: 34.00
        },
        installFee: {
            months12: 25.00,
            months24: 45.00,
            months36: 65.00
        },
        router: "Zyxel VMG-1312",
        notes: "£60 ETC if cancelled within first 12 months"
    },
    {
        id: 20,
        serviceType: "1800/120 FTTP",
        monthlyRental: {
            months12: 70.00,
            months24: 77.00,
            months36: null
        },
        installFee: {
            months12: 25.00,
            months24: 35.00,
            months36: 65.00
        },
        router: "Zyxel DX3301",
        notes: "£60 ETC if cancelled within first 12 months"
    },
];
    // States
    const PriceManagement = () => {
        const {prices, setPrices} = usePricing();
        const [searchTerm, setSearchTerm] = useState('');
        const [sortConfig, setSortConfig] = useState({key: null, direction: 'asc'});
        const [selectedPrices, setSelectedPrices] = useState([]);
        const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
        const [editingPrice, setEditingPrice] = useState(null);
        const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
        const [formErrors, setFormErrors] = useState({});

        const [newPrice, setNewPrice] = useState({
            serviceType: '',
            monthlyRental: {months12: '', months24: '', months36: ''},
            installFee: {months12: '', months24: '', months36: ''},
            router: '',
            notes: ''
        });

        const [bulkEditData, setBulkEditData] = useState({
            monthlyRental: {months12: '', months24: '', months36: ''},
            installFee: {months12: '', months24: '', months36: ''},
            notes: ''
        });

        // Service type colors
        const serviceTypeConfig = {
            'ADSL': {color: 'bg-blue-100 text-blue-800'},
            'FTTC': {color: 'bg-green-100 text-green-800'},
            'FTTP': {color: 'bg-purple-100 text-purple-800'},
            'SoGEA': {color: 'bg-orange-100 text-orange-800'},
            'Gfast': {color: 'bg-pink-100 text-pink-800'}
        };

        // Utility functions
        const getServiceTypeColor = (serviceType) => {
            const type = Object.keys(serviceTypeConfig).find(key => serviceType.includes(key));
            return type ? serviceTypeConfig[type].color : 'bg-gray-100 text-gray-800';
        };

        const validateForm = (data) => {
            const errors = {};
            if (!data.serviceType?.trim()) errors.serviceType = 'Service type is required';
            if (!data.router?.trim()) errors.router = 'Router is required';
            return errors;
        };

        const formatPrice = (price) => {
            if (price === null || price === undefined || price === '') return 'n/a';
            return `£${parseFloat(price).toFixed(2)}`;
        };

        // Filter and sort logic
        const filteredPrices = useMemo(() => {
            return prices.filter(price => {
                return price.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    price.router.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    price.notes.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }, [prices, searchTerm]);

        const sortedPrices = useMemo(() => {
            let sortedData = [...filteredPrices];
            if (sortConfig.key) {
                sortedData.sort((a, b) => {
                    if (sortConfig.key.includes('.')) {
                        const [category, month] = sortConfig.key.split('.');
                        const aValue = a[category][month] || 0;
                        const bValue = b[category][month] || 0;
                        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                    }

                    const aValue = a[sortConfig.key] || '';
                    const bValue = b[sortConfig.key] || '';
                    return sortConfig.direction === 'asc'
                        ? aValue.toString().localeCompare(bValue.toString())
                        : bValue.toString().localeCompare(aValue.toString());
                });
            }
            return sortedData;
        }, [filteredPrices, sortConfig]);

        // Event handlers
        const handleSort = (key) => {
            setSortConfig(prev => ({
                key,
                direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
            }));
        };

        const handleInputChange = (e, category, months) => {
            const {name, value} = e.target;
            const updateTarget = editingPrice || newPrice;
            const setFunction = editingPrice ? setEditingPrice : setNewPrice;

            if (category) {
                setFunction(prev => ({
                    ...prev,
                    [category]: {
                        ...prev[category],
                        [months]: value === '' ? null : parseFloat(value)
                    }
                }));
            } else {
                setFunction(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        };

        const handleBulkSelect = (checked, price) => {
            if (checked) {
                setSelectedPrices(prev => [...prev, price.id]);
            } else {
                setSelectedPrices(prev => prev.filter(id => id !== price.id));
            }
        };

        const handleBulkEdit = () => {
            setPrices(prev => prev.map(price => {
                if (!selectedPrices.includes(price.id)) return price;

                return {
                    ...price,
                    monthlyRental: {
                        months12: bulkEditData.monthlyRental.months12 || price.monthlyRental.months12,
                        months24: bulkEditData.monthlyRental.months24 || price.monthlyRental.months24,
                        months36: bulkEditData.monthlyRental.months36 || price.monthlyRental.months36,
                    },
                    installFee: {
                        months12: bulkEditData.installFee.months12 || price.installFee.months12,
                        months24: bulkEditData.installFee.months24 || price.installFee.months24,
                        months36: bulkEditData.installFee.months36 || price.installFee.months36,
                    },
                    notes: bulkEditData.notes || price.notes,
                };
            }));

            setIsBulkEditDialogOpen(false);
            setSelectedPrices([]);
            setBulkEditData({
                monthlyRental: {months12: '', months24: '', months36: ''},
                installFee: {months12: '', months24: '', months36: ''},
                notes: ''
            });
        };

        const handleAddPrice = () => {
            const errors = validateForm(newPrice);
            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                return;
            }

            const priceToAdd = {
                id: prices.length + 1,
                ...newPrice
            };

            setPrices(prev => [...prev, priceToAdd]);
            setNewPrice({
                serviceType: '',
                monthlyRental: {months12: '', months24: '', months36: ''},
                installFee: {months12: '', months24: '', months36: ''},
                router: '',
                notes: ''
            });
            setFormErrors({});
        };

        const handleEditSave = () => {
            const errors = validateForm(editingPrice);
            if (Object.keys(errors).length > 0) {
                setFormErrors(errors);
                return;
            }

            setPrices(prev =>
                prev.map(price =>
                    price.id === editingPrice.id ? editingPrice : price
                )
            );
            setIsEditDialogOpen(false);
            setEditingPrice(null);
            setFormErrors({});
        };

        const handleDeletePrice = (id) => {
            setPrices(prev => prev.filter(price => price.id !== id));
            setSelectedPrices(prev => prev.filter(selectedId => selectedId !== id));
        };

        // Sort indicator component
        const SortIndicator = ({column}) => {
            if (sortConfig.key !== column) return null;
            return sortConfig.direction === 'asc'
                ? <ChevronUp className="inline w-4 h-4"/>
                : <ChevronDown className="inline w-4 h-4"/>;
        };

        // Form component
        const PriceForm = ({data, onChange, isEditing = false}) => (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Service Type</label>
                        <Input
                            name="serviceType"
                            value={data.serviceType}
                            onChange={onChange}
                            placeholder="e.g. 80/20 FTTC"
                            className={formErrors.serviceType ? 'border-red-500' : ''}
                        />
                        {formErrors.serviceType && (
                            <span className="text-red-500 text-sm">{formErrors.serviceType}</span>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Router</label>
                        <Input
                            name="router"
                            value={data.router}
                            onChange={onChange}
                            placeholder="e.g. Zyxel VMG-1312"
                            className={formErrors.router ? 'border-red-500' : ''}
                        />
                        {formErrors.router && (
                            <span className="text-red-500 text-sm">{formErrors.router}</span>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Monthly Rental</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['months12', 'months24', 'months36'].map(month => (
                            <Input
                                key={month}
                                type="number"
                                placeholder={`${month.replace('months', '')} Months`}
                                value={data.monthlyRental[month]}
                                onChange={(e) => onChange(e, 'monthlyRental', month)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Install Fee</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['months12', 'months24', 'months36'].map(month => (
                            <Input
                                key={month}
                                type="number"
                                placeholder={`${month.replace('months', '')} Months`}
                                value={data.installFee[month]}
                                onChange={(e) => onChange(e, 'installFee', month)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <Input
                        name="notes"
                        value={data.notes}
                        onChange={onChange}
                        placeholder="Additional notes"
                    />
                </div>
            </div>
        );

        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-6">Broadband Price Management</h1>

                {/* Search and Controls */}
                <div className="space-y-4 mb-6">
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500"/>
                            <Input
                                placeholder="Search services..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {selectedPrices.length > 0 && (
                        <div className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                            <span>{selectedPrices.length} items selected</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsBulkEditDialogOpen(true)}
                            >
                                Bulk Edit
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    setPrices(prev => prev.filter(price => !selectedPrices.includes(price.id)));
                                    setSelectedPrices([]);
                                }}
                            >
                                Delete Selected
                            </Button>
                        </div>
                    )}
                </div>

                {/* Add New Service Form */}
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                    <h2 className="text-lg font-semibold mb-4">Add New Service</h2>
                    <PriceForm data={newPrice} onChange={handleInputChange}/>
                    <Button
                        className="mt-4"
                        onClick={handleAddPrice}
                        disabled={!newPrice.serviceType}
                    >
                        Add Service
                    </Button>
                </div>

                {/* Price Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">
                                    <Checkbox
                                        checked={sortedPrices.every(price => selectedPrices.includes(price.id))}
                                        onCheckedChange={(checked) => {
                                            const ids = sortedPrices.map(price => price.id);
                                            if (checked) {
                                                setSelectedPrices(prev => [...new Set([...prev, ...ids])]);
                                            } else {
                                                setSelectedPrices(prev => prev.filter(id => !ids.includes(id)));
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead onClick={() => handleSort('serviceType')} className="cursor-pointer">
                                    Service Type <SortIndicator column="serviceType"/>
                                </TableHead>
                                <TableHead className="text-center" colSpan={3}>Monthly Rental</TableHead>
                                <TableHead className="text-center" colSpan={3}>Install Fee</TableHead>
                                <TableHead>Router</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead></TableHead>
                                <TableHead></TableHead>
                                <TableHead className="text-center cursor-pointer"
                                           onClick={() => handleSort('monthlyRental.months12')}>
                                    12m <SortIndicator column="monthlyRental.months12"/>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer"
                                           onClick={() => handleSort('monthlyRental.months24')}>
                                    24m <SortIndicator column="monthlyRental.months24"/>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer"
                                           onClick={() => handleSort('monthlyRental.months36')}>
                                    36m <SortIndicator column="monthlyRental.months36"/>
                                </TableHead>
                                <TableHead className="text-center">12m</TableHead>
                                <TableHead className="text-center">24m</TableHead>
                                <TableHead className="text-center">36m</TableHead>
                                <TableHead></TableHead>
                                <TableHead></TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedPrices.map((price) => (
                                <TableRow key={price.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedPrices.includes(price.id)}
                                            onCheckedChange={(checked) => handleBulkSelect(checked, price)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getServiceTypeColor(price.serviceType)}>
                                            {price.serviceType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.monthlyRental.months12)}</TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.monthlyRental.months24)}</TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.monthlyRental.months36)}</TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.installFee.months12)}</TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.installFee.months24)}</TableCell>
                                    <TableCell
                                        className="text-center">{formatPrice(price.installFee.months36)}</TableCell>
                                    <TableCell>{price.router}</TableCell>
                                    <TableCell>{price.notes}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingPrice(price);
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeletePrice(price.id)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Edit Service</DialogTitle>
                        </DialogHeader>
                        {editingPrice && (
                            <>
                                <PriceForm data={editingPrice} onChange={handleInputChange} isEditing={true}/>
                                <div className="flex justify-end gap-4 mt-4">
                                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleEditSave}>
                                        Save Changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Bulk Edit Dialog */}
                <Dialog open={isBulkEditDialogOpen} onOpenChange={setIsBulkEditDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Bulk Edit Selected Services</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Monthly Rental (leave blank to keep existing)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['months12', 'months24', 'months36'].map(month => (
                                        <Input
                                            key={month}
                                            type="number"
                                            placeholder={`${month.replace('months', '')} Months`}
                                            value={bulkEditData.monthlyRental[month]}
                                            onChange={(e) => setBulkEditData(prev => ({
                                                ...prev,
                                                monthlyRental: {
                                                    ...prev.monthlyRental,
                                                    [month]: e.target.value
                                                }
                                            }))}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Install Fee (leave blank to keep existing)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['months12', 'months24', 'months36'].map(month => (
                                        <Input
                                            key={month}
                                            type="number"
                                            placeholder={`${month.replace('months', '')} Months`}
                                            value={bulkEditData.installFee[month]}
                                            onChange={(e) => setBulkEditData(prev => ({
                                                ...prev,
                                                installFee: {
                                                    ...prev.installFee,
                                                    [month]: e.target.value
                                                }
                                            }))}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (leave blank to keep existing)</label>
                                <Input
                                    value={bulkEditData.notes}
                                    onChange={(e) => setBulkEditData(prev => ({
                                        ...prev,
                                        notes: e.target.value
                                    }))}
                                    placeholder="Additional notes"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 mt-4">
                            <Button variant="outline" onClick={() => setIsBulkEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleBulkEdit}>
                                Apply Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    };

    export default PriceManagement;