import { useState, useEffect, useMemo, useRef } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { toast } from 'sonner';
import { 
    Search, Filter, AlertCircle, CheckCircle2, Package, Inbox, X,
    Download, Upload, FileText, Loader2, Play, Info
} from 'lucide-react';

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

// RFC-Compliant CSV Parser
function parseCSV(text: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentToken = '';
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentToken += '"';
                i++; // skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(currentToken.trim());
            currentToken = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            row.push(currentToken.trim());
            lines.push(row);
            row = [];
            currentToken = '';
        } else {
            currentToken += char;
        }
    }
    
    if (currentToken || row.length > 0) {
        row.push(currentToken.trim());
        lines.push(row);
    }
    
    return lines;
}

// RFC-Compliant CSV Stringifier
function generateCSV(headers: string[], rows: string[][]): string {
    const formatValue = (val: string) => {
        const cleaned = val ? val.replace(/"/g, '""') : '';
        if (cleaned.includes(',') || cleaned.includes('\n') || cleaned.includes('\r') || cleaned.includes('"')) {
            return `"${cleaned}"`;
        }
        return cleaned;
    };
    
    const headerRow = headers.map(formatValue).join(',');
    const bodyRows = rows.map(row => row.map(formatValue).join(',')).join('\n');
    return headerRow + '\n' + bodyRows;
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

    // CSV Import / Export States
    const [showImportModal, setShowImportModal] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    
    const [importProgress, setImportProgress] = useState<{
        total: number;
        current: number;
        success: number;
        failed: number;
        logs: { type: 'success' | 'error'; message: string }[];
        status: 'idle' | 'processing' | 'done';
    }>({
        total: 0,
        current: 0,
        success: 0,
        failed: 0,
        logs: [],
        status: 'idle'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

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

    // Scroll progress logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [importProgress.logs]);

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
            toast.success(`Stock updated successfully for Product ${productId}`);
            await fetchData();
            // Clear input
            setUpdateValues(prev => {
                const updated = { ...prev };
                delete updated[productId];
                return updated;
            });
        } catch (error) {
            console.error('Update failed', error);
            toast.error('Error updating stock level');
        }
    };

    // CSV Exporter
    const handleExportCSV = () => {
        if (filteredInventory.length === 0) {
            toast.warning('No inventory records found to export!');
            return;
        }
        
        const headers = ['productId', 'productName', 'brand', 'categories', 'stock'];
        const rows = filteredInventory.map(item => [
            item.productId,
            item.productName,
            item.brand,
            item.categories,
            item.stock.toString()
        ]);
        
        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Successfully exported inventory ledger CSV.');
    };

    // Download CSV Import Template
    const handleDownloadTemplate = () => {
        const headers = ['productId', 'stock'];
        const rows = [
            ['69d87805ae1526b5a68de669', '500'],
            ['6a0348626644d06a165cc4ad', '250']
        ];
        
        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'inventory_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded inventory import template.');
    };

    // Drag and Drop handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processCSV(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processCSV(file);
    };

    const processCSV = (file: File) => {
        setCsvFile(file);
        setValidationError(null);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rawLines = parseCSV(text);
                
                if (rawLines.length < 2) {
                    throw new Error('CSV must contain a header row and at least one data row.');
                }
                
                const headers = rawLines[0].map(h => h.trim());
                const rows = rawLines.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
                
                // Identify target fields
                const productIdKey = headers.find(h => ['productid', 'product_id', 'sku', 'id'].includes(h.toLowerCase().replace(/[^a-z0-9]/g, '')));
                const stockKey = headers.find(h => ['stock', 'quantity', 'stocklevel', 'qty', 'count'].includes(h.toLowerCase().replace(/[^a-z0-9]/g, '')));
                
                if (!productIdKey || !stockKey) {
                    throw new Error(`Invalid CSV headers. Missing required columns. We require fields for 'productId' and 'stock'. Found columns: [${headers.join(', ')}].`);
                }
                
                // Map rows to ONLY the target fields used for inventory updates
                const mappedData = rows.map((row) => {
                    return {
                        'productId': row[headers.indexOf(productIdKey)] || '',
                        'stock': row[headers.indexOf(stockKey)] || ''
                    };
                });
                
                setParsedRows(mappedData);
                toast.info(`Successfully parsed ${mappedData.length} records matching target fields.`);
            } catch (err: any) {
                setValidationError(err.message || 'Failed to parse CSV file.');
            }
        };
        reader.readAsText(file);
    };

    const resetImportState = () => {
        setCsvFile(null);
        setParsedRows([]);
        setValidationError(null);
        setImportProgress({
            total: 0,
            current: 0,
            success: 0,
            failed: 0,
            logs: [],
            status: 'idle'
        });
    };

    // Sequential Import Executer
    const runImport = async () => {
        if (parsedRows.length === 0) return;
        
        setImportProgress({
            total: parsedRows.length,
            current: 0,
            success: 0,
            failed: 0,
            logs: [],
            status: 'processing'
        });
        
        for (let i = 0; i < parsedRows.length; i++) {
            const row = parsedRows[i];
            const rowNum = i + 1;
            
            try {
                const getVal = (aliases: string[]) => {
                    const key = Object.keys(row).find(k => aliases.includes(k.toLowerCase().trim().replace(/[^a-z0-9]/g, '')));
                    return key ? row[key] : '';
                };
                
                const productId = getVal(['productid', 'product_id', 'sku', 'id']);
                const stockStr = getVal(['stock', 'quantity', 'stocklevel', 'qty', 'count']);
                
                if (!productId || stockStr === '') {
                    throw new Error(`Missing mandatory fields: productId or stock.`);
                }
                
                const quantity = parseInt(stockStr);
                if (isNaN(quantity) || quantity < 0) {
                    throw new Error(`Invalid stock count "${stockStr}". Must be a non-negative integer.`);
                }
                
                // Sync to Microservice API
                await apiClient.put(`/api/inventory/${productId.trim()}/stock?quantity=${quantity}`);
                
                setImportProgress(prev => ({
                    ...prev,
                    current: rowNum,
                    success: prev.success + 1,
                    logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully updated Product ID [${productId}] stock count to ${quantity}.` }]
                }));
            } catch (err: any) {
                const errMsg = err.response?.data?.message || err.message || 'Verification failure';
                setImportProgress(prev => ({
                    ...prev,
                    current: rowNum,
                    failed: prev.failed + 1,
                    logs: [...prev.logs, { type: 'error', message: `Row ${rowNum} Failed: ${errMsg}` }]
                }));
            }
        }
        
        setImportProgress(prev => ({
            ...prev,
            status: 'done'
        }));
        
        toast.success(`Bulk inventory sync finished.`);
        fetchData();
    };

    if (loading) return <div className="loading">Loading Inventory...</div>;

    return (
        <div className="page-container glass-card">
            {/* Rich Responsive Header with Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <Package className="text-blue-500" size={32} />
                    <div className="text-left">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Manage Inventory</h1>
                        <p className="text-slate-500 text-xs font-semibold mt-1">
                            Verify stock counts, edit warehouse allocations, or import/export inventory ledger.
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="status-badge status-pending">{filteredInventory.length} products listed</div>
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => { setShowImportModal(true); resetImportState(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition cursor-pointer"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import CSV</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-section mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="filter-group text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Product ID</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            placeholder="Filter by ID..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800 font-semibold"
                            value={filterId}
                            onChange={e => setFilterId(e.target.value)}
                        />
                    </div>
                </div>
                <div className="filter-group text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Name</label>
                    <div className="relative">
                        <Inbox className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            placeholder="Filter by name..." 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800 font-semibold"
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="filter-group text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Brand</label>
                    <input 
                        placeholder="Filter by brand..." 
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800 font-semibold"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                    />
                </div>
                <div className="filter-group text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Category</label>
                    <input 
                        placeholder="Filter by category..." 
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition text-slate-800 font-semibold"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    />
                </div>
                <div className="filter-group text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-600 mb-1 block font-semibold">Status</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <select 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500/50 outline-none transition appearance-none cursor-pointer text-slate-800 font-bold"
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

            {/* Inventory Ledger Table */}
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
                                <td colSpan={7} className="text-center py-12 text-gray-400 font-bold">
                                    <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                                    No products matching your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredInventory.map(item => (
                                <tr key={item.productId} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="font-mono text-xs text-blue-500 font-bold">{item.productId}</td>
                                    <td>
                                        <div className="font-bold text-slate-850">{item.productName}</div>
                                    </td>
                                    <td className="font-semibold text-slate-600">{item.brand}</td>
                                    <td className="text-xs text-slate-400 font-medium max-w-[150px] truncate" title={item.categories}>{item.categories}</td>
                                    <td className="text-center">
                                        <span className={`text-lg font-black ${item.stock === 0 ? 'text-rose-500' : item.stock < 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {item.stock}
                                        </span>
                                    </td>
                                    <td>
                                        {item.status === 'Out of Stock' ? (
                                            <span className="status-badge status-cancelled flex items-center gap-1 w-fit whitespace-nowrap font-extrabold">
                                                <X size={12} /> Out of Stock
                                            </span>
                                        ) : item.status === 'Low Stock' ? (
                                            <span className="status-badge status-pending flex items-center gap-1 w-fit whitespace-nowrap font-extrabold">
                                                <AlertCircle size={12} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="status-badge status-delivered flex items-center gap-1 w-fit whitespace-nowrap font-extrabold">
                                                <CheckCircle2 size={12} /> In Stock
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex gap-2 items-center justify-start">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={item.stock.toString()}
                                                className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded focus:border-blue-500/50 outline-none text-sm transition text-slate-800 font-bold"
                                                value={isNaN(updateValues[item.productId]) ? '' : updateValues[item.productId] ?? ''}
                                                onChange={(e) => handleStockChange(item.productId, e.target.value)}
                                            />
                                            <button
                                                onClick={() => submitUpdate(item.productId)}
                                                className="btn-primary py-1.5 px-3 text-xs bg-blue-600 hover:bg-blue-700 font-bold"
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

            {/* HIGH-FIDELITY FULL-PAGE CSV IMPORT OVERLAY */}
            {showImportModal && (
                <div className="fixed inset-0 bg-white z-[1000] flex flex-col animate-in fade-in duration-200 overflow-hidden text-left">
                    {/* Decorative Top Line */}
                    <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-emerald-500 w-full shrink-0" />
                    
                    {/* Content Container */}
                    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col overflow-hidden relative">
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                if (importProgress.status === 'processing') {
                                    if (!confirm('Import operations are currently active. Do you wish to abort?')) return;
                                }
                                setShowImportModal(false);
                            }}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Upload className="w-6 h-6 text-blue-600" />
                                Bulk CSV Stock Synchronization
                            </h2>
                            <p className="text-slate-400 text-xs font-semibold mt-1">
                                Align, overwrite, and verify warehouse stock levels dynamically through spreadsheets.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1">
                            {importProgress.status === 'idle' ? (
                                <div className="space-y-6">
                                    {/* Operational Guide Alert */}
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-900 text-sm leading-relaxed">
                                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Import Directions</p>
                                            <p className="text-xs text-blue-700 mt-1 font-semibold">
                                                Provide a spreadsheet containing the mandatory product SKU identifiers and their new target inventory counts. 
                                            </p>
                                            
                                            {/* Download sample template */}
                                            <div className="mt-3 flex items-center gap-3">
                                                <button
                                                    onClick={handleDownloadTemplate}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:border-blue-300 text-blue-600 font-extrabold text-xs rounded-lg shadow-3xs transition cursor-pointer"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Download Stock CSV Template
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Drag & Drop File Zone */}
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                            dragActive 
                                                ? 'border-blue-600 bg-blue-50/20' 
                                                : 'border-slate-200 hover:border-blue-400 bg-slate-50/30 hover:bg-slate-50/60'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 mx-auto shadow-sm mb-4">
                                            <FileText className="w-6 h-6 text-slate-500" />
                                        </div>
                                        
                                        {csvFile ? (
                                            <div>
                                                <p className="font-extrabold text-slate-800 text-sm">{csvFile.name}</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1">{(csvFile.size / 1024).toFixed(2)} KB • Click or Drag to replace</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-extrabold text-slate-700 text-sm">Drag and drop your stock list sheet here</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1">or click to browse your desktop directories</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Error Banner */}
                                    {validationError && (
                                        <div className="bg-red-50 border border-red-100 text-red-800 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed font-semibold">
                                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                            <span>{validationError}</span>
                                        </div>
                                    )}

                                    {/* Parsed Rows FULL DATA Preview */}
                                    {parsedRows.length > 0 && (
                                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs bg-white">
                                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Sheet Data Preview (Full Listing)</span>
                                                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-[10px] font-black">{parsedRows.length} Rows</span>
                                            </div>
                                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                                                        <tr className="bg-slate-100/30 text-slate-500 font-bold uppercase">
                                                            {Object.keys(parsedRows[0]).map(h => (
                                                                <th key={h} className="px-4 py-2">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                                                        {parsedRows.map((r, ri) => (
                                                            <tr key={ri} className="hover:bg-slate-50/50">
                                                                {Object.keys(parsedRows[0]).map(h => (
                                                                    <td key={h} className="px-4 py-2 font-mono text-[10px] max-w-[180px] truncate">{r[h]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Operations Tracker */}
                                    <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                                {importProgress.status === 'processing' ? 'Re-aligning stock values...' : 'Warehouse synched!'}
                                            </span>
                                            <span className="text-sm font-black text-slate-800">
                                                {importProgress.current} / {importProgress.total} Records ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                                            </span>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-5">
                                            <div 
                                                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                            />
                                        </div>

                                        {/* Counter Metrics */}
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-3xs">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Processed</div>
                                                <div className="text-lg font-black text-slate-700 mt-0.5">{importProgress.current}</div>
                                            </div>
                                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">Succeeded</div>
                                                <div className="text-lg font-black text-emerald-700 mt-0.5">{importProgress.success}</div>
                                            </div>
                                            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3">
                                                <div className="text-[10px] font-black text-rose-600 uppercase tracking-wide">Failed</div>
                                                <div className="text-lg font-black text-rose-700 mt-0.5">{importProgress.failed}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scrolling Log Terminal */}
                                    <div className="bg-slate-900 rounded-2xl p-5 shadow-inner border border-slate-800 flex flex-col h-[280px]">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                            <span className="text-[10px] font-bold text-slate-500 font-mono">STOCK OPERATION TELEMETRY LOG</span>
                                            {importProgress.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                                        </div>
                                        <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1.5 pr-2">
                                            {importProgress.logs.map((log, li) => (
                                                <div key={li} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    <span className="shrink-0 font-bold select-none">{log.type === 'error' ? '✖' : '✔'}</span>
                                                    <span>{log.message}</span>
                                                </div>
                                            ))}
                                            <div ref={logsEndRef} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="border-t border-slate-100 pt-6 mt-6 flex items-center justify-between">
                            <div>
                                {importProgress.status === 'processing' && (
                                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-2 animate-pulse">
                                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                        Streaming stock allocations. Please do not navigate away...
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {importProgress.status === 'idle' && (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={() => setShowImportModal(false)}
                                            className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="button"
                                            disabled={parsedRows.length === 0}
                                            onClick={runImport}
                                            className="btn-primary text-sm py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            <Play className="w-4 h-4" />
                                            <span>Run Synchronization</span>
                                        </button>
                                    </>
                                )}
                                {importProgress.status === 'done' && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowImportModal(false)}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
                                    >
                                        Close and Refresh
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
