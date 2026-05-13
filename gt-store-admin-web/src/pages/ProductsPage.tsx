import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, Plus, ChevronLeft } from 'lucide-react';
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

    if (isModalOpen) {
        return (
            <div className="page-container glass-card">
                <header className="page-header border-b border-slate-200 pb-4 mb-6 flex items-center gap-4">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-2xs transition flex items-center justify-center"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Product Pipeline' : 'Onboard New Product'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Manage inventory profile, pricing tiers, categories, and multimedia.</p>
                    </div>
                </header>

                <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Product Core Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Product Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. NVIDIA GeForce RTX 4080 SUPER" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Brand / Manufacturer</label>
                                <input className="w-full" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. NVIDIA" />
                            </div>
                        </div>

                        {/* Pricing Tiers */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">MSRP Base Price (₹)</label>
                                <input className="w-full" type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Sale Price (Optional)</label>
                                <input className="w-full" type="number" step="0.01" value={formData.salePrice || ''} onChange={e => setFormData({ ...formData, salePrice: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="e.g. 94999" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">GST Percentage (%)</label>
                                <input className="w-full" type="number" min={0} max={100} required value={formData.gstPercentage ?? 18} onChange={e => setFormData({ ...formData, gstPercentage: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Category Mappings (Comma separated)</label>
                            <input className="w-full" value={formData.categoryIds.join(', ')} onChange={e => setFormData({ ...formData, categoryIds: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) })} placeholder="graphics-cards, computing, hardware" />
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Marketing Overview Description</label>
                            <textarea className="w-full min-h-[120px]" required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe user benefits, architecture features, and tech specifications..." />
                        </div>

                        {/* Key Highlights Array */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6">
                            <label className="block text-sm font-extrabold text-slate-900 mb-3">Platform Key Highlights & Specs</label>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="text" 
                                    placeholder="e.g. 16GB GDDR6X 256-bit Memory Interface"
                                    value={featureInput}
                                    onChange={e => setFeatureInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                                    className="flex-1 bg-white"
                                />
                                <button type="button" onClick={handleAddFeature} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center justify-center transition shadow-sm"><Plus size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {formData.features.map((feat, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700">
                                        <span className="truncate pr-3">{feat}</span>
                                        <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-slate-400 hover:text-red-600 transition"><X size={16} /></button>
                                    </div>
                                ))}
                                {formData.features.length === 0 && (
                                     <p className="text-xs text-slate-400 italic">No key highlights logged yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Digital Assets Block */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6">
                            <label className="block text-sm font-extrabold text-slate-900 mb-3">Product Media & Images Gallery</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center group p-1 shadow-3xs">
                                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" />
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="relative cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                />
                                <div className="border-2 border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition duration-200">
                                    <Upload className="mx-auto mb-2 text-slate-400" size={24} />
                                    <span className="text-sm font-bold text-slate-800 block">{uploadingImage ? 'Processing Uplink...' : 'Add Product Media'}</span>
                                    <span className="text-xs text-slate-500 mt-1 block">Supports standard product photography formats.</span>
                                </div>
                            </div>
                        </div>

                        {/* Lifecycle Details */}
                        <div className="flex items-center justify-between bg-slate-50/40 p-5 border border-slate-100 rounded-2xl">
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-slate-900">Inventory Warehouse Availability</label>
                                <span className="text-xs text-slate-500 font-medium">Toggles instant purchase capabilities across the main store.</span>
                            </div>
                            <select 
                                className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl shadow-xs focus:ring-indigo-500 outline-none"
                                value={formData.inStock ? "true" : "false"}
                                onChange={e => setFormData({ ...formData, inStock: e.target.value === "true" })}
                            >
                                <option value="true">🟢 In Stock</option>
                                <option value="false">🔴 Out of Stock</option>
                            </select>
                        </div>

                        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-2.5 px-6">Abort Operation</button>
                            <button type="submit" className="btn-primary py-2.5 px-8" disabled={uploadingImage}>
                                {editingId ? 'Apply Realtime Edits' : 'Propagate Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

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

        </div>
    );
};

export default ProductsPage;
