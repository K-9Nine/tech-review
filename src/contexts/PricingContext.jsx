import React, { createContext, useState, useContext } from 'react';
import { initialPrices } from '../admin/components/PriceManagement';

const PricingContext = createContext();

export function PricingProvider({ children }) {
    const [prices, setPrices] = useState(initialPrices);

    const value = {
        prices,
        setPrices,
        lookupServicePrice: (serviceType, term) => {
            const termKey = `months${term}`;
            const priceData = prices.find(p => p.serviceType === serviceType);

            if (!priceData) return null;

            return {
                monthlyPrice: priceData.monthlyRental[termKey],
                installFee: priceData.installFee[termKey],
                router: priceData.router,
                notes: priceData.notes
            };
        }
    };

    return (
        <PricingContext.Provider value={value}>
            {children}
        </PricingContext.Provider>
    );
}

export function usePricing() {
    const context = useContext(PricingContext);
    if (!context) {
        throw new Error('usePricing must be used within a PricingProvider');
    }
    return context;
}