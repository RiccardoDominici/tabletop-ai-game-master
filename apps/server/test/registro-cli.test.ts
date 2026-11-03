/**
 * scripts/registro.sh (strumenti/registro.ts) come lo usano tra-sessioni.sh e chi rifà un registro:
 * scelta della sessione, scrittura nel pacchetto, --controlla (uguale / toccato a mano), --uscita,
 * codici d'uscita e --help. L'archivio si costruisce a mano (eventi di una partita breve).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { RADICE_REPO } from '../src/percorsi';
import { ArchivioSessioni } from '../src/sessione/archivio';

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'cantastorie-registro-cli-'));
const ARCO = path.join(radice, 'arco');
fs.cpSync(path.join(import.meta.dirname, 'fixtures', 'campagne', 'arco'), ARCO, { recursive: true });
const FILE = path.join(radice, 'sessioni.sqlite');
afterAll(() => fs.rmSync(radice, { recursive: true, force: true }));

const foto = (turno: number, pieni: number, ultimoTurno: number | null, causa: string) => ({
  fase: 'finestra', turno, versioneScena: turno, scena: 'scena_locanda', luogo: 'scena_locanda', situazione: null, situazioniMostrate: [], umore: null,
  orologi: { o_temporale: { pieni, ultimoTurno, partito: true } }, repertorio: null, note: { elenco: [], prossimoId: 1 },
  pausa: { richiesta: false, invitoSospeso: null }, prossimoIdTrascrizione: 3, causa,
});
const a = new ArchivioSessioni(FILE);
a.crea('2026-11-03T20:00:00.000Z', 'arco', 'improvvisa', 1);
a.aggiungi('2026-11-03T20:00:00.000Z', [
  { tipo: 'inizio', dati: { campagna: 'arco', modo: 'improvvisa', scena: 'scena_locanda' } },
  { tipo: 'dispositivo', dati: { dispositivo: 'tel-anna-0123456789', id_pg: 'pg_anna' } },
  { tipo: 'fotografia', dati: foto(0, 0, null, 'inizio') },
], 0);
a.aggiungi('2026-11-03T20:00:00.000Z', [
  { tipo: 'trascrizione_turno', dati: { turno: 1, voci: [{ id: 1, turno: 1, tipo: 'azione', chi: 'pg_anna', nome: 'Anna', testo: 'Ascolto.' }, { id: 2, turno: 1, tipo: 'narrazione', chi: 'narratore', nome: 'Narratore', testo: 'Un tuono lontano.' }] } },
  { tipo: 'fotografia', dati: foto(2, 1, 1, 'fine_turno') },
], 2);
a.chiudiSessione('2026-11-03T20:00:00.000Z', 'fine sessione');
a.chiudi();

function registro(...argomenti: string[]): { codice: number; uscita: string; errori: string } {
  const r = spawnSync('bash', [path.join(RADICE_REPO, 'scripts', 'registro.sh'), ...argomenti], {
    env: { ...process.env, CANTASTORIE_SESSIONI: FILE, CANTASTORIE_LOG: path.join(radice, 'log'), CANTASTORIE_PORTA: '4710' },
    encoding: 'utf8',
  });
  return { codice: r.status ?? -1, uscita: r.stdout, errori: r.stderr };
}

describe('scripts/registro.sh', () => {
  it('scrive nel pacchetto, controlla, riconosce un registro toccato a mano', () => {
    const fatto = registro(ARCO, '--sessione', '1');
    expect(fatto.errori).toBe('');
    expect(fatto.codice).toBe(0);
    const file = path.join(ARCO, 'sessioni', '01', 'registro.yaml');
    expect(fatto.uscita).toContain(file);
    const r = YAML.parse(fs.readFileSync(file, 'utf8'));
    expect(r).toMatchObject({ campagna: 'arco', sessione: 1, giocatori: ['pg_anna'], archivio: { motivo_chiusura: 'fine sessione', ultimo_turno: 2 } });
    expect(r.orologi[0].segni).toEqual([{ numero: 1, testo: 'Un tuono lontano.', turno: 1, causa: 'narrazione' }]);
    expect(fs.existsSync(path.join(ARCO, 'sessioni', '01', 'trascrizione.yaml'))).toBe(true);

    expect(registro(ARCO, '01', '--controlla').codice).toBe(0); // anche col numero come secondo argomento
    fs.appendFileSync(file, '# ritoccato\n');
    const diverso = registro(ARCO, '--controlla');
    expect(diverso.codice).toBe(1);
    expect(diverso.errori).toMatch(/diverso da ciò che dà l'archivio/);
    expect(registro(ARCO).codice).toBe(0); // rifatto dall'archivio
    expect(registro(ARCO, '--controlla').codice).toBe(0);
  }, 30_000);

  it('--uscita, codici d\'uscita e --help', () => {
    const altrove = path.join(radice, 'altrove');
    expect(registro(ARCO, '--sessione', '1', '--uscita', altrove).codice).toBe(0);
    expect(fs.readdirSync(altrove).sort()).toEqual(['registro.yaml', 'trascrizione.yaml']);
    expect(registro(ARCO, '--sessione', '2').codice).toBe(4); // la 02 non è mai stata giocata
    expect(registro(ARCO, '--boh').codice).toBe(2);
    expect(registro(path.join(radice, 'non-esiste')).codice).toBe(3);
    const aiuto = registro('--help');
    expect(aiuto.codice).toBe(0);
    expect(aiuto.uscita).toMatch(/--controlla/);
    expect(aiuto.uscita).toMatch(/--sessione/);
  }, 30_000);
});

describe('strumenti/unisci_pacchetto.ts', () => {
  const unisci = (...argomenti: string[]) => {
    const r = spawnSync(path.join(RADICE_REPO, 'node_modules', '.bin', 'tsx'), [path.join(RADICE_REPO, 'strumenti', 'unisci_pacchetto.ts'), ...argomenti], { encoding: 'utf8' });
    return { codice: r.status ?? -1, uscita: r.stdout, errori: r.stderr };
  };

  it('la vista unita, caricata come one-shot, è la stessa campagna che il server gioca col pacchetto', async () => {
    const { caricaCampagna } = await import('../src/campagna/caricatore');
    const { caricaRepertorio } = await import('../src/repertorio/caricatore');
    const { caricaParoleSegreteCampagna } = await import('../src/repertorio/segreti');
    const { CatalogoImmagini } = await import('../src/campagna/immagini');
    const uscita = path.join(radice, 'unita-02');
    const r = unisci(ARCO, '--sessione', '2', '--uscita', uscita);
    expect(r.errori).toBe('');
    expect(r.codice).toBe(0);
    const unita = caricaCampagna(uscita);
    const vera = caricaCampagna(ARCO, undefined, { pacchetto: 2 });
    expect(unita.pacchetto).toBeNull();
    expect(unita.scene.map((s) => [s.id, s.apertura])).toEqual(vera.scene.map((s) => [s.id, s.apertura]));
    expect(unita.png.map((p) => [p.id, p.dati])).toEqual(vera.png.map((p) => [p.id, p.dati]));
    const { sessione: _s, ...narratoreUnito } = unita.campagnaNarratore;
    expect(narratoreUnito).toEqual(vera.campagnaNarratore);
    expect(caricaRepertorio(unita).battute.map((b) => b.id).sort()).toEqual(caricaRepertorio(vera).battute.map((b) => b.id).sort());
    expect(caricaParoleSegreteCampagna(unita).map((p) => p.parola)).toEqual(caricaParoleSegreteCampagna(vera).map((p) => p.parola));
    expect(new CatalogoImmagini(path.join(uscita, 'immagini')).ritratto('png_oste')).toBe('/api/immagini/ritratto_png_oste_bagnato.jpg');
    const mappa = JSON.parse(fs.readFileSync(path.join(uscita, 'mappa.json'), 'utf8'));
    expect(mappa).toMatchObject({ sessione: 2, pacchetto: 'sessioni/02' });
    expect(mappa.file['scena.yaml']).toEqual(['sessioni/02/scene/scena_guado.yaml']);
    expect(mappa.file['scene/02_scena_mulino.yaml']).toEqual(['sessioni/02/scene/scena_mulino.yaml']);
    expect(mappa.file['campagna.yaml']).toEqual(['campagna.yaml', 'sessioni/02/sessione.yaml']);
    expect(mappa.file['png/png_barcaiolo.yaml']).toEqual(['sessioni/02/png/png_barcaiolo.yaml']);
    expect(mappa.file['repertorio/parole_segrete.yaml']).toEqual(['repertorio/parole_segrete.yaml']); // la 02 non ne ha uno suo
    // Si riscrive sopra una vista vecchia; una cartella estranea non si tocca; un pacchetto rotto dà 3.
    expect(unisci(ARCO, '--sessione', '2', '--uscita', uscita).codice).toBe(0);
    fs.mkdirSync(path.join(radice, 'estranea'));
    fs.writeFileSync(path.join(radice, 'estranea', 'mio.txt'), 'x');
    expect(unisci(ARCO, '--sessione', '2', '--uscita', path.join(radice, 'estranea')).codice).toBe(2);
    expect(unisci(ARCO, '--sessione', '9', '--uscita', path.join(radice, 'nove')).errori).toMatch(/non c'è la sessione 9/);
    expect(unisci(ARCO, '--uscita', uscita).codice).toBe(2);
  }, 60_000);
});
