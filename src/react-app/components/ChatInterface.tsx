import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, X, Settings } from 'lucide-react';
import { ChatMessage } from '@/shared/types';

interface ToolCallConfirmation {
  toolCall: any;
  message: string;
}

interface ChatInterfaceProps {
  onOpenSettings: () => void;
}

export default function ChatInterface({ onOpenSettings }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingToolCall, setPendingToolCall] = useState<ToolCallConfirmation | null>(null);
  const [openaiConfigured, setOpenaiConfigured] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, _setLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkOpenAIConfig();
  }, []);

  const checkOpenAIConfig = async () => {
    try {
      const apiKey = localStorage.getItem('openai_api_key');
      setOpenaiConfigured(!!apiKey);
    } catch (error) {
      console.error('Failed to check OpenAI configuration:', error);
      setOpenaiConfigured(false);
    }
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
    });

    addMessage({
      role: 'assistant',
      content: 'AI chat is not available in the client-only version of this app.',
    });
  };

  const handleConfirmToolCall = async () => {
    if (!pendingToolCall) return;

    addMessage({
      role: 'assistant',
      content: 'Sorry, I encountered an error executing that action.',
    });

    setPendingToolCall(null);
  };

  const handleCancelToolCall = () => {
    addMessage({
      role: 'assistant',
      content: 'Action cancelled. Is there anything else I can help you with?',
    });
    setPendingToolCall(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-white">TaskKeep Chat</h3>
            <p className="text-sm text-blue-100">AI assistant for your tasks and notes</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Welcome to TaskKeep Chat!</p>
            {openaiConfigured ? (
              <p className="text-sm text-gray-400">
                Ask me about your tasks and notes, or tell me what you'd like to do.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Configure your OpenAI API key to start chatting with AI.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configure OpenAI
                </button>
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Tool call confirmation */}
        {pendingToolCall && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-3">{pendingToolCall.message}</p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmToolCall}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm
              </button>
              <button
                onClick={handleCancelToolCall}
                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {!openaiConfigured ? (
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              OpenAI API key required for chat functionality
            </p>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your tasks or tell me what to do..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
