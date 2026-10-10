import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { runWatches } from "../lib/run-watches.js";

export default defineTool({
  description: prompt`
    Один проход по активным watch: проверить места и при autoBuy купить.
    Schedule ticket_watch вызывает ту же логику по cron; этот tool — ручной запуск.
  `,
  effect: "write",
  inputSchema: z.object({}).optional(),
  async execute(_input, ctx) {
    const result = await runWatches(ctx.host.kv);
    return { ok: true as const, ...result };
  },
});
