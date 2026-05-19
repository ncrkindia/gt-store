import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { 
    Upload, X, ChevronLeft, Search, Download, FileText, 
    AlertCircle, Play, Settings, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface Category {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    parentId?: string;
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

const CategoriesPage = () => {
    const { initialized } = useKeycloak();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const emptyCategory: Omit<Category, 'id'> = {
        name: '',
        slug: '',
        imageUrl: '',
        parentId: ''
    };
    const [formData, setFormData] = useState<Omit<Category, 'id'>>(emptyCategory);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // CSV Import / Export states
    const [showImportModal, setShowImportModal] = useState(false);
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
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll logs
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
        }
    }, [importProgress.logs]);

    const fetchCategories = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/categories');
            setCategories(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialized) {
            fetchCategories();
        }
    }, [initialized]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/api/categories/${editingId}`, formData);
                toast.success('Successfully updated category.');
            } else {
                await apiClient.post('/api/categories', formData);
                toast.success('Successfully registered category.');
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyCategory);
            fetchCategories();
        } catch (error) {
            console.error('Error saving category', error);
            toast.error('Error saving category attributes');
        }
    };

    const handleEdit = (c: Category) => {
        setFormData({
            name: c.name,
            slug: c.slug,
            imageUrl: c.imageUrl || '',
            parentId: c.parentId || ''
        });
        setEditingId(c.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;
        try {
            await apiClient.delete(`/api/categories/${id}`);
            toast.success('Successfully deleted category.');
            fetchCategories();
        } catch (error) {
            toast.error('Error deleting category Node.');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const form = new FormData();
        form.append('file', file);
        
        setUploadingImage(true);
        try {
            const res = await apiClient.post('/api/media/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, imageUrl: res.data.url }));
            toast.success('Image uploaded successfully.');
        } catch (error) {
            toast.error('Image upload failed.');
        } finally {
            setUploadingImage(false);
        }
    };

    // Reset Import State
    const resetImportState = () => {
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

    // Export Filtered Categories to CSV
    const handleExportCSV = () => {
        if (filteredCategories.length === 0) {
            toast.warning('No categories matching your filter to export.');
            return;
        }

        const headers = ['id', 'name', 'slug', 'imageUrl', 'parentId'];
        const rows = filteredCategories.map(c => [
            c.id || '',
            c.name || '',
            c.slug || '',
            c.imageUrl || '',
            c.parentId || ''
        ]);
        
        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `categories_catalog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Successfully exported filtered categories catalog.');
    };

    // Download CSV template
    const handleDownloadTemplate = () => {
        const headers = ['id', 'name', 'slug', 'imageUrl', 'parentId'];
        const sampleRows = [
            ['', 'Electronics', 'electronics', 'https://example.com/electronics.png', ''],
            ['', 'Gaming Laptops', 'gaming-laptops', 'https://example.com/laptops.png', 'electronics']
        ];
        
        const csvContent = generateCSV(headers, sampleRows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'categories_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded category import template.');
    };

    // Drag-Drop handlers
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
        setValidationError(null);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rawLines = parseCSV(text);
                
                if (rawLines.length < 2) {
                    throw new Error('CSV must contain a header row and at least one data row.');
                }
                
                const headers = rawLines[0].map(h => h.toLowerCase().trim());
                const rows = rawLines.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
                
                // Identify target fields
                const idKeyIdx = headers.findIndex(h => ['id', 'categoryid', 'category_id'].includes(h.replace(/[^a-z0-9]/g, '')));
                const nameKeyIdx = headers.findIndex(h => ['name', 'categoryname', 'category_name'].includes(h.replace(/[^a-z0-9]/g, '')));
                const slugKeyIdx = headers.findIndex(h => ['slug'].includes(h.replace(/[^a-z0-9]/g, '')));
                const imageKeyIdx = headers.findIndex(h => ['imageurl', 'image_url', 'thumbnail', 'image'].includes(h.replace(/[^a-z0-9]/g, '')));
                const parentKeyIdx = headers.findIndex(h => ['parentid', 'parent_id', 'parent'].includes(h.replace(/[^a-z0-9]/g, '')));
                
                if (nameKeyIdx === -1) {
                    throw new Error(`Invalid CSV headers. Missing required column 'name'. Found columns: [${rawLines[0].join(', ')}].`);
                }
                
                // Map rows to ONLY the keys that are actually used for the update
                const mappedData = rows.map((row) => {
                    const idVal = idKeyIdx !== -1 ? row[idKeyIdx] || '' : '';
                    const nameVal = row[nameKeyIdx] || '';
                    const slugVal = slugKeyIdx !== -1 ? row[slugKeyIdx] || '' : '';
                    const imageVal = imageKeyIdx !== -1 ? row[imageKeyIdx] || '' : '';
                    const parentVal = parentKeyIdx !== -1 ? row[parentKeyIdx] || '' : '';
                    
                    const obj: Record<string, string> = {
                        'id': idVal,
                        'name': nameVal,
                        'slug': slugVal || nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                        'imageUrl': imageVal,
                        'parentId': parentVal
                    };
                    
                    // Filter out empty columns to keep preview beautifully clean
                    const cleaned: Record<string, string> = {};
                    Object.entries(obj).forEach(([k, v]) => {
                        if (v !== '' || k === 'name') {
                            cleaned[k] = v;
                        }
                    });
                    
                    return cleaned;
                });
                
                setParsedRows(mappedData);
                toast.info(`Successfully parsed ${mappedData.length} records matching Category target fields.`);
            } catch (err: any) {
                setValidationError(err.message || 'Failed to parse CSV file.');
            }
        };
        reader.readAsText(file);
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
                const id = row.id || '';
                const name = row.name || '';
                const slug = row.slug || '';
                const imageUrl = row.imageUrl || '';
                const parentId = row.parentId || '';
                
                if (!name) {
                    throw new Error(`Missing mandatory category field: name.`);
                }
                
                // Check if category exists in local state array (by ID, slug, or exact name)
                const existing = categories.find(c => 
                    (id && c.id && c.id.toLowerCase() === id.toLowerCase()) ||
                    (slug && c.slug && c.slug.toLowerCase() === slug.toLowerCase()) ||
                    (name && c.name && c.name.toLowerCase() === name.toLowerCase())
                );
                
                const payload = { name, slug, imageUrl, parentId };
                
                if (existing) {
                    // Update
                    await apiClient.put(`/api/categories/${existing.id}`, payload);
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully updated Category "${name}" (ID: ${existing.id}).` }]
                    }));
                } else {
                    // Create
                    await apiClient.post('/api/categories', payload);
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully registered new Category "${name}".` }]
                    }));
                }
            } catch (err: any) {
                const errMsg = err.response?.data?.message || err.message || 'Validation failure';
                setImportProgress(prev => ({
                    ...prev,
                    current: rowNum,
                    failed: prev.failed + 1,
                    logs: [...prev.logs, { type: 'error', message: `Row ${rowNum}: Failed to sync brand "${row.name || 'Unknown'}". Details: ${errMsg}` }]
                }));
            }
        }
        
        setImportProgress(prev => ({
            ...prev,
            status: 'done'
        }));
        
        toast.success('Category synchronization complete!');
        fetchCategories();
    };

    if (loading) return <div className="loading">Loading Categories...</div>;

    if (isModalOpen) {
        return (
            <div className="page-container glass-card">
                <header className="page-header border-b border-slate-200 pb-4 mb-6 flex items-center gap-4">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-2xs transition flex items-center justify-center cursor-pointer"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-left">
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Category Attributes' : 'New Category Registration'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Define metadata and navigational hierarchy properties.</p>
                    </div>
                </header>

                <div className="max-w-3xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group text-left">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Gaming Laptops" />
                            </div>
                            <div className="form-group text-left">
                                <label className="block text-sm font-bold text-slate-700 mb-2">URL Slug</label>
                                <input className="w-full" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="gaming-laptops" />
                            </div>
                        </div>
                        <div className="form-group text-left">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Parent Category ID (Optional)</label>
                            <input className="w-full" value={formData.parentId || ''} onChange={e => setFormData({ ...formData, parentId: e.target.value })} placeholder="e.g. electronics" />
                        </div>
                        <div className="form-group border border-slate-100 rounded-2xl p-6 bg-slate-50/50 text-left">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Category Thumbnail</label>
                            {formData.imageUrl && (
                                <div className="mb-4 relative w-32 h-32 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden group">
                                    <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition"><X size={14}/></button>
                                </div>
                            )}
                            <div className="relative cursor-pointer max-w-xs">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageUpload} disabled={uploadingImage} />
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-white hover:border-indigo-500 hover:bg-indigo-50/30 transition duration-200">
                                    <Upload className="mx-auto mb-2 text-slate-400" size={22} />
                                    <span className="text-sm font-bold text-slate-800 block">{uploadingImage ? 'Uploading Image...' : 'Upload Thumbnail'}</span>
                                    <span className="text-xs text-slate-500 mt-1 block">Supports WebP, PNG & JPG</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-2.5 px-6">Cancel</button>
                            <button type="submit" className="btn-primary py-2.5 px-8 cursor-pointer" disabled={uploadingImage}>
                                {editingId ? 'Save Alterations' : 'Create Catalog node'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    const filteredCategories = categories.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container glass-card">
            <header className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="text-left">
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-indigo-600" />
                        <span>Category Tag Management</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-semibold mt-1">Configure global product category tags, tree hierarchies, parent nodes, and image tags.</p>
                </div>
                
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="status-badge status-pending font-bold">{filteredCategories.length} items listed</div>
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => { setShowImportModal(true); resetImportState(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import CSV</span>
                    </button>
                    <button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData(emptyCategory);
                            setIsModalOpen(true);
                        }} 
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                    >
                        <span>+ Register Category</span>
                    </button>
                </div>
            </header>

            <div className="mb-6 bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3 shadow-xs">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search categories by Name, Slug, or ID..."
                        className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition hover:border-slate-300 shadow-2xs"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-md transition"><X size={14} className="text-slate-500"/></button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Slug</th>
                            <th>Parent ID</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories.map(c => (
                            <tr key={c.id}>
                                <td>
                                    {c.imageUrl ? (
                                        <img src={getImageUrl(c.imageUrl)} className="w-10 h-10 rounded object-cover border border-slate-100 shadow-3xs" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">N/A</div>
                                    )}
                                </td>
                                <td>
                                    <a 
                                        href={`${getStorefrontUrl()}/category/${c.slug || c.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                    >
                                        {c.name}
                                    </a>
                                </td>
                                <td>
                                    <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md">{c.slug}</span>
                                </td>
                                <td>
                                    {c.parentId ? (
                                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">{c.parentId}</span>
                                    ) : (
                                        <span className="text-xs text-slate-300 italic font-semibold">None (Root Node)</span>
                                    )}
                                </td>
                                <td>
                                    <button onClick={() => handleEdit(c)} className="btn-icon cursor-pointer">Edit</button>
                                    <button onClick={() => handleDelete(c.id)} className="btn-icon btn-delete cursor-pointer">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {filteredCategories.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-12">
                                    <div className="text-slate-400 font-bold text-sm italic">
                                        No categories found matching your search criteria
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Full Page CSV Import Overlay */}
            {showImportModal && (
                <div className="fixed inset-0 bg-white z-[1000] flex flex-col animate-in fade-in duration-200 overflow-hidden">
                    {/* Top Indicator bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shrink-0" />
                    
                    {/* Top Nav Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0 flex-row">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (importProgress.status === 'processing') {
                                        if (!confirm('Sync execution is active. Do you wish to abort operations?')) return;
                                    }
                                    setShowImportModal(false);
                                }}
                                className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="text-left">
                                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <span>Bulk Import Categories catalog</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-100">BETA</span>
                                </h2>
                                <p className="text-xs font-semibold text-slate-400">Upload CSV sheet to batch create or update registered category configurations.</p>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => {
                                if (importProgress.status === 'processing') {
                                    if (!confirm('Sync execution is active. Do you wish to abort operations?')) return;
                                }
                                setShowImportModal(false);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Modal Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-8">
                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Info & Uploader */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-2xl">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-500" />
                                        <span>CSV Format Instructions</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-4">
                                        Ensure your CSV contains header fields. You can import new records or update existing ones by specifying matching identifiers:
                                    </p>
                                    
                                    <div className="space-y-3 text-left">
                                        <div className="flex gap-2 text-xs">
                                            <span className="font-extrabold text-indigo-600 shrink-0">name</span>
                                            <span className="text-slate-500 font-medium">(Required) The category display name.</span>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="font-extrabold text-indigo-600 shrink-0">slug</span>
                                            <span className="text-slate-500 font-medium">(Optional) URL Slug. Automatically generated if missing.</span>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="font-extrabold text-indigo-600 shrink-0">imageUrl</span>
                                            <span className="text-slate-500 font-medium">(Optional) Absolute image URL.</span>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="font-extrabold text-indigo-600 shrink-0">parentId</span>
                                            <span className="text-slate-500 font-medium">(Optional) Parent node category code.</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-5 border-t border-slate-200/60 flex items-center gap-3">
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-3xs cursor-pointer"
                                        >
                                            <Download size={14} className="text-slate-500" />
                                            <span>Download Template</span>
                                        </button>
                                    </div>
                                </div>

                                {importProgress.status === 'idle' && (
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-3xl p-8 text-center transition duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                                            dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-300 bg-slate-50/20 hover:border-slate-400 hover:bg-slate-50/10'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full mb-4">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm font-black text-slate-800">Drag & Drop your CSV file</p>
                                        <p className="text-xs text-slate-400 font-semibold mt-1">or click below to browse your documents</p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                                        >
                                            Select CSV File
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Preview & Status */}
                            <div className="lg:col-span-7 space-y-6">
                                {importProgress.status === 'idle' ? (
                                    <div className="space-y-6">
                                        {validationError && (
                                            <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-700 flex items-start gap-3 text-left">
                                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                <span>{validationError}</span>
                                            </div>
                                        )}

                                        {/* Parsed Rows Preview - Show Only Update Fields */}
                                        {parsedRows.length > 0 && (
                                            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs bg-white">
                                                <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Sheet Data Preview (Full Listing)</span>
                                                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Showing mapped Category attributes used for operations</span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-[10px] font-black">{parsedRows.length} Rows</span>
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
                                                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-600 text-left">
                                                                {parsedRows.map((r, ri) => (
                                                                    <tr key={ri} className="hover:bg-slate-50/50">
                                                                        {Object.keys(parsedRows[0]).map(h => (
                                                                            <td key={h} className="px-4 py-2 font-mono text-[10px] max-w-[185px] truncate">{r[h]}</td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {parsedRows.length > 0 && (
                                            <div className="flex items-center gap-3 justify-end">
                                                <button
                                                    onClick={resetImportState}
                                                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                                                >
                                                    Reset Sheet
                                                </button>
                                                <button
                                                    onClick={runImport}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition inline-flex items-center gap-2 cursor-pointer"
                                                >
                                                    <Play size={14} />
                                                    <span>Execute Sync Update</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Progress Tracker */}
                                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-left">
                                                    <h4 className="text-sm font-extrabold text-slate-800">
                                                        {importProgress.status === 'processing' ? 'Processing Records...' : 'Import Task Complete'}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                        Row {importProgress.current} of {importProgress.total} records
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-indigo-600">
                                                        {Math.round((importProgress.current / importProgress.total) * 100) || 0}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-6">
                                                <div
                                                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                                                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                                />
                                            </div>

                                            {/* Status Boxes */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white border border-emerald-100 rounded-xl p-4 text-center">
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wide">Succeeded</div>
                                                    <div className="text-2xl font-black text-emerald-600 mt-1">{importProgress.success}</div>
                                                </div>
                                                <div className="bg-white border border-red-100 rounded-xl p-4 text-center">
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wide">Failed</div>
                                                    <div className="text-2xl font-black text-red-500 mt-1">{importProgress.failed}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Logs Monospace Window */}
                                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
                                            <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">Sync Telemetry Terminal</span>
                                                <span className="flex h-2 w-2 relative">
                                                    {importProgress.status === 'processing' && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                    )}
                                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${importProgress.status === 'processing' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                                                </span>
                                            </div>
                                            
                                            <div 
                                                ref={terminalEndRef}
                                                className="p-5 font-mono text-[10px] leading-relaxed text-indigo-200/90 h-[280px] overflow-y-auto space-y-2 text-left"
                                            >
                                                {importProgress.logs.map((log, index) => (
                                                    <div key={index} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        <span className="select-none text-slate-600">$&gt;</span>
                                                        <span className="break-all">{log.message}</span>
                                                    </div>
                                                ))}
                                                {importProgress.logs.length === 0 && (
                                                    <div className="text-slate-500 italic">Initializing execution ledger telemetry...</div>
                                                )}
                                            </div>
                                        </div>

                                        {importProgress.status === 'done' && (
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={resetImportState}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                                                >
                                                    Import Another File
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Modal Footer Controls */}
                    <div className="border-t border-slate-100 px-8 py-4 shrink-0 flex items-center justify-between bg-slate-50/50">
                        <div>
                            {importProgress.status === 'processing' && (
                                <span className="text-xs text-slate-400 font-semibold flex items-center gap-2 animate-pulse">
                                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                                    Syncing category catalogues. Please do not close this window...
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {importProgress.status === 'idle' && (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => setShowImportModal(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        disabled={parsedRows.length === 0}
                                        onClick={runImport}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        <Play className="w-3.5 h-3.5" />
                                        <span>Execute Sync Update</span>
                                    </button>
                                </>
                            )}
                            {importProgress.status === 'done' && (
                                <button 
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                                >
                                    Close and Refresh
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
