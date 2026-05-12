import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../src/api/products';
import { ProductCard } from '../../src/components/ProductCard';

const CATEGORIES = ['All', 'Tools', 'Electronics', 'Apparel', 'Accessories', 'Parts'];

export default function ShopScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const filteredProducts = products?.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Search and Filter */}
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-2xl px-4 py-2.5">
            <Search size={18} color="#717182" />
            <TextInput
              placeholder="Search catalog..."
              className="flex-1 ml-2 text-sm text-gray-800"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-2xl">
            <SlidersHorizontal size={20} color="#030213" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Pills */}
      <View className="mb-4">
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              className={`mr-3 px-5 py-2.5 rounded-full border ${
                selectedCategory === item 
                  ? 'bg-primary border-primary' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text className={`text-xs font-bold ${
                selectedCategory === item ? 'text-white' : 'text-gray-500'
              }`}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
        />
      </View>

      {/* Stats and Sort */}
      <View className="px-5 flex-row items-center justify-between mb-4">
        <Text className="text-gray-500 text-xs font-medium">
          Showing {filteredProducts?.length || 0} products
        </Text>
        <TouchableOpacity className="flex-row items-center">
          <Text className="text-gray-900 text-xs font-bold mr-1">Sort by</Text>
          <ChevronDown size={14} color="#030213" />
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => (
          <View style={{ width: '50%' }}>
            <ProductCard product={item} />
          </View>
        )}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
