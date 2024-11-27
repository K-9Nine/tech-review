import { useEffect } from 'react';
import { initDatabase } from '@/lib/database';

function MyApp({ Component, pageProps }) {
    useEffect(() => {
        initDatabase().catch(console.error);
    }, []);

    return <Component {...pageProps} />;
}

export default MyApp; 