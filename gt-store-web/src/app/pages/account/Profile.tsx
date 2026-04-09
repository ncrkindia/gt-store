import { useState, useEffect } from "react";
import { Edit2, Save, X } from "lucide-react";
import { useKeycloak } from '@react-keycloak/web';

export function Profile() {
  const { keycloak } = useKeycloak();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "male",
    birthday: "",
  });

  useEffect(() => {
    if (keycloak.tokenParsed) {
      setFormData(prev => ({
        ...prev,
        firstName: keycloak.tokenParsed?.given_name || "Guest",
        lastName: keycloak.tokenParsed?.family_name || "",
        email: keycloak.tokenParsed?.email || "guest@example.com"
      }));
    }
  }, [keycloak.tokenParsed]);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    keycloak.accountManagement();
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl">Personal Information</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 text-indigo-600 hover:text-purple-600 font-semibold cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            disabled={true}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Birthday</label>
          <input
            type="date"
            value={formData.birthday}
            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0] disabled:bg-gray-50"
          />
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg mb-4">Change Password</h3>
        <button onClick={handlePasswordChange} className="text-indigo-600 hover:underline cursor-pointer">
          Click here to manage account in Keycloak
        </button>
      </div>
    </div>
  );
}
