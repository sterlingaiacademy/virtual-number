const { getPubSub } = require('../config/gcp');

const TOPICS = {
  CALL_EVENTS: process.env.PUBSUB_TOPIC_CALLS || 'voiceai-call-events',
  BILLING: process.env.PUBSUB_TOPIC_BILLING || 'voiceai-billing',
};

const pubsubService = {
  async publishCallEvent(eventType, data) {
    const pubsub = getPubSub();
    const message = { event_type: eventType, timestamp: new Date().toISOString(), ...data };
    await pubsub.topic(TOPICS.CALL_EVENTS).publishMessage({ data: Buffer.from(JSON.stringify(message)) });
  },

  async publishBillingEvent(eventType, data) {
    const pubsub = getPubSub();
    const message = { event_type: eventType, timestamp: new Date().toISOString(), ...data };
    await pubsub.topic(TOPICS.BILLING).publishMessage({ data: Buffer.from(JSON.stringify(message)) });
  },

  async ensureTopics() {
    const pubsub = getPubSub();
    for (const topicName of Object.values(TOPICS)) {
      const topic = pubsub.topic(topicName);
      const [exists] = await topic.exists();
      if (!exists) {
        await topic.create();
        console.log(`Created Pub/Sub topic: ${topicName}`);
      }
    }
  },
};

module.exports = { pubsubService, TOPICS };
