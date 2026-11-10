/**
 * Pacchetti delle lingue (docs/lingue.md): ogni lingua ha le chiavi dell'italiano con gli stessi
 * segnaposto, un codice sconosciuto è un errore chiaro, la lingua attiva cambia testi e prompt.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaPacco, comeLingua, controllaPacchi, controllaPacco, impostaLingua, LINGUE, linguaAttiva, percorsoPrompt, testo, usaCartellaPacchi } from '../src/lingua';
import { RADICE_REPO } from '../src/percorsi';

afterEach(() => {
  usaCartellaPacchi(path.join(RADICE_REPO, 'lingue'));
  impostaLingua('it');
});

describe('pacchetti delle lingue', () => {
  it('ogni lingua ha tutte le chiavi dell’italiano, con gli stessi segnaposto', () => {
    expect(controllaPacchi()).toEqual([]);
    for (const l of LINGUE) expect(() => caricaPacco(l)).not.toThrow();
  });

  it('codici: vuoto = nessuna scelta, sconosciuto = errore che dice dove', () => {
    expect(comeLingua(undefined, 'x')).toBeNull();
    expect(comeLingua(' EN ', 'x')).toBe('en');
    expect(() => comeLingua('fr', 'campagna.yaml')).toThrow(/campagna\.yaml: lingua «fr» sconosciuta/);
  });

  it('testo(): segnaposto, lingua attiva, chiave mancante; un pacchetto incompleto non si carica', () => {
    const c = fs.mkdtempSync(path.join(os.tmpdir(), 'lingue-'));
    fs.mkdirSync(path.join(c, 'it'));
    fs.mkdirSync(path.join(c, 'en'));
    fs.writeFileSync(path.join(c, 'it', 'testi.yaml'), 'prova:\n  saluto: "Ciao {nome}"\n  solo_it: "x"\n');
    fs.writeFileSync(path.join(c, 'en', 'testi.yaml'), 'prova:\n  saluto: "Hi {chi}"\n');
    usaCartellaPacchi(c);
    expect(testo('prova.saluto', { nome: 'Anna' })).toBe('Ciao Anna');
    expect(() => testo('prova.niente')).toThrow(/assente/);
    expect(controllaPacco('en')).toEqual([
      'en/testi.yaml: «prova.saluto» ha i segnaposto {chi} invece di {nome}',
      'en/testi.yaml: manca «prova.solo_it»',
    ]);
    expect(() => impostaLingua('en')).toThrow(/incompleto/);
    expect(linguaAttiva()).toBe('it');
    fs.rmSync(c, { recursive: true, force: true });
  });

  it('i prompt stanno in prompts/<lingua>/', () => {
    expect(percorsoPrompt('narratore')).toBe(path.join(RADICE_REPO, 'prompts', 'it', 'narratore.md'));
    expect(fs.existsSync(percorsoPrompt('narratore', 'it'))).toBe(true);
    expect(fs.existsSync(percorsoPrompt('selettore', 'it'))).toBe(true);
  });
});
