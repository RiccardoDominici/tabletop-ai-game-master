/**
 * Pre-generazione drama-3: la chiave calcolata dallo script deve essere quella che il server usa al gioco.
 * Il test fa dire una battuta vera del repertorio di prova dalla PipelineVoce (motore finto): il server
 * scrive la cache sotto la sua chiave. Il piano dello script deve dare la stessa chiave e lo stesso testo.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { AudioFrase } from '@cantastorie/shared';
import { caricaCampagna } from '../src/campagna/caricatore';
import { loggerMuto } from '../src/logger';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { daGenerare, pianoFish, riassuntoFish } from '../src/strumenti/prerender-fish';
import { CacheAudio, chiaveAudioEspressiva } from '../src/voce/cache-audio';
import { direzionePredefinita } from '../src/voce/espressione';
import { costoFish, DOLLARI_PER_BYTE } from '../src/voce/fish';
import { PipelineVoce, type FraseDaDire, type UscitaAudio } from '../src/voce/pipeline';
import { creaPronunciatore } from '../src/voce/pronuncia';
import type { FlussoTts, MotoreVoce, RichiestaTts, SaluteVoce } from '../src/voce/tipi';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PROVA_F0 = path.join(RADICE, 'campagne', 'prova-f0');

/** Motore drama-3 finto: registra le richieste e dà un po' di PCM a 44,1 kHz. */
class MotoreFinto implements MotoreVoce {
  readonly nome = 'fish' as const;
  readonly espressivo = true;
  richieste: RichiestaTts[] = [];
  async salute(): Promise<SaluteVoce> {
    return { pronto: true, modello: 'fish-audio/drama-3', sample_rate: 44_100, formato: 'pcm_s16le', voci: [] };
  }
  async sintetizza(r: RichiestaTts): Promise<FlussoTts> {
    this.richieste.push(r);
    async function* pezzi(): AsyncGenerator<Uint8Array> {
      yield new Uint8Array(44_100); // mezzo secondo a 44,1 kHz: la pipeline conserva solo sopra 0,3 s
    }
    return { sampleRate: 44_100, pezzi: pezzi() };
  }
}

function uscitaVuota(): UscitaAudio {
  return {
    frase: (_m: AudioFrase) => undefined,
    pezzo: () => undefined,
    fineFrase: () => undefined,
    fineTurno: () => undefined,
    interrompi: () => undefined,
  };
}

function cacheTemporanea(): CacheAudio {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'prerender-fish-'));
  return new CacheAudio(path.join(d, 'qwen'), path.join(d, 'fish'));
}

describe('pre-generazione drama-3: chiave come nel server', () => {
  it('la chiave del piano è quella che la pipeline scrive dal vivo (stesso testo espressivo)', async () => {
    const campagna = caricaCampagna(PROVA_F0);
    const repertorio = caricaRepertorio(campagna, loggerMuto());
    const pronuncia = creaPronunciatore(campagna);
    const piano = pianoFish(campagna, repertorio, pronuncia);

    // La prima riga del piano è la prima riga della prima battuta (il piano non ha doppioni davanti).
    const riga = piano.unici[0]!;
    const rigaVera = repertorio.battute[0]!.testo[0]!;
    expect(riga.dove.startsWith(repertorio.battute[0]!.id)).toBe(true);

    const cache = cacheTemporanea();
    const motore = new MotoreFinto();
    const p = new PipelineVoce({
      motore: () => motore,
      uscita: uscitaVuota(),
      log: loggerMuto(),
      cache,
      direzione: (parlante) => direzionePredefinita(campagna, parlante),
    });
    // Come narrazione.ts: la riga porta testo, testo_voce (pronuncia inclusa) e una chiave Qwen.
    const frase: FraseDaDire = {
      id_frase: 't1-f0',
      turno: 1,
      indice: 0,
      parlante: rigaVera.etichetta,
      nome: rigaVera.etichetta,
      voce_id: riga.voce,
      testo: rigaVera.testo,
      testo_voce: pronuncia(rigaVera.testo),
      chiave_cache: 'qwen-non-conta',
    };
    p.accoda(frase);
    await p.chiudiTurno(1);

    // Il server ha mandato a drama-3 esattamente il testo espressivo calcolato dallo script…
    expect(motore.richieste).toHaveLength(1);
    expect(motore.richieste[0]!.espressivo).toBe(riga.espressivo);
    // …e ha scritto la cache sotto la chiave che lo script calcola per la stessa riga.
    expect(cache.fish!.ha(riga.chiave)).toBe(true);
  });

  it('la chiave è sha256 di "fish:<voce>\\n<testo espressivo>"', () => {
    const atteso = createHash('sha256').update('fish:narratore\n[calmo] Ciao.').digest('hex');
    expect(chiaveAudioEspressiva('fish', 'narratore', '[calmo] Ciao.')).toBe(atteso);
  });

  it('il riassunto conta righe, byte e costo con la tariffa di drama-3', () => {
    const campagna = caricaCampagna(PROVA_F0);
    const repertorio = caricaRepertorio(campagna, loggerMuto());
    const piano = pianoFish(campagna, repertorio, creaPronunciatore(campagna));
    const cache = cacheTemporanea();
    const r = riassuntoFish(piano, cache.fish!);
    expect(r.da_generare).toBe(piano.unici.length);
    expect(r.in_cache).toBe(0);
    expect(r.tariffa_usd_per_byte).toBe(DOLLARI_PER_BYTE);
    expect(r.costo_totale_usd).toBeCloseTo(r.byte_totali * 2e-6, 12);
    expect(costoFish('àè').byte).toBe(4);
  });

  it('le righe già in cache non si ricalcolano né si pagano', () => {
    const campagna = caricaCampagna(PROVA_F0);
    const repertorio = caricaRepertorio(campagna, loggerMuto());
    const piano = pianoFish(campagna, repertorio, creaPronunciatore(campagna));
    const cache = cacheTemporanea();
    cache.fish!.scrivi(piano.unici[0]!.chiave, Buffer.alloc(4), { voce: 'x', testo: 'x', sample_rate: 44_100 });
    expect(daGenerare(piano, cache.fish!)).toHaveLength(piano.unici.length - 1);
  });
});
