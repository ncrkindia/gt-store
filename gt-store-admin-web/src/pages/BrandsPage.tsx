import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X } from 'lucide-react';

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

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal glass-card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Brand' : 'Create Brand'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="form-group">
                                <label>Brand Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Slug</label>
                                <input required value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                            </div>
                            <div className="form-group">
                                <label>Logo / Brand Image</label>
                                {formData.imageUrl && (
                                    <div className="mb-2 relative w-24 h-24 bg-white p-2 rounded border border-gray-600">
                                        <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-contain" />
                                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"><X size={12}/></button>
                                    </div>
                                )}
                                <div className="relative cursor-pointer">
                                    <input type="file" className="absolute opacity-0 w-full h-full cursor-pointer" onChange={handleImageUpload} disabled={uploadingImage} />
                                    <div className="border-2 border-dashed border-gray-600 rounded p-4 text-center hover:bg-white transition">
                                        <Upload className="mx-auto mb-1" size={20} />
                                        <span>{uploadingImage ? 'Uploading...' : 'Upload Logo'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-buttons pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary mr-2">Cancel</button>
                                <button type="submit" className="btn-primary" disabled={uploadingImage}>Save Brand</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrandsPage;
