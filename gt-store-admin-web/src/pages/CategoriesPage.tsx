import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X } from 'lucide-react';

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

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal glass-card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Category' : 'Create Category'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="form-group">
                                <label>Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Slug</label>
                                <input required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Icon Name (Lucide)</label>
                                <input value={formData.icon} onChange={e => setFormData({ ...formData, icon: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Representative Image</label>
                                {formData.imageUrl && (
                                    <div className="mb-2 relative w-24 h-24">
                                        <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-cover rounded" />
                                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"><X size={12}/></button>
                                    </div>
                                )}
                                <div className="relative cursor-pointer">
                                    <input type="file" className="absolute opacity-0 w-full h-full cursor-pointer" onChange={handleImageUpload} disabled={uploadingImage} />
                                    <div className="border-2 border-dashed border-gray-600 rounded p-4 text-center hover:bg-white/5 transition">
                                        <Upload className="mx-auto mb-1" size={20} />
                                        <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-buttons pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary mr-2">Cancel</button>
                                <button type="submit" className="btn-primary" disabled={uploadingImage}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
