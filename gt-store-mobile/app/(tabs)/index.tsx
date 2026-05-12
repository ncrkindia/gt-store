import React from 'react';
import { View, Text, ScrollView, FlatList, TextInput, Image, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell, Filter } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../src/api/products';
import { ProductCard } from '../../src/components/ProductCard';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 py-3 flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 text-xs">Welcome to</Text>
          <Text className="text-primary text-xl font-bold">GT Store</Text>
        </View>
        <TouchableOpacity className="bg-gray-100 p-2 rounded-full">
          <Bell size={20} color="#030213" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View className="px-5 mt-4">
          <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3">
            <Search size={20} color="#717182" />
            <TextInput 
              placeholder="Search tools, parts, accessories..." 
              className="flex-1 ml-3 text-sm text-gray-800"
              placeholderTextColor="#717182"
            />
            <TouchableOpacity className="bg-primary p-1.5 rounded-lg">
              <Filter size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Banner */}
        <View className="px-5 mt-6">
          <View className="bg-primary rounded-3xl overflow-hidden relative h-40 flex-row items-center px-6">
            <View className="flex-1 z-10">
              <Text className="text-white text-2xl font-bold">New Arrivals</Text>
              <Text className="text-gray-300 text-sm mt-1">Upgrade your kit with the latest pro tools.</Text>
              <TouchableOpacity className="bg-white px-4 py-2 rounded-full self-start mt-4">
                <Text className="text-primary font-bold text-xs uppercase">Shop Now</Text>
              </TouchableOpacity>
            </View>
            <View className="absolute right-0 bottom-0 opacity-40">
               {/* Use a placeholder or generated image if needed */}
            </View>
          </View>
        </View>

        {/* Featured Section */}
        <View className="mt-8">
          <View className="px-5 flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Featured Products</Text>
            <TouchableOpacity>
              <Text className="text-primary text-xs font-bold">View All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={products?.slice(0, 5)}
            renderItem={({ item }) => (
              <View style={{ width: width * 0.6 }}>
                <ProductCard product={item} />
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 12, paddingRight: 20 }}
            keyExtractor={(item) => item.id}
          />
        </View>

        {/* All Products Grid */}
        <View className="px-3 mt-8 pb-10">
           <Text className="px-2 text-lg font-bold text-gray-900 mb-4">Just For You</Text>
           <View className="flex-row flex-wrap">
              {products?.map((item) => (
                <View key={item.id} style={{ width: '50%' }}>
                  <ProductCard product={item} />
                </View>
              ))}
           </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


