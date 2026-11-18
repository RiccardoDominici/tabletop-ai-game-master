/**
 * A22 (docs/coerenza.md §1): who holds what. The scenes' objects with an id (`elementi_interattivi[].id`, `chi`) are
 * tracked by the Engine: a line's `effetti.oggetti` (mode B) or the narrator's checked `[oggetto]` (mode A) moves them,
 * «Cosa è vero adesso» says who holds them, the snapshot keeps them. Invented fixture (mini), scripted narrator.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { ParserNarratore } from '../src/narrazione/parser';
import { StatoOggetti } from '../src/scena/oggetti';
import { inizia, Prova, turno } from './aiuti/partita';

const conChiave = {
  'scena.yaml': (d: Record<string, unknown>) =>
    void (d['elementi_interattivi'] = [...((d['elementi_interattivi'] as unknown[]) ?? []), { id: 'ogg_chiave', cosa: 'la chiave della cantina', dove: "alla cintura dell'oste", chi: 'png_oste', azioni: 'si chiede, si prende' }]),
};

describe('StatoOggetti and the [oggetto] line', () => {
  it('starts from the sheet; a holder must be a character or «scena»; the snapshot comes back', () => {
    const prova = new Prova();
    const o = new StatoOggetti(caricaCampagna(prova.campagna('mini', { ritocchi: conChiave })));
    expect(o.chi('ogg_chiave')).toBe('png_oste');
    expect(o.tenuti()).toEqual([{ id: 'ogg_chiave', nome: 'la chiave della cantina', chi: 'png_oste', turno: null }]);
    expect(o.sposta('ogg_chiave', 'pg_anna', 2)).toEqual({ ok: true, da: 'png_oste' });
    expect(o.sposta('ogg_chiave', 'pg_nessuno', 3)).toMatchObject({ ok: false, motivo: 'unknown holder pg_nessuno' });
    expect(o.sposta('ogg_nulla', 'pg_anna', 3)).toMatchObject({ ok: false, motivo: 'unknown object ogg_nulla' });
    const n = new StatoOggetti(caricaCampagna(prova.campagna('mini', { ritocchi: conChiave })));
    n.importa(o.esporta());
    expect(n.chi('ogg_chiave')).toBe('pg_anna');
    expect(n.sposta('ogg_chiave', 'scena', 4)).toEqual({ ok: true, da: 'pg_anna' });
    expect(n.chi('ogg_chiave')).toBeNull();
    void prova.chiudi();
  });

  it('the parser reads [oggetto] <id> <chi>, resolving an alias; a line without a holder is an anomaly', () => {
    const p = new ParserNarratore({ idPng: ['png_oste'], idPg: ['pg_anna'], alias: { anna: 'pg_anna' } });
    const e = [...p.aggiungi("[narratore] L'oste ti dà la chiave.\n[oggetto] ogg_chiave Anna\n[oggetto] ogg_chiave\n[invito] tutti\n"), ...p.chiudi()];
    expect(e.filter((x) => x.tipo === 'oggetto').map((x) => [(x as { id: string }).id, (x as { chi: string }).chi])).toEqual([['ogg_chiave', 'pg_anna']]);
    expect(e.some((x) => x.tipo === 'anomalia')).toBe(true);
  });
});

describe('with the server', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('mode B: a line gives the key to the PC it answers; the next message says who holds it', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      ritocchi: conChiave,
      battute: { 'png_oste.yaml': [{ id: 'oste_chiave', chi: 'png_oste', tipo: 'reazione', quando: "un PG chiede la chiave all'oste", temi: ['chiave'], testo: ['[png_oste] Tenete. Riportatela.'], effetti: { oggetti: { ogg_chiave: 'pg' } }, max_usi: 1 }] },
    });
    const { url, messaggi } = await prova.avvia(cartella, (t) => (t === 1 ? '[usa] oste_chiave > pg_anna\n[invito] tutti' : '[narratore] Anna, piove.\n[invito] tutti'));
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, "Chiedo la chiave all'oste.");
    s = await turno(tel, 'pg_anna', s, 'Scendo in cantina.');
    expect(messaggi.at(-1)).toContain("Chi ha che cosa: la chiave della cantina: ce l'ha Anna.");
    // At the start the key was at the oste's belt: said too, before the line (the sheet's holder is a fact).
    expect(messaggi.find((m) => m.includes("Chiedo la chiave all'oste"))).toContain("la chiave della cantina: ce l'ha Oste");
  }, 20_000);

  it('mode A: the narrator\'s [oggetto] is checked: a known holder here is accepted, an unknown object refused', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', { ritocchi: conChiave });
    const copione = (t: number): string => (t === 1 ? "[narratore] L'oste ti lancia la chiave, Anna.\n[oggetto] ogg_chiave pg_anna\n[oggetto] ogg_spada pg_anna\n[invito] tutti" : '[narratore] Anna, piove.\n[invito] tutti');
    const { url } = await prova.avvia(cartella, copione, { TAGM_MODO: 'improvvisa' });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, "Chiedo la chiave all'oste.");
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ')).not.toMatch(/ogg_/);
    expect(prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!['oggetti']).toEqual([
      { id: 'ogg_chiave', chi: 'pg_anna', ok: true },
      { id: 'ogg_spada', chi: 'pg_anna', ok: false, motivo: 'unknown object ogg_spada' },
    ]);
  }, 20_000);
});
