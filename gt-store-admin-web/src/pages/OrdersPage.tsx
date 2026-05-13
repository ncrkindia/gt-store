import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { formatPrice } from '../lib/formatPrice';

interface OrderItem {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    userId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: OrderItem[];
}

const OrdersPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    const fetchOrders = async () => {
        if (!keycloak.authenticated) return;
        try {
            const response = await apiClient.get('/api/orders/all');
            const data = Array.isArray(response.data) ? response.data : [];
            setOrders(data);
            setFilteredOrders(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching global orders:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) {
            fetchOrders();
        }
    }, [initialized, keycloak.authenticated]);

    // Handle Filtering Logic
    useEffect(() => {
        let result = orders;

        if (statusFilter !== 'ALL') {
            result = result.filter(o => o.status === statusFilter);
        }

        if (searchTerm) {
            result = result.filter(o =>
                o.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredOrders(result);
    }, [searchTerm, statusFilter, orders]);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await apiClient.put(`/api/orders/${id}/status?status=${status}`);
            fetchOrders();
        } catch (error) {
            alert('Error updating order status');
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    if (loading) return <div className="loading">Loading Global Orders...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <h1>Platform Orders</h1>
                <div className="filter-bar">
                    <input
                        type="text"
                        placeholder="Search by Email or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="filter-input"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="READY_TO_BE_SHIPPED">READY TO SHIP</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                    </select>
                </div>
            </header>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredOrders.map(o => (
                        <Fragment key={o.id}>
                            <tr className={expandedOrderId === o.id ? 'row-expanded' : ''}>
                                <td>
                                    <button className="btn-expand" onClick={() => toggleExpand(o.id)}>
                                        {expandedOrderId === o.id ? '▼' : '▶'}
                                    </button>
                                </td>
                                <td className="mono-text">
                                    <Link to={`/orders/${o.id}`} className="font-bold text-indigo-600 hover:underline">
                                        {o.id.substring(0, 8)}...
                                    </Link>
                                </td>
                                <td>{o.userId}</td>
                                <td className="price-text">{formatPrice(o.totalAmount)}</td>
                                <td>
                                    <span className={`status-badge status-${o.status.toLowerCase()}`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <select
                                        className="status-select-sm"
                                        value={o.status}
                                        onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                                    >
                                        <option value="PENDING">PENDING</option>
                                        <option value="PAID">PAID</option>
                                        <option value="READY_TO_BE_SHIPPED">READY TO SHIP</option>
                                        <option value="SHIPPED">SHIPPED</option>
                                        <option value="DELIVERED">DELIVERED</option>
                                        <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                </td>
                            </tr>
                            {expandedOrderId === o.id && (
                                <tr className="order-details-row">
                                    <td colSpan={7}>
                                        <div className="order-details-pane glass-card">
                                            <h4>Order Items Breakdown</h4>
                                            <table className="inner-items-table">
                                                <thead>
                                                    <tr>
                                                        <th>Product SKU</th>
                                                        <th>Quantity</th>
                                                        <th>Unit Price</th>
                                                        <th>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {o.items?.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="mono-text">{item.productId}</td>
                                                            <td>x{item.quantity}</td>
                                                            <td>{formatPrice(item.price)}</td>
                                                            <td>{formatPrice(item.price * item.quantity)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrdersPage;
