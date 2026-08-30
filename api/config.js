// Vercel serverless function: exposes only the public address of the persistent
// signaling service. Configure SIGNALING_ORIGIN in the Vercel project settings.
export default function handler(_request, response) {
  const signalingOrigin = process.env.SIGNALING_ORIGIN;
  if (!signalingOrigin) {
    return response.status(503).json({ error: 'SIGNALING_ORIGIN is not configured.' });
  }
  response.setHeader('Cache-Control', 'no-store');
  return response.status(200).json({ signalingOrigin });
}
