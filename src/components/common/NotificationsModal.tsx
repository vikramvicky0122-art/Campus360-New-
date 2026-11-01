import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext.tsx';
import { api } from '../../services/api.ts';
import { X, Bell, CheckCheck, ShieldCheck, ShoppingBag, CreditCard, MessageSquare } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { notifications, refreshNotifications } = useMarketplace();

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'VERIFICATION':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-blue-500" />;
      case 'PAYMENT':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campus Alerts</h3>
              <p className="text-[10px] text-slate-500">Orders, verification & payment updates</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAllRead}
              className="p-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No new alerts at this time.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-2xl border transition text-left space-y-1 ${
                  !n.isRead
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    {getIcon(n.type)}
                    <span>{n.title}</span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
