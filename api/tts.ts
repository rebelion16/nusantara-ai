import { VercelRequest, VercelResponse } from '@vercel/node';

// ElevenLabs TTS API Route
// This keeps the API key secure on the server side

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check API key
    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
    }

    try {
        const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Limit text length to prevent abuse (ElevenLabs has char limits)
        if (text.length > 5000) {
            return res.status(400).json({ error: 'Text too long (max 5000 chars)' });
        }

        // Call ElevenLabs API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.5,
                    use_speaker_boost: true,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('ElevenLabs API Error:', error);
            return res.status(response.status).json({
                error: error.detail?.message || `ElevenLabs API error: ${response.status}`
            });
        }

        // Get audio buffer
        const audioBuffer = await response.arrayBuffer();

        // Set response headers for audio
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.byteLength);
        res.setHeader('Cache-Control', 'no-cache');

        // Send audio data
        return res.send(Buffer.from(audioBuffer));

    } catch (error: any) {
        console.error('TTS API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
