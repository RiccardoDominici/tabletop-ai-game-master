/**
 * Carta di un tiro di dado (docs/prove.md), per il proiettore (vw, letta da 3 m) e per il telefono
 * (rem, mobile-first). Il Motore ha già tirato: qui si mostra e basta.
 *
 * Cosa dice: chi tira (i PNG col nome nel colore delle loro battute e il chip «PNG»), cosa tira
 * («Persuasione (Carisma) contro Bran»), il d20 (due col vantaggio o lo svantaggio: quello scartato
 * è piccolo e spento, il motivo in piccolo), il modificatore col segno, il totale, la CD o la CA da
 * battere (con la sua descrizione), l'esito (muschio = buono, brace = cattivo, candela = pareggio)
 * e, per un colpo, la riga del danno e «a terra».
 *
 * Set di regole non SRD (`risoluzione`, docs/regole.md): col 2d6 a fasce si mostrano i d6 (quadrati)
 * e il posto della CD va al nome della fascia; sotto soglia c'è un solo dado (d100 o d20) e la riga
 * dice «tiro 23 ≤ 45?». Senza `risoluzione` la carta è quella di sempre. `regola` è una riga in
 * più nella forma intera.
 *
 * Due forme: intera (`compatta` falso) e compatta (striscia del proiettore: due righe; elenco chiuso
 * del telefono: una riga). L'animazione è in useAnimazioneTiro.ts, una volta per id; le parti
 * ancora nascoste restano al loro posto (`invisible`), così la carta non cambia misura mentre si anima.
 */
import { t } from '../lingua';
import clsx from 'clsx';
import type { TiroMostrato } from '@tabletop-ai-gm/shared';
import {
  conSegno,
  contoTiro,
  descriviTiro,
  esitoTiro,
  facceDi,
  facciaNelRange,
  giaVisibile,
  indiceDadoScartato,
  risoluzioneDi,
  testoBersaglioCarta,
  testoAutomatico,
  testoContro,
  testoCosa,
  testoDanno,
  testoRegola,
  testoTiroSottoSoglia,
  testoVantaggio,
  TEMPI_ANIMAZIONE,
  type EsitoTiro,
  type PassoAnimazione,
  type TonoEsito,
} from '../lib/tiri';
import { useAnimazioneTiro } from './useAnimazioneTiro';
import './cartaTiro.css';

export type VarianteCarta = 'proiettore' | 'telefono';

export interface PropsCartaTiro {
  tiro: TiroMostrato;
  variante: VarianteCarta;
  /** Forma compatta: striscia del proiettore, elenco chiuso del telefono. */
  compatta?: boolean;
  /** Posizione nel gruppo del turno: sfalsa l'animazione (~0,4 s per carta). */
  indice?: number;
  /** La carta è fresca (il suo turno si sta narrando): si anima, una volta sola per id. */
  anima?: boolean;
}

// ------------------------------------------------------------------ misure per variante

/** Classi di misura della carta intera. Proiettore in vw (si adatta a ogni risoluzione), telefono in rem. */
const MISURE = {
  proiettore: {
    carta: 'gap-[0.9vw] rounded-[0.8vw] border-[0.2vw] px-[0.9vw] py-[0.8vh] shadow-[0_1.2vh_3vh_rgb(0_0_0/0.75)]',
    colonnaDadi: 'gap-[0.4vh]',
    dado: 'size-[4.2vw] text-[1.85vw]',
    dadoScartato: 'size-[2.5vw] text-[1.05vw]',
    dadoQuadrato: 'size-[3.2vw] text-[1.4vw]',
    corpo: 'gap-[0.3vh]',
    testa: 'gap-[0.5vw]',
    nome: 'text-[1.35vw]',
    chip: 'rounded-[0.3vw] px-[0.45vw] py-[0.1vh] text-[0.8vw]',
    badge: 'gap-[0.35vw] rounded-full px-[0.7vw] py-[0.25vh] text-[1.15vw]',
    cosa: 'text-[1.15vw]',
    riga: 'gap-x-[0.5vw] gap-y-[0.4vh]',
    modificatore: 'text-[1.55vw]',
    uguale: 'text-[1.3vw]',
    totale: 'text-[2.3vw]',
    contro: 'gap-[0.3vw] rounded-[0.4vw] px-[0.5vw] py-[0.1vh] text-[1.35vw]',
    controTipo: 'text-[0.95vw]',
    piccolo: 'text-[0.92vw]',
    regola: 'text-[0.95vw]',
    danno: 'gap-x-[0.5vw] gap-y-[0.3vh] text-[1.08vw]',
  },
  telefono: {
    carta: 'gap-3 rounded-xl border px-3 py-2',
    colonnaDadi: 'gap-0.5',
    dado: 'size-12 text-xl',
    dadoScartato: 'size-8 text-sm',
    dadoQuadrato: 'size-9 text-base',
    corpo: 'gap-0.5',
    testa: 'gap-1.5',
    nome: 'text-[0.95rem]',
    chip: 'rounded px-1.5 text-[0.65rem]',
    badge: 'gap-1 rounded-full px-2.5 py-0.5 text-sm',
    cosa: 'text-sm',
    riga: 'gap-x-1.5',
    modificatore: 'text-base',
    uguale: 'text-base',
    totale: 'text-xl',
    contro: 'gap-1 rounded px-1.5 text-sm',
    controTipo: 'text-xs',
    piccolo: 'text-xs',
    regola: 'text-xs',
    danno: 'gap-x-1.5 text-sm',
  },
} as const satisfies Record<VarianteCarta, Record<string, string>>;

/** Classi di misura della forma compatta. */
const MISURE_COMPATTE = {
  proiettore: {
    carta: 'gap-[0.8vw] rounded-[0.6vw] border-[0.16vw] px-[0.8vw] py-[0.7vh] shadow-[0_1vh_2.5vh_rgb(0_0_0/0.7)]',
    dado: 'size-[3vw] text-[1.3vw]',
    testo: 'text-[1.1vw]',
    totale: 'text-[1.35vw]',
    badge: 'gap-[0.3vw] rounded-full px-[0.6vw] py-[0.15vh] text-[1vw]',
  },
  telefono: {
    carta: 'gap-2 rounded-lg border px-2 py-1',
    dado: 'size-7 text-xs',
    testo: 'text-[0.9rem]',
    totale: 'text-[0.95rem]',
    badge: 'gap-0.5 rounded-full px-2 text-xs',
  },
} as const satisfies Record<VarianteCarta, Record<string, string>>;

/** Colori dell'esito: bordo della carta, badge, testo. */
const TONO: Record<TonoEsito, { bordo: string; badge: string; testo: string }> = {
  buono: { bordo: 'border-muschio/85', badge: 'bg-muschio text-notte', testo: 'text-muschio' },
  cattivo: { bordo: 'border-brace/85', badge: 'bg-brace text-notte', testo: 'text-brace' },
  pari: { bordo: 'border-candela/75', badge: 'bg-candela text-notte', testo: 'text-candela' },
};

/** Il colore del nome: i PNG come le loro battute sul proiettore (Narrazione.tsx), i PG candela. */
function coloreNome(tiro: TiroMostrato): string {
  return tiro.di_png ? 'text-[#ff9a6b]' : 'text-candela-2';
}

// ------------------------------------------------------------------ carta

export function CartaTiro({ tiro, variante, compatta = false, indice = 0, anima = true }: PropsCartaTiro) {
  const animazione = useAnimazioneTiro(tiro, indice * TEMPI_ANIMAZIONE.sfalsamentoMs, anima);
  const esito = esitoTiro(tiro);
  return compatta ? (
    <CartaCompatta tiro={tiro} variante={variante} esito={esito} {...animazione} />
  ) : (
    <CartaIntera tiro={tiro} variante={variante} esito={esito} {...animazione} />
  );
}

interface PropsInterne {
  tiro: TiroMostrato;
  variante: VarianteCarta;
  esito: EsitoTiro;
  animata: boolean;
  passo: PassoAnimazione;
  facce: number[];
}

/** Classi comuni del contenitore: entra quando tocca a lei, il bordo prende il colore dell'esito. */
function classiCarta(p: PropsInterne): string {
  const conEsito = giaVisibile(p.passo, 'esito');
  return clsx(
    'flex items-stretch bg-notte/92 text-pergamena transition-colors duration-300',
    conEsito ? TONO[p.esito.tono].bordo : 'border-bordo-chiaro',
    p.passo === 'attesa' ? 'opacity-0' : p.animata && 'tiro-entra',
  );
}

/** Una parte che compare dal passo `da`: prima invisibile (il posto resta), poi entra animata. */
function comparsa(p: PropsInterne, da: PassoAnimazione, animazione: 'tiro-compare' | 'tiro-esito' = 'tiro-compare'): string | false {
  if (!giaVisibile(p.passo, da)) return 'invisible';
  return p.animata && animazione;
}

function CartaIntera(p: PropsInterne) {
  const { tiro, variante, esito } = p;
  const m = MISURE[variante];
  const scartato = indiceDadoScartato(tiro);
  const vantaggio = testoVantaggio(tiro);
  const avversario = tiro.avversario;
  const colpito = tiro.danno !== null && tiro.riuscita;
  const risoluzione = risoluzioneDi(tiro);
  const facce = facceDi(tiro);
  // Il d20 che conta in alto e grande, quello scartato sotto, piccolo e spento: la carta resta stretta.
  const ordine = scartato === null ? p.facce.map((_, i) => i) : [scartato === 0 ? 1 : 0, scartato];
  const regola = testoRegola(tiro);
  const automatico = testoAutomatico(tiro);
  // An automatic card has no target number: its «colpisce sempre» is already in the count.
  const note = [!avversario && !automatico && tiro.contro.descrizione ? tiro.contro.descrizione : null, vantaggio].filter(Boolean);

  return (
    <article
      data-testid="carta-tiro"
      data-id={tiro.id}
      data-tipo={tiro.tipo}
      data-risoluzione={risoluzione}
      data-esito={esito.tono}
      data-passo={p.passo}
      data-png={tiro.di_png}
      aria-label={descriviTiro(tiro)}
      className={clsx(classiCarta(p), m.carta)}
    >
      <div className={clsx('flex shrink-0 flex-col items-center justify-center', m.colonnaDadi)} aria-hidden>
        {risoluzione === '2d6_fasce'
          ? // Due d6: si sommano, nessuno si scarta.
            tiro.dadi.map((_, i) => (
              <DadoD6 key={i} faccia={facciaNelRange(p.facce[i] ?? 1, 6)} passo={p.passo} animata={p.animata} className={m.dadoQuadrato} />
            ))
          : ordine.map((i) => (
              <DadoD20
                key={i}
                faccia={facciaNelRange(p.facce[i] ?? tiro.dado, facce)}
                scartato={i === scartato}
                naturali={risoluzione === 'd20_cd'}
                passo={p.passo}
                animata={p.animata}
                className={i === scartato ? m.dadoScartato : m.dado}
              />
            ))}
      </div>

      <div className={clsx('flex min-w-0 flex-1 flex-col justify-center', m.corpo)}>
        <div className={clsx('flex min-w-0 items-center', m.testa)}>
          <p data-testid="carta-chi" className={clsx('min-w-0 truncate font-titolo leading-tight font-bold', m.nome, coloreNome(tiro))}>
            {tiro.nome}
          </p>
          {tiro.di_png && <Chip className={clsx(m.chip, 'border-[#ff9a6b]/70 text-[#ff9a6b]')}>{t('comune.carta.png')}</Chip>}
          {tiro.privata && <Chip className={clsx(m.chip, 'border-lago/70 text-lago')}>{t('comune.carta.privata')}</Chip>}
        </div>

        <p data-testid="carta-cosa" className={clsx('line-clamp-2 leading-snug text-pergamena', m.cosa)}>
          {tiro.etichetta}
          {tiro.bersaglio && (
            <>
              {' '}
              <span className="text-cenere">{t('comune.carta.contro')}</span> <strong className="font-bold">{tiro.bersaglio.nome}</strong>
            </>
          )}
        </p>

        {/* «+5 = 22  CD 15  ✔ Riuscita»: il conto, il numero da battere (o il totale dell'altro PG), l'esito. */}
        <div className={clsx('flex flex-wrap items-center leading-none', m.riga)}>
          {automatico ? (
            // An automatic attack: no roll to hit, the damage is the count («automatico: 1d6 = 7 danni»).
            <span data-testid="carta-automatico" className={clsx('font-bold text-pergamena tabular-nums', m.modificatore, comparsa(p, 'totale'))}>
              {automatico}
            </span>
          ) : risoluzione === 'sotto_soglia' ? (
            // Sotto soglia: il tiro al posto di «+mod = totale», poi la soglia da non superare.
            <>
              <Chip className={clsx(m.chip, 'border-bordo-chiaro text-cenere')}>{`d${facce}`}</Chip>
              <span data-testid="carta-tiro-soglia" className={clsx('font-extrabold text-pergamena tabular-nums', m.totale, comparsa(p, 'totale'))}>
                {t('comune.tiri.tiro', { dado: tiro.dado })}
              </span>
              <span className={clsx('text-cenere', m.uguale, comparsa(p, 'totale'))}>≤</span>
            </>
          ) : (
            // «+5 = 22» (d20 e 2d6): il modificatore, il totale.
            <>
              <span data-testid="carta-modificatore" className={clsx('font-bold text-pergamena-2 tabular-nums', m.modificatore, comparsa(p, 'modificatore'))}>
                {conSegno(tiro.modificatore)}
              </span>
              <span className={clsx('text-cenere', m.uguale, comparsa(p, 'totale'))}>=</span>
              <span data-testid="carta-totale" className={clsx('font-extrabold text-pergamena tabular-nums', m.totale, comparsa(p, 'totale'))}>
                {tiro.totale}
              </span>
            </>
          )}
          {!automatico && (
            <span
              data-testid="carta-contro"
              aria-label={avversario ? `${avversario.nome} ${avversario.totale}` : testoBersaglioCarta(tiro)}
              className={clsx(
                'inline-flex shrink-0 items-baseline border border-bordo-chiaro bg-notte-3 font-bold whitespace-nowrap text-pergamena-2 tabular-nums',
                m.contro,
                comparsa(p, 'totale'),
              )}
            >
              {risoluzione === '2d6_fasce' ? (
                // Il 2d6 a fasce: al posto della CD c'è il nome della fascia.
                <span className="font-semibold text-candela-2">{testoBersaglioCarta(tiro)}</span>
              ) : (
                <>
                  <span className={clsx('font-semibold text-cenere', m.controTipo)}>{avversario ? avversario.nome : tiro.contro.tipo}</span>
                  {avversario ? avversario.totale : tiro.contro.valore}
                </>
              )}
            </span>
          )}
          {/* L'esito in fondo a destra; se non ci sta (es. «Colpo critico») va a capo, sempre a destra. */}
          <BadgeEsito esito={esito} className={clsx('ml-auto', m.badge, comparsa(p, 'esito', 'tiro-esito'))} />
        </div>

        {avversario && (
          // Contrapposta tra due PG: anche il tiro dell'altro, per confrontare i due totali.
          <p data-testid="carta-avversario" className={clsx('truncate leading-snug text-pergamena-2', m.piccolo, comparsa(p, 'totale'))}>
            <strong className="font-bold">{avversario.nome}</strong> · {avversario.etichetta}: {contoTiro(avversario)}
          </p>
        )}

        {note.length > 0 && (
          // Note piccole: perché quella CD, perché il vantaggio.
          <p data-testid="carta-note" className={clsx('line-clamp-2 leading-snug text-cenere', m.piccolo)}>
            {!avversario && !automatico && tiro.contro.descrizione && <span>{tiro.contro.descrizione}</span>}
            {note.length > 1 && <span> · </span>}
            {vantaggio && (
              <span data-testid="carta-vantaggio" className={tiro.vantaggio === 'vantaggio' ? 'text-muschio/90' : 'text-brace/90'}>
                {tiro.vantaggio === 'vantaggio' ? '▲ ' : '▼ '}
                {vantaggio}
              </span>
            )}
          </p>
        )}

        {regola && (
          // La regola applicata, in una riga piccola: solo nella forma intera (il telefono e il proiettore).
          <p data-testid="carta-regola" className={clsx('line-clamp-2 leading-snug text-cenere italic', m.regola)}>
            {regola}
          </p>
        )}

        {(colpito || tiro.a_terra) && (
          // Il danno e, se il bersaglio cade, «a terra»: si scoprono con l'esito.
          <p data-testid="carta-danno" className={clsx('flex flex-wrap items-center leading-snug', m.danno, comparsa(p, 'esito'))}>
            {colpito && tiro.danno && !automatico && <span className="font-semibold text-pergamena">{testoDanno(tiro.danno)}</span>}
            {tiro.a_terra && <Chip className={clsx(m.chip, 'border-sangue bg-sangue/20 text-sangue uppercase')}>{t('comune.carta.a_terra')}</Chip>}
          </p>
        )}
      </div>
    </article>
  );
}

