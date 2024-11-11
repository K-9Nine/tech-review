import React from 'react';
import { Settings, Database, Users, BarChart } from 'lucide-react';

const AdminLayout = ({ children }) => {
    const menuItems = [
        { icon: BarChart, label: 'Dashboard', path: '/admin' },
        { icon: Database, label: 'Price Management', path: '/admin/prices' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' }
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold text-gray-800">
                                    Tech Review Admin
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {/* Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <div className="bg-white rounded-lg shadow">
                                <nav className="space-y-1">
                                    {menuItems.map((item) => (
                                        <a
                                            key={item.path}
                                            href={item.path}
                                            className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        >
                                            <item.icon className="w-5 h-5 mr-3" />
                                            {item.label}
                                        </a>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <div className="bg-white rounded-lg shadow">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;