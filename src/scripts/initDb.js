console.log('Script starting...');

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Imports successful');
console.log('Current directory:', process.cwd());

try {
    console.log('Checking source file path...');
    const sourcePath = join(process.cwd(), 'data', 'source', 'addresses.gpkg');
    console.log('Source file path:', sourcePath);
    
    const exists = readFileSync(sourcePath);
    console.log('Source file exists and is readable');
    
} catch (error) {
    console.error('Error:', error);
} 