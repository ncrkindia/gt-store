import { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import { useKeycloak } from '@react-keycloak/web';
import { Upload, X, ChevronLeft } from 'lucide-react';

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
                        <h1 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Banner Promo' : 'Construct Campaign Banner'}</h1>
                        <p className="text-slate-500 text-sm font-medium">Design marketing creatives, discounts, and external redirect nodes.</p>
                    </div>
                </header>

                <div className="max-w-4xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="form-group border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Creatives / Banner Asset</label>
                            {formData.imageUrl && (
                                <div className="mb-4 relative aspect-[21/9] w-full max-w-2xl bg-gray-900 rounded-2xl border border-slate-200 overflow-hidden group">
                                    <img src={getImageUrl(formData.imageUrl)} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition"><X size={14}/></button>
                                </div>
                            )}
                            <div className="relative cursor-pointer">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageUpload} disabled={uploadingImage} />
                                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white hover:border-indigo-500 hover:bg-indigo-50/30 transition duration-200">
                                    <Upload className="mx-auto mb-2 text-slate-400" size={24} />
                                    <span className="text-base font-bold text-slate-800 block">{uploadingImage ? 'Uploading Asset...' : 'Select Banner Graphic'}</span>
                                    <span className="text-xs text-slate-500 mt-1 block">Recommended aspect ratio: 21:9 (e.g. 1920x820)</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Redirection link</label>
                                <input className="w-full" value={formData.linkUrl} onChange={e => setFormData({ ...formData, linkUrl: e.target.value })} placeholder="/category/electronics" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Display Order (Sort)</label>
                                <input className="w-full" type="number" value={formData.displayOrder} onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Headline Title</label>
                                <input className="w-full" value={formData.headline} onChange={e => setFormData({ ...formData, headline: e.target.value })} placeholder="e.g. Festive Season Blowout" />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Discount Tagline</label>
                                <input className="w-full" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} placeholder="Flat 25% Off" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Descriptive Copy</label>
                            <textarea 
                                className="w-full min-h-[100px]"
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                placeholder="Explain terms, highlights, and duration..."
                            />
                        </div>

                        <div className="flex items-center gap-2.5 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/30 w-fit">
                            <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} className="w-5 h-5 rounded-md text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                            <label htmlFor="active" className="text-sm font-bold text-indigo-900 cursor-pointer">Set Campaign Status to Active</label>
                        </div>

                        <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-6 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary py-2.5 px-6">Discard Changes</button>
                            <button type="submit" className="btn-primary py-2.5 px-8" disabled={uploadingImage}>
                                {editingId ? 'Commit Edits' : 'Publish Creative'}
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

        </div>
    );
};

export default BannersPage;
