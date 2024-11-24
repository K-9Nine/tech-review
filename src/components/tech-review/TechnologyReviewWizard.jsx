import React, { useState } from 'react';
import { Network, Wifi, Smartphone, Phone, Shield, CheckCircle, TrendingDown, Gauge } from 'lucide-react';
import NetworkForm from './forms/NetworkForm';
import BroadbandForm from './forms/BroadbandForm';
import MobileForm from './forms/MobileForm';
import SecurityForm from './forms/SecurityForm';
import SecurityDashboard from './forms/SecurityDashboard';
import { usePricing } from '../../contexts/PricingContext';

const TechnologyReviewWizard = () => {
    const { prices } = usePricing(); // Get prices from context
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
            currentService: '',
            currentSpeed: '',
            currentPrice: '',
            connections: [{
                id: Date.now(),
                type: '',
                speed: '',
                proposedCost: '',
                term: '12',
                isBackup: false
            }]
        }]
    });

    const steps = [
        { title: 'Network', icon: Network, description: 'Network Infrastructure', component: NetworkForm },
        { title: 'Broadband', icon: Wifi, description: 'Broadband Services', component: BroadbandForm },
        { title: 'Mobile', icon: Smartphone, description: 'Mobile Services', component: MobileForm },
        { title: 'Security', icon: Shield, description: 'Security Assessment', component: SecurityForm },
        { title: 'Dashboard', icon: Gauge, description: 'Security Dashboard', component: SecurityDashboard }
    ];

    const validateStep = () => {
        if (currentStep === 0 && !formData.sites[0].name) {
            alert('Site name is required for the Network step.');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setCompletedSteps((prev) => new Set([...prev, currentStep]));
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const renderStepComponent = () => {
        const Component = steps[currentStep].component;

        if (Component === BroadbandForm) {
            return (
                <BroadbandForm
                    formData={formData}
                    setFormData={setFormData}
                    prices={prices} // Use prices from context instead of initialPrices
                />
            );
        }

        return <Component formData={formData} setFormData={setFormData} />;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Technology Review</h1>

                {/* Progress Bar */}
                <div className="flex items-center mb-8">
                    {steps.map((step, index) => (
                        <div key={index} className="flex-1 flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center
                                ${currentStep === index ? 'bg-blue-500 text-white' :
                                    completedSteps.has(index) ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                            >
                                <step.icon className="w-5 h-5" />
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-1 ${completedSteps.has(index) ? 'bg-green-500' : 'bg-gray-300'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Current Step */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold">{steps[currentStep].description}</h2>
                    <p className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</p>
                </div>

                {/* Step Content */}
                <div className="mb-6">
                    {renderStepComponent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`px-4 py-2 rounded ${currentStep === 0 ? 'bg-gray-300 text-gray-600' : 'bg-gray-700 text-white'}`}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-4 py-2 rounded bg-blue-500 text-white"
                    >
                        {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TechnologyReviewWizard;
