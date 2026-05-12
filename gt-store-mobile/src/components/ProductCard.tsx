import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Star, Heart } from 'lucide-react-native';
import { Product } from '../api/products';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`} asChild>
      <TouchableOpacity className="bg-white rounded-2xl overflow-hidden m-2 border border-gray-100 shadow-sm grow basis-[45%]">
        <View className="relative aspect-square bg-gray-50 items-center justify-center">
          <Image
            source={{ uri: product.imageUrl || 'https://via.placeholder.com/150' }}
            className="w-full h-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow">
            <Heart size={16} color="#f43f5e" />
          </TouchableOpacity>
        </View>

        <View className="p-3">
          <Text className="text-sm font-medium text-gray-800 h-10" numberOfLines={2}>
            {product.name}
          </Text>

          <View className="flex-row items-center mt-2 mb-2">
            <View className="flex-row items-center bg-orange-500 px-2 py-0.5 rounded-lg">
              <Text className="text-white text-[10px] font-bold mr-1">4.5</Text>
              <Star size={10} color="white" fill="white" />
            </View>
            <Text className="text-[10px] text-gray-500 ml-2">(128)</Text>
          </View>

          <View className="flex-row items-baseline">
            <Text className="text-lg font-bold text-gray-900">${product.price}</Text>
          </View>

          {product.stockQuantity <= 0 && (
            <Text className="text-[10px] text-red-500 mt-1">Out of Stock</Text>
          )}
        </View>
      </TouchableOpacity>
    </Link>
  );
}
