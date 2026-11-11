/**
 * Rilasci fuori contesto (E2E finale, docs/e2e-finale.md, B1, B2 e D3): una battuta che rilascia qualcosa
 * (indizio, confessione, verità, finale, o che rivela) esce solo per un'azione che le è pertinente. Se no,
 * al suo posto la deviazione del PNG, e la misura dell'harness la conta. Le azioni vengono dalle run vere.
 */
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { rivelazioniFuoriContesto } from '../src/esperimenti/fughe';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng } from '../src/repertorio/pertinenza';
import { interlocutore, motivoFuoriContesto } from '../src/repertorio/rilascio';
import { inizia, Prova, turno } from './aiuti/partita';
import { testo } from '../src/lingua';

/** Il nome di un PNG nella campagna di prova copiata. */
const torreNome = (cartella: string, id: string): string => caricaCampagna(cartella).png.find((p) => p.id === id)!.nome;

const torre = caricaCampagna(path.join(RADICE_REPO, 'campagne', 'torre-mozza'));
const rep = caricaRepertorio(torre);
const nomi = nomiDeiPng(torre);
const fuori = (id: string, azione: string) => motivoFuoriContesto(rep.perId.get(id)!, azione, nomi);

describe('rilascio pertinente all’azione (torre-mozza)', () => {
  // N4 (E2E, secondo giro): la deviazione dopo un rilascio rifiutato. Le azioni sono quelle della partita.
  it('chi devia: il PNG interpellato fra i presenti, se no nessuno (il narratore toglie la riga)', () => {
    const tutti = new Set(torre.png.map((p) => p.id));
    const chi = (id: string, azione: string, presenti: ReadonlySet<string> = tutti) => interlocutore(rep.perId.get(id)!, azione, nomi, presenti);
    expect(chi('ugo_salita', 'Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici.')).toBeNull(); // pressione-A pass2b T8
    expect(chi('zir_chiave_prima', 'Vedo i goblin davanti alla porta della torre. Sguaino la spada e carico.')).toBeNull(); // T13
    expect(chi('ber_conti_fienile', 'Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.')).toBe('png_berta');
    expect(chi('ugo_salita', 'Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin»')).toBe('png_ugo');
    // Interpellato ma non in scena: non devia.
    expect(chi('ugo_salita', 'Porto a Ugo il pane del tempio e gli chiedo la strada.', new Set(['png_berta']))).toBeNull();
  });

  it('i casi dell’E2E sono fuori contesto', () => {
    expect(fuori('zir_corda', 'Cerco una finestra e mi infilo dentro, prima degli altri.')).toMatch(/nessuno dei temi/); // B1, pressione-B T13
    expect(fuori('nar_conto', 'Tiro ancora con la fionda al goblin che scappa verso la cantina.')).toMatch(/in comune/); // B1, indagine-B2 T15
    expect(fuori('ber_cose_tonio', 'Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?')).toMatch(/nessuno dei temi/); // indagine-A T2
    expect(fuori('nar_tonio_parla', "Ne tengo uno contro il muro: «Dov'è il ragazzo? Parla!»")).toMatch(/in comune/); // pressione-A T16
    expect(fuori('fin_ovile_senza', "Vado a controllare il sentiero dietro l'ovile, subito.")).toMatch(/in comune/); // D3, pressione-A T5
  });

  it('le stesse battute per le azioni giuste passano', () => {
    expect(fuori('zir_corda', 'Zirrà, guarda la corda del ragazzo: non ha nemmeno un nodo.')).toBeNull();
    expect(fuori('nar_conto', 'Guardo le tacche sul muro accanto alla porta di ferro.')).toBeNull();
    expect(fuori('fin_ovile_senza', 'Basta aspettare: partiamo per il bosco, anche senza la chiave.')).toBeNull();
  });

  it('una confessione di Zirrà per un’azione rivolta a un altro PNG è fuori contesto', () => {
    expect(fuori('zir_corda', 'Berta, la corda del ragazzo non ha nodo: lo sapevi?')).toMatch(/si rivolge a png_berta/);
  });

  it('la misura dell’harness conta il rilascio per l’azione sbagliata, non quello giusto', () => {
    const narrazioni = [
      { tipo: 'turno', turno: 13, azioni: [{ id_pg: 'pg_nespola', testo: 'Cerco una finestra e mi infilo dentro.' }], uscita: [{ tipo: 'usa', id: 'zir_corda', per: 'pg_nespola' }] },
      { tipo: 'turno', turno: 14, azioni: [{ id_pg: 'pg_livia', testo: 'Guardo le tacche sul muro accanto alla porta di ferro.' }], uscita: [{ tipo: 'usa', id: 'nar_conto', per: 'pg_livia' }] },
    ];
    expect(rivelazioniFuoriContesto(narrazioni, rep, nomi).map((r) => [r.turno, r.battuta])).toEqual([[13, 'zir_corda']]);
  });
});

