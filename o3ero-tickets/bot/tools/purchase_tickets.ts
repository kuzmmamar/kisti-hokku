import { prompt } from "@cursor/bdk";
import type { JsonValue } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { purchaseTickets } from "../lib/afisha.js";
import {
  PROFILE_KEY,
  profileReadyForPurchase,
  toTicketPerson,
  type BuyerProfile,
} from "../lib/buyer.js";

export default defineTool({
  description: prompt`
    Купить билеты театра «Озеро» через Afisha:
    корзина → места → ФИО/паспорт на билет → заказ → оплата.
    Без confirm=true только dry-run. Карты не принимаются.
  `,
  effect: (input) => (input.confirm ? "write" : "read"),
  inputSchema: z.object({
    sessionId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10).default(1),
    seats: z
      .array(
        z.object({
          row: z.string().min(1),
          seat: z.string().min(1),
        }),
      )
      .max(10)
      .optional(),
    maxPrice: z.number().positive().optional(),
    paymentType: z.enum(["QrPay", "SberPay", "Card"]).optional(),
    confirm: z.boolean().default(false),
  }),
  async execute(input, ctx) {
    const stored = (await ctx.host.kv.get(PROFILE_KEY)) as BuyerProfile | undefined;
    const paymentType = input.paymentType ?? stored?.preferredPaymentType ?? "QrPay";

    if (input.confirm) {
      const missing = profileReadyForPurchase(stored);
      if (missing) return { ok: false as const, error: missing };
    }

    const person = stored ? toTicketPerson(stored) : undefined;
    const result = await purchaseTickets({
      sessionId: input.sessionId,
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
      return { ok: false as const, status: result.status, error: result.error as JsonValue };
    }

    if (input.confirm && result.data.orderId) {
      await ctx.host.kv.put(
        `o3ero:last_order:${ctx.session.id}`,
        {
          orderId: result.data.orderId,
          cartId: result.data.cartId ?? null,
          sessionId: result.data.sessionId,
          at: new Date().toISOString(),
        } as unknown as JsonValue,
      );
    }

    return { ok: true as const, ...result.data, payment: result.data.payment as JsonValue };
  },
});
