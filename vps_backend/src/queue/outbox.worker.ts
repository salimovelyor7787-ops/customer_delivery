import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { pgPool } from "../db/pool.js";
import { redis } from "./redis.js";
import { logger } from "../common/logger.js";

const queueName = "order-events";
const dlqName = "order-events-dlq";
const batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 100);

const queue = new Queue(queueName, { connection: redis });
const dlq = new Queue(dlqName, { connection: redis });

async function pumpOutboxOnce() {
  const rows = await pgPool.query<{
    id: number;
    order_id: string;
    event_type: "notification" | "telegram" | "analytics";
    payload: Record<string, unknown>;
  }>(
    `with picked as (
       select id, order_id, event_type, payload
       from order_events_outbox
       where status in ('pending','failed')
         and available_at <= now()
       order by created_at
       limit $1
       for update skip locked
     )
     update order_events_outbox o
        set status = 'processing',
            attempts = o.attempts + 1,
            error_message = null
      from picked p
      where o.id = p.id
     returning o.id, o.order_id, o.event_type, o.payload`,
    [batchSize],
  );

  for (const event of rows.rows) {
    await queue.add(
      event.event_type,
      { outbox_id: event.id, order_id: event.order_id, payload: event.payload },
      {
        removeOnComplete: 5000,
        removeOnFail: 5000,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    );
  }
}

async function markDone(id: number) {
  await pgPool.query(
    `update order_events_outbox
     set status = 'done', processed_at = now(), error_message = null
     where id = $1`,
    [id],
  );
}

async function markFailed(id: number, message: string) {
  await pgPool.query(
    `update order_events_outbox
     set status = 'failed',
         error_message = left($2, 600),
         available_at = now() + interval '30 seconds'
     where id = $1`,
    [id, message],
  );
}

new Worker(
  queueName,
  async (job) => {
    const outboxId = Number(job.data.outbox_id);
    try {
      // TODO: wire real adapters (push, telegram, analytics)
      logger.info({ eventType: job.name, orderId: job.data.order_id }, "Processing outbox event");
      await markDone(outboxId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      await markFailed(outboxId, message);
      if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        await dlq.add("dead-letter", { ...job.data, reason: message, failed_at: new Date().toISOString() }, { removeOnComplete: 2000 });
      }
      throw error;
    }
  },
  { connection: redis, concurrency: 20 },
);

setInterval(() => {
  void pumpOutboxOnce().catch((error) => logger.error({ error }, "Outbox pump failed"));
}, 1000);

void pumpOutboxOnce().catch((error) => logger.error({ error }, "Initial outbox pump failed"));
logger.info("Outbox worker started");
