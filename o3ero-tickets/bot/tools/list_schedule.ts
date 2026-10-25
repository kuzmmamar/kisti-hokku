import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { listSchedule } from "../lib/afisha.js";

export default defineTool({
  description: prompt`
    Список сеансов театра «Озеро» (площадка «Внутри») через Afisha.
    Используй для афиши, поиска по названию и проверки наличия билетов.
  `,
  effect: "read",
  inputSchema: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional()
      .describe("Месяц YYYY-MM, по умолчанию текущий"),
    onlyAvailable: z
      .boolean()
      .optional()
      .describe("Только сеансы с hasAvailablePlaces=true"),
    query: z.string().max(120).optional().describe("Фильтр по названию спектакля"),
  }),
  async execute(input) {
    const result = await listSchedule(input);
    if (!result.ok) {
      return { ok: false as const, status: result.status, error: result.error };
    }
    return {
      ok: true as const,
      place: "Пространство «Внутри» / театр Озеро",
      source: "https://o3ero.ru/show",
      ...result.data,
    };
  },
});
