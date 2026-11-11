/**
 * DEBUG — banco di prova delle carte dei tiri, SENZA server (non apre il socket, non tocca la
 * partita). Serve a guardare carte e animazione sul proiettore e sul telefono veri o negli
 * screenshot di Playwright. Lo caricano a parte (lazy) PaginaSchermo e PaginaTelefono quando l'URL
 * ha `?carte=…` (debug/richiesta.ts); la partita normale non lo scarica nemmeno.
 *
 * Proiettore (/schermo):
 *   ?carte=prova                 la scena vera (Scena di PaginaSchermo) con 4 carte grandi in narrazione
 *   &n=8                         quante carte pubbliche (oltre 4: tutte compatte)
 *   &fase=dopo                   finestra del turno dopo aperta: striscia compatta che sfuma in ~10 s
 *   &frase=lunga|corta|nessuna   sottotitolo finto (per vedere che le carte non lo coprono)
 *   &sfondo=<url> &ritratto=<url> immagine del luogo e ritratto del PNG che parla
 *   &pulito=1                    senza la barra di debug (per gli screenshot)
 *   ?carte=galleria              tutte le carte d'esempio nelle due varianti, intere e compatte
 * Telefono (/telefono):
 *   ?carte=prova                 il tavolo vero (Tavolo di PaginaTelefono) da Arianna, con la sua
 *                                azione risolta (una carta pubblica e una privata) e i tiri del turno
 *   &pf=5                        punti ferita attuali di Arianna su 12 (0 = a terra; «no» = senza PF)
 *   &fase=dopo &aperta=1         finestra successiva aperta; sezione «Tiri del turno» già aperta
 *   &pg=corrado                  il PG del telefono (default ida, di turno; corrado è a terra)
 *   &combattimento=no            senza scontro (tavolo di sempre, con Arianna)
 *   Proiettore: &combattimento=no senza la barra dell'iniziativa (confronto del layout).
 * Entrambi: lo scontro d'esempio (barra del proiettore, riquadro del turno sul telefono).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import { CartaTiro } from '../components/CartaTiro';
import { dimenticaAnimazioni } from '../components/useAnimazioneTiro';
import { creaLog } from '../lib/log';
import { useSchermo } from '../store/schermo';
import { useTelefono } from '../store/telefono';
import { Scena } from '../schermo/PaginaSchermo';
import { SfondoLuogo } from '../schermo/SfondoLuogo';
import { Tavolo } from '../telefono/PaginaTelefono';
import {
  azioneEsempio,
  carteEsempio,
  combattimentoEsempio,
  ID_GRANDI,
  INFO_ESEMPIO,
  PG_COMBATTIMENTO,
  statoEsempio,
  TURNO_ESEMPIO,
  type FaseProva,
} from './carteEsempio';
import { provaCarteRichiesta } from './richiesta';

const log = creaLog('prova-carte');

const FRASI = {
  lunga:
    'Il dardo di Bianca si pianta nella spalla del goblin, che rotola giù dal tetto della casera e sparisce nella neve alta, mentre il capo urla qualcosa che nessuno di voi capisce.',
  corta: 'Il goblin rotola giù dal tetto.',
} as const;

function parametri(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Barra di debug in basso al centro: rilancia l'animazione, passa da una prova all'altra. */
function BarraDebug({ rilancia, collegamenti }: { rilancia: () => void; collegamenti: Array<[string, string]> }) {
  if (parametri().get('pulito') === '1') return null;
  return (
    <div className="fixed bottom-2 left-1/2 z-[80] flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-full border border-candela/60 bg-notte/95 px-3 py-1 font-mono text-xs text-pergamena-2">
      <strong className="text-candela">DEBUG carte</strong>
      <button type="button" onClick={rilancia} className="rounded-full border border-bordo-chiaro px-2 py-0.5 text-pergamena">
        Rilancia
      </button>
      {collegamenti.map(([etichetta, href]) => (
        <a key={href} href={href} className="underline">
          {etichetta}
        </a>
      ))}
    </div>
  );
}

/** Rilancio: si dimenticano le carte animate e si rimonta tutto con id nuovi. */
function useRilancio(): [number, () => void] {
  const [giro, setGiro] = useState(0);
  return [
    giro,
    () => {
      dimenticaAnimazioni();
      setGiro((g) => g + 1);
    },
  ];
}

