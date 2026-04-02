import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

interface InventoryItem {
    id: string;
    productId: string;
    variantId?: string;
    stock: number;
}

interface Product {
    id: string;
    name: string;
}

const InventoryPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [inventory, setInventory] = useState<(InventoryItem & { productName?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateValues, setUpdateValues] = useState<Record<string, number>>({});

    const fetchData = async () => {
        if (!initialized || !keycloak.authenticated) return;
        try {
            const [invRes, prodRes] = await Promise.all([
                apiClient.get('/api/inventory/all'),
                apiClient.get('/api/products')
            ]);

            const invData = Array.isArray(invRes.data) ? invRes.data : [];
            const prodData = Array.isArray(prodRes.data) ? prodRes.data : [];

            const invMap = new Map<string, number>();
            invData.forEach((item: InventoryItem) => invMap.set(item.productId, item.stock));

            const enrichedInv = prodData.map((product: Product) => ({
                id: product.id,
                productId: product.id,
                productName: product.name,
                stock: invMap.get(product.id) ?? 0
            }));

            setInventory(enrichedInv);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching inventory details:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [initialized, keycloak.authenticated]);

    const handleStockChange = (productId: string, value: string) => {
        setUpdateValues(prev => ({
            ...prev,
            [productId]: value === '' ? NaN : parseInt(value)
        }));
    };

    const submitUpdate = async (productId: string) => {
        const newStock = updateValues[productId];
        if (newStock === undefined || isNaN(newStock) || newStock < 0) return;

        try {
            await apiClient.put(`/api/inventory/${productId}/stock?quantity=${newStock}`);
            await fetchData();
            // Clear input
            setUpdateValues(prev => {
                const updated = { ...prev };
                delete updated[productId];
                return updated;
            });
        } catch (error) {
            alert('Error updating stock');
        }
    };

    if (loading) return <div className="loading">Loading Inventory...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <h1>Manage Inventory</h1>
            </header>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Product ID</th>
                        <th>Product Name</th>
                        <th>Current Stock</th>
                        <th>Status</th>
                        <th>Update Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No inventory items found.</td>
                        </tr>
                    ) : (
                        inventory.map(item => (
                            <tr key={item.productId}>
                                <td>{item.productId ? `${item.productId.substring(0, 8)}...` : 'N/A'}</td>
                                <td>{item.productName}</td>
                                <td>
                                    <strong>{item.stock}</strong> units
                                </td>
                                <td>
                                    {item.stock === 0 ? (
                                        <span className="badge badge-error">Out of Stock</span>
                                    ) : item.stock < 10 ? (
                                        <span className="badge badge-warning">Low Stock</span>
                                    ) : (
                                        <span className="badge badge-success">In Stock</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder={item.stock.toString()}
                                            value={isNaN(updateValues[item.productId!]) ? '' : updateValues[item.productId!] ?? ''}
                                            onChange={(e) => handleStockChange(item.productId!, e.target.value)}
                                            style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                                        />
                                        <button
                                            onClick={() => submitUpdate(item.productId!)}
                                            className="btn-primary"
                                            style={{ padding: '8px 16px', fontSize: '0.9em' }}
                                            disabled={updateValues[item.productId!] === undefined || isNaN(updateValues[item.productId!])}
                                        >
                                            Update
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default InventoryPage;
