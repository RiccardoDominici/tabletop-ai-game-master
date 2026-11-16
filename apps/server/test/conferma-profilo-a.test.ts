/**
 * Profile A (the minimal reader in the narrator's seat): the announcement of an action is the player's words, not an
 * answer (docs/coerenza.md, «After round 5»). Round 5 counted it as one, so the Engine's acknowledgement never fired
 * there. Now an action that no line answers gets it, and no repair call goes to the small model. Invented fixture.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { annuncioBreve } from '../src/llm/annuncio';
import { cartelle, leggiJson, scriviJson, type RichiestaSceneggiatore } from '../src/sceneggiatore/protocollo';
import { inizia, Prova, turno } from './aiuti/partita';

describe('profile A: the announcement is not an answer', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('an action only announced gets the Engine acknowledgement; the count says it was unanswered; one narrator call', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const azione = 'Guardo sotto il tavolo della locanda.';
    const { url, messaggi } = await prova.avvia(prova.campagna('mini'), () => `[narratore] ${annuncioBreve('Anna Rossi', azione)}\n[invito] tutti`);
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    const prima = messaggi.length;
    s = await turno(tel, 'pg_anna', s, azione);
    const detto = s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo);
    expect(detto).toContain(annuncioBreve('Anna Rossi', azione));
    expect(detto.some((t) => /^Anna ci prova\.$/.test(t))).toBe(true);
    expect(messaggi.length - prima).toBe(1);
    expect(prova.turni().at(-1)).toMatchObject({ azioni_senza_risposta: 1, conferme_motore: 1 });
  });

  it('with the scriptwriter on, an action with no card waits for its «subito» line: no «ci prova» before it', async () => {
    prova = new Prova();
    prova.nomeNarratore = 'minimo';
    const radice = path.join(prova.cartella, 'sceneggiatore');
    scriviJson(cartelle(radice).vivo, { ts: Date.now(), pid: 0, modello: 'prova' });
    const azione = 'Guardo sotto il tavolo della locanda.';
    const { url } = await prova.avvia(prova.campagna('mini'), () => `[narratore] ${annuncioBreve('Anna Rossi', azione)}\n[invito] tutti`, {}, { sceneggiatore: { radice, tettoMs: 30_000 } });
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    let s = await inizia(schermo, tel);
    s = await turno(tel, 'pg_anna', s, azione);
    expect(s.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo)).not.toContain('Anna ci prova.');
    const richieste = fs.readdirSync(cartelle(radice).richieste).map((f) => leggiJson<RichiestaSceneggiatore>(path.join(cartelle(radice).richieste, f))!);
    expect(richieste.some((r) => r.tipo === 'subito' && r.azione?.id_pg === 'pg_anna')).toBe(true);
    expect(prova.turni().at(-1)).toMatchObject({ azioni_senza_risposta: 1, conferme_motore: 0 });
  });
});