// ---------------------------------------------------------------------------------------------

let prova: Prova;
afterEach(async () => prova?.chiudi());

describe('col server: il rilascio fuori contesto non esce, al suo posto la deviazione di chi è interpellato', () => {
  it('la confessione dell’oste per chi si lava le mani, senza parlare a nessuno: rifiutata, e l’oste non risponde', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [
          { id: 'oste_acqua', chi: 'png_oste', tipo: 'confessione', quando: "un PG chiede all'oste se annacqua il vino", temi: ['acqua', 'annacqua', 'annacquato'], testo: ["[png_oste] Sì, ci metto l'acqua. Due dita per botte."], max_usi: 1 },
          { id: 'oste_rifiuto', chi: 'png_oste', tipo: 'rifiuto', quando: 'un PG insiste', temi: [], testo: ['[png_oste] Il vino è vino. Bevete, o andate.'], max_usi: 1, solo_esempio: true },
        ],
      },
    });
    const { url } = await prova.avvia(cartella, () => '[usa] oste_acqua > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const dopo = await turno(tel, 'pg_anna', s, "Mi lavo le mani nell'acqua della bacinella.");
    const detto = dopo.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(detto).not.toContain('ci metto');
    // N4 (E2E, secondo giro): nessuno è interpellato, quindi nessun PNG devia. Prima l'oste rispondeva a chi non gli parlava.
    expect(detto).not.toContain('Il vino è vino');
    const n = prova.narrazioni().find((r) => r['tipo'] === 'turno' && r['turno'] === 1)!;
    expect((n['uscita'] as Array<{ tipo: string; id?: string; motivo?: string }>).find((u) => u.id === 'oste_acqua')).toMatchObject({ tipo: 'usa_rifiutato', motivo: expect.stringMatching(/fuori contesto/) });
    expect(n).toMatchObject({ rilasci_fuori_contesto: 1 });
  }, 20_000);

  it('la stessa confessione per un’azione rivolta alla guardia: rifiutata, devia la guardia, non l’oste', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', {
      battute: {
        'png_oste.yaml': [
          { id: 'oste_acqua', chi: 'png_oste', tipo: 'confessione', quando: "un PG chiede all'oste se annacqua il vino", temi: ['acqua', 'annacqua', 'annacquato'], testo: ["[png_oste] Sì, ci metto l'acqua. Due dita per botte."], max_usi: 1 },
          { id: 'oste_rifiuto', chi: 'png_oste', tipo: 'rifiuto', quando: 'un PG insiste', temi: [], testo: ['[png_oste] Il vino è vino. Bevete, o andate.'], max_usi: 1, solo_esempio: true },
        ],
      },
    });
    const { url } = await prova.avvia(cartella, () => '[usa] oste_acqua > pg_anna\n[narratore] Anna, cosa fai?\n[invito] tutti');
    const schermo = await prova.proiettore(url);
    const tel = await prova.telefono(url, 'pg_anna');
    const s = await inizia(schermo, tel);
    const dopo = await turno(tel, 'pg_anna', s, 'Guardia, hai visto acqua sulla strada?');
    const detto = dopo.trascrizione.filter((v) => v.turno === 1).map((v) => v.testo).join(' ');
    expect(detto).not.toContain('ci metto');
    expect(detto).not.toContain('Il vino è vino');
    // La guardia non ha battute: la riga neutra del narratore col suo nome.
    expect(detto).toContain(testo('regia.narratore.deviazione', { nome: torreNome(cartella, 'png_guardia') }));
  }, 20_000);
});