function CartaCompatta(p: PropsInterne) {
  const { tiro, variante, esito } = p;
  const m = MISURE_COMPATTE[variante];
  const scartato = indiceDadoScartato(tiro);
  const risoluzione = risoluzioneDi(tiro);
  // Nella forma compatta solo il dado che conta (col 2d6 la somma, sotto soglia il tiro).
  const contato = scartato === null ? 0 : scartato === 0 ? 1 : 0;
  // Col 2d6 il numero del quadratino è la somma (`dado`), non una faccia: niente riporto nel range.
  const faccia = risoluzione === '2d6_fasce' ? tiro.dado : facciaNelRange(p.facce[contato] ?? tiro.dado, facceDi(tiro));
  const proiettore = variante === 'proiettore';

  // Sul telefono la riga è stretta: niente modificatore (c'è nella carta intera, a un tocco).
  // Sotto soglia il numero è il tiro (la soglia sta dopo il punto); col 2d6 il totale e la fascia.
  const automatico = testoAutomatico(tiro);
  const conto = automatico ? (
    // An automatic attack: the damage is the count.
    <span data-testid="carta-automatico" className={clsx('shrink-0 font-bold whitespace-nowrap text-pergamena tabular-nums', comparsa(p, 'totale'))}>
      {automatico}
    </span>
  ) : (
    <span className={clsx('shrink-0 whitespace-nowrap tabular-nums', comparsa(p, 'totale'))}>
      {proiettore && risoluzione !== 'sotto_soglia' && <span className="text-pergamena-2">{conSegno(tiro.modificatore)} = </span>}
      <strong className={clsx('font-extrabold text-pergamena', m.totale)}>{risoluzione === 'sotto_soglia' ? tiro.dado : tiro.totale}</strong>
      <span className="text-cenere">
        {' '}
        · {tiro.avversario ? `${tiro.avversario.nome} ${tiro.avversario.totale}` : testoBersaglioCarta(tiro)}
      </span>
    </span>
  );
  const chi = (
    <span className="min-w-0 truncate">
      <strong className={clsx('font-bold', coloreNome(tiro))}>{tiro.nome}</strong>
      {tiro.di_png && <span className="text-[#ff9a6b]"> ({t('comune.carta.png')})</span>}
      {tiro.privata && <span className="text-lago"> ({t('comune.carta.privata')})</span>}
      <span className="text-pergamena-2"> · {testoCosa(tiro)}</span>
    </span>
  );

  return (
    <article
      data-testid="carta-tiro"
      data-compatta
      data-id={tiro.id}
      data-tipo={tiro.tipo}
      data-esito={esito.tono}
      data-passo={p.passo}
      data-png={tiro.di_png}
      aria-label={descriviTiro(tiro)}
      className={clsx(classiCarta(p), 'items-center', m.carta, m.testo)}
    >
      {risoluzione === '2d6_fasce' ? (
        <DadoD6 faccia={faccia} passo={p.passo} animata={p.animata} className={m.dado} />
      ) : (
        <DadoD20 faccia={faccia} scartato={false} naturali={risoluzione === 'd20_cd'} passo={p.passo} animata={p.animata} className={m.dado} />
      )}
      {proiettore ? (
        // Proiettore: due righe (chi e cosa; conto ed esito), larghe quanto la colonna.
        <div className="flex min-w-0 flex-1 flex-col gap-[0.3vh] leading-tight">
          {chi}
          <div className="flex items-center gap-[0.6vw]">
            {conto}
            <span className="flex-1" />
            <BadgeEsito esito={esito} className={clsx(m.badge, comparsa(p, 'esito', 'tiro-esito'))} />
          </div>
        </div>
      ) : (
        // Telefono: una riga sola, il «cosa» si tronca.
        <div className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
          {chi}
          <span className="flex-1" />
          {conto}
          <BadgeEsito esito={esito} className={clsx(m.badge, comparsa(p, 'esito', 'tiro-esito'))} />
        </div>
      )}
    </article>
  );
}

