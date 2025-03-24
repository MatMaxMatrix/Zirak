import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendIcon, Bot, User, Circle } from "lucide-react";
import { ChatAreaProps } from "@/types/chat";
import { renderMessageContent } from "@/lib/chat-utils";

export function ChatArea({
  messages,
  input,
  setInput,
  handleSubmit,
  isLoading,
  needsClarification,
  inputPrompt,
  inputRequired,
  messagesEndRef
}: ChatAreaProps) {
  return (
    <div className="flex flex-col border-r transition-all duration-75">
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-blue-500" />
          <h2 className="font-semibold">Zirak AI Chat</h2>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <Bot className="mx-auto h-12 w-12 text-blue-500 mb-3 opacity-50" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Start a conversation</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ask Zirak a question to begin</p>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderMessageContent(message.content)}
                  </div>
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="border-t p-4 bg-white dark:bg-gray-900">
        {needsClarification && (
          <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 text-sm text-amber-800 dark:text-amber-200 rounded">
            <p className="font-medium">{inputPrompt || "More information needed"}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <div className="relative flex-1">
            <Input
              id="message-input"
              className={`flex-1 pr-10 py-6 rounded-full pl-4 ${
                needsClarification ? 'border-amber-500 focus-visible:ring-amber-500' : 'focus-visible:ring-blue-500'
              }`}
              placeholder={inputRequired 
                ? "Type your response..." 
                : "Type a message..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full h-12 w-12 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Circle className="animate-spin" size={20} />
            ) : (
              <SendIcon size={20} />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 