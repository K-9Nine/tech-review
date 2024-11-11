import React from 'react';
import { TrendingDown, TrendingUp, ArrowUpRight, Banknote, Scale, AlertTriangle, Percent, ShieldCheck } from 'lucide-react';

const OptimizationReport = ({ formData }) => {
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

    // Analysis of potential savings/improvements
    const analyzeServices = () => {
        const analysis = [];
        const site = formData.sites[0];

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

        // Broadband Analysis
        if (site.broadband?.length > 0) {
            site.broadband.forEach(bb => {
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

        return analysis;
    };

    const opportunities = analyzeServices();
    const totalPotentialSavings = opportunities
        .filter(o => o.type === 'saving')
        .reduce((sum, o) => sum + o.potentialSaving, 0);

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

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-blue-800 font-medium">Current Monthly Cost</h3>
                        <Banknote className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-2">£{totalCurrentCost.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-green-800 font-medium">Potential Savings</h3>
                        <TrendingDown className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-2">£{totalPotentialSavings.toFixed(2)}</p>
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

            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-4">Current Cost Breakdown</h3>
                <div className="space-y-3">
                    {Object.entries(currentCosts).map(([service, cost]) => (
                        <div key={service} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-600 capitalize">{service}</span>
                            <span className="font-medium">£{cost.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Optimization Opportunities */}
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
                                            <span>-£{opportunity.potentialSaving.toFixed(2)}</span>
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

            {/* Action Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-amber-800">Optimization Notes</h3>
                        <p className="mt-1 text-sm text-amber-600">
                            These recommendations are based on current market rates and best practices.
                            Actual savings may vary based on specific requirements and contract terms.
                            Consider reviewing high-impact opportunities first for maximum benefit.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptimizationReport;