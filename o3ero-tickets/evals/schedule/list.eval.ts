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
    {
      id: "after-show-dry-run",
      description: "After picking a show, uses select_show without confirming purchase.",
      async test(t) {
        await t.send(
          "Хочу «Черное пальто» в декабре 2026, 1 билет. Пока только подбери места, не покупай.",
        );
        t.succeeded();
        t.calledTool("select_show");
        t.notCalledTool("purchase_tickets", {
          input: { confirm: true },
        });
        t.check(t.reply, includes(/черн|пальто|мест|ряд|1500|сеанс/i));
      },
    },
  ],
});
