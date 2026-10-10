import { defineEval, includes } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "november-available",
      description: "Lists November sessions via list_schedule and does not purchase.",
      async test(t) {
        await t.send(
          "Покажи спектакли театра Озеро на ноябрь 2026 с доступными билетами. Не покупай.",
        );
        t.succeeded();
        t.calledTool("list_schedule");
        t.notCalledTool("purchase_tickets");
        t.check(t.reply, includes(/Озеро|сеанс|билет|ноябр/i));
      },
    },
  ],
});
