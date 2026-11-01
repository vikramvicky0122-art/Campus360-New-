import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import { Conversation, Message } from '../../types/index.ts';
import {
  X,
  Send,
  ChevronLeft,
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const ChatConversationModal: React.FC = () => {
  const { user } = useAuth();
  const { activeConversationId, closeChatConversation, refreshConversations } = useMarketplace();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async () => {
    if (!activeConversationId) return;
    try {
      const res = await api.getMessages(activeConversationId);
      if (res.success) {
        setConversation(res.conversation);
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    fetchChat();
    // Poll messages every 3 seconds for simulated realtime
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeConversationId) return null;

  const counterpartName =
    user?.id === conversation?.buyerId ? conversation?.sellerName : conversation?.buyerName;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await api.sendMessage(activeConversationId, text.trim());
      if (res.success) {
        setMessages((prev) => [...prev, res.message]);
        setInputMessage('');
        await refreshConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    'Can we meet at Central Library ground floor?',
    'Is the price negotiable?',
    'I have arrived at the canteen entrance.',
    'Payment confirmed via YouPI-PG!',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={closeChatConversation}
              className="p-1 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>{counterpartName || 'Student Chat'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-[10px] text-slate-500">College Verified Student</div>
            </div>
          </div>

          <button
            onClick={closeChatConversation}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Inquired Strip */}
        {conversation && (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={conversation.productImage}
                alt={conversation.productTitle}
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  {conversation.productTitle}
                </div>
                <div className="text-[10px] text-slate-500">₹{conversation.productPrice}</div>
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {messages.map((m) => {
            const isMe = m.senderId === user?.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs shadow-emerald-500/10'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {m.messageText}
                </div>
                <span className="text-[9px] text-slate-400 px-1 mt-0.5">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message or campus meeting spot..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
