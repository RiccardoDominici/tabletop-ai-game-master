/**
 * Ogni punto d'ingresso che legge TAGM_* deve passare dalla compatibilità con i nomi vecchi
 * CANTASTORIE_* (variabili-legacy.ts, scripts/ambiente.sh, strumenti/*.py). Se un ingresso la salta,
 * CANTASTORIE_PORTA=4810 cade in silenzio sulla porta di default: il test lo impedisce.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { leggiOpzioni } from '../src/esperimenti/argomenti';

const RADICE = path.resolve(import.meta.dirname, '..', '..', '..');
const SALTATE = new Set(['node_modules', '.venv', 'dist', 'test', 'risultati', '.git']);

/** Tutti i file (sotto una o più cartelle) con estensione data, senza cartelle di build o di test. */
function file(dir: string, estensioni: string[], out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SALTATE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) file(p, estensioni, out);
    else if (estensioni.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** Vero se la riga legge una variabile TAGM_ (non è solo un commento). */
function leggeTagm(src: string): boolean {
  return src.split('\n').some((l) => l.includes('TAGM_') && !/^\s*(\*|\/\/|\/\*)/.test(l));
}

const rel = (p: string): string => path.relative(RADICE, p);

describe('punti d’ingresso e nomi vecchi', () => {
  it('ogni file TypeScript che legge TAGM_* importa la compatibilità (o è il modulo stesso)', () => {
    const ts = [...file(path.join(RADICE, 'apps/server/src'), ['.ts']), ...file(path.join(RADICE, 'esperimenti'), ['.ts']), ...file(path.join(RADICE, 'strumenti'), ['.ts'])];
    const senza = ts
      .filter((p) => !p.endsWith('variabili-legacy.ts') && leggeTagm(fs.readFileSync(p, 'utf8')))
      .filter((p) => !/variabili-legacy/.test(fs.readFileSync(p, 'utf8')))
      .map(rel);
    expect(senza).toEqual([]);
  });

  it('i config di Vite e Playwright leggono il nome vecchio come ripiego', () => {
    for (const f of ['apps/web/vite.config.ts', 'apps/web/playwright.config.ts']) {
      const src = fs.readFileSync(path.join(RADICE, f), 'utf8');
      if (src.includes('TAGM_')) expect(src, f).toContain('CANTASTORIE_');
    }
  });

  it('ogni script shell che legge TAGM_* sourcia scripts/ambiente.sh', () => {
    const senza = fs
      .readdirSync(path.join(RADICE, 'scripts'))
      .filter((n) => n.endsWith('.sh') && n !== 'ambiente.sh')
      .filter((n) => /TAGM_/.test(fs.readFileSync(path.join(RADICE, 'scripts', n), 'utf8')))
      .filter((n) => !fs.readFileSync(path.join(RADICE, 'scripts', n), 'utf8').includes('ambiente.sh'));
    expect(senza).toEqual([]);
  });

  it('ogni script Python che legge l’ambiente con TAGM_* ha il ripiego su CANTASTORIE_*', () => {
    const py = file(path.join(RADICE, 'strumenti'), ['.py']).filter((p) => !p.includes('.venv'));
    const senza = py
      .filter((p) => /environ/.test(fs.readFileSync(p, 'utf8')) && /TAGM_/.test(fs.readFileSync(p, 'utf8')))
      .filter((p) => !fs.readFileSync(p, 'utf8').includes('CANTASTORIE_'))
      .map(rel);
    expect(senza).toEqual([]);
  });

  it('leggiOpzioni con il nome vecchio usa la porta data (non il default)', () => {
    const copione = path.join(RADICE, 'esperimenti', 'copioni', 'indagine.yaml');
    if (!fs.existsSync(copione)) return;
    expect(leggiOpzioni(['indagine', 'B'], { CANTASTORIE_PORTA: '4810' })).toMatchObject({ porta: 4810 });
  });

  it('il comando vero (esegui.ts) col nome vecchio rifiuta la 4610 prima di fare qualsiasi cosa', () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TAGM_|CANTASTORIE_)/.test(k)));
    const r = spawnSync(path.join(RADICE, 'node_modules/.bin/tsx'), [path.join(RADICE, 'apps/server/src/esperimenti/esegui.ts'), 'indagine', 'B'], {
      env: { ...env, CANTASTORIE_PORTA: '4610' },
      encoding: 'utf8',
      timeout: 120_000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/partita vera/);
  });

  it('il comando vero (esegui.ts) col nome vecchio mostra il valore che ha letto', () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(TAGM_|CANTASTORIE_)/.test(k)));
    const r = spawnSync(path.join(RADICE, 'node_modules/.bin/tsx'), [path.join(RADICE, 'apps/server/src/esperimenti/esegui.ts'), 'indagine', 'B'], {
      env: { ...env, CANTASTORIE_PORTA: 'abc' },
      encoding: 'utf8',
      timeout: 120_000,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/TAGM_PORTA non valida: abc/);
  });

  it('scripts/ambiente.sh copia il nome vecchio sul nuovo', () => {
    const r = spawnSync('bash', ['-c', `source "${path.join(RADICE, 'scripts/ambiente.sh')}"; echo "$TAGM_PORTA"`], {
      env: { PATH: process.env['PATH'] ?? '/usr/bin:/bin', CANTASTORIE_PORTA: '4810' },
      encoding: 'utf8',
    });
    expect(r.stdout.trim()).toBe('4810');
  });
});