// ------------------------------------------------------------------ proiettore

export function ProvaCarteSchermo() {
  useEffect(() => {
    document.title = 'Tabletop AI Game Master · Schermo · DEBUG carte';
    log.warn('Banco di prova delle carte dei tiri (debug): nessun server, dati finti');
  }, []);
  return provaCarteRichiesta() === 'galleria' ? <Galleria /> : <ScenaProva />;
}

function ScenaProva() {
  const [giro, rilancia] = useRilancio();
  const p = parametri();
  const fase: FaseProva = p.get('fase') === 'dopo' ? 'dopo' : 'narrazione';
  const n = Math.max(0, Number(p.get('n') ?? ID_GRANDI.length) || 0);
  const frase = p.get('frase') ?? 'lunga';
  const ritratto = p.get('ritratto');

  const stato = useMemo(() => {
    const tutte = carteEsempio(`g${giro}`).filter((t) => !t.privata);
    // Le prime 4 in un ordine da turno «tipico»; oltre, le altre d'esempio.
    const ordinate = [
      ...tutte.filter((t) => ID_GRANDI.some((id) => t.id.endsWith(`-${id}`))),
      ...tutte.filter((t) => !ID_GRANDI.some((id) => t.id.endsWith(`-${id}`))),
    ];
    const tiri = Array.from({ length: n }, (_, i): TiroMostrato => {
      const base = ordinate[i % ordinate.length]!;
      return i < ordinate.length ? base : { ...base, id: `${base.id}-${i}` };
    });
    return statoEsempio({
      fase,
      tiri,
      immagine: p.get('sfondo'),
      ritratti: ritratto ? { bran: ritratto } : {},
      // &combattimento=no: senza barra dell'iniziativa (per confrontare il layout dei ritratti).
      combattimento: p.get('combattimento') === 'no' ? null : combattimentoEsempio(),
    });
    // I parametri dell'URL non cambiano senza ricaricare la pagina.
  }, [giro, fase, n]);

  // Il sottotitolo finto, come se la frase stesse suonando adesso.
  useEffect(() => {
    if (fase === 'dopo' || frase === 'nessuna') {
      useSchermo.setState({ inOnda: null });
      return;
    }
    const testo = frase === 'corta' ? FRASI.corta : FRASI.lunga;
    const parlante = ritratto ? { parlante: 'bran', nome: 'Bran' } : { parlante: 'narratore', nome: 'Narratore' };
    useSchermo.setState({ inOnda: { idFrase: `prova-${giro}`, turno: TURNO_ESEMPIO, testo, ...parlante } });
  }, [giro, fase, frase, ritratto]);

  return (
    <div className="relative h-dvh overflow-hidden bg-notte">
      <SfondoLuogo immagine={stato.scena.immagine} umore={stato.scena.umore} intensita={stato.scena.intensita} />
      <Scena key={giro} stato={stato} info={INFO_ESEMPIO} />
      <BarraDebug
        rilancia={rilancia}
        collegamenti={[
          ['4 grandi', '?carte=prova'],
          ['8 compatte', '?carte=prova&n=8'],
          ['dopo', '?carte=prova&fase=dopo'],
          ['galleria', '?carte=galleria'],
        ]}
      />
    </div>
  );
}

/** Tutte le carte d'esempio: a sinistra il proiettore (intere e compatte), a destra il telefono. */
function Galleria() {
  const [giro, rilancia] = useRilancio();
  const carte = useMemo(() => ({ proiettore: carteEsempio(`p${giro}`), compatte: carteEsempio(`c${giro}`), telefono: carteEsempio(`t${giro}`), righe: carteEsempio(`r${giro}`) }), [giro]);
  return (
    <div key={giro} className="min-h-dvh bg-notte-2 p-[1.5vw] text-pergamena">
      <div className="grid grid-cols-[26vw_26vw_minmax(0,1fr)] gap-[1.5vw]">
        <Colonna titolo="Proiettore · intere">
          {carte.proiettore.map((t, i) => (
            <CartaTiro key={t.id} tiro={t} variante="proiettore" indice={i % 4} />
          ))}
        </Colonna>
        <Colonna titolo="Proiettore · compatte">
          {carte.compatte.map((t, i) => (
            <CartaTiro key={t.id} tiro={t} variante="proiettore" compatta indice={i % 4} />
          ))}
        </Colonna>
        <div className="flex gap-6">
          <Colonna titolo="Telefono · intere" classe="w-[360px]">
            {carte.telefono.map((t, i) => (
              <CartaTiro key={t.id} tiro={t} variante="telefono" indice={i % 4} />
            ))}
          </Colonna>
          <Colonna titolo="Telefono · righe" classe="w-[360px]">
            {carte.righe.map((t, i) => (
              <CartaTiro key={t.id} tiro={t} variante="telefono" compatta indice={i % 4} />
            ))}
          </Colonna>
        </div>
      </div>
      <BarraDebug rilancia={rilancia} collegamenti={[['scena', '?carte=prova']]} />
    </div>
  );
}

