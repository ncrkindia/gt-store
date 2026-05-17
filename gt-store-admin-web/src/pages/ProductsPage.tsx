import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, Plus, ChevronLeft, Check, ChevronDown, Search } from 'lucide-react';
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
    slug?: string;
    promoted?: boolean;
    promotionPriority?: number;
    listed?: boolean;
}

const getStorefrontUrl = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '4002') {
        return `${protocol}//${hostname}:4000`;
    }
    if (hostname.includes('slpro.in')) {
        return 'https://gtstore.slpro.in';
    }
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

interface Brand {
    id: string;
    name: string;
    slug: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
    icon?: string;
}

const ProductsPage = () => {
    const { initialized } = useKeycloak();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Relational Catalog Assets
    const [allBrands, setAllBrands] = useState<Brand[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    
    // For handling edits vs creates
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const emptyProduct: Omit<Product, 'id'> = {
        name: '',
        description: '',
        price: 0,
        brand: '',
        categoryIds: [],
        features: [],
        images: [],
        inStock: true,
        gstPercentage: 18,
        promoted: false,
        promotionPriority: 0,
        listed: false
    };
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
    const [featureInput, setFeatureInput] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form Element Helper States for Filtering/Search
    const [brandSearch, setBrandSearch] = useState('');
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const brandDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
                setIsBrandDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const fetchProducts = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/products?size=1000&includeUnlisted=true');
            const data = Array.isArray(response.data.content) ? response.data.content : (Array.isArray(response.data) ? response.data : []);
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchMetadata = async () => {
        if (!initialized) return;
        try {
            const [brandsRes, categoriesRes] = await Promise.all([
                apiClient.get('/api/brands'),
                apiClient.get('/api/categories')
            ]);
            setAllBrands(brandsRes.data || []);
            setAllCategories(categoriesRes.data || []);
        } catch (error) {
            console.error('Error fetching meta resources:', error);
        }
    };

    const initializeData = async () => {
        setLoading(true);
        await Promise.all([fetchProducts(), fetchMetadata()]);
        setLoading(false);
    };

    useEffect(() => {
        if (initialized) {
            initializeData();
        }
    }, [initialized]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Enforce relation constraints
        if (!formData.brand) {
            alert('Constraint Violation: Selection of an active Brand is required.');
            return;
        }
        if (formData.categoryIds.length === 0) {
            alert('Constraint Violation: Tagging at least one valid Category is required.');
            return;
        }

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
        } catch (error: any) {
            console.error('Error saving product', error);
            const errorMsg = error.response?.data?.message || 'Error saving product due to constraints';
            alert(`Transaction Terminated: ${errorMsg}`);
        }
    };

    const handleEdit = (p: Product) => {
        // Defensive UI Resilience: Resolve any legacy slug references in categories into ObjectIDs
        const normalizedCategoryIds = (p.categoryIds || []).map(ref => {
            const matched = allCategories.find(cat => cat.id === ref || cat.slug === ref);
            return matched ? matched.id : ref;
        });

        setFormData({
            name: p.name,
            description: p.description || '',
            price: p.price,
            salePrice: p.salePrice || undefined,
            brand: p.brand || '',
            categoryIds: normalizedCategoryIds,
            features: p.features || [],
            images: p.images || [],
            inStock: p.inStock !== undefined ? p.inStock : true,
            gstPercentage: p.gstPercentage || 18,
            promoted: p.promoted !== undefined ? p.promoted : false,
            promotionPriority: p.promotionPriority !== undefined ? p.promotionPriority : 0,
            listed: p.listed !== undefined ? p.listed : true
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

    const handleBulkListing = async (listed: boolean) => {
        if (selectedIds.length === 0) return;
        const actionText = listed ? 'list' : 'unlist';
        if (!window.confirm(`Are you sure you want to ${actionText} the ${selectedIds.length} selected products?`)) return;
        try {
            await apiClient.put(`/api/products/bulk/listing?listed=${listed}`, selectedIds);
            setSelectedIds([]);
            fetchProducts();
        } catch (error) {
            console.error('Error updating bulk listing status', error);
            alert('Failed to update bulk listing status');
        }
    };

    const toggleProductListing = async (product: Product) => {
        const nextStatus = !(product.listed !== undefined ? product.listed : true);
        try {
            await apiClient.put(`/api/products/bulk/listing?listed=${nextStatus}`, [product.id]);
            fetchProducts();
        } catch (error) {
            console.error('Error toggling listing status', error);
            alert('Failed to toggle visibility');
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

    const toggleCategoryMapping = (catId: string) => {
        setFormData(prev => {
            const exists = prev.categoryIds.includes(catId);
            if (exists) {
                return { ...prev, categoryIds: prev.categoryIds.filter(c => c !== catId) };
            } else {
                return { ...prev, categoryIds: [...prev.categoryIds, catId] };
            }
        });
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

    if (loading) return <div className="loading">Loading Product Core & Relations...</div>;

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
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Modify Catalog SKU' : 'Initiate Product Record'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Tag associated hardware manufacturers and cluster categories securely.</p>
                    </div>
                </header>

                <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Product Core Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">Commercial Product Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. NVIDIA GeForce RTX 4080 SUPER" />
                            </div>
                             <div className="form-group relative" ref={brandDropdownRef}>
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">Assigned Brand <span className="text-rose-500 font-bold">*</span></label>
                                <div 
                                    onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                                    className="w-full bg-white font-semibold py-2.5 px-4 border border-slate-200 rounded-xl shadow-2xs text-slate-700 cursor-pointer flex items-center justify-between transition hover:border-slate-300 select-none h-[42px]"
                                >
                                    <span className={formData.brand ? "text-slate-800 font-bold text-sm" : "text-slate-400 text-sm"}>
                                        {formData.brand || "Select System Brand..."}
                                    </span>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isBrandDropdownOpen && (
                                    <div className="absolute z-[60] top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                            <Search size={14} className="text-slate-400 ml-2 shrink-0" />
                                            <input 
                                                type="text"
                                                autoFocus
                                                placeholder="Search catalog brands..."
                                                className="w-full bg-transparent border-0 p-1.5 text-xs focus:ring-0 outline-none font-medium"
                                                value={brandSearch}
                                                onChange={e => setBrandSearch(e.target.value)}
                                            />
                                            {brandSearch && (
                                                <button type="button" onClick={() => setBrandSearch('')} className="p-1 hover:bg-slate-200 rounded-md transition"><X size={12} className="text-slate-400"/></button>
                                            )}
                                        </div>
                                        <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                                            {allBrands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 ? (
                                                <div className="text-[11px] font-bold text-slate-400 text-center py-4">No brands match criteria</div>
                                            ) : (
                                                allBrands
                                                    .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                                                    .map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, brand: b.name });
                                                                setIsBrandDropdownOpen(false);
                                                                setBrandSearch('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${formData.brand === b.name ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 border border-transparent hover:bg-slate-50'}`}
                                                        >
                                                            <span>{b.name}</span>
                                                            {formData.brand === b.name && <Check size={12} strokeWidth={4} />}
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">Brands must be registered within the Brand Management terminal.</p>
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

                        {/* Relational Categories Matrix */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-900">Active Category Clusters <span className="text-rose-500 font-bold">*</span></label>
                                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">At least one existing system category must be selected.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative flex-1 sm:flex-none min-w-[140px]">
                                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Filter categories..."
                                            className="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-36 transition-all hover:border-slate-300 focus:sm:w-52 shadow-2xs"
                                            value={categorySearch}
                                            onChange={e => setCategorySearch(e.target.value)}
                                        />
                                        {categorySearch && (
                                            <button type="button" onClick={() => setCategorySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded transition"><X size={10} className="text-slate-400"/></button>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex-shrink-0">
                                        {formData.categoryIds.length} Clusters Mapped
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                                {allCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => {
                                    // Map mapping to id OR slug based on match, typically IDs are safe
                                    const isMapped = formData.categoryIds.includes(cat.id) || formData.categoryIds.includes(cat.slug);
                                    // Use id string as default tracking identifier
                                    const targetRef = cat.id;
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => toggleCategoryMapping(targetRef)}
                                            className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-extrabold transition cursor-pointer text-left border ${
                                                isMapped 
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200" 
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isMapped ? "bg-white text-indigo-600" : "bg-slate-100 border border-slate-200 text-transparent"}`}>
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                            <span className="truncate flex-1">
                                                {cat.icon && <span className="mr-1.5 text-sm select-none">{cat.icon}</span>}
                                                {cat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                                {allCategories.length > 0 && allCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                                    <div className="col-span-full py-6 text-center text-[11px] font-bold text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                                        No matching clusters found for "{categorySearch}"
                                    </div>
                                )}
                                {allCategories.length === 0 && (
                                    <div className="col-span-full bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 text-xs font-bold text-center">
                                        Critical Missing Asset: No active Categories established. Register Categories first.
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-3 font-medium">At least one existing system category must be selected to allow structural indexing.</p>
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

                        {/* Listing Status Visibility */}
                        <div className="flex items-center justify-between bg-slate-50/40 p-5 border border-slate-100 rounded-2xl">
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-slate-900">Storefront Visibility (Listing Status)</label>
                                <span className="text-xs text-slate-500 font-medium">Controls whether this product is visible and purchasable on the storefront.</span>
                            </div>
                            <select 
                                className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl shadow-xs focus:ring-indigo-500 outline-none"
                                value={formData.listed ? "true" : "false"}
                                onChange={e => setFormData({ ...formData, listed: e.target.value === "true" })}
                            >
                                <option value="true">🌐 Public / Listed</option>
                                <option value="false">🔒 Hidden / Unlisted</option>
                            </select>
                        </div>

                        {/* 
                          * Feature Injection: Promoted Products Configuration Portal
                          * Conditionally shows Priority Score input only if product is explicitly promoted.
                          * High visual contrast design highlights promotion system metadata.
                          */}
                        {/* Promotion Attributes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/30 p-5 border border-amber-100 rounded-2xl shadow-3xs">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col pr-4">
                                    <label className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5">
                                        <span>⭐ Featured Promotion</span>
                                    </label>
                                    <span className="text-[11px] text-amber-700 font-medium mt-0.5">Highlights product on storefront Homepage grids and raises listing priority.</span>
                                </div>
                                <select 
                                    className="bg-white border border-amber-200 text-amber-800 font-bold px-4 py-2 rounded-xl shadow-2xs focus:ring-amber-500 outline-none"
                                    value={formData.promoted ? "true" : "false"}
                                    onChange={e => setFormData({ ...formData, promoted: e.target.value === "true" })}
                                >
                                    <option value="false">Standard Product</option>
                                    <option value="true">🔥 Promoted Picks</option>
                                </select>
                            </div>
                            {formData.promoted && (
                                <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-amber-100 pt-4 md:pt-0 md:pl-5 animate-in fade-in duration-200">
                                    <div className="flex flex-col pr-4">
                                        <label className="text-sm font-bold text-slate-800">Promotion Priority Score</label>
                                        <span className="text-[11px] text-slate-500 font-medium mt-0.5">Defines rendering hierarchy (higher score = placed first).</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        min={0} 
                                        max={999} 
                                        className="w-24 font-black text-center bg-white border border-amber-200 text-amber-700 h-10 rounded-xl"
                                        value={formData.promotionPriority ?? 0} 
                                        onChange={e => setFormData({ ...formData, promotionPriority: parseInt(e.target.value) || 0 })} 
                                    />
                                </div>
                            )}
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

    const filteredProducts = products.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="mb-6 bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search products by Name, Slug, or ID..."
                        className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition hover:border-slate-300 shadow-2xs"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-md transition"><X size={14} className="text-slate-500"/></button>
                    )}
                </div>
                <span className="text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-2">
                    {filteredProducts.length} Total Items Listed
                </span>
            </div>

            {selectedIds.length > 0 && (
                <div className="mb-6 bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-indigo-600 text-white rounded-lg p-1.5 shrink-0 flex items-center justify-center font-black text-xs px-2.5 shadow-2xs">
                            {selectedIds.length} Selected
                        </div>
                        <span className="text-xs font-bold text-indigo-900">Execute catalog visibility adjustments on selected items.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={() => handleBulkListing(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                            🌐 List Selected
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleBulkListing(false)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                            🔒 Unlist Selected
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setSelectedIds([])}
                            className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-extrabold px-4 py-2 rounded-xl transition"
                        >
                            Deselect
                        </button>
                    </div>
                </div>
            )}

            <table className="admin-table">
                <thead>
                    <tr>
                        <th className="w-10">
                            <input 
                                type="checkbox"
                                checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))}
                                onChange={() => {
                                    const allVisibleSelected = filteredProducts.every(p => selectedIds.includes(p.id));
                                    if (allVisibleSelected) {
                                        const filteredIds = filteredProducts.map(p => p.id);
                                        setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                    } else {
                                        const newSelection = Array.from(new Set([...selectedIds, ...filteredProducts.map(p => p.id)]));
                                        setSelectedIds(newSelection);
                                    }
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                        </th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Visibility</th>
                        <th>Stock</th>
                        <th>Price (Sale)</th>
                        <th>Brand</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map(p => (
                        <tr key={p.id}>
                            <td>
                                <input 
                                    type="checkbox"
                                    checked={selectedIds.includes(p.id)}
                                    onChange={() => {
                                        setSelectedIds(prev => 
                                            prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                        );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                            </td>
                            <td>{p.id.substring(0, 8)}...</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    {p.images && p.images.length > 0 && (
                                        <img src={getImageUrl(p.images[0])} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <a 
                                        href={`${getStorefrontUrl()}${p.slug ? `/p/${p.slug}` : `/product/${p.id}`}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                                    >
                                        {p.promoted && <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 flex items-center gap-0.5 shadow-2xs select-none shrink-0" title={`Promotion Priority Score: ${p.promotionPriority}`}>⭐ {p.promotionPriority}</span>}
                                        <span>{p.name}</span>
                                    </a>
                                </div>
                            </td>
                            <td>
                                <span 
                                    className={p.listed !== false ? "status-badge status-delivered cursor-pointer" : "status-badge status-cancelled cursor-pointer"} 
                                    onClick={() => toggleProductListing(p)}
                                    title="Click to toggle visiblity"
                                >
                                    {p.listed !== false ? "🌐 Listed" : "🔒 Unlisted"}
                                </span>
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
                                <button onClick={() => toggleProductListing(p)} className="btn-icon" style={{ marginRight: '6px' }}>
                                    {p.listed !== false ? "Unlist" : "List"}
                                </button>
                                <button onClick={() => handleEdit(p)} className="btn-icon" style={{ marginRight: '6px' }}>Edit</button>
                                <button onClick={() => handleDelete(p.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                        <tr>
                            <td colSpan={8} className="text-center py-10">
                                <div className="text-slate-400 font-bold text-sm italic">
                                    No products found matching your search criteria
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

        </div>
    );
};

export default ProductsPage;
