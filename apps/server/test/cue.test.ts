/**
 * Segnali audio automatici (audio/cue.ts): vocabolario chiuso allineato alla pipeline, catalogo
 * della campagna, limite di un umore automatico al minuto, umore iniziale, blocco di contesto.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CatalogoAudio } from '../src/audio/catalogo';
import { bloccoAudioContesto, EFFETTI, LimiteUmori, risolviEffetto, risolviUmore, umoreIniziale, UMORI } from '../src/audio/cue';
import { RADICE_REPO } from '../src/percorsi';

const cat = new CatalogoAudio(path.join(import.meta.dirname, 'fixtures', 'audio'));

describe('vocabolario', () => {
  it('uguale a quello della pipeline (strumenti/audio/vocabolario.py)', () => {
    const py = fs.readFileSync(path.join(RADICE_REPO, 'strumenti', 'audio', 'vocabolario.py'), 'utf8');
    const umori = /^UMORI = \(([^)]*)\)/m.exec(py)?.[1]?.match(/"([a-z_]+)"/g)?.map((x) => x.slice(1, -1));
    const blocco = /^EFFETTI:[^{]*\{([\s\S]*?)^\}/m.exec(py)?.[1] ?? '';
    const effetti = [...blocco.matchAll(/^\s+"([a-z_]+)":/gm)].map((m) => m[1]);
    expect(umori).toEqual([...UMORI]);
    expect(effetti).toEqual([...EFFETTI]);
  });
});

describe('risolviUmore / risolviEffetto', () => {
  it('umore: vocabolario chiuso col brano nel catalogo, oppure auto', () => {
    expect(risolviUmore('inseguimento', cat)).toEqual({ ok: true, valore: 'inseguimento' });
    expect(risolviUmore(' Umore_Inseguimento. ', cat)).toEqual({ ok: true, valore: 'inseguimento' });
    expect(risolviUmore('auto', cat)).toEqual({ ok: true, valore: null });
    expect(risolviUmore('tensione', cat)).toMatchObject({ ok: false, motivo: expect.stringContaining('fuori dal vocabolario') }); // c'è un brano, ma non è del vocabolario
    expect(risolviUmore('lutto', cat)).toMatchObject({ ok: false, motivo: expect.stringContaining('nessun brano') });
  });

  it('effetto: solo quelli del catalogo della campagna', () => {
    expect(risolviEffetto('campana', cat)).toEqual({ ok: true, valore: 'sfx_campana' });
    expect(risolviEffetto('sfx_porta', cat)).toEqual({ ok: true, valore: 'sfx_porta' });
    expect(risolviEffetto('tuono', cat)).toMatchObject({ ok: false, motivo: expect.stringContaining('non presente nel catalogo') });
    expect(risolviEffetto('trombone', cat)).toMatchObject({ ok: false, motivo: expect.stringContaining('sconosciuto') });
  });
});

describe('LimiteUmori', () => {
  it('un cambio automatico al minuto per scena; una scena nuova riparte', () => {
    const l = new LimiteUmori(60_000);
    expect(l.attesa(0, 's1')).toBe(0);
    l.segna(1_000, 's1');
    expect(l.attesa(31_000, 's1')).toBe(30_000);
    expect(l.attesa(61_000, 's1')).toBe(0);
    expect(l.attesa(2_000, 's2')).toBe(0);
    l.azzera();
    expect(l.attesa(1_500, 's1')).toBe(0);
  });
});

describe('umoreIniziale e blocco di contesto', () => {
  it('audio.umore_iniziale (o musica.umore_iniziale), solo dal vocabolario', () => {
    expect(umoreIniziale({ audio: { umore_iniziale: 'lutto' } })).toBe('lutto');
    expect(umoreIniziale({ musica: { tag: 'x', umore_iniziale: 'rito_sacro' } })).toBe('rito_sacro');
    expect(umoreIniziale({ audio: { umore_iniziale: 'tensione' } })).toBeNull();
    expect(umoreIniziale({})).toBeNull();
  });

  it('il narratore sa quali umori ed effetti esistono in questa campagna', () => {
    expect(bloccoAudioContesto(cat)).toBe(
      ['## Audio: righe [umore] ed [effetto]', '- Umori: esplorazione_tesa, inseguimento, auto (torna alla musica del luogo).', '- Effetti: campana, porta.'].join('\n'),
    );
    expect(bloccoAudioContesto(new CatalogoAudio('/inesistente'))).toBe('');
  });
});
