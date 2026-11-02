/**
 * Contesto del selettore (modalità repertorio): allowlist + parole segrete.
 * Sulla campagna vera: nessuna parola di parole_segrete.yaml nel contesto compilato né nel
 * messaggio del turno, finché la sua condizione `pubblica_dopo` non è vera.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { compilaMessaggioTurno } from '../src/narrazione/messaggio';
import { RADICE_REPO } from '../src/percorsi';
import { caricaRepertorio } from '../src/repertorio/caricatore';
import { compilaContestoRepertorio } from '../src/repertorio/contesto';
import { caricaParoleSegrete, regexDaPython, segretiNelTesto } from '../src/repertorio/segreti';
import { StatoRepertorio } from '../src/repertorio/stato';
import { StatoOrologi } from '../src/scena/orologi';

const MINI = path.join(import.meta.dirname, 'fixtures', 'campagne', 'mini');
const VERA = path.join(RADICE_REPO, 'campagne', 'prova-f0');

describe('regexDaPython', () => {
  it('\\w e \\b riconoscono le lettere accentate come in Python', () => {
    expect(regexDaPython('\\bè il pane\\b').test('perché è il pane, dice')).toBe(true);
    expect(regexDaPython('\\bè il pane\\b').test('perchéè il panettone')).toBe(false);
    expect(regexDaPython('chicc\\w* ner').test('chicchi neri')).toBe(true);
    expect(regexDaPython('\\bguast').test('pane guasto')).toBe(true);
    expect(regexDaPython('\\bguast').test('sguastato')).toBe(false);
  });
});

describe('contesto del selettore — fixture', () => {
  it('toglie indizi, come_si_trova, elementi NASCOSTI e frasi con parole segrete; tiene il pubblico', () => {
    const c = caricaCampagna(MINI);
    const t = compilaContestoRepertorio(c, caricaParoleSegrete(path.join(MINI, 'repertorio')));
    expect(t).not.toContain('ANNACQUATO_SEGRETO'); // in come_si_trova e nel taglio
    expect(t).not.toMatch(/botola/i); // elemento NASCOSTO
    expect(t).not.toContain('f_oste_ladro'); // fatto nascosto
    expect(t).not.toContain('IL_CATTIVO_E_IL_LOCANDIERE');
    expect(t).not.toContain('SEGRETO_DI_ANNA');
    expect(t).toContain('Piove da tre giorni.'); // fatto pubblico
    expect(t).toContain('la botte');
    expect(t).toContain('Un uomo grosso col grembiule.');
    expect(t).toContain('[usa]');
  });
});

describe.skipIf(!fs.existsSync(path.join(VERA, 'repertorio', 'parole_segrete.yaml')))('contesto del selettore — campagna vera', () => {
  it('una battuta che tocca un segreto entra nell’elenco solo quando i giocatori ne nominano i temi', () => {
    const rep = caricaRepertorio(c);
    const s = new StatoRepertorio(rep, c, new StatoOrologi(c));
    // Dal 346b4b7 la confessione di guerra richiede che Sebastiano l'abbia prima negata una volta.
    expect(s.usa('seb_guerra_versione', 1, false)).toMatchObject({ ok: true });
    const senza = s.disponibiliPerTurno('Chiedo al forestiero da dove viene.', parole);
    expect(senza.trattenute).toContain('seb_guerra_roccalba');
    expect(senza.battute.map((b) => b.id)).not.toContain('seb_guerra_roccalba');
    const con = s.disponibiliPerTurno('Ehi tu! Sei il cerusico del Grifo?', parole);
    expect(con.battute.map((b) => b.id)).toContain('seb_guerra_roccalba');
  });

  const c = caricaCampagna(VERA);
  const parole = caricaParoleSegrete(path.join(VERA, 'repertorio'));
  const contesto = compilaContestoRepertorio(c, parole);

  it('nessuna parola segreta nel contesto di sistema', () => {
    expect(parole.length).toBeGreaterThan(20);
    expect(segretiNelTesto(contesto, parole).map((p) => p.parola)).toEqual([]);
  });

  it('niente campi vietati dall’allowlist', () => {
    // Chiavi YAML vietate (a inizio riga) e frammenti vietati ovunque.
    for (const chiave of ['mente_su', 'verita', 'segreto', 'come_si_trova', 'non_sa', 'crede_a_torto', 'desiderio', 'paura', 'rivelazioni', 'colli_di_bottiglia', 'mossa_morbida_pronta', 'posta', 'scopo', 'conoscenze_private', 'preparazione', 'al_completo', 'invarianti', 'prompt_immagine', 'mai_dice', 'indizi', 'segni', 'avanza_quando']) {
      expect(contesto, chiave).not.toMatch(new RegExp(`^\\s*-?\\s*${chiave}:`, 'm'));
    }
    expect(contesto).not.toContain('parola da medico');
    expect(contesto).toContain('Frasi ordinate e brevi. Fa domande precise');
  });

  it('una parola resta fuori dal messaggio finché la condizione non è vera, poi può entrare', () => {
    const rep = caricaRepertorio(c);
    const orologi = new StatoOrologi(c);
    const s = new StatoRepertorio(rep, c, orologi);
    const canone = new Map((c.campagnaNarratore['canone'] as Array<{ id: string; testo: string }>).map((f) => [f.id, f.testo]));
    const pubblico = () => ({ indiziRivelati: s.indiziRivelati, battuteUsate: (id: string) => s.usata(id) });
    const messaggio = () =>
      compilaMessaggioTurno({
        turno: 2,
        trascrizione: [],
        azioni: [{ id_pg: 'pg_ginestra', nome: 'Ginestra', testo: 'Sfoglio il quaderno dei conti.' }],
        pgAlTavolo: [{ id: 'pg_ginestra', nome: 'Ginestra' }],
        orologi: orologi.descriviRepertorio(2),
        repertorio: {
          fattiScoperti: s.fattiScoperti.map((id) => `${id} — ${canone.get(id)}`),
          battuteDisponibili: s.elencoDisponibili(s.disponibiliPerTurno('Sfoglio il quaderno dei conti.', parole).battute),
        },
      });
    const prima = messaggio();
    expect(segretiNelTesto(prima, parole).map((p) => p.parola)).toEqual([]);
    expect(prima).toContain('nar_registro · narratore · indizio');

    expect(s.usa('nar_registro', 2, false)).toMatchObject({ ok: true });
    const dopo = messaggio();
    // Il fatto scoperto entra nel messaggio: «metà prezzo» ora c'è, ma non è più segreta.
    expect(dopo).toMatch(/metà prezzo/);
    // Senza lo stato sarebbe una fuga; con lo stato (nar_registro uscita) è pubblica.
    expect(segretiNelTesto(dopo, parole).map((p) => p.parola)).toContain('metà prezzo');
    expect(segretiNelTesto(dopo, parole, pubblico())).toEqual([]);
  });
});
