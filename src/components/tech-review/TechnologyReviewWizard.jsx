import React, { useState } from 'react';
import { Network, Wifi, Smartphone, Phone, Shield, CheckCircle, TrendingDown, Gauge } from 'lucide-react';
import NetworkForm from './forms/NetworkForm';
import BroadbandForm from './forms/BroadbandForm';
import MobileForm from './forms/MobileForm';
import PhoneSystemForm from './forms/PhoneSystemForm';
import SecurityForm from './forms/SecurityForm';
import ReviewForm from './forms/ReviewForm';
import OptimizationReport from './forms/OptimizationReport';
import SecurityDashboard from './forms/SecurityDashboard';

const TechnologyReviewWizard = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState(new Set());
    const [formData, setFormData] = useState({
        sites: [{
            id: 1,
            name: '',
            address: {
                building: '',
                street: '',
                city: '',
                county: '',
                postcode: ''
            },
            connections: [{
                type: '',
                speed: '',
                cost: '',
                term: 12
            }]
        }]
    });

    const steps = [
        {
            title: 'Network',
            icon: Network,
            description: 'Network Infrastructure',
            component: NetworkForm
        },
        {
            title: 'Broadband',
            icon: Wifi,
            description: 'Broadband Services',
            component: BroadbandForm
        },
        {
            title: 'Mobile',
            icon: Smartphone,
            description: 'Mobile Services',
            component: MobileForm
        },
        {
            title: 'Phone',
            icon: Phone,
            description: 'Phone System',
            component: PhoneSystemForm
        },
        {
            title: 'Security',
            icon: Shield,
            description: 'Security Assessment',
            component: SecurityForm
        },
        {
            title: 'Optimize',
            icon: TrendingDown,
            description: 'Cost Optimization',
            component: OptimizationReport
        },
        {
            title: 'Dashboard',
            icon: Gauge,
            description: 'Security Dashboard',
            component: SecurityDashboard
        },
        {
            title: 'Review',
            icon: CheckCircle,
            description: 'Review & Submit',
            component: ReviewForm
        }
    ];

    const handleNext = () => {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-2xl font-bold mb-6">Technology Review</h1>

                    {/* Progress Steps */}
                    <div className="mb-8 overflow-x-auto">
                        <div className="flex min-w-max">
                            {steps.map((step, index) => (
                                <div key={index} className="flex items-center">
                                    {/* Step Circle with Icon */}
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`
                                                w-10 h-10 rounded-full flex items-center justify-center
                                                ${currentStep === index ? 'bg-blue-100 border-2 border-blue-500' :
                                                completedSteps.has(index) ? 'bg-green-100 border-2 border-green-500' :
                                                    'bg-gray-100 border-2 border-gray-300'}
                                            `}
                                        >
                                            <step.icon
                                                className={`
                                                    w-5 h-5
                                                    ${currentStep === index ? 'text-blue-500' :
                                                    completedSteps.has(index) ? 'text-green-500' :
                                                        'text-gray-500'}
                                                `}
                                            />
                                        </div>
                                        <span className={`
                                            text-xs mt-1 font-medium
                                            ${currentStep === index ? 'text-blue-600' :
                                            completedSteps.has(index) ? 'text-green-600' :
                                                'text-gray-500'}
                                        `}>
                                            {step.title}
                                        </span>
                                    </div>

                                    {/* Connecting Line */}
                                    {index < steps.length - 1 && (
                                        <div className={`
                                            w-20 h-1 mx-2
                                            ${completedSteps.has(index) ? 'bg-green-500' : 'bg-gray-200'}
                                        `} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Title and Description */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {steps[currentStep].description}
                        </h2>
                        <p className="text-gray-600 text-sm">
                            Step {currentStep + 1} of {steps.length}
                        </p>
                    </div>

                    {/* Form Content */}
                    <div className="mb-8">
                        {steps.map((step, index) => (
                            currentStep === index && (
                                <step.component
                                    key={index}
                                    formData={formData}
                                    setFormData={setFormData}
                                />
                            )
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 0}
                            className={`
                                px-4 py-2 rounded-md flex items-center
                                ${currentStep === 0
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border'}
                            `}
                        >
                            Back
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={currentStep === steps.length - 1}
                            className={`
                                px-4 py-2 rounded-md flex items-center
                                ${currentStep === steps.length - 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'}
                            `}
                        >
                            {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TechnologyReviewWizard;