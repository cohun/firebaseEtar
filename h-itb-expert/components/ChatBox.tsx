import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { Message } from '../types';
import { sendMessageToExpert, ai } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

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
  
  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'inactive' | 'connecting' | 'listening' | 'speaking'>('inactive');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<any>(null); // To store the Live session
  const nextStartTimeRef = useRef<number>(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  
  // Transcription Accumulation Refs
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, voiceStatus]);

  // --- Voice Logic Start ---

  const stopVoiceSession = async () => {
    if (sessionRef.current) {
        // There is no explicit close method on the session object in the current SDK version exposed in the example
        // effectively we just stop sending data and close contexts.
        sessionRef.current = null;
    }

    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

    setIsVoiceActive(false);
    setVoiceStatus('inactive');
  };

  const startVoiceSession = async () => {
    try {
        setVoiceStatus('connecting');
        setIsVoiceActive(true);

        // 1. Setup Audio Contexts
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
        
        // 2. Connect to Live API
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: async () => {
                    setVoiceStatus('listening');
                    
                    // Setup Microphone Input
                    try {
                        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        sourceRef.current = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
                        processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        processorRef.current.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            
                            sessionPromise.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        sourceRef.current.connect(processorRef.current);
                        processorRef.current.connect(audioContextRef.current!.destination);
                    } catch (micError) {
                        console.error("Mic access denied", micError);
                        stopVoiceSession();
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    const content = message.serverContent;
                    
                    // Handle Transcription (User)
                    if (content?.inputTranscription?.text) {
                        currentInputTranscription.current += content.inputTranscription.text;
                    }
                    if (content?.turnComplete && currentInputTranscription.current) {
                        const text = currentInputTranscription.current;
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'user',
                            text: text,
                            timestamp: new Date()
                        }]);
                        currentInputTranscription.current = '';
                        setVoiceStatus('speaking'); // Model is about to reply usually
                    }

                    // Handle Transcription (Model)
                    if (content?.outputTranscription?.text) {
                        currentOutputTranscription.current += content.outputTranscription.text;
                    }
                    if (content?.turnComplete && currentOutputTranscription.current) {
                        const text = currentOutputTranscription.current;
                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: 'model',
                            text: text,
                            timestamp: new Date()
                        }]);
                        currentOutputTranscription.current = '';
                        setVoiceStatus('listening');
                    }

                    // Handle Audio Output
                    const base64Audio = content?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        setVoiceStatus('speaking');
                        const ctx = outputAudioContextRef.current;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        
                        const audioBuffer = await decodeAudioData(
                            decode(base64Audio),
                            ctx,
                            24000,
                            1
                        );

                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(ctx.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        
                        source.addEventListener('ended', () => {
                           // simple check if we should go back to listening
                           if (ctx.currentTime >= nextStartTimeRef.current) {
                               setVoiceStatus('listening');
                           }
                        });
                    }
                },
                onclose: () => {
                    console.log("Session closed");
                    stopVoiceSession();
                },
                onerror: (err) => {
                    console.error("Session error", err);
                    stopVoiceSession();
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
                },
                systemInstruction: "Ön a H-ITB Kft. vezető emelőgép szakértője. Legyen barátságos, segítőkész. Beszéljen magyarul.",
                inputAudioTranscription: {},
                outputAudioTranscription: {}
            }
        });
        
        sessionRef.current = sessionPromise;

    } catch (e) {
        console.error("Failed to start voice", e);
        stopVoiceSession();
    }
  };

  const toggleVoice = () => {
    if (isVoiceActive) {
        stopVoiceSession();
    } else {
        startVoiceSession();
    }
  };

  // --- Voice Logic End ---

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    // If voice was active, stop it when manually typing
    if (isVoiceActive) stopVoiceSession();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Convert state messages to API history format
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await sendMessageToExpert(inputText, history);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'Elnézést, technikai hiba történt. Kérem, próbálja újra később.',
        timestamp: new Date()
      }]);
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
      <div className={`p-4 flex items-center gap-3 transition-colors duration-300 ${isVoiceActive ? 'bg-[#9e0b0f]' : 'bg-[#004e8e]'}`}>
        <div className="relative">
          <div className={`w-3 h-3 rounded-full absolute bottom-0 right-0 border-2 ${isVoiceActive ? 'bg-red-300 animate-pulse border-[#9e0b0f]' : 'bg-green-400 border-[#004e8e]'}`}></div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
        </div>
        <div>
          <h3 className="text-white font-bold">
            {isVoiceActive ? 'Hangalapú Hívás' : 'Online Szakértő'}
          </h3>
          <p className="text-blue-100 text-xs flex items-center gap-1">
             {isVoiceActive ? (
                 <>
                    {voiceStatus === 'connecting' && <Loader2 size={10} className="animate-spin" />}
                    {voiceStatus === 'listening' && 'Figyel...'}
                    {voiceStatus === 'speaking' && 'Beszél...'}
                    {voiceStatus === 'connecting' && 'Kapcsolódás...'}
                 </>
             ) : 'Válaszadás azonnal'}
          </p>
        </div>
        {isVoiceActive && voiceStatus === 'speaking' && (
            <div className="ml-auto">
                <Volume2 className="text-white animate-pulse" size={20} />
            </div>
        )}
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
        {isTyping && (
          <div className="flex justify-start">
             <div className="flex max-w-[80%] gap-2">
                <div className="w-8 h-8 rounded-full bg-[#9e0b0f] text-white flex-shrink-0 flex items-center justify-center">
                    <Bot size={16} />
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400">Gépelés...</span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
            
            {/* Voice Toggle Button */}
            <button
                onClick={toggleVoice}
                className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
                    isVoiceActive 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 ring-2 ring-red-500 ring-opacity-50' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Beszélgetés indítása"
            >
                {isVoiceActive ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all border border-transparent focus-within:border-blue-500">
            <input
                type="text"
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-500"
                placeholder={isVoiceActive ? "Hallgatlak..." : "Kérdezzen az emelőgépekről..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isTyping || isVoiceActive}
            />
            <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping || isVoiceActive}
                className={`p-2 rounded-full transition-colors ${
                !inputText.trim() || isTyping || isVoiceActive
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