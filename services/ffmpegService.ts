/**
 * FFmpeg.wasm Service for Browser-based Video Processing
 * Handles merging video + audio for VidGen Story Generator
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

/**
 * Initialize FFmpeg.wasm (loads core files from CDN)
 */
export const initFFmpeg = async (onProgress?: (progress: number) => void): Promise<boolean> => {
    if (isLoaded && ffmpeg) return true;

    try {
        ffmpeg = new FFmpeg();

        // Set up progress callback
        ffmpeg.on('progress', ({ progress }) => {
            onProgress?.(Math.round(progress * 100));
        });

        // Load FFmpeg core from CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        isLoaded = true;
        console.log('[FFmpeg] Loaded successfully');
        return true;
    } catch (error) {
        console.error('[FFmpeg] Failed to load:', error);
        return false;
    }
};

/**
 * Check if FFmpeg is loaded
 */
export const isFFmpegLoaded = (): boolean => isLoaded;

/**
 * Merge video and audio into a single file
 * @param videoUrl - URL or blob URL of the video file
 * @param audioUrl - URL or blob URL of the audio file
 * @param outputFilename - Name for the output file (default: output.mp4)
 * @returns Blob URL of the merged video
 */
export const mergeVideoAudio = async (
    videoUrl: string,
    audioUrl: string,
    outputFilename: string = 'merged.mp4',
    onProgress?: (progress: number) => void
): Promise<string> => {
    if (!ffmpeg || !isLoaded) {
        const loaded = await initFFmpeg(onProgress);
        if (!loaded) throw new Error('Failed to initialize FFmpeg');
    }

    try {
        console.log('[FFmpeg] Starting merge...');

        // Fetch video and audio files
        const videoData = await fetchFile(videoUrl);
        const audioData = await fetchFile(audioUrl);

        // Write files to FFmpeg virtual filesystem
        await ffmpeg!.writeFile('input.mp4', videoData);
        await ffmpeg!.writeFile('input.wav', audioData);

        console.log('[FFmpeg] Files loaded, merging...');

        // Merge video + audio
        // -c:v copy = copy video stream without re-encoding (fast)
        // -c:a aac = encode audio to AAC
        // -shortest = cut to shortest stream
        // -map 0:v = take video from first input
        // -map 1:a = take audio from second input
        await ffmpeg!.exec([
            '-i', 'input.mp4',
            '-i', 'input.wav',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            outputFilename
        ]);

        // Read the output file
        const data = await ffmpeg!.readFile(outputFilename);

        // Clean up
        await ffmpeg!.deleteFile('input.mp4');
        await ffmpeg!.deleteFile('input.wav');
        await ffmpeg!.deleteFile(outputFilename);

        // Create blob URL for the merged video
        const blob = new Blob([data as any], { type: 'video/mp4' });
        const mergedUrl = URL.createObjectURL(blob);

        console.log('[FFmpeg] Merge complete!');
        return mergedUrl;

    } catch (error: any) {
        console.error('[FFmpeg] Merge error:', error);
        throw new Error(`Failed to merge video and audio: ${error.message}`);
    }
};

/**
 * Merge video with audio, keeping original video audio (mixed)
 * Useful when you want voiceover + original sound
 */
export const mixVideoAudio = async (
    videoUrl: string,
    audioUrl: string,
    voiceVolume: number = 1.0,
    originalVolume: number = 0.3,
    outputFilename: string = 'mixed.mp4',
    onProgress?: (progress: number) => void
): Promise<string> => {
    if (!ffmpeg || !isLoaded) {
        const loaded = await initFFmpeg(onProgress);
        if (!loaded) throw new Error('Failed to initialize FFmpeg');
    }

    try {
        console.log('[FFmpeg] Starting audio mix...');

        const videoData = await fetchFile(videoUrl);
        const audioData = await fetchFile(audioUrl);

        await ffmpeg!.writeFile('input.mp4', videoData);
        await ffmpeg!.writeFile('voice.wav', audioData);

        // Mix original audio + voice over
        // Uses complex filter to adjust volumes and mix
        await ffmpeg!.exec([
            '-i', 'input.mp4',
            '-i', 'voice.wav',
            '-filter_complex',
            `[0:a]volume=${originalVolume}[a0];[1:a]volume=${voiceVolume}[a1];[a0][a1]amix=inputs=2:duration=longest[aout]`,
            '-c:v', 'copy',
            '-map', '0:v:0',
            '-map', '[aout]',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-y',
            outputFilename
        ]);

        const data = await ffmpeg!.readFile(outputFilename);

        await ffmpeg!.deleteFile('input.mp4');
        await ffmpeg!.deleteFile('voice.wav');
        await ffmpeg!.deleteFile(outputFilename);

        const blob = new Blob([data as any], { type: 'video/mp4' });
        return URL.createObjectURL(blob);

    } catch (error: any) {
        console.error('[FFmpeg] Mix error:', error);
        throw new Error(`Failed to mix audio: ${error.message}`);
    }
};

/**
 * Concatenate multiple video files
 * Useful for combining story scenes
 */
export const concatenateVideos = async (
    videoUrls: string[],
    outputFilename: string = 'final.mp4',
    onProgress?: (progress: number) => void
): Promise<string> => {
    if (!ffmpeg || !isLoaded) {
        const loaded = await initFFmpeg(onProgress);
        if (!loaded) throw new Error('Failed to initialize FFmpeg');
    }

    if (videoUrls.length === 0) throw new Error('No videos to concatenate');
    if (videoUrls.length === 1) return videoUrls[0]; // Return single video as-is

    try {
        console.log(`[FFmpeg] Concatenating ${videoUrls.length} videos...`);

        // Write all videos to filesystem
        const inputFiles: string[] = [];
        for (let i = 0; i < videoUrls.length; i++) {
            const filename = `input_${i}.mp4`;
            const data = await fetchFile(videoUrls[i]);
            await ffmpeg!.writeFile(filename, data);
            inputFiles.push(filename);
        }

        // Create concat file list
        const concatList = inputFiles.map(f => `file '${f}'`).join('\n');
        await ffmpeg!.writeFile('concat.txt', concatList);

        // Concatenate using concat demuxer
        await ffmpeg!.exec([
            '-f', 'concat',
            '-safe', '0',
            '-i', 'concat.txt',
            '-c', 'copy',
            '-y',
            outputFilename
        ]);

        const data = await ffmpeg!.readFile(outputFilename);

        // Cleanup
        for (const f of inputFiles) {
            await ffmpeg!.deleteFile(f);
        }
        await ffmpeg!.deleteFile('concat.txt');
        await ffmpeg!.deleteFile(outputFilename);

        const blob = new Blob([data as any], { type: 'video/mp4' });
        console.log('[FFmpeg] Concatenation complete!');
        return URL.createObjectURL(blob);

    } catch (error: any) {
        console.error('[FFmpeg] Concatenate error:', error);
        throw new Error(`Failed to concatenate videos: ${error.message}`);
    }
};

/**
 * Clean up FFmpeg resources
 */
export const terminateFFmpeg = (): void => {
    if (ffmpeg) {
        ffmpeg.terminate();
        ffmpeg = null;
        isLoaded = false;
        console.log('[FFmpeg] Terminated');
    }
};
