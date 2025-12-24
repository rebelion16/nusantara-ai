import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Monitor, Settings, ChevronDown, Check, Loader2 } from 'lucide-react';

// Types
interface GPUInfo {
    name: string;
    vendor: string;
    memory_mb: number;
    driver_version?: string;
}

interface GPUStatus {
    available: boolean;
    gpus: GPUInfo[];
    recommended_encoder: string;
    available_encoders: string[];
    current_encoder: string;
    message: string;
}

// Encoder display names
const ENCODER_NAMES: Record<string, string> = {
    'nvenc': 'NVIDIA NVENC',
    'qsv': 'Intel QuickSync',
    'amf': 'AMD AMF',
    'cpu': 'CPU (Software)',
    'auto': 'Auto (Best Available)'
};

const ENCODER_ICONS: Record<string, React.ReactNode> = {
    'nvenc': <Zap size={14} className="text-green-500" />,
    'qsv': <Monitor size={14} className="text-blue-500" />,
    'amf': <Zap size={14} className="text-red-500" />,
    'cpu': <Cpu size={14} className="text-gray-500" />,
    'auto': <Settings size={14} className="text-purple-500" />
};

interface GPUStatusProps {
    backendUrl?: string;
    onEncoderChange?: (encoder: string) => void;
}

export const GPUStatusComponent: React.FC<GPUStatusProps> = ({
    backendUrl = 'http://localhost:8000',
    onEncoderChange
}) => {
    const [status, setStatus] = useState<GPUStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [changing, setChanging] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch GPU status
    const fetchStatus = async () => {
        try {
            const response = await fetch(`${backendUrl}/gpu-status`);
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
                setError(null);
            } else {
                setError('Backend offline');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    // Set encoder preference
    const setEncoder = async (encoder: string) => {
        setChanging(true);
        try {
            const response = await fetch(`${backendUrl}/set-encoder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encoder })
            });

            if (response.ok) {
                const result = await response.json();
                // Refresh status
                await fetchStatus();
                onEncoderChange?.(result.encoder);
            }
        } catch (err) {
            console.error('Failed to set encoder:', err);
        } finally {
            setChanging(false);
            setShowDropdown(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        // Refresh every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [backendUrl]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Loader2 size={14} className="animate-spin text-gray-500" />
                <span className="text-xs text-gray-500">Checking GPU...</span>
            </div>
        );
    }

    if (error || !status) {
        // Don't show error here - parent component handles backend status
        return null;
    }

    const currentEncoder = status.current_encoder;
    const hasGPU = status.available;

    return (
        <div className="relative">
            {/* Main Status Display */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${hasGPU
                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
            >
                {ENCODER_ICONS[currentEncoder] || <Cpu size={14} />}
                <span className={`text-xs font-medium ${hasGPU ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {ENCODER_NAMES[currentEncoder] || currentEncoder.toUpperCase()}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Pilih Encoder</p>
                        {status.gpus.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                                GPU: {status.gpus[0].name}
                            </p>
                        )}
                    </div>

                    {/* Encoder Options */}
                    <div className="py-2">
                        {/* Auto option */}
                        <button
                            onClick={() => setEncoder('auto')}
                            disabled={changing}
                            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {ENCODER_ICONS['auto']}
                                <span className="text-sm text-gray-700 dark:text-gray-300">Auto (Recommended)</span>
                            </div>
                            {currentEncoder === status.recommended_encoder && (
                                <Check size={14} className="text-green-500" />
                            )}
                        </button>

                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                        {/* Available encoders */}
                        {status.available_encoders.map((encoder) => (
                            <button
                                key={encoder}
                                onClick={() => setEncoder(encoder)}
                                disabled={changing}
                                className={`w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${currentEncoder === encoder ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {ENCODER_ICONS[encoder] || <Cpu size={14} />}
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {ENCODER_NAMES[encoder] || encoder.toUpperCase()}
                                    </span>
                                    {encoder === 'cpu' && (
                                        <span className="text-xs text-gray-400">(Slower)</span>
                                    )}
                                </div>
                                {currentEncoder === encoder && (
                                    <Check size={14} className="text-blue-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Footer Info */}
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500">
                            {hasGPU
                                ? '🚀 GPU acceleration tersedia'
                                : '⚠️ GPU tidak terdeteksi, menggunakan CPU'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
};

export default GPUStatusComponent;
