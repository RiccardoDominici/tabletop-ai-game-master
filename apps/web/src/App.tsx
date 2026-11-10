/**
 * Instradamento: /telefono (giocatori), /schermo (proiettore) e /master (pannello del master sul
 * Mac). La radice porta al telefono: è il link che si condivide più spesso (il QR punta comunque a
 * /telefono). Ogni pagina avvia da sé il suo ruolo sul socket condiviso.
 *
 * /master non è collegata da nessuna parte e si carica a parte (lazy): i telefoni non scaricano il
 * codice del pannello.
 */
import { t } from './lingua';
import { lazy, Suspense, useEffect, useReducer } from 'react';
import { alCambioLingua } from './lingua';
import { Redirect, Route, Switch } from 'wouter';
import { PaginaTelefono } from './telefono/PaginaTelefono';
import { PaginaSchermo } from './schermo/PaginaSchermo';

const PaginaMaster = lazy(() => import('./master/PaginaMaster').then((m) => ({ default: m.PaginaMaster })));

export function App() {
  // La lingua dell'interfaccia può arrivare dopo il primo disegno (StatoTavolo.lingua): si ridisegna tutto.
  const [, ridisegna] = useReducer((x: number) => x + 1, 0);
  useEffect(() => alCambioLingua(() => ridisegna()), []);
  return (
    <Switch>
      <Route path="/telefono" component={PaginaTelefono} />
      <Route path="/schermo" component={PaginaSchermo} />
      <Route path="/master">
        <Suspense fallback={<CaricoMaster />}>
          <PaginaMaster />
        </Suspense>
      </Route>
      <Route path="/">
        <Redirect to="/telefono" replace />
      </Route>
      <Route component={NonTrovata} />
    </Switch>
  );
}

function CaricoMaster() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-pergamena-2">{t('comune.app.carico_master')}</p>
    </main>
  );
}

function NonTrovata() {
  return (
    <main className="sicuro-lati flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <p className="font-titolo text-3xl text-candela">{t('comune.app.non_trovata')}</p>
      <p className="text-pergamena-2">
        {t('comune.app.apri')} <a className="text-candela-2 underline" href="/telefono">/telefono</a> {t('comune.app.per_giocare_o')}{' '}
        <a className="text-candela-2 underline" href="/schermo">/schermo</a> {t('comune.app.sul_proiettore')}
      </p>
    </main>
  );
}
