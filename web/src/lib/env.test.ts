import { describe, expect, it } from "vitest";
import { parseMapboxToken } from "./env";

const VALID_TOKEN = "pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJhYmMxMjMifQ.abc_DEF-123";

describe("parseMapboxToken", () => {
  it("reports a missing token when the variable is undefined", () => {
    expect(parseMapboxToken(undefined)).toEqual({ status: "missing" });
  });

  it("reports a missing token when the variable is empty or whitespace", () => {
    expect(parseMapboxToken("")).toEqual({ status: "missing" });
    expect(parseMapboxToken("   ")).toEqual({ status: "missing" });
  });

  it("accepts a public token and trims surrounding whitespace", () => {
    expect(parseMapboxToken(`  ${VALID_TOKEN}\n`)).toEqual({ status: "ok", token: VALID_TOKEN });
  });

  it("rejects a secret token", () => {
    expect(() => parseMapboxToken("sk.eyJ1IjoiZXhhbXBsZSJ9.secret")).toThrow(/secret token/);
  });

  it("rejects values that are not a Mapbox public token", () => {
    expect(() => parseMapboxToken("not-a-token")).toThrow(/not a valid Mapbox public token/);
    expect(() => parseMapboxToken("pk.onlyonesegment")).toThrow(/not a valid Mapbox public token/);
  });

  it("never echoes the received value in the error message", () => {
    const secret = "sk.eyJ1IjoiZXhhbXBsZSJ9.TOP_SECRET_VALUE";

    expect(() => parseMapboxToken(secret)).toThrow();
    try {
      parseMapboxToken(secret);
    } catch (error) {
      expect((error as Error).message).not.toContain("TOP_SECRET_VALUE");
    }
  });
});
