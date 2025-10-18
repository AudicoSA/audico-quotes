'use client';

import { useState, useEffect } from 'react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatInterface from '@/components/chat/ChatInterface';
import QuoteBox from '@/components/chat/QuoteBox';
import SystemRequirements from '@/components/SystemRequirements';
import {
  detectSystemType,
  updateRequirementStatus,
  type SystemTemplate,
  type SystemRequirement
} from '@/lib/system-requirements';

export type ChatType = 'home' | 'business' | 'restaurant' | 'gym' | 'worship' | 'education' | 'club' | 'tender';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image?: string;
  quantity?: number;
  category?: string;
}

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<ChatType>('home');
  const [quoteProducts, setQuoteProducts] = useState<Product[]>([]);
  const [systemTemplate, setSystemTemplate] = useState<SystemTemplate | null>(null);
  const [participantCount, setParticipantCount] = useState<number | null>(null);

  const addProductToQuote = (product: Product) => {
    setQuoteProducts((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeProductFromQuote = (productId: string) => {
    setQuoteProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromQuote(productId);
      return;
    }
    setQuoteProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity } : p))
    );
  };

  // Update system requirements when products or chat type changes
  useEffect(() => {
    // Show requirements for any chat tab with at least 1 product
    const shouldShowRequirements = quoteProducts.length >= 1;

    if (shouldShowRequirements) {
      // Auto-detect system type based on products, chat type, and participant count
      const detectedTemplate = detectSystemType({
        chat_type: selectedChat,
        use_case: selectedChat,
        participants: participantCount || undefined,
      });

      console.log('[Requirements] Detected template:', detectedTemplate?.name, 'for', quoteProducts.length, 'products', participantCount ? `(${participantCount} people)` : '');

      if (detectedTemplate) {
        // Update requirement statuses based on current quote
        const updatedRequirements = detectedTemplate.requirements.map(req =>
          updateRequirementStatus(req, quoteProducts.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category || '',
            quantity: p.quantity || 1,
          })))
        );

        setSystemTemplate({
          ...detectedTemplate,
          requirements: updatedRequirements,
        });
      } else {
        console.log('[Requirements] No template detected for chat type:', selectedChat);
      }
    } else {
      setSystemTemplate(null);
    }
  }, [quoteProducts, selectedChat, participantCount]);

  const handleRequirementClick = async (requirement: SystemRequirement) => {
    // When user clicks a missing requirement, ask AI to show products for it
    // This could send a message to the chat interface
    console.log('User clicked requirement:', requirement.name);
    // TODO: Integrate with ChatInterface to send search query
  };

  // Extract participant count from chat messages
  const handleMessageUpdate = (messages: Array<{role: string; content: string}>) => {
    // Look for participant count in user messages
    const allText = messages.map(m => m.content).join(' ');
    const participantMatch = allText.match(/(\d+)\s*(?:people|person|participants|attendees|seats)/i);
    if (participantMatch) {
      const count = parseInt(participantMatch[1]);
      if (count !== participantCount) {
        console.log('[Participants] Detected:', count);
        setParticipantCount(count);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100">
      {/* Left Sidebar - Chat Types */}
      <ChatSidebar
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
      />

      {/* Center - Chat Interface with System Requirements at bottom */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ChatInterface
            chatType={selectedChat}
            onAddProduct={addProductToQuote}
            onSwitchTab={setSelectedChat}
            currentQuote={quoteProducts}
            systemTemplate={systemTemplate}
            onMessagesUpdate={handleMessageUpdate}
          />
        </div>

        {/* System Requirements Panel - always at bottom of chat area, never overlapping */}
        {systemTemplate && (
          <div className="border-t border-gray-200 p-4 bg-white shadow-lg max-h-72 overflow-y-auto flex-shrink-0">
            <SystemRequirements
              systemTemplate={systemTemplate}
              onRequirementClick={handleRequirementClick}
            />
          </div>
        )}
      </div>

      {/* Right - Quote Box is now position: fixed in QuoteBox.tsx */}
      <div className="w-96 flex-shrink-0"></div> {/* Spacer for fixed quote box */}
      <QuoteBox
        products={quoteProducts}
        onUpdateQuantity={updateProductQuantity}
        onRemoveProduct={removeProductFromQuote}
      />
    </div>
  );
}
