import { prompt } from "@cursor/bdk";
import type { JsonValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { WATCHES_KEY, newWatchId, type WatchTarget } from "../lib/watch.js";

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export default defineTool({
  description: prompt`
    Управление watch после выбора спектакля: list / set / clear.
    Watch с autoBuy=true выкупает места по cron ticket_watch.
  `,
  effect: (input) => (input.action === "list" ? "read" : "write"),
  inputSchema: z.discriminatedUnion("action", [
    z.object({ action: z.literal("list") }),
    z.object({
      action: z.literal("clear"),
      watchId: z.string().optional().describe("Без id — очистить все watch"),
    }),
    z.object({
      action: z.literal("set"),
      show: z.string().min(1).max(160),
      sessionId: z.number().int().positive().optional(),
      creationId: z.number().int().positive().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      quantity: z.number().int().min(1).max(10).default(2),
      maxPrice: z.number().positive().optional(),
      paymentType: z.enum(["QrPay", "SberPay", "Card"]).default("QrPay"),
      autoBuy: z.boolean().default(true),
    }),
  ]),
  async execute(input, ctx) {
    const existing = ((await ctx.host.kv.get(WATCHES_KEY)) as WatchTarget[] | undefined) ?? [];

    if (input.action === "list") {
      return { ok: true as const, watches: existing };
    }

    if (input.action === "clear") {
      const next = input.watchId
        ? existing.filter((w) => w.id !== input.watchId)
        : [];
      await ctx.host.kv.put(WATCHES_KEY, asJson(next));
      return { ok: true as const, cleared: true, remaining: next.length };
    }

    const watch: WatchTarget = {
      id: newWatchId(),
      creationQuery: input.show,
      creationId: input.creationId,
      sessionId: input.sessionId,
      date: input.date,
      quantity: input.quantity,
      maxPrice: input.maxPrice,
      paymentType: input.paymentType,
      autoBuy: input.autoBuy,
      createdAt: new Date().toISOString(),
      lastStatus: "armed",
    };
    const next = [...existing.filter((w) => !w.fulfilledOrderId), watch].slice(-20);
    await ctx.host.kv.put(WATCHES_KEY, asJson(next));
    return { ok: true as const, watch, count: next.length };
  },
});
