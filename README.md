# QuickTransfer deployment

The browser application can be hosted on Vercel, but the WebRTC signaling
service cannot. It requires a persistent Node process with WebSocket upgrade
support; Vercel serverless functions are short-lived and do not provide that.

## Local development

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` on the sender and receiver (or through a LAN
tunnel when using separate physical devices).

## Production

1. Deploy this repository as a **Web Service** on Render (the included
   `render.yaml` has the required commands), Railway, Fly.io, or another host
   that supports persistent Node WebSockets. Copy its HTTPS URL, for example
   `https://quicktransfer-signaling.onrender.com`.
2. Deploy the same repository to Vercel for the frontend.
3. In Vercel → Project Settings → Environment Variables, set
   `SIGNALING_ORIGIN` to the signaling service URL from step 1, then redeploy.

The Vercel frontend reads that value at runtime through `/api/config`, then
uses the persistent service for both `POST /session` and `WSS /signal`.
