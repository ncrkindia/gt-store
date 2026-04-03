import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    brand: string;
    categoryIds: string[];
}

const ProductsPage = () => {
    const { initialized } = useKeycloak();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
        name: '',
        description: '',
        price: 0,
        brand: '',
        categoryIds: [] as string[]
    });

    const fetchProducts = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/products');
            const data = Array.isArray(response.data) ? response.data : [];
            setProducts(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [initialized]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/api/products', newProduct);
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            alert('Error creating product');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await apiClient.delete(`/api/products/${id}`);
            fetchProducts();
        } catch (error) {
            alert('Error deleting product');
        }
    };

    if (loading) return <div className="loading">Loading Products...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <h1>Product Management</h1>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary">
                    + New Product
                </button>
            </header>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Brand</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.id.substring(0, 8)}...</td>
                            <td>{p.name}</td>
                            <td>{p.categoryIds?.join(', ') || 'N/A'}</td>
                            <td>${p.price.toFixed(2)}</td>
                            <td>{p.brand}</td>
                            <td>
                                <button className="btn-icon">Edit</button>
                                <button onClick={() => handleDelete(p.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal glass-card">
                        <h2>Add New Product</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Name</label>
                                <input required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Price</label>
                                <input type="number" step="0.01" required value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea required value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
                            </div>
                            <div className="form-buttons">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
