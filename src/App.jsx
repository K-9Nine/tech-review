import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PricingProvider } from './contexts/PricingContext';
import AdminLayout from './admin/components/AdminLayout';
import PriceManagement from './admin/components/PriceManagement';
import TechnologyReviewWizard from './components/tech-review/TechnologyReviewWizard';

const App = () => {
    return (
        <PricingProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={
                        <div className="min-h-screen bg-gray-50">
                            <TechnologyReviewWizard />
                        </div>
                    } />
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route path="price-management" element={<PriceManagement />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </PricingProvider>
    );
};

export default App;