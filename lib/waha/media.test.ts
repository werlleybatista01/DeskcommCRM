import { describe, expect, it } from "vitest";
import { mediaFromPayload } from "./media-payload";

describe("mediaFromPayload", () => {
  it("lê o contrato atual payload.media do WAHA", () => {
    expect(
      mediaFromPayload({
        media: {
          url: "http://waha:3000/api/files/message.ogg",
          mimetype: "audio/ogg; codecs=opus",
          filename: "audio.ogg",
          filesize: 1234,
        },
      }),
    ).toEqual({
      url: "http://waha:3000/api/files/message.ogg",
      mimetype: "audio/ogg; codecs=opus",
      filename: "audio.ogg",
      size: 1234,
    });
  });

  it("mantém compatibilidade com payload legado", () => {
    expect(
      mediaFromPayload({ mediaUrl: "https://example.test/a.jpg", mimetype: "image/jpeg" }),
    ).toMatchObject({ url: "https://example.test/a.jpg", mimetype: "image/jpeg" });
  });
});
