'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/pocketbase';
import type { User } from '@/types';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Refresh auth token if possible
      await auth.refresh();
      
      // Get current user
      const currentUser = auth.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // No user found, redirect to login
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Auth failed, redirect to login
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

export default AuthGuard;