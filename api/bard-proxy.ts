import { VercelRequest, VercelResponse } from '@vercel/node';

// Bard Internal API Proxy
// Proxies requests to Gemini's batchexecute endpoint to avoid CORS issues
// Requires user's __Secure-1PSID cookie for authentication

const BARD_URL = 'https://gemini.google.com/_/BardChatUi/data/batchexecute';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { cookie, prompt, formData } = req.body;

        if (!cookie) {
            return res.status(400).json({ error: 'Cookie (__Secure-1PSID) is required' });
        }

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Build request to Bard
        const reqId = Math.floor(Math.random() * 900000) + 100000;

        // Construct the batchexecute payload for image generation
        // Based on reverse-engineering of Gemini Web UI
        const imagePrompt = `Generate an image: ${prompt}`;

        // Inner payload format for image generation
        const innerPayload = JSON.stringify([
            null,
            imagePrompt,
            null,
            null,
            1  // Flag for image generation
        ]);

        // Outer wrapper
        const outerPayload = JSON.stringify([
            [["MkEWBc", innerPayload, null, "generic"]]
        ]);

        // Build form data
        const requestBody = new URLSearchParams();
        requestBody.append('f.req', outerPayload);
        requestBody.append('at', `ABE-${reqId}`);

        // Make request to Bard
        const response = await fetch(`${BARD_URL}?bl=boq_assistant-bard-web-server_20231204.08_p0&rt=c`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'Cookie': `__Secure-1PSID=${cookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://gemini.google.com',
                'Referer': 'https://gemini.google.com/',
            },
            body: requestBody.toString()
        });

        if (!response.ok) {
            console.error('Bard API Response Status:', response.status);
            return res.status(response.status).json({
                error: `Bard API error: ${response.status}. Cookie mungkin expired.`
            });
        }

        const text = await response.text();

        // Parse the response to extract image URLs
        // Bard responses are in a complex protobuf-style format
        // Looking for image URLs in the response

        // Try to find image URLs in response
        const imageUrlPattern = /https:\/\/[^"'\s]+(?:\.png|\.jpg|\.jpeg|\.webp|generated_image[^"'\s]*)/gi;
        const matches = text.match(imageUrlPattern);

        if (matches && matches.length > 0) {
            // Clean and deduplicate URLs
            const cleanUrls = [...new Set(matches.map(url =>
                url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\/g, '')
            ))];

            // Try to fetch the first valid image
            for (const imageUrl of cleanUrls) {
                try {
                    const imgResponse = await fetch(imageUrl);
                    if (imgResponse.ok) {
                        const buffer = await imgResponse.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const contentType = imgResponse.headers.get('content-type') || 'image/png';

                        return res.status(200).json({
                            imageUrl: `data:${contentType};base64,${base64}`,
                            originalUrl: imageUrl,
                            provider: 'bard_internal'
                        });
                    }
                } catch (e) {
                    console.log('Failed to fetch image:', imageUrl);
                    continue;
                }
            }
        }

        // If no image found, try to parse as generation request
        // Bard might return a text response indicating generation in progress
        console.log('Bard Response Preview:', text.substring(0, 500));

        return res.status(404).json({
            error: 'Tidak ada gambar ditemukan dalam response. Coba lagi atau gunakan prompt berbeda.',
            debug: text.substring(0, 200)
        });

    } catch (error: any) {
        console.error('Bard Proxy Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
}
