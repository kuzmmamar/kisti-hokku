/** Afisha widget API client for театр «Озеро» (o3ero.ru). */

export const WIDGET_KEY =
  process.env.O3ERO_AFISHA_WIDGET_KEY ??
  "8c8b93e0-bf87-4821-ada4-ed21f4a52197";

export const PLACE_ID = Number(process.env.O3ERO_PLACE_ID ?? "142717");

export const MAPI_BASE =
  process.env.O3ERO_MAPI_BASE ?? "https://mapi.afisha.ru/api/v21";

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export type AfishaError = {
  ok: false;
  status: number;
  error: Json;
};

export type AfishaOk<T> = {
  ok: true;
  status: number;
  data: T;
};

export type AfishaResult<T> = AfishaOk<T> | AfishaError;

export type ScheduleSession = {
  id: number;
  time: string;
  minPrice?: number;
  hasAvailablePlaces: boolean;
  hallName?: string;
  creationId: number;
  creationName: string;
  ageRestriction?: number;
};

export type SeatPick = {
  levelId: string;
  levelName: string;
  seatId: string;
  row: string;
  seat: string;
  seatTypeId: string;
  seatTypeName: string;
  ticketTypeId: string;
  ticketTypeTicketPrice: number;
  ticketTypeFee: number;
  ticketTypeTitle: string;
  price: number;
};

type HallSeat = {
  id: string;
  number: string;
  seatTypeId: string;
  isAvailable?: boolean;
  seatStatus?: string;
};

type HallRow = { number: string; seats: HallSeat[] };

type SeatType = {
  id: string;
  name: string;
  price: number;
  fee?: number;
  ticketTypes: Array<{
    id: string;
    title: string;
    price: number;
    fee?: number;
  }>;
};

type HallLevel = {
  id: string;
  name: string;
  rows: HallRow[];
  seatTypes: SeatType[];
};

