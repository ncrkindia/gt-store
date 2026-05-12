import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react-native';
import { useCartStore } from '../../src/store/cartStore';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();

  const total = getTotal();

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-10">
        <View className="bg-gray-100 p-8 rounded-full mb-6">
          <ShoppingBag size={48} color="#717182" />
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Your cart is empty</Text>
        <Text className="text-gray-500 text-sm text-center mb-8">
          Looks like you haven't added anything to your cart yet.
        </Text>
        <TouchableOpacity className="bg-primary px-8 py-4 rounded-2xl w-full flex-row items-center justify-center">
          <Text className="text-white font-bold mr-2">Start Shopping</Text>
          <ArrowRight size={18} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-5 py-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Your Cart</Text>
        <Text className="text-gray-500 text-xs mt-1">{items.length} Items</Text>
      </View>

      <FlatList
        data={items}
        contentContainerStyle={{ padding: 20 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="flex-row mb-6 bg-white rounded-2xl p-3 border border-gray-50 shadow-sm">
            <Image
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }}
              className="w-20 h-20 rounded-xl bg-gray-50"
              resizeMode="contain"
            />
            <View className="flex-1 ml-4 justify-between">
              <View className="flex-row justify-between">
                <Text className="text-sm font-bold text-gray-900 flex-1 mr-2" numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Trash2 size={16} color="#f43f5e" />
                </TouchableOpacity>
              </View>
              
              <Text className="text-xs text-gray-500">{item.category}</Text>
              
              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-base font-bold text-gray-900">${item.price}</Text>
                
                <View className="flex-row items-center bg-gray-100 rounded-lg px-2">
                  <TouchableOpacity 
                    onPress={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="p-1"
                  >
                    <Text className="font-bold text-gray-900">-</Text>
                  </TouchableOpacity>
                  <Text className="px-3 text-xs font-bold text-gray-900">{item.quantity}</Text>
                  <TouchableOpacity 
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1"
                  >
                    <Text className="font-bold text-gray-900">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Summary */}
      <View className="bg-white border-t border-gray-100 px-5 pt-6 pb-12 shadow-2xl">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-gray-500">Subtotal</Text>
          <Text className="text-gray-900 font-medium">${total.toFixed(2)}</Text>
        </View>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-gray-500">Shipping</Text>
          <Text className="text-emerald-600 font-bold uppercase text-[10px]">Free</Text>
        </View>
        
        <View className="flex-row justify-between items-center mb-6 pt-4 border-t border-gray-100">
          <Text className="text-lg font-bold text-gray-900">Total</Text>
          <Text className="text-2xl font-bold text-primary">${total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity className="bg-primary h-14 rounded-2xl flex-row items-center justify-center shadow-lg">
          <Text className="text-white font-bold text-base mr-2">Secure Checkout</Text>
          <ArrowRight size={18} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
