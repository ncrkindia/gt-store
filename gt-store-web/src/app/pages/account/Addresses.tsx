import { useState } from "react";
import { MapPin, Plus, Edit2, Trash2, Check } from "lucide-react";

interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: "1",
      name: "John Doe",
      phone: "+1 (555) 123-4567",
      addressLine1: "123 Main Street",
      addressLine2: "Apt 4B",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      isDefault: true,
    },
    {
      id: "2",
      name: "John Doe",
      phone: "+1 (555) 987-6543",
      addressLine1: "456 Oak Avenue",
      addressLine2: "",
      city: "Brooklyn",
      state: "NY",
      zipCode: "11201",
      isDefault: false,
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl">Saved Addresses</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-[#2874f0] text-white px-4 py-2 rounded hover:bg-[#1c5ccc] transition"
          >
            <Plus className="w-4 h-4" />
            Add New Address
          </button>
        </div>

        {/* Add Address Form */}
        {showAddForm && (
          <div className="mb-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="mb-4">Add New Address</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="Address Line 1"
                className="md:col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                className="md:col-span-2 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="City"
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="State"
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
              <input
                type="text"
                placeholder="ZIP Code"
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2874f0]"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button className="bg-[#2874f0] text-white px-6 py-2 rounded hover:bg-[#1c5ccc] transition">
                Save Address
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length === 0 ? (
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
                {address.isDefault && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                    <Check className="w-3 h-3" />
                    Default
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="mb-1">{address.name}</h3>
                  <p className="text-sm text-gray-600">{address.phone}</p>
                </div>

                <div className="mb-4 text-sm text-gray-700">
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>
                    {address.city}, {address.state} {address.zipCode}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 text-[#2874f0] hover:underline text-sm">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="flex items-center gap-2 text-red-600 hover:underline text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  {!address.isDefault && (
                    <button className="flex items-center gap-2 text-gray-700 hover:underline text-sm ml-auto">
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
