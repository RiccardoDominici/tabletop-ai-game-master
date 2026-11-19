/**
 * One clock sign with two exclusive variants (blind test A12, mulino-notte W8; the validator's COPERTURA.segno accepts
 * them): the wheel turns, or it strains against the brake the PCs put back. The variants' gates exclude each other
 * (`battute_non_usate` / `battute_usate` of the same line), so in every state exactly one is available, and the Engine,
 * which says the first available sign line of the due clock (regia.ts, aggiungiSegnoDovuto), says the right one.
 * Fixture: strumenti/test_valida_fixtures/tre-scene, copied, with a variant of its first sign.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const FIXTURE = path.join(RADICE_REPO, 'strumenti', 'test_valida_fixtures', 'tre-scene');

function conVariante(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'segno-varianti-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const f = path.join(dir, 'repertorio', 'narrazione.yaml');
  const d = YAML.parse(fs.readFileSync(f, 'utf8')) as { battute: Array<Record<string, any>> };
  const base = d.battute.find((b) => b['id'] === 'nar_segno_1')!;
  const variante = { ...base, id: 'nar_segno_1_corda', richiede: { ...base['richiede'], battute_usate: ['nar_corda'] }, testo: ['[narratore] Il fiume cresce, e la corda tagliata geme sopra il pontile.'] };
  base['richiede'] = { ...base['richiede'], battute_non_usate: ['nar_corda'] };
  d.battute.push(variante);
  fs.writeFileSync(f, YAML.stringify(d));
  return dir;
}

describe('a clock sign with exclusive variants', () => {
  it('offers exactly one of them in every state', () => {
    const c = caricaCampagna(conVariante());
    const s = new StatoRepertorio(caricaRepertorio(c), c, new StatoOrologi(c));
    s.impostaScena({ id: 'scena_traghetto', png_presenti: ['png_sandro'] });
    const segni = (): string[] => s.disponibili(1).filter((b) => b.tipo === 'segno_orologio').map((b) => b.id);
    expect(segni()).toEqual(['nar_segno_1']);
    s.usa('nar_corda', 1);
    expect(segni()).toEqual(['nar_segno_1_corda']);
  });
});
