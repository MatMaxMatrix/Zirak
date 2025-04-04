import TodoList from '@/components/Todo';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export default async function TodosPage() {
  // Check if user is authenticated server-side
  const session = await getSession();
  
  // If not authenticated, redirect to login
  if (!session?.user) {
    redirect('/api/auth/login?returnTo=/todos');
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Todo Management</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <TodoList />
      </div>
    </div>
  );
} 