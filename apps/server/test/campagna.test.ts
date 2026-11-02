/**
 * Caricatore della campagna e compilatore del contesto F0 (fixture minima + campagna vera se c'è).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { compilaContestoCampagna } from '../src/campagna/contesto';
import { compilaMessaggioTurno } from '../src/narrazione/messaggio';
import YAML from 'yaml';
import { RADICE_REPO } from '../src/percorsi';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');

describe('caricaCampagna', () => {
  it('legge PNG con voce, PG senza conoscenze private, apertura = riassunto + apertura', () => {
    const c = caricaCampagna(MINI);
    expect(c.id).toBe('mini');
    expect(c.scena.titolo).toBe('La locanda della prova');
    expect(c.scena.apertura).toEqual(['Piove da tre giorni sulla valle.', 'La locanda è piena di fumo.', 'Il locandiere vi guarda: che fate?']);
    expect(c.scena.umore).toBe('taverna_calda');
    expect(c.png.map((p) => [p.id, p.voce_id, p.nome])).toEqual([
      ['png_guardia', 'nadine', 'Guardia Lia'],
      ['png_oste', 'vincent', 'Oste Bruno'],
    ]);
    expect(c.pg.map((p) => p.id)).toEqual(['pg_anna', 'pg_bruno']);
    expect(c.pg[0]!.descrizione).toBe('Umana guerriera. Capelli corti.');
    expect(c.pg[0]!.pubblico).not.toHaveProperty('conoscenze_private');
    expect(c.pg[0]!.privato).toHaveLength(1);
    expect(c.campagnaNarratore).not.toHaveProperty('preparazione');
    expect(c.alias).toMatchObject({ oste: 'png_oste', anna: 'pg_anna', 'oste bruno': 'png_oste' });
  });
});

describe('compilaContestoCampagna', () => {
  it('include stile, scena, PNG, PG ed etichette; esclude preparazione e prompt immagine; segreti dei PG marcati', () => {
    const testo = compilaContestoCampagna(caricaCampagna(MINI));
    expect(testo).toContain('# Campagna «La locanda della prova»');
    expect(testo).toContain('[png_oste] Oste Bruno');
    expect(testo).toContain('Piove da tre giorni.');
    expect(testo).toContain('Un uomo grosso col grembiule.');
    expect(testo).toContain('pg_anna, pg_bruno');
    expect(testo).not.toContain('IL_CATTIVO_E_IL_LOCANDIERE');
    // Le conoscenze private arrivano al narratore solo dentro la sezione marcata come segreta.
    const i = testo.indexOf('SEGRETO_DI_ANNA');
    expect(i).toBeGreaterThan(0);
    expect(testo.lastIndexOf('conoscenze_private di pg_anna (SEGRETE', i)).toBeGreaterThan(0);
    expect(testo).not.toContain('english');
  });

  it('è deterministico (stesso testo a ogni compilazione: serve alla cache)', () => {
    expect(compilaContestoCampagna(caricaCampagna(MINI))).toBe(compilaContestoCampagna(caricaCampagna(MINI)));
  });

  const vera = path.join(RADICE_REPO, 'campagne', 'prova-f0');
  it.skipIf(!fs.existsSync(path.join(vera, 'scena.yaml')))('campagna vera: nessun testo di `preparazione` nel contesto del narratore', () => {
    const c = caricaCampagna(vera);
    expect(c.png.length).toBeGreaterThan(0);
    expect(c.pg.length).toBeGreaterThan(0);
    expect(c.scena.apertura.length).toBeGreaterThan(0);
    const testo = compilaContestoCampagna(c);
    expect(testo).not.toMatch(/^preparazione:/m);

    // Tutte le stringhe di `preparazione` (letta direttamente dal file), tranne quelle che
    // compaiono identiche anche fuori da `preparazione` (lì sono legittime).
    const grezza = YAML.parse(fs.readFileSync(path.join(vera, 'campagna.yaml'), 'utf8')) as Record<string, unknown>;
    const stringhe = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(stringhe) : v && typeof v === 'object' ? Object.values(v).flatMap(stringhe) : [];
    const fuori = JSON.stringify([c.stile, c.campagnaNarratore, c.scena.dati, c.png.map((p) => p.dati), c.pg.map((p) => [p.pubblico, p.privato])]);
    const segrete = stringhe(grezza['preparazione']).filter((s) => s.length >= 12 && !fuori.includes(s));
    expect(segrete.length).toBeGreaterThan(10);
    const trapelate = segrete.filter((s) => testo.includes(s));
    expect(trapelate).toEqual([]);
  });
});

describe('compilaMessaggioTurno', () => {
  it('trascrizione dei turni precedenti, azioni del turno, PG al tavolo', () => {
    const m = compilaMessaggioTurno({
      turno: 2,
      trascrizione: [
        { id: 1, turno: 0, tipo: 'narrazione', chi: 'narratore', nome: 'Narratore', testo: 'Piove.' },
        { id: 2, turno: 1, tipo: 'azione', chi: 'pg_anna', nome: 'Anna', testo: 'Entro.' },
        { id: 3, turno: 1, tipo: 'battuta', chi: 'png_oste', nome: 'Oste', testo: 'Benvenuti.' },
        { id: 4, turno: 2, tipo: 'azione', chi: 'pg_anna', nome: 'Anna', testo: 'NON_RIPETERE' },
      ],
      azioni: [
        { id_pg: 'pg_anna', nome: 'Anna', testo: 'Ordino da bere.' },
        { id_pg: 'pg_bruno', nome: 'Brunello', testo: null },
      ],
      pgAlTavolo: [{ id: 'pg_anna', nome: 'Anna' }, { id: 'pg_bruno', nome: 'Brunello' }],
    });
    expect(m).toContain('### Turno 0 (apertura)\n[narratore] Piove.');
    expect(m).toContain('### Turno 1\n(azione di Anna, pg_anna) Entro.');
    expect(m).toContain('(azione di Anna, pg_anna) Entro.');
    expect(m).toContain('[png_oste] Benvenuti.');
    expect(m).not.toContain('NON_RIPETERE');
    expect(m).toContain('- Anna (pg_anna): Ordino da bere.');
    expect(m).toContain('- Brunello (pg_bruno): nessuna azione, aspetta.');
    expect(m).toContain('pg_presenti: [pg_anna, pg_bruno] (pg_anna = Anna; pg_bruno = Brunello)');
  });
});

describe('descrizione dei PG', () => {
  it('non ripete la specie se l’aspetto comincia con la specie', () => {
    const vera = path.join(RADICE_REPO, 'campagne', 'prova-f0');
    if (!fs.existsSync(path.join(vera, 'pg.yaml'))) return;
    const c = caricaCampagna(vera);
    const g = c.pg.find((p) => p.id === 'pg_ginestra');
    if (g) expect(g.descrizione).toMatch(/^Druida\. Halfling/);
  });
});
