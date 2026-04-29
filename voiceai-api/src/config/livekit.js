const livekit = require('livekit-server-sdk');

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

// Convert ws:// to https:// for HTTP clients
const livekitHttpUrl = LIVEKIT_URL.replace('ws://', 'http://').replace('wss://', 'https://');

// livekit-server-sdk v2 exports changed — support both v1 and v2
const RoomServiceClient = livekit.RoomServiceClient;
const SipClient = livekit.SipClient || livekit.SIPClient;
const AccessToken = livekit.AccessToken;

let roomService;
let sipService;

function getLiveKit() {
  if (!roomService) {
    roomService = new RoomServiceClient(livekitHttpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomService;
}

function getSIPClient() {
  if (!sipService) {
    // v2 uses SipClient, v1 uses SIPClient
    const Client = SipClient || RoomServiceClient;
    sipService = new Client(livekitHttpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return sipService;
}

/**
 * Generate a participant token for a room
 */
function generateToken(identity, roomName, options = {}) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl: options.ttl || '1h',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: options.canPublish ?? true,
    canSubscribe: options.canSubscribe ?? true,
  });
  return at.toJwt();
}

module.exports = { getLiveKit, getSIPClient, generateToken, livekitHttpUrl };
