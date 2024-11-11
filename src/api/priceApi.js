export const getPricesForTechnology = async (technology, speed) => {
    try {
        const response = await fetch(`/api/prices?technology=${technology}&speed=${speed}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching prices:', error);
        throw error;
    }
};