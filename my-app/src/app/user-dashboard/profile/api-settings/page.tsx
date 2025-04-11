"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import crypto from 'crypto';

// Store key provider constants
const OPENAI_KEY_PROVIDER = 'openai';
const ANTHROPIC_KEY_PROVIDER = 'anthropic';

export default function ApiSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State for OpenAI
  const [openaiKey, setOpenaiKey] = useState("");
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [isSavingOpenai, setIsSavingOpenai] = useState(false);
  const [isEditingOpenai, setIsEditingOpenai] = useState(false);
  
  // State for Anthropic
  const [anthropicKey, setAnthropicKey] = useState("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [isSavingAnthropic, setIsSavingAnthropic] = useState(false);
  const [isEditingAnthropic, setIsEditingAnthropic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to generate hash and prefix
  const generateHashAndPrefix = (key) => {
    if (!key) return { hashedKey: '', prefix: '' };
    
    // Create a hash of the API key for secure storage
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    
    // Get the first 8 chars of the API key to use as an identifier
    const prefix = key.substring(0, 8);
    
    return { hashedKey, prefix };
  };

  // Fetch user's API keys on component mount
  useEffect(() => {
    const fetchApiKeys = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        // Check if user has API keys for each provider
        const openaiKeyData = data?.find(key => key.key_name === OPENAI_KEY_PROVIDER);
        const anthropicKeyData = data?.find(key => key.key_name === ANTHROPIC_KEY_PROVIDER);

        // If keys exist, set the UI state to show masked versions
        if (openaiKeyData) {
          setOpenaiKey(`${openaiKeyData.key_prefix}${'*'.repeat(24)}`);
          setHasOpenaiKey(true);
        }

        if (anthropicKeyData) {
          setAnthropicKey(`${anthropicKeyData.key_prefix}${'*'.repeat(24)}`);
          setHasAnthropicKey(true);
        }
      } catch (error) {
        console.error('Error fetching API keys:', error);
        toast.error('Failed to load your API keys');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeys();
  }, [user]);

  // Function to store API key in Supabase
  const storeKey = async (provider, apiKey) => {
    if (!user) {
      toast.error('You must be logged in to save API keys');
      return;
    }

    try {
      const { hashedKey, prefix } = generateHashAndPrefix(apiKey);
      const supabase = createClient();
      
      // Check if key already exists
      const { data, error: fetchError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('key_name', provider)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      // Prepare the key data
      const keyData = {
        user_id: user.id,
        key_name: provider,
        key_prefix: prefix,
        hashed_key: hashedKey,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null, // You could set an expiration if needed
      };
      
      if (data) {
        // Update existing key
        const { error: updateError } = await supabase
          .from('api_keys')
          .update({
            key_prefix: prefix,
            hashed_key: hashedKey,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
      } else {
        // Insert new key
        const { error: insertError } = await supabase
          .from('api_keys')
          .insert([keyData]);
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error(`Error saving ${provider} API key:`, error);
      toast.error(`Failed to save ${provider} API key`);
      throw error;
    }
  };

  // Function to remove API key from Supabase
  const removeKey = async (provider) => {
    if (!user) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('key_name', provider);
        
      if (error) throw error;
    } catch (error) {
      console.error(`Error removing ${provider} API key:`, error);
      toast.error(`Failed to remove ${provider} API key`);
      throw error;
    }
  };

  // Save OpenAI API key
  const handleSaveOpenaiKey = async () => {
    if (!openaiKey.trim()) {
      toast.error("Please enter a valid OpenAI API key");
      return;
    }

    setIsSavingOpenai(true);
    
    try {
      await storeKey(OPENAI_KEY_PROVIDER, openaiKey);
      toast.success("OpenAI API key saved successfully");
      setHasOpenaiKey(true);
      setIsEditingOpenai(false);
      
      // Mask the key after saving
      const maskedKey = `${openaiKey.substring(0, 8)}${'*'.repeat(24)}`;
      setOpenaiKey(maskedKey);
    } catch (error) {
      // Error already handled in storeKey
    } finally {
      setIsSavingOpenai(false);
    }
  };

  // Save Anthropic API key
  const handleSaveAnthropicKey = async () => {
    if (!anthropicKey.trim()) {
      toast.error("Please enter a valid Anthropic API key");
      return;
    }

    setIsSavingAnthropic(true);
    
    try {
      await storeKey(ANTHROPIC_KEY_PROVIDER, anthropicKey);
      toast.success("Anthropic API key saved successfully");
      setHasAnthropicKey(true);
      setIsEditingAnthropic(false);
      
      // Mask the key after saving
      const maskedKey = `${anthropicKey.substring(0, 8)}${'*'.repeat(24)}`;
      setAnthropicKey(maskedKey);
    } catch (error) {
      // Error already handled in storeKey
    } finally {
      setIsSavingAnthropic(false);
    }
  };

  // Remove OpenAI API key
  const handleRemoveOpenaiKey = async () => {
    try {
      await removeKey(OPENAI_KEY_PROVIDER);
      setOpenaiKey("");
      setHasOpenaiKey(false);
      setIsEditingOpenai(true);
      toast.success("OpenAI API key removed");
    } catch (error) {
      // Error already handled in removeKey
    }
  };

  // Remove Anthropic API key
  const handleRemoveAnthropicKey = async () => {
    try {
      await removeKey(ANTHROPIC_KEY_PROVIDER);
      setAnthropicKey("");
      setHasAnthropicKey(false);
      setIsEditingAnthropic(true);
      toast.success("Anthropic API key removed");
    } catch (error) {
      // Error already handled in removeKey
    }
  };

  // Handle editing OpenAI key
  const handleEditOpenai = () => {
    setOpenaiKey("");
    setIsEditingOpenai(true);
    setHasOpenaiKey(false);
  };

  // Handle editing Anthropic key
  const handleEditAnthropic = () => {
    setAnthropicKey("");
    setIsEditingAnthropic(true);
    setHasAnthropicKey(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Settings</h1>
        <p className="text-muted-foreground">
          Manage your API keys for AI services
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Security Note</AlertTitle>
        <AlertDescription>
          Your API keys are securely stored with only partial information visible.
          The full keys are never exposed in your browser.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="openai" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="anthropic">Anthropic Claude</TabsTrigger>
        </TabsList>
        
        {/* OpenAI Tab Content */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2 text-emerald-500" />
                    OpenAI API Key
                  </CardTitle>
                  <CardDescription>
                    Configure your OpenAI API key to use GPT models
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="openaiKey" className="text-sm font-medium">
                    {hasOpenaiKey ? "Your OpenAI API Key" : "Enter Your OpenAI API Key"}
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id="openaiKey"
                        type={hasOpenaiKey || !isEditingOpenai ? "password" : "text"}
                        placeholder={hasOpenaiKey ? "API key is stored securely" : "sk-..."}
                        value={openaiKey}
                        onChange={(e) => {
                          setOpenaiKey(e.target.value);
                        }}
                        className="pr-10"
                        disabled={hasOpenaiKey && !isEditingOpenai}
                      />
                    </div>
                    {hasOpenaiKey ? (
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={handleEditOpenai}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={handleRemoveOpenaiKey}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleSaveOpenaiKey} disabled={!openaiKey.trim() || isSavingOpenai}>
                        {isSavingOpenai ? "Saving..." : "Save Key"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasOpenaiKey 
                      ? "You have an OpenAI API key configured. You can update or remove it above." 
                      : "You need an OpenAI API key to use GPT models in our app."}
                  </p>
                </div>

                {hasOpenaiKey && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    OpenAI API key is configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Anthropic Tab Content */}
        <TabsContent value="anthropic">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Key className="h-5 w-5 mr-2 text-purple-500" />
                    Anthropic API Key
                  </CardTitle>
                  <CardDescription>
                    Configure your Anthropic API key to use Claude models
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="anthropicKey" className="text-sm font-medium">
                    {hasAnthropicKey ? "Your Anthropic API Key" : "Enter Your Anthropic API Key"}
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Input
                        id="anthropicKey"
                        type={hasAnthropicKey || !isEditingAnthropic ? "password" : "text"}
                        placeholder={hasAnthropicKey ? "API key is stored securely" : "sk_ant-..."}
                        value={anthropicKey}
                        onChange={(e) => {
                          setAnthropicKey(e.target.value);
                        }}
                        className="pr-10"
                        disabled={hasAnthropicKey && !isEditingAnthropic}
                      />
                    </div>
                    {hasAnthropicKey ? (
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={handleEditAnthropic}>
                          Edit
                        </Button>
                        <Button variant="destructive" onClick={handleRemoveAnthropicKey}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleSaveAnthropicKey} 
                        disabled={!anthropicKey.trim() || isSavingAnthropic}
                        className="bg-purple-600 hover:bg-purple-700">
                        {isSavingAnthropic ? "Saving..." : "Save Key"}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {hasAnthropicKey 
                      ? "You have an Anthropic API key configured. You can update or remove it above." 
                      : "You need an Anthropic API key to use Claude models in our app."}
                  </p>
                </div>

                {hasAnthropicKey && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Anthropic API key is configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CardFooter className="flex justify-between border-t pt-6 px-0">
        <Button variant="outline" onClick={() => router.push("/user-dashboard")}>
          Back to Dashboard
        </Button>
      </CardFooter>
    </div>
  );
} 