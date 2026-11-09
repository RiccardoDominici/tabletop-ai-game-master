/**
 * DEBUG — il banco di prova delle carte dei tiri è stato chiesto nell'URL? (`?carte=prova`,
 * `?carte=galleria`). Modulo minuscolo apposta: le pagine lo importano subito, il banco
 * (ProvaCarte.tsx) si carica a parte solo se serve. Il banco NON si collega al server.
 */
export type ProvaCarte = 'prova' | 'galleria';

export function provaCarteRichiesta(): ProvaCarte | null {
  if (typeof window === 'undefined') return null;
  const valore = new URLSearchParams(window.location.search).get('carte');
  return valore === 'prova' || valore === 'galleria' ? valore : null;
}
