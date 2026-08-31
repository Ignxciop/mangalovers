import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "../../../src/chat/chatRateLimiter.js";

// El Map del rate limiter es estado de módulo compartido entre tests.
// Avanzar el reloj falso 60s en cada test asegura que los timestamps
// de tests anteriores expiren y no contaminen el siguiente.
const BASE = new Date("2026-08-30T00:00:00Z").getTime();
let clockMs = BASE;

function advance(ms) {
  clockMs += ms;
  vi.setSystemTime(new Date(clockMs));
}

describe("chatRateLimiter.checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    advance(60_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta MAX_MESSAGES mensajes dentro de la ventana", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("user-1")).toBe(true);
    }
  });

  it("rechaza el mensaje excedente en la misma ventana", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-1");
    }
    expect(checkRateLimit("user-1")).toBe(false);
  });

  it("vuelve a permitir después de que expire la ventana", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-1");
    }
    expect(checkRateLimit("user-1")).toBe(false);

    advance(10_001);
    expect(checkRateLimit("user-1")).toBe(true);
  });

  it("aplica el límite por usuario, no global", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-1");
    }
    expect(checkRateLimit("user-1")).toBe(false);
    expect(checkRateLimit("user-2")).toBe(true);
  });
});