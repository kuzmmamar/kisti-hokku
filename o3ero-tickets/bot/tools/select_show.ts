import { prompt } from "@cursor/bdk";
import type { HostKvApi, JsonValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import {
  findShowSessions,
  pickBestSession,
  purchaseTickets,
  type ScheduleSession,
} from "../lib/afisha.js";
import {
  PROFILE_KEY,
  profileReadyForPurchase,
  toTicketPerson,
  type BuyerProfile,
} from "../lib/buyer.js";
import { WATCHES_KEY, newWatchId, type WatchTarget } from "../lib/watch.js";

function asJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

export default defineTool({
  description: prompt`
    После выбора спектакля: найти сеанс, подобрать места и оформить покупку
    (или поставить watch с autoBuy, если билетов ещё нет).
    Без confirm=true — только план/dry-run. С confirm=true — реальный заказ.
  `,
  effect: (input) => (input.confirm || input.watchIfUnavailable ? "write" : "read"),
  inputSchema: z.object({
    show: z.string().min(1).max(160).describe("Название спектакля"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    sessionId: z.number().int().positive().optional(),
    quantity: z.number().int().min(1).max(10).default(2),
    seats: z
      .array(z.object({ row: z.string().min(1), seat: z.string().min(1) }))
      .max(10)
      .optional(),
    maxPrice: z.number().positive().optional(),
    paymentType: z.enum(["QrPay", "SberPay", "Card"]).optional(),
    watchIfUnavailable: z.boolean().default(true),
    autoBuy: z.boolean().default(true),
    confirm: z.boolean().default(false),
  }),
  async execute(input, ctx) {
    const kv = ctx.host.kv;
    const stored = (await ctx.host.kv.get(PROFILE_KEY)) as BuyerProfile | undefined;
    const paymentType = input.paymentType ?? stored?.preferredPaymentType ?? "QrPay";

    const resolved = await resolveSession(input);
    if (!resolved.ok) return resolved;
    const { selected, alternatives } = resolved;

    if (!selected.hasAvailablePlaces) {
      if (!input.watchIfUnavailable) {
        return {
          ok: true as const,
          phase: "unavailable" as const,
          selected,
          alternatives,
          note: "Мест нет. Включи watchIfUnavailable или выбери другой сеанс.",
        };
      }
      const watch = await armWatch(kv, {
        show: input.show,
        creationId: selected.creationId,
        sessionId: selected.id,
        date: input.date,
        quantity: input.quantity,
        maxPrice: input.maxPrice,
        paymentType,
        autoBuy: input.autoBuy,
      });
      return {
        ok: true as const,
        phase: "watching" as const,
        selected,
        alternatives,
        watch,
        note: "После выбора спектакля мест нет — watch с autoBuy. Schedule ticket_watch выкупит при появлении.",
      };
    }

    if (input.confirm) {
      const missing = profileReadyForPurchase(stored);
      if (missing) {
        return {
          ok: false as const,
          error: missing,
          selected,
          alternatives,
        };
      }
    }

    const person = stored ? toTicketPerson(stored) : undefined;
    const result = await purchaseTickets({
      sessionId: selected.id,
      quantity: input.seats?.length ?? input.quantity,
      seats: input.seats,
      maxPrice: input.maxPrice,
      phone: stored?.phone ?? "",
      email: stored?.email ?? "",
      person,
      paymentType,
      dryRun: !input.confirm,
    });

    if (!result.ok) {
      if (input.watchIfUnavailable) {
        const watch = await armWatch(kv, {
          show: input.show,
          creationId: selected.creationId,
          sessionId: selected.id,
          date: input.date,
          quantity: input.quantity,
          maxPrice: input.maxPrice,
          paymentType,
          autoBuy: input.autoBuy,
        });
        return {
          ok: true as const,
          phase: "watching" as const,
          selected,
          alternatives,
          watch,
          afishaError: asJson(result.error),
          note: "Покупка не удалась — watch включён.",
        };
      }
      return {
        ok: false as const,
        status: result.status,
        error: asJson(result.error),
        selected,
        alternatives,
      };
    }

    if (input.confirm && result.data.orderId) {
      await kv.put(
        `o3ero:last_order:${ctx.session.id}`,
        asJson({
          orderId: result.data.orderId,
          cartId: result.data.cartId ?? null,
          sessionId: result.data.sessionId,
          at: new Date().toISOString(),
        }),
      );
    }

    return {
      ok: true as const,
      phase: input.confirm ? ("purchased" as const) : ("ready" as const),
      selected,
      alternatives,
      ...result.data,
      payment: result.data.payment ? asJson(result.data.payment) : null,
      note: input.confirm
        ? "Заказ создан. Заверши оплату по payment (QR/SberPay/карта)."
        : "После выбора спектакля места подобраны (dry-run). Для покупки — confirm=true.",
    };
  },
});

async function resolveSession(input: {
  show: string;
  date?: string;
  month?: string;
  sessionId?: number;
}): Promise<
  | {
      ok: true;
      selected: ScheduleSession;
      alternatives: Array<{
        sessionId: number;
        time: string;
        creationName: string;
        minPrice?: number;
        hasAvailablePlaces: boolean;
      }>;
    }
  | { ok: false; error: string; hint?: string; status?: number; afishaError?: JsonValue }
> {
  const found = await findShowSessions({
    query: input.show,
    month: input.month,
    date: input.date,
  });
  if (!found.ok) {
    return {
      ok: false,
      status: found.status,
      error: "Афиша недоступна",
      afishaError: asJson(found.error),
    };
  }
  if (found.data.sessions.length === 0) {
    return {
      ok: false,
      error: `Спектакль «${input.show}» не найден (${found.data.months.join(", ")}).`,
      hint: "Уточни название или месяц.",
    };
  }

  const alternatives = found.data.sessions.slice(0, 8).map((s) => ({
    sessionId: s.id,
    time: s.time,
    creationName: s.creationName,
    minPrice: s.minPrice,
    hasAvailablePlaces: s.hasAvailablePlaces,
  }));

  if (input.sessionId) {
    const hit = found.data.sessions.find((s) => s.id === input.sessionId);
    if (!hit) {
      return {
        ok: false,
        error: `sessionId ${input.sessionId} не относится к «${input.show}».`,
        hint: "Возьми sessionId из alternatives.",
      };
    }
    return { ok: true, selected: hit, alternatives };
  }

  const selected = pickBestSession(found.data.sessions);
  if (!selected) {
    return { ok: false, error: "Нет подходящего сеанса." };
  }
  return { ok: true, selected, alternatives };
}

async function armWatch(
  kv: HostKvApi,
  opts: {
    show: string;
    creationId?: number;
    sessionId?: number;
    date?: string;
    quantity: number;
    maxPrice?: number;
    paymentType: "QrPay" | "SberPay" | "Card";
    autoBuy: boolean;
  },
): Promise<WatchTarget> {
  const existing = ((await kv.get(WATCHES_KEY)) as WatchTarget[] | undefined) ?? [];
  const watch: WatchTarget = {
    id: newWatchId(),
    creationQuery: opts.show,
    creationId: opts.creationId,
    sessionId: opts.sessionId,
    date: opts.date,
    quantity: opts.quantity,
    maxPrice: opts.maxPrice,
    paymentType: opts.paymentType,
    autoBuy: opts.autoBuy,
    createdAt: new Date().toISOString(),
    lastStatus: "armed",
  };
  const active = existing.filter((w) => !w.fulfilledOrderId);
  await kv.put(WATCHES_KEY, asJson([...active, watch].slice(-20)));
  return watch;
}
