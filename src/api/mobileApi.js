export const getMobilePrices = async (dataAllowance, contractType) => {
    try {
        const response = await fetch(`/api/mobile-prices?data=${dataAllowance}&type=${contractType}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching mobile prices:', error);
        throw error;
    }
};