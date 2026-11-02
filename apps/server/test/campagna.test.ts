/**
 * Caricatore della campagna e compilatore del contesto F0 (fixture minima + campagna vera se c'è).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { compilaContestoCampagna } from '../src/campagna/contesto';
import { compilaMessaggioTurno } from '../src/narrazione/messaggio';
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
  it('include stile, scena, PNG, PG ed etichette; esclude preparazione, segreti dei PG e prompt immagine', () => {
    const testo = compilaContestoCampagna(caricaCampagna(MINI));
    expect(testo).toContain('# Campagna «La locanda della prova»');
    expect(testo).toContain('[png_oste] Oste Bruno');
    expect(testo).toContain('Piove da tre giorni.');
    expect(testo).toContain('Un uomo grosso col grembiule.');
    expect(testo).toContain('pg_anna, pg_bruno');
    expect(testo).not.toContain('IL_CATTIVO_E_IL_LOCANDIERE');
    expect(testo).not.toContain('SEGRETO_DI_ANNA');
    expect(testo).not.toContain('english');
  });

  it('è deterministico (stesso testo a ogni compilazione: serve alla cache)', () => {
    expect(compilaContestoCampagna(caricaCampagna(MINI))).toBe(compilaContestoCampagna(caricaCampagna(MINI)));
  });

  const vera = path.join(RADICE_REPO, 'campagne', 'prova-f0');
  it.skipIf(!fs.existsSync(path.join(vera, 'scena.yaml')))('carica la campagna vera prova-f0 senza perdere segreti nel contesto', () => {
    const c = caricaCampagna(vera);
    expect(c.png.length).toBeGreaterThan(0);
    expect(c.pg.length).toBeGreaterThan(0);
    expect(c.scena.apertura.length).toBeGreaterThan(0);
    const testo = compilaContestoCampagna(c);
    expect(testo).not.toMatch(/conoscenze_private/);
    expect(testo).not.toMatch(/^preparazione:/m);
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
    expect(m).toContain('[narratore] Piove.');
    expect(m).toContain('(azione di Anna, pg_anna) Entro.');
    expect(m).toContain('[png_oste] Benvenuti.');
    expect(m).not.toContain('NON_RIPETERE');
    expect(m).toContain('- Anna (pg_anna): Ordino da bere.');
    expect(m).toContain('- Brunello (pg_bruno): nessuna azione, aspetta.');
    expect(m).toContain('PG al tavolo: Anna (pg_anna), Brunello (pg_bruno).');
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
