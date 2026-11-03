/**
 * Regista dell'audio con un AudioContext finto (contestoFinto.ts): dissolvenze della musica e
 * isteresi, strati d'ambiente, tema una volta per PNG per scena, ducking sotto la voce, memoria.
 */
import { describe, expect, it } from 'vitest';
import type { AudioScena, CatalogoAudioPubblico, TracciaAudio } from '@cantastorie/shared';
import { BancaAudio } from './banca';
import { ContestoFinto } from './contestoFinto';
import { IMPOSTAZIONI_PREDEFINITE } from './impostazioni';
import { Mixer } from './mixer';
import { dbALineare } from './regole';
import { RegistaAudio } from './regista';

function traccia(id: string, tipo: TracciaAudio['tipo'], durata: number, guadagno = 1): TracciaAudio {
  const loop = tipo === 'musica' || tipo === 'umore' || tipo === 'ambiente';
  return { id, tipo, url: `/api/audio/${id}.ogg#${durata}`, loop, guadagno, durata_s: durata, loop_inizio_s: null, loop_fine_s: null, giunta_s: 0 };
}

const CATALOGO: CatalogoAudioPubblico = {
  tracce: Object.fromEntries(
    [
      traccia('luogo_a', 'musica', 8),
      traccia('luogo_b', 'musica', 8),
      traccia('umore_tensione', 'umore', 8),
      traccia('amb_a_fuoco', 'ambiente', 6, 0.5),
      traccia('amb_a_folla', 'ambiente', 6, 0.3),
      traccia('amb_b_vento', 'ambiente', 6, 0.4),
      traccia('tema_png_o', 'tema', 3),
      traccia('tema_png_b', 'tema', 3),
      traccia('sfx_campana', 'effetto', 2),
    ].map((t) => [t.id, t]),
  ),
  crediti: ['Brano, Autore, CC BY 4.0'],
};

function audio(parziale: Partial<AudioScena>): AudioScena {
  return { scena: 's1', musica: null, umore: null, ambienti: [], temi: { png_o: 'tema_png_o', png_b: 'tema_png_b' }, umori: { tensione: 'umore_tensione' }, prossimi: [], ...parziale };
}

const A = audio({ musica: 'luogo_a', ambienti: ['amb_a_folla', 'amb_a_fuoco'], prossimi: ['luogo_b', 'amb_b_vento'] });
const B = audio({ musica: 'luogo_b', ambienti: ['amb_b_vento'], prossimi: ['luogo_a'] });

