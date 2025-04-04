'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getSupabase } from '@/utils/supabase';

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  user_id: string;
  created_at: string;
};

export default function TodoList() {
  const { user, isLoading: isUserLoading } = useUser();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load todos when user is authenticated
  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user) {
      setIsLoading(false);
      setError('Please log in to manage your todos');
      return;
    }
    
    fetchTodos();
  }, [user, isUserLoading]);

  // Fetch todos from Supabase
  const fetchTodos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get Supabase client with Auth0 token
      const supabase = getSupabase(user?.accessToken as string | undefined);
      
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching todos:', error);
        setError(`Failed to load todos: ${error.message}`);
        return;
      }
      
      setTodos(data || []);
    } catch (err) {
      console.error('Exception fetching todos:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;
    
    try {
      const supabase = getSupabase(user.accessToken as string | undefined);
      
      const { error } = await supabase
        .from('todos')
        .insert([{ 
          title: newTodo.trim(),
          completed: false,
          user_id: user.sub
        }]);
      
      if (error) {
        console.error('Error adding todo:', error);
        setError(`Failed to add todo: ${error.message}`);
        return;
      }
      
      setNewTodo('');
      fetchTodos();
    } catch (err) {
      console.error('Exception adding todo:', err);
      setError('Failed to add todo');
    }
  };

  // Toggle todo completion status
  const toggleTodo = async (id: number, completed: boolean) => {
    if (!user) return;
    
    try {
      const supabase = getSupabase(user.accessToken as string | undefined);
      
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating todo:', error);
        setError(`Failed to update todo: ${error.message}`);
        return;
      }
      
      fetchTodos();
    } catch (err) {
      console.error('Exception updating todo:', err);
      setError('Failed to update todo');
    }
  };

  // Delete a todo
  const deleteTodo = async (id: number) => {
    if (!user) return;
    
    try {
      const supabase = getSupabase(user.accessToken as string | undefined);
      
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting todo:', error);
        setError(`Failed to delete todo: ${error.message}`);
        return;
      }
      
      fetchTodos();
    } catch (err) {
      console.error('Exception deleting todo:', err);
      setError('Failed to delete todo');
    }
  };

  if (isUserLoading) {
    return <div className="p-4">Loading user information...</div>;
  }

  if (!user) {
    return <div className="p-4">Please log in to manage your todos.</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Todo List</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={addTodo} className="mb-4 flex">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-grow px-3 py-2 border rounded-l focus:outline-none"
        />
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
        >
          Add
        </button>
      </form>
      
      {isLoading ? (
        <div className="text-center py-4">Loading todos...</div>
      ) : (
        <ul className="space-y-2">
          {todos.length === 0 ? (
            <li className="text-gray-500">No todos yet. Add one above!</li>
          ) : (
            todos.map((todo) => (
              <li 
                key={todo.id} 
                className="flex items-center justify-between p-3 border rounded"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                    className="mr-2"
                  />
                  <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                    {todo.title}
                  </span>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
} 