import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, ChevronLeft } from 'lucide-react';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface Brand {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    description?: string;
}

const BrandsPage = () => {
    const { initialized } = useKeycloak();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const emptyBrand: Omit<Brand, 'id'> = {
        name: '',
        slug: '',
        imageUrl: '',
        description: ''
    };
    const [formData, setFormData] = useState<Omit<Brand, 'id'>>(emptyBrand);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchBrands = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/brands');
            setBrands(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching brands:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, [initialized]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/api/brands/${editingId}`, formData);
            } else {
                await apiClient.post('/api/brands', formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyBrand);
            fetchBrands();
        } catch (error) {
            console.error('Error saving brand', error);
            alert('Error saving brand');
        }
    };

    const handleEdit = (b: Brand) => {
        setFormData({
            name: b.name,
            slug: b.slug,
            imageUrl: b.imageUrl || '',
            description: b.description || ''
        });
        setEditingId(b.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this brand?')) return;
        try {
            await apiClient.delete(`/api/brands/${id}`);
            fetchBrands();
        } catch (error) {
            alert('Error deleting brand');
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

    if (loading) return <div className="loading">Loading Brands...</div>;

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
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Brand Profile' : 'New Brand Account'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Configure identity assets and descriptive parameters.</p>
                    </div>
                </header>

                <div className="max-w-3xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Brand Name</label>
                                <input className="w-full" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="ASUS ROG" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">URL Slug</label>
                                <input className="w-full" required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} placeholder="asus-rog" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Bio/Description</label>
                            <textarea className="w-full min-h-[100px]" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Enter manufacturer overview..." />
                        </div>
                        <div className="form-group border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Logo Artifact</label>
                            {formData.imageUrl && (
                                <div className="mb-4 relative w-32 h-32 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center group">
                                    <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-contain" />
                                    <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition"><X size={14}/></button>
                                </div>
                            )}
                            <div className="relative cursor-pointer max-w-xs">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageUpload} disabled={uploadingImage} />
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-white hover:border-indigo-500 hover:bg-indigo-50/30 transition duration-200">
                                    <Upload className="mx-auto mb-2 text-slate-400" size={22} />
                                    <span className="text-sm font-bold text-slate-800 block">{uploadingImage ? 'Uploading Assets...' : 'Upload Identifier'}</span>
                                    <span className="text-xs text-slate-500 mt-1 block">Supports WebP, PNG & JPG</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-2.5 px-6">Cancel Operations</button>
                            <button type="submit" className="btn-primary py-2.5 px-8" disabled={uploadingImage}>
                                {editingId ? 'Push Updates' : 'Construct Ledger'}
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
                <h1>Brand Management</h1>
                <button onClick={() => {
                    setEditingId(null);
                    setFormData(emptyBrand);
                    setIsModalOpen(true);
                }} className="btn-primary">
                    + New Brand
                </button>
            </header>

            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Logo</th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {brands.map(b => (
                        <tr key={b.id}>
                            <td>
                                {b.imageUrl && <img src={getImageUrl(b.imageUrl)} className="w-10 h-10 rounded object-contain bg-white p-1" alt="" />}
                            </td>
                            <td className="font-bold">{b.name}</td>
                            <td>{b.slug}</td>
                            <td className="max-w-xs truncate text-gray-400">{b.description}</td>
                            <td>
                                <button onClick={() => handleEdit(b)} className="btn-icon">Edit</button>
                                <button onClick={() => handleDelete(b.id)} className="btn-icon btn-delete">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
};

export default BrandsPage;