async function svuota(): Promise<void> {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function prepara() {
  const ctx = new ContestoFinto();
  // La durata del buffer viene dall'URL (#8): il byte 0 dei dati finti.
  const banca = new BancaAudio(async (url) => Uint8Array.of(Number(url.split('#')[1] ?? 8)).buffer, (b) => ctx.decodeAudioData(b));
  const mixer = new Mixer(ctx, IMPOSTAZIONI_PREDEFINITE);
  const regista = new RegistaAudio({ ctx, mixer, banca, timer: ctx, ora: () => ctx.oraMs, isteresiMs: 60_000 });
  regista.impostaCatalogo(CATALOGO);
  /** Avanza il tempo lasciando correre le promesse (download e decodifiche finti). */
  const avanza = async (s: number) => {
    await svuota();
    ctx.avanza(s);
    await svuota();
  };
  return { ctx, banca, mixer, regista, avanza };
}

describe('RegistaAudio: musica', () => {
  it('parte dal silenzio con un’entrata di 3,5 s; il cambio di luogo entro 60 s aspetta', async () => {
    const { regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(1.5);
    expect(regista.stato()).toMatchObject({ musica: 'luogo_a', cambiMusica: 1 });
    const g = regista.guadagni();
    expect(g['musica:luogo_a']).toBeGreaterThan(0.2);
    expect(g['musica:luogo_a']).toBeLessThan(1);
    await avanza(3);
    expect(regista.guadagni()['musica:luogo_a']).toBeCloseTo(1, 5);

    // 20 s dopo il primo brano il gruppo si sposta: gli ambienti cambiano, la musica aspetta.
    await avanza(15.5);
    regista.scena(B, 'esplorazione_tesa', 1);
    await avanza(0.1);
    expect(regista.stato()).toMatchObject({ musica: 'luogo_a', musicaPendente: 'luogo_b', cambiMusica: 1 });
    await avanza(39.5); // t ≈ 59,6 s: ancora in attesa
    expect(regista.stato()).toMatchObject({ musica: 'luogo_a', musicaPendente: 'luogo_b' });
    await avanza(1); // t ≈ 60,6 s: 60 s dal primo brano, scade l'isteresi
    expect(regista.stato()).toMatchObject({ musica: 'luogo_b', musicaPendente: undefined, cambiMusica: 2 });
  });

  it('dissolvenza incrociata: il vecchio brano esce mentre il nuovo entra, poi si ferma e si libera', async () => {
    const { ctx, regista, banca, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(61);
    const vecchio = ctx.guadagni.find((x) => x.gain.eventi.some((e) => e.tipo === 'curva') && x.gain.value > 0.99)!;
    regista.scena(B, 'esplorazione_tesa', 1);
    await avanza(1.75);
    const g = regista.guadagni();
    // A metà: entrambi tra 0 e 1, potenza circa costante.
    expect(g['musica:luogo_b']).toBeGreaterThan(0.4);
    expect(vecchio.gain.value).toBeGreaterThan(0.4);
    expect(vecchio.gain.value ** 2 + g['musica:luogo_b']! ** 2).toBeCloseTo(1, 1);
    await avanza(2.5);
    expect(vecchio.gain.value).toBe(0);
    const sorgenteA = ctx.sorgenti.find((s) => s.buffer && s.loop && s.fermataA !== null);
    expect(sorgenteA?.fermataA).toBeGreaterThan(61);
    // La traccia vecchia si chiude dopo l'uscita; il suo buffer resta solo se è un luogo vicino.
    await avanza(1);
    expect(banca.statistiche().inUso).toBe(2); // luogo_b + amb_b_vento
  });

  it('memoria: dopo lo spostamento restano decodificati solo i brani di adesso (i vicini compressi)', async () => {
    const { regista, banca, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(61);
    regista.scena(B, 'esplorazione_tesa', 1); // A è tra i `prossimi` di B: byte sì, buffer no
    await avanza(5);
    expect(banca.statistiche()).toMatchObject({ decodificati: 2, inUso: 2 });
    expect(banca.decodificato('/api/audio/luogo_a.ogg#8')).toBe(false);
    expect(banca.statistiche().compressi).toBeGreaterThanOrEqual(5);
  });

  it('un umore esplicito non aspetta l’isteresi; toglierlo torna alla musica del luogo', async () => {
    const { regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(5);
    regista.scena({ ...A, umore: 'umore_tensione' }, 'esplorazione_tesa', 1);
    await avanza(0.5);
    expect(regista.stato()).toMatchObject({ musica: 'umore_tensione', cambiMusica: 2 });
    regista.scena(A, 'esplorazione_tesa', 1);
    await avanza(0.5);
    expect(regista.stato()).toMatchObject({ musica: 'luogo_a', cambiMusica: 3 });
  });

  it('cambio di scena (o del suo umore): la musica cambia subito', async () => {
    const { regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(5);
    regista.scena({ ...B, scena: 's2' }, 'inseguimento', 3);
    await avanza(0.5);
    expect(regista.stato()).toMatchObject({ musica: 'luogo_b', cambiMusica: 2 });
  });

  it('lo stesso stato ripetuto (ogni battuta della trascrizione) non rifà nulla', async () => {
    const { regista, avanza } = prepara();
    for (let i = 0; i < 5; i += 1) regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(1);
    expect(regista.stato().cambiMusica).toBe(1);
  });
});

describe('RegistaAudio: ambienti', () => {
  it('più strati in loop per luogo; al cambio quelli vecchi escono e i nuovi entrano, subito', async () => {
    const { ctx, regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(3.2);
    expect(regista.stato().ambienti).toEqual(['amb_a_folla', 'amb_a_fuoco']);
    const g = regista.guadagni();
    expect(g['ambiente:amb_a_fuoco']).toBeCloseTo(0.5, 3);
    expect(g['ambiente:amb_a_folla']).toBeCloseTo(0.3, 3);
    const loopAmbiente = ctx.sorgenti.filter((s) => s.loop && s.buffer?.duration === 6);
    expect(loopAmbiente).toHaveLength(2);
    regista.scena(B, 'esplorazione_tesa', 1);
    await avanza(1.5);
    expect(regista.stato().ambienti).toEqual(['amb_b_vento']);
    expect(regista.guadagni()['ambiente:amb_b_vento']).toBeGreaterThan(0.1);
    expect(loopAmbiente.every((s) => s.fermataA !== null)).toBe(true);
  });
});

describe('RegistaAudio: temi dei PNG', () => {
  it('il tema suona alla prima battuta del PNG nella scena, poco prima della voce, una volta sola', async () => {
    const { ctx, regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(10);
    const sorgentiPrima = ctx.sorgenti.length;
    regista.fraseProgrammata('narratore', 12);
    regista.fraseProgrammata('png_o', 12);
    await avanza(0.01);
    const tema = ctx.sorgenti.slice(sorgentiPrima).find((s) => s.buffer?.duration === 3);
    expect(tema?.avviataA).toBeCloseTo(11.4, 5); // 0,6 s prima della battuta
    expect(tema?.loop).toBe(false);
    expect(regista.stato()).toMatchObject({ temi: 1, temiSuonati: ['s1:png_o'] });
    regista.fraseProgrammata('png_o', 20);
    regista.fraseProgrammata('png_o', 30);
    regista.fraseProgrammata('png_b', 31);
    await avanza(0.01);
    expect(regista.stato()).toMatchObject({ temi: 2, temiSuonati: ['s1:png_o', 's1:png_b'] });
    // Scena nuova: i temi tornano a suonare (una volta ciascuno).
    regista.scena({ ...A, scena: 's2' }, 'esplorazione_tesa', 5);
    regista.fraseProgrammata('png_o', 40);
    await avanza(0.01);
    expect(regista.stato()).toMatchObject({ temi: 3, temiSuonati: ['s2:png_o'] });
  });

  it('annuncio della frase: il tema parte 0,6 s prima dell’inizio previsto; il pezzo dopo non lo ripete', async () => {
    const { ctx, regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(10);
    const prima = ctx.sorgenti.length;
    regista.fraseAnnunciata('png_o', 13); // voce in coda fino a 13 s
    await avanza(0.01);
    expect(ctx.sorgenti.slice(prima).find((s) => s.buffer?.duration === 3)?.avviataA).toBeCloseTo(12.4, 5);
    regista.fraseProgrammata('png_o', 13.2);
    await avanza(0.01);
    expect(regista.stato()).toMatchObject({ temi: 1, anticipiTemi: [{ png: 'png_o', anticipoS: 0.6 }] });
    // Annuncio con la coda vuota: il tema parte subito (la voce arriverà dopo).
    regista.fraseAnnunciata('png_b', 5);
    await avanza(0.01);
    expect(regista.stato().anticipiTemi[1]).toMatchObject({ png: 'png_b', anticipoS: 0 });
  });

  it('PNG senza tema: niente; scena ricominciata (turno indietro): i temi si azzerano', async () => {
    const { regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 4);
    regista.fraseProgrammata('png_senza_tema', 5);
    regista.fraseProgrammata('png_o', 5);
    await avanza(0.01);
    expect(regista.stato().temi).toBe(1);
    regista.scena(A, 'esplorazione_tesa', 0);
    regista.fraseProgrammata('png_o', 8);
    await avanza(0.01);
    expect(regista.stato().temi).toBe(2);
  });
});

describe('RegistaAudio: ducking', () => {
  it('musica e ambienti scendono di ~9 dB sotto la voce e risalgono dopo la tenuta', async () => {
    const { mixer, regista, avanza } = prepara();
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(9.5);
    // Una narrazione di tre pezzi contigui da 10 s a 13 s.
    regista.voceProgrammata(10, 11, );
    regista.voceProgrammata(11, 12);
    regista.voceProgrammata(12, 13);
    expect(mixer.sottoVoce.gain.value).toBe(1);
    await avanza(1); // t = 10,5
    expect(mixer.sottoVoce.gain.value).toBeCloseTo(dbALineare(-9), 1);
    expect(regista.stato()).toMatchObject({ sottoVoce: true, abbassamenti: 1 });
    await avanza(3.5); // t = 14: voce finita da 1 s, tenuta 1,4 s → ancora giù
    expect(mixer.sottoVoce.gain.value).toBeCloseTo(dbALineare(-9), 2);
    await avanza(2); // t = 16: risalita cominciata a 14,4 s
    expect(mixer.sottoVoce.gain.value).toBeGreaterThan(0.9);
    expect(regista.stato().sottoVoce).toBe(false);
    // I bus voce e temi non passano dal ducking.
    expect(mixer.bus.voce.gain.value).toBe(1);
  });

  it('interruzione della voce: risale subito', async () => {
    const { mixer, regista, avanza } = prepara();
    regista.voceProgrammata(1, 30);
    await avanza(2);
    expect(mixer.sottoVoce.gain.value).toBeLessThan(0.4);
    regista.interrompi();
    await avanza(1.5);
    expect(mixer.sottoVoce.gain.value).toBeGreaterThan(0.95);
    expect(regista.stato().sottoVoce).toBe(false);
  });
});

describe('Mixer: volumi dal pannello', () => {
  it('volume e muto di un bus, morbidi', async () => {
    const { ctx, mixer } = prepara();
    expect(mixer.guadagni()).toMatchObject({ bus_musica: 0.5, bus_voce: 1, sotto_voce: 1 });
    mixer.imposta('musica', { volume: 0.2, muto: false });
    mixer.imposta('ambiente', { volume: 0.9, muto: true });
    ctx.avanza(0.5);
    expect(mixer.guadagni()['bus_musica']).toBeCloseTo(0.2, 3);
    expect(mixer.guadagni()['bus_ambiente']).toBeCloseTo(0, 3);
  });
});

describe('RegistaAudio: stesso file sotto più nomi', () => {
  const CONDIVISI: CatalogoAudioPubblico = {
    tracce: {
      ...CATALOGO.tracce,
      luogo_n_a: { ...traccia('luogo_a', 'musica', 8), id: 'luogo_n_a' },
      amb_b_fuoco: { ...traccia('amb_a_fuoco', 'ambiente', 6, 0.2), id: 'amb_b_fuoco' },
    },
    crediti: [],
  };

  it('musica: un alias (nodo ↔ scena) non fa dissolvere il brano in sé stesso', async () => {
    const { regista, avanza } = prepara();
    regista.impostaCatalogo(CONDIVISI);
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(70);
    regista.scena({ ...A, musica: 'luogo_n_a' }, 'esplorazione_tesa', 1);
    await avanza(1);
    expect(regista.stato()).toMatchObject({ musica: 'luogo_a', cambiMusica: 1, musicaPendente: undefined });
  });

  it('ambienti: lo strato condiviso continua sotto il nome nuovo, al volume nuovo', async () => {
    const { ctx, regista, avanza } = prepara();
    regista.impostaCatalogo(CONDIVISI);
    regista.scena(A, 'esplorazione_tesa', 0);
    await avanza(4);
    const sorgenti = ctx.sorgenti.length;
    regista.scena({ ...A, ambienti: ['amb_b_fuoco'] }, 'esplorazione_tesa', 1);
    await avanza(3.5);
    expect(regista.stato().ambienti).toEqual(['amb_b_fuoco']);
    expect(regista.guadagni()['ambiente:amb_b_fuoco']).toBeCloseTo(0.2, 3);
    expect(ctx.sorgenti.length).toBe(sorgenti); // nessuna sorgente nuova: è lo stesso loop
  });
});

describe('RegistaAudio: effetti', () => {
  it('un effetto del catalogo suona una volta sul bus effetti', async () => {
    const { ctx, regista } = prepara();
    expect(await regista.effetto('sfx_campana')).toBe(true);
    expect(await regista.effetto('sfx_inesistente')).toBe(false);
    expect(ctx.sorgenti.some((s) => s.buffer?.duration === 2 && !s.loop)).toBe(true);
  });
});
