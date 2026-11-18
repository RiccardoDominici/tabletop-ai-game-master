/**
 * Final round, PR T1 (docs/coerenza.md, «Final round»): the local reader picked a line the action does not touch; the
 * Engine refused it and said the NPC's deflection, «Questo non lo so…», right after a Carisma SUCCESS asking for the
 * key. Now an out-of-context pick gives way to the Engine's own indicated line for that action when one fits, and on a
 * check the action passed no deflection is said (the Engine's «X ci riesce.» follows). Invented fixtures, scripted
 * narrator in the reader's seat.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { DadiACopione } from '../src/prove/dadi';
import { arbitro, vuotaSrd } from './aiuti/motori-prove';
import { inizia, Prova, turno } from './aiuti/partita';

describe('an out-of-context pick', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('gives way to the Engine\'s indicated line for that action', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [
          { id: 'oste_acqua', chi: 'png_oste', tipo: 'confessione', quando: "un PG chiede all'oste se annacqua il vino", temi: ['acqua', 'annacqua'], testo: ["[png_oste] Sì, ci metto l'acqua. Due dita per botte."], max_usi: 1 },
          { id: 'oste_chiave', chi: 'png_oste', tipo: 'reazione', quando: "un PG chiede la chiave della cantina all'oste", temi: ['chiave', 'cantina'], testo: ['[png_oste] La chiave? Tenete, ma riportatela.'], max_usi: 1 },
        ],
      },
    });
    const { url } = await prova.avvia(cartella, () => '[usa] oste_acqua > pg_anna\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const dopo = await turno(tel, 'pg_anna', s, "Oste, dammi la chiave della cantina.");
    const detto = dopo.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(detto).toContain('La chiave? Tenete, ma riportatela.');
    expect(detto).not.toContain('ci metto');
    const t1 = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((t1['uscita'] as Array<{ tipo: string; id?: string }>).filter((u) => u.tipo === 'usa').map((u) => u.id)).toEqual(['oste_chiave']);
  }, 20_000);

  it('after a check the action passed, with no indicated line: no deflection, the Engine says the success', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    // A Persuasion success opens Bertoldo's confession (richiede.prova), but the action touches none of its themes.
    const azione = 'Bertoldo, ti prego, dimmi la verità su stanotte.';
    const { url } = await prova.avvia(prova.campagna('prove'), () => '[usa] bertoldo_confessa > pg_ida\n[invito] tutti', {}, {
      arbitroProve: arbitro(vuotaSrd, { [azione]: { tipo: 'prova', caratteristica: 'carisma', abilita: 'persuasione', difficolta: 'facile', bersaglio: 'png_bertoldo' } }),
      dadi: new DadiACopione([19]),
    });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_ida');
    const s = await inizia(schermo, tel);
    const dopo = await turno(tel, 'pg_ida', s, azione);
    const detto = dopo.trascrizione.filter((v) => v.turno === 1 && v.tipo !== 'azione').map((v) => v.testo);
    // The confession is out of context (none of its themes in the action) and nothing else is indicated: Bertoldo
    // does not deflect after a success; the table hears the Engine's acknowledgement of the success.
    expect(detto.some((t) => /ci riesce/.test(t))).toBe(true);
    const t1 = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((t1['uscita'] as Array<{ tipo: string; id?: string; motivo?: string }>).find((u) => u.id === 'bertoldo_confessa')).toMatchObject({ tipo: 'usa_rifiutato', motivo: expect.stringMatching(/fuori contesto/) });
    // Bertoldo has no refusal line: his deflection would be the narrator's «… scuote la testa e non risponde.».
    expect(detto.join(' ')).not.toMatch(/scuote la testa e non risponde/);
  }, 20_000);
});