// ------------------------------------------------------------------ pezzi

function Chip({ children, className }: { children: string; className?: string }) {
  return <span className={clsx('shrink-0 border leading-tight font-bold tracking-wide whitespace-nowrap', className)}>{children}</span>;
}

function BadgeEsito({ esito, className }: { esito: EsitoTiro; className?: string }) {
  return (
    <span
      data-testid="carta-esito"
      data-tono={esito.tono}
      className={clsx(
        'inline-flex shrink-0 items-center leading-tight font-extrabold whitespace-nowrap',
        TONO[esito.tono].badge,
        // 20 o 1 naturale su un attacco: un anello in più, si nota anche di sfuggita.
        esito.speciale && 'ring-2 ring-candela-2 ring-offset-2 ring-offset-notte',
        className,
      )}
    >
      <span aria-hidden>{esito.simbolo}</span>
      {esito.testo}
    </span>
  );
}

/**
 * Un d6 (quadratino col numero): il 2d6 a fasce. Gira come il d20 e, fermo, mostra la faccia uscita;
 * niente accensioni a 6 o 1 (la fascia dice già tutto).
 */
function DadoD6({ faccia, passo, animata, className }: { faccia: number; passo: PassoAnimazione; animata: boolean; className: string }) {
  const gira = passo === 'lancio';
  const fermo = !gira && passo !== 'attesa';
  return (
    <span
      data-testid="carta-dado"
      data-tipo-dado="d6"
      data-faccia={fermo ? faccia : undefined}
      className={clsx(
        'inline-grid shrink-0 place-items-center rounded-[18%] border-2 border-current bg-notte-3 leading-none font-extrabold tabular-nums',
        className,
        gira ? 'tiro-gira text-candela' : 'text-pergamena',
        fermo && animata && 'tiro-fermo',
      )}
    >
      {passo === 'attesa' ? '' : faccia}
    </span>
  );
}

