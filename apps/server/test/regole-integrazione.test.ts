/**
 * Set di regole col server intero (docs/regole.md): la campagna a 2d6 carica il suo set, la carta del
 * tiro porta fasce e regola applicata, il narratore riceve l'esito della mossa, il telefono legge il
 * riassunto. E il controllo della licenza: nessun set da un manuale non libero nei file tracciati.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import type { RegolePubbliche, StatoTavolo } from '@cantastorie/shared';
import { DadiACopione } from '../src/prove/dadi';
import type { ArbitroProve, DecisioneRegole, IngressoArbitroProve } from '../src/prove/tipi';
import { RADICE_REPO } from '../src/percorsi';
import { Prova, agisci, attendi, emetti, inizia } from './aiuti/partita';

class Convincere implements ArbitroProve<DecisioneRegole> {
  async classifica(i: IngressoArbitroProve): Promise<Record<string, DecisioneRegole>> {
    return Object.fromEntries(i.azioni.map((a) => [a.id, { id: a.id, tipo: 'prova', mossa: 'convincere', bersaglio: 'png_bertoldo', caratteristica: null, abilita: null, arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null } as DecisioneRegole]));
  }
}

describe('set di regole col server intero', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('2d6: carta con fasce e regola, esito della mossa nel messaggio, riassunto sul telefono', async () => {
    prova = new Prova();
    const cartella = prova.campagna('pbta');
    const copione = (t: number): string => (t === 0 ? '[narratore] Il fiume rumoreggia.\n[invito] tutti' : '[narratore] Bertoldo ci pensa.\n[invito] tutti');
    const { url, messaggi } = await prova.avvia(cartella, copione, {}, { arbitroProve: new Convincere(), dadi: new DadiACopione([6, 3]) });
    const schermo = await prova.proiettore(url);
    const ida = await prova.telefono(url, 'pg_ida');
    const regole = await emetti<RegolePubbliche>((cb) => ida.emit('regole:leggi', cb));
    expect(regole).toMatchObject({ id: 'due-sei-prova', risoluzione: '2d6_fasce', licenza: 'CC0', domande: true });
    expect(regole.riassunto).toMatch(/Mondo a 2d6/);
    const s1 = await inizia(schermo, ida);
    expect(s1.pg.find((p) => p.id === 'pg_ida')?.pf).toEqual({ attuali: 6, massimi: 6 });
    await agisci(ida, 'pg_ida', 'Convinco Bertoldo a lasciarci passare', s1.versione_scena);
    const dopo: StatoTavolo = await attendi(ida, (x) => x.fase === 'finestra' && x.turno === 2);
    // 6 + 3 + Fascino 2 = 11: successo pieno.
    expect(dopo.tiri?.[0]).toMatchObject({ risoluzione: '2d6_fasce', dadi: [6, 3], totale: 11, grado: { id: 'successo', nome: 'Successo pieno' }, regola: '2d6+2 (Fascino, Convincere qualcuno): 10+, successo pieno' });
    expect(messaggi.at(-1)).toContain('Esito della mossa «Convincere qualcuno»: il PNG fa ciò che chiedi.');
    // Il selettore sa che cosa vuol dire ogni fascia del set.
    expect(messaggi.at(-1)).toContain('- 7–9 «Successo con un costo»: riesce, ma devi dare un costo');
  });

  it('nessun set da un manuale non libero tra i file tracciati (docs/regole.md, «Licenza»)', () => {
    const file = execFileSync('git', ['-C', RADICE_REPO, 'ls-files', '--', 'campagne', 'apps/server/test/fixtures'], { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /(^|\/)regole\/regole\.yaml$/.test(f));
    for (const f of file) {
      const d = YAML.parse(fs.readFileSync(path.join(RADICE_REPO, f), 'utf8')) as { licenza?: { libera?: boolean } };
      expect(d.licenza?.libera, `${f}: licenza.libera`).toBe(true);
    }
    // manuali/* (il contenuto) con l'eccezione del LEGGIMI: la cartella resta tracciata, i manuali no.
    const gi = fs.readFileSync(path.join(RADICE_REPO, '.gitignore'), 'utf8');
    expect(gi).toMatch(/^\/?manuali\/(\*|\*\*)?$/m);
    expect(gi).toMatch(/^!manuali\/LEGGIMI\.md$/m);
  });
});
