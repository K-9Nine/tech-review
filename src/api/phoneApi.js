export const getPhoneSystemPrices = async (type, users) => {
    try {
        const response = await fetch(`/api/phone-prices?type=${type}&users=${users}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching phone system prices:', error);
        throw error;
    }
};