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

// Constants for local storage
const OPENAI_KEY_STORAGE = 'openai_api_key';
const ANTHROPIC_KEY_STORAGE = 'anthropic_api_key';

// Helper functions for each provider's API key
const getStoredKey = (provider: string): string | null => {
  try {
    return localStorage.getItem(provider);
  } catch (error) {
    console.error(`Error reading ${provider} from storage:`, error);
    return null;
  }
};

const storeKey = (provider: string, apiKey: string): void => {
  try {
    localStorage.setItem(provider, apiKey);
  } catch (error) {
    console.error(`Error storing ${provider}:`, error);
  }
};

const removeKey = (provider: string): void => {
  try {
    localStorage.removeItem(provider);
  } catch (error) {
    console.error(`Error removing ${provider}:`, error);
  }
};

export default function ApiSettingsPage() {
  const router = useRouter();
  
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

  // Initial loading of API keys
  useEffect(() => {
    // Load OpenAI key
    const storedOpenaiKey = getStoredKey(OPENAI_KEY_STORAGE);
    if (storedOpenaiKey) {
      const maskedKey = maskApiKey(storedOpenaiKey);
      setOpenaiKey(maskedKey);
      setHasOpenaiKey(true);
    }
    
    // Load Anthropic key
    const storedAnthropicKey = getStoredKey(ANTHROPIC_KEY_STORAGE);
    if (storedAnthropicKey) {
      const maskedKey = maskApiKey(storedAnthropicKey);
      setAnthropicKey(maskedKey);
      setHasAnthropicKey(true);
    }
  }, []);

  // Helper function to mask API keys
  const maskApiKey = (key: string): string => {
    return key.length > 7 
      ? `${key.substring(0, 3)}${'*'.repeat(key.length - 7)}${key.substring(key.length - 4)}`
      : '********';
  };

  // Save OpenAI API key
  const handleSaveOpenaiKey = () => {
    if (!openaiKey.trim()) {
      toast.error("Please enter a valid OpenAI API key");
      return;
    }

    setIsSavingOpenai(true);
    
    // Simulate a delay for better UX
    setTimeout(() => {
      storeKey(OPENAI_KEY_STORAGE, openaiKey);
      toast.success("OpenAI API key saved successfully");
      setIsSavingOpenai(false);
      setHasOpenaiKey(true);
      setIsEditingOpenai(false);
      
      // Mask the key after saving
      const maskedKey = maskApiKey(openaiKey);
      setOpenaiKey(maskedKey);
    }, 800);
  };

  // Save Anthropic API key
  const handleSaveAnthropicKey = () => {
    if (!anthropicKey.trim()) {
      toast.error("Please enter a valid Anthropic API key");
      return;
    }

    setIsSavingAnthropic(true);
    
    // Simulate a delay for better UX
    setTimeout(() => {
      storeKey(ANTHROPIC_KEY_STORAGE, anthropicKey);
      toast.success("Anthropic API key saved successfully");
      setIsSavingAnthropic(false);
      setHasAnthropicKey(true);
      setIsEditingAnthropic(false);
      
      // Mask the key after saving
      const maskedKey = maskApiKey(anthropicKey);
      setAnthropicKey(maskedKey);
    }, 800);
  };

  // Remove OpenAI API key
  const handleRemoveOpenaiKey = () => {
    removeKey(OPENAI_KEY_STORAGE);
    setOpenaiKey("");
    setHasOpenaiKey(false);
    setIsEditingOpenai(true);
    toast.success("OpenAI API key removed");
  };

  // Remove Anthropic API key
  const handleRemoveAnthropicKey = () => {
    removeKey(ANTHROPIC_KEY_STORAGE);
    setAnthropicKey("");
    setHasAnthropicKey(false);
    setIsEditingAnthropic(true);
    toast.success("Anthropic API key removed");
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
          Your API keys are stored locally in your browser and are only used to communicate with their respective services.
          We never store your API keys on our servers.
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