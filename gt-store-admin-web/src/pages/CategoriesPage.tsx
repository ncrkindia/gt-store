import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, ChevronLeft } from 'lucide-react';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string;
    imageUrl?: string;
    parentId?: string;
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
        icon: 'Package',
        imageUrl: '',
        parentId: ''
    };
    const [formData, setFormData] = useState<Omit<Category, 'id'>>(emptyCategory);
    const [uploadingImage, setUploadingImage] = useState(false);

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
            icon: c.icon || 'Package',
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
                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Lucide Icon Key</label>
                            <input className="w-full max-w-md" value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} placeholder="Package" />
                            <p className="text-xs text-slate-400 mt-1.5">Enter a valid Lucide-react icon name to use in navigation panels.</p>
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

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Icon</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {categories.map(c => (
                        <tr key={c.id}>
                            <td>
                                {c.imageUrl && <img src={getImageUrl(c.imageUrl)} className="w-10 h-10 rounded object-cover border border-gray-700" alt="" />}
                            </td>
                            <td className="font-bold">{c.name}</td>
                            <td>{c.slug}</td>
                            <td>{c.icon}</td>
                            <td>
                                <button onClick={() => handleEdit(c)} className="btn-icon">Edit</button>
                                <button onClick={() => handleDelete(c.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
};

export default CategoriesPage;
