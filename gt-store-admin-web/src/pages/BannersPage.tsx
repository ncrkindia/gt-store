import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X } from 'lucide-react';

const getImageUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/')) return `https://gts-api.slpro.in${url}`;
    return url;
};

interface Banner {
    id: string;
    imageUrl: string;
    linkUrl?: string;
    headline?: string;
    description?: string;
    discount?: string;
    displayOrder: number;
    active: boolean;
}

const BannersPage = () => {
    const { initialized } = useKeycloak();
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const emptyBanner: Omit<Banner, 'id'> = {
        imageUrl: '',
        linkUrl: '',
        headline: '',
        description: '',
        discount: '',
        displayOrder: 0,
        active: true
    };
    const [formData, setFormData] = useState<Omit<Banner, 'id'>>(emptyBanner);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchBanners = async () => {
        if (!initialized) return;
        try {
            const response = await apiClient.get('/api/banners');
            setBanners(response.data.sort((a: Banner, b: Banner) => a.displayOrder - b.displayOrder));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching banners:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, [initialized]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await apiClient.put(`/api/banners/${editingId}`, formData);
            } else {
                await apiClient.post('/api/banners', formData);
            }
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyBanner);
            fetchBanners();
        } catch (error) {
            console.error('Error saving banner', error);
            alert('Error saving banner');
        }
    };

    const handleEdit = (b: Banner) => {
        setFormData({
            imageUrl: b.imageUrl,
            linkUrl: b.linkUrl || '',
            headline: b.headline || '',
            description: b.description || '',
            discount: b.discount || '',
            displayOrder: b.displayOrder,
            active: b.active
        });
        setEditingId(b.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        try {
            await apiClient.delete(`/api/banners/${id}`);
            fetchBanners();
        } catch (error) {
            alert('Error deleting banner');
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

    if (loading) return <div className="loading">Loading Banners...</div>;

    return (
        <div className="page-container glass-card">
            <header className="page-header">
                <h1>Marketing Banners</h1>
                <button onClick={() => {
                    setEditingId(null);
                    setFormData({...emptyBanner, displayOrder: banners.length});
                    setIsModalOpen(true);
                }} className="btn-primary">
                    + New Banner
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map(b => (
                    <div key={b.id} className={`banner-card glass-card overflow-hidden group border ${b.active ? 'border-indigo-500/30' : 'border-gray-800 opacity-60'}`}>
                        <div className="relative aspect-[21/9] bg-gray-900">
                            <img src={getImageUrl(b.imageUrl)} className="w-full h-full object-cover" alt="Banner" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                <button onClick={() => handleEdit(b)} className="bg-white text-gray-900 px-3 py-1 rounded-lg text-sm font-bold">Edit</button>
                                <button onClick={() => handleDelete(b.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold">Delete</button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-400 mb-1">Order: {b.displayOrder}</p>
                                <p className="text-sm font-medium truncate max-w-[150px]">{b.linkUrl || 'No Link'}</p>
                            </div>
                            <div className={`status-badge ${b.active ? 'status-delivered' : 'status-cancelled'}`}>
                                {b.active ? 'Active' : 'Inactive'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal glass-card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Banner' : 'Create Banner'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="form-group">
                                <label>Banner Image</label>
                                {formData.imageUrl && (
                                    <div className="mb-2 relative aspect-[21/9] w-full bg-gray-900 rounded overflow-hidden">
                                        <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-2 right-2 bg-red-600 rounded-full p-1"><X size={12}/></button>
                                    </div>
                                )}
                                <div className="relative cursor-pointer">
                                    <input type="file" className="absolute opacity-0 w-full h-full cursor-pointer" onChange={handleImageUpload} disabled={uploadingImage} />
                                    <div className="border-2 border-dashed border-gray-600 rounded p-4 text-center hover:bg-white/5 transition">
                                        <Upload className="mx-auto mb-1" size={20} />
                                        <span>{uploadingImage ? 'Uploading...' : 'Upload Banner Image'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Link URL (optional)</label>
                                <input value={formData.linkUrl} onChange={e => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="/category/electronics" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label>Headline (e.g. Special Offer)</label>
                                    <input value={formData.headline} onChange={e => setFormData({ ...formData, headline: e.target.value })} placeholder="Special Offer" />
                                </div>
                                <div className="form-group">
                                    <label>Discount (e.g. Flat 10%)</label>
                                    <input value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} placeholder="Flat 10% Off" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                    placeholder="Festival offer till 15th Apr"
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm h-20"
                                />
                            </div>
                            <div className="form-group">
                                <label>Display Order</label>
                                <input type="number" value={formData.displayOrder} onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} className="rounded bg-gray-800 border-gray-700" />
                                <label htmlFor="active" className="text-sm font-medium">Banner is Active</label>
                            </div>
                            <div className="form-buttons pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary mr-2">Cancel</button>
                                <button type="submit" className="btn-primary" disabled={uploadingImage}>Save Banner</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BannersPage;
