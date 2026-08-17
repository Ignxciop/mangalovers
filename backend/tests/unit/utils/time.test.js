import { describe, it, expect } from "vitest";
import {
  getZonedParts,
  startOfDay,
  startOfWeek,
  startOfMonth,
  getWeekSeed,
} from "../../../src/utils/time.js";

describe("getZonedParts", () => {
  it("devuelve la fecha/hora local de America/Santiago (UTC-4)", () => {
    const parts = getZonedParts(new Date("2026-08-17T00:30:00Z"));
    expect(parts).toEqual({ y: 2026, m: 8, d: 16, h: 20, min: 30, s: 0, weekday: 0 });
  });

  it("resuelve el límite de medianoche de Santiago", () => {
    const parts = getZonedParts(new Date("2026-08-17T04:00:00Z"));
    expect(parts).toEqual({ y: 2026, m: 8, d: 17, h: 0, min: 0, s: 0, weekday: 1 });
  });

  it("aplica DST (UTC-3) durante el horario de verano", () => {
    const parts = getZonedParts(new Date("2026-10-25T12:00:00Z"));
    expect(parts.h).toBe(9);
    expect(parts.weekday).toBe(0);
  });
});

describe("startOfDay", () => {
  it("devuelve las 00:00 de Santiago (04:00 UTC)", () => {
    expect(startOfDay(new Date("2026-08-17T12:00:00Z")).toISOString())
      .toBe("2026-08-17T04:00:00.000Z");
  });

  it("respeta la zona horaria pasada explícitamente", () => {
    expect(startOfDay(new Date("2026-08-17T12:00:00Z"), "UTC").toISOString())
      .toBe("2026-08-17T00:00:00.000Z");
  });
});

describe("startOfWeek", () => {
  it("desde un martes devuelve el lunes 00:00 de Santiago", () => {
    expect(startOfWeek(new Date("2026-08-18T15:00:00Z")).toISOString())
      .toBe("2026-08-17T04:00:00.000Z");
  });

  it("un domingo 23:59 pertenece al lunes de esa misma semana", () => {
    expect(startOfWeek(new Date("2026-08-24T03:59:00Z")).toISOString())
      .toBe("2026-08-17T04:00:00.000Z");
  });

  it("un lunes 00:00 devuelve el mismo instante", () => {
    expect(startOfWeek(new Date("2026-08-24T04:00:00Z")).toISOString())
      .toBe("2026-08-24T04:00:00.000Z");
  });

  it("respeta el cambio de hora (DST)", () => {
    expect(startOfWeek(new Date("2026-10-25T12:00:00Z")).toISOString())
      .toBe("2026-10-19T03:00:00.000Z");
  });
});

describe("startOfMonth", () => {
  it("devuelve el día 1 a las 00:00 de Santiago", () => {
    expect(startOfMonth(new Date("2026-08-17T04:30:00Z")).toISOString())
      .toBe("2026-08-01T04:00:00.000Z");
  });
});

describe("getWeekSeed", () => {
  it("calcula la seed de semana con el calendario de Santiago", () => {
    expect(getWeekSeed(new Date("2026-08-17T04:00:00Z"))).toBe("2026-34");
  });

  it("usa la fecha local de Santiago para el día límite", () => {
    expect(getWeekSeed(new Date("2026-08-31T02:00:00Z"))).toBe("2026-36");
  });
});
