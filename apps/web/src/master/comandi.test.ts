import { describe, expect, it } from 'vitest';
import type { ComandoMaster, TipoComandoMaster } from '@cantastorie/shared';
import { chiaveComando, descriviComando, ETICHETTA_COMANDO, etichettaComando, ZONA_COMANDO } from './comandi';

/** Un comando per tipo: se il contratto ne aggiunge uno, TypeScript chiede di completare qui. */
const UNO_PER_TIPO: Record<TipoComandoMaster, ComandoMaster> = {
  pausa: { tipo: 'pausa' },
  riprendi: { tipo: 'riprendi' },
  ferma_narrazione: { tipo: 'ferma_narrazione' },
  luogo: { tipo: 'luogo', luogo: 'piazza' },
  scena: { tipo: 'scena', scena: 'scena_2' },
  situazione: { tipo: 'situazione', id: 'situazione_seb_cicatrice' },
  orologio: { tipo: 'orologio', id: 'o_colpevole', passo: 1 },
  chiudi_finestra: { tipo: 'chiudi_finestra' },
  ritmo: { tipo: 'ritmo', ritmo: 'concitato' },
  salta_azione: { tipo: 'salta_azione', id_azione: 'a7' },
  nota: { tipo: 'nota', testo: 'Più ritmo', turni: 5 },
  togli_nota: { tipo: 'togli_nota', id: 'n1' },
  umore: { tipo: 'umore', umore: 'tensione' },
  effetto: { tipo: 'effetto', id: 'sfx_campana' },
  nuova_sessione: { tipo: 'nuova_sessione' },
  fine_sessione: { tipo: 'fine_sessione' },
  chiudi_sessione: { tipo: 'chiudi_sessione' },
  durata_sessione: { tipo: 'durata_sessione', ore: 2 },
  prossima_sessione: { tipo: 'prossima_sessione' },
  dispositivo: { tipo: 'dispositivo', dispositivo: 'tel-anna-0123456789', id_pg: null },
  presenza: { tipo: 'presenza', id_png: 'png_oste', presente: true },
  rivela: { tipo: 'rivela', id_png: 'png_oste' },
  combattimento_inizia: { tipo: 'combattimento_inizia' },
  combattimento_termina: { tipo: 'combattimento_termina' },
  pf: { tipo: 'pf', id: 'pg_anna', valore: 4 },
  condizione: { tipo: 'condizione', id: 'pg_anna', condizione: 'avvelenato', attiva: true },
};

describe('zone ed etichette dei comandi', () => {
  it('ogni tipo ha zona ed etichetta', () => {
    for (const tipo of Object.keys(UNO_PER_TIPO) as TipoComandoMaster[]) {
      expect(ZONA_COMANDO[tipo]).toBeTruthy();
      expect(ETICHETTA_COMANDO[tipo]).toBeTruthy();
    }
  });
  it('i tre comandi principali stanno nei controlli in alto', () => {
    expect(ZONA_COMANDO.pausa).toBe('controlli');
    expect(ZONA_COMANDO.riprendi).toBe('controlli');
    expect(ZONA_COMANDO.ferma_narrazione).toBe('controlli');
    expect(ZONA_COMANDO.salta_azione).toBe('azioni');
  });
  it('un tipo sconosciuto (server più nuovo) si mostra così com’è', () => {
    expect(etichettaComando('ferma_narrazione')).toBe('Ferma la narrazione');
    expect(etichettaComando('teletrasporto')).toBe('teletrasporto');
  });
});

describe('chiaveComando', () => {
  it('distingue i pulsanti che possono lavorare insieme', () => {
    expect(chiaveComando({ tipo: 'orologio', id: 'a', passo: 1 })).not.toBe(chiaveComando({ tipo: 'orologio', id: 'b', passo: 1 }));
    expect(chiaveComando(UNO_PER_TIPO.salta_azione)).toBe('salta_azione:a7');
    expect(chiaveComando(UNO_PER_TIPO.luogo)).toBe('luogo:piazza');
  });
  it('+1 e −1 sullo stesso orologio condividono la chiave (non si accavallano)', () => {
    expect(chiaveComando({ tipo: 'orologio', id: 'a', passo: 1 })).toBe(chiaveComando({ tipo: 'orologio', id: 'a', passo: -1 }));
  });
  it('mostrare e togliere una situazione condividono la chiave', () => {
    expect(chiaveComando({ tipo: 'situazione', id: 'x' })).toBe(chiaveComando({ tipo: 'situazione', id: null }));
  });
});

describe('comandi dell’audio', () => {
  it('zona audio; un umore alla volta, effetti diversi indipendenti', () => {
    expect(ZONA_COMANDO.umore).toBe('audio');
    expect(ZONA_COMANDO.effetto).toBe('audio');
    expect(chiaveComando({ tipo: 'umore', umore: 'tensione' })).toBe(chiaveComando({ tipo: 'umore', umore: null }));
    expect(chiaveComando({ tipo: 'effetto', id: 'sfx_campana' })).not.toBe(chiaveComando({ tipo: 'effetto', id: 'sfx_porta' }));
    expect(descriviComando({ tipo: 'umore', umore: null })).toBe('Umore della musica: auto');
    expect(descriviComando({ tipo: 'effetto', id: 'sfx_campana' })).toBe('Effetto sonoro: sfx_campana');
  });
});

describe('descriviComando', () => {
  it('riassume con gli id', () => {
    expect(descriviComando({ tipo: 'orologio', id: 'o_colpevole', passo: 1 })).toBe('Orologio o_colpevole +1');
    expect(descriviComando({ tipo: 'orologio', id: 'o_colpevole', passo: -1 })).toBe('Orologio o_colpevole −1');
    expect(descriviComando({ tipo: 'situazione', id: null })).toBe('Togli l’immagine di situazione');
    expect(descriviComando({ tipo: 'nota', testo: 'x', turni: 1 })).toBe('Nota di regia (1 turno)');
    expect(descriviComando({ tipo: 'nota', testo: 'x', turni: 15 })).toBe('Nota di regia (15 turni)');
    expect(descriviComando({ tipo: 'pausa' })).toBe('Pausa');
  });
  it('riassume i punti ferita e le condizioni del combattimento', () => {
    expect(descriviComando({ tipo: 'pf', id: 'pg_anna', valore: 4 })).toBe('pg_anna: PF 4');
    expect(descriviComando({ tipo: 'condizione', id: 'pg_anna', condizione: 'avvelenato', attiva: true })).toBe('Condizione pg_anna: avvelenato messa');
    expect(descriviComando({ tipo: 'condizione', id: 'pg_anna', condizione: 'avvelenato', attiva: false })).toBe('Condizione pg_anna: avvelenato tolta');
  });
  it('le condizioni della stessa scheda hanno chiavi diverse; i PF della stessa scheda condividono la chiave', () => {
    expect(chiaveComando({ tipo: 'condizione', id: 'a', condizione: 'x', attiva: true })).not.toBe(chiaveComando({ tipo: 'condizione', id: 'a', condizione: 'y', attiva: true }));
    expect(chiaveComando({ tipo: 'pf', id: 'a', valore: 1 })).toBe(chiaveComando({ tipo: 'pf', id: 'a', valore: 2 }));
  });
});
