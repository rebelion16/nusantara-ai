// components/DownloadButton.tsx
// Reusable download button component yang berfungsi di Android dan Web
import React, { useState } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { downloadImage } from '../lib/downloadHelper';

interface DownloadButtonProps {
    url: string;
    filename: string;
    className?: string;
    children?: React.ReactNode;
    showIcon?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
    url,
    filename,
    className = '',
    children,
    showIcon = true
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDownloading) return;

        setIsDownloading(true);
        setIsDone(false);

        try {
            await downloadImage(url, filename);
            setIsDone(true);
            setTimeout(() => setIsDone(false), 2000);
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`inline-flex items-center gap-2 ${className}`}
        >
            {showIcon && (
                isDownloading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : isDone ? (
                    <Check size={18} className="text-green-500" />
                ) : (
                    <Download size={18} />
                )
            )}
            {children || (isDownloading ? 'Mengunduh...' : isDone ? 'Tersimpan!' : 'Unduh')}
        </button>
    );
};

/**
 * Simple download link yang works di Android
 */
export const DownloadLink: React.FC<DownloadButtonProps & { asLink?: boolean }> = ({
    url,
    filename,
    className = '',
    children,
    showIcon = true,
    asLink = true
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDownloading(true);
        try {
            await downloadImage(url, filename);
        } finally {
            setIsDownloading(false);
        }
    };

    if (asLink) {
        return (
            <a
                href={url}
                onClick={handleClick}
                className={className}
                style={{ cursor: isDownloading ? 'wait' : 'pointer' }}
            >
                {showIcon && <Download size={18} className="inline mr-1" />}
                {children || 'Unduh'}
            </a>
        );
    }

    return (
        <DownloadButton url={url} filename={filename} className={className} showIcon={showIcon}>
            {children}
        </DownloadButton>
    );
};
