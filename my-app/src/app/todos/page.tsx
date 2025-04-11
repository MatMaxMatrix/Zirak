"use client";

import React, { useEffect } from 'react';
import TodoComponent from '@/components/Todo';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function TodosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }
  
  // Don't render content until we confirm user is authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-white">Todo Management</h1>
      <div className="bg-black border border-gray-800 shadow-md rounded-lg p-6">
        <TodoComponent />
      </div>
    </div>
  );
} 