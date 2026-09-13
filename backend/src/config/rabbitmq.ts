import amqp from "amqplib";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";

export const EXCHANGES = {
  EVENTS: "minix.events",
  DLX: "minix.dlx",
} as const;

export const QUEUES = {
  POST_CREATED: "post.created",
  POST_CREATED_DLQ: "post.created.dlq",
} as const;

export const ROUTING_KEYS = {
  POST_CREATED: "post.created",
} as const;

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;
let channelPromise: Promise<amqp.Channel | null> | null = null;

export async function getRabbitChannel(): Promise<amqp.Channel | null> {
  if (channel) return channel;
  if (channelPromise) return channelPromise;

  channelPromise = (async () => {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      connection.on("error", (err) => {
        console.warn("[rabbitmq] Connection error:", err.message);
        channel = null;
        connection = null;
        channelPromise = null;
      });
      connection.on("close", () => {
        console.warn("[rabbitmq] Connection closed");
        channel = null;
        connection = null;
        channelPromise = null;
      });

      const ch = await connection.createChannel();

      // 1. Setup Dead Letter Exchange & Queue
      await ch.assertExchange(EXCHANGES.DLX, "direct", { durable: true });
      await ch.assertQueue(QUEUES.POST_CREATED_DLQ, { durable: true });
      await ch.bindQueue(QUEUES.POST_CREATED_DLQ, EXCHANGES.DLX, ROUTING_KEYS.POST_CREATED);

      // 2. Setup Events Topic Exchange
      await ch.assertExchange(EXCHANGES.EVENTS, "topic", { durable: true });

      // 3. Setup post.created Queue with DLX configuration
      await ch.assertQueue(QUEUES.POST_CREATED, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": EXCHANGES.DLX,
          "x-dead-letter-routing-key": ROUTING_KEYS.POST_CREATED,
        },
      });
      await ch.bindQueue(QUEUES.POST_CREATED, EXCHANGES.EVENTS, ROUTING_KEYS.POST_CREATED);

      channel = ch;
      console.log("[rabbitmq] Connected and topology asserted successfully");
      return channel;
    } catch (err: any) {
      console.warn(`[rabbitmq] Unable to connect to broker at ${RABBITMQ_URL}:`, err.message);
      channel = null;
      connection = null;
      return null;
    } finally {
      channelPromise = null;
    }
  })();

  return channelPromise;
}

export interface PostCreatedEvent {
  eventId: string;
  type: "POST_CREATED";
  timestamp: string;
  data: {
    postId: string;
    content: string;
    authorId: string;
    authorUsername: string;
    authorName: string;
  };
}

export async function publishEvent(
  routingKey: string,
  payload: Record<string, any>
): Promise<boolean> {
  try {
    const ch = await getRabbitChannel();
    if (!ch) {
      console.warn(`[rabbitmq] Skipped publishing to "${routingKey}" — broker offline`);
      return false;
    }

    const messageBuffer = Buffer.from(JSON.stringify(payload));
    const published = ch.publish(EXCHANGES.EVENTS, routingKey, messageBuffer, {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
    });

    console.log(`[rabbitmq] Published event to ${routingKey} (size: ${messageBuffer.length}b)`);
    return published;
  } catch (err: any) {
    console.warn(`[rabbitmq] Failed to publish event to ${routingKey}:`, err.message);
    return false;
  }
}
