import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { getHall } from "../lib/afisha.js";

export default defineTool({
  description: prompt`
    Схема зала и свободные места для сеанса (sessionId из list_schedule).
    Возвращает цены и список доступных ряд/место.
  `,
  effect: "read",
  inputSchema: z.object({
    sessionId: z.number().int().positive(),
    limit: z.number().int().min(1).max(200).optional().describe("Сколько мест вернуть (по умолчанию 40)"),
  }),
  async execute({ sessionId, limit }) {
    const result = await getHall(sessionId);
    if (!result.ok) {
      return { ok: false as const, status: result.status, error: result.error };
    }
    const cap = limit ?? 40;
    return {
      ok: true as const,
      ...result.data,
      availableSeats: result.data.availableSeats.slice(0, cap),
      truncated: result.data.availableSeats.length > cap,
    };
  },
});
