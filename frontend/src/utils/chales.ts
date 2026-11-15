export const TOTAL_CHALES = 15;

/** Acomodações da pousada: "Chalé 1" até "Chalé 15". */
export const LISTA_CHALES: string[] = Array.from(
  { length: TOTAL_CHALES },
  (_, i) => `Chalé ${i + 1}`
);

/**
 * Descobre o número do chalé a partir do texto da reserva.
 * Aceita "Chalé 3", "chale 03", "Chalé 03 - Pinho Bravo" etc.
 * Devolve null quando não é um dos 15 chalés.
 */
export function numeroDoChale(texto: string): number | null {
  const achado = /chal[eé]\s*0*(\d{1,2})\b/i.exec(texto || '');
  if (!achado) return null;
  const numero = Number(achado[1]);
  return numero >= 1 && numero <= TOTAL_CHALES ? numero : null;
}
