import { useState, useEffect } from "react";
import { MapPin, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import apiClient from "../../../api/axios";
import { useKeycloak } from "@react-keycloak/web";

interface Address {
  id: number;
  name?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  default: boolean;
}

export function Addresses() {
  const { keycloak, initialized } = useKeycloak();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "USA", isDefault: false
  });

  const fetchAddresses = async () => {
    try {
      const { data } = await apiClient.get('/users/me');
      setAddresses(data.addresses || []);
    } catch (e) {
      console.error("Failed to load addresses", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    if (!keycloak.authenticated) { keycloak.login(); return; }
    fetchAddresses();
  }, [initialized, keycloak.authenticated]);

  const handleEdit = (address: Address) => {
    setEditingId(address.id);
    setFormData({
      name: address.name || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      country: address.country || "USA",
      isDefault: address.default || false,
    });
    setShowAddForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/users/me/addresses/${editingId}`, formData);
      } else {
        await apiClient.post('/users/me/addresses', formData);
      }
      setShowAddForm(false);
      setEditingId(null);
      setFormData({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "USA", isDefault: false });
      fetchAddresses();
    } catch (e) {
      console.error("Failed to save address", e);
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Delete this address?")) return;
    try {
      await apiClient.delete(`/users/me/addresses/${id}`);
      fetchAddresses();
    } catch (e) {
      console.error("Failed to delete address", e);
    }
  };

  const setAsDefault = async (address: Address) => {
    try {
      await apiClient.put(`/users/me/addresses/${address.id}`, { ...address, isDefault: true });
      fetchAddresses();
    } catch (e) {
      console.error(e);
    }
  }

  if (!initialized || loading) return (
    <div className="bg-white rounded-lg p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#2874f0] border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">Loading Addresses...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl">Saved Addresses</h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-[#2874f0] text-white px-4 py-2 rounded hover:bg-[#1c5ccc] transition"
            >
              <Plus className="w-4 h-4" />
              Add New Address
            </button>
          )}
        </div>

        {/* Add/Edit Address Form */}
        {showAddForm && (
          <form onSubmit={handleSave} className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50 relative">
             <button type="button" onClick={() => { setShowAddForm(false); setEditingId(null); }} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                <X className="w-5 h-5"/>
            </button>
            <h3 className="mb-4">{editingId ? 'Edit Address' : 'Add New Address'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                required
                type="text"
                placeholder="Full Name (optional)"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                required
                type="text"
                placeholder="Address Line 1"
                value={formData.line1}
                onChange={e => setFormData({ ...formData, line1: e.target.value })}
                className="md:col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={formData.line2}
                onChange={e => setFormData({ ...formData, line2: e.target.value })}
                className="md:col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                required
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                required
                type="text"
                placeholder="State"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                required
                type="text"
                placeholder="ZIP / Pincode"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
               <input
                required
                type="text"
                placeholder="Country"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
            </div>
            
            <div className="mt-4 flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="w-4 h-4"/>
                <label htmlFor="isDefault" className="text-sm">Set as Default Address</label>
            </div>

            <div className="flex gap-3 mt-4">
              <button type="submit" className="bg-[#2874f0] text-white px-6 py-2 rounded hover:bg-[#1c5ccc] transition">
                {editingId ? 'Update Address' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditingId(null); }}
                className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Addresses List */}
        {addresses.length === 0 && !showAddForm ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No saved addresses</p>
            <p className="text-sm text-gray-500">Add an address for faster checkout</p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition relative"
              >
                {address.default && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                    <Check className="w-3 h-3" />
                    Default
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="mb-1 font-semibold">{address.name || "Default Name"}</h3>
                  <p className="text-sm text-gray-600">{address.phone}</p>
                </div>

                <div className="mb-4 text-sm text-gray-700">
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>
                    {address.city}, {address.state} {address.pincode}
                  </p>
                  <p className="text-gray-500 mt-1">{address.country}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleEdit(address)} className="flex items-center gap-2 text-[#2874f0] hover:underline text-sm">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(address.id)} className="flex items-center gap-2 text-red-600 hover:underline text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  {!address.default && (
                    <button onClick={() => setAsDefault(address)} className="flex items-center gap-2 text-gray-700 hover:underline text-sm ml-auto">
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
