/**
 * Parole delle prove: etichette delle carte e righe di fatto per il narratore (docs/prove.md,
 * «Narrazione»). Il narratore riceve l'esito come un fatto già deciso e ne racconta la conseguenza;
 * i numeri gli servono per misurare il margine, non si leggono a voce (lo dice il prompt).
 *
 * Le frasi stanno nel pacchetto della lingua dei contenuti (lingue/<codice>/testi-prove.yaml, chiavi
 * «prove.…») e i nomi in prove.yaml: qui solo come si compongono. Si leggono al momento dell'uso.
 */
import type { TiroMostrato } from '@cantastorie/shared';
import { CARATTERISTICA_DI, nomeAbilita, nomeCaratteristica, type Abilita, type Caratteristica } from '../campagna/regole-srd';
import { testo } from '../lingua';
import { datiProve, nomeOppure } from './lingua';

export function etichettaProva(abilita: Abilita | null, caratteristica: Caratteristica | null): string {
  if (abilita) return etichettaComposta(nomeAbilita(abilita), nomeCaratteristica(CARATTERISTICA_DI[abilita]));
  return testo('prove.etichetta.caratteristica', { caratteristica: nomeCaratteristica(caratteristica ?? 'forza') });
}

/** «Persuasione (Carisma)» con nomi già pronti (anche quelli di un set del manuale). */
export function etichettaComposta(abilita: string, caratteristica: string): string {
  return testo('prove.etichetta.abilita', { abilita, caratteristica });
}

export function etichettaSalvezza(c: Caratteristica): string {
  return testo('prove.etichetta.salvezza', { caratteristica: nomeCaratteristica(c) });
}

/** Stato di salute in parole, dai punti ferita (per il narratore: niente numeri dei PNG a voce). */
export function salute(attuali: number, massimi: number): string {
  if (attuali <= 0) return testo('prove.salute.a_terra');
  if (attuali * 2 > massimi) return testo('prove.salute.regge');
  return testo('prove.salute.grave');
}

/** Come sta un PG dopo un colpo (i suoi numeri il narratore li sente: i giocatori li vedono sul telefono). */
export function salutePg(attuali: number, massimi: number): string {
  return attuali <= 0 ? testo('prove.salute.pg_a_terra') : testo('prove.salute.pg', { attuali, massimi });
}

/**
 * Tipo di danno nella forma che segue «danni» (tipi dell'SRD 5.2): «danni perforanti», «danni da
 * fuoco»; in inglese «piercing damage». Dal pacchetto: il plurale per id, se no la regola_plurale
 * della lingua (in italiano la finale -e diventa -i), se no com'è scritto.
 */
export function tipoDanno(tipo: string): string {
  const d = datiProve().nomi.danni;
  const k = tipo.trim().toLowerCase();
  if (Object.hasOwn(d.plurale, k)) return d.plurale[k]!;
  const [finale, sostituto] = d.regola_plurale;
  return finale !== undefined && k.endsWith(finale) ? `${k.slice(0, -finale.length)}${sostituto ?? ''}` : k;
}

/**
 * Tipo di danno al singolare («1 danno perforante», «1 piercing damage»): un id dell'SRD che nella
 * lingua ha un altro nome si traduce, tutto il resto resta com'è scritto nella scheda.
 */
export function tipoDannoSingolare(tipo: string): string {
  const k = tipo.trim().toLowerCase();
  const nomi = datiProve().nomi.danni.nome;
  return Object.hasOwn(nomi, k) && nomi[k] !== k ? nomi[k]! : tipo;
}

/** «7 danni perforanti» / «1 danno» / «7 piercing damage»: `tipo` già nella forma giusta, o null. */
export function fraseDanno(n: number, tipo: string | null): string {
  const quanti = n === 1 ? 'uno' : 'molti';
  return tipo ? testo(`prove.danno.${quanti}_tipo`, { n, tipo }) : testo(`prove.danno.${quanti}`, { n });
}

/** «vantaggio» / «svantaggio» nella lingua dei contenuti (dentro una frase). */
export function parolaVantaggio(v: string): string {
  return nomeOppure('vantaggio', v);
}

/** « (con vantaggio: motivo)», o niente. */
export function conVantaggio(vantaggio: string | null, motivo: string | null = null): string {
  if (!vantaggio) return '';
  return motivo ? testo('prove.vantaggio.con_motivo', { vantaggio: parolaVantaggio(vantaggio), motivo }) : testo('prove.vantaggio.con', { vantaggio: parolaVantaggio(vantaggio) });
}

function vantaggioTesto(t: TiroMostrato): string {
  return conVantaggio(t.vantaggio, t.motivo_vantaggio);
}

/** «17 contro CD 15» / «19 contro CA 12». */
function confronto(t: TiroMostrato): string {
  return testo('prove.confronto', { totale: t.totale, contro: nomeOppure('contro', t.contro.tipo), valore: t.contro.valore });
}

