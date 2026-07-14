import { afterEach, describe, expect, it, vi } from "vitest";

import { WahaClient } from "./client";
import { buildSessionWebhook } from "./session-webhook";

describe("WahaClient.startSession", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a session with a per-session webhook and then starts it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "STOPPED" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "STARTING" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const webhook = buildSessionWebhook("https://crm.example.com", "token", "secret");

    await new WahaClient("http://waha:3000", "api-key").startSession("crm-session", {
      webhook,
    });

    const createRequest = fetchMock.mock.calls[0];
    expect(createRequest[0]).toBe("http://waha:3000/api/sessions");
    expect(JSON.parse(createRequest[1].body)).toEqual({
      name: "crm-session",
      config: { webhooks: [webhook] },
    });
    expect(fetchMock.mock.calls[1][0]).toBe("http://waha:3000/api/sessions/crm-session/start");
  });

  it("updates the CRM-owned session webhook when the session already exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "STOPPED" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "STARTING" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const webhook = buildSessionWebhook("https://crm.example.com", "token", "secret");

    await new WahaClient("http://waha:3000", "api-key").startSession("crm-session", {
      webhook,
    });

    expect(fetchMock.mock.calls[1][0]).toBe("http://waha:3000/api/sessions/crm-session");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[2][0]).toBe("http://waha:3000/api/sessions/crm-session/start");
  });
});
