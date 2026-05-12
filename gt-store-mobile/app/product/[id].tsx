import React, { useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Heart, Star, ShoppingCart, ShieldCheck, Truck } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '../../src/api/products';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id),
  });

  if (isLoading || !product) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text>Loading product details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header Overlay */}
      <View className="absolute top-12 left-5 right-5 z-10 flex-row justify-between">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm"
        >
          <ChevronLeft size={24} color="#030213" />
        </TouchableOpacity>
        <View className="flex-row gap-3">
          <TouchableOpacity className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm">
            <Share2 size={20} color="#030213" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-white/80 backdrop-blur-md p-2 rounded-full shadow-sm">
            <Heart size={20} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View className="bg-gray-50 h-[400px] w-full items-center justify-center">
          <Image
            source={{ uri: product.imageUrl || 'https://via.placeholder.com/400' }}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        {/* Product Content */}
        <View className="px-5 pt-6 pb-20">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                {product.category}
              </Text>
              <Text className="text-2xl font-bold text-gray-900 mt-1">
                {product.name}
              </Text>
            </View>
            <View className="flex-row items-center bg-orange-500 px-3 py-1 rounded-full">
              <Star size={14} color="white" fill="white" />
              <Text className="text-white text-xs font-bold ml-1">4.5</Text>
            </View>
          </View>

          <View className="flex-row items-center mt-6">
            <Text className="text-3xl font-bold text-gray-900">${product.price}</Text>
            <View className="ml-4 bg-emerald-100 px-2 py-1 rounded-lg">
              <Text className="text-emerald-700 text-[10px] font-bold">20% OFF</Text>
            </View>
          </View>

          <View className="h-[1px] bg-gray-100 w-full mt-6 mb-6" />

          <Text className="text-gray-900 font-bold text-base mb-2">About this product</Text>
          <Text className="text-gray-600 text-sm leading-6">
            {product.description || "The GT Store Professional Grade Tools are engineered for the modern craftsman. Featuring ergonomic designs and high-durability materials, this product is built to last under the most demanding conditions."}
          </Text>

          {/* Features / Benefits */}
          <View className="mt-8 gap-4">
            <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl">
              <View className="bg-primary/10 p-2 rounded-lg">
                 <ShieldCheck size={20} color="#030213" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-bold text-xs">Warranty Protection</Text>
                <Text className="text-gray-500 text-[10px] mt-0.5">2 Year manufacturer warranty against defects.</Text>
              </View>
            </View>
            
            <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl">
              <View className="bg-primary/10 p-2 rounded-lg">
                 <Truck size={20} color="#030213" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-gray-900 font-bold text-xs">Fast Shipping</Text>
                <Text className="text-gray-500 text-[10px] mt-0.5">Free standard delivery on orders over $100.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-4 pb-10 flex-row items-center gap-4">
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-2">
          <TouchableOpacity 
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-3"
          >
            <Text className="text-lg font-bold text-gray-900">-</Text>
          </TouchableOpacity>
          <Text className="px-3 font-bold text-gray-900">{quantity}</Text>
          <TouchableOpacity 
            onPress={() => setQuantity(quantity + 1)}
            className="p-3"
          >
            <Text className="text-lg font-bold text-gray-900">+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="flex-1 bg-primary h-14 rounded-2xl flex-row items-center justify-center gap-2">
          <ShoppingCart size={20} color="white" />
          <Text className="text-white font-bold text-base">Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
