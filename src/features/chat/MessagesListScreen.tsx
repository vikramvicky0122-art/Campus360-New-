import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { MessageSquare, ShieldCheck, ChevronRight } from 'lucide-react';

export const MessagesListScreen: React.FC = () => {
  const { conversations, openChatConversation } = useMarketplace();

  return (
    <div className="pb-8 space-y-3">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Campus Conversations
        </h2>
        <p className="text-xs text-slate-500">Coordinate handovers directly with student buyers & sellers</p>
      </div>

      <div className="px-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No active chats</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              When you inquire about a product or another student asks about your listing, messages will appear here.
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => openChatConversation(conv.id)}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center gap-3"
            >
              <img
                src={conv.productImage}
                alt={conv.productTitle}
                className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                    <span>{conv.sellerName}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                  {conv.productTitle} · ₹{conv.productPrice}
                </div>

                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {conv.lastMessageText}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
