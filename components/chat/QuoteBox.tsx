'use client';

import { Product } from '@/app/chat/page';
import { X, Plus, Minus, Download, Share2 } from 'lucide-react';
import Image from 'next/image';

interface QuoteBoxProps {
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveProduct: (productId: string) => void;
}

export default function QuoteBox({
  products,
  onUpdateQuantity,
  onRemoveProduct,
}: QuoteBoxProps) {
  const total = products.reduce(
    (sum, product) => sum + product.price * (product.quantity || 1),
    0
  );

  return (
    <div className="w-96 h-screen bg-white border-l border-gray-200 flex flex-col shadow-xl fixed right-0 top-0">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-800">Quote Builder</h3>
        <p className="text-sm text-gray-600 mt-1">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Products List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No products added yet</p>
            <p className="text-xs mt-2">Chat with the AI to add products</p>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow group"
            >
              <div className="flex gap-3">
                {/* Product Image */}
                <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-800 truncate">
                    {product.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    SKU: {product.sku}
                  </p>
                  <p className="text-sm font-semibold text-purple-600 mt-1">
                    R{product.price.toLocaleString()}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => onRemoveProduct(product.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-600">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateQuantity(product.id, (product.quantity || 1) - 1)
                    }
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-600 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {product.quantity || 1}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateQuantity(product.id, (product.quantity || 1) + 1)
                    }
                    className="w-6 h-6 rounded-full bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-600 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Line Total */}
              <div className="flex justify-end mt-2">
                <span className="text-xs font-medium text-gray-700">
                  Total: R
                  {(product.price * (product.quantity || 1)).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {products.length > 0 && (
        <div className="border-t border-gray-200 p-6 bg-gradient-to-br from-gray-50 to-white">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-800">Total (incl. VAT)</span>
              <span className="text-purple-600">R{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all">
              Generate Quote
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button className="py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
