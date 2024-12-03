import React from 'react';
import { Card, Grid, Typography, Divider, Chip } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SpeedIcon from '@mui/icons-material/Speed';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const COLORS = {
    primary: 'rgb(73,166,56)',     // Green
    secondary: 'rgb(39,136,159)',  // Blue
    black: 'rgb(0,0,0)',
    neonBlue: 'rgb(92,252,247)',
    neonGreen: 'rgb(108,250,161)',
    white: 'rgb(255,255,255)'
};

export const PricingComparison = ({ currentService, quotes }) => {
    if (!quotes?.length) return null;

    // Find like-for-like quote
    const likeForLikeQuote = quotes.find(quote => 
        quote.speed === parseInt(currentService.speed) &&
        quote.term_months === 36
    );

    // Find optimized quote (highest speed with best value)
    const optimizedQuote = quotes.reduce((best, current) => {
        if (!best) return current;
        const bestValue = best.speed / best.monthly_cost;
        const currentValue = current.speed / current.monthly_cost;
        return currentValue > bestValue ? current : best;
    }, null);

    const cardStyle = (color) => ({
        p: 3,
        height: '100%',
        bgcolor: COLORS.black,
        color: COLORS.white,
        border: `1px solid ${color}`,
        boxShadow: `0 0 10px ${color}`,
        transition: 'transform 0.2s',
        '&:hover': {
            transform: 'scale(1.02)',
        }
    });

    return (
        <Grid container spacing={3} sx={{ mt: 3 }}>
            {/* Current Service */}
            <Grid item xs={12} md={4}>
                <Card sx={cardStyle(COLORS.neonBlue)}>
                    <Typography variant="h6" gutterBottom sx={{ color: COLORS.neonBlue }}>
                        <TrendingUpIcon sx={{ mr: 1 }} />
                        Current Service
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: COLORS.neonBlue }} />
                    <Typography variant="body1" paragraph>
                        Speed: {currentService.speed}Mbps
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Monthly Cost: £{currentService.price}
                    </Typography>
                    <Typography variant="body1">
                        Provider: {currentService.provider}
                    </Typography>
                </Card>
            </Grid>

            {/* Like for Like */}
            <Grid item xs={12} md={4}>
                <Card sx={cardStyle(COLORS.primary)}>
                    <Typography variant="h6" gutterBottom sx={{ color: COLORS.primary }}>
                        <CompareArrowsIcon sx={{ mr: 1 }} />
                        Like-for-Like Option
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: COLORS.primary }} />
                    {likeForLikeQuote ? (
                        <>
                            <Chip 
                                label={`${Math.round((currentService.price - likeForLikeQuote.monthly_cost) / currentService.price * 100)}% Savings`}
                                sx={{ 
                                    mb: 2, 
                                    bgcolor: COLORS.neonGreen,
                                    color: COLORS.black,
                                    fontWeight: 'bold'
                                }}
                            />
                            <Typography variant="body1" paragraph>
                                Speed: {likeForLikeQuote.speed}Mbps
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Monthly Cost: £{likeForLikeQuote.monthly_cost.toFixed(2)}
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Provider: {likeForLikeQuote.supplier.name}
                            </Typography>
                            <Typography variant="body1">
                                Term: {likeForLikeQuote.term_months} months
                            </Typography>
                        </>
                    ) : (
                        <Typography>No like-for-like option available</Typography>
                    )}
                </Card>
            </Grid>

            {/* Optimized Option */}
            <Grid item xs={12} md={4}>
                <Card sx={cardStyle(COLORS.secondary)}>
                    <Typography variant="h6" gutterBottom sx={{ color: COLORS.secondary }}>
                        <SpeedIcon sx={{ mr: 1 }} />
                        Best Value Option
                    </Typography>
                    <Divider sx={{ my: 2, borderColor: COLORS.secondary }} />
                    {optimizedQuote && (
                        <>
                            <Chip 
                                icon={<SavingsIcon />}
                                label="Optimized Speed/Cost"
                                sx={{ 
                                    mb: 2, 
                                    bgcolor: COLORS.neonGreen,
                                    color: COLORS.black,
                                    fontWeight: 'bold'
                                }}
                            />
                            <Typography variant="body1" paragraph>
                                Speed: {optimizedQuote.speed}Mbps
                                {currentService.speed && optimizedQuote.speed > parseInt(currentService.speed) && (
                                    <Chip 
                                        size="small"
                                        label={`${Math.round(optimizedQuote.speed/parseInt(currentService.speed))}x Faster`}
                                        sx={{ 
                                            ml: 1, 
                                            bgcolor: COLORS.neonBlue,
                                            color: COLORS.black,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Monthly Cost: £{optimizedQuote.monthly_cost.toFixed(2)}
                            </Typography>
                            <Typography variant="body1" paragraph>
                                Provider: {optimizedQuote.supplier.name}
                            </Typography>
                            <Typography variant="body1">
                                Term: {optimizedQuote.term_months} months
                            </Typography>
                        </>
                    )}
                </Card>
            </Grid>
        </Grid>
    );
};

export default PricingComparison; 