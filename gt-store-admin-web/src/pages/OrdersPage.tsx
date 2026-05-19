import { useState, useEffect, Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { formatPrice } from '../lib/formatPrice';
import { toast } from 'sonner';
import { 
    Download, Upload, FileText, 
    AlertCircle, X, Loader2, Play, ChevronDown, ChevronRight,
    ShoppingBag, Info, Users
} from 'lucide-react';

interface OrderItem {
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    orderNumber?: string;
    userId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: OrderItem[];
    customerName?: string;
    customerPhone?: string;
    paymentMethod?: string;
    shippingLine1?: string;
    shippingLine2?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPincode?: string;
    shippingCountry?: string;
    discountAmount?: number;
    taxAmount?: number;
    shippingCharge?: number;
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
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(currentToken.trim());
            currentToken = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n
            }
            row.push(currentToken.trim());
            if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
                lines.push(row);
            }
            row = [];
            currentToken = '';
        } else {
            currentToken += char;
        }
    }
    
    if (currentToken !== '' || row.length > 0) {
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

const OrdersPage = () => {
    const { keycloak, initialized } = useKeycloak();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // CSV Import / Export States
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMode, setImportMode] = useState<'status_update' | 'order_creation'>('status_update');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [groupByUser, setGroupByUser] = useState(true);
    
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

    const fetchOrders = async () => {
        if (!keycloak.authenticated) return;
        setLoading(true);
        try {
            const response = await apiClient.get('/api/orders/all');
            const data = Array.isArray(response.data) ? response.data : [];
            setOrders(data);
            setFilteredOrders(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching global orders:', error);
            toast.error('Failed to load sales orders.');
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
                o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        setFilteredOrders(result);
    }, [searchTerm, statusFilter, orders]);

    // Scroll progress logs to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [importProgress.logs]);

    const handleStatusUpdate = async (orderId: string, status: string) => {
        try {
            await apiClient.put(`/api/orders/${orderId}/status?status=${status}`);
            toast.success(`Updated order #${orderId} status to ${status}`);
            fetchOrders();
        } catch (error) {
            toast.error('Error updating order status');
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
    };

    // CSV Exporter
    const handleExportCSV = () => {
        if (filteredOrders.length === 0) {
            toast.warning('No orders found to export!');
            return;
        }
        
        const headers = [
            'Order Number', 'Customer Name', 'Customer Email', 'Customer Phone', 
            'Payment Method', 'Shipping Address', 'Shipping City', 'Shipping State', 
            'Shipping Pincode', 'Shipping Country', 'Total Amount', 'Discount Amount', 
            'Tax Amount', 'Shipping Charge', 'Status', 'Created Date', 'Items Count', 'Items Summary'
        ];
        
        const rows = filteredOrders.map(o => [
            o.orderNumber || o.id,
            o.customerName || '',
            o.userId || '',
            o.customerPhone || '',
            o.paymentMethod || '',
            `${o.shippingLine1 || ''} ${o.shippingLine2 || ''}`.trim(),
            o.shippingCity || '',
            o.shippingState || '',
            o.shippingPincode || '',
            o.shippingCountry || '',
            o.totalAmount?.toString() || '0',
            o.discountAmount?.toString() || '0',
            o.taxAmount?.toString() || '0',
            o.shippingCharge?.toString() || '0',
            o.status,
            new Date(o.createdAt).toLocaleString(),
            o.items?.length?.toString() || '0',
            o.items?.map(i => `${i.productId} (x${i.quantity})`).join('; ') || ''
        ]);
        
        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `GT_Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Successfully exported ${filteredOrders.length} orders as CSV.`);
    };

    // CSV Template Downloader
    const handleDownloadTemplate = (mode: 'status_update' | 'order_creation') => {
        let headers: string[] = [];
        let rows: string[][] = [];
        let filename = '';
        
        if (mode === 'status_update') {
            headers = ['Order Number', 'Status', 'Details'];
            rows = [
                ['100001', 'SHIPPED', 'Bulk CSV Update: Handed over to BlueDart'],
                ['100002', 'DELIVERED', 'Delivered to customer successfully'],
                ['100003', 'PAID', 'Confirmed transaction via gateway manual verification']
            ];
            filename = 'order_status_update_template.csv';
        } else {
            headers = [
                'userId', 'customerName', 'customerPhone', 'productId', 
                'quantity', 'price', 'paymentMethod', 'shippingLine1', 'shippingLine2', 
                'shippingCity', 'shippingState', 'shippingPincode', 'shippingCountry', 'couponCode'
            ];
            rows = [
                [
                    'customer@example.com', 'John Doe', '9876543210', 'prod_sku_1', 
                    '2', '299', 'COD', '456 Tech Park', 'Sector V', 
                    'Kolkata', 'West Bengal', '700091', 'India', 'WELCOME10'
                ],
                [
                    'buyer@domain.com', 'Jane Smith', '9812345678', 'prod_sku_2', 
                    '1', '999', 'ONLINE', '789 Garden Plaza', '', 
                    'Bangalore', 'Karnataka', '560001', 'India', ''
                ]
            ];
            filename = 'order_import_creation_template.csv';
        }
        
        const csvContent = generateCSV(headers, rows);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloaded template: ${filename}`);
    };

    // Client-side CSV Parser & Validator
    const processCSV = (file: File) => {
        setCsvFile(file);
        setValidationError(null);
        setParsedRows([]);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) {
                setValidationError('File is empty.');
                return;
            }
            try {
                const parsed = parseCSV(text);
                if (parsed.length < 2) {
                    setValidationError('CSV must have a header and at least one data row.');
                    return;
                }
                
                const headers = parsed[0].map(h => h.toLowerCase().trim());
                const rows = parsed.slice(1);
                
                // Validate columns
                if (importMode === 'status_update') {
                    const hasOrderNum = headers.includes('ordernumber') || headers.includes('order number') || headers.includes('id');
                    const hasStatus = headers.includes('status');
                    if (!hasOrderNum || !hasStatus) {
                        setValidationError('Missing required columns. CSV must contain: "Order Number" (or "id") and "Status"');
                        return;
                    }
                } else {
                    const hasUser = headers.includes('userid') || headers.includes('user email') || headers.includes('email');
                    const hasProd = headers.includes('productid') || headers.includes('sku') || headers.includes('product id');
                    const hasQty = headers.includes('quantity') || headers.includes('qty');
                    const hasPrice = headers.includes('price');
                    const hasLine1 = headers.includes('shippingline1') || headers.includes('address line 1');
                    const hasCity = headers.includes('shippingcity') || headers.includes('city');
                    const hasPin = headers.includes('shippingpincode') || headers.includes('pincode');
                    
                    if (!hasUser || !hasProd || !hasQty || !hasPrice || !hasLine1 || !hasCity || !hasPin) {
                        setValidationError('Missing required columns. For order creation, CSV must contain: "userId", "productId", "quantity", "price", "shippingLine1", "shippingCity", "shippingPincode"');
                        return;
                    }
                }
                
                // Map rows to objects
                const mappedData = rows.map((row) => {
                    const obj: Record<string, string> = {};
                    headers.forEach((header, hIdx) => {
                        obj[header] = row[hIdx] || '';
                    });
                    return obj;
                });
                
                setParsedRows(mappedData);
                toast.info(`Successfully parsed ${mappedData.length} records.`);
            } catch (err) {
                setValidationError('Failed to parse CSV file. Ensure it is a valid CSV format.');
            }
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processCSV(file);
    };

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

    // Sequential CSV importer execution
    const runImport = async () => {
        if (parsedRows.length === 0) return;
        
        if (importMode === 'order_creation' && groupByUser) {
            // Group parsedRows by userId
            const groups: Record<string, any[]> = {};
            parsedRows.forEach((row) => {
                const userIdKey = Object.keys(row).find(k => ['userid', 'user email', 'email', 'user_id'].includes(k.toLowerCase().trim()));
                const userId = userIdKey ? row[userIdKey]?.trim() : '';
                if (userId) {
                    if (!groups[userId]) {
                        groups[userId] = [];
                    }
                    groups[userId].push(row);
                } else {
                    if (!groups['__unknown__']) {
                        groups['__unknown__'] = [];
                    }
                    groups['__unknown__'].push(row);
                }
            });

            const userKeys = Object.keys(groups);
            setImportProgress({
                total: userKeys.length,
                current: 0,
                success: 0,
                failed: 0,
                logs: [],
                status: 'processing'
            });

            for (let i = 0; i < userKeys.length; i++) {
                const userId = userKeys[i];
                const groupRows = groups[userId];
                const rowNum = i + 1;

                try {
                    if (userId === '__unknown__') {
                        throw new Error(`Skipped ${groupRows.length} rows because customer email/userId was blank.`);
                    }

                    const firstRow = groupRows[0];
                    const getVal = (rowItem: any, aliases: string[]) => {
                        const key = Object.keys(rowItem).find(k => aliases.includes(k.toLowerCase().trim()));
                        return key ? rowItem[key] : '';
                    };

                    const customerName = getVal(firstRow, ['customername', 'customer name', 'name', 'customer_name']);
                    const customerPhone = getVal(firstRow, ['customerphone', 'customer phone', 'phone', 'customer_phone']);
                    const paymentMethod = getVal(firstRow, ['paymentmethod', 'payment method', 'payment_method']) || 'COD';
                    const shippingLine1 = getVal(firstRow, ['shippingline1', 'address line 1', 'address1', 'shipping_line1']);
                    const shippingLine2 = getVal(firstRow, ['shippingline2', 'address line 2', 'address2', 'shipping_line2']);
                    const shippingCity = getVal(firstRow, ['shippingcity', 'city', 'shipping_city']);
                    const shippingState = getVal(firstRow, ['shippingstate', 'state', 'shipping_state']);
                    const shippingPincode = getVal(firstRow, ['shippingpincode', 'pincode', 'shipping_pincode']);
                    const shippingCountry = getVal(firstRow, ['shippingcountry', 'country', 'shipping_country']) || 'India';
                    const couponCode = getVal(firstRow, ['couponcode', 'coupon code', 'coupon_code']);

                    if (!shippingLine1 || !shippingCity || !shippingPincode) {
                        throw new Error(`Missing mandatory shipping fields (shippingLine1, shippingCity, shippingPincode)`);
                    }

                    const items: any[] = [];
                    const rowWarnings: string[] = [];

                    for (const r of groupRows) {
                        const productId = getVal(r, ['productid', 'sku', 'product id', 'product_id']);
                        const quantity = parseInt(getVal(r, ['quantity', 'qty'])) || 1;
                        const price = parseFloat(getVal(r, ['price'])) || 0;
                        const rowPhone = getVal(r, ['customerphone', 'customer phone', 'phone', 'customer_phone']);

                        if (!productId) {
                            throw new Error(`Missing product ID in one of the customer items`);
                        }

                        const isHex = /^[0-9a-fA-F]+$/.test(productId);
                        if (isHex && productId.length > 10 && productId.length < 24) {
                            throw new Error(`Product ID "${productId}" appears to be a truncated MongoDB ObjectID (length ${productId.length}). ObjectIDs must be exactly 24 hexadecimal characters.`);
                        }

                        let formattedPhone = rowPhone;
                        if (rowPhone) {
                            const isScientific = /^[0-9.]+[eE]\+?[0-9]+$/.test(rowPhone) || rowPhone.toLowerCase().includes('e+');
                            if (isScientific) {
                                try {
                                    const parsedNum = Number(rowPhone);
                                    if (!isNaN(parsedNum)) {
                                        formattedPhone = parsedNum.toFixed(0);
                                        if (!rowWarnings.includes(`Recovered phone from scientific notation: ${formattedPhone}`)) {
                                            rowWarnings.push(`Recovered phone from scientific notation: ${formattedPhone}`);
                                        }
                                    }
                                } catch (e) {}
                            }
                        }

                        items.push({
                            productId,
                            variantId: 'std',
                            quantity,
                            price
                        });
                    }

                    let finalPhone = customerPhone;
                    if (customerPhone) {
                        const isScientific = /^[0-9.]+[eE]\+?[0-9]+$/.test(customerPhone) || customerPhone.toLowerCase().includes('e+');
                        if (isScientific) {
                            try {
                                const parsedNum = Number(customerPhone);
                                if (!isNaN(parsedNum)) {
                                    finalPhone = parsedNum.toFixed(0);
                                }
                            } catch (e) {}
                        }
                    }

                    const payload = {
                        userId: userId,
                        paymentMethod: paymentMethod.toUpperCase(),
                        shippingLine1,
                        shippingLine2: shippingLine2 || '',
                        shippingCity,
                        shippingState: shippingState || '',
                        shippingPincode,
                        shippingCountry,
                        customerPhone: finalPhone || '',
                        customerName: customerName || '',
                        couponCode: couponCode || '',
                        items
                    };

                    const response = await apiClient.post('/api/orders', payload);
                    const responseData = response.data;
                    const orderNum = responseData.orderNumber || responseData.id || 'Unknown';

                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { 
                            type: 'success', 
                            message: `Group ${rowNum}: Successfully created consolidated Order #${orderNum} for ${userId} with ${items.length} product(s)${rowWarnings.length > 0 ? ' (' + rowWarnings.join(', ') + ')' : ''}` 
                        }]
                    }));
                } catch (err: any) {
                    const errMsg = err.response?.data?.message || err.message || 'API verification failure';
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        failed: prev.failed + 1,
                        logs: [...prev.logs, { type: 'error', message: `Group ${rowNum} Failed (${userId}): ${errMsg}` }]
                    }));
                }
            }

            setImportProgress(prev => ({
                ...prev,
                status: 'done'
            }));
            
            toast.success(`Bulk CSV grouped batch processed completely.`);
            fetchOrders();
            return;
        }

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
                if (importMode === 'status_update') {
                    // Extract order number & status aliases
                    const orderNumberKey = Object.keys(row).find(k => k.replace(/[^a-zA-Z]/g, '').toLowerCase() === 'ordernumber' || k.toLowerCase() === 'id' || k.replace(/\s+/g, '').toLowerCase() === 'ordernumber');
                    const statusKey = Object.keys(row).find(k => k.toLowerCase() === 'status');
                    const detailsKey = Object.keys(row).find(k => k.toLowerCase() === 'details');
                    
                    const orderNumber = row[orderNumberKey || ''];
                    const status = row[statusKey || '']?.toUpperCase();
                    const details = row[detailsKey || ''] || 'Bulk CSV Update';
                    
                    if (!orderNumber || !status) {
                        throw new Error(`Row ${rowNum}: Missing orderNumber or status`);
                    }
                    
                    const params = new URLSearchParams({
                        status: status,
                        details: details
                    });
                    
                    await apiClient.put(`/api/orders/${orderNumber}/status?${params.toString()}`);
                    
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully transitioned Order #${orderNumber} to ${status}` }]
                    }));
                } else {
                    // Create Order aliases mapping
                    const getVal = (aliases: string[]) => {
                        const key = Object.keys(row).find(k => aliases.includes(k.toLowerCase().trim()));
                        return key ? row[key] : '';
                    };
                    
                    const userId = getVal(['userid', 'user email', 'email', 'user_id']);
                    const customerName = getVal(['customername', 'customer name', 'name', 'customer_name']);
                    const customerPhone = getVal(['customerphone', 'customer phone', 'phone', 'customer_phone']);
                    const productId = getVal(['productid', 'sku', 'product id', 'product_id']);
                    const quantity = parseInt(getVal(['quantity', 'qty'])) || 1;
                    const price = parseFloat(getVal(['price'])) || 0;
                    const paymentMethod = getVal(['paymentmethod', 'payment method', 'payment_method']) || 'COD';
                    const shippingLine1 = getVal(['shippingline1', 'address line 1', 'address1', 'shipping_line1']);
                    const shippingLine2 = getVal(['shippingline2', 'address line 2', 'address2', 'shipping_line2']);
                    const shippingCity = getVal(['shippingcity', 'city', 'shipping_city']);
                    const shippingState = getVal(['shippingstate', 'state', 'shipping_state']);
                    const shippingPincode = getVal(['shippingpincode', 'pincode', 'shipping_pincode']);
                    const shippingCountry = getVal(['shippingcountry', 'country', 'shipping_country']) || 'India';
                    const couponCode = getVal(['couponcode', 'coupon code', 'coupon_code']);
                    
                    if (!userId || !productId || !shippingLine1 || !shippingCity || !shippingPincode) {
                        throw new Error(`Row ${rowNum}: Missing mandatory order fields`);
                    }

                    if (productId) {
                        const isHex = /^[0-9a-fA-F]+$/.test(productId);
                        if (isHex && productId.length > 10 && productId.length < 24) {
                            throw new Error(`Product ID "${productId}" appears to be a truncated MongoDB ObjectID (length ${productId.length}). ObjectIDs must be exactly 24 hexadecimal characters (e.g. "69d87805ae1526b5a68de666"). Please ensure you copy the complete ID.`);
                        }
                    }

                    let formattedPhone = customerPhone;
                    const rowWarnings: string[] = [];

                    if (customerPhone) {
                        const isScientific = /^[0-9.]+[eE]\+?[0-9]+$/.test(customerPhone) || customerPhone.toLowerCase().includes('e+');
                        if (isScientific) {
                            try {
                                const parsedNum = Number(customerPhone);
                                if (!isNaN(parsedNum)) {
                                    formattedPhone = parsedNum.toFixed(0);
                                    rowWarnings.push(`Recovered phone from scientific notation: ${formattedPhone}`);
                                }
                            } catch (e) {
                                // Fallback to original
                            }
                        }
                    }

                    const payload = {
                        userId: userId,
                        paymentMethod: paymentMethod.toUpperCase(),
                        shippingLine1,
                        shippingLine2: shippingLine2 || '',
                        shippingCity,
                        shippingState: shippingState || '',
                        shippingPincode,
                        shippingCountry,
                        customerPhone: formattedPhone || '',
                        customerName: customerName || '',
                        couponCode: couponCode || '',
                        items: [
                            {
                                productId,
                                variantId: 'std',
                                quantity,
                                price
                            }
                        ]
                    };
                    
                    const response = await apiClient.post('/api/orders', payload);
                    const responseData = response.data;
                    const orderNum = responseData.orderNumber || responseData.id || 'Unknown';
                    
                    setImportProgress(prev => ({
                        ...prev,
                        current: rowNum,
                        success: prev.success + 1,
                        logs: [...prev.logs, { type: 'success', message: `Row ${rowNum}: Successfully created Order #${orderNum} for ${userId}${rowWarnings.length > 0 ? ' (' + rowWarnings.join(', ') + ')' : ''}` }]
                    }));
                }
            } catch (err: any) {
                const errMsg = err.response?.data?.message || err.message || 'API verification failure';
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
        
        toast.success(`Bulk CSV batch processed completely.`);
        fetchOrders();
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

    if (loading && orders.length === 0) return <div className="loading">Loading Global Orders...</div>;

    return (
        <div className="page-container glass-card">
            {/* Elegant Header with Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-indigo-600" />
                        Sales Orders Ledger
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Track, inspect, update status, or import/export CSV transactions platform-wide.
                    </p>
                </div>
                
                {/* CSV Import/Export Buttons */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-bold rounded-xl transition cursor-pointer"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => { setShowImportModal(true); resetImportState(); }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Import CSV</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar border-b border-slate-100 pb-5 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[280px]">
                    <input
                        type="text"
                        placeholder="Search by customer email, name, Order #, or platform ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="filter-input w-full pl-4 pr-10 py-2.5 text-sm outline-none border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select py-2.5 pl-4 pr-10 text-sm outline-none border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-600"
                >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="AWAITING_FULFILLMENT">AWAITING FULFILLMENT</option>
                    <option value="READY_TO_BE_SHIPPED">READY TO SHIP</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                </select>
            </div>

            {/* Table or Empty State */}
            {filteredOrders.length === 0 ? (
                <div className="py-20 text-center flex flex-col justify-center items-center">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Sales Orders Found</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm">
                        No orders match the current filtering parameters. Try resetting filters or search criteria.
                    </p>
                </div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Order #</th>
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
                                <tr className={`hover:bg-slate-50/50 transition-all ${expandedOrderId === o.id ? 'bg-slate-50/30' : ''}`}>
                                    <td>
                                        <button className="btn-expand p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition" onClick={() => toggleExpand(o.id)}>
                                            {expandedOrderId === o.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="mono-text">
                                        <Link to={`/orders/${o.orderNumber || o.id}`} className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                                            {o.orderNumber || o.id}
                                        </Link>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{o.customerName || 'Guest Consignee'}</span>
                                            <span className="text-xs text-slate-400 font-medium">{o.userId}</span>
                                        </div>
                                    </td>
                                    <td className="price-text font-black text-slate-900">{formatPrice(o.totalAmount)}</td>
                                    <td>
                                        <span className={`status-badge uppercase tracking-wider text-[10px] font-black border ${
                                            o.status === 'PENDING' ? 'status-pending' :
                                            o.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            o.status === 'SHIPPED' ? 'status-shipped' :
                                            o.status === 'DELIVERED' ? 'status-delivered' :
                                            o.status === 'CANCELLED' ? 'status-cancelled' :
                                            'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}>
                                            {o.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="text-slate-500 text-xs font-semibold">{new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</td>
                                    <td>
                                        <select
                                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                                            value={o.status}
                                            onChange={(e) => handleStatusUpdate(o.orderNumber || o.id, e.target.value)}
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
                                        <td colSpan={7} className="p-0">
                                            <div className="order-details-pane bg-slate-50/50 p-6 border-b border-slate-100">
                                                <div className="glass-card bg-white p-5 max-w-4xl shadow-sm border border-slate-100">
                                                    <h4 className="text-sm font-black text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                                                        <ShoppingBag className="w-4 h-4 text-indigo-500" />
                                                        Items Breakdown
                                                    </h4>
                                                    <table className="inner-items-table w-full">
                                                        <thead>
                                                            <tr className="text-slate-400 font-bold text-xs uppercase tracking-wider text-left border-b border-slate-100">
                                                                <th className="pb-2">Product Catalog ID / SKU</th>
                                                                <th className="pb-2 text-center">Quantity</th>
                                                                <th className="pb-2 text-right">Unit Price</th>
                                                                <th className="pb-2 text-right">Subtotal</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {o.items?.map(item => (
                                                                <tr key={item.id} className="text-sm">
                                                                    <td className="py-2.5 font-mono text-xs font-bold text-slate-600">{item.productId}</td>
                                                                    <td className="py-2.5 text-center font-extrabold text-slate-600">x{item.quantity}</td>
                                                                    <td className="py-2.5 text-right font-medium text-slate-500">{formatPrice(item.price)}</td>
                                                                    <td className="py-2.5 text-right font-bold text-slate-800">{formatPrice(item.price * item.quantity)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            )}

            {/* HIGH-FIDELITY IMPORT CSV MODAL */}
            {showImportModal && (
                <div className="fixed inset-0 bg-white z-[1000] flex flex-col animate-in fade-in duration-200 overflow-hidden">
                    {/* Decorative header line */}
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 w-full shrink-0" />
                    
                    {/* Main Content Container */}
                    <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col overflow-hidden relative">
                        
                        {/* Close button */}
                        <button 
                            onClick={() => {
                                if (importProgress.status === 'processing') {
                                    if (!confirm('Import is currently running. Are you sure you want to close?')) return;
                                }
                                setShowImportModal(false);
                            }}
                            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Upload className="w-6 h-6 text-indigo-600" />
                                Bulk CSV Order Operations
                            </h2>
                            <p className="text-slate-400 text-xs font-semibold mt-1">
                                Bulk update statuses or construct order registers dynamically via standard sheets.
                            </p>
                        </div>

                        {/* Import Mode Chooser */}
                        {importProgress.status === 'idle' && (
                            <div className="grid grid-cols-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-1.5 mb-6">
                                <button
                                    onClick={() => { setImportMode('status_update'); resetImportState(); }}
                                    className={`py-3 text-sm font-extrabold rounded-xl transition cursor-pointer ${
                                        importMode === 'status_update'
                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-100/50'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Bulk Status Update
                                </button>
                                <button
                                    onClick={() => { setImportMode('order_creation'); resetImportState(); }}
                                    className={`py-3 text-sm font-extrabold rounded-xl transition cursor-pointer ${
                                        importMode === 'order_creation'
                                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-100/50'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Bulk Order Creation
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-1">
                            {importProgress.status === 'idle' ? (
                                <div className="space-y-6">
                                    {/* Info/Guide Alert */}
                                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-indigo-900 text-sm leading-relaxed">
                                        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Operational Guidance</p>
                                            <p className="text-xs text-indigo-700 mt-1 font-semibold">
                                                {importMode === 'status_update' 
                                                    ? 'Upload a CSV document containing order numbers and the target statuses (e.g. PAID, READY_TO_BE_SHIPPED, SHIPPED, DELIVERED, CANCELLED).' 
                                                    : 'Provide full buyer details, inventory product identifier codes (SKUs), and customer shipment endpoints.'
                                                }
                                            </p>
                                            
                                            {/* Download templates */}
                                            <div className="mt-3 flex items-center gap-3">
                                                <button
                                                    onClick={() => handleDownloadTemplate(importMode)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 hover:border-indigo-300 text-indigo-600 font-extrabold text-xs rounded-lg shadow-3xs transition cursor-pointer"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    Download CSV Template Guide
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operational Option Switch (Order Creation Only) */}
                                    {importMode === 'order_creation' && (
                                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-3xs">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-extrabold text-sm text-slate-800">Group by Customer Email</p>
                                                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                                        Combine multiple product items for the same customer into a single, multi-item order.
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={groupByUser}
                                                    onChange={(e) => setGroupByUser(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                    )}

                                    {/* Dropzone Area */}
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
                                            dragActive 
                                                ? 'border-indigo-600 bg-indigo-50/20' 
                                                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/30 hover:bg-slate-50/60'
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
                                                <p className="font-extrabold text-slate-700 text-sm">Drag and drop your CSV sheet here</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1">or click to browse your desktop files</p>
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

                                    {/* Parsed Rows Preview */}
                                    {parsedRows.length > 0 && (
                                        <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs bg-white">
                                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Sheet Data Preview (First 3 rows)</span>
                                                <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-[10px] font-black">{parsedRows.length} Rows</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100/30 text-slate-500 border-b border-slate-100 font-bold uppercase">
                                                            {Object.keys(parsedRows[0]).slice(0, 5).map(h => (
                                                                <th key={h} className="px-4 py-2">{h}</th>
                                                            ))}
                                                            {Object.keys(parsedRows[0]).length > 5 && <th className="px-4 py-2">...</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                                                        {parsedRows.slice(0, 3).map((r, ri) => (
                                                            <tr key={ri} className="hover:bg-slate-50/50">
                                                                {Object.keys(parsedRows[0]).slice(0, 5).map(h => (
                                                                    <td key={h} className="px-4 py-2 font-mono text-[10px] max-w-[150px] truncate">{r[h]}</td>
                                                                ))}
                                                                {Object.keys(parsedRows[0]).length > 5 && <td className="px-4 py-2">...</td>}
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
                                    {/* Progress Tracker */}
                                    <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-6 relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                                {importProgress.status === 'processing' ? 'Running batch updates...' : 'Operations complete!'}
                                            </span>
                                            <span className="text-sm font-black text-slate-800">
                                                {importProgress.current} / {importProgress.total} Rows ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                                            </span>
                                        </div>
                                        
                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-5">
                                            <div 
                                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                                            />
                                        </div>

                                        {/* Counters */}
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

                                    {/* Scrolling Event Log Terminal */}
                                    <div className="bg-slate-900 rounded-2xl p-5 shadow-inner border border-slate-800 flex flex-col h-[280px]">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                            <span className="text-[10px] font-bold text-slate-500 font-mono">SYSTEM BATCH TELEMETRY LOG</span>
                                            {importProgress.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
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
                                        <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                                        Batch streaming active. Please do not close windows...
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
                                            className="btn-primary text-sm py-2.5 font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            <Play className="w-4 h-4" />
                                            <span>Run Import Operations</span>
                                        </button>
                                    </>
                                )}
                                {importProgress.status === 'done' && (
                                    <button 
                                        type="button"
                                        onClick={() => setShowImportModal(false)}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
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

export default OrdersPage;
