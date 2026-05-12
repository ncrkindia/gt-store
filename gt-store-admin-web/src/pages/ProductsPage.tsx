import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, Plus } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    salePrice?: number;
    brand: string;
    categoryIds: string[];
    features: string[];
    images: string[];
    inStock: boolean;
    gstPercentage?: number;
}

const ProductsPage = () => {
    const { initialized } = useKeycloak();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // For handling edits vs creates
    const [editingId, setEditingId] = useState<string | null>(null);

    const emptyProduct: Omit<Product, 'id'> = {
        name: '',
        description: '',
        price: 0,
        brand: '',
        categoryIds: [],
        features: [],
        images: [],
        inStock: true,
        gstPercentage: 18
    };
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
    const [featureInput, setFeatureInput] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchProducts = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/products');
            const data = Array.isArray(response.data.content) ? response.data.content : (Array.isArray(response.data) ? response.data : []);
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let savedProduct;
            if (editingId) {
                // Update
                const response = await apiClient.put(`/api/products/${editingId}`, formData);
                savedProduct = response.data;
            } else {
                // Create
                const response = await apiClient.post('/api/products', formData);
                savedProduct = response.data;
            }

            // Sync images if any exist
            if (formData.images.length > 0) {
                 await apiClient.post(`/api/products/${savedProduct.id}/images`, formData.images);
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyProduct);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product', error);
            alert('Error saving product');
        }
    };

    const handleEdit = (p: Product) => {
        setFormData({
            name: p.name,
            description: p.description || '',
            price: p.price,
            salePrice: p.salePrice || undefined,
            brand: p.brand || '',
            categoryIds: p.categoryIds || [],
            features: p.features || [],
            images: p.images || [],
            inStock: p.inStock !== undefined ? p.inStock : true,
            gstPercentage: p.gstPercentage || 18
        });
        setEditingId(p.id);
        setIsModalOpen(true);
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

    const handleAddFeature = () => {
        if (featureInput.trim()) {
            setFormData(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
            setFeatureInput('');
        }
    };

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
    };

    const handleRemoveImage = (index: number) => {
        setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        const form = new FormData();
        form.append('file', file);
        
        setUploadingImage(true);
        try {
            // Upload to media-service via gateway
            const res = await apiClient.post('/api/media/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = res.data.url; // Assuming returns { url, fileName }
            setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
        } catch (error) {
            console.error('Upload failed', error);
            alert('Image upload failed');
        } finally {
            setUploadingImage(false);
            e.target.value = ''; // Reset input
        }
    };

    if (loading) return <div className="loading">Loading Products...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <h1>Product Management</h1>
                <button onClick={() => {
                    setEditingId(null);
                    setFormData(emptyProduct);
                    setIsModalOpen(true);
                }} className="btn-primary">
                    + New Product
                </button>
            </header>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Stock</th>
                        <th>Price (Sale)</th>
                        <th>Brand</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td>{p.id.substring(0, 8)}...</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    {p.images && p.images.length > 0 && (
                                        <img src={getImageUrl(p.images[0])} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <span className="font-medium text-slate-800">{p.name}</span>
                                </div>
                            </td>
                            <td>
                                <span className={p.inStock !== false ? "status-badge status-delivered" : "status-badge status-cancelled"}>
                                    {p.inStock !== false ? "In Stock" : "Out of Stock"}
                                </span>
                            </td>
                            <td>
                                <span className={p.salePrice ? "text-red-400 font-bold" : ""}>{formatPrice(p.salePrice || p.price)}</span>
                                {p.salePrice && <span className="line-through text-gray-500 text-xs ml-1">{formatPrice(p.price)}</span>}
                            </td>
                            <td>{p.brand}</td>
                            <td>
                                <button onClick={() => handleEdit(p)} className="btn-icon">Edit</button>
                                <button onClick={() => handleDelete(p.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {isModalOpen && (
                <div className="modal-overlay overflow-y-auto pt-[10vh]">
                    <div className="modal glass-card mb-8">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group col-span-2 md:col-span-1 mb-0">
                                    <label className="text-sm">Name</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="form-group col-span-2 md:col-span-1 mb-0">
                                    <label className="text-sm">Brand</label>
                                    <input value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="form-group mb-0">
                                    <label className="text-sm">MSRP base Price</label>
                                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-sm">Sale Price (Opt)</label>
                                    <input type="number" step="0.01" value={formData.salePrice || ''} onChange={e => setFormData({ ...formData, salePrice: e.target.value ? parseFloat(e.target.value) : undefined })} />
                                </div>
                                <div className="form-group mb-0">
                                    <label className="text-sm">GST %</label>
                                    <input type="number" min={0} max={100} required value={formData.gstPercentage ?? 18} onChange={e => setFormData({ ...formData, gstPercentage: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="form-group mb-0">
                                <label className="text-sm">Categories (comma separated)</label>
                                <input value={formData.categoryIds.join(', ')} onChange={e => setFormData({ ...formData, categoryIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="electronics, computing" />
                            </div>

                            <div className="form-group mb-0">
                                <label className="text-sm">Description</label>
                                <textarea required rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            {/* Features Array Input */}
                            <div className="form-group mb-0">
                                <label className="text-sm mb-1 block">Key Features</label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 14-inch Liquid Retina Display"
                                        value={featureInput}
                                        onChange={e => setFeatureInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                                        className="flex-1"
                                    />
                                    <button type="button" onClick={handleAddFeature} className="bg-blue-600 px-3 rounded hover:bg-blue-500 text-white"><Plus size={18} /></button>
                                </div>
                                <div className="space-y-1">
                                    {formData.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-blue-900/30 px-3 py-1 rounded border border-blue-500/20 text-sm">
                                            <span>{feat}</span>
                                            <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Image Upload Input */}
                            <div className="form-group mb-0">
                                <label className="text-sm mb-2 block">Product Media</label>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {formData.images.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded overflow-hidden border border-gray-600 group">
                                            <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                                    />
                                    <div className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-400 transition bg-white">
                                        <Upload size={18} />
                                        <span>{uploadingImage ? 'Uploading...' : 'Click or Drag to upload new media'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* InStock Toggle */}
                            <div className="flex items-center gap-3 pt-2">
                                <label className="text-sm font-medium">Availability:</label>
                                <select 
                                    className="status-select-sm"
                                    value={formData.inStock ? "true" : "false"}
                                    onChange={e => setFormData({ ...formData, inStock: e.target.value === "true" })}
                                >
                                    <option value="true">In Stock</option>
                                    <option value="false">Out of Stock</option>
                                </select>
                            </div>

                            <div className="form-buttons pt-4 mt-4 border-t border-gray-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary mr-2 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Cancel</button>
                                <button type="submit" className="btn-primary" disabled={uploadingImage}>
                                    {editingId ? 'Save Changes' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
