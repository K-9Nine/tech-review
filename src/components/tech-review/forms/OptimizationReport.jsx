import React, { useEffect } from 'react';
import {
    TrendingDown,
    TrendingUp,
    ArrowUpRight,
    Banknote,
    Scale,
    AlertTriangle,
    Percent,
    ShieldCheck,
    Wifi,
    CheckCircle2,
    Building2,
    PhoneCall,
    Smartphone,
    Network
} from 'lucide-react';

const OptimizationReport = ({ formData }) => {
    useEffect(() => {
        console.log('FormData in OptimizationReport:', formData);
    }, [formData]);

    if (!formData?.sites?.[0]) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center text-yellow-700">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>Please complete the service information first.</span>
                </div>
            </div>
        );
    }

    // Calculate current costs
    const calculateMonthlyCosts = () => {
        const sites = formData.sites[0];
        return {
            network: sites.connections?.reduce((sum, conn) => sum + (Number(conn.cost) || 0), 0) || 0,
            broadband: sites.broadband?.reduce((sum, bb) => sum + (Number(bb.cost) || 0), 0) || 0,
            mobile: sites.mobileServices?.reduce((sum, mobile) => sum + (Number(mobile.cost) || 0), 0) || 0,
            phone: sites.phoneSystems?.reduce((sum, phone) => sum + (Number(phone.cost) || 0), 0) || 0
        };
    };

    const currentCosts = calculateMonthlyCosts();
    const totalCurrentCost = Object.values(currentCosts).reduce((a, b) => a + b, 0);

    // Get Zen available services
    const getZenServices = () => {
        const site = formData.sites[0];
        if (!site?.broadband?.length) return [];

        return site.broadband
            .filter(bb => bb.address && bb.zenAvailability)
            .map(bb => ({
                address: bb.address,
                services: bb.zenAvailability
            }));
    };

    // Analysis of potential savings/improvements
    const analyzeServices = () => {
        const analysis = [];
        const site = formData.sites[0];
        const zenServices = getZenServices();

        // Network Analysis
        if (site.connections?.length > 0) {
            site.connections.forEach(conn => {
                if (conn.type === 'broadband' && conn.cost > 100) {
                    analysis.push({
                        type: 'saving',
                        service: 'Network',
                        description: 'Potential for cost reduction through contract renegotiation',
                        impact: 'High',
                        potentialSaving: conn.cost * 0.2,
                        recommendation: 'Review current contract and explore competitive offerings'
                    });
                }
                if (conn.type === 'ethernet' && !conn.backup) {
                    analysis.push({
                        type: 'improvement',
                        service: 'Network',
                        description: 'Consider adding backup connection for improved resilience',
                        impact: 'High',
                        additionalCost: conn.cost * 0.5,
                        recommendation: 'Add backup connection for business continuity'
                    });
                }
            });
        }

        // Broadband Analysis
        if (site.broadband?.length > 0) {
            site.broadband.forEach(bb => {
                // Check current costs against Zen offerings
                const zenOptions = zenServices.find(z =>
                    z.address.postcode === bb.address?.postcode
                )?.services?.technologies || [];

                const cheaperZenOption = zenOptions.find(zo =>
                    zo.prices?.[0]?.monthlyPrice < bb.cost
                );

                if (cheaperZenOption) {
                    analysis.push({
                        type: 'saving',
                        service: 'Broadband',
                        description: `Potential saving with Zen ${cheaperZenOption.technology}`,
                        impact: 'High',
                        potentialSaving: bb.cost - cheaperZenOption.prices[0].monthlyPrice,
                        recommendation: 'Consider switching to Zen Internet for better value'
                    });
                }

                if (bb.term > 24) {
                    analysis.push({
                        type: 'saving',
                        service: 'Broadband',
                        description: 'Long contract term - potential for renegotiation',
                        impact: 'Medium',
                        potentialSaving: bb.cost * 0.1,
                        recommendation: 'Review contract terms and explore market rates'
                    });
                }
            });
        }

        // Mobile Analysis
        if (site.mobileServices?.length > 0) {
            site.mobileServices.forEach(mobile => {
                if (mobile.connections >= 10 && mobile.type !== 'shared') {
                    analysis.push({
                        type: 'saving',
                        service: 'Mobile',
                        description: 'Consider shared data plan for multiple connections',
                        impact: 'Medium',
                        potentialSaving: mobile.cost * 0.15,
                        recommendation: 'Switch to shared data plan for better value'
                    });
                }
            });
        }

        // Phone System Analysis
        if (site.phoneSystems?.length > 0) {
            site.phoneSystems.forEach(phone => {
                if (phone.type === 'onpremise') {
                    analysis.push({
                        type: 'improvement',
                        service: 'Phone System',
                        description: 'Consider migration to cloud-based system',
                        impact: 'Medium',
                        additionalCost: -phone.cost * 0.1,
                        recommendation: 'Migrate to cloud for improved features and potential cost savings'
                    });
                }
            });
        }

        return analysis;
    };

    const opportunities = analyzeServices();
    const totalPotentialSavings = opportunities
        .filter(o => o.type === 'saving')
        .reduce((sum, o) => sum + o.potentialSaving, 0);

    const zenServices = getZenServices();

    const ImpactBadge = ({ impact }) => {
        const colors = {
            High: 'bg-red-100 text-red-800 border border-red-200',
            Medium: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
            Low: 'bg-green-100 text-green-800 border border-green-200'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[impact]}`}>
                {impact}
            </span>
        );
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
        }).format(price);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-blue-800 font-medium">Current Monthly Cost</h3>
                        <Banknote className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-2">
                        {formatPrice(totalCurrentCost)}
                    </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-green-800 font-medium">Potential Monthly Savings</h3>
                        <TrendingDown className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-2">
                        {formatPrice(totalPotentialSavings)}
                    </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-purple-800 font-medium">Optimization Score</h3>
                        <Scale className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-purple-900 mt-2">
                        {Math.round((1 - totalPotentialSavings / totalCurrentCost) * 100)}%
                    </p>
                </div>
            </div>

            {/* Current Services Overview */}
            <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-4">Current Services Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(currentCosts).map(([service, cost]) => {
                        const icons = {
                            network: <Network className="w-5 h-5" />,
                            broadband: <Wifi className="w-5 h-5" />,
                            mobile: <Smartphone className="w-5 h-5" />,
                            phone: <PhoneCall className="w-5 h-5" />
                        };

                        return (
                            <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                <div className="flex items-center space-x-3">
                                    <div className="text-gray-500">
                                        {icons[service]}
                                    </div>
                                    <span className="text-gray-900 capitalize">{service}</span>
                                </div>
                                <span className="font-medium text-gray-900">{formatPrice(cost)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Broadband Service Comparison */}
            {(formData.sites[0].broadband?.length > 0 || zenServices.length > 0) && (
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-4">
                        <Wifi className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-medium">Broadband Service Analysis</h3>
                    </div>

                    {formData.sites[0].broadband?.map((service, index) => {
                        // Find matching Zen services for this address
                        const zenOptions = zenServices.find(z =>
                            z.address.postcode === service.address?.postcode
                        )?.services?.technologies || [];

                        return (
                            <div key={index} className="mb-6 last:mb-0">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <h4 className="font-medium text-gray-900">
                                        {service.address?.building} {service.address?.street}
                                    </h4>
                                    <span className="text-sm text-gray-500">
                            {service.address?.postcode}
                        </span>
                                </div>

                                {/* Current Service */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <h5 className="font-medium text-gray-900 mb-2">Current Service</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Provider</p>
                                            <p className="font-medium">{service.provider}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Speed</p>
                                            <p className="font-medium">{service.speed}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Monthly Cost</p>
                                            <p className="font-medium">{formatPrice(service.cost)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Contract Term</p>
                                            <p className="font-medium">{service.term} months</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Available Zen Services */}
                                {zenOptions.length > 0 && (
                                    <div>
                                        <h5 className="font-medium text-gray-900 mb-2">Available Zen Services</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            {zenOptions.map((tech, techIndex) => {
                                                const potentialSaving = service.cost - (tech.prices?.[0]?.monthlyPrice || 0);
                                                const isUpgrade = parseInt(tech.downloadSpeed) > parseInt(service.speed);

                                                return (
                                                    <div key={techIndex} className="bg-white border rounded-lg p-3">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h6 className="font-medium">{tech.technology}</h6>
                                                                <p className="text-sm text-gray-600">
                                                                    {tech.downloadSpeed} down / {tech.uploadSpeed} up
                                                                </p>
                                                            </div>
                                                            {tech.prices?.[0] && (
                                                                <div className="text-right">
                                                                    <p className="font-medium">
                                                                        {formatPrice(tech.prices[0].monthlyPrice)}/month
                                                                    </p>
                                                                    <p className="text-sm text-gray-600">
                                                                        {tech.prices[0].contractLength} month contract
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Comparison Indicators */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {potentialSaving > 0 && (
                                                                <span className="inline-flex items-center text-sm text-green-600">
                                                        <TrendingDown className="w-4 h-4 mr-1" />
                                                        Save {formatPrice(potentialSaving)}/month
                                                    </span>
                                                            )}
                                                            {isUpgrade && (
                                                                <span className="inline-flex items-center text-sm text-blue-600">
                                                        <ArrowUpRight className="w-4 h-4 mr-1" />
                                                        Speed Upgrade
                                                    </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Zen Services Section */}
            {zenServices.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center space-x-2 mb-4">
                        <Wifi className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-medium">Available Zen Services</h3>
                    </div>
                    <div className="space-y-4">
                        {zenServices.map((location, locationIndex) => (
                            <div key={locationIndex} className="border rounded-lg p-4">
                                <div className="flex items-center space-x-2 mb-3">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <h4 className="font-medium text-gray-900">
                                        {location.address.building} {location.address.street}
                                    </h4>
                                    <span className="text-sm text-gray-500">
                            {location.address.postcode}
                        </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {location.services.broadbandGroups?.map((group, groupIndex) =>
                                        group.products?.map((product, productIndex) => (
                                            <div
                                                key={`${groupIndex}-${productIndex}`}
                                                className="bg-gray-50 p-3 rounded border"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-medium">{group.technology}</h5>
                                                        <p className="text-sm text-gray-600">
                                                            {product.downloadSpeed} down / {product.uploadSpeed} up
                                                        </p>
                                                    </div>
                                                    {product.prices?.[0] && (
                                                        <div className="text-right">
                                                            <p className="font-medium">
                                                                {formatPrice(product.prices[0].monthlyPrice)}/month
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {product.prices[0].contractLength} month contract
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center text-green-600 text-sm">
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        <span>Available</span>
                                                    </div>
                                                    {product.availabilityScore && (
                                                        <span className="text-sm text-gray-600">
                                                Quality Score: {product.availabilityScore}
                                            </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start">
                            <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                            <p className="text-sm text-blue-700">
                                These services are available from Zen Internet based on your address lookup.
                                Prices shown are standard rates and may be subject to special offers or business discounts.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            

            {/* Optimization Opportunities */}
            {opportunities.length > 0 && (
                <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-lg font-medium mb-4">Optimization Opportunities</h3>
                    <div className="space-y-4">
                        {opportunities.map((opportunity, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="font-medium text-gray-900">{opportunity.service}</span>
                                            <ImpactBadge impact={opportunity.impact} />
                                        </div>
                                        <p className="text-gray-600">{opportunity.description}</p>
                                        <p className="text-sm text-gray-500 mt-2">{opportunity.recommendation}</p>
                                    </div>
                                    <div className="text-right">
                                        {opportunity.type === 'saving' ? (
                                            <div className="flex items-center text-green-600">
                                                <TrendingDown className="w-4 h-4 mr-1" />
                                                <span>-{formatPrice(opportunity.potentialSaving)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-blue-600">
                                                <ArrowUpRight className="w-4 h-4 mr-1" />
                                                <span>Improvement</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Implementation Timeline */}
            <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-4">Implementation Timeline</h3>
                <div className="space-y-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
                            1
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Immediate Actions</h4>
                            <p className="mt-1 text-sm text-gray-600">
                                Review high-impact opportunities and begin contract negotiations where applicable.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
                            2
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">30-60 Days</h4>
                            <p className="mt-1 text-sm text-gray-600">
                                Implement service changes and begin migrations for approved recommendations.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3">
                            3
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">90 Days</h4>
                            <p className="mt-1 text-sm text-gray-600">
                                Review implementation success and assess any remaining opportunities.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-800">Next Steps</h3>
                        <p className="mt-1 text-sm text-amber-600">
                            Contact your account manager to discuss implementing these recommendations.
                            We can help prioritize changes based on your business needs and budget constraints.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptimizationReport;