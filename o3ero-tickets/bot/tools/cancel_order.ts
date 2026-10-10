import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { cancelOrder } from "../lib/afisha.js";

export default defineTool({
  description: prompt`
    Отменить неоплаченный заказ Afisha и снять hold с мест.
    Вызывай, если покупка сорвалась или пользователь передумал до оплаты.
  `,
  effect: "write",
  inputSchema: z.object({
    orderId: z.string().uuid(),
  }),
  async execute({ orderId }) {
    const result = await cancelOrder(orderId);
    if (!result.ok) {
      return { ok: false as const, status: result.status, error: result.error };
    }
    return { ok: true as const, cancelled: true, orderId };
  },
});
