import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { PROFILE_KEY, type BuyerProfile } from "../lib/buyer.js";

export default defineTool({
  description: prompt`
    Сохранить телефон и email покупателя в host.kv для последующих покупок.
    Не сохраняй номера карт — только контакты для Afisha checkout.
  `,
  effect: "write",
  inputSchema: z.object({
    phone: z.string().min(10).max(32).describe("Телефон в формате +7..."),
    email: z.string().email(),
    preferredPaymentType: z.enum(["QrPay", "SberPay", "Card"]).optional(),
  }),
  async execute(input, ctx) {
    const profile: BuyerProfile = {
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      preferredPaymentType: input.preferredPaymentType,
      updatedAt: new Date().toISOString(),
    };
    await ctx.host.kv.put(PROFILE_KEY, profile);
    return { ok: true as const, saved: true, profile };
  },
});

