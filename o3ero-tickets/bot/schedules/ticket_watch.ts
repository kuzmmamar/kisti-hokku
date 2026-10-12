import { defineSchedule } from "@cursor/bdk/schedules";
import { runWatches } from "../lib/run-watches.js";

/** Poll watches every 5 minutes (UTC). Under --dev: POST /v1/dev/schedules/ticket_watch */
export default defineSchedule({
  cron: "*/5 * * * *",
  async run({ host }) {
    await runWatches(host.kv);
  },
});
