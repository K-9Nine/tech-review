import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const AdminLayout = () => {
    return (
        <div className="flex h-screen">
            <nav className="w-64 bg-gray-100 p-4">
                <h2 className="text-xl font-bold mb-4">Admin Panel</h2>
                <Link to="/admin/price-management" className="block p-2 hover:bg-gray-200 rounded">
                    Price Management
                </Link>
            </nav>
            <main className="flex-1 p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;