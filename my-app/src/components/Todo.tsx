'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash, RefreshCw, CheckCircle, ListTodo } from 'lucide-react';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function TodoComponent() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  
  // Fetch todos
  const fetchTodos = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      setTodos(data || []);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
      toast.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };
  
  // Add a new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!newTodoTitle.trim()) {
      toast.error('Please enter a todo');
      return;
    }
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .insert([
          {
            title: newTodoTitle.trim(),
            completed: false,
            user_id: user.id,
          }
        ])
        .select();
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      if (data && data.length > 0) {
        setTodos([data[0], ...todos]);
        setNewTodoTitle('');
        toast.success('Todo added');
      }
    } catch (err) {
      console.error('Error adding todo:', err);
      toast.error('Failed to add todo');
    }
  };
  
  // Toggle todo completion status
  const toggleTodo = async (id: number, currentStatus: boolean) => {
    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .update({ completed: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      setTodos(todos.map((todo) => 
        todo.id === id ? { ...todo, completed: !currentStatus } : todo
      ));
      
      toast.success(`Todo marked as ${!currentStatus ? 'completed' : 'incomplete'}`);
    } catch (err) {
      console.error('Error updating todo:', err);
      toast.error('Failed to update todo');
    }
  };
  
  // Delete a todo
  const deleteTodo = async (id: number) => {
    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      setTodos(todos.filter((todo) => todo.id !== id));
      toast.success('Todo deleted');
    } catch (err) {
      console.error('Error deleting todo:', err);
      toast.error('Failed to delete todo');
    }
  };
  
  // Load todos on component mount
  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user]);
  
  // Listen for real-time updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('todos_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'todos',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Change received!', payload);
          fetchTodos();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>Please sign in to manage your todos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>You need to be signed in to view and manage your todos</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Todo List</CardTitle>
        <CardDescription>
          Manage your daily tasks and track your progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={addTodo} className="flex space-x-2 mb-6">
          <Input
            placeholder="Add a new todo..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </form>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-800">
            {error}
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No todos yet</p>
            <p className="text-sm">Add your first todo to get started</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {todos.map((todo) => (
              <li 
                key={todo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                    id={`todo-${todo.id}`}
                  />
                  <label 
                    htmlFor={`todo-${todo.id}`}
                    className={`text-sm ${todo.completed ? 'line-through text-gray-400' : ''}`}
                  >
                    {todo.title}
                  </label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        
        {todos.length > 0 && !loading && (
          <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <span>
              {todos.filter(t => t.completed).length} of {todos.length} completed
            </span>
            {todos.filter(t => t.completed).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const completedIds = todos
                    .filter(t => t.completed)
                    .map(t => t.id);
                  
                  try {
                    const { error } = await supabase
                      .from('todos')
                      .delete()
                      .in('id', completedIds);
                      
                    if (error) throw error;
                    
                    setTodos(todos.filter(t => !t.completed));
                    toast.success('Completed todos cleared');
                  } catch (err) {
                    console.error('Error clearing completed todos:', err);
                    toast.error('Failed to clear completed todos');
                  }
                }}
              >
                <Trash className="h-3 w-3 mr-1" />
                Clear completed
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}