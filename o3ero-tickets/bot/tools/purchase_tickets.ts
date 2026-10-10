import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { purchaseTickets } from "../lib/afisha.js";
import { PROFILE_KEY, type BuyerProfile } from "../lib/buyer.js";


export default defineTool({
  description: prompt`
    Купить билеты театра «Озеро» через официальный Afisha widget API:
    корзина → места → заказ → контакты → платёжная сессия.
    Без confirm=true только dry-run (выбор мест, без удержания).
    Карточные данные не принимаются — оплата по ссылке/QR от Afisha.
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
      .optional()
      .describe("Конкретные места; иначе самые дешёвые доступные"),
    maxPrice: z.number().positive().optional().describe("Макс. цена одного места"),
    paymentType: z.enum(["QrPay", "SberPay", "Card"]).optional(),
    phone: z.string().min(10).max(32).optional(),
    email: z.string().email().optional(),
    confirm: z
      .boolean()
      .default(false)
      .describe("true — создать заказ и платёж; false — только dry-run"),
  }),
  async execute(input, ctx) {
    const stored = (await ctx.host.kv.get(PROFILE_KEY)) as BuyerProfile | undefined;
    const phone = input.phone ?? stored?.phone;
    const email = input.email ?? stored?.email;
    const paymentType = input.paymentType ?? stored?.preferredPaymentType ?? "QrPay";

    if (input.confirm && (!phone || !email)) {
      return {
        ok: false as const,
        error: "Нужны phone и email (аргументы или save_buyer_profile).",
      };
    }

    const result = await purchaseTickets({
      sessionId: input.sessionId,
      quantity: input.seats?.length ?? input.quantity,
      seats: input.seats,
      maxPrice: input.maxPrice,
      phone: phone ?? "",
      email: email ?? "",
      paymentType,
      dryRun: !input.confirm,
    });

    if (!result.ok) {
      return { ok: false as const, status: result.status, error: result.error };
    }

    if (input.confirm && result.data.orderId) {
      await ctx.host.kv.put(`o3ero:last_order:${ctx.session.id}`, {
        orderId: result.data.orderId,
        cartId: result.data.cartId ?? null,
        sessionId: result.data.sessionId,
        at: new Date().toISOString(),
      });
    }

    return { ok: true as const, ...result.data };
  },
});