/**
 * Un d20 disegnato (esagono con il triangolo della faccia) col numero al centro. Mentre gira rotola
 * e il bordo è color candela; fermo, il 20 si accende d'oro e l'1 di brace. Quello scartato è spento.
 */
function DadoD20({
  faccia,
  scartato,
  naturali = true,
  passo,
  animata,
  className,
}: {
  faccia: number;
  scartato: boolean;
  /** 20 e 1 naturali si accendono solo col d20 contro CD o CA: sotto soglia il numero non dice «bene» o «male». */
  naturali?: boolean;
  passo: PassoAnimazione;
  animata: boolean;
  className: string;
}) {
  const gira = passo === 'lancio';
  const fermo = !gira && passo !== 'attesa';
  const naturale = fermo && !scartato && naturali ? (faccia === 20 ? 'venti' : faccia === 1 ? 'uno' : null) : null;
  return (
    <span
      data-testid="carta-dado"
      data-faccia={fermo ? faccia : undefined}
      data-scartato={scartato || undefined}
      className={clsx(
        'relative inline-grid shrink-0 place-items-center',
        className,
        scartato && fermo && 'opacity-55',
        gira ? 'tiro-gira text-candela' : naturale === 'venti' ? 'text-candela-2' : naturale === 'uno' ? 'text-brace' : 'text-pergamena-2',
        fermo && animata && 'tiro-fermo',
      )}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        className={clsx('absolute inset-0 size-full', naturale === 'venti' && 'drop-shadow-[0_0_0.6vw_rgb(247_213_144/0.8)]')}
      >
        {/* Sagoma: esagono; faccia: triangolo; spigoli verso i vertici. */}
        <polygon points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" className="fill-notte-3" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <g stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.45" strokeLinejoin="round">
          <polygon points="50,20 80,71 20,71" />
          <path d="M50,20 L50,3 M50,20 L9,26.5 M50,20 L91,26.5 M80,71 L91,26.5 M80,71 L91,73.5 M80,71 L50,97 M20,71 L9,26.5 M20,71 L9,73.5 M20,71 L50,97" />
        </g>
      </svg>
      <span
        className={clsx(
          'relative pt-[12%] leading-none font-extrabold text-pergamena tabular-nums',
          naturale === 'venti' && 'text-candela-2',
          naturale === 'uno' && 'text-brace',
          scartato && fermo && 'line-through decoration-2',
        )}
      >
        {passo === 'attesa' ? '' : faccia}
      </span>
    </span>
  );
}
