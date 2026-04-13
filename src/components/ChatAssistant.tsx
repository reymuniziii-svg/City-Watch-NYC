import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAssistant } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      parts: [{ text: "Hi! I'm the Council Watch Assistant. Ask me anything about NYC legislation, council members, or how local government works." }]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to state
    const newHistory = [...messages, { role: 'user' as const, parts: [{ text: userMessage }] }];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      // We pass the history up to the previous message, and the new message separately
      const historyForApi = messages.slice(1); // Exclude the initial greeting from the API history to save tokens if desired, or keep it. Let's keep it.
      const responseText = await chatWithAssistant(messages, userMessage);
      
      if (responseText) {
        setMessages([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-3 right-3 md:bottom-8 md:right-8 p-4 bg-black text-white shadow-2xl hover:bg-slate-800 transition-colors z-50 border border-white/20 flex items-center gap-3 group"
            aria-label="Open Chat Assistant"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="font-bold uppercase tracking-widest text-xs hidden group-hover:block pr-2">Ask AI</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-x-3 bottom-3 md:inset-x-auto md:bottom-8 md:right-8 w-auto md:w-[400px] h-[600px] max-h-[85vh] bg-white border-editorial shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between border-b-editorial">
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5" />
                <span className="font-editorial font-bold text-lg tracking-wide">Council Assistant</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] p-4 ${
                      msg.role === 'user' 
                        ? 'bg-black text-white' 
                        : 'bg-white border-editorial text-slate-800'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm">{msg.parts[0].text}</p>
                    ) : (
                      <div className="text-sm prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border-editorial p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t-editorial flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about NYC legislation..."
                className="flex-1 px-4 py-3 bg-slate-50 border-editorial focus:ring-1 focus:ring-black focus:border-black transition-all rounded-none text-sm"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 bg-black text-white hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-black transition-colors flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
