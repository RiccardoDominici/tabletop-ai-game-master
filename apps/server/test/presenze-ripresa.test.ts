/**
 * Presenze a mano del master (richiesta 2 del 9 novembre) e rivelazioni: sopravvivono a un riavvio del
 * server (stessa sessione del registro) e si azzerano al cambio di scena. Le rivelazioni restano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';
import { Prova, inizia } from './aiuti/partita';

const TUTTE = (s: { presenze?: Array<{ id: string; manuale: boolean; presente: boolean; rivelato: boolean }> }) => s.presenze ?? [];

describe('presenze e rivelazioni: ripresa e cambio di scena', () => {
  let prova: Prova;
  afterEach(async () => prova?.chiudi());

  it('le decisioni del master tornano dopo un riavvio; il cambio di scena le azzera, le rivelazioni restano', async () => {
    prova = new Prova();
    const cartella = prova.campagna('mini', { ritocchi: { 'png/png_guardia.yaml': (d) => (d['nascosto'] = true) } });
    // Una seconda scena per il cambio: copia della prima, con un altro id.
    const scena = YAML.parse(fs.readFileSync(path.join(cartella, 'scena.yaml'), 'utf8')) as Record<string, unknown>;
    fs.mkdirSync(path.join(cartella, 'scene'), { recursive: true });
    fs.writeFileSync(path.join(cartella, 'scene', 'scena_2.yaml'), YAML.stringify({ ...scena, id: 'scena_2' }));
    const copione = () => '[png_oste] Benvenuta: siediti.\n[invito] tutti';

    // Primo server: il master tiene l'oste altrove a mano e rivela la guardia.
    const a = await prova.avvia(cartella, copione);
    const schermo = await prova.proiettore(a.url);
    const tel = await prova.telefono(a.url, 'pg_anna');
    await inizia(schermo, tel);
    const master = await prova.master(a.url);
    expect(await master.comanda({ tipo: 'presenza', id_png: 'png_oste', presente: false })).toEqual({ ok: true });
    expect(await master.comanda({ tipo: 'rivela', id_png: 'png_guardia' })).toEqual({ ok: true });
    const prima = await master.stato();
    expect(TUTTE(prima).find((p) => p.id === 'png_oste')).toMatchObject({ manuale: true, presente: false });
    await a.s.chiudi(); // il processo si ferma: il registro resta

    // Secondo server sullo stesso registro: le decisioni sono ancora lì, prima ancora del proiettore.
    const b = await prova.avvia(cartella, copione);
    const master2 = await prova.master(b.url);
    const dopo = await master2.stato();
    expect(TUTTE(dopo).find((p) => p.id === 'png_oste')).toMatchObject({ manuale: true, presente: false });
    expect(TUTTE(dopo).find((p) => p.id === 'png_guardia')).toMatchObject({ rivelato: true, presente: true });
    expect(dopo.tavolo.scena.personaggi?.map((p) => p.id)).toContain('png_guardia');

    // Cambio di scena: la decisione a mano dell'oste cade (torna quanto dice la scena), la rivelazione resta.
    expect(await master2.comanda({ tipo: 'scena', scena: 'scena_2' })).toEqual({ ok: true });
    const cambiata = await master2.stato();
    expect(TUTTE(cambiata).find((p) => p.id === 'png_oste')).toMatchObject({ manuale: false });
    expect(TUTTE(cambiata).find((p) => p.id === 'png_guardia')).toMatchObject({ rivelato: true });
  }, 30_000);
});
