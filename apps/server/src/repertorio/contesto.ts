/**
 * Contesto del selettore (modalità repertorio, B) costruito per ALLOWLIST: entra solo ciò che è
 * pubblico o serve a recitare i PNG. Le battute che toccano i segreti sono già scritte, quindi il
 * modello veloce non ha bisogno di conoscerli: non può rivelare ciò che non sa (E2 all'estremo).
 *
 * Entra (blocco di sistema stabile, in cache):
 * - stile.yaml (tono, regole di prosa, linee e veli);
 * - campagna: fatti del canone con noto_ai_pg: true, luoghi (nome e abbozzo, senza indizi),
 *   sessione.riassunto_iniziale, nome degli orologi;
 * - scena: nome, descrizione, domanda drammatica, intensità, sensi, elementi interattivi tranne
 *   quelli NASCOSTI, PNG presenti, taglio;
 * - PNG: nome, pronuncia, aspetto.lettura, personalita (superficie, sotto_pressione), voce senza
 *   mai_dice, atteggiamento verso i PG (solo lo stato), `sa` limitato
 *   ai fatti pubblici;
 * - PG: tutto tranne conoscenze_private; situazione comune.
 * Restano fuori, tra l'altro: mente_su (e la verità), segreto, non_sa, crede_a_torto, desiderio,
 * paura, indizi e come_si_trova, rivelazioni, colli di bottiglia, orologi (segni e al_completo),
 * posta, scopo, mossa morbida, fatti nascosti non ancora scoperti, preparazione.
 *
 * Rete di sicurezza: in ogni stringa ammessa si tolgono le frasi che contengono una parola
 * segreta (parole_segrete.yaml: è la campagna a dire cosa è segreto, nel codice non c'è nessuna
 * espressione di una campagna). Variabile per turno (messaggio utente):
 * fatti scoperti, stato degli orologi, battute disponibili (vedi messaggioRepertorio).
 */
import YAML from 'yaml';
import type { SezioneContesto } from '../campagna/contesto';
import { ID_NARRATORE, type Campagna, type DatiYaml } from '../campagna/tipi';
import { testo } from '../lingua';
import { togliFrasiSegrete, type ParolaSegreta } from './segreti';
import type { Repertorio } from './tipi';


function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Copia «pulita»: ogni stringa perde le frasi segrete; chiavi e voci vuote spariscono. */
function pulisci(valore: unknown, parole: ParolaSegreta[]): unknown {
  if (typeof valore === 'string') {
    const t = togliFrasiSegrete(valore, parole);
    return t || undefined;
  }
  if (Array.isArray(valore)) {
    const out = valore.map((v) => pulisci(v, parole)).filter((v) => v !== undefined);
    return out.length ? out : undefined;
  }
  if (valore !== null && typeof valore === 'object') {
    const out: DatiYaml = {};
    for (const [k, v] of Object.entries(valore as DatiYaml)) {
      const p = pulisci(v, parole);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return valore;
}

function prendi(d: DatiYaml, chiavi: string[]): DatiYaml {
  const out: DatiYaml = {};
  for (const k of chiavi) if (d[k] !== undefined) out[k] = d[k];
  return out;
}

function yaml(dati: unknown): string {
  return YAML.stringify(dati ?? {}, { lineWidth: 0, minContentWidth: 0 }).trimEnd();
}

/** Fatti del canone pubblici fin dall'inizio: id → testo. */
export function fattiPubblici(c: Campagna): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of (c.campagnaNarratore['canone'] as DatiYaml[] | undefined) ?? []) {
    if (f?.['noto_ai_pg'] === true && typeof f['id'] === 'string' && typeof f['testo'] === 'string') out.set(f['id'], f['testo']);
  }
  return out;
}

/** Quante battute d'esempio per PNG (bastano per il tono; di più allunga il contesto). */
const ESEMPI_PER_PNG = 6;

/**
 * Le sezioni del contesto del selettore. Titoli e frasi vengono dal pacchetto della lingua dei
 * contenuti (`contesto` e `contesto.repertorio`), letti a ogni compilazione; le chiavi YAML
 * (`fatti_noti_ai_pg`, `sa_pubblico`…) sono nomi di campo e restano come sono.
 */
