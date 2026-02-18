import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { Message } from '../types';
import { sendMessageToExpert } from '../services/geminiService';

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Üdvözlöm! A H-ITB Kft. vezető emelőgép szakértője vagyok. Miben segíthetek ma Önnek az emelőgépek üzemeltetésével vagy az ETAR rendszerrel kapcsolatban?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInputText = inputText; // Capture current input
    setInputText('');
    setIsTyping(true);

    try {
      // Convert state messages to API history format
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      console.log('--- User Clicked Send ---');
      console.time('Total User Wait Time');
      
      const botMsgId = (Date.now() + 1).toString();
      
      // Create a placeholder bot message immediately for the filler text
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        text: '', 
        timestamp: new Date()
      }]);

      // FILLER ANIMATION: Type out a waiting message locally
      const fillerText = "Egy kis türelmet kérek, áttekintem a vonatkozó szakmai előírásokat és szabványokat...";
      let fillerIndex = 0;
      let isRealResponseStarted = false;
      
      const fillerInterval = setInterval(() => {
          if (isRealResponseStarted) {
              clearInterval(fillerInterval);
              return;
          }
          if (fillerIndex < fillerText.length) {
              const nextChar = fillerText[fillerIndex];
              setMessages(prev => prev.map(msg => 
                  msg.id === botMsgId 
                      ? { ...msg, text: (msg.text || '') + nextChar }
                      : msg
              ));
              fillerIndex++;
          } else {
              // Pulse or something? For now just stop typing.
              clearInterval(fillerInterval);
          }
      }, 50); // Speed of filler typing

      const responseText = await sendMessageToExpert(
          currentInputText, 
          history,
          (partialText) => {
              // Real response started!
              if (!isRealResponseStarted) {
                  isRealResponseStarted = true;
                  clearInterval(fillerInterval);
                  // On first chunk, we REPLACE the filler text with the real partial text
                  // This visual jump is expected but acceptable as it means "Answer found!"
              }
              
              setMessages(prev => prev.map(msg => 
                  msg.id === botMsgId 
                      ? { ...msg, text: partialText }
                      : msg
              ));
          }
      );
      
      // Ensure interval is cleared if it wasn't already
      clearInterval(fillerInterval);
      
      console.timeEnd('Total User Wait Time');

      // Ensure final text is set (if not already by callback)
      setMessages(prev => {
         const existing = prev.find(m => m.id === botMsgId);
         if (existing) {
             return prev.map(msg => 
                  msg.id === botMsgId 
                      ? { ...msg, text: responseText }
                      : msg
              );
         } else {
             return [...prev, {
                id: botMsgId,
                role: 'model',
                text: responseText,
                timestamp: new Date()
              }];
         }
      });

    } catch (error) {
      // If error, likely remove the filler message and show error
      setMessages(prev => prev.map(msg => 
        msg.id === (Date.now() + 1).toString()
            ? { ...msg, text: 'Elnézést, technikai hiba történt. Kérem, próbálja újra később.' }
            : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden relative">
      
      {/* Header */}
      <div className="p-4 flex items-center gap-3 transition-colors duration-300 bg-[#004e8e]">
        <div className="relative">
          <div className="w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 bg-green-400 border-[#004e8e]"></div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
        </div>
        <div>
          <h3 className="text-white font-bold">
            Online Szakértő
          </h3>
          <p className="text-blue-100 text-xs flex items-center gap-1">
             Válaszadás azonnal
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'user' ? 'bg-gray-200' : 'bg-[#9e0b0f] text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator - Only show if typing AND last message is User */}
        {isTyping && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%] gap-2">
                <div className="w-8 h-8 rounded-full bg-[#9e0b0f] text-white flex-shrink-0 flex items-center justify-center">
                    <Bot size={16} />
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">Gépelés...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
            
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all border border-transparent focus-within:border-blue-500">
            <input
                type="text"
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                placeholder="Kérdezzen az emelőgépekről..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isTyping}
            />
            <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className={`p-2 rounded-full transition-colors ${
                !inputText.trim() || isTyping
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                }`}
            >
                <Send size={18} />
            </button>
            </div>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400">Az ETAR rendszer támogatásával</span>
        </div>
      </div>
    </div>
  );
};