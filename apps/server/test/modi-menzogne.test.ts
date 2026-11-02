/**
 * `modi` degli indizi e `mente_su[].id` dove li usa il Motore (repertorio, modalità B):
 * - un indizio trovato in un modo toglie dal catalogo le altre strade per lo stesso indizio;
 * - la copertura dei modi e l'id delle menzogne si controllano a ogni avvio (avvisi);
 * - le menzogne già dette entrano nel messaggio del turno con la versione, mai con la verità.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { indiziCampagna } from '../src/campagna/indizi';
import { RADICE_REPO } from '../src/percorsi';
import { compilaMessaggioTurno } from '../src/narrazione/messaggio';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { menzogneDelleSchede, righeMenzogneDette } from '../src/repertorio/menzogne';
import { caricaParoleSegrete } from '../src/repertorio/segreti';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const VERA = path.join(RADICE_REPO, 'campagne', 'prova-f0');
const presente = fs.existsSync(path.join(VERA, 'repertorio'));

describe.skipIf(!presente)('modi degli indizi e menzogne con id (prova-f0)', () => {
  const c = caricaCampagna(VERA);
  const rep = caricaRepertorio(c);
  const parole = caricaParoleSegrete(path.join(VERA, 'repertorio'));
  const nuovo = () => new StatoRepertorio(rep, c, new StatoOrologi(c));

  it('gli indizi portano i loro modi', () => {
    const indizi = indiziCampagna(c);
    expect(indizi.get('i_cicatrice')).toMatchObject({ modi: 2, nodo: 'png_sebastiano', scena: 'scena_forno_vecchio' });
    expect(indizi.get('i_preghiera_pane')?.modi).toBe(1);
  });

  it('trovato l’indizio per una strada, l’altra strada esce dal catalogo', () => {
    const s = nuovo();
    expect(s.motivoIndisponibile(rep.perId.get('nar_pagnotta_spezza')!)).toBeNull();
    const uso = s.usa('nar_sacco_apre', 1, false);
    expect(uso.ok).toBe(true);
    expect(s.motivoIndisponibile(rep.perId.get('nar_pagnotta_spezza')!)).toMatch(/già trovato in un altro modo/);
    // Una confessione che rivela lo stesso indizio con altri effetti resta disponibile.
    const s2 = nuovo();
    s2.usa('nar_volto_candela', 1, false);
    expect(s2.motivoIndisponibile(rep.perId.get('nar_volto_uscita')!)).toMatch(/altro modo/);
    expect(s2.motivoIndisponibile(rep.perId.get('seb_guerra_roccalba')!)).not.toMatch(/altro modo/);
  });

  it('le menzogne del repertorio sono id di mente_su (nessun avviso su prova-f0)', () => {
    expect(rep.avvisi.filter((a) => a.includes('menzogna_detta'))).toEqual([]);
    expect(rep.avvisi.filter((a) => a.includes('modi di trovarlo'))).toEqual([]);
    expect(menzogneDelleSchede(c).get('ott_segale')).toMatchObject({ png: 'png_ottavia', argomento: 'da dove viene la segale' });
  });

  it('menzogne già dette nel messaggio del turno: versione sì, verità no', () => {
    const s = nuovo();
    const bugia = rep.battute.find((b) => b.effetti.menzogna_detta === 'ott_segale')!;
    expect(s.usa(bugia.id, 1, false).ok).toBe(true);
    const righe = righeMenzogneDette(s.menzogneDette, c, parole, { indiziRivelati: s.indiziRivelati, battuteUsate: (id) => s.usata(id) });
    expect(righe).toEqual(['Ottavia Ferlini [png_ottavia], su da dove viene la segale: «È la segale di sempre, del mulino del paese. La prendo lì da trent\'anni.»']);
    const m = compilaMessaggioTurno({ turno: 2, trascrizione: [], azioni: [], pgAlTavolo: [], repertorio: { fattiScoperti: [], battuteDisponibili: '', menzogne: righe } });
    expect(m).toContain('## Menzogne già dette dai PNG');
    expect(m).not.toContain('Gualtiero'); // la verità (f_segale_gualtiero) non entra
  });
});

describe('copertura dei modi e id delle menzogne: avvisi del caricatore', () => {
  it('meno battute di rivelazione dei modi, e una menzogna_detta senza mente_su: due avvisi', () => {
    const c = caricaCampagna(path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini'));
    const scena = { ...c.scena, dati: { ...c.scena.dati, indizi: [{ id: 'i_brocca', modi: 2 }, { id: 'i_vino_annacquato' }] } };
    const conModi = { ...c, scena, scene: [scena], png: c.png.map((p) => (p.id === 'png_oste' ? { ...p, dati: { ...p.dati, mente_su: [{ id: 'oste_altro' }] } } : p)) };
    const tmp = fs.mkdtempSync(path.join(RADICE_REPO, 'logs', 'rep-'));
    try {
      fs.writeFileSync(
        path.join(tmp, 'png_oste.yaml'),
        [
          'battute:',
          '  - {id: oste_brocca, chi: png_oste, tipo: indizio, quando: "un PG guarda dietro il banco", testo: ["[png_oste] Quella brocca? Niente."], effetti: {rivela_indizi: [i_brocca]}}',
          '  - {id: oste_vino, chi: png_oste, tipo: menzogna, quando: "un PG chiede del vino", testo: ["[png_oste] Vino buono."], effetti: {menzogna_detta: oste_vino}}',
        ].join('\n'),
      );
      const rep = caricaRepertorio(conModi, undefined, tmp);
      expect(rep.avvisi).toContain('indizio i_brocca: 1 battute di rivelazione per 2 modi di trovarlo');
      expect(rep.avvisi).toContain('oste_vino: menzogna_detta «oste_vino» non è l\'id di nessuna mente_su di png_oste');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
