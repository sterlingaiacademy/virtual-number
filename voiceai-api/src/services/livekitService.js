const { getLiveKit, getSIPClient } = require('../config/livekit');
const db = require('../config/database');

const livekitService = {
  /**
   * Create a SIP trunk in LiveKit for a client's phone number
   */
  async createSIPTrunk(clientId, phoneNumber) {
    const sip = getSIPClient();

    const trunk = await sip.createSIPInboundTrunk({
      name: `client-${clientId}-${phoneNumber}`,
      numbers: [phoneNumber],
      allowedAddresses: [], // open to any SIP source (carrier)
      krisp_enabled: true,
    });

    return trunk;
  },

  /**
   * Delete a SIP trunk by LiveKit trunk ID
   */
  async deleteSIPTrunk(livekitTrunkId) {
    const sip = getSIPClient();
    await sip.deleteSIPTrunk(livekitTrunkId);
  },

  /**
   * Create a dispatch rule so inbound calls on a number spin up an agent room
   */
  async createDispatchRule(phoneNumber, agentName = 'voiceai-agent') {
    const sip = getSIPClient();

    const rule = await sip.createSIPDispatchRule({
      rule: {
        dispatchRuleIndividual: {
          roomPrefix: `call-${phoneNumber.replace(/\+/g, '')}-`,
          agentName,
        },
      },
      name: `dispatch-${phoneNumber}`,
      trunkIds: [],
      hidePhoneNumber: false,
    });

    return rule;
  },

  /**
   * Delete a dispatch rule by LiveKit rule ID
   */
  async deleteDispatchRule(ruleId) {
    const sip = getSIPClient();
    await sip.deleteSIPDispatchRule(ruleId);
  },

  /**
   * List active rooms (live calls)
   */
  async listActiveRooms() {
    const client = getLiveKit();
    const rooms = await client.listRooms();
    return rooms.filter(r => r.numParticipants > 0);
  },

  /**
   * Get a specific room's details
   */
  async getRoom(roomName) {
    const client = getLiveKit();
    const rooms = await client.listRooms([roomName]);
    return rooms[0] || null;
  },

  /**
   * Delete / end a room (terminates the call)
   */
  async deleteRoom(roomName) {
    const client = getLiveKit();
    await client.deleteRoom(roomName);
  },

  /**
   * Generate a short-lived access token for monitoring dashboards
   */
  generateMonitorToken(roomName, identity = 'admin-monitor') {
    const { generateToken } = require('../config/livekit');
    return generateToken(roomName, identity, { roomAdmin: true, canSubscribe: true });
  },
};

module.exports = { livekitService };
