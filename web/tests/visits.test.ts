import { describe, expect, it } from "vitest";
import { browserOf, cleanPath, deviceOf, isBot, referrerHost } from "@/lib/analytics/visit";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0";

describe("lectura de visitas", () => {
  it("clasifica el dispositivo y el navegador", () => {
    expect([deviceOf(IPHONE), deviceOf(ANDROID), deviceOf(IPAD), deviceOf(WIN)]).toEqual(["mobile", "mobile", "tablet", "desktop"]);
    expect([browserOf(IPHONE), browserOf(ANDROID), browserOf(WIN)]).toEqual(["Safari", "Chrome", "Edge"]);
  });
  it("descarta robots y vistas previas de enlaces", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(IPHONE)).toBe(false);
  });
  it("resume el origen y omite el propio sitio", () => {
    expect(referrerHost("https://www.google.com.co/", "centrahoy.online")).toBe("google");
    expect(referrerHost("https://l.facebook.com/l.php?u=x", "centrahoy.online")).toBe("facebook.com");
    expect(referrerHost("https://centrahoy.online/ejemplo", "centrahoy.online")).toBeNull();
    expect(referrerHost("https://app.centrahoy.online/", "centrahoy.online")).toBeNull();
    expect(referrerHost("no es url", "centrahoy.online")).toBeNull();
  });
  it("no guarda identificadores de la URL", () => {
    expect(cleanPath("/panel/simuladores/09f55d1c-7dd8-462e-9727-0bdec080da11?nuevo=1")).toBe("/panel/simuladores/:id");
  });
});
