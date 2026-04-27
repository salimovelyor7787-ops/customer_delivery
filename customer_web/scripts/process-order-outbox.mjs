import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE || 100);
const RETRY_SECONDS = Number(process.env.OUTBOX_RETRY_SECONDS || 30);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function handleEvent(event) {
  // TODO: replace with real integrations
  // - notification: send push/telegram
  // - analytics: write to analytics pipeline
  // - promo_log: send promo usage log
  if (event.event_type === "notification") {
    console.log(`[outbox] notification for order=${event.order_id}`);
    return;
  }
  if (event.event_type === "analytics") {
    console.log(`[outbox] analytics for order=${event.order_id}`);
    return;
  }
  if (event.event_type === "promo_log") {
    console.log(`[outbox] promo_log for order=${event.order_id}`);
    return;
  }
  throw new Error(`Unknown event_type: ${event.event_type}`);
}

async function processOnce() {
  const { data: events, error: claimErr } = await admin.rpc("claim_order_outbox_batch", {
    p_limit: BATCH_SIZE,
  });
  if (claimErr) throw claimErr;
  if (!events || events.length === 0) {
    console.log("[outbox] no pending events");
    return 0;
  }

  for (const event of events) {
    try {
      await handleEvent(event);
      const { error: completeErr } = await admin.rpc("complete_order_outbox_event", { p_id: event.id });
      if (completeErr) throw completeErr;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown outbox processing error";
      const { error: failErr } = await admin.rpc("fail_order_outbox_event", {
        p_id: event.id,
        p_error: message,
        p_retry_after_seconds: RETRY_SECONDS,
      });
      if (failErr) {
        console.error(`[outbox] failed to mark event ${event.id} as failed`, failErr);
      }
    }
  }

  console.log(`[outbox] processed batch size=${events.length}`);
  return events.length;
}

processOnce().catch((error) => {
  console.error("[outbox] worker failed", error);
  process.exitCode = 1;
});
