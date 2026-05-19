import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import {
    Upload, X, Plus, ChevronLeft, Check, ChevronDown, Search,
    Download, FileText, AlertCircle, Play, Settings, Loader2
} from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import { toast } from 'sonner';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface PriceHistoryRecord {
    oldPrice?: number;
    newPrice?: number;
    oldSalePrice?: number;
    newSalePrice?: number;
    updatedBy?: string;
    updatedAt?: string;
}

interface ProductVariant {
    variantId: number;
    name: string;
    grouping: string;
    price?: number;
    salePrice?: number;
    images?: string[];
    features?: string[];
    inStock?: boolean;
    sequence?: number;
    priceHistory?: PriceHistoryRecord[];
}

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
    priceHistory?: PriceHistoryRecord[];
    variants?: ProductVariant[];
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

const ProductsPage = () => {
    const { initialized } = useKeycloak();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedVariantHistories, setExpandedVariantHistories] = useState<Record<number, boolean>>({});

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
        listed: false,
        variants: []
    };
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);
    const [featureInput, setFeatureInput] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form Element Helper States for Filtering/Search
    const [brandSearch, setBrandSearch] = useState('');
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
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

    const brandDropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll logs
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollTop = terminalEndRef.current.scrollHeight;
        }
    }, [importProgress.logs]);

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
            toast.error('Constraint Violation: Selection of an active Brand is required.');
            return;
        }
        if (formData.categoryIds.length === 0) {
            toast.error('Constraint Violation: Tagging at least one valid Category is required.');
            return;
        }

        try {
            let savedProduct;
            if (editingId) {
                // Update
                const response = await apiClient.put(`/api/products/${editingId}`, formData);
                savedProduct = response.data;
                toast.success('Successfully updated SKU attributes.');
            } else {
                // Create
                const response = await apiClient.post('/api/products', formData);
                savedProduct = response.data;
                toast.success('Successfully registered product in master catalog.');
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
            toast.error(`Transaction Terminated: ${errorMsg}`);
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
            listed: p.listed !== undefined ? p.listed : true,
            variants: p.variants || []
        });
        setEditingId(p.id);
        setExpandedVariantHistories({});
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await apiClient.delete(`/api/products/${id}`);
            toast.success('Product deleted successfully.');
            fetchProducts();
        } catch (error) {
            toast.error('Error deleting product SKUs.');
        }
    };

    const handleBulkListing = async (listed: boolean) => {
        if (selectedIds.length === 0) return;
        const actionText = listed ? 'list' : 'unlist';
        if (!window.confirm(`Are you sure you want to ${actionText} the ${selectedIds.length} selected products?`)) return;
        try {
            await apiClient.put(`/api/products/bulk/listing?listed=${listed}`, selectedIds);
            toast.success(`Successfully batch modified visibility of ${selectedIds.length} items.`);
            setSelectedIds([]);
            fetchProducts();
        } catch (error) {
            console.error('Error updating bulk listing status', error);
            toast.error('Failed to update bulk visibility status.');
        }
    };

    const toggleProductListing = async (product: Product) => {
        const nextStatus = !(product.listed !== undefined ? product.listed : true);
        try {
            await apiClient.put(`/api/products/bulk/listing?listed=${nextStatus}`, [product.id]);
            fetchProducts();
        } catch (error) {
            console.error('Error toggling listing status', error);
            toast.error('Failed to toggle visibility.');
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
            const res = await apiClient.post('/api/media/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = res.data.url;
            setFormData(prev => ({ ...prev, images: [...prev.images, url] }));
            toast.success('Asset uploaded successfully.');
        } catch (error) {
            console.error('Upload failed', error);
            toast.error('Image upload failed.');
        } finally {
            setUploadingImage(false);
            e.target.value = ''; // Reset input
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

    // Export Filtered Products to CSV
    const handleExportCSV = () => {
        if (filteredProducts.length === 0) {
            toast.warning('No products matching your filters to export.');
            return;
        }

        const headers = [
            'id', 'name', 'price', 'salePrice', 'brand',
            'categoryIds', 'gstPercentage', 'inStock', 'listed',
            'promoted', 'promotionPriority', 'description', 'features', 'images', 'variants'
        ];

        const rows = filteredProducts.map(p => {
            // Map category IDs to slugs for cleaner csv viewing where possible
            const mappedCats = (p.categoryIds || []).map(cid => {
                const found = allCategories.find(c => c.id === cid);
                return found ? found.slug : cid;
            }).join(', ');

            return [
                p.id || '',
                p.name || '',
                p.price ? String(p.price) : '0',
                p.salePrice ? String(p.salePrice) : '',
                p.brand || '',
                mappedCats,
                p.gstPercentage ? String(p.gstPercentage) : '18',
                p.inStock !== false ? 'true' : 'false',
                p.listed !== false ? 'true' : 'false',
                p.promoted ? 'true' : 'false',
                p.promotionPriority ? String(p.promotionPriority) : '0',
                p.description || '',
                (p.features || []).join('; '),
                (p.images || []).join(', '),
                p.variants ? JSON.stringify(p.variants) : '[]'
            ];
        });

        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `products_catalog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Successfully exported filtered product catalog.');
    };

    // Download CSV template
    const handleDownloadTemplate = () => {
        const headers = [
            'id', 'name', 'price', 'salePrice', 'brand',
            'categoryIds', 'gstPercentage', 'inStock', 'listed',
            'promoted', 'promotionPriority', 'description', 'features', 'images'
        ];
        const sampleRows = [
            [
                '',
                'NVIDIA GeForce RTX 4080 SUPER',
                '99000',
                '94999',
                'NVIDIA',
                'graphics-cards, pc-components',
                '18',
                'true',
                'true',
                'true',
                '10',
                'Uncompromised visual speeds powered by ultra-efficient Ada Lovelace architecture.',
                '16GB GDDR6X VRAM; 10240 CUDA Cores; DLSS 3.0 support',
                'https://example.com/rtx4080_1.png, https://example.com/rtx4080_2.png'
            ]
        ];

        const csvContent = generateCSV(headers, sampleRows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'products_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded product import template.');
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

    const parseBool = (val: string, defaultVal: boolean): boolean => {
        if (!val) return defaultVal;
        const clean = val.toLowerCase().trim();
        if (['true', 'yes', '1', 'y', 'active', 'listed', 'in stock', 'instock'].includes(clean)) return true;
        if (['false', 'no', '0', 'n', 'inactive', 'unlisted', 'out of stock', 'outofstock'].includes(clean)) return false;
        return defaultVal;
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
                const idKeyIdx = headers.findIndex(h => ['id', 'productid', 'product_id'].includes(h.replace(/[^a-z0-9]/g, '')));
                const nameKeyIdx = headers.findIndex(h => ['name', 'productname', 'product_name'].includes(h.replace(/[^a-z0-9]/g, '')));
                const priceKeyIdx = headers.findIndex(h => ['price', 'mrp', 'baseprice'].includes(h.replace(/[^a-z0-9]/g, '')));
                const salePriceKeyIdx = headers.findIndex(h => ['saleprice', 'sale_price', 'discountedprice'].includes(h.replace(/[^a-z0-9]/g, '')));
                const brandKeyIdx = headers.findIndex(h => ['brand', 'brandname', 'manufacturer'].includes(h.replace(/[^a-z0-9]/g, '')));
                const categoriesKeyIdx = headers.findIndex(h => ['categoryids', 'categories', 'category_ids', 'category'].includes(h.replace(/[^a-z0-9]/g, '')));
                const gstKeyIdx = headers.findIndex(h => ['gstpercentage', 'gst', 'tax'].includes(h.replace(/[^a-z0-9]/g, '')));
                const inStockKeyIdx = headers.findIndex(h => ['instock', 'stock', 'available'].includes(h.replace(/[^a-z0-9]/g, '')));
                const listedKeyIdx = headers.findIndex(h => ['listed', 'public', 'visible'].includes(h.replace(/[^a-z0-9]/g, '')));
                const promotedKeyIdx = headers.findIndex(h => ['promoted', 'featured'].includes(h.replace(/[^a-z0-9]/g, '')));
                const promoPriorityKeyIdx = headers.findIndex(h => ['promotionpriority', 'priority'].includes(h.replace(/[^a-z0-9]/g, '')));
                const descKeyIdx = headers.findIndex(h => ['description', 'desc', 'bio'].includes(h.replace(/[^a-z0-9]/g, '')));
                const featuresKeyIdx = headers.findIndex(h => ['features', 'specs', 'highlights'].includes(h.replace(/[^a-z0-9]/g, '')));
                const imagesKeyIdx = headers.findIndex(h => ['images', 'imageurls', 'gallery'].includes(h.replace(/[^a-z0-9]/g, '')));
                const variantsKeyIdx = headers.findIndex(h => ['variants', 'skus'].includes(h.replace(/[^a-z0-9]/g, '')));

                if (nameKeyIdx === -1) {
                    throw new Error(`Invalid CSV headers. Missing required column 'name'. Found columns: [${rawLines[0].join(', ')}].`);
                }

                // Map rows to clean target JSON
                const mappedData = rows.map((row) => {
                    const idVal = idKeyIdx !== -1 ? row[idKeyIdx] || '' : '';
                    const nameVal = row[nameKeyIdx] || '';
                    const priceVal = priceKeyIdx !== -1 ? row[priceKeyIdx] || '' : '';
                    const salePriceVal = salePriceKeyIdx !== -1 ? row[salePriceKeyIdx] || '' : '';
                    const brandVal = brandKeyIdx !== -1 ? row[brandKeyIdx] || '' : '';
                    const categoriesVal = categoriesKeyIdx !== -1 ? row[categoriesKeyIdx] || '' : '';
                    const gstVal = gstKeyIdx !== -1 ? row[gstKeyIdx] || '' : '';
                    const stockVal = inStockKeyIdx !== -1 ? row[inStockKeyIdx] || '' : '';
                    const listedVal = listedKeyIdx !== -1 ? row[listedKeyIdx] || '' : '';
                    const promotedVal = promotedKeyIdx !== -1 ? row[promotedKeyIdx] || '' : '';
                    const priorityVal = promoPriorityKeyIdx !== -1 ? row[promoPriorityKeyIdx] || '' : '';
                    const descVal = descKeyIdx !== -1 ? row[descKeyIdx] || '' : '';
                    const featuresVal = featuresKeyIdx !== -1 ? row[featuresKeyIdx] || '' : '';
                    const imagesVal = imagesKeyIdx !== -1 ? row[imagesKeyIdx] || '' : '';
                    const variantsVal = variantsKeyIdx !== -1 ? row[variantsKeyIdx] || '' : '';

                    // Resolve dynamic relations
                    const resolvedBrand = allBrands.find(b =>
                        b.name.toLowerCase() === brandVal.toLowerCase() ||
                        (b.slug && b.slug.toLowerCase() === brandVal.toLowerCase())
                    )?.name || brandVal;

                    const catRefs = categoriesVal.split(/[,;]/).map(c => c.trim()).filter(c => c);
                    const resolvedCategoryIds = catRefs.map(ref => {
                        const matched = allCategories.find(cat =>
                            cat.id.toLowerCase() === ref.toLowerCase() ||
                            (cat.slug && cat.slug.toLowerCase() === ref.toLowerCase())
                        );
                        return matched ? matched.id : ref;
                    });

                    // Safely parse nested variants
                    let resolvedVariants: any[] = [];
                    if (variantsVal.trim()) {
                        try {
                            resolvedVariants = JSON.parse(variantsVal);
                        } catch (e) {
                            resolvedVariants = [];
                        }
                    }

                    const obj: Record<string, any> = {
                        'id': idVal,
                        'name': nameVal,
                        'price': priceVal ? (parseFloat(priceVal) || 0) : 0,
                        'salePrice': salePriceVal ? (parseFloat(salePriceVal) || undefined) : undefined,
                        'brand': resolvedBrand,
                        'categoryIds': resolvedCategoryIds,
                        'gstPercentage': gstVal ? (parseInt(gstVal) || 18) : 18,
                        'inStock': parseBool(stockVal, true),
                        'listed': parseBool(listedVal, true),
                        'promoted': parseBool(promotedVal, false),
                        'promotionPriority': priorityVal ? (parseInt(priorityVal) || 0) : 0,
                        'description': descVal,
                        'features': featuresVal ? featuresVal.split(';').map((f: string) => f.trim()).filter((f: string) => f) : [],
                        'images': imagesVal ? imagesVal.split(',').map((img: string) => img.trim()).filter((img: string) => img) : [],
                        'variants': resolvedVariants
                    };

                    const cleaned: Record<string, any> = {};
                    Object.entries(obj).forEach(([k, v]) => {
                        if (v !== '' && v !== undefined && v !== null) {
                            cleaned[k] = v;
                        } else if (k === 'name' || k === 'price' || k === 'brand' || k === 'categoryIds') {
                            cleaned[k] = v;
                        }
                    });

                    return cleaned;
                });

                setParsedRows(mappedData);
                toast.info(`Successfully parsed ${mappedData.length} records matching Product target fields.`);
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
                const price = row.price || 0;
                const salePrice = row.salePrice || undefined;
                const brand = row.brand || '';
                const categoryIds = row.categoryIds || [];
                const gstPercentage = row.gstPercentage || 18;
                const inStock = row.inStock !== false;
                const listed = row.listed !== false;
                const promoted = row.promoted === true;
                const promotionPriority = row.promotionPriority || 0;
                const description = row.description || '';
                const features = row.features || [];
                const images = row.images || [];
                const variants = row.variants || [];

                if (!name) {
                    throw new Error(`Missing mandatory product field: name.`);
                }
                if (!brand) {
                    throw new Error(`Missing required category association: brand.`);
                }
                if (categoryIds.length === 0) {
                    throw new Error(`Missing required category cluster: categoryIds.`);
                }

                // Check if product exists in local products state array
                const existing = products.find(p =>
                    (id && p.id && p.id.toLowerCase() === id.toLowerCase()) ||
                    (name && p.name && p.name.toLowerCase() === name.toLowerCase())
                );

                const payload = {
                    name, description, price, salePrice, brand,
                    categoryIds, features, images, inStock, gstPercentage,
                    promoted, promotionPriority, listed, variants
                };

                let savedProduct;
                if (existing) {
                    // Update
                    const response = await apiClient.put(`/api/products/${existing.id}`, payload);
                    savedProduct = response.data;
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully updated SKU "${name}" (ID: ${existing.id}).` }]
                    }));
                } else {
                    // Create
                    const response = await apiClient.post('/api/products', payload);
                    savedProduct = response.data;
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully registered product SKU "${name}".` }]
                    }));
                }

                // Sync images gallery if provided
                if (images.length > 0 && savedProduct?.id) {
                    await apiClient.post(`/api/products/${savedProduct.id}/images`, images);
                }
            } catch (err: any) {
                const errMsg = err.response?.data?.message || err.message || 'Validation failure';
                setImportProgress(prev => ({
                    ...prev,
                    current: rowNum,
                    failed: prev.failed + 1,
                    logs: [...prev.logs, { type: 'error', message: `Row ${rowNum}: Failed to sync product "${row.name || 'Unknown'}". Details: ${errMsg}` }]
                }));
            }
        }

        setImportProgress(prev => ({
            ...prev,
            status: 'done'
        }));

        toast.success('Product catalog synchronization complete!');
        fetchProducts();
    };

    if (loading) return <div className="loading">Loading Product Core & Relations...</div>;

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
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Modify Catalog SKU' : 'Initiate Product Record'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Tag associated hardware manufacturers and cluster categories securely.</p>
                    </div>
                </header>

                <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Product Core Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group text-left">
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">Commercial Product Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. NVIDIA GeForce RTX 4080 SUPER" />
                            </div>
                            <div className="form-group relative text-left" ref={brandDropdownRef}>
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
                                                <button type="button" onClick={() => setBrandSearch('')} className="p-1 hover:bg-slate-200 rounded-md transition"><X size={12} className="text-slate-400" /></button>
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

                        {/* Pricing and Taxation System */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="md:col-span-2 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4 flex items-center gap-3 text-left">
                                <span className="text-xl">🏷️</span>
                                <div>
                                    <h4 className="text-xs font-black text-indigo-900">Variant-Level Pricing and Inventory Enabled</h4>
                                    <p className="text-[10px] text-indigo-700/80 font-semibold mt-0.5">MRP, Sale Price, and In-Stock flags are now maintained at the Variant/SKU level in the Variant panel below.</p>
                                </div>
                            </div>
                            <div className="form-group text-left">
                                <label className="block text-sm font-bold text-slate-700 mb-2">GST Percentage (%)</label>
                                <input className="w-full font-bold" type="number" min={0} max={100} required value={formData.gstPercentage ?? 18} onChange={e => setFormData({ ...formData, gstPercentage: parseInt(e.target.value) || 0 })} onWheel={e => e.currentTarget.blur()} />
                            </div>
                        </div>



                        {/* Relational Categories Matrix */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6 text-left">
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
                                            <button type="button" onClick={() => setCategorySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded transition"><X size={10} className="text-slate-400" /></button>
                                        )}
                                    </div>
                                    <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex-shrink-0">
                                        {formData.categoryIds.length} Clusters Mapped
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                                {allCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => {
                                    const isMapped = formData.categoryIds.includes(cat.id) || formData.categoryIds.includes(cat.slug);
                                    const targetRef = cat.id;

                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => toggleCategoryMapping(targetRef)}
                                            className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-extrabold transition cursor-pointer text-left border ${isMapped
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${isMapped ? "bg-white text-indigo-600" : "bg-slate-100 border border-slate-200 text-transparent"}`}>
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                            <span className="truncate flex-1">
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

                        <div className="form-group text-left">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Marketing Overview Description</label>
                            <textarea className="w-full min-h-[120px]" required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe user benefits, architecture features, and tech specifications..." />
                        </div>

                        {/* Key Highlights Array */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6 text-left">
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
                                <button type="button" onClick={handleAddFeature} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl flex items-center justify-center transition shadow-sm cursor-pointer"><Plus size={20} /></button>
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
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6 text-left">
                            <label className="block text-sm font-extrabold text-slate-900 mb-3">Product Media & Images Gallery</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                                {formData.images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center group p-1 shadow-3xs">
                                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(idx)}
                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition opacity-0 group-hover:opacity-100 cursor-pointer"
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



                        {/* Listing Status Visibility */}
                        <div className="flex items-center justify-between bg-slate-50/40 p-5 border border-slate-100 rounded-2xl text-left">
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

                        {/* Promotion Attributes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/30 p-5 border border-amber-100 rounded-2xl shadow-3xs text-left">
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
                                        onWheel={e => e.currentTarget.blur()}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Variant Subsystem */}
                        <div className="form-group border border-slate-100 bg-slate-50/30 rounded-2xl p-6 text-left">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                <div>
                                    <label className="block text-sm font-extrabold text-slate-900">Product SKU Variants</label>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Configure multiple sizes, colors, or feature options for this product.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-black text-slate-400">Grouping:</span>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Color or Size" 
                                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold w-36 outline-none"
                                        value={formData.variants?.[0]?.grouping || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            const updated = (formData.variants || []).map(v => ({ ...v, grouping: val }));
                                            setFormData(prev => ({ ...prev, variants: updated }));
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(formData.variants || []).map((variant, idx) => (
                                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs relative group">
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const updated = (formData.variants || []).filter((_, i) => i !== idx);
                                                setFormData(prev => ({ ...prev, variants: updated }));
                                            }}
                                            className="absolute top-3 right-3 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                                        >
                                            <X size={14} />
                                        </button>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Variant ID (Numeric)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-slate-50/50" 
                                                    value={variant.variantId} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, variantId: parseInt(e.target.value) || 0 };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                    onWheel={e => e.currentTarget.blur()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Short English Name</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-slate-50/50" 
                                                    value={variant.name} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, name: e.target.value };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Sequence</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-slate-50/50" 
                                                    value={variant.sequence ?? 0} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, sequence: parseInt(e.target.value) || 0 };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                    onWheel={e => e.currentTarget.blur()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Price override (₹)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="w-full bg-slate-50/50" 
                                                    value={variant.price || ''} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, price: e.target.value ? parseFloat(e.target.value) : undefined };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                    onWheel={e => e.currentTarget.blur()}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Sale override (₹)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="w-full bg-slate-50/50" 
                                                    value={variant.salePrice || ''} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, salePrice: e.target.value ? parseFloat(e.target.value) : undefined };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                    onWheel={e => e.currentTarget.blur()}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Variant Specific Images (comma-separated)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. /api/media/files/red1.jpg, /api/media/files/red2.jpg"
                                                    className="w-full bg-slate-50/50" 
                                                    value={(variant.images || []).join(', ')} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, images: e.target.value.split(',').map(s => s.trim()).filter(Boolean) };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-600 mb-1">Variant Specific Features (semicolon-separated)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. Special Red finish; 2 Year Extended Warranty"
                                                    className="w-full bg-slate-50/50" 
                                                    value={(variant.features || []).join('; ')} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, features: e.target.value.split(';').map(s => s.trim()).filter(Boolean) };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id={`v-stock-${idx}`}
                                                    checked={variant.inStock !== false} 
                                                    onChange={e => {
                                                        const updated = [...(formData.variants || [])];
                                                        updated[idx] = { ...variant, inStock: e.target.checked };
                                                        setFormData(prev => ({ ...prev, variants: updated }));
                                                    }}
                                                />
                                                <label htmlFor={`v-stock-${idx}`} className="font-bold text-slate-600 cursor-pointer">Variant Available in Warehouse</label>
                                            </div>
                                        </div>

                                        {/* Variant Price History Expander */}
                                        {editingId && variant.variantId && (
                                            <div className="mt-3 pt-2 border-t border-slate-100 text-left">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setExpandedVariantHistories(prev => ({
                                                            ...prev,
                                                            [variant.variantId]: !prev[variant.variantId]
                                                        }));
                                                    }}
                                                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-extrabold cursor-pointer transition"
                                                >
                                                    📜 {expandedVariantHistories[variant.variantId] ? 'Hide' : 'Show'} Price History ({variant.priceHistory?.length || 0})
                                                </button>
                                                
                                                {expandedVariantHistories[variant.variantId] && (
                                                    <div className="mt-2 space-y-2 bg-slate-50/50 border border-slate-100 rounded-xl p-3 max-h-36 overflow-y-auto">
                                                        {!variant.priceHistory || variant.priceHistory.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 italic">No price change history recorded for this SKU.</p>
                                                        ) : (
                                                            variant.priceHistory.slice().reverse().map((record, index) => {
                                                                const formattedDate = record.updatedAt
                                                                    ? new Date(record.updatedAt).toLocaleString('en-IN', {
                                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                                        hour: '2-digit', minute: '2-digit'
                                                                    })
                                                                    : 'N/A';
                                                                return (
                                                                    <div key={index} className="flex flex-col gap-1 p-2 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 shadow-3xs">
                                                                        <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-1">
                                                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8px] font-black">
                                                                                {record.updatedBy || 'System'}
                                                                            </span>
                                                                            <span className="text-slate-400 font-medium">{formattedDate}</span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between font-extrabold">
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-slate-400 font-medium">MRP:</span>
                                                                                <span className="line-through text-slate-400">{formatPrice(record.oldPrice ?? 0)}</span>
                                                                                <span className="text-slate-500">→</span>
                                                                                <span className="text-emerald-600">{formatPrice(record.newPrice ?? 0)}</span>
                                                                            </div>
                                                                            {(record.oldSalePrice !== undefined || record.newSalePrice !== undefined) && (
                                                                                <div className="flex items-center gap-1">
                                                                                    <span className="text-slate-400 font-medium">Sale:</span>
                                                                                    <span className="line-through text-slate-400">{formatPrice(record.oldSalePrice ?? 0)}</span>
                                                                                    <span className="text-slate-500">→</span>
                                                                                    <span className="text-red-500">{formatPrice(record.newSalePrice ?? 0)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Add Variant Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextId = (formData.variants || []).reduce((max, v) => Math.max(max, v.variantId), 0) + 1;
                                        const grouping = formData.variants?.[0]?.grouping || '';
                                        const newVar: ProductVariant = {
                                            variantId: nextId,
                                            name: '',
                                            grouping: grouping,
                                            price: undefined,
                                            salePrice: undefined,
                                            images: [],
                                            features: [],
                                            inStock: true,
                                            sequence: (formData.variants || []).length
                                        };
                                        setFormData(prev => ({ ...prev, variants: [...(prev.variants || []), newVar] }));
                                    }}
                                    className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-black text-indigo-600 hover:text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50/10 transition flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus size={14} /> Add Product SKU Variant Option
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-2.5 px-6">Abort Operation</button>
                            <button type="submit" className="btn-primary py-2.5 px-8 cursor-pointer" disabled={uploadingImage}>
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
            <header className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="text-left">
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-indigo-600" />
                        <span>Product Core Master Catalog</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-semibold mt-1">Configure global product details, pricing tiers, promotional placement, and metadata clusters.</p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="status-badge status-pending font-bold">{filteredProducts.length} items catalogued</div>
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
                            setFormData(emptyProduct);
                            setExpandedVariantHistories({});
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                    >
                        <span>+ Register Product</span>
                    </button>
                </div>
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
                        <button type="button" onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-md transition"><X size={14} className="text-slate-500" /></button>
                    )}
                </div>
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

            <div className="overflow-x-auto rounded-xl border border-gray-100">
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
                                        {p.images && p.images.length > 0 ? (
                                            <img src={getImageUrl(p.images[0])} alt="" className="w-8 h-8 rounded object-cover border border-slate-100 shadow-3xs" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-[8px] font-black text-slate-400">N/A</div>
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
                                        title="Click to toggle visibility"
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
                                    <span className={p.salePrice ? "text-red-400 font-bold" : "font-extrabold text-slate-800"}>{formatPrice(p.salePrice || p.price)}</span>
                                    {p.salePrice && <span className="line-through text-gray-500 text-xs ml-1.5">{formatPrice(p.price)}</span>}
                                </td>
                                <td>
                                    <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1 text-xs">{p.brand}</span>
                                </td>
                                <td>
                                    <button onClick={() => toggleProductListing(p)} className="btn-icon cursor-pointer" style={{ marginRight: '6px' }}>
                                        {p.listed !== false ? "Unlist" : "List"}
                                    </button>
                                    <button onClick={() => handleEdit(p)} className="btn-icon cursor-pointer" style={{ marginRight: '6px' }}>Edit</button>
                                    <button onClick={() => handleDelete(p.id)} className="btn-icon btn-delete cursor-pointer">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-12">
                                    <div className="text-slate-400 font-bold text-sm italic">
                                        No products found matching your search criteria
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
                                    <span>Bulk Import Products Catalog</span>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-100">BETA</span>
                                </h2>
                                <p className="text-xs font-semibold text-slate-400">Upload CSV sheets to register or update active master catalog SKUs.</p>
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
                        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left Column: Info & Uploader */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-slate-50/50 border border-slate-200/60 p-6 rounded-2xl">
                                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-500" />
                                        <span>Product CSV Specifications</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-4">
                                        Ensure columns exist for proper structural updates. Relations will automatically match:
                                    </p>

                                    <div className="space-y-2.5 text-[11px] text-left">
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">name</span>
                                            <span className="text-slate-500 font-medium">(Required) Title of product.</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">price</span>
                                            <span className="text-slate-500 font-medium">(Required) Base MRP value.</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">brand</span>
                                            <span className="text-slate-500 font-medium">(Required) e.g. Intel, ASUS.</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">categoryIds</span>
                                            <span className="text-slate-500 font-medium">(Required) Comma separated slugs.</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">features</span>
                                            <span className="text-slate-500 font-medium">Specs separated by semi-colons (`;`).</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-extrabold text-indigo-600 shrink-0 w-16">images</span>
                                            <span className="text-slate-500 font-medium">Comma-separated image URLs.</span>
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
                                        className={`border-2 border-dashed rounded-3xl p-8 text-center transition duration-200 flex flex-col items-center justify-center min-h-[220px] ${dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-300 bg-slate-50/20 hover:border-slate-400 hover:bg-slate-50/10'
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
                                        <p className="text-xs text-slate-400 font-semibold mt-1">or click below to browse documents</p>
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
                            <div className="lg:col-span-8 space-y-6">
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
                                                        <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Showing mapped Product attributes used for operations</span>
                                                    </div>
                                                    <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-[10px] font-black">{parsedRows.length} Rows</span>
                                                </div>
                                                <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead className="sticky top-0 bg-white z-10 border-b border-slate-200">
                                                            <tr className="bg-slate-100/30 text-slate-500 font-bold uppercase">
                                                                {Object.keys(parsedRows[0]).map(h => (
                                                                    <th key={h} className="px-4 py-2 whitespace-nowrap">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50 font-semibold text-slate-600 text-left">
                                                            {parsedRows.map((r, ri) => (
                                                                <tr key={ri} className="hover:bg-slate-50/50">
                                                                    {Object.keys(parsedRows[0]).map(h => {
                                                                        const val = Array.isArray(r[h]) ? r[h].join(', ') : String(r[h] ?? '');
                                                                        return (
                                                                            <td key={h} className="px-4 py-2 font-mono text-[10px] max-w-[185px] truncate whitespace-nowrap" title={val}>{val}</td>
                                                                        );
                                                                    })}
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
                                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 relative animate-in fade-in">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="text-left">
                                                    <h4 className="text-sm font-extrabold text-slate-800">
                                                        {importProgress.status === 'processing' ? 'Processing SKU Records...' : 'Import Task Complete'}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                        Row {importProgress.current} of {importProgress.total} SKUs
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
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">SKU Sync Telemetry Terminal</span>
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
                                                    Import Another SKU Sheet
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
                                    Synchronizing SKU models. Please do not close this window...
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

export default ProductsPage;
