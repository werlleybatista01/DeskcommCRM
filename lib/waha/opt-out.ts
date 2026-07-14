/**
 * Detecta somente comandos explícitos de opt-out. Não procure palavras dentro
 * de frases: "vamos sair daqui" não é uma solicitação para parar mensagens.
 */
export function isExplicitOptOut(raw: string): boolean {
  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /^(stop|parar|sair|unsubscribe|cancelar)$/.test(normalized) ||
    /^(quero|desejo) (parar|sair|cancelar)$/.test(normalized) ||
    /^(pare|parar) de (enviar|mandar) (mensagens|mensagem)$/.test(normalized) ||
    /^(nao quero|não quero) (mais )?(receber )?(mensagens|mensagem)$/.test(normalized)
  );
}
