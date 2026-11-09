/**
 * `orologi[].parte_dopo` (docs/repertorio.md, «Proposte per il Motore»): l'orologio aspetta finché
 * esce una di quelle battute o si rivela uno di quegli indizi. Prima non avanza, non è dovuto, i
 * suoi segni non entrano in catalogo; il ritmo minimo conta dalla partenza. Il master lo fa partire.
 */
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import type { Campagna, DatiYaml } from '../src/campagna/tipi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

/** La campagna mini con o_temporale che parte dopo la battuta nar_brocca (o l'indizio i_brocca). */
function conParteDopo(dopo: string[]): Campagna {
  const c = caricaCampagna(MINI);
  const orologi = (c.campagnaNarratore['orologi'] as DatiYaml[]).map((o) => (o['id'] === 'o_temporale' ? { ...o, parte_dopo: dopo } : o));
  return { ...c, campagnaNarratore: { ...c.campagnaNarratore, orologi } };
}

describe('parte_dopo', () => {
  it('prima della partenza: non avanza, non è dovuto, il narratore lo vede fermo', () => {
    const o = new StatoOrologi(conParteDopo(['nar_brocca']));
    const t = o.elenco[0]!;
    expect(t).toMatchObject({ id: 'o_temporale', partito: false, parteDopo: ['nar_brocca'] });
    expect(o.avanza('o_temporale', 1, false)).toMatchObject({ ok: false, motivo: expect.stringMatching(/non ancora partito/) });
    expect(o.dovuto(t, 10)).toBe(false);
    expect(o.descrivi(3)).toContain('non ancora partito');
    expect(o.descrivi(3)).not.toContain('Prossimo segno');
    expect(o.descriviRepertorio(3)).toContain('non ancora partito');
  });

  it('parte quando esce l’id; il ritmo minimo conta dalla partenza', () => {
    const o = new StatoOrologi(conParteDopo(['i_brocca']));
    expect(o.segnala(['nar_altro'], 2).map((x) => x.id)).toEqual([]);
    expect(o.segnala(['nar_brocca', 'i_brocca'], 4).map((x) => x.id)).toEqual(['o_temporale']);
    const t = o.elenco[0]!;
    // La partenza non è un segno: ultimoTurno resta quello dell'ultimo segno, il ritmo conta da partitoAl.
    expect(t).toMatchObject({ partito: true, partitoAl: 4, ultimoTurno: null });
    expect(o.dovuto(t, 5)).toBe(false); // segno_almeno_ogni: 2
    expect(o.dovuto(t, 6)).toBe(true);
    expect(o.avanza('o_temporale', 6, false).ok).toBe(true);
    expect(o.segnala(['i_brocca'], 7)).toEqual([]); // una volta sola
  });

  it('senza parte_dopo l’orologio corre da subito', () => {
    const o = new StatoOrologi(caricaCampagna(MINI));
    expect(o.elenco[0]!.partito).toBe(true);
  });

  it('il master lo fa partire a mano', () => {
    const o = new StatoOrologi(conParteDopo(['nar_brocca']));
    expect(o.avvia('o_temporale', 3)).toBe(true);
    expect(o.avvia('o_temporale', 3)).toBe(false);
    expect(o.avanza('o_temporale', 3, false).ok).toBe(true);
  });
});

describe('parte_dopo nel repertorio', () => {
  it('i segni restano fuori finché la battuta d’avvio non esce; poi entrano', () => {
    const c = conParteDopo(['nar_brocca']);
    const rep = caricaRepertorio(c);
    const orologi = new StatoOrologi(c);
    const s = new StatoRepertorio(rep, c, orologi);
    const tuono = rep.perId.get('nar_tuono')!;
    expect(s.motivoIndisponibile(tuono)).toBe('orologio o_temporale non ancora partito');
    expect(s.catalogo({ turno: 1, azioni: [], stallo: false, segnoDovuto: true, nomiPng: new Map(), parole: [] }).battute.map((b) => b.id)).not.toContain('nar_tuono');
    const uso = s.usa('nar_brocca', 2, false);
    expect(uso.ok && uso.orologiPartiti).toEqual(['o_temporale']);
    expect(s.motivoIndisponibile(tuono)).toBeNull();
  });
});
