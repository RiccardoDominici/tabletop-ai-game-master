/**
 * Dadi e regole nella lingua dei contenuti (docs/lingue.md, docs/prove.md): nomi SRD, parole chiave
 * dell'arbitro a regole, frasi dei fatti e prompt degli arbitri vengono dal pacchetto della lingua
 * attiva. L'italiano resta com'era (lo provano i test di sempre); qui l'inglese, e il ritorno all'italiano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { caricaCampagna } from '../src/campagna/caricatore';
import { ABILITA, ARMATURE, CARATTERISTICHE, DIFFICOLTA, NOME_ABILITA, NOME_CARATTERISTICA, comeAbilita, comeArmatura, nomeAbilita, nomeDifficolta } from '../src/campagna/regole-srd';
import { caricaSchede } from '../src/campagna/schede';
import { LINGUE, impostaLingua, percorsoPrompt } from '../src/lingua';
import { loggerMuto } from '../src/logger';
import { SCHEMA_PROVE, messaggioProve, promptArbitroProve } from '../src/prove/arbitro-haiku';
import { classificaARegole, type IngressoClassificatore } from '../src/prove/classificatore-regole';
import { DadiACopione } from '../src/prove/dadi';
import { PROMPT_PROVE, datiProve, paroleProve } from '../src/prove/lingua';
import { MotoreProve, dadiAttivi, type ContestoProve } from '../src/prove/motore';
import { candidatiSrd } from '../src/prove/parole-chiave';
import { etichettaProva, etichettaSalvezza, fattoTiro, salute, tipoDanno } from '../src/prove/testi';
import type { ArbitroProve, DecisioneProva } from '../src/prove/tipi';
import { normalizza } from '../src/azioni/regole';
import { caricaRegole } from '../src/regole/caricatore';
import { combattimentoSrd } from '../src/regole/combattimento';
import { cercaEstratti } from '../src/regole/estratti';

const FIX = path.join(import.meta.dirname, 'fixtures', 'campagne');

afterEach(() => impostaLingua('it'));

describe('pacchetti dei dadi: ogni lingua ha tutto ciò che serve al codice', () => {
  it('nomi di ogni id del codice e parole chiave per ogni abilità SRD, in ogni lingua', () => {
    for (const l of LINGUE) {
      impostaLingua(l);
      const n = datiProve().nomi;
      for (const c of CARATTERISTICHE) expect(n.caratteristiche[c], `${l}: ${c}`).toBeTruthy();
      for (const a of ABILITA) {
        expect(n.abilita[a], `${l}: ${a}`).toBeTruthy();
        expect(datiProve().parole.abilita[a]?.length, `${l}: parole per ${a}`).toBeGreaterThan(0);
      }
      for (const d of Object.keys(DIFFICOLTA)) expect(n.difficolta[d], `${l}: ${d}`).toBeTruthy();
      for (const a of Object.keys(ARMATURE)) expect(n.armature[a], `${l}: ${a}`).toBeTruthy();
      // Le condizioni SRD si costruiscono (lancia se ne manca una) e hanno nome e testo.
      expect(combattimentoSrd().condizioni.every((c) => c.nome && c.testo)).toBe(true);
    }
  });

  it('i prompt dei dadi e delle regole ci sono in ogni lingua, con gli stessi segnaposto', () => {
    const segnaposto = (f: string): string[] => [...new Set([...fs.readFileSync(f, 'utf8').matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].sort();
    for (const nome of PROMPT_PROVE) {
      const rif = segnaposto(percorsoPrompt(nome, 'it'));
      for (const l of LINGUE) expect(segnaposto(percorsoPrompt(nome, l)), `${l}/${nome}.md`).toEqual(rif);
    }
  });
});

describe('arbitro a regole in inglese: parole chiave', () => {
  it('ogni abilità SRD dalle parole inglesi (testo libero, prima persona)', () => {
    impostaLingua('en');
    const casi: Array<[string, string]> = [
      ['I climb the wall', 'atletica'],
      ['I swim to the shore', 'atletica'],
      ['I grab him by the arm', 'atletica'],
      ['I try to persuade the guard', 'persuasione'],
      ['I beg you, let us through', 'persuasione'],
      ['I try to remember the history of the noble house', 'storia'],
      ['Is he lying to me?', 'intuizione'],
      ['I look him in the eye to tell if he is lying', 'intuizione'],
      ['I lie to the guard about my name', 'inganno'],
      ['I pretend to be a merchant', 'inganno'],
      ['I threaten the innkeeper', 'intimidire'],
      ['I sing a ballad for the crowd', 'intrattenere'],
      ['I sneak past the guards', 'furtivita'],
      ['I hide behind the cart', 'furtivita'],
      ['I pick the lock of the chest', 'rapidita_di_mano'],
      ['I steal the key', 'rapidita_di_mano'],
      ['I keep my balance on the beam', 'acrobazia'],
      ['I dodge the blow', 'acrobazia'],
      ['I bandage Corrado’s wound', 'medicina'],
      ['I follow the tracks in the mud', 'sopravvivenza'],
      ['I light a fire', 'sopravvivenza'],
      ['I pray to the goddess', 'religione'],
      ['I study the rune on the door', 'arcano'],
      ['I gather the herbs by the river', 'natura'],
      ['I calm the horse', 'addestrare_animali'],
      ['I search the room', 'indagare'],
      ['I listen at the door', 'percezione'],
      ['I keep an eye on the road', 'percezione'],
    ];
    for (const [frase, abilita] of casi) expect(candidatiSrd(frase, 1), frase).toEqual([abilita]);
    // Niente parole chiave: nessun tiro (banale: salutare, chiedere).
    expect(candidatiSrd('I greet everyone and sit down')).toEqual([]);
    expect(candidatiSrd('I ask Bertoldo how long the thug has been here')).toEqual([]);
    // Le stesse frasi con la tabella italiana non trovano niente: la tabella è quella della lingua attiva.
    impostaLingua('it');
    expect(candidatiSrd('I climb the wall')).toEqual([]);
    expect(candidatiSrd('Mi arrampico sul muro', 1)).toEqual(['atletica']);
  });

  it('verbi d’attacco e d’aiuto inglesi', () => {
    impostaLingua('en');
    const { attacco, aiuto } = paroleProve();
    for (const f of ['I shoot him with my crossbow', 'I stab Ruggero', 'I attack the thug', 'I fire at Ruggero', 'I punch him']) expect(attacco.test(normalizza(f)), f).toBe(true);
    for (const f of ['I climb the wall', 'I greet Ruggero']) expect(attacco.test(normalizza(f)), f).toBe(false);
    for (const f of ['I help Corrado climb', 'I give Corrado a hand', 'I cover Corrado']) expect(aiuto.test(normalizza(f)), f).toBe(true);
    expect(aiuto.test(normalizza('I take cover behind the cart'))).toBe(false);
  });

  it('il classificatore intero: attacco, aiuto, prova della scena, abilità, contrapposta, niente tiro', () => {
    impostaLingua('en');
    const c = caricaCampagna(path.join(FIX, 'prove'));
    const ing: IngressoClassificatore = {
      campagna: c,
      regole: null,
      armi: (id) => (id === 'pg_corrado' ? ['light_crossbow', 'longsword'] : []),
      haScheda: () => true,
      proveScena: [{ id: 'p_ford', quando: 'a PC crosses the river at the ford, holding the rope' }],
      altre: [{ id: 'x1', autore: 'pg_corrado' }],
    };
    const cl = (autore: string, testo: string) => classificaARegole({ id: 'a1', autore, testo }, ing);
    expect(cl('pg_corrado', 'I shoot Ruggero with my crossbow')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: 'light_crossbow' });
    expect(cl('pg_ida', 'I strike Ruggero')).toMatchObject({ tipo: 'attacco', bersaglio: 'png_ruggero', arma: null });
    expect(cl('pg_teo', 'I help Corrado climb')).toMatchObject({ tipo: 'aiuto', aiuta: 'x1' });
    expect(cl('pg_teo', 'I cross the river holding on to the rope')).toMatchObject({ tipo: 'prova', prova_scena: 'p_ford' });
    expect(cl('pg_ida', 'I try to persuade Bertoldo to let us through')).toMatchObject({ tipo: 'prova', abilita: 'persuasione', bersaglio: 'png_bertoldo' });
    expect(cl('pg_ida', 'I threaten Bertoldo')).toMatchObject({ tipo: 'prova', abilita: 'intimidire', bersaglio: 'png_bertoldo' });
    expect(cl('pg_teo', 'I sneak behind Ruggero without being seen')).toMatchObject({ tipo: 'contrapposta', abilita: 'furtivita', bersaglio: 'png_ruggero', abilita_bersaglio: 'percezione' });
    expect(cl('pg_ida', 'I climb the wall')).toMatchObject({ tipo: 'prova', abilita: 'atletica', bersaglio: null });
    // Sociale senza un PNG con la scheda: parlare a nessuno in particolare non tira.
    expect(cl('pg_ida', 'I try to persuade the crowd')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('pg_ida', 'I greet everyone and sit down')).toMatchObject({ tipo: 'nessuna' });
    expect(cl('pg_ida', 'I ask Bertoldo how long the thug has been here')).toMatchObject({ tipo: 'nessuna' });
  });
});

describe('nomi e frasi in inglese (SRD 5.2 in inglese)', () => {
  it('caratteristiche, abilità, difficoltà, armature, condizioni; le schede si leggono in ogni lingua', () => {
    impostaLingua('en');
    expect(NOME_ABILITA.rapidita_di_mano).toBe('Sleight of Hand');
    expect(nomeAbilita('addestrare_animali')).toBe('Animal Handling');
    expect(NOME_CARATTERISTICA.saggezza).toBe('Wisdom');
    expect(nomeDifficolta('quasi_impossibile')).toBe('nearly impossible');
    expect(comeArmatura('Studded Leather Armor')).toMatchObject({ nome: 'Studded Leather Armor', base: 12 });
    expect(comeArmatura('giaco di maglia')?.nome).toBe('Chain Shirt');
    expect(comeAbilita('Sleight of Hand')).toBe('rapidita_di_mano');
    expect(combattimentoSrd().condizioni.find((c) => c.id === 'privo_di_sensi')?.nome).toBe('Unconscious');
    expect(combattimentoSrd().azioni.map((a) => a.nome)).toEqual(['Movement', 'Action', 'Bonus Action', 'Reaction']);
    expect(etichettaProva('atletica', null)).toBe('Athletics (Strength)');
    expect(etichettaProva(null, 'carisma')).toBe('Charisma check');
    expect(etichettaSalvezza('destrezza')).toBe('Dexterity saving throw');
    expect(salute(3, 10)).toBe('is badly wounded');
    expect(tipoDanno('perforante')).toBe('piercing');
    expect(tipoDanno('fire')).toBe('fire');
    // Di nuovo in italiano: gli stessi oggetti mostrano i nomi italiani.
    impostaLingua('it');
    expect(NOME_ABILITA.rapidita_di_mano).toBe('Rapidità di mano');
    expect(comeArmatura('Studded Leather Armor')?.nome).toBe('Armatura di cuoio borchiato');
    expect(tipoDanno('perforante')).toBe('perforanti');
  });

  it('una carta d’attacco come riga di fatto', () => {
    impostaLingua('en');
    const t = {
      id: 't1', turno: 1, chi: 'pg_corrado', nome: 'Corrado', di_png: false, tipo: 'attacco' as const, etichetta: 'Light Crossbow', dadi: [19], dado: 19, vantaggio: 'svantaggio' as const, motivo_vantaggio: 'an enemy is on him',
      modificatore: 4, totale: 23, contro: { tipo: 'CA' as const, valore: 13, descrizione: null }, bersaglio: { id: 'png_ruggero', nome: 'Ruggero' }, riuscita: true, critico: false, fallimento_critico: false,
      danno: { formula: '1d8+2', dadi: [5], bonus: 2, totale: 7, tipo: 'perforante' }, a_terra: false, privata: false, avversario: null,
    };
    expect(fattoTiro(t, 'is badly wounded')).toBe('attack with Light Crossbow on Ruggero (with disadvantage: an enemy is on him): 23 against AC 13 → HIT, 7 piercing damage; Ruggero is badly wounded.');
  });

  it('un turno risolto dal Motore: carta, motivo del vantaggio e fatto in inglese', async () => {
    impostaLingua('en');
    const campagna = caricaCampagna(path.join(FIX, 'prove'));
    const schede = caricaSchede(campagna);
    const contesto = (): ContestoProve => ({ campagna, scenaPubblica: 'The ford.', narrazione: 'Ruggero bars the bridge.', versione: 1, pgAlTavolo: ['pg_ida', 'pg_corrado', 'pg_teo'], nome: (id) => campagna.pg.find((p) => p.id === id)?.nome ?? campagna.png.find((p) => p.id === id)?.nome ?? id });
    const dec: DecisioneProva = { id: 'a1', tipo: 'prova', caratteristica: null, abilita: 'persuasione', bersaglio: 'png_bertoldo', arma: null, prova_scena: null, difficolta: null, abilita_bersaglio: null, vantaggio: null, motivo: '', aiuta: null, reazione: null };
    const arbitro: ArbitroProve = { classifica: async () => ({ a1: dec }) };
    const m = new MotoreProve({ schede, arbitro, log: loggerMuto(), orologio: { ora: () => 0, adesso: () => 0, dopo: () => () => {} }, attivo: dadiAttivi(campagna, schede).attivo, conIndizi: true, contesto, dadi: new DadiACopione([14, 6]) });
    const esito = await m.risolvi(1, [{ id: 'a1', autore: 'pg_ida', testo: 'I try to persuade Bertoldo', privata: false, revisione: 0 }]);
    const carta = esito.tiri[0]!;
    expect(carta.etichetta).toBe('Persuasion (Charisma)');
    expect(carta.contro.descrizione).toBe('influence Bertoldo');
    expect(carta.motivo_vantaggio).toBe('Bertoldo is well disposed');
    expect(esito.fatti[0]).toMatch(/^\[1\] Ida Ferraro: Persuasion \(Charisma\) toward Bertoldo \(with advantage: Bertoldo is well disposed\): \d+ against DC \d+ → (SUCCESS|FAILURE)\.$/);
    expect(m.regolaEsiti()).toMatch(/^Every outcome is already decided/);
    expect(m.righePersonaggi(contesto())).toContain('PCs at the table:\n- pg_ida = Ida Ferraro · weapons: stocco');
  });

  it('arbitro Haiku: prompt e messaggio in inglese, schema con gli stessi id', () => {
    impostaLingua('en');
    expect(promptArbitroProve()).toMatch(/^You are the check arbiter of a live game of D&D 5e/);
    expect(promptArbitroProve()).toContain('rapidita_di_mano = Sleight of Hand');
    const msg = messaggioProve({ scena: '', narrazione: '', personaggi: '', proveScena: '', altre: [], azioni: [{ id: 'a1', autore: 'pg_ida', nome: 'Ida', testo: 'I climb', privata: true }] });
    expect(msg).toContain('Actions to judge:\n- id a1 · Ida (pg_ida) · PRIVATE: “I climb”');
    expect(msg).toContain('Last narration:\n(none)');
    const abilita = (SCHEMA_PROVE.properties.decisioni.items.properties.abilita as { enum: readonly string[] }).enum;
    expect(abilita).toContain('rapidita_di_mano');
    impostaLingua('it');
    expect(promptArbitroProve()).toMatch(/^Sei l'arbitro delle prove di una partita di D&D 5e/);
  });

  it('il set SRD in inglese: nomi, riassunto e passi per «Chiedi una regola»', () => {
    impostaLingua('en');
    const r = caricaRegole(path.join(FIX, 'prove'));
    expect(r.sistema.srd).toBe(true);
    expect(r.sistema.abilita.find((a) => a.id === 'furtivita')?.nome).toBe('Stealth');
    expect(r.sistema.danni.nome).toBe('Hit Points');
    expect(r.sistema.licenza.attribuzione).toMatch(/^This work includes material from the System Reference Document 5\.2/);
    expect(r.riassunto).toMatch(/^# How to play \(SRD 5\.2\)/);
    expect(cercaEstratti(r.estratti, 'How do I persuade someone?', 1).map((e) => e.titolo)).toEqual(['Influencing an NPC']);
  });
});
