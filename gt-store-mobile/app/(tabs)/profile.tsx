import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, LogOut, Package, MapPin, CreditCard, ChevronRight, UserCircle } from 'lucide-react-native';

const MENU_ITEMS = [
  { icon: Package, label: 'My Orders', color: '#6366f1' },
  { icon: MapPin, label: 'Shipping Address', color: '#10b981' },
  { icon: CreditCard, label: 'Payment Methods', color: '#f59e0b' },
  { icon: Settings, label: 'Settings', color: '#717182' },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center py-8">
          <View className="relative">
            <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center overflow-hidden border-4 border-gray-50 shadow-sm">
               <UserCircle size={80} color="#cbced4" />
            </View>
            <TouchableOpacity className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white shadow-lg">
               <View className="w-3 h-3 bg-emerald-500 rounded-full" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-xl font-bold text-gray-900 mt-4">Guest User</Text>
          <Text className="text-gray-500 text-sm">guest@gtstore.slpro.in</Text>
          
          <TouchableOpacity className="mt-5 bg-gray-100 px-6 py-2 rounded-full">
            <Text className="text-primary text-xs font-bold uppercase">Sign In / Register</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View className="px-5 mt-4">
          <Text className="text-gray-900 font-bold text-base mb-4">Account Overview</Text>
          
          <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            {MENU_ITEMS.map((item, index) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity className="flex-row items-center justify-between p-5">
                  <View className="flex-row items-center">
                    <View style={{ backgroundColor: item.color + '15' }} className="p-2.5 rounded-xl">
                      <item.icon size={20} color={item.color} />
                    </View>
                    <Text className="ml-4 text-gray-800 font-medium">{item.label}</Text>
                  </View>
                  <ChevronRight size={18} color="#cbced4" />
                </TouchableOpacity>
                {index < MENU_ITEMS.length - 1 && <View className="h-[1px] bg-gray-50 mx-5" />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Support & Logout */}
        <View className="px-5 mt-8 pb-10">
          <TouchableOpacity className="flex-row items-center bg-gray-50 p-5 rounded-3xl border border-gray-100">
             <View className="bg-rose-100 p-2.5 rounded-xl">
               <LogOut size={20} color="#f43f5e" />
             </View>
             <Text className="ml-4 text-rose-500 font-bold">Log Out</Text>
          </TouchableOpacity>
          
          <View className="mt-10 items-center">
             <Text className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">Version 1.0.0 (Gold Build)</Text>
             <Text className="text-gray-400 text-[10px] mt-1">GT Store - Premium Tooling Marketplace</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
