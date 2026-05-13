import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, ChevronLeft, Search } from 'lucide-react';

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
        fetchCategories();
    }, [initialized]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/api/categories/${editingId}`, formData);
            } else {
                await apiClient.post('/api/categories', formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyCategory);
            fetchCategories();
        } catch (error) {
            console.error('Error saving category', error);
            alert('Error saving category');
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
            fetchCategories();
        } catch (error) {
            alert('Error deleting category');
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
        } catch (error) {
            alert('Image upload failed');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) return <div className="loading">Loading Categories...</div>;

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
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Category Attributes' : 'New Category Registration'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Define metadata and navigational hierarchy properties.</p>
                    </div>
                </header>

                <div className="max-w-3xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Gaming Laptops" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">URL Slug</label>
                                <input className="w-full" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="gaming-laptops" />
                            </div>
                        </div>
                        <div className="form-group border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
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
                            <button type="submit" className="btn-primary py-2.5 px-8" disabled={uploadingImage}>
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
            <header className="page-header">
                <h1>Category Management</h1>
                <button onClick={() => {
                    setEditingId(null);
                    setFormData(emptyCategory);
                    setIsModalOpen(true);
                }} className="btn-primary">
                    + New Category
                </button>
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
                <span className="text-xs font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl shrink-0 flex items-center gap-2">
                    {filteredCategories.length} Total Items Listed
                </span>
            </div>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredCategories.map(c => (
                        <tr key={c.id}>
                            <td>
                                {c.imageUrl && <img src={getImageUrl(c.imageUrl)} className="w-10 h-10 rounded object-cover border border-gray-700" alt="" />}
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
                            <td>{c.slug}</td>
                            <td>
                                <button onClick={() => handleEdit(c)} className="btn-icon">Edit</button>
                                <button onClick={() => handleDelete(c.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                    {filteredCategories.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-10">
                                <div className="text-slate-400 font-bold text-sm italic">
                                    No categories found matching your search criteria
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

        </div>
    );
};

export default CategoriesPage;
