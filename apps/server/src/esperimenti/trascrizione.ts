/**
 * Trascrizione dello sperimentatore (trascrizione.md): per ogni turno le azioni e l'uscita del
 * narratore riga per riga, VERBATIM; ogni `[usa] id` è seguito dalle righe della battuta, marcate
 * come pre-scritte. I cambi di scena e le narrazioni interrotte hanno il loro blocco; le azioni
 * private sono marcate. (Per il giudice cieco c'è tavolo.md, senza nessuno di questi segni.)
 */
import type { Copione } from './copione';

type VoceUscita =
  | { tipo: 'usa'; id: string; versione: number; righe: Array<{ etichetta: string; testo: string }>; motore?: boolean }
  | { tipo: 'usa_rifiutato'; id: string; motivo: string }
  | { tipo: 'improvvisata'; etichetta: string; testo: string };

type AzioneRegistrata = { id_pg: string; testo: string | null; privata?: boolean; sospesa?: boolean };

function righeTurno(n: Record<string, unknown>, out: string[]): void {
  out.push(`## Turno ${String(n['turno'])}`, '', 'Azioni:');
  for (const a of (n['azioni'] as AzioneRegistrata[] | undefined) ?? []) {
    const segni = [a.privata ? 'privata' : null, a.sospesa ? 'sospesa' : null].filter(Boolean).join(', ');
    out.push(`- ${a.id_pg}${segni ? ` (${segni})` : ''}: ${a.testo ? `«${a.testo}»` : '(nessuna azione)'}`);
  }
  out.push('', 'Narratore:', '', '```text');
  const uscita = [...((n['uscita'] as VoceUscita[] | undefined) ?? [])];
  const testo = typeof n['testo'] === 'string' ? n['testo'] : `(nessun testo: ${String(n['errore'])})`;
  for (const riga of testo.split('\n')) {
    if (!riga.trim()) continue;
    if (/^\s*\[usa\]/i.test(riga)) {
      // Le battute aggiunte dal Motore non hanno una riga nel testo del modello: si saltano qui.
      const u = uscita.find((x) => (x.tipo === 'usa' && !x.motore) || x.tipo === 'usa_rifiutato');
      if (u) uscita.splice(uscita.indexOf(u), 1);
      out.push(riga.trim());
      if (u?.tipo === 'usa') for (const r of u.righe) out.push(`    ⟨pre-scritta${u.versione ? `, variante ${u.versione}` : ''}⟩ [${r.etichetta}] ${r.testo}`);
      else if (u?.tipo === 'usa_rifiutato') out.push(`    ⟨RIFIUTATA: ${u.motivo}⟩`);
      continue;
    }
    out.push(riga.trim());
  }
  out.push('```', '');
  for (const u of uscita.filter((x): x is Extract<VoceUscita, { tipo: 'usa' }> => x.tipo === 'usa' && !!x.motore)) {
    out.push(`Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] ${u.id}`, '', '```text', ...u.righe.map((r) => `⟨pre-scritta⟩ [${r.etichetta}] ${r.testo}`), '```', '');
  }
  const m = (n['misure'] ?? {}) as Record<string, unknown>;
  out.push(
    `- righe pre-scritte ${String(n['righe_prescritte'] ?? 0)}, improvvisate ${String(n['righe_improvvisate'] ?? 0)}, [usa] rifiutati ${String(n['usa_rifiutati'] ?? 0)}; azioni senza risposta ${String(n['azioni_senza_risposta'] ?? 0)}/${String(n['azioni_pubbliche'] ?? 0)}, riparazioni ${String(n['riparazioni'] ?? 0)}; invito: ${JSON.stringify(n['invito'])}; anomalie: ${((n['anomalie'] as unknown[]) ?? []).length}`,
    `- primo audio dalla chiusura della finestra: ${String(m['schermo_inizio_audio'])} ms; buchi ${String(m['buchi'])} (in frase ${String(m['buchi_in_frase'])}, tra frasi ${String(m['buchi_tra_frasi'])}, silenzio ${String(m['silenzio_ms'])} ms); costo $${String(m['costo_usd'])}`,
    '',
  );
}

export function trascrizione(etichetta: string, modo: string, sessione: string, campagna: string, narrazioni: Array<Record<string, unknown>>, copione: Copione): string {
  const out: string[] = [`# Trascrizione ${etichetta}`, '', `Campagna: ${campagna} · modalità: ${modo} · sessione ${sessione} · PG: ${copione.pg.join(', ')}`, ''];
  out.push(
    modo === 'repertorio'
      ? 'Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.'
      : 'Tutte le righe sono improvvisate dal modello.',
    '',
  );
  for (const n of narrazioni) {
    switch (n['tipo']) {
      case 'apertura':
        out.push(`## Turno 0 — apertura${n['scena'] ? ` (${String(n['scena'])})` : ''} (testo fisso della scena)`, '', '```text', String(n['testo']), '```', '');
        break;
      case 'cambio_scena':
        out.push(
          `## Turno ${String(n['turno'])} — cambio di scena ${String(n['da'])} → ${String(n['a'])} (comando del master; testo fisso della scena)`,
          '',
          `Azioni annullate dal cambio: ${JSON.stringify(n['azioni_annullate'] ?? [])}`,
          '',
          '```text',
          String(n['testo']),
          '```',
          '',
        );
        break;
      case 'interrotta':
        out.push(`## Turno ${String(n['turno'])} — narrazione interrotta (fase ${String(n['fase'])})`, '');
        break;
      case 'turno':
        righeTurno(n, out);
        break;
      default:
        out.push(`## Turno ${String(n['turno'])} — evento ${String(n['tipo'])}`, '');
    }
  }
  return out.join('\n');
}
