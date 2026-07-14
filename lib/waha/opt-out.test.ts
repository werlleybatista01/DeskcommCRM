import { describe, expect, it } from "vitest";
import { isExplicitOptOut } from "./opt-out";

describe("isExplicitOptOut", () => {
  it.each(["SAIR", "sair!", "STOP", "Parar", "quero cancelar", "pare de enviar mensagens"])(
    "aceita o comando explícito %s",
    (text) => expect(isExplicitOptOut(text)).toBe(true),
  );

  it.each([
    "Mas vamos sair daqui 16:00",
    "Você vai sair hoje?",
    "Pode parar o carro aqui",
    "Vou cancelar o pedido",
    "stop motion é legal",
  ])("não bloqueia uma conversa normal: %s", (text) => {
    expect(isExplicitOptOut(text)).toBe(false);
  });
});
