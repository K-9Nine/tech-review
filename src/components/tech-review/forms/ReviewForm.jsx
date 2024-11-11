import React from 'react';
import { Network, Wifi, Smartphone, Phone, Shield, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const ReviewForm = ({ formData, setFormData }) => {
    const [expandedSections, setExpandedSections] = useState(new Set(['network']));

    const toggleSection = (section) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const SectionHeader = ({ icon: Icon, title, section, itemCount = 0 }) => (
        <button
            onClick={() => toggleSection(section)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
            <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                <span className="text-sm text-gray-500">({itemCount} items)</span>
            </div>
            {expandedSections.has(section) ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
        </button>
    );

    const SeverityBadge = ({ severity }) => {
        const colors = {
            critical: 'bg-red-100 text-red-800 border border-red-200',
            high: 'bg-orange-100 text-orange-800 border border-orange-200',
            medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
            low: 'bg-green-100 text-green-800 border border-green-200'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
        );
    };

    const MonthlyTotal = ({ items, type }) => {
        const total = items?.reduce((sum, item) => sum + (Number(item.cost) || 0), 0) || 0;
        return (
            <div className="text-right">
                <p className="text-sm text-gray-600">Monthly {type} Cost:</p>
                <p className="text-lg font-semibold">£{total.toFixed(2)}</p>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-blue-800 font-medium mb-2">Sites Overview</h3>
                    <p className="text-2xl font-bold text-blue-900">{formData.sites.length} Site(s)</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-green-800 font-medium mb-2">Total Monthly Cost</h3>
                    <p className="text-2xl font-bold text-green-900">
                        £{(
                        (formData.sites[0].connections?.reduce((sum, conn) => sum + (Number(conn.cost) || 0), 0) || 0) +
                        (formData.sites[0].broadband?.reduce((sum, bb) => sum + (Number(bb.cost) || 0), 0) || 0) +
                        (formData.sites[0].mobileServices?.reduce((sum, mobile) => sum + (Number(mobile.cost) || 0), 0) || 0) +
                        (formData.sites[0].phoneSystems?.reduce((sum, phone) => sum + (Number(phone.cost) || 0), 0) || 0)
                    ).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Network Infrastructure */}
            <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={Network}
                    title="Network Infrastructure"
                    section="network"
                    itemCount={formData.sites[0].connections?.length || 0}
                />
                {expandedSections.has('network') && (
                    <div className="p-4">
                        {formData.sites[0].connections?.map((conn, idx) => (
                            <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Connection Type</p>
                                        <p className="font-medium">{conn.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Speed</p>
                                        <p className="font-medium">{conn.speed}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Cost</p>
                                        <p className="font-medium">£{conn.cost}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Term</p>
                                        <p className="font-medium">{conn.term} months</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <MonthlyTotal items={formData.sites[0].connections} type="Network" />
                    </div>
                )}
            </div>

            {/* Broadband Services */}
            <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={Wifi}
                    title="Broadband Services"
                    section="broadband"
                    itemCount={formData.sites[0].broadband?.length || 0}
                />
                {expandedSections.has('broadband') && (
                    <div className="p-4">
                        {formData.sites[0].broadband?.map((bb, idx) => (
                            <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Type</p>
                                        <p className="font-medium">{bb.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Speed</p>
                                        <p className="font-medium">{bb.speed}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Provider</p>
                                        <p className="font-medium">{bb.provider}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Cost</p>
                                        <p className="font-medium">£{bb.cost}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <MonthlyTotal items={formData.sites[0].broadband} type="Broadband" />
                    </div>
                )}
            </div>

            {/* Mobile Services */}
            <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={Smartphone}
                    title="Mobile Services"
                    section="mobile"
                    itemCount={formData.sites[0].mobileServices?.length || 0}
                />
                {expandedSections.has('mobile') && (
                    <div className="p-4">
                        {formData.sites[0].mobileServices?.map((mobile, idx) => (
                            <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Provider</p>
                                        <p className="font-medium">{mobile.provider}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Type</p>
                                        <p className="font-medium">{mobile.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Connections</p>
                                        <p className="font-medium">{mobile.connections}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Data</p>
                                        <p className="font-medium">{mobile.data}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Cost</p>
                                        <p className="font-medium">£{mobile.cost}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Term</p>
                                        <p className="font-medium">{mobile.term} months</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <MonthlyTotal items={formData.sites[0].mobileServices} type="Mobile" />
                    </div>
                )}
            </div>

            {/* Phone Systems */}
            <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={Phone}
                    title="Phone Systems"
                    section="phone"
                    itemCount={formData.sites[0].phoneSystems?.length || 0}
                />
                {expandedSections.has('phone') && (
                    <div className="p-4">
                        {formData.sites[0].phoneSystems?.map((phone, idx) => (
                            <div key={idx} className="mb-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Type</p>
                                        <p className="font-medium">{phone.type}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Provider</p>
                                        <p className="font-medium">{phone.provider}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Users</p>
                                        <p className="font-medium">{phone.users}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Cost</p>
                                        <p className="font-medium">£{phone.cost}</p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-600">Features</p>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {phone.features?.map((feature, fidx) => (
                                            <span key={fidx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {feature}
                      </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <MonthlyTotal items={formData.sites[0].phoneSystems} type="Phone System" />
                    </div>
                )}
            </div>

            {/* Security Assessment */}
            <div className="border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={Shield}
                    title="Security Assessment"
                    section="security"
                    itemCount={Object.values(formData.sites[0].security || {}).reduce(
                        (count, category) => count + Object.keys(category.checks || {}).length,
                        0
                    )}
                />
                {expandedSections.has('security') && (
                    <div className="p-4">
                        {Object.entries(formData.sites[0].security || {}).map(([category, data]) => (
                            <div key={category} className="mb-6">
                                <h4 className="text-lg font-medium mb-3 text-gray-900">
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </h4>
                                <div className="space-y-3">
                                    {Object.entries(data.checks || {}).map(([checkId, check]) => (
                                        <div key={checkId} className="bg-gray-50 p-3 rounded-lg flex items-start justify-between">
                                            <div className="flex items-start space-x-3">
                                                {check.implemented ? (
                                                    <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-500 mt-1" />
                                                )}
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-gray-900">{checkId.split('_').join(' ').toUpperCase()}</p>
                                                        <SeverityBadge severity={check.severity} />
                                                    </div>
                                                    {check.product && (
                                                        <p className="text-sm text-gray-600">Product: {check.product}</p>
                                                    )}
                                                    {check.notes && (
                                                        <p className="text-sm text-gray-500 mt-1">{check.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Review Summary</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Please review all sections carefully before submission. Ensure all costs,
                            terms, and security measures are accurately recorded. Critical security items
                            should be addressed as a priority.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewForm;