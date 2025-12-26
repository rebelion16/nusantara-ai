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
    Paperclip,
    X,
    Image as ImageIcon,
    Check,
    CheckCheck,
    MoreVertical,
    Phone,
    Video,
    Camera,
    Edit3,
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

// === WHATSAPP PATTERN BACKGROUND ===
const WhatsAppPattern = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="wa-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="30" cy="10" r="1" fill="currentColor" />
                <circle cx="50" cy="10" r="1.5" fill="currentColor" />
                <circle cx="20" cy="30" r="1" fill="currentColor" />
                <circle cx="40" cy="30" r="1.5" fill="currentColor" />
                <circle cx="10" cy="50" r="1" fill="currentColor" />
                <circle cx="30" cy="50" r="1.5" fill="currentColor" />
                <circle cx="50" cy="50" r="1" fill="currentColor" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wa-pattern)" />
    </svg>
);

// === CHAT BUBBLE COMPONENT ===
interface ChatBubbleProps {
    message: ChatMessage;
    onDownloadImage: (url: string) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onDownloadImage }) => {
    const isUser = message.role === 'user';
    const time = new Date(message.timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });

    if (message.isLoading) {
        return (
            <div className="flex justify-start mb-2">
                <div className="relative max-w-[75%] bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                    {/* Tail */}
                    <div className="absolute -left-2 bottom-0 w-4 h-4 overflow-hidden">
                        <div className="absolute right-0 bottom-0 w-4 h-8 bg-white dark:bg-slate-700 rounded-br-[16px]"></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
            <div
                className={`relative max-w-[75%] shadow-sm ${isUser
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-white rounded-2xl rounded-br-sm'
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-2xl rounded-bl-sm'
                    }`}
            >
                {/* Bubble Tail */}
                {isUser ? (
                    <div className="absolute -right-2 bottom-0 w-4 h-4 overflow-hidden">
                        <div className="absolute left-0 bottom-0 w-4 h-8 bg-[#d9fdd3] dark:bg-[#005c4b] rounded-bl-[16px]"></div>
                    </div>
                ) : (
                    <div className="absolute -left-2 bottom-0 w-4 h-4 overflow-hidden">
                        <div className="absolute right-0 bottom-0 w-4 h-8 bg-white dark:bg-slate-700 rounded-br-[16px]"></div>
                    </div>
                )}

                {/* Content */}
                <div className="px-3 py-2">
                    {/* User Uploaded Image */}
                    {message.userImageUrl && (
                        <div className="mb-2 -mx-1 -mt-1">
                            <img
                                src={message.userImageUrl}
                                alt="Uploaded"
                                className="rounded-xl max-w-full"
                                style={{ maxHeight: '250px' }}
                            />
                        </div>
                    )}

                    {/* AI Generated Image */}
                    {message.imageUrl && (
                        <div className="mb-2 -mx-1 -mt-1">
                            <img
                                src={message.imageUrl}
                                alt="AI Generated"
                                className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxHeight: '250px' }}
                                onClick={() => onDownloadImage(message.imageUrl!)}
                            />
                            <button
                                onClick={() => onDownloadImage(message.imageUrl!)}
                                className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                <Download size={12} />
                                Download
                            </button>
                        </div>
                    )}

                    {/* Text Content */}
                    {message.content && (
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed pr-14">
                            {message.content}
                        </p>
                    )}

                    {/* Timestamp & Status */}
                    <div className={`flex items-center gap-1 justify-end -mb-1 ${message.content ? '-mt-4' : 'mt-1'}`}>
                        <span className={`text-[11px] ${isUser ? 'text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-400'}`}>
                            {time}
                        </span>
                        {isUser && (
                            <CheckCheck size={16} className="text-blue-500" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
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

    // Image Upload State
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Custom Profile State
    const [customName, setCustomName] = useState<string>(persona.name);
    const [isEditingName, setIsEditingName] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

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

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Image size must be less than 10MB');
                return;
            }

            setSelectedImage(file);

            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            // Convert to base64 for API
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                setImageBase64(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // Clear selected image
    const clearSelectedImage = () => {
        setSelectedImage(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview(null);
        setImageBase64(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

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
        const newPersona = getPersonaConfig(gender, style, persona.name, persona.customAvatarUrl);
        setPersona(newPersona);

        // Always add intro message when persona changes
        const introMsg = createAiMessage(getIntroMessage(newPersona));
        setMessages(prev => [...prev, introMsg]);

        // Keep settings panel open - user will close it manually
    };

    // Handle custom avatar upload
    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Pilih file gambar');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran gambar maksimal 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const avatarUrl = reader.result as string;
                const newPersona = { ...persona, customAvatarUrl: avatarUrl };
                setPersona(newPersona);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle custom name save
    const handleSaveCustomName = () => {
        if (customName.trim()) {
            const newPersona = { ...persona, name: customName.trim() };
            setPersona(newPersona);
            setIsEditingName(false);
        }
    };

    // Reset avatar to default
    const handleResetAvatar = () => {
        const newPersona = { ...persona, customAvatarUrl: undefined };
        setPersona(newPersona);
    };

    // Send message handler
    const handleSendMessage = async () => {
        const text = inputText.trim();
        const hasContent = text || imagePreview;
        if (!hasContent || isLoading) return;

        // Add user message with image if present
        const userMsg = createUserMessage(
            text || (imagePreview ? '📷 Gambar' : ''),
            imagePreview || undefined,
            imageBase64 || undefined
        );
        setMessages(prev => [...prev, userMsg]);
        setInputText('');

        // Store image base64 before clearing
        const currentImageBase64 = imageBase64;

        // Clear selected image
        clearSelectedImage();

        setIsLoading(true);

        // Add loading indicator
        const loadingMsg = createLoadingMessage();
        setMessages(prev => [...prev, loadingMsg]);

        try {
            // Get conversation history (excluding loading message)
            const history = [...messages, userMsg];

            const response = await sendChatMessage(history, persona, currentImageBase64 || undefined);

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
        <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700">
            {/* WhatsApp-style Header */}
            <div className="flex-shrink-0 bg-[#008069] dark:bg-[#1f2c34] px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Avatar with Online Indicator */}
                        <div className="relative">
                            {persona.customAvatarUrl ? (
                                <img
                                    src={persona.customAvatarUrl}
                                    alt={persona.name}
                                    className="w-10 h-10 rounded-full object-cover shadow-md"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl shadow-md">
                                    {persona.gender === 'male' ? '👨' : '👩'}
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#008069] dark:border-[#1f2c34] rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base flex items-center gap-2">
                                {persona.name}
                            </h2>
                            <p className="text-emerald-100 dark:text-slate-400 text-xs">
                                online
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="text-white/80 hover:text-white transition-colors">
                            <Video size={20} />
                        </button>
                        <button className="text-white/80 hover:text-white transition-colors">
                            <Phone size={20} />
                        </button>
                        <button
                            onClick={() => setShowPersonaSettings(!showPersonaSettings)}
                            className="text-white/80 hover:text-white transition-colors"
                            title="Pengaturan"
                        >
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Persona Settings Panel */}
                {showPersonaSettings && (
                    <div className="mt-3 p-3 bg-white/10 backdrop-blur rounded-xl animate-fade-in">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-white/90 text-sm font-medium">Pengaturan AI</span>
                            <button
                                onClick={handleClearChat}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs hover:bg-red-500/30 transition-colors"
                            >
                                <Trash2 size={12} />
                                Hapus Chat
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Gender Selection */}
                            <div>
                                <label className="text-white/60 text-xs font-medium mb-1.5 block">
                                    Gender
                                </label>
                                <div className="flex gap-1.5">
                                    {GENDER_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handlePersonaChange(opt.value, persona.writingStyle)}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-sm transition-all flex items-center justify-center gap-1 ${persona.gender === opt.value
                                                ? 'bg-white text-emerald-600 font-medium'
                                                : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            <span>{opt.emoji}</span>
                                            <span className="hidden sm:inline">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Style Selection */}
                            <div>
                                <label className="text-white/60 text-xs font-medium mb-1.5 block">
                                    Gaya
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {STYLE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handlePersonaChange(persona.gender, opt.value)}
                                            className={`py-1.5 px-2 rounded-lg text-xs transition-all ${persona.writingStyle === opt.value
                                                ? 'bg-white text-emerald-600 font-medium'
                                                : 'bg-white/20 text-white hover:bg-white/30'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Custom Profile Section */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <label className="text-white/60 text-xs font-medium mb-2 block">
                                Kustomisasi Profil
                            </label>
                            <div className="flex items-center gap-3">
                                {/* Custom Avatar */}
                                <div className="relative">
                                    <div
                                        className="w-14 h-14 rounded-full overflow-hidden cursor-pointer group"
                                        onClick={() => avatarInputRef.current?.click()}
                                    >
                                        {persona.customAvatarUrl ? (
                                            <img
                                                src={persona.customAvatarUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl">
                                                {persona.gender === 'male' ? '👨' : '👩'}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                                            <Camera size={18} className="text-white" />
                                        </div>
                                    </div>
                                    {persona.customAvatarUrl && (
                                        <button
                                            onClick={handleResetAvatar}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                                            title="Reset avatar"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarSelect}
                                        className="hidden"
                                    />
                                </div>

                                {/* Custom Name */}
                                <div className="flex-1">
                                    {isEditingName ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={(e) => setCustomName(e.target.value)}
                                                placeholder="Nama AI"
                                                className="flex-1 bg-white/20 text-white placeholder-white/50 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomName()}
                                            />
                                            <button
                                                onClick={handleSaveCustomName}
                                                className="p-1.5 bg-emerald-500 rounded-lg text-white hover:bg-emerald-600 transition-colors"
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCustomName(persona.name);
                                                    setIsEditingName(false);
                                                }}
                                                className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30 transition-colors w-full"
                                        >
                                            <span className="truncate">{persona.name}</span>
                                            <Edit3 size={12} className="flex-shrink-0" />
                                        </button>
                                    )}
                                    <p className="text-white/40 text-[10px] mt-1">Klik untuk edit nama AI</p>
                                </div>
                            </div>
                        </div>

                        {/* Voice Settings */}
                        <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${voiceEnabled
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white/20 text-white/70 hover:text-white'
                                        }`}
                                >
                                    {voiceEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                                    Suara
                                </button>

                                {voiceEnabled && (
                                    <select
                                        value={selectedVoiceId}
                                        onChange={(e) => handleVoiceChange(e.target.value)}
                                        className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-white/30"
                                    >
                                        {ELEVENLABS_VOICES.map((voice) => (
                                            <option key={voice.id} value={voice.id} className="text-slate-800">
                                                {voice.gender === 'female' ? '👩' : '👨'} {voice.name}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {isGeneratingVoice && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-200">
                                        <Loader2 size={10} className="animate-spin" />
                                        Loading...
                                    </span>
                                )}

                                {isSpeaking && (
                                    <button
                                        onClick={stopSpeaking}
                                        className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-medium animate-pulse"
                                    >
                                        Stop
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Messages Area with WhatsApp Pattern */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-3 py-4 bg-[#efeae2] dark:bg-[#0b141a] relative"
                style={{ scrollBehavior: 'smooth' }}
            >
                {/* Background Pattern */}
                <WhatsAppPattern />

                {/* Messages */}
                <div className="relative z-10">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
                                <MessageCircle size={36} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">
                                Hai! Aku {persona.name} 👋
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm mb-6">
                                Mau ngobrol apa hari ini? Kirim pesan atau foto, aku siap bantu!
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center max-w-md">
                                {['Hai, apa kabar?', 'Ceritain jokes dong!', 'Buatkan gambar kucing lucu'].map(
                                    (suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => {
                                                setInputText(suggestion);
                                                inputRef.current?.focus();
                                            }}
                                            className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm shadow-sm hover:shadow-md transition-all"
                                        >
                                            {suggestion}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <ChatBubble
                                key={msg.id}
                                message={msg}
                                onDownloadImage={handleDownloadImage}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
                <div className="flex-shrink-0 px-3 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img
                                src={imagePreview}
                                alt="Preview"
                                className="h-16 w-16 object-cover rounded-lg shadow-sm"
                            />
                            <button
                                onClick={clearSelectedImage}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                {selectedImage?.name}
                            </p>
                            <p className="text-xs text-slate-400">
                                {selectedImage && (selectedImage.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0 px-2 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] border-t border-slate-200 dark:border-slate-700">
                {/* Listening Indicator */}
                {isListening && (
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        <span className="text-xs text-red-500 font-medium">Mendengarkan...</span>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    {/* Attachment Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="p-2.5 rounded-full bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        title="Lampirkan gambar"
                    >
                        <Paperclip size={22} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                    />

                    {/* Text Input */}
                    <div className="flex-1">
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isListening ? 'Bicara sekarang...' : 'Ketik pesan'}
                            disabled={isLoading}
                            rows={1}
                            className="w-full bg-white dark:bg-[#2a3942] border-0 rounded-3xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none disabled:opacity-50 text-[15px]"
                            style={{ maxHeight: '100px' }}
                            autoFocus
                        />
                    </div>

                    {/* Voice/Send Button */}
                    {!inputText.trim() && !imagePreview ? (
                        <button
                            onClick={toggleVoiceInput}
                            disabled={isLoading}
                            className={`p-2.5 rounded-full transition-all ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                                } disabled:opacity-50`}
                            title={isListening ? 'Hentikan rekaman' : 'Bicara ke AI'}
                        >
                            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>
                    ) : (
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading}
                            className="p-2.5 rounded-full bg-[#00a884] text-white hover:bg-[#008f72] transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 size={22} className="animate-spin" />
                            ) : (
                                <Send size={22} />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
