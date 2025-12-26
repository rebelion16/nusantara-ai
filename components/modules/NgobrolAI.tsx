import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    MessageCircle,
    Send,
    Loader2,
    Settings2,
    Trash2,
    Download,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
} from 'lucide-react';
import {
    AiPersona,
    AiGender,
    AiWritingStyle,
    ChatMessage,
    getPersonaConfig,
    DEFAULT_PERSONA,
    sendChatMessage,
    createUserMessage,
    createAiMessage,
    createLoadingMessage,
    ELEVENLABS_VOICES,
    generateSpeech,
} from '../../services/aiChatService';

// === PERSONA OPTIONS ===
const GENDER_OPTIONS: { value: AiGender; label: string; emoji: string }[] = [
    { value: 'male', label: 'Cowok', emoji: '👨' },
    { value: 'female', label: 'Cewek', emoji: '👩' },
];

const STYLE_OPTIONS: { value: AiWritingStyle; label: string; desc: string }[] = [
    { value: 'santai', label: 'Santai', desc: 'Friendly & casual' },
    { value: 'gaul', label: 'Gaul', desc: 'Bahasa anak muda' },
    { value: 'formal', label: 'Formal', desc: 'Sopan & profesional' },
    { value: 'lucu', label: 'Lucu', desc: 'Suka bercanda' },
];

// === INTRO MESSAGES BY PERSONA ===
const getIntroMessage = (persona: AiPersona): string => {
    const { name, gender, writingStyle } = persona;

    const intros: Record<AiGender, Record<AiWritingStyle, string>> = {
        male: {
            santai: `Yo! Gue ${name}, temen ngobrol lo yang paling asyik! 😎 Mau curhat, nanya-nanya, atau ngobrol santai aja? Gas, gue siap dengerin!`,
            gaul: `Wazzup bro! 🔥 Gue ${name} nih, siap nemenin lo ngobrol seru! Literally anything, just hit me up cuy! 💀`,
            formal: `Halo, saya ${name}. Senang bisa berkenalan dengan Anda. Ada yang bisa saya bantu hari ini? 🙂`,
            lucu: `Halo halo! Nama gue ${name}, komedian gagal yang nyasar jadi AI wkwk 😂 Siap bikin lo ngakak hari ini!`,
        },
        female: {
            santai: `Hai kak! Aku ${name}, temen ngobrol yang siap nemenin kapan aja! ✨ Mau cerita apa nih?`,
            gaul: `Heyy bestie! 💅 Aku ${name}! Siap spill tea bareng, curhat, atau bahas apapun! Literally no filter slay~ ✨`,
            formal: `Halo, saya ${name}. Senang berkenalan dengan Anda. Silakan sampaikan apa yang ingin dibicarakan. 🙂`,
            lucu: `Haiii! Aku ${name}, AI yang gagal jadi stand-up comedian tapi tetep lucu kok wkwk 🤣 Mau ngobrol apa nih?`,
        },
    };

    return intros[gender][writingStyle];
};

// === LOCALSTORAGE KEYS ===
const STORAGE_KEYS = {
    MESSAGES: 'NGOBROL_AI_MESSAGES',
    PERSONA: 'NGOBROL_AI_PERSONA',
};

// === MAIN COMPONENT ===
export const NgobrolAIModule: React.FC = () => {
    // Chat State - Load from localStorage on init
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Persona State - Load from localStorage on init
    const [persona, setPersona] = useState<AiPersona>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PERSONA);
            return saved ? JSON.parse(saved) : DEFAULT_PERSONA;
        } catch {
            return DEFAULT_PERSONA;
        }
    });
    const [showPersonaSettings, setShowPersonaSettings] = useState(false);

    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
        const saved = localStorage.getItem('NGOBROL_AI_ELEVENLABS_VOICE');
        return saved || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel
    });
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save messages:', e);
        }
    }, [messages]);

    // Save persona to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEYS.PERSONA, JSON.stringify(persona));
        } catch (e) {
            console.error('Failed to save persona:', e);
        }
    }, [persona]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-focus input after loading completes
    useEffect(() => {
        if (!isLoading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading]);

    // Initialize Web Speech API
    useEffect(() => {
        // Speech Recognition
        const SpeechRecognitionAPI = window.SpeechRecognition || (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
        if (SpeechRecognitionAPI) {
            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'id-ID';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[0][0].transcript;
                setInputText(prev => prev + transcript);
                setIsListening(false);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        // Create audio element for TTS playback
        audioRef.current = new Audio();
        audioRef.current.onended = () => setIsSpeaking(false);
        audioRef.current.onerror = () => setIsSpeaking(false);

        return () => {
            recognitionRef.current?.abort();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Toggle voice input
    const toggleVoiceInput = useCallback(() => {
        if (!recognitionRef.current) {
            alert('Browser tidak mendukung voice input');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    }, [isListening]);

    // Speak text using ElevenLabs TTS
    const speakText = useCallback(async (text: string) => {
        if (!voiceEnabled || isGeneratingVoice) return;

        try {
            setIsGeneratingVoice(true);

            // Stop any current playback
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // Generate speech using ElevenLabs
            const audioUrl = await generateSpeech(text, selectedVoiceId);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.play();
                setIsSpeaking(true);
            }
        } catch (error: any) {
            console.error('ElevenLabs TTS Error:', error);
            // Fallback message - don't show alert to avoid interruption
        } finally {
            setIsGeneratingVoice(false);
        }
    }, [voiceEnabled, selectedVoiceId, isGeneratingVoice]);

    // Handle voice change
    const handleVoiceChange = (voiceId: string) => {
        setSelectedVoiceId(voiceId);
        localStorage.setItem('NGOBROL_AI_ELEVENLABS_VOICE', voiceId);
    };

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
    }, []);

    // Handle persona change
    const handlePersonaChange = (gender: AiGender, style: AiWritingStyle) => {
        const newPersona = getPersonaConfig(gender, style);
        setPersona(newPersona);

        // Always add intro message when persona changes
        const introMsg = createAiMessage(getIntroMessage(newPersona));
        setMessages(prev => [...prev, introMsg]);

        // Close settings panel
        setShowPersonaSettings(false);

        // Focus back to input
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Send message handler
    const handleSendMessage = async () => {
        const text = inputText.trim();
        if (!text || isLoading) return;

        // Add user message
        const userMsg = createUserMessage(text);
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        // Add loading indicator
        const loadingMsg = createLoadingMessage();
        setMessages(prev => [...prev, loadingMsg]);

        try {
            // Get conversation history (excluding loading message)
            const history = [...messages, userMsg];

            const response = await sendChatMessage(history, persona);

            // Remove loading and add AI response
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isLoading);
                const aiMsg = createAiMessage(response.text, response.imageUrl);
                return [...filtered, aiMsg];
            });

            // Speak AI response if voice is enabled
            if (voiceEnabled && response.text) {
                speakText(response.text);
            }
        } catch (error: any) {
            // Remove loading and add error message
            setMessages(prev => {
                const filtered = prev.filter(m => !m.isLoading);
                const errorMsg = createAiMessage(`⚠️ ${error.message}`);
                return [...filtered, errorMsg];
            });
        } finally {
            setIsLoading(false);
            // Focus will be handled by useEffect
        }
    };

    // Clear chat handler
    const handleClearChat = () => {
        setMessages([]);
        inputRef.current?.focus();
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Download image
    const handleDownloadImage = (imageUrl: string) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `ai-image-${Date.now()}.png`;
        link.click();
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                            {persona.gender === 'male' ? '👨' : '👩'}
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                {persona.name}
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                    {STYLE_OPTIONS.find(s => s.value === persona.writingStyle)?.label}
                                </span>
                            </h2>
                            <p className="text-white/70 text-sm">
                                Teman Ngobrol AI
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Settings Button */}
                        <button
                            onClick={() => setShowPersonaSettings(!showPersonaSettings)}
                            className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
                            title="Pengaturan Persona"
                        >
                            <Settings2 size={20} />
                        </button>

                        {/* Clear Chat */}
                        <button
                            onClick={handleClearChat}
                            className="p-2 rounded-full bg-white/20 text-white hover:bg-red-500 transition-all"
                            title="Hapus Semua Chat"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Persona Settings Panel */}
                {showPersonaSettings && (
                    <div className="mt-4 p-4 bg-white/10 backdrop-blur rounded-xl animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Gender Selection */}
                            <div>
                                <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2 block">
                                    Jenis Kelamin
                                </label>
                                <div className="flex gap-2">
                                    {GENDER_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handlePersonaChange(opt.value, persona.writingStyle)}
                                            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${persona.gender === opt.value
                                                ? 'bg-white text-violet-600'
                                                : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            <span>{opt.emoji}</span>
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Style Selection */}
                            <div>
                                <label className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2 block">
                                    Gaya Bicara
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {STYLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handlePersonaChange(persona.gender, opt.value)}
                                            className={`py-2 px-3 rounded-lg font-medium transition-all text-sm ${persona.writingStyle === opt.value
                                                ? 'bg-white text-violet-600'
                                                : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900 dark:bg-dark-card"
                style={{ scrollBehavior: 'smooth' }}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                            <MessageCircle size={40} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Hai! Aku {persona.name} 👋
                        </h3>
                        <p className="text-gray-400 max-w-md">
                            Mau ngobrol apa hari ini? Aku siap dengerin curhatmu, jawab pertanyaanmu,
                            atau bahkan buatin gambar buat kamu!
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2 justify-center">
                            {['Hai, apa kabar?', 'Ceritain jokes dong!', 'Buatkan gambar kucing lucu'].map(
                                (suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            setInputText(suggestion);
                                            inputRef.current?.focus();
                                        }}
                                        className="px-4 py-2 rounded-full bg-violet-500/20 text-violet-300 text-sm hover:bg-violet-500/30 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                    ? 'bg-violet-600 text-white rounded-br-sm'
                                    : 'bg-slate-800 text-white rounded-bl-sm'
                                    }`}
                            >
                                {msg.isLoading ? (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Mengetik...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Text Content */}
                                        {msg.content && (
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        )}

                                        {/* Image Content */}
                                        {msg.imageUrl && (
                                            <div className="mt-2">
                                                <img
                                                    src={msg.imageUrl}
                                                    alt="AI Generated"
                                                    className="rounded-lg max-w-full"
                                                    style={{ maxHeight: '300px' }}
                                                />
                                                <button
                                                    onClick={() => handleDownloadImage(msg.imageUrl!)}
                                                    className="mt-2 flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                                                >
                                                    <Download size={14} />
                                                    Download Gambar
                                                </button>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <div
                                            className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-violet-200' : 'text-gray-500'
                                                }`}
                                        >
                                            {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 bg-slate-800 dark:bg-dark-card border-t border-slate-700 rounded-b-2xl">
                {/* Voice Mode Toggle & Voice Selector */}
                <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${voiceEnabled
                                ? 'bg-violet-600 text-white'
                                : 'bg-slate-700 text-gray-400 hover:text-white'
                                }`}
                        >
                            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            {voiceEnabled ? 'Suara Aktif' : 'Suara Mati'}
                        </button>

                        {/* Voice Selector - ElevenLabs Voices */}
                        {voiceEnabled && (
                            <select
                                value={selectedVoiceId}
                                onChange={(e) => handleVoiceChange(e.target.value)}
                                className="bg-slate-700 text-white text-xs px-2 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:border-violet-500"
                            >
                                {ELEVENLABS_VOICES.map((voice) => (
                                    <option key={voice.id} value={voice.id}>
                                        {voice.gender === 'female' ? '👩' : '👨'} {voice.name} - {voice.description}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Loading indicator for voice generation */}
                        {isGeneratingVoice && (
                            <span className="flex items-center gap-1 text-xs text-violet-400">
                                <Loader2 size={12} className="animate-spin" />
                                Generating...
                            </span>
                        )}

                        {isSpeaking && (
                            <button
                                onClick={stopSpeaking}
                                className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-medium animate-pulse"
                            >
                                Berhenti
                            </button>
                        )}
                    </div>
                    {isListening && (
                        <span className="text-xs text-green-400 animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                            Mendengarkan...
                        </span>
                    )}
                </div>

                <div className="flex items-end gap-2">
                    {/* Voice Input Button */}
                    <button
                        onClick={toggleVoiceInput}
                        disabled={isLoading}
                        className={`p-3 rounded-full transition-all flex-shrink-0 ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
                            } disabled:opacity-50`}
                        title={isListening ? 'Hentikan rekaman' : 'Bicara ke AI'}
                    >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isListening ? 'Bicara sekarang...' : 'Ketik pesan...'}
                            disabled={isLoading}
                            rows={1}
                            className="w-full bg-slate-700 border border-slate-600 rounded-2xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none disabled:opacity-50"
                            style={{ maxHeight: '120px' }}
                            autoFocus
                        />
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isLoading}
                        className="p-3 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