export function sezioniContestoRepertorio(c: Campagna, parole: ParolaSegreta[], repertorio?: Repertorio): SezioneContesto[] {
  const pubblici = fattiPubblici(c);
  const sez: SezioneContesto[] = [];
  const aggiungi = (nome: string, titolo: string, dati: unknown): void => {
    const pulito = pulisci(dati, parole);
    if (pulito !== undefined) sez.push({ nome, testo: `${titolo}\n\n${yaml(pulito)}` });
  };

  sez.push({ nome: 'intestazione', testo: testo('contesto.repertorio.intestazione', { titolo: c.titolo }) });
  aggiungi('stile.yaml', testo('contesto.carta_stile'), c.stile);

  // Campagna: solo il pubblico.
  const luoghi = ((c.campagnaNarratore['nodi'] as DatiYaml[] | undefined) ?? [])
    .filter((n) => n?.['tipo'] === 'luogo' || n?.['tipo'] === 'evento')
    .map((n) => prendi(n, ['id', 'nome', 'abbozzo']));
  const sessione = c.campagnaNarratore['sessione'] as DatiYaml | undefined;
  const orologi = ((c.campagnaNarratore['orologi'] as DatiYaml[] | undefined) ?? []).map((o) => prendi(o, ['id', 'nome']));
  aggiungi('campagna.yaml', testo('contesto.repertorio.titolo_campagna'), {
    fatti_noti_ai_pg: [...pubblici].map(([id, testo]) => `${id} — ${testo}`),
    luoghi,
    orologi,
    ...(sessione?.['riassunto_iniziale'] ? { riassunto_iniziale: sessione['riassunto_iniziale'] } : {}),
  });

  // Scena: allowlist, senza gli elementi NASCOSTI.
  const s = c.scena.dati;
  const elementi = ((s['elementi_interattivi'] as DatiYaml[] | undefined) ?? []).filter((e) => !/NASCOST/i.test(JSON.stringify(e)));
  aggiungi('scena.yaml', testo('contesto.scena', { titolo: c.scena.titolo }), {
    ...prendi(s, ['nome', 'descrizione', 'domanda_drammatica', 'intensita', 'sensi']),
    elementi_interattivi: elementi,
    ...prendi(s, ['png_presenti', 'taglio']),
  });

  // PNG: persona pubblica e voce.
  sez.push({ nome: 'png (titolo)', testo: testo('contesto.repertorio.titolo_png') });
  for (const p of c.png) {
    const d = p.dati;
    const aspetto = d['aspetto'] as DatiYaml | undefined;
    const personalita = d['personalita'] as DatiYaml | undefined;
    const voce = { ...((d['voce'] as DatiYaml | undefined) ?? {}) };
    delete voce['mai_dice'];
    delete voce['tts'];
    const atteggiamento = d['atteggiamento_pg'] as Record<string, DatiYaml> | undefined;
    const sa = (Array.isArray(d['sa']) ? (d['sa'] as unknown[]) : [])
      .filter((x): x is string => typeof x === 'string' && pubblici.has(x))
      .map((id) => `${id} — ${pubblici.get(id)}`);
    const presenza = testo(c.scena.png_presenti.includes(p.id) ? 'contesto.presente' : 'contesto.assente');
    aggiungi(`png/${p.id}.yaml`, testo('contesto.png', { nome: p.nome, id: p.id, presenza }), {
      nome: d['nome'],
      ...(d['pronuncia'] ? { pronuncia: d['pronuncia'] } : {}),
      ...(aspetto?.['lettura'] ? { aspetto: aspetto['lettura'] } : {}),
      ...(personalita ? { personalita: prendi(personalita, ['superficie', 'sotto_pressione']) } : {}),
      voce,
      ...(atteggiamento
        ? { atteggiamento_pg: Object.fromEntries(Object.entries(atteggiamento).map(([pg, a]) => [pg, stringa(a?.['stato']) ?? ''])) }
        : {}),
      sa_pubblico: sa,
    });
  }

  // B2: esempi della voce dei PNG (battute `solo_esempio`): il tono per improvvisare, non frasi da ripetere.
  if (repertorio) {
    const esempi: string[] = [];
    for (const p of c.png) {
      const righe = repertorio.battute
        .filter((b) => b.solo_esempio && b.chi === p.id)
        .flatMap((b) => b.testo.filter((r) => r.etichetta === p.id).map((r) => `${b.quando} → ${r.testo}`))
        .map((r) => togliFrasiSegrete(r, parole))
        .filter((r) => r.includes('→ ') && !r.endsWith('→'))
        .slice(0, ESEMPI_PER_PNG);
      if (righe.length) esempi.push(`### ${p.nome} [${p.id}]\n${righe.map((r) => `- ${r}`).join('\n')}`);
    }
    if (esempi.length) {
      sez.push({ nome: 'esempi di voce', testo: `${testo('contesto.repertorio.titolo_esempi')}\n\n${esempi.join('\n\n')}` });
    }
  }

  // PG: tutto tranne le conoscenze private (vanno solo ai telefoni).
  const pg = [testo('contesto.titolo_pg')];
  if (c.situazioneComune) pg.push(testo('contesto.situazione_comune', { testo: c.situazioneComune }));
  sez.push({ nome: 'pg (titolo)', testo: pg.join('\n\n') });
  for (const p of c.pg) aggiungi(`pg/${p.id}`, testo('contesto.pg', { nome: p.nome, id: p.id }), p.pubblico);

  sez.push({
    nome: 'etichette',
    testo: [
      testo('contesto.titolo_etichette'),
      [
        testo('contesto.repertorio.etichetta_usa'),
        `- [${ID_NARRATORE}]`,
        ...c.png.map((p) => `- [${p.id}] ${p.nome}`),
        testo('contesto.etichetta_invito', { pg: c.pg.map((p) => p.id).join(', ') }),
      ].join('\n'),
    ].join('\n\n'),
  });
  return sez;
}

export function compilaContestoRepertorio(c: Campagna, parole: ParolaSegreta[], repertorio?: Repertorio): string {
  return sezioniContestoRepertorio(c, parole, repertorio)
    .map((s) => s.testo)
    .join('\n\n') + '\n';
}
