import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startOfDay, APP_TIMEZONE } from "../../../src/utils/time.js";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  runAllScrapers: vi.fn(),
}));

vi.mock("../../../src/config/prisma.js", () => ({
  prisma: { scraperConfig: { findFirst: mocks.findFirst } },
}));

vi.mock("../../../src/manga/scrapers/scraper.js", () => ({
  runAllScrapers: mocks.runAllScrapers,
}));

let scraperCron;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-16T14:15:00Z")); // 10:15 hora de Chile
  mocks.findFirst.mockReset();
  mocks.runAllScrapers.mockReset();
  scraperCron = await import("../../../src/jobs/scraperCron.js");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("msUntilNextAligned", () => {
  it("120 min desde las 04:32 CLT cae en las 06:00 CLT (no 2h desde el cambio)", () => {
    const ref = new Date("2026-08-16T08:32:00Z"); // 04:32 Chile
    const delay = scraperCron.msUntilNextAligned(2 * 3600000, ref);
    expect(delay).toBe(1 * 3600000 + 28 * 60000);
    expect(new Date(ref.getTime() + delay).toISOString()).toBe("2026-08-16T10:00:00.000Z");
  });

  it("60 min desde las 10:15 CLT cae en las 11:00 CLT (en punto)", () => {
    const ref = new Date("2026-08-16T14:15:00Z"); // 10:15 Chile
    const delay = scraperCron.msUntilNextAligned(60 * 60000, ref);
    expect(delay).toBe(45 * 60000);
    expect(new Date(ref.getTime() + delay).toISOString()).toBe("2026-08-16T15:00:00.000Z");
  });

  it("240 min desde las 07:10 CLT cae en las 08:00 CLT (múltiplo de 4h)", () => {
    const ref = new Date("2026-08-16T11:10:00Z"); // 07:10 Chile
    const delay = scraperCron.msUntilNextAligned(240 * 60000, ref);
    expect(delay).toBe(50 * 60000);
    expect(new Date(ref.getTime() + delay).toISOString()).toBe("2026-08-16T12:00:00.000Z");
  });

  it("resuelve el offset correcto en la transición CLST→CLT de abril 2026", () => {
    expect(startOfDay(new Date("2026-04-04T12:00:00Z"), APP_TIMEZONE).toISOString())
      .toBe("2026-04-04T03:00:00.000Z"); // CLST (UTC-3)
    expect(startOfDay(new Date("2026-04-05T12:00:00Z"), APP_TIMEZONE).toISOString())
      .toBe("2026-04-05T04:00:00.000Z"); // CLT (UTC-4)
  });

  it("no se descuadra en un día con horario de verano (CLST, oct 2026)", () => {
    const ref = new Date("2026-10-25T10:10:00Z"); // 07:10 CLST
    const delay = scraperCron.msUntilNextAligned(240 * 60000, ref);
    expect(new Date(ref.getTime() + delay).toISOString()).toBe("2026-10-25T11:00:00.000Z"); // 08:00 CLST
  });
});

describe("initScraperCron", () => {
  it("no programa nada si autoEnabled es false", async () => {
    mocks.findFirst.mockResolvedValue({ intervalMinutes: 60, autoEnabled: false, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("no programa nada si el intervalo es inválido", async () => {
    mocks.findFirst.mockResolvedValue({ intervalMinutes: 0, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("al cambiar de 60 a 120 min hace clearTimeout y programa uno nuevo (sin paralelos)", async () => {
    mocks.runAllScrapers.mockResolvedValue();
    mocks.findFirst.mockResolvedValue({ intervalMinutes: 60, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(1);

    mocks.findFirst.mockResolvedValue({ intervalMinutes: 120, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("restartScraperCron reprograma con la nueva configuración", async () => {
    mocks.runAllScrapers.mockResolvedValue();
    mocks.findFirst.mockResolvedValue({ intervalMinutes: 60, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(1);

    mocks.findFirst.mockResolvedValue({ intervalMinutes: 120, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.restartScraperCron();
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe("tick", () => {
  it("salta la iteración si el scraper anterior sigue corriendo", async () => {
    let resolveRun;
    mocks.runAllScrapers.mockReturnValue(new Promise((res) => { resolveRun = res; }));

    const first = scraperCron.tick(["olympus"]);
    await scraperCron.tick(["olympus"]);
    expect(mocks.runAllScrapers).toHaveBeenCalledTimes(1);

    resolveRun();
    await first;

    await scraperCron.tick(["olympus"]);
    expect(mocks.runAllScrapers).toHaveBeenCalledTimes(2);
  });
});

describe("scheduleNextTick", () => {
  it("se reprograma solo tras cada tick y no se detiene tras la primera ejecución", async () => {
    mocks.runAllScrapers.mockResolvedValue();
    mocks.findFirst.mockResolvedValue({ intervalMinutes: 60, autoEnabled: true, enabledProviders: ["olympus"] });
    await scraperCron.initScraperCron();
    expect(vi.getTimerCount()).toBe(1);
    expect(mocks.runAllScrapers).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(45 * 60000); // primer tick en 11:00 Chile
    expect(mocks.runAllScrapers).toHaveBeenCalledTimes(1);
    expect(mocks.runAllScrapers).toHaveBeenCalledWith("cron", ["olympus"]);
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(60 * 60000); // segundo tick en 12:00 Chile
    expect(mocks.runAllScrapers).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });
});