import { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Search, Filter, AlertCircle, CheckCircle2, Package, Inbox, X } from 'lucide-react';

interface InventoryItem {
    id: string;
    productId: string;
    variantId?: string;
    stock: number;
}

interface Product {
    id: string;
    name: string;
    brand: string;
    categoryIds: string[];
}

interface Category {
    id: string;
    name: string;
}

interface EnrichedInventoryItem {
    productId: string;
    productName: string;
    brand: string;
    categories: string;
    stock: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const InventoryPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [inventory, setInventory] = useState<EnrichedInventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateValues, setUpdateValues] = useState<Record<string, number>>({});
    
    // Filter State
    const [filterId, setFilterId] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const fetchData = async () => {
        if (!initialized || !keycloak.authenticated) return;
        try {
            const [invRes, prodRes, catRes] = await Promise.all([
                apiClient.get('/api/inventory/all'),
                apiClient.get('/api/products?includeUnlisted=true'),
                apiClient.get('/api/categories')
            ]);

            const invData = Array.isArray(invRes.data) ? invRes.data : [];
            const prodDataRaw = prodRes.data;
            const prodData: Product[] = Array.isArray(prodDataRaw.content) 
                ? prodDataRaw.content 
                : (Array.isArray(prodDataRaw) ? prodDataRaw : []);
            
            const catData: Category[] = Array.isArray(catRes.data) ? catRes.data : [];
            const catMap = new Map<string, string>();
            catData.forEach(c => catMap.set(c.id, c.name));

            const invMap = new Map<string, number>();
            invData.forEach((item: InventoryItem) => invMap.set(item.productId, item.stock));

            const enrichedInv: EnrichedInventoryItem[] = prodData.map((product: Product) => {
                const stock = invMap.get(product.id) ?? 0;
                const categories = (product.categoryIds || [])
                    .map(id => catMap.get(id) || id)
                    .join(', ');

                let status: EnrichedInventoryItem['status'] = 'In Stock';
                if (stock === 0) status = 'Out of Stock';
                else if (stock < 10) status = 'Low Stock';

                return {
                    productId: product.id,
                    productName: product.name,
                    brand: product.brand || 'N/A',
                    categories: categories || 'Uncategorized',
                    stock: stock,
                    status: status
                };
            });

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

    // Filtering Logic
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesId = item.productId.toLowerCase().includes(filterId.toLowerCase());
            const matchesName = item.productName.toLowerCase().includes(filterName.toLowerCase());
            const matchesBrand = item.brand.toLowerCase().includes(filterBrand.toLowerCase());
            const matchesCategory = item.categories.toLowerCase().includes(filterCategory.toLowerCase());
            const matchesStatus = filterStatus === 'All' || item.status === filterStatus;

            return matchesId && matchesName && matchesBrand && matchesCategory && matchesStatus;
        });
    }, [inventory, filterId, filterName, filterBrand, filterCategory, filterStatus]);

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
            console.error('Update failed', error);
            alert('Error updating stock');
        }
    };

    if (loading) return <div className="loading">Loading Inventory...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <div className="flex items-center gap-3">
                    <Package className="text-blue-400" size={32} />
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Manage Inventory</h1>
                </div>
                <div className="status-badge status-pending">{filteredInventory.length} products listed</div>
            </header>

            {/* Filter Bar */}
            <div className="filter-section mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="filter-group">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Product ID</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            placeholder="Filter by ID..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800"
                            value={filterId}
                            onChange={e => setFilterId(e.target.value)}
                        />
                    </div>
                </div>
                <div className="filter-group">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Name</label>
                    <div className="relative">
                        <Inbox className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            placeholder="Filter by name..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800"
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="filter-group">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Brand</label>
                    <input 
                        placeholder="Filter by brand..." 
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Category</label>
                    <input 
                        placeholder="Filter by category..." 
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Status</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <select 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition appearance-none cursor-pointer text-slate-800"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Product ID</th>
                            <th>Name</th>
                            <th>Brand</th>
                            <th>Category</th>
                            <th className="text-center">Stock</th>
                            <th>Status</th>
                            <th>Update Stock</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400">
                                    <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                                    No products matching your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredInventory.map(item => (
                                <tr key={item.productId} className="hover:bg-white transition-colors">
                                    <td className="font-mono text-xs text-blue-300/70">{item.productId}</td>
                                    <td>
                                        <div className="font-semibold text-slate-800">{item.productName}</div>
                                    </td>
                                    <td>{item.brand}</td>
                                    <td className="text-xs text-gray-400 max-w-[150px] truncate" title={item.categories}>{item.categories}</td>
                                    <td className="text-center">
                                        <span className={`text-lg font-bold ${item.stock === 0 ? 'text-red-400' : item.stock < 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                            {item.stock}
                                        </span>
                                    </td>
                                    <td>
                                        {item.status === 'Out of Stock' ? (
                                            <span className="status-badge status-cancelled flex items-center gap-1 w-fit whitespace-nowrap">
                                                <X size={12} /> Out of Stock
                                            </span>
                                        ) : item.status === 'Low Stock' ? (
                                            <span className="status-badge status-pending flex items-center gap-1 w-fit whitespace-nowrap">
                                                <AlertCircle size={12} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="status-badge status-delivered flex items-center gap-1 w-fit whitespace-nowrap">
                                                <CheckCircle2 size={12} /> In Stock
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={item.stock.toString()}
                                                className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded focus:border-blue-500/50 outline-none text-sm transition text-slate-800"
                                                value={isNaN(updateValues[item.productId]) ? '' : updateValues[item.productId] ?? ''}
                                                onChange={(e) => handleStockChange(item.productId, e.target.value)}
                                            />
                                            <button
                                                onClick={() => submitUpdate(item.productId)}
                                                className="btn-primary py-1.5 px-3 text-xs"
                                                disabled={updateValues[item.productId] === undefined || isNaN(updateValues[item.productId])}
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
        </div>
    );
};

export default InventoryPage;
