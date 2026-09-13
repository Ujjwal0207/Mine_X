import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./config/db";
import {
  getRabbitChannel,
  QUEUES,
  PostCreatedEvent,
} from "./config/rabbitmq";

const MAX_RETRIES = 3;

/**
 * Extract all unique @usernames mentioned in the content
 */
function extractMentions(content: string, authorUsername: string): string[] {
  const matches = content.match(/@([a-zA-Z0-9_]+)/g) || [];
  const usernames = matches.map((m) => m.slice(1).toLowerCase());
  // Exclude self-mentions and duplicates
  return Array.from(new Set(usernames)).filter(
    (u) => u !== authorUsername.toLowerCase()
  );
}

/**
 * Extract all unique #hashtags in the content
 */
function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]+)/g) || [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase())));
}

/**
 * Process a single POST_CREATED event
 */
async function handlePostCreated(event: PostCreatedEvent): Promise<void> {
  const { postId, content, authorId, authorUsername } = event.data;

  console.log(`[worker] Processing post.created for post: ${postId} by @${authorUsername}`);

  // 1. Process Hashtags
  const hashtags = extractHashtags(content);
  if (hashtags.length > 0) {
    console.log(`[worker] Extracted ${hashtags.length} hashtag(s): #${hashtags.join(", #")}`);
  }

  // 2. Process User Mentions & Dispatch Notifications
  const mentionedUsernames = extractMentions(content, authorUsername);
  if (mentionedUsernames.length > 0) {
    console.log(`[worker] Found ${mentionedUsernames.length} mention(s): @${mentionedUsernames.join(", @")}`);

    for (const username of mentionedUsernames) {
      const recipient = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: "insensitive",
          },
        },
        select: { id: true, username: true },
      });

      if (recipient) {
        const snippet = content.length > 60 ? `${content.slice(0, 60)}...` : content;
        await prisma.notification.create({
          data: {
            userId: recipient.id,
            actorId: authorId,
            type: "MENTION",
            entityId: postId,
            content: `@${authorUsername} mentioned you: "${snippet}"`,
          },
        });
        console.log(`[worker] Notification created for recipient @${recipient.username}`);
      } else {
        console.log(`[worker] Mentioned user @${username} does not exist. Skipped.`);
      }
    }
  }

  console.log(`[worker] Successfully finished tasks for post ${postId}`);
}

async function startWorker() {
  console.log("==================================================");
  console.log("   Mini X Background Worker (RabbitMQ Consumer)   ");
  console.log("==================================================");

  const channel = await getRabbitChannel();
  if (!channel) {
    console.error("[worker] FATAL: Could not connect to RabbitMQ broker. Retrying in 5 seconds...");
    setTimeout(startWorker, 5000);
    return;
  }

  // Fair dispatch: don't give more than 10 unacknowledged messages to a single worker
  await channel.prefetch(10);

  console.log(`[worker] Waiting for messages on queue "${QUEUES.POST_CREATED}"...`);

  channel.consume(
    QUEUES.POST_CREATED,
    async (msg) => {
      if (!msg) return;

      const headers = msg.properties.headers || {};
      const retryCount = (headers["x-retry-count"] as number) || 0;

      try {
        const rawContent = msg.content.toString();
        const event = JSON.parse(rawContent) as PostCreatedEvent;

        await handlePostCreated(event);

        // Acknowledge successful processing
        channel.ack(msg);
      } catch (err: any) {
        console.error(`[worker] Error processing message (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err.message);

        if (retryCount < MAX_RETRIES) {
          // Retry with incremented count
          channel.ack(msg); // Remove original
          channel.sendToQueue(QUEUES.POST_CREATED, msg.content, {
            headers: {
              ...headers,
              "x-retry-count": retryCount + 1,
            },
            persistent: true,
          });
          console.log(`[worker] Requeued message for retry #${retryCount + 1}`);
        } else {
          // Dead-letter: reject without requeue, moving to DLQ (post.created.dlq)
          console.error(`[worker] Max retries reached (${MAX_RETRIES}). Moving message to Dead-Letter Queue.`);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log("\n[worker] Gracefully shutting down worker...");
    try {
      await channel.close();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorker().catch((err) => {
  console.error("[worker] Uncaught error in worker runner:", err);
});
