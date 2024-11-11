import React from 'react';
import { Shield, AlertTriangle, CheckCircle, AlertOctagon, Clock } from 'lucide-react';
import {
    RadialBarChart, RadialBar, ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const SecurityDashboard = ({ formData }) => {
    // Colors for charts
    const COLORS = {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#eab308',
        low: '#22c55e'
    };

    const analyzeSecurity = () => {
        const analysis = {
            critical: { implemented: 0, total: 0 },
            high: { implemented: 0, total: 0 },
            medium: { implemented: 0, total: 0 },
            low: { implemented: 0, total: 0 }
        };

        if (!formData?.sites?.[0]?.security) return analysis;

        Object.values(formData.sites[0].security).forEach(category => {
            if (category?.checks) {
                Object.values(category.checks).forEach(check => {
                    if (check?.severity) {
                        analysis[check.severity].total++;
                        if (check.implemented) {
                            analysis[check.severity].implemented++;
                        }
                    }
                });
            }
        });

        return analysis;
    };

    const getCategoryScores = () => {
        const security = formData?.sites?.[0]?.security;
        if (!security) return [];

        return Object.entries(security).map(([category, data]) => {
            const implemented = Object.values(data.checks || {})
                .filter(check => check.implemented).length;
            const total = Object.values(data.checks || {}).length;
            const percentage = total > 0 ? (implemented / total) * 100 : 0;

            return {
                name: category.charAt(0).toUpperCase() + category.slice(1),
                score: Math.round(percentage),
                fill: percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#eab308' : '#ef4444'
            };
        });
    };

    const calculateOverallScore = () => {
        const analysis = analyzeSecurity();
        const weights = { critical: 4, high: 3, medium: 2, low: 1 };
        let totalWeight = 0;
        let implementedWeight = 0;

        Object.entries(analysis).forEach(([severity, counts]) => {
            const weight = weights[severity];
            totalWeight += counts.total * weight;
            implementedWeight += counts.implemented * weight;
        });

        return totalWeight > 0 ? Math.round((implementedWeight / totalWeight) * 100) : 0;
    };

    const getChartData = () => {
        const analysis = analyzeSecurity();
        return Object.entries(analysis).map(([severity, counts]) => ({
            name: severity.charAt(0).toUpperCase() + severity.slice(1),
            implemented: counts.implemented,
            total: counts.total,
            percentage: counts.total > 0 ? (counts.implemented / counts.total) * 100 : 0,
            fill: COLORS[severity]
        }));
    };

    const overallScore = calculateOverallScore();
    const categoryScores = getCategoryScores();
    const chartData = getChartData();

    return (
        <div className="space-y-6">
            {/* Overall Score with Radial Chart */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-xl font-bold mb-4">Security Score</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="100%"
                                barSize={10}
                                data={[
                                    {
                                        name: 'Score',
                                        value: overallScore,
                                        fill: overallScore >= 80 ? '#22c55e' :
                                            overallScore >= 60 ? '#eab308' : '#ef4444'
                                    }
                                ]}
                                startAngle={180}
                                endAngle={0}
                            >
                                <RadialBar
                                    background
                                    clockWise
                                    dataKey="value"
                                    cornerRadius={30}
                                />
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-3xl font-bold"
                                    fill="#1f2937"
                                >
                                    {overallScore}%
                                </text>
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Score Chart */}
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-xl font-bold mb-4">Category Scores</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryScores}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="score" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Implementation Status */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-xl font-bold mb-4">Implementation Status</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="implemented"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    label
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Priority Actions */}
                <div className="bg-white rounded-lg border p-6">
                    <h2 className="text-xl font-bold mb-4">Priority Actions</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {Object.entries(formData?.sites?.[0]?.security || {}).map(([category, data]) =>
                            Object.entries(data.checks || {})
                                .filter(([_, check]) => !check.implemented && check.severity === 'critical')
                                .map(([checkId, check]) => (
                                    <div key={checkId} className="flex items-start space-x-3 bg-red-50 p-3 rounded">
                                        <AlertOctagon className="w-5 h-5 text-red-500 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-red-800">
                                                {category.charAt(0).toUpperCase() + category.slice(1)}
                                            </div>
                                            <p className="text-sm text-red-600">{checkId.split('_').join(' ')}</p>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-blue-800">Security Assessment Summary</h3>
                        <p className="mt-1 text-sm text-blue-600">
                            Your overall security score is {overallScore}%. Focus on implementing critical security
                            measures first and maintain regular security reviews for optimal protection.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityDashboard;