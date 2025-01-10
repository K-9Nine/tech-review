import React from 'react';

const PricingComparison = ({ quotes, onNetDistance, onNetNearest }) => {
    console.log('PricingComparison Component Rendered');
    console.log('Props received:', { quotes, onNetDistance, onNetNearest });

    // Basic validation with detailed error messages
    if (!quotes) {
        console.error('Quotes prop is undefined');
        return <div className="text-red-500 p-4">Error: No quotes data provided</div>;
    }

    if (!Array.isArray(quotes)) {
        console.error('Quotes prop is not an array:', quotes);
        return <div className="text-red-500 p-4">Error: Invalid quotes data format</div>;
    }

    if (quotes.length === 0) {
        return <div className="text-gray-500 p-4">No quotes available for this connection</div>;
    }

    // Group quotes by term length
    const quotesByTerm = quotes.reduce((acc, quote) => {
        const term = quote.term_months || 'Unknown';
        if (!acc[term]) {
            acc[term] = [];
        }
        acc[term].push(quote);
        return acc;
    }, {});

    return (
        <div className="mt-4 border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Detailed Pricing</h3>
            
            {Object.entries(quotesByTerm).map(([term, termQuotes]) => (
                <div key={term} className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-2">{term} Month Terms</h4>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {termQuotes
                            .sort((a, b) => a.monthly_cost - b.monthly_cost)
                            .map(quote => (
                                <div 
                                    key={quote.uuid}
                                    className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        {quote.logo && (
                                            <img 
                                                src={quote.logo} 
                                                alt={quote.supplier} 
                                                className="h-6"
                                                onError={(e) => {
                                                    console.error('Failed to load logo:', quote.logo);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <span className="font-medium">{quote.supplier}</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-600">{quote.product_name}</p>
                                        <p className="text-xl font-bold">
                                            £{typeof quote.monthly_cost === 'number' ? 
                                                quote.monthly_cost.toFixed(2) : 
                                                quote.monthly_cost}/month
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Install: £{quote.install_cost}
                                        </p>
                                        {quote.estimated_ecc && quote.estimated_ecc !== "0.00" && (
                                            <p className="text-sm text-amber-600">
                                                Est. ECC: £{quote.estimated_ecc}
                                            </p>
                                        )}
                                    </div>

                                    {quote.additionalInformation?.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            {quote.additionalInformation.map((info, idx) => (
                                                <p key={idx} className="text-sm text-gray-500">
                                                    {info.title}: {info.content}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PricingComparison; 