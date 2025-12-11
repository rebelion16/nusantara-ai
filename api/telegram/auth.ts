// api/telegram/auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { state } = req.query;

    // Debug: Show config for troubleshooting
    if (req.method === 'GET' && !state) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/telegram/callback`;

        return res.status(200).json({
            hasClientId: !!clientId,
            clientIdPreview: clientId ? clientId.substring(0, 20) + '...' : 'NOT SET',
            redirectUri: redirectUri,
            nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
            hint: 'Add the redirectUri above to Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client > Authorized redirect URIs'
        });
    }

    if (!state || typeof state !== 'string') {
        return res.status(400).send('Missing state parameter. Add ?state=test to URL.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const appUrl = process.env.NEXTAUTH_URL || 'https://nusantara-ai-six.vercel.app';
    const redirectUri = `${appUrl}/api/telegram/callback`;

    if (!clientId) {
        return res.status(500).send('GOOGLE_CLIENT_ID is not configured. Please set it in Vercel Environment Variables.');
    }

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    console.log('Redirecting to Google OAuth:', authUrl.toString());
    res.redirect(authUrl.toString());
}
