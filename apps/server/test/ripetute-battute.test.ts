/**
 * R-ripetuta on the lines that come out (A30, docs/coerenza.md): round 7 in profile A repeated an NPC's gesture through
 * two different lines («Ugo batte la pala per terra due volte.» at T10 by a scriptwriter line and at T14 by a prepared
 * one), and the rule judged improvised sentences only. Invented fixture (mini), scripted narrator, no model call.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { chiaviRipetizione, giàSentita, ripete } from '../src/coerenza/ripetute';
import { inizia, Prova, turno } from './aiuti/partita';

describe('the keys and the match', () => {
  it('per sentence; the same words, or the same gesture with a tail (five words or more)', () => {
    const sentite = new Set(chiaviRipetizione("L'oste asciuga lo stesso bicchiere col grembiule. Qui si beve."));
    expect([...sentite]).toEqual(['l oste asciuga lo stesso bicchiere col grembiule', 'qui si beve']);
    expect(ripete('l oste asciuga lo stesso bicchiere col grembiule senza guardarvi', sentite)).toBe('l oste asciuga lo stesso bicchiere col grembiule');
    expect(ripete('l oste asciuga', sentite)).toBeNull();
    // Short sentences and short shared openings are never repetitions.
    expect(ripete('qui si beve', sentite)).toBeNull();
    expect(ripete('l oste asciuga un piatto', new Set(['l oste asciuga un bicchiere']))).toBeNull();
    expect(giàSentita("L'oste asciuga lo stesso bicchiere col grembiule. Qui si beve.", sentite)).toBe(true);
  });
});

describe('with the server: a line does not say again what this visit heard, nor an NPC tic just heard', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('the gesture after the three-turn window, the tic, and a line that would be emptied is said whole', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [
          { id: 'oste_bicchiere', chi: 'png_oste', tipo: 'reazione', quando: 'un PG chiede da bere', temi: ['bicchiere'], testo: ["[narratore] L'oste asciuga lo stesso bicchiere col grembiule.", '[png_oste] Qui si beve, non si chiacchiera.'], max_usi: 1 },
          { id: 'oste_nuvole', chi: 'png_oste', tipo: 'reazione', quando: 'un PG chiede del tempo', temi: ['nuvole'], testo: ["[png_oste] Ve l'ho detto: qui si beve, non si chiacchiera. Ma le nuvole vengono da nord."], max_usi: 1 },
          { id: 'oste_conto', chi: 'png_oste', tipo: 'reazione', quando: 'un PG chiede il conto', temi: ['conto'], testo: ["[narratore] L'oste asciuga lo stesso bicchiere col grembiule, senza guardarvi.", '[png_oste] Il conto lo fate dopo.'], max_usi: 1 },
          { id: 'oste_ancora', chi: 'png_oste', tipo: 'reazione', quando: 'un PG chiede del sidro', temi: ['sidro'], testo: ["[narratore] L'oste asciuga lo stesso bicchiere col grembiule."], max_usi: 1 },
        ],
      },
      ritocchi: { 'png/png_oste.yaml': (d) => void ((d['voce'] as Record<string, unknown>)['tic'] = ['«Qui si beve, non si chiacchiera.» quando lo si interroga']) },
    });
    const usa: Record<number, string> = { 1: 'oste_bicchiere', 2: 'oste_nuvole', 5: 'oste_conto', 6: 'oste_ancora' };
    const copione = (t: number): string => (usa[t] ? `[usa] ${usa[t]} > pg_anna\n[invito] tutti` : '[narratore] Anna, la pioggia batte sui vetri.\n[invito] tutti');
    const { url } = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    for (const azione of ["Chiedo un bicchiere all'oste.", "Chiedo all'oste delle nuvole.", 'Guardo la sala.', 'Mi siedo al tavolo.', "Chiedo il conto all'oste.", "Chiedo un sidro all'oste."]) {
      s = await turno(tel, 'pg_anna', s, azione);
    }
    const detto = (t: number): string => s.trascrizione.filter((v) => v.turno === t && (v.tipo === 'narrazione' || v.tipo === 'battuta')).map((v) => v.testo).join(' ');
    expect(detto(1)).toContain("L'oste asciuga lo stesso bicchiere col grembiule.");
    // T2: the tic heard at T1 in the oste's last lines: that sentence goes, the rest of the row stays.
    expect(detto(2)).not.toMatch(/qui si beve/i);
    expect(detto(2)).toContain('Ma le nuvole vengono da nord.');
    // T5, four turns later: the same gesture with a tail goes, the line's other row stays.
    expect(detto(5)).not.toMatch(/asciuga/);
    expect(detto(5)).toContain('Il conto lo fate dopo.');
    // T6: the line's only sentence is a repeat: never emptied, said whole.
    expect(detto(6)).toContain("L'oste asciuga lo stesso bicchiere col grembiule.");
    const viste = prova.narrazioni().filter((r) => r['tipo'] === 'violazione' && r['regola'] === 'R-ripetuta');
    expect(viste.map((r) => [r['turno'], r['battuta']])).toEqual([
      [2, 'oste_nuvole'],
      [5, 'oste_conto'],
    ]);
  }, 30_000);
});
