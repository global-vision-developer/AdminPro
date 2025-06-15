"use client";

import type { UserProfile } from '@/types';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import React, { createContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, name?: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: Record<string, UserProfile> = {
  'super@example.com': {
    id: 'user-super',
    name: 'Super Admin User',
    email: 'super@example.com',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://placehold.co/100x100.png?text=SA',
  },
  'sub@example.com': {
    id: 'user-sub',
    name: 'Sub Admin User',
    email: 'sub@example.com',
    role: UserRole.SUB_ADMIN,
    avatar: 'https://placehold.co/100x100.png?text=SU',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking for a logged-in user from localStorage or a cookie
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      localStorage.removeItem('currentUser');
    }
    setLoading(false);
  }, []);

  const login = useCallback((email: string, name?: string) => {
    const user = mockUsers[email.toLowerCase()];
    if (user) {
      const userToStore = name ? { ...user, name } : user;
      setCurrentUser(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      router.push('/admin/dashboard');
    } else {
      // For demo, create a new Sub Admin if not a mock user
      const newSubAdmin: UserProfile = {
        id: `user-${Date.now()}`,
        name: name || `User ${email.split('@')[0]}`,
        email: email,
        role: UserRole.SUB_ADMIN,
        avatar: `https://placehold.co/100x100.png?text=${name ? name.substring(0,2).toUpperCase() : email.substring(0,2).toUpperCase()}`,
      };
      mockUsers[email.toLowerCase()] = newSubAdmin; // Add to mock users for this session
      setCurrentUser(newSubAdmin);
      localStorage.setItem('currentUser', JSON.stringify(newSubAdmin));
      router.push('/admin/dashboard');
    }
  }, [router]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    router.push('/');
  }, [router]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
