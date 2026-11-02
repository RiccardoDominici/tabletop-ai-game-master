import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { compilaContestoCampagna } from '../src/campagna/contesto';
import { ORDINE_SEGNO, StatoOrologi } from '../src/scena/orologi';
import { creaPronunciatore } from '../src/voce/pronuncia';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

describe('StatoOrologi', () => {
  it('solo gli orologi attivi in scena; avanza se lecito, uno per risposta, mai oltre il completo', () => {
    const o = new StatoOrologi(caricaCampagna(MINI));
    expect(o.elenco.map((x) => x.id)).toEqual(['o_temporale']);
    expect(o.descrivi(1)).toContain('segni mostrati 0 di 2');
    expect(o.descrivi(1)).toContain('Prossimo segno: «Un tuono lontano.»');
    expect(o.avanza('o_fuori', 1, false)).toMatchObject({ ok: false });
    expect(o.avanza('o_temporale', 1, false)).toMatchObject({ ok: true });
    expect(o.avanza('o_temporale', 1, true)).toMatchObject({ ok: false, motivo: expect.stringMatching(/più di un segno/) });
    expect(o.descrivi(2)).toContain('la tua risposta precedente ha mostrato un segno');
    expect(o.descrivi(2)).toContain('«La porta sbatte.»');
    expect(o.avanza('o_temporale', 3, false)).toMatchObject({ ok: true });
    expect(o.avanza('o_temporale', 4, false)).toMatchObject({ ok: false, motivo: expect.stringMatching(/completo/) });
    expect(o.descrivi(5)).toContain('COMPLETO');
    expect(o.descrivi(5)).toContain('Il fiume esonda.');
    expect(o.riepilogo()).toEqual({ o_temporale: '2/2' });
  });
});

describe('StatoOrologi — segno_almeno_ogni', () => {
  it('ordina il segno quando (turno − ultimo segno, 0 se nessuno) ≥ N, e mai a orologio completo', () => {
    const o = new StatoOrologi(caricaCampagna(MINI)); // o_temporale: segno_almeno_ogni 2, 2 segmenti
    expect(o.descrivi(1)).not.toContain(ORDINE_SEGNO); // 1 − 0 = 1
    expect(o.descrivi(2)).toContain(`«Un tuono lontano.» ${ORDINE_SEGNO}`); // 2 − 0 = 2
    expect(o.avanza('o_temporale', 2, false)).toMatchObject({ ok: true });
    expect(o.descrivi(3)).not.toContain(ORDINE_SEGNO); // 3 − 2 = 1
    expect(o.descrivi(4)).toContain(ORDINE_SEGNO); // 4 − 2 = 2
    expect(o.descrivi(9)).toContain(ORDINE_SEGNO);
    expect(o.avanza('o_temporale', 9, false)).toMatchObject({ ok: true }); // ora completo
    expect(o.descrivi(20)).not.toContain(ORDINE_SEGNO);
    expect(o.descrivi(20)).toContain('COMPLETO');
  });
});

describe('creaPronunciatore', () => {
  it('sostituisce i nomi con gli accenti di pronuncia, solo a parole intere', () => {
    const p = creaPronunciatore(caricaCampagna(MINI));
    expect(p('Bruno guarda Oste Bruno. Brunone no.')).toBe('Brùno guarda Òste Brùno. Brunone no.');
    expect(p('Niente nomi qui.')).toBe('Niente nomi qui.');
  });
});

describe('compilaContestoCampagna — fatti risolti', () => {
  it('gli id del canone nelle schede PNG diventano «id — testo»', () => {
    const t = compilaContestoCampagna(caricaCampagna(MINI));
    expect(t).toContain("f_oste_ladro — L'oste annacqua il vino.");
    expect(t).toContain('[orologio]');
  });
});
