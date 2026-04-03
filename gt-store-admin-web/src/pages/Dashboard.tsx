import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

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
                        <h2 className="stats-value highlight-text">${stats.totalRevenue.toLocaleString()}</h2>
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
            </div>
        </div>
    );
};

export default Dashboard;