export type HallSummary = {
  sessionId: number;
  hallName: string;
  maxTicketsCount: number;
  availableCount: number;
  seatTypes: Array<{ id: string; name: string; price: number; quantity: number }>;
  availableSeats: Array<{
    row: string;
    seat: string;
    seatId: string;
    price: number;
    seatTypeId: string;
  }>;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<AfishaResult<T>> {
  const res = await fetch(`${MAPI_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Application-key": WIDGET_KEY,
      "User-Agent": "o3ero-tickets-bot/0.1 (+https://o3ero.ru)",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Json = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Json;
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
  }
  if (res.status < 200 || res.status >= 300) {
    return { ok: false, status: res.status, error: parsed };
  }
  return { ok: true, status: res.status, data: parsed as T };
}

export function monthParam(when?: string): string {
  if (!when) {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}$/.test(when)) return when;
  if (/^\d{4}-\d{2}-\d{2}/.test(when)) return when.slice(0, 7);
  return when;
}

/** Search current month and the next one when month is omitted. */
export async function findShowSessions(opts: {
  query: string;
  month?: string;
  date?: string;
  onlyAvailable?: boolean;
}): Promise<AfishaResult<{ months: string[]; sessions: ScheduleSession[] }>> {
  const months = opts.month
    ? [monthParam(opts.month)]
    : opts.date
      ? [monthParam(opts.date)]
      : (() => {
          const d = new Date();
          const m1 = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
          const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
          const m2 = `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}`;
          return [m1, m2];
        })();

  const all: ScheduleSession[] = [];
  for (const month of months) {
    const page = await listSchedule({
      month,
      query: opts.query,
      onlyAvailable: opts.onlyAvailable,
    });
    if (!page.ok) return page;
    all.push(...page.data.sessions);
  }

  let sessions = all;
  if (opts.date) {
    const day = opts.date.slice(0, 10);
    sessions = sessions.filter((s) => s.time.startsWith(day));
  }
  sessions.sort((a, b) => a.time.localeCompare(b.time));
  return { ok: true, status: 200, data: { months, sessions } };
}

export function pickBestSession(
  sessions: ScheduleSession[],
  opts?: { preferAvailable?: boolean },
): ScheduleSession | undefined {
  if (sessions.length === 0) return undefined;
  const prefer = opts?.preferAvailable !== false;
  const available = sessions.filter((s) => s.hasAvailablePlaces);
  const pool = prefer && available.length > 0 ? available : sessions;
  return pool[0];
}

export async function listSchedule(opts: {
  month?: string;
  onlyAvailable?: boolean;
  query?: string;
}): Promise<AfishaResult<{ month: string; sessions: ScheduleSession[] }>> {
  const month = monthParam(opts.month);
  const result = await request<{
    creationSchedules?: Array<{
      creation: {
        id: number;
        name: string;
        ageRestriction?: number;
      };
      sessions: Array<{
        id: number;
        time: string;
        minPrice?: number;
        hasAvailablePlaces: boolean;
        hallName?: string;
        creationId: number;
      }>;
    }>;
  }>("GET", `/places/${PLACE_ID}/schedule?month=${encodeURIComponent(month)}`);

  if (!result.ok) return result;

  const q = opts.query?.trim().toLowerCase();
  const sessions: ScheduleSession[] = [];
  for (const block of result.data.creationSchedules ?? []) {
    const name = block.creation.name;
    if (q && !name.toLowerCase().includes(q)) continue;
    for (const s of block.sessions) {
      if (opts.onlyAvailable && !s.hasAvailablePlaces) continue;
      sessions.push({
        id: s.id,
        time: s.time,
        minPrice: s.minPrice,
        hasAvailablePlaces: s.hasAvailablePlaces,
        hallName: s.hallName,
        creationId: block.creation.id,
        creationName: name,
        ageRestriction: block.creation.ageRestriction,
      });
    }
  }
  sessions.sort((a, b) => a.time.localeCompare(b.time));
  return { ok: true, status: result.status, data: { month, sessions } };
}

export async function getHall(sessionId: number): Promise<AfishaResult<HallSummary>> {
  const result = await request<{
    name?: string;
    maxTicketsCount?: number;
    levels?: HallLevel[];
  }>("GET", `/hall/${sessionId}`);
  if (!result.ok) return result;

  const levels = result.data.levels ?? [];
  const availableSeats: HallSummary["availableSeats"] = [];
  const seatTypeMeta = new Map<string, { id: string; name: string; price: number; quantity: number }>();

  for (const level of levels) {
    for (const st of level.seatTypes ?? []) {
      seatTypeMeta.set(st.id, {
        id: st.id,
        name: st.name,
        price: st.price,
        quantity: 0,
      });
    }
    for (const row of level.rows ?? []) {
      for (const seat of row.seats ?? []) {
        if (!seat.isAvailable) continue;
        const meta = seatTypeMeta.get(seat.seatTypeId);
        const price = meta?.price ?? 0;
        if (meta) meta.quantity += 1;
        availableSeats.push({
          row: String(row.number),
          seat: String(seat.number),
          seatId: seat.id,
          price,
          seatTypeId: seat.seatTypeId,
        });
      }
    }
  }

  availableSeats.sort(
    (a, b) => a.price - b.price || a.row.localeCompare(b.row) || a.seat.localeCompare(b.seat),
  );

  return {
    ok: true,
    status: result.status,
    data: {
      sessionId,
      hallName: result.data.name ?? "Зал",
      maxTicketsCount: result.data.maxTicketsCount ?? 10,
      availableCount: availableSeats.length,
      seatTypes: [...seatTypeMeta.values()].sort((a, b) => a.price - b.price),
      availableSeats,
    },
  };
}

async function loadHallLevels(sessionId: number): Promise<AfishaResult<HallLevel[]>> {
  const result = await request<{ levels?: HallLevel[] }>("GET", `/hall/${sessionId}`);
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: result.data.levels ?? [] };
}

export function resolveSeatPicks(
  levels: HallLevel[],
  opts: {
    quantity: number;
    seats?: Array<{ row: string; seat: string }>;
    maxPrice?: number;
  },
): { picks: SeatPick[]; error?: string } {
  const catalog: Array<{
    level: HallLevel;
    row: string;
    seat: HallSeat;
    stype: SeatType;
    tt: SeatType["ticketTypes"][number];
  }> = [];

  for (const level of levels) {
    const types = new Map((level.seatTypes ?? []).map((t) => [t.id, t]));
    for (const row of level.rows ?? []) {
      for (const seat of row.seats ?? []) {
        if (!seat.isAvailable) continue;
        const stype = types.get(seat.seatTypeId);
        const tt = stype?.ticketTypes?.[0];
        if (!stype || !tt) continue;
        if (opts.maxPrice !== undefined && stype.price > opts.maxPrice) continue;
        catalog.push({ level, row: String(row.number), seat, stype, tt });
      }
    }
  }

  const toPick = (item: (typeof catalog)[number]): SeatPick => ({
    levelId: item.level.id,
    levelName: item.level.name,
    seatId: item.seat.id,
    row: item.row,
    seat: String(item.seat.number),
    seatTypeId: item.seat.seatTypeId,
    seatTypeName: item.stype.name,
    ticketTypeId: item.tt.id,
    ticketTypeTicketPrice: item.tt.price,
    ticketTypeFee: item.tt.fee ?? item.stype.fee ?? 0,
    ticketTypeTitle: item.tt.title,
    price: item.stype.price,
  });

  if (opts.seats?.length) {
    const picks: SeatPick[] = [];
    for (const want of opts.seats) {
      const found = catalog.find(
        (c) => c.row === String(want.row) && String(c.seat.number) === String(want.seat),
      );
      if (!found) {
        return { picks: [], error: `Место ряд ${want.row} место ${want.seat} недоступно` };
      }
      picks.push(toPick(found));
    }
    return { picks };
  }

  catalog.sort(
    (a, b) =>
      a.stype.price - b.stype.price ||
      a.row.localeCompare(b.row) ||
      String(a.seat.number).localeCompare(String(b.seat.number)),
  );
  if (catalog.length < opts.quantity) {
    return {
      picks: [],
      error: `Доступно только ${catalog.length} мест (нужно ${opts.quantity})`,
    };
  }
  return { picks: catalog.slice(0, opts.quantity).map(toPick) };
}

export async function purchaseTickets(opts: {
  sessionId: number;
  quantity: number;
  seats?: Array<{ row: string; seat: string }>;
  maxPrice?: number;
  phone: string;
  email: string;
  paymentType: "QrPay" | "SberPay" | "Card";
  widgetCloseUrl?: string;
  dryRun?: boolean;
}): Promise<
  AfishaResult<{
    dryRun: boolean;
    sessionId: number;
    seats: Array<{ row: string; seat: string; price: number; seatId: string }>;
    estimatedTicketSum: number;
    cartId?: string;
    orderId?: string;
    orderSum?: number;
    paymentType?: string;
    payment?: Json;
    note: string;
  }>
> {
  const levelsResult = await loadHallLevels(opts.sessionId);
  if (!levelsResult.ok) return levelsResult;

  const { picks, error } = resolveSeatPicks(levelsResult.data, {
    quantity: opts.quantity,
    seats: opts.seats,
    maxPrice: opts.maxPrice,
  });
  if (error) {
    return { ok: false, status: 400, error: { message: error } };
  }

  const seatSummary = picks.map((p) => ({
    row: p.row,
    seat: p.seat,
    price: p.price,
    seatId: p.seatId,
  }));
  const estimatedTicketSum = picks.reduce((sum, p) => sum + p.price, 0);

  if (opts.dryRun) {
    return {
      ok: true,
      status: 200,
      data: {
        dryRun: true,
        sessionId: opts.sessionId,
        seats: seatSummary,
        estimatedTicketSum,
        note: "dry_run: места выбраны, заказ не создан. Повторите с confirm=true.",
      },
    };
  }

  const cartResult = await request<{ id: string }>("POST", "/carts", {
    sessionId: opts.sessionId,
  });
  if (!cartResult.ok) return cartResult;
  const cartId = cartResult.data.id;

  const ticketBodies = picks.map((p) => ({
    levelId: p.levelId,
    levelName: p.levelName,
    seatId: p.seatId,
    row: p.row,
    seat: p.seat,
    seatTypeId: p.seatTypeId,
    seatTypeName: p.seatTypeName,
    ticketTypeId: p.ticketTypeId,
    ticketTypeTicketPrice: p.ticketTypeTicketPrice,
    ticketTypeFee: p.ticketTypeFee,
    ticketTypeTitle: p.ticketTypeTitle,
  }));

  const ticketsResult = await request<{ id: string; totalPrice?: number }>(
    "POST",
    `/carts/${cartId}/ticket`,
    ticketBodies,
  );
  if (!ticketsResult.ok) return ticketsResult;

  const orderResult = await request<{
    order?: { id: string; sum?: number };
    cartId?: string;
  }>("POST", "/orders", { cartId });
  if (!orderResult.ok) return orderResult;

  const orderId = orderResult.data.order?.id;
  if (!orderId) {
    return {
      ok: false,
      status: 500,
      error: { message: "order id missing", body: orderResult.data as unknown as Json },
    };
  }

  const contactsResult = await request(
    "PATCH",
    `/orders/${orderId}/contacts`,
    { phone: opts.phone, email: opts.email },
  );
  if (!contactsResult.ok) {
    await request("DELETE", `/orders/${orderId}`);
    return contactsResult;
  }

  const payTypeResult = await request("PATCH", `/orders/${orderId}/paymenttypes`, {
    id: opts.paymentType,
    paymentType: opts.paymentType,
  });
  if (!payTypeResult.ok) {
    // keep order; payment type may already be set
  }

  const paymentResult = await request<Json>("POST", `/payments/${orderId}`, {
    widgetCloseUrl: opts.widgetCloseUrl ?? "https://o3ero.ru/",
  });

  return {
    ok: true,
    status: 200,
    data: {
      dryRun: false,
      sessionId: opts.sessionId,
      seats: seatSummary,
      estimatedTicketSum,
      cartId,
      orderId,
      orderSum: orderResult.data.order?.sum,
      paymentType: opts.paymentType,
      payment: paymentResult.ok ? paymentResult.data : { error: paymentResult.error },
      note: paymentResult.ok
        ? "Заказ создан. Откройте ссылку/QR из payment и завершите оплату."
        : "Заказ создан, но payment API вернул ошибку — проверьте orderId / cancel_order.",
    },
  };
}

export async function cancelOrder(orderId: string): Promise<AfishaResult<{ orderId: string }>> {
  const result = await request("DELETE", `/orders/${orderId}`);
  if (!result.ok) return result;
  return { ok: true, status: result.status, data: { orderId } };
}

export async function getOrder(orderId: string): Promise<AfishaResult<Json>> {
  return request("GET", `/orders/${orderId}`);
}
