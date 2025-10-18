'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatType, Product } from '@/app/chat/page';
import { Send, Mic, Paperclip, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  products?: Product[];
  feedback?: 'positive' | 'negative' | null;
}

interface SystemTemplate {
  id: string;
  name: string;
  requirements: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface ChatInterfaceProps {
  chatType: ChatType;
  onAddProduct: (product: Product) => void;
  onSwitchTab: (chatType: ChatType) => void;
  currentQuote: Product[];
  systemTemplate?: SystemTemplate | null;
  onMessagesUpdate?: (messages: Array<{role: string; content: string}>) => void;
}

export default function ChatInterface({ chatType, onAddProduct, onSwitchTab, currentQuote, systemTemplate, onMessagesUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [previousQuoteCount, setPreviousQuoteCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatTitles: Record<ChatType, string> = {
    home: 'Home Audio Assistant',
    business: 'Business AV Consultant',
    restaurant: 'Restaurant Sound Expert',
    gym: 'Gym Audio Specialist',
    worship: 'Worship Sound Designer',
    education: 'Education AV Consultant',
    club: 'Club Sound Expert',
    tender: 'Tender Specification Assistant',
  };

  useEffect(() => {
    // Reset conversation when chat type changes
    setConversationId(null);
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hi! I'm your ${chatTitles[chatType]}. How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  }, [chatType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Notify parent of message updates for participant extraction
    if (onMessagesUpdate && messages.length > 0) {
      onMessagesUpdate(messages.map(m => ({ role: m.role, content: m.content })));
    }
  }, [messages, onMessagesUpdate]);

  // Detect when products are added to quote and trigger AI follow-up
  useEffect(() => {
    const quoteCount = currentQuote.reduce((sum, p) => sum + (p.quantity || 1), 0);

    // If quote count increased and we're not currently loading
    if (quoteCount > previousQuoteCount && !isLoading && messages.length > 1) {
      const lastAddedProduct = currentQuote[currentQuote.length - 1];

      // Trigger automatic follow-up message
      setTimeout(() => {
        const quoteContext = currentQuote.map(p =>
          `${p.name} (${p.quantity || 1}x)`
        ).join(', ');

        sendMessage(`[SYSTEM: Customer just added ${lastAddedProduct.name} to quote. Current quote: ${quoteContext}. Acknowledge their choice and guide them to the next component they need.]`, true);
      }, 500);
    }

    setPreviousQuoteCount(quoteCount);
  }, [currentQuote]);

  const sendMessage = async (systemMessage?: string, isAutoTrigger = false) => {
    const messageContent = systemMessage || input;
    if (!messageContent.trim() || isLoading) return;

    // Only show user message in UI if it's not a system trigger
    let userMessage: Message | null = null;
    if (!isAutoTrigger) {
      userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    const currentInput = messageContent;
    if (!isAutoTrigger) setInput('');
    setIsLoading(true);

    try {
      // Build system requirements context
      let systemReq = undefined;
      if (systemTemplate && currentQuote.length > 0) {
        const critical = systemTemplate.requirements.filter(r => r.status === 'critical').map(r => r.name);
        const missing = systemTemplate.requirements.filter(r => r.status === 'missing').map(r => r.name);
        const partial = systemTemplate.requirements.filter(r => r.status === 'partial').map(r => r.name);

        systemReq = {
          templateName: systemTemplate.name,
          critical,
          missing,
          partial,
        };
      }

      // Call server-side chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: currentInput },
          ],
          conversationId: conversationId,
          chatType: chatType,
          currentQuote: currentQuote.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            quantity: p.quantity,
          })),
          systemRequirements: systemReq,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat request failed');
      }

      const data = await response.json();

      // Update conversation ID if new
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Create assistant message with products
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'No response',
        timestamp: new Date(),
        products: data.products || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Please try again.';
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errMsg}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle feedback (thumbs up/down)
  const handleFeedback = async (messageId: string, feedbackType: 'positive' | 'negative') => {
    // Update local state
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
    ));

    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    const messageIndex = messages.findIndex(m => m.id === messageId);

    // Track product engagement when feedback is given
    if (message.products && message.products.length > 0) {
      message.products.forEach((product, idx) => {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'product_action',
            data: {
              conversation_id: conversationId || 'unknown',
              message_index: messageIndex,
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              product_price: product.price,
              action_type: 'shown',
              chat_type: chatType,
              position_in_list: idx + 1,
              user_session: typeof window !== 'undefined' ? window.sessionStorage.getItem('user_session') : null,
            },
          }),
        }).catch(err => console.error('[Feedback] Product action error:', err));
      });
    }

    // Send message feedback
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message_feedback',
          data: {
            conversation_id: conversationId || 'unknown',
            message_index: messageIndex,
            message_content: message.content,
            feedback_type: feedbackType,
            chat_type: chatType,
            user_session: typeof window !== 'undefined' ? window.sessionStorage.getItem('user_session') : null,
          },
        }),
      });
    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur-md px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-xl font-semibold text-gray-800">
              {chatTitles[chatType]}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles className="w-4 h-4" />
            <span>AI Powered</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Product suggestions in message */}
              {message.products && message.products.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold mb-2 text-gray-600">
                    Suggested Products:
                  </p>
                  <div className="space-y-2">
                    {message.products.map((product, productIdx) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-gray-100"
                        onClick={() => {
                          onAddProduct(product);

                          // Track product added
                          const messageIndex = messages.findIndex(m => m.id === message.id);
                          fetch('/api/feedback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'product_action',
                              data: {
                                conversation_id: conversationId || 'unknown',
                                message_index: messageIndex,
                                product_id: product.id,
                                product_name: product.name,
                                product_sku: product.sku,
                                product_price: product.price,
                                action_type: 'added',
                                chat_type: chatType,
                                position_in_list: productIdx + 1,
                                user_session: typeof window !== 'undefined' ? window.sessionStorage.getItem('user_session') : null,
                              },
                            }),
                          }).catch(err => console.error('[Feedback] Product added error:', err));
                        }}
                      >
                        {/* Product thumbnail */}
                        {product.image && (
                          <div className="relative w-10 h-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">
                            {product.name}
                          </div>
                          <div className="text-xs font-semibold text-purple-600">
                            R{product.price.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-purple-600 text-lg flex-shrink-0">+</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp and Feedback buttons */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>

                {/* Feedback buttons (only for assistant messages) */}
                {message.role === 'assistant' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFeedback(message.id, 'positive')}
                      className={`p-1 rounded-full transition-all ${
                        message.feedback === 'positive'
                          ? 'bg-green-100 text-green-600'
                          : 'hover:bg-gray-100 text-gray-400 hover:text-green-600'
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, 'negative')}
                      className={`p-1 rounded-full transition-all ${
                        message.feedback === 'negative'
                          ? 'bg-red-100 text-red-600'
                          : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
                      }`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-md border border-gray-200">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white/90 backdrop-blur-md px-6 py-4">
        <div className="flex items-end gap-3">
          <button className="p-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full px-5 py-3 pr-12 rounded-2xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none resize-none transition-all"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />
          </div>

          <button className="p-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
            <Mic className="w-5 h-5" />
          </button>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
