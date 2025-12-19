// lib/downloadHelper.ts
// Helper untuk download file yang berfungsi di Android dan Web
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Download file dari URL atau base64
 * @param url - URL atau base64 data
 * @param filename - Nama file untuk disimpan
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        // Native Android/iOS: gunakan Filesystem plugin
        await downloadFileNative(url, filename);
    } else {
        // Web: gunakan metode link download tradisional
        downloadFileWeb(url, filename);
    }
}

/**
 * Download file di platform native (Android/iOS)
 */
async function downloadFileNative(url: string, filename: string): Promise<void> {
    try {
        let base64Data: string;

        if (url.startsWith('data:')) {
            // Already base64
            base64Data = url.split(',')[1];
        } else {
            // Fetch and convert to base64
            const response = await fetch(url);
            const blob = await response.blob();
            base64Data = await blobToBase64(blob);
        }

        // Save to Downloads folder
        const savedFile = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
        });

        console.log('[Download] File saved:', savedFile.uri);

        // Show success message
        alert(`✅ File tersimpan di Documents:\n${filename}`);

    } catch (error) {
        console.error('[Download] Native download error:', error);
        alert(`❌ Gagal menyimpan file: ${error}`);
        throw error;
    }
}

/**
 * Download file di web browser
 */
function downloadFileWeb(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

/**
 * Download image dengan handling khusus
 * @param imageUrl - URL gambar (bisa base64 atau http URL)
 * @param filename - Nama file
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
    // Ensure filename has extension
    if (!filename.includes('.')) {
        filename = `${filename}.png`;
    }

    await downloadFile(imageUrl, filename);
}
