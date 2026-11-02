/**
 * Cancelli sull'azione delle battute (schema, «Letture del manuale» n. 13): `richiede.privata`
 * vuole un'azione segnata privata dal telefono, `richiede.da_pg` un'azione di quei PG. Sul
 * repertorio vero di prova-f0: le due confessioni di Ottavia non escono più solo per il `quando`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { nomiDeiPng } from '../src/repertorio/pertinenza';
import { caricaParoleSegrete } from '../src/repertorio/segreti';
import { StatoRepertorio, haCancelloAzione, rispondeA, type AzioneCatalogo } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const VERA = path.join(RADICE_REPO, 'campagne', 'prova-f0');
const presente = fs.existsSync(path.join(VERA, 'repertorio'));

describe.skipIf(!presente)('cancelli sull’azione: richiede.privata e richiede.da_pg', () => {
  const c = caricaCampagna(VERA);
  const rep = caricaRepertorio(c);
  const parole = caricaParoleSegrete(path.join(VERA, 'repertorio'));
  const nomiPng = nomiDeiPng(c);
  const nuovo = () => new StatoRepertorio(rep, c, new StatoOrologi(c));
  const cat = (s: StatoRepertorio, azioni: AzioneCatalogo[]) =>
    s.catalogo({ turno: 1, azioni, stallo: false, segnoDovuto: false, nomiPng, parole }).battute.map((b) => b.id);
  const passato = rep.perId.get('ott_segale_passato')!;
  const chicco = rep.perId.get('ott_segale_chicco')!;

  it('il caricatore legge i cancelli', () => {
    expect(passato.richiede).toMatchObject({ privata: true, da_pg: ['pg_assenzio'] });
    expect(chicco.richiede).toMatchObject({ privata: true, da_pg: [] });
    expect(haCancelloAzione(passato)).toBe(true);
    expect(haCancelloAzione(rep.perId.get('ott_segale_versione') ?? rep.battute.find((b) => !b.richiede.privata)!)).toBe(false);
  });

  it('rispondeA: privata solo verso privata, da_pg solo verso quei PG, le altre solo verso pubbliche', () => {
    expect(rispondeA(passato, { autore: 'pg_assenzio', privata: true })).toBe(true);
    expect(rispondeA(passato, { autore: 'pg_assenzio', privata: false })).toBe(false);
    expect(rispondeA(passato, { autore: 'pg_ginestra', privata: true })).toBe(false);
    const qualsiasi = rep.battute.find((b) => !haCancelloAzione(b))!;
    expect(rispondeA(qualsiasi, { autore: 'pg_ginestra', privata: false })).toBe(true);
    expect(rispondeA(qualsiasi, { autore: 'pg_ginestra', privata: true })).toBe(false);
  });

  it('«sii sincera» in pubblico non apre la confessione; in privato sì, ma solo da Assenzio', () => {
    const testo = 'Chiedo a Ottavia, sottovoce, di essere sincera con me.';
    expect(cat(nuovo(), [{ autore: 'pg_assenzio', testo, privata: false }])).not.toContain('ott_segale_passato');
    expect(cat(nuovo(), [{ autore: 'pg_ginestra', testo, privata: true }])).not.toContain('ott_segale_passato');
    expect(cat(nuovo(), [{ autore: 'pg_assenzio', testo, privata: true }])).toContain('ott_segale_passato');
  });

  it('un’azione privata non porta in catalogo le battute senza cancello', () => {
    const azioni: AzioneCatalogo[] = [{ autore: 'pg_ginestra', testo: 'Chiedo al nano se gli va una partita a dadi.', privata: true }];
    const ids = cat(nuovo(), azioni);
    expect(ids.every((id) => haCancelloAzione(rep.perId.get(id)!))).toBe(true);
    const pubbliche = cat(nuovo(), [{ ...azioni[0]!, privata: false }]);
    expect(pubbliche.some((id) => rep.perId.get(id)!.chi === 'png_baldrin')).toBe(true);
  });

  it('il chicco nero mostrato in privato apre la confessione, solo dopo gli speroni', () => {
    const s = nuovo();
    const azione: AzioneCatalogo = { autore: 'pg_corrado', testo: 'Lontano dal nano, metto un chicco nero nel palmo di Ottavia.', privata: true };
    expect(cat(s, [azione])).not.toContain('ott_segale_chicco'); // manca i_speroni_neri
    s.indiziRivelati.add('i_speroni_neri');
    expect(cat(s, [azione])).toContain('ott_segale_chicco');
    expect(cat(s, [{ ...azione, privata: false }])).not.toContain('ott_segale_chicco');
  });
});
