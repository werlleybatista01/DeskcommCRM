import { describe, expect, it } from "vitest";

import { remoteNameFromEvent } from "./contact-profile";

describe("remoteNameFromEvent", () => {
  it("uses the remote push name for inbound messages", () => {
    const payload = {
      fromMe: false,
      _data: { notifyName: "Cliente Remoto" },
    };
    expect(remoteNameFromEvent(payload)).toBe("Cliente Remoto");
  });

  it("never treats the connected account push name as the outbound recipient", () => {
    const payload = {
      fromMe: true,
      _data: { notifyName: "Nome do Operador", pushName: "Nome do Operador" },
    };
    expect(remoteNameFromEvent(payload)).toBeNull();
  });
});
