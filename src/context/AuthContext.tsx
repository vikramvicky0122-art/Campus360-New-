import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, StudentVerification } from '../types/index.ts';
import { api } from '../services/api.ts';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient.ts';

export interface DemoUserOption {
  id: string;
  name: string;
  email: string;
  roll: string;
  role: 'user' | 'admin';
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  badgeColor: string;
}

export const DEMO_USERS: DemoUserOption[] = [
  {
    id: 'user-aarav',
    name: 'Aarav Patel',
    email: 'aarav.patel@esec.ac.in',
    roll: '2023CS1042',
    role: 'user',
    status: 'VERIFIED',
    badgeColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'user-neha',
    name: 'Neha Sharma',
    email: 'neha.sharma@esec.ac.in',
    roll: '2022EC1099',
    role: 'user',
    status: 'VERIFIED',
    badgeColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 'user-dev',
    name: 'Dev Malhotra',
    email: 'dev.malhotra@esec.ac.in',
    roll: '2024ME2045',
    role: 'user',
    status: 'PENDING',
    badgeColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 'user-rohan',
    name: 'Rohan Das',
    email: 'rohan.das@esec.ac.in',
    roll: '2021EE1008',
    role: 'user',
    status: 'REJECTED',
    badgeColor: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
  },
  {
    id: 'user-admin',
    name: 'Campus Administrator',
    email: 'admin@Campus360.edu',
    roll: 'ADMIN-001',
    role: 'admin',
    status: 'VERIFIED',
    badgeColor: 'text-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
];

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  activeRole: 'user' | 'admin';
  isLoginScreenOpen: boolean;
  openLoginScreen: () => void;
  closeLoginScreen: () => void;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    institutionId: string;
    department: string;
    yearOfStudy: number;
    rollNumber: string;
    password?: string;
  }) => Promise<{ success: boolean; message: string }>;
  switchUser: (userId: string) => Promise<void>;
  submitVerification: (rollNumber: string, documentUrl: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  verification: StudentVerification | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [verification, setVerification] = useState<StudentVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginScreenOpen, setIsLoginScreenOpen] = useState(false);

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.profile) {
        api.setUserProfile(res.profile);
        setUser(res.profile);
        const verifRes = await api.getVerificationStatus();
        if (verifRes.success) {
          setVerification(verifRes.verification);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    if (isSupabaseConfigured() && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setVerification(null);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.login(email, password);
      if (res.success && res.profile) {
        api.setUserProfile(res.profile);
        setUser(res.profile);
        setIsLoginScreenOpen(false);
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setVerification(null);
    await api.logout();
    setIsLoginScreenOpen(true);
  };

  const register = async (data: {
    fullName: string;
    email: string;
    phone: string;
    institutionId: string;
    department: string;
    yearOfStudy: number;
    rollNumber: string;
    password?: string;
  }) => {
    try {
      const res = await api.register(data);
      // Pending accounts are awaiting approval and must not be set as logged-in user
      return res;
    } catch (err: any) {
      throw err;
    }
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    const demo = DEMO_USERS.find(u => u.id === userId);
    if (demo) {
      api.setUserProfile({
        id: demo.id,
        fullName: demo.name,
        email: demo.email,
        rollNumber: demo.roll,
        role: demo.role,
        isVerified: demo.status === 'VERIFIED',
      });
    } else {
      api.setUserId(userId);
    }
    setIsLoginScreenOpen(false);
    await refreshUser();
  };

  const submitVerification = async (rollNumber: string, documentUrl: string) => {
    try {
      const res = await api.submitVerification({ rollNumber, documentUrl });
      if (res.success) {
        setVerification(res.verification);
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeRole: user?.role === 'admin' ? 'admin' : 'user',
        isLoginScreenOpen,
        openLoginScreen: () => setIsLoginScreenOpen(true),
        closeLoginScreen: () => setIsLoginScreenOpen(false),
        login,
        logout,
        register,
        switchUser,
        submitVerification,
        refreshUser,
        verification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