/** Una carta di tiro come riga di fatto (senza il nome dell'autore all'inizio). */
export function fattoTiro(t: TiroMostrato, saluteBersaglio: string | null): string {
  switch (t.tipo) {
    case 'attacco': {
      const verso = t.bersaglio ? testo('prove.fatto.verso_attacco', { bersaglio: t.bersaglio.nome }) : '';
      const comune = { arma: t.etichetta, verso, vantaggio: vantaggioTesto(t), confronto: confronto(t) };
      if (!t.riuscita) return testo('prove.fatto.attacco', { ...comune, naturale: t.fallimento_critico ? testo('prove.fatto.uno_naturale') : '', esito: testo('prove.esito.mancato'), critico: '', danno: '', stato: '' });
      const d = t.danno;
      const danno = d ? testo('prove.fatto.danno', { danno: fraseDanno(d.totale, d.tipo ? (d.totale === 1 ? tipoDannoSingolare(d.tipo) : tipoDanno(d.tipo)) : null) }) : '';
      const stato = saluteBersaglio && t.bersaglio ? testo('prove.fatto.stato', { bersaglio: t.bersaglio.nome, salute: saluteBersaglio }) : '';
      return testo('prove.fatto.attacco', { ...comune, naturale: '', esito: testo('prove.esito.colpito'), critico: t.critico ? testo('prove.fatto.critico') : '', danno, stato });
    }
    case 'salvezza':
      return testo('prove.fatto.salvezza', { etichetta: t.etichetta.toLowerCase(), vantaggio: vantaggioTesto(t), confronto: confronto(t), esito: testo(t.riuscita ? 'prove.esito.riuscito' : 'prove.esito.fallito') });
    case 'contrapposta': {
      if (t.avversario) {
        const esito = t.riuscita ? testo('prove.esito.vince') : t.totale === t.avversario.totale ? testo('prove.esito.pari') : testo('prove.esito.perde');
        return testo('prove.fatto.contrapposta', { etichetta: t.etichetta, etichetta_avversario: t.avversario.etichetta, avversario: t.avversario.nome, vantaggio: vantaggioTesto(t), totale: t.totale, totale_avversario: t.avversario.totale, esito });
      }
      const contro = t.contro.descrizione ? testo('prove.fatto.contro', { descrizione: t.contro.descrizione }) : '';
      return testo('prove.fatto.contrapposta_passiva', { etichetta: t.etichetta, contro, vantaggio: vantaggioTesto(t), confronto: confronto(t), esito: esitoProva(t.riuscita) });
    }
    case 'prova': {
      const verso = t.bersaglio ? testo('prove.fatto.verso_prova', { bersaglio: t.bersaglio.nome }) : '';
      return testo('prove.fatto.prova', { etichetta: t.etichetta, verso, vantaggio: vantaggioTesto(t), confronto: confronto(t), esito: esitoProva(t.riuscita) });
    }
  }
}

/** RIUSCITA / FALLITA (prove e contrapposte). */
export function esitoProva(riuscita: boolean): string {
  return testo(riuscita ? 'prove.esito.riuscita' : 'prove.esito.fallita');
}

/** COLPITO / MANCATO (attacchi). */
export function esitoAttacco(riuscita: boolean): string {
  return testo(riuscita ? 'prove.esito.colpito' : 'prove.esito.mancato');
}

/** Nessun tiro: l'azione è banale o sicura. */
export function fattoNessunTiro(): string {
  return testo('prove.fatto.nessun_tiro');
}

/** Servirebbe un tiro, ma il PG non ha una scheda. */
export function fattoSenzaScheda(): string {
  return testo('prove.fatto.senza_scheda');
}

/** L'arbitro non ha deciso (assente, lento o in errore). */
export function fattoSenzaArbitro(): string {
  return testo('prove.fatto.senza_arbitro');
}

export function fattoImpossibile(motivo: string): string {
  return testo('prove.fatto.impossibile', { motivo: motivo ? testo('prove.fatto.impossibile_motivo', { motivo: motivo.replace(/[.\s]+$/, '') }) : '' });
}

export function fattoAiuto(aiutato: string | null): string {
  return aiutato ? testo('prove.fatto.aiuta', { aiutato }) : testo('prove.fatto.aiuta_niente');
}

export function fattoGiaATerra(nome: string): string {
  return testo('prove.fatto.gia_a_terra', { nome });
}

/** Un attacco a un bersaglio senza scheda (o senza bersaglio): nessun tiro, «sì, ma». */
export function fattoAttaccoSenzaScheda(bersaglio: string | null): string {
  return testo('prove.fatto.attacco_senza_scheda', { bersaglio: bersaglio ?? testo('prove.fatto.qualcuno') });
}

/** Il prefisso di un'azione PRIVATA nella riga di fatto: l'esito va solo nella riga [privato pg_x]. */
export function notaPrivata(autore: string): string {
  return testo('prove.fatto.privata', { autore });
}

/** La riga di fatto di un'azione: «[2] Corrado Lanzi: …», con la nota se è privata. */
export function prefissoFatto(n: number, nome: string, autore: string, privata: boolean): string {
  return `[${n}] ${nome}${privata ? notaPrivata(autore) : ''}: `;
}

/**
 * La frase esplicita di un attacco di un PNG, prima dei dettagli: «Ruggero colpisce Corrado: 6 danni.»
 * oppure «Ruggero manca Corrado.». La e2e del 10 novembre: il narratore lasciava il colpo solo intuire.
 */
export function fraseAttaccoPng(t: TiroMostrato): string {
  const b = t.bersaglio?.nome ?? testo('prove.fatto.il_bersaglio');
  if (!t.riuscita) return testo('prove.fatto.png_manca', { nome: t.nome, bersaglio: b });
  const n = t.danno?.totale ?? 0;
  return testo('prove.fatto.png_colpisce', { nome: t.nome, bersaglio: b, danni: fraseDanno(n, null), a_terra: t.a_terra ? testo('prove.fatto.png_a_terra', { bersaglio: b }) : '' });
}

/** Intestazione della sezione nel messaggio del narratore. */
export function titoloEsiti(): string {
  return testo('prove.esiti.titolo');
}

/** La regola della sezione «Esiti dei tiri» (prima delle righe di fatto). */
export function regolaEsiti(): string {
  return testo('prove.esiti.regola');
}
