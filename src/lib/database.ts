import GeoPackageAPI from '@ngageoint/geopackage';

let geoPackage: any = null;

export async function initDatabase() {
    try {
        const response = await fetch('/data/addresses.gpkg');
        const arrayBuffer = await response.arrayBuffer();
        geoPackage = await GeoPackageAPI.open(arrayBuffer);
        console.log('GeoPackage database initialized');
        return geoPackage;
    } catch (error) {
        console.error('Failed to initialize GeoPackage:', error);
        throw error;
    }
}

export function getDatabase() {
    if (!geoPackage) {
        throw new Error('Database not initialized');
    }
    return geoPackage;
}

export async function searchAddresses(postcode: string) {
    const db = getDatabase();
    const table = db.getFeatureTable('addresses');
    const query = `SELECT * FROM addresses WHERE postcode LIKE '${postcode}%'`;
    const results = await table.queryForAll({
        where: query,
        limit: 10
    });

    return results.map(row => ({
        uprn: row.getValue('uprn'),
        address_line_1: row.getValue('address_line_1'),
        town: row.getValue('town'),
        postcode: row.getValue('postcode')
    }));
} 