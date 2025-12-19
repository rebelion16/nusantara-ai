// lib/downloadInterceptor.ts
// Global interceptor untuk menangani semua download di Android
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Inisialisasi download interceptor untuk Android
 * Fungsi ini menangkap semua klik pada elemen <a> dengan atribut download
 * dan menggunakan Capacitor Filesystem untuk menyimpan file
 */
export function initDownloadInterceptor(): void {
    if (!Capacitor.isNativePlatform()) {
        console.log('[Download Interceptor] Skipping - not running on native platform');
        return;
    }

    console.log('[Download Interceptor] Initializing for Android...');

    // Intercept all clicks on document
    document.addEventListener('click', async (event) => {
        const target = event.target as HTMLElement;

        // Find closest anchor element with download attribute
        const anchor = target.closest('a[download]') as HTMLAnchorElement | null;

        if (!anchor) return;

        const url = anchor.href;
        const filename = anchor.download || `download-${Date.now()}.png`;

        // Prevent default download behavior on Android
        event.preventDefault();
        event.stopPropagation();

        console.log(`[Download Interceptor] Intercepting download: ${filename}`);

        // Show loading state
        const originalContent = anchor.innerHTML;
        anchor.innerHTML = '<span class="animate-pulse">Menyimpan...</span>';
        anchor.style.pointerEvents = 'none';

        try {
            await saveFileToDevice(url, filename);

            // Show success briefly
            anchor.innerHTML = '✅ Tersimpan!';
            setTimeout(() => {
                anchor.innerHTML = originalContent;
                anchor.style.pointerEvents = 'auto';
            }, 1500);

        } catch (error: any) {
            console.error('[Download Interceptor] Error:', error);

            anchor.innerHTML = '❌ Gagal';
            setTimeout(() => {
                anchor.innerHTML = originalContent;
                anchor.style.pointerEvents = 'auto';
            }, 1500);

            alert(`Gagal menyimpan file: ${error.message || 'Unknown error'}`);
        }
    }, true); // Use capture phase to intercept before default handlers

    console.log('[Download Interceptor] Ready!');
}

/**
 * Simpan file ke device storage
 */
async function saveFileToDevice(url: string, filename: string): Promise<void> {
    let base64Data: string;

    if (url.startsWith('data:')) {
        // Already base64
        base64Data = url.split(',')[1];
    } else if (url.startsWith('blob:')) {
        // Blob URL - fetch and convert
        const response = await fetch(url);
        const blob = await response.blob();
        base64Data = await blobToBase64(blob);
    } else {
        // HTTP/HTTPS URL - fetch and convert
        const response = await fetch(url);
        const blob = await response.blob();
        base64Data = await blobToBase64(blob);
    }

    // Determine directory based on file type
    const isImage = filename.match(/\.(png|jpg|jpeg|gif|webp)$/i);
    const isVideo = filename.match(/\.(mp4|webm|mov|avi)$/i);

    // Save to Documents folder (accessible by user)
    const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
    });

    console.log('[Download Interceptor] File saved:', savedFile.uri);

    // Show notification
    alert(`✅ File tersimpan!\n📁 ${filename}\n📂 Lokasi: Documents`);
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
