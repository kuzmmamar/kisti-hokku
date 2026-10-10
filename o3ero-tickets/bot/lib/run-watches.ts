import type { HostKvApi, JsonValue } from "@cursor/bdk";
import { findShowSessions, pickBestSession, purchaseTickets } from "./afisha.js";
import { PROFILE_KEY, type BuyerProfile } from "./buyer.js";
import { WATCHES_KEY, type WatchTarget } from "./watch.js";

export type WatchRunResult = {
  checked: number;
  purchased: Array<{ watchId: string; orderId: string; sessionId: number }>;
  waiting: Array<{ watchId: string; status: string }>;
  errors: Array<{ watchId: string; error: string }>;
};

function errText(err: unknown): string {
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Deterministic watch pass for schedule + tools. */
export async function runWatches(kv: HostKvApi): Promise<WatchRunResult> {
  const watches = ((await kv.get(WATCHES_KEY)) as WatchTarget[] | undefined) ?? [];
  const profile = (await kv.get(PROFILE_KEY)) as BuyerProfile | undefined;
  const active = watches.filter((w) => !w.fulfilledOrderId);
  const purchased: WatchRunResult["purchased"] = [];
  const waiting: WatchRunResult["waiting"] = [];
  const errors: WatchRunResult["errors"] = [];
  const next: WatchTarget[] = [...watches.filter((w) => w.fulfilledOrderId)];

  for (const watch of active) {
    const checkedAt = new Date().toISOString();
    try {
      let sessionId = watch.sessionId;
      if (!sessionId || watch.creationQuery) {
        const found = await findShowSessions({
          query: watch.creationQuery,
          date: watch.date,
          onlyAvailable: false,
        });
        if (!found.ok) {
          errors.push({ watchId: watch.id, error: errText(found.error) });
          next.push({ ...watch, lastCheckedAt: checkedAt, lastStatus: "afisha_error" });
          continue;
        }
        const match = watch.sessionId
          ? found.data.sessions.find((s) => s.id === watch.sessionId)
          : pickBestSession(found.data.sessions);
        if (!match) {
          waiting.push({ watchId: watch.id, status: "no_session" });
          next.push({ ...watch, lastCheckedAt: checkedAt, lastStatus: "no_session" });
          continue;
        }
        sessionId = match.id;
        if (!match.hasAvailablePlaces) {
          waiting.push({ watchId: watch.id, status: "no_places" });
          next.push({
            ...watch,
            sessionId,
            lastCheckedAt: checkedAt,
            lastStatus: "no_places",
          });
          continue;
        }
      }

      if (!watch.autoBuy) {
        waiting.push({ watchId: watch.id, status: "available_notify_only" });
        next.push({
          ...watch,
          sessionId,
          lastCheckedAt: checkedAt,
          lastStatus: "available_notify_only",
        });
        continue;
      }

      if (!profile?.phone || !profile?.email) {
        waiting.push({ watchId: watch.id, status: "missing_buyer_profile" });
        next.push({
          ...watch,
          sessionId,
          lastCheckedAt: checkedAt,
          lastStatus: "missing_buyer_profile",
        });
        continue;
      }

      const buy = await purchaseTickets({
        sessionId: sessionId!,
        quantity: watch.quantity,
        maxPrice: watch.maxPrice,
        phone: profile.phone,
        email: profile.email,
        paymentType: watch.paymentType ?? profile.preferredPaymentType ?? "QrPay",
        dryRun: false,
      });

      if (!buy.ok || !buy.data.orderId) {
        errors.push({
          watchId: watch.id,
          error: buy.ok ? "no_order_id" : errText(buy.error),
        });
        next.push({
          ...watch,
          sessionId,
          lastCheckedAt: checkedAt,
          lastStatus: "purchase_failed",
        });
        continue;
      }

      purchased.push({
        watchId: watch.id,
        orderId: buy.data.orderId,
        sessionId: sessionId!,
      });
      next.push({
        ...watch,
        sessionId,
        lastCheckedAt: checkedAt,
        lastStatus: "purchased",
        fulfilledOrderId: buy.data.orderId,
      });
    } catch (err) {
      errors.push({ watchId: watch.id, error: errText(err) });
      next.push({ ...watch, lastCheckedAt: checkedAt, lastStatus: "exception" });
    }
  }

  await kv.put(WATCHES_KEY, next as unknown as JsonValue);
  return { checked: active.length, purchased, waiting, errors };
}
