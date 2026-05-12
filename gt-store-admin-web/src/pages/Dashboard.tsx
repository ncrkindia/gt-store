import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { formatPrice } from '../lib/formatPrice';

/**
 * Admin Dashboard Component.
 * Visualizes business health through key performance indicators (KPIs).
 */
const Dashboard = () => {
    const { keycloak, initialized } = useKeycloak();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        orderCount: 0,
        lowStockItems: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!keycloak.authenticated) return;
            try {
                const [ordersRes, inventoryRes] = await Promise.all([
                    apiClient.get('/api/orders/all'),
                    apiClient.get('/api/inventory/all')
                ]);

                const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
                const inventoryData = Array.isArray(inventoryRes.data) ? inventoryRes.data : [];

                const totalRevenue = ordersData.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
                const lowStockItems = inventoryData.filter((i: any) => i.stock < 10).length;

                setStats({
                    totalRevenue,
                    orderCount: ordersData.length,
                    lowStockItems
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setLoading(false);
            }
        };

        if (initialized) {
            fetchStats();
        }
    }, [initialized, keycloak.authenticated]);

    if (loading) return <div className="loading">Loading Dashboard Analytics...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Overview</h1>
                <p>Real-time system health and sales performance.</p>
            </header>

            <div className="stats-grid">
                <div className="stats-card glass-card">
                    <div className="stats-info">
                        <span className="stats-label">Total Revenue</span>
                        <h2 className="stats-value highlight-text">{formatPrice(stats.totalRevenue)}</h2>
                    </div>
                </div>
                <div className="stats-card glass-card">
                    <div className="stats-info">
                        <span className="stats-label">Total Orders</span>
                        <h2 className="stats-value">{stats.orderCount}</h2>
                    </div>
                </div>
                <div className="stats-card glass-card alert-card">
                    <div className="stats-info">
                        <span className="stats-label">Low Stock Alerts</span>
                        <h2 className="stats-value">{stats.lowStockItems}</h2>
                    </div>
                </div>
            </div>

            <div className="dashboard-body glass-card">
                <h3>System Status</h3>
                <div className="status-list">
                    <div className="status-item">
                        <span className="status-dot online"></span>
                        <span>API Gateway: Online</span>
                    </div>
                    <div className="status-item">
                        <span className="status-dot online"></span>
                        <span>Inventory Service: Online</span>
                    </div>
                    <div className="status-item">
                        <span className="status-dot online"></span>
                        <span>Payment Service: Online</span>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700">
                    <h4 className="text-gray-400 text-sm mb-4 uppercase tracking-wider">Maintenance Actions</h4>
                    <button 
                        onClick={async () => {
                            if (window.confirm('This will resync all products to the Search engine. Continue?')) {
                                try {
                                    const res = await apiClient.post('/api/products/sync');
                                    alert(res.data);
                                } catch (err) {
                                    alert('Sync failed. Check console for details.');
                                }
                            }
                        }}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Sync Search Index
                    </button>
                    <p className="text-xs text-gray-500 mt-2 italic">Triggers a pull-based re-indexing of all products from the catalog to Elasticsearch.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
