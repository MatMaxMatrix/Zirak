'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  user_id: string;
  created_at: string;
};

export default function TodoList() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch todos on component mount
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTodos = async () => {
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching todos:', error);
          setError(`Failed to fetch todos: ${error.message}`);
          return;
        }

        setTodos(data || []);
      } catch (err) {
        console.error('Exception fetching todos:', err);
        setError('Failed to fetch todos');
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, [user, isUserLoading, supabase]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Add a new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            title: newTodo.trim(),
            completed: false,
            user_id: user.id,
          },
        ])
        .select();

      if (error) {
        console.error('Error adding todo:', error);
        setError(`Failed to add todo: ${error.message}`);
        return;
      }

      setTodos([data[0], ...todos]);
      setNewTodo('');
      toast.success('Todo added successfully');
    } catch (err) {
      console.error('Exception adding todo:', err);
      setError('Failed to add todo');
    }
  };

  // Toggle todo completion status
  const toggleTodo = async (id: number, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id)
        .eq('user_id', user?.id); // Security: ensure the todo belongs to the user

      if (error) {
        console.error('Error updating todo:', error);
        setError(`Failed to update todo: ${error.message}`);
        return;
      }

      setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !completed } : todo));
      toast.success(completed ? 'Todo marked as pending' : 'Todo completed');
    } catch (err) {
      console.error('Exception updating todo:', err);
      setError('Failed to update todo');
    }
  };

  // Delete a todo
  const deleteTodo = async (id: number) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Security: ensure the todo belongs to the user

      if (error) {
        console.error('Error deleting todo:', error);
        setError(`Failed to delete todo: ${error.message}`);
        return;
      }

      setTodos(todos.filter(todo => todo.id !== id));
      toast.success('Todo deleted successfully');
    } catch (err) {
      console.error('Exception deleting todo:', err);
      setError('Failed to delete todo');
    }
  };

  if (isUserLoading || (loading && user)) {
    return <div className="flex justify-center p-8">Loading todos...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">Please log in to manage your todos.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">My Todo List</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={addTodo} className="mb-4 flex">
        <input
          type="text"
          className="flex-grow px-4 py-2 border rounded-l focus:outline-none"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 focus:outline-none"
          disabled={!newTodo.trim()}
        >
          Add
        </button>
      </form>
      
      {todos.length === 0 ? (
        <p className="text-center text-gray-500">No todos yet. Add one above!</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center justify-between p-3 bg-white shadow rounded"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-3 h-5 w-5 text-blue-500"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                  {todo.title}
                </span>
              </div>
              <button
                className="text-red-500 hover:text-red-700"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 