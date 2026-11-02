/**
 * Orologio React: restituisce l'ora del SERVER (Date.now() corretto dallo scarto, vedi
 * orologioServer.ts) e ri-renderizza ogni `intervalloMs` finché `attivo`. Serve ai conti alla
 * rovescia (chiusura della finestra) senza timer sparsi nei componenti.
 */
import { useEffect, useState } from 'react';
import { oraServer } from './orologioServer';

export function useOra(attivo: boolean, intervalloMs = 250): number {
  const [ora, setOra] = useState(() => oraServer());
  useEffect(() => {
    if (!attivo) return;
    setOra(oraServer());
    const timer = window.setInterval(() => setOra(oraServer()), intervalloMs);
    return () => window.clearInterval(timer);
  }, [attivo, intervalloMs]);
  return ora;
}