function Colonna({ titolo, classe, children }: { titolo: string; classe?: string; children: ReactNode }) {
  return (
    <section className={clsx('flex flex-col gap-[1vh]', classe)}>
      <h2 className="font-mono text-xs tracking-widest text-cenere uppercase">{titolo}</h2>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ telefono

export function ProvaCarteTelefono() {
  const [giro, rilancia] = useRilancio();
  const mia = useTelefono((s) => s.miaAzione);
  const p = parametri();
  const fase: FaseProva = p.get('fase') === 'dopo' ? 'dopo' : 'narrazione';
  const pfParam = p.get('pf');
  const pf = pfParam === 'no' ? null : { attuali: Number(pfParam ?? 5) || 0, massimi: 12 };
  // Di default c'è lo scontro d'esempio e il PG del telefono è Ida (di turno); `pg=corrado` mostra
  // il PG a terra con i tiri contro la morte; `combattimento=no` torna al tavolo senza scontro.
  const conCombattimento = p.get('combattimento') !== 'no';
  const idPg = p.get('pg') ?? (conCombattimento ? 'ida' : 'arianna');

  const { stato, azione } = useMemo(() => {
    const tutte = carteEsempio(`tel${giro}`);
    const mie = tutte.filter((t) => t.id.endsWith('-persuasione') || t.id.endsWith('-privata'));
    // Pubbliche: tutte tranne la privata (la mia persuasione si filtra da sola, per id).
    const pubbliche = tutte.filter((t) => !t.privata).slice(0, 5);
    const combattimento = conCombattimento ? combattimentoEsempio() : null;
    return {
      stato: statoEsempio({ fase, tiri: pubbliche, pf, combattimento, pg: conCombattimento ? PG_COMBATTIMENTO : undefined }),
      azione: azioneEsempio(mie, idPg),
    };
  }, [giro, fase, pfParam, conCombattimento, idPg]);

  useEffect(() => {
    document.title = 'Tabletop AI Game Master · Telefono · DEBUG carte';
    log.warn('Banco di prova delle carte dei tiri (debug): nessun server, dati finti');
    useTelefono.setState({ idPg, confermato: true, miaAzione: azione });
  }, [azione, idPg]);

  // «Tiri del turno» già aperta: si simula il tocco appena montata.
  useEffect(() => {
    if (p.get('aperta') !== '1') return;
    const t = window.setTimeout(() => document.querySelector<HTMLElement>('[data-testid="tiri-turno"]')?.click(), 50);
    return () => window.clearTimeout(t);
  }, [giro]);

  return (
    <div className="flex h-dvh flex-col pt-[env(safe-area-inset-top)]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Il tavolo si monta quando lo store ha già la mia azione finta (come dopo `azione:mia`). */}
        {mia?.id === azione.id && mia.tiri === azione.tiri ? <Tavolo key={giro} stato={stato} idPg={idPg} /> : null}
      </div>
      <BarraDebug
        rilancia={rilancia}
        collegamenti={[
          ['Ida di turno', '?carte=prova'],
          ['Corrado a terra', '?carte=prova&pg=corrado'],
          ['senza scontro', '?carte=prova&combattimento=no'],
          ['PF 5', '?carte=prova&combattimento=no&pf=5'],
          ['PF 0', '?carte=prova&combattimento=no&pf=0'],
          ['aperta', '?carte=prova&combattimento=no&aperta=1'],
        ]}
      />
    </div>
  );
}
