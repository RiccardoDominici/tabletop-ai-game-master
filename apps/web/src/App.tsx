/**
 * Instradamento: /telefono (giocatori) e /schermo (proiettore). La radice porta al telefono:
 * è il link che si condivide più spesso (il QR punta comunque a /telefono).
 * Ogni pagina avvia da sé il suo ruolo sul socket condiviso.
 */
import { Redirect, Route, Switch } from 'wouter';
import { PaginaTelefono } from './telefono/PaginaTelefono';
import { PaginaSchermo } from './schermo/PaginaSchermo';

export function App() {
  return (
    <Switch>
      <Route path="/telefono" component={PaginaTelefono} />
      <Route path="/schermo" component={PaginaSchermo} />
      <Route path="/">
        <Redirect to="/telefono" replace />
      </Route>
      <Route component={NonTrovata} />
    </Switch>
  );
}

function NonTrovata() {
  return (
    <main className="sicuro-lati flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <p className="font-titolo text-3xl text-candela">Pagina non trovata</p>
      <p className="text-pergamena-2">
        Apri <a className="text-candela-2 underline" href="/telefono">/telefono</a> per giocare o{' '}
        <a className="text-candela-2 underline" href="/schermo">/schermo</a> sul proiettore.
      </p>
    </main>
  );
}
