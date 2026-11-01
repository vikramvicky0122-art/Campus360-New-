import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext.tsx';
import { MobileShell } from './components/layout/MobileShell.tsx';

// Screens
import { HomeScreen } from './features/marketplace/HomeScreen.tsx';
import { MarketplaceScreen } from './features/marketplace/MarketplaceScreen.tsx';
import { OrdersScreen } from './features/orders/OrdersScreen.tsx';
import { MessagesListScreen } from './features/chat/MessagesListScreen.tsx';
import { ProfileScreen } from './features/profile/ProfileScreen.tsx';

// Admin Screens
import { AdminDashboard } from './features/admin/AdminDashboard.tsx';
import { VerificationQueueScreen } from './features/admin/VerificationQueueScreen.tsx';
import { UserManagementScreen } from './features/admin/UserManagementScreen.tsx';
import { ProductModerationScreen } from './features/admin/ProductModerationScreen.tsx';
import { OrderPaymentLedgerScreen } from './features/admin/OrderPaymentLedgerScreen.tsx';
import { PlatformSettingsScreen } from './features/admin/PlatformSettingsScreen.tsx';

// Modals
import { ProductDetailsModal } from './features/marketplace/ProductDetailsModal.tsx';
import { CheckoutModal } from './features/orders/CheckoutModal.tsx';
import { YouPiPaymentModal } from './features/orders/YouPiPaymentModal.tsx';
import { PaymentStatusModal } from './features/orders/PaymentStatusModal.tsx';
import { AddProductModal } from './features/marketplace/AddProductModal.tsx';
import { StudentVerificationModal } from './features/auth/StudentVerificationModal.tsx';
import { RegisterModal } from './features/auth/RegisterModal.tsx';
import { ChatConversationModal } from './features/chat/ChatConversationModal.tsx';
import { NotificationsModal } from './components/common/NotificationsModal.tsx';
import { ExpoSourceViewerModal } from './features/expo/ExpoSourceViewerModal.tsx';
import { LoginScreen } from './features/auth/LoginScreen.tsx';
import { ForgotPasswordModal } from './features/auth/ForgotPasswordModal.tsx';
import { RazorpayCheckoutModal } from './features/orders/RazorpayCheckoutModal.tsx';

function MainAppContent() {
  const { activeTab } = useMarketplace();
  const { user, isLoginScreenOpen, closeLoginScreen } = useAuth();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const { isVerificationModalOpen, closeVerificationModal } = useMarketplace();

  // Show login screen if user is not logged in and not in guest mode, or if login screen was requested
  const shouldShowLogin = (!user && !isGuestMode) || isLoginScreenOpen;

  // Route selector
  const renderTabContent = () => {
    if (shouldShowLogin) {
      return (
        <LoginScreen
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
          onContinueAsGuest={() => {
            setIsGuestMode(true);
            closeLoginScreen();
          }}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'marketplace':
        return <MarketplaceScreen />;
      case 'orders':
        return <OrdersScreen />;
      case 'messages':
        return <MessagesListScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'admin_dashboard':
        return <AdminDashboard />;
      case 'admin_verifications':
        return <VerificationQueueScreen />;
      case 'admin_users':
        return <UserManagementScreen />;
      case 'admin_moderation':
        return <ProductModerationScreen />;
      case 'admin_payments':
        return <OrderPaymentLedgerScreen />;
      case 'admin_settings':
        return <PlatformSettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 100% Full-Screen Android Application Shell */}
      <MobileShell
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
      >
        {renderTabContent()}
      </MobileShell>

      {/* Global Interactive Modals */}
      <ProductDetailsModal />
      <CheckoutModal />
      <RazorpayCheckoutModal />
      <YouPiPaymentModal />
      <PaymentStatusModal />
      <AddProductModal />
      <StudentVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={closeVerificationModal}
      />
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
      <ChatConversationModal />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <ExpoSourceViewerModal />
    </div>
  );
}

import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MarketplaceProvider>
          <MainAppContent />
        </MarketplaceProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
