/**
 * Repertorio: caricatore/validatore e motore delle precondizioni (fixture «mini»).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { ErroreRepertorio, caricaRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio } from '../src/repertorio/stato';
import { RADICE_REPO } from '../src/percorsi';
import { StatoOrologi } from '../src/scena/orologi';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

function nuovo() {
  const c = caricaCampagna(MINI);
  const r = caricaRepertorio(c);
  const orologi = new StatoOrologi(c);
  return { c, r, orologi, s: new StatoRepertorio(r, c, orologi) };
}

describe('caricaRepertorio', () => {
  it('carica le battute, salta i file che non sono battute, righe nel formato [etichetta] testo', () => {
    const { r } = nuovo();
    expect(r.battute.map((b) => b.id).sort()).toEqual(['nar_brocca', 'nar_porta', 'nar_tuono', 'oste_confessa', 'oste_saluto', 'oste_vino_menzogna']);
    const saluto = r.perId.get('oste_saluto')!;
    expect(saluto.testo).toEqual([
      { etichetta: 'narratore', testo: "L'oste si pulisce le mani." },
      { etichetta: 'png_oste', testo: 'Benvenuti, foresti. Accomodatevi.' },
    ]);
    expect(saluto.varianti).toHaveLength(1);
    expect(saluto.max_usi).toBe(3);
  });

  it('rifiuta id ripetuti, etichette, indizi, fatti, battute e orologi inesistenti', () => {
    const c = caricaCampagna(MINI);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repertorio-'));
    fs.writeFileSync(
      path.join(dir, 'rotto.yaml'),
      `battute:
  - {id: a, chi: png_oste, tipo: saluto, quando: "x", testo: ["[png_oste] Ciao."], max_usi: 1}
  - {id: a, chi: png_nessuno, tipo: boh, quando: "x", testo: ["senza etichetta", "[png_fantasma] Eh."],
     richiede: {indizi_rivelati: [i_inventato], battute_usate: [b_inventata], orologio: {id: o_inventato}},
     effetti: {fatti_noti: [f_inventato], avanza_orologio: o_inventato}}
  - {id: "Maiuscolo", chi: narratore, tipo: momento, quando: "x", testo: ["[narratore] Ok."]}
`,
    );
    try {
      caricaRepertorio(c, undefined, dir);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ErroreRepertorio);
      const testo = (err as ErroreRepertorio).errori.join('\n');
      for (const atteso of ['id ripetuto «a»', 'chi sconosciuto «png_nessuno»', 'tipo non ammesso «boh»', 'riga non nel formato', 'etichetta sconosciuta [png_fantasma]', 'indizio inesistente «i_inventato»', 'battuta inesistente «b_inventata»', 'fatto del canone inesistente «f_inventato»', 'orologio inesistente «o_inventato»', 'id mancante o non valido «Maiuscolo»']) {
        expect(testo).toContain(atteso);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  const vera = path.join(RADICE_REPO, 'campagne', 'prova-f0');
  it.skipIf(!fs.existsSync(path.join(vera, 'repertorio')))('il repertorio vero di prova-f0 è valido', () => {
    const r = caricaRepertorio(caricaCampagna(vera));
    expect(r.battute.length).toBeGreaterThan(100);
  });
});

describe('StatoRepertorio', () => {
  it('elenca solo le battute con le condizioni vere, senza il loro testo', () => {
    const { s } = nuovo();
    const ids = s.disponibili().map((b) => b.id);
    expect(ids).toContain('oste_saluto');
    expect(ids).toContain('oste_vino_menzogna');
    expect(ids).toContain('nar_tuono');
    expect(ids).not.toContain('oste_confessa'); // serve i_brocca rivelato e la menzogna detta
    expect(ids).not.toContain('nar_porta'); // orologio a 0, serve 1
    const elenco = s.elencoDisponibili();
    expect(elenco).toContain("- oste_saluto · png_oste · saluto · i PG entrano o salutano l'oste");
    expect(elenco).not.toContain('Benvenuti');
  });

  it('usa: effetti applicati, condizioni sbloccate, varianti in ordine, max_usi', () => {
    const { s, orologi } = nuovo();
    expect(s.usa('oste_confessa', 1, false)).toMatchObject({ ok: false, motivo: expect.stringMatching(/indizio rivelato i_brocca/) });
    expect(s.usa('oste_vino_menzogna', 1, false)).toMatchObject({ ok: true, versione: 0 });
    expect(s.menzogneDette.has('oste_vino')).toBe(true);
    expect(s.usa('nar_brocca', 1, false)).toMatchObject({ ok: true });
    expect(s.indiziRivelati.has('i_brocca')).toBe(true);
    const conf = s.usa('oste_confessa', 2, false);
    expect(conf).toMatchObject({ ok: true, righe: [{ etichetta: 'png_oste' }] });
    expect(s.fattiScoperti).toEqual(['f_oste_ladro']);
    expect(s.usa('oste_confessa', 2, false)).toMatchObject({ ok: false, motivo: expect.stringMatching(/già usata/) });

    const a = s.usa('oste_saluto', 1, false);
    const b = s.usa('oste_saluto', 2, false);
    const c = s.usa('oste_saluto', 3, false);
    expect([a, b, c].map((x) => (x.ok ? x.versione : -1))).toEqual([0, 1, 1]);
    expect(s.usa('oste_saluto', 4, false)).toMatchObject({ ok: false });

    // Orologio: un segno avanza, il successivo diventa disponibile solo dopo; mai due in una risposta.
    expect(s.usa('nar_tuono', 3, true)).toMatchObject({ ok: false, motivo: expect.stringMatching(/già uscito/) });
    expect(s.usa('nar_tuono', 3, false)).toMatchObject({ ok: true });
    expect(orologi.riepilogo()).toEqual({ o_temporale: '1/2' });
    // nar_porta richiede oste_confessa NON usata: qui è stata usata → non disponibile.
    expect(s.disponibili().map((x) => x.id)).not.toContain('nar_porta');
    expect(s.usa('inesistente', 3, false)).toMatchObject({ ok: false, motivo: expect.stringMatching(/inesistente/) });
    expect(s.maiUsate()).toEqual(['nar_porta']);
  });
});
