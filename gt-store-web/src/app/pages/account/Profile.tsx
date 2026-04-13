import { useState, useEffect } from "react";
import { Edit2, Save, X, User as UserIcon, Phone, Mail, Calendar, UserCheck } from "lucide-react";
import { useKeycloak } from '@react-keycloak/web';
import apiClient from "../../../api/axios";
import { toast } from "sonner";

export function Profile() {
  const { keycloak, initialized } = useKeycloak();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    secondaryPhone: "",
    gender: "male",
    birthday: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/users/me");
      const dbUser = response.data.user;
      
      setFormData(prev => ({
        ...prev,
        firstName: keycloak.tokenParsed?.given_name || dbUser.name?.split(' ')[0] || "Guest",
        lastName: keycloak.tokenParsed?.family_name || dbUser.name?.split(' ').slice(1).join(' ') || "",
        email: keycloak.tokenParsed?.email || dbUser.email || "guest@example.com",
        phone: dbUser.phone || "",
        secondaryPhone: dbUser.secondaryPhone || "",
        gender: dbUser.gender || "male",
        birthday: dbUser.birthday || "",
      }));
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      fetchProfile();
    }
  }, [initialized, keycloak.authenticated, keycloak.tokenParsed]);

  const handleSave = async () => {
    try {
      await apiClient.put("/users/me", {
        phone: formData.phone,
        secondaryPhone: formData.secondaryPhone,
        gender: formData.gender,
        birthday: formData.birthday
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Failed to update profile");
    }
  };

  const handlePasswordChange = () => {
    keycloak.accountManagement();
  };

  if (!initialized || (loading && !formData.email)) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <UserIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
            <p className="text-sm text-gray-500">Manage your profile and contact details</p>
          </div>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition font-bold cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition font-bold cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
        {/* Read-only Identity Fields */}
        <div className="space-y-6">
          <div className="group">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
              <UserCheck className="w-4 h-4 text-gray-400" />
              First Name
              <span className="text-[10px] uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Managed by Pahchaan</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              disabled={true}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed opacity-80"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
              <UserCheck className="w-4 h-4 text-gray-400" />
              Last Name
              <span className="text-[10px] uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Managed by Pahchaan</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              disabled={true}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed opacity-80"
            />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
              <Mail className="w-4 h-4 text-gray-400" />
              Email Address
              <span className="text-[10px] uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded ml-auto">Managed by Pahchaan</span>
            </label>
            <input
              type="email"
              value={formData.email}
              disabled={true}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed opacity-80"
            />
          </div>
        </div>

        {/* Editable Profile Fields */}
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
              <Phone className="w-4 h-4 text-gray-400" />
              Primary Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
              placeholder="e.g. +91 9876543210"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-50/50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
              <Phone className="w-4 h-4 text-gray-400" />
              Secondary Phone
            </label>
            <input
              type="tel"
              value={formData.secondaryPhone}
              onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
              disabled={!isEditing}
              placeholder="e.g. +91 9876543211"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-50/50 disabled:text-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-50/50 disabled:text-gray-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 px-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                Birthday
              </label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition disabled:bg-gray-50/50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100 bg-gray-50/50 -mx-8 -mb-8 px-8 pb-8 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Account Security</h3>
            <p className="text-sm text-gray-500">Your password and primary identity are managed via Pahchaan Secure Auth.</p>
          </div>
          <button 
            onClick={handlePasswordChange} 
            className="px-6 py-2.5 bg-white border border-gray-200 text-indigo-600 font-bold rounded-xl hover:bg-white hover:border-indigo-600 transition shadow-sm cursor-pointer"
          >
            Manage Auth Settings
          </button>
        </div>
      </div>
    </div>
  );
}
