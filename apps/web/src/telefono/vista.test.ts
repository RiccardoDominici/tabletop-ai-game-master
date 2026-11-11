import { describe, expect, it } from 'vitest';
import type { AzionePrivata, StatoTavolo } from '@tabletop-ai-gm/shared';
import {
  altriAlTavolo,
  azioneDellaFinestra,
  azioneViva,
  bannerTelefono,
  chiaveRichiesta,
  conChi,
  daRiscrivere,
  etichettaInvio,
  hoInviato,
  motivoDaMostrare,
  narratoreAlLavoro,
  perProssimoTurno,
  possoScrivere,
  sonoInvitato,
} from './vista';

function stato(parziale: Partial<StatoTavolo> = {}): StatoTavolo {
  return {
    versione_stato: 1,
    versione_scena: 1,
    fase: 'finestra',
    turno: 1,
    scena: { id_campagna: 'prova', titolo: 'Prova', umore: 'mistero', intensita: 2, luogo: 'scena_prova', immagine: null, ritratti: {}, situazione: null, prossime: [] },
    pg: [],
    finestra: {
      aperta: true,
      turno: 2,
      invitati: ['aldo', 'bea'],
      azioni: [
        { id_pg: 'aldo', scritta: true },
        { id_pg: 'bea', scritta: false },
      ],
      aspettiamo: ['bea'],
      chiusura_prevista_ms: null,
    },
    trascrizione: [],
    voce_motore: 'mock',
    schermo_connesso: true,
    ritmo: 'calmo',
    lingua: { interfaccia: 'it', contenuti: 'it' },
    ora_server_ms: 1_700_000_000_000,
    al_tavolo: [],
    ...parziale,
  };
}

function azione(parziale: Partial<AzionePrivata> = {}): AzionePrivata {
  return {
    id: 'a1',
    id_pg: 'aldo',
    testo: 'Apro la botola',
    privata: false,
    stato: 'in_coda',
    motivo: null,
    richiesta: null,
    versione_vista: 1,
    turno: 2,
    inviata_alle: 0,
    ...parziale,
  };
}

const mia = azione();

describe('vista del telefono: permessi', () => {
  it('invito esplicito e «tutti»', () => {
    const s = stato();
    expect(sonoInvitato(s.finestra, 'aldo')).toBe(true);
    expect(sonoInvitato(s.finestra, 'cosimo')).toBe(false);
    expect(sonoInvitato(s.finestra, null)).toBe(false);
    expect(sonoInvitato({ ...s.finestra, invitati: ['tutti'] }, 'cosimo')).toBe(true);
  });

  it('si scrive sempre a scena in corso, anche non invitati o mentre il narratore parla', () => {
    expect(possoScrivere(stato(), 'cosimo')).toBe(true);
    expect(possoScrivere(stato({ fase: 'narrazione' }), 'aldo')).toBe(true);
    expect(possoScrivere(stato({ fase: 'apertura' }), 'aldo')).toBe(true);
    expect(possoScrivere(stato({ fase: 'attesa' }), 'aldo')).toBe(false);
    expect(possoScrivere(stato({ fase: 'fermata' }), 'aldo')).toBe(false);
    expect(possoScrivere(stato(), null)).toBe(false);
  });

  it('inviare = ho finito: fa fede il riepilogo pubblico, solo a finestra aperta', () => {
    expect(hoInviato(stato(), 'aldo')).toBe(true);
    expect(hoInviato(stato(), 'bea')).toBe(false);
    expect(hoInviato(stato({ fase: 'narrazione' }), 'aldo')).toBe(false);
    expect(hoInviato(stato(), null)).toBe(false);
  });

  it('il narratore al lavoro: «prepara» finché del turno non è arrivato niente, poi «racconta»', () => {
    expect(narratoreAlLavoro(stato())).toBeNull();
    expect(narratoreAlLavoro(stato({ fase: 'narrazione' }))).toBe('prepara');
    const voce = { id: 1, turno: 1, tipo: 'narrazione' as const, chi: 'narratore', nome: 'Narratore', testo: 'La porta cede.' };
    expect(narratoreAlLavoro(stato({ fase: 'narrazione', trascrizione: [voce] }))).toBe('racconta');
    const chiudendo = stato();
    chiudendo.finestra.aperta = false;
    expect(narratoreAlLavoro(chiudendo)).toBe('prepara');
  });

  it('un’azione di un turno passato non vale per la finestra corrente', () => {
    expect(azioneDellaFinestra(stato(), mia)).toBe(mia);
    expect(azioneDellaFinestra(stato(), { ...mia, turno: 1 })).toBeNull();
    expect(azioneDellaFinestra(stato(), null)).toBeNull();
  });
});

describe('vista del telefono: la mia azione', () => {
  it('viva = in coda o da decidere; superata e sospesa si riscrivono', () => {
    expect(azioneViva(azione())).toBe(true);
    expect(azioneViva(azione({ stato: 'da_confermare' }))).toBe(true);
    expect(azioneViva(azione({ stato: 'chiusa' }))).toBe(false);
    expect(azioneViva(null)).toBe(false);
    expect(daRiscrivere(azione({ stato: 'superata' }))).toBe(true);
    expect(daRiscrivere(azione({ stato: 'sospesa' }))).toBe(true);
    expect(daRiscrivere(azione({ stato: 'ritirata' }))).toBe(false);
  });

  it('scritta mentre il narratore parla → aspetta il prossimo turno', () => {
    const narrazione = stato({ fase: 'narrazione' });
    narrazione.finestra = { ...narrazione.finestra, aperta: false, turno: 2 };
    expect(perProssimoTurno(narrazione, azione({ turno: 3 }))).toBe(true);
    expect(perProssimoTurno(stato(), azione({ turno: 2 }))).toBe(false);
    // Inviata mentre la finestra si chiudeva: è già per la successiva.
    expect(perProssimoTurno(stato(), azione({ turno: 3 }))).toBe(true);
    // Un'azione chiusa non «aspetta» nulla.
    expect(perProssimoTurno(narrazione, azione({ turno: 3, stato: 'chiusa' }))).toBe(false);
  });

  it('il motivo si mostra solo dove spiega lo stato', () => {
    expect(motivoDaMostrare(azione({ stato: 'superata', motivo: 'La grata è crollata.' }))).toBe('La grata è crollata.');
    expect(motivoDaMostrare(azione({ stato: 'sospesa', motivo: 'Tempo finito.' }))).toBe('Tempo finito.');
    // Dopo «Confermo» il server può lasciare il vecchio motivo: in coda non si mostra.
    expect(motivoDaMostrare(azione({ stato: 'in_coda', motivo: 'Ginestra ha ritirato…' }))).toBeNull();
    expect(motivoDaMostrare(azione({ stato: 'superata', motivo: null }))).toBeNull();
  });

  it('etichetta del pulsante d’invio', () => {
    expect(etichettaInvio(null, 'qualcosa')).toBe('Invia');
    expect(etichettaInvio(azione(), 'Apro la botola')).toBe('Aggiorna');
    expect(etichettaInvio(azione({ stato: 'da_confermare' }), 'altro')).toBe('Aggiorna');
    expect(etichettaInvio(azione({ stato: 'superata' }), ' Apro la botola ')).toBe('Invia di nuovo');
    expect(etichettaInvio(azione({ stato: 'superata' }), 'Scendo invece le scale')).toBe('Invia');
    expect(etichettaInvio(azione({ stato: 'risolta' }), 'Apro la botola')).toBe('Invia');
  });

  it('chiave della richiesta: cambia con una richiesta nuova', () => {
    const richiesta = { tipo: 'dipendenza' as const, testo: 'Ginestra ha ritirato…', conferma: 'Confermo' as const, consigliato: 'cambio' as const, scadenza_ms: null };
    const a = azione({ stato: 'da_confermare', richiesta });
    expect(chiaveRichiesta(a)).toBe('a1|dipendenza|Ginestra ha ritirato…');
    expect(chiaveRichiesta({ ...a, richiesta: { ...richiesta, scadenza_ms: 123 } })).toBe(chiaveRichiesta(a));
    expect(chiaveRichiesta({ ...a, richiesta: { ...richiesta, testo: 'Altro fatto' } })).not.toBe(chiaveRichiesta(a));
    expect(chiaveRichiesta(azione())).toBeNull();
  });
});

describe('vista del telefono: al tavolo e banner', () => {
  it('«Al tavolo» toglie la mia azione', () => {
    const s = stato({
      al_tavolo: [
        { id: 'a1', id_pg: 'aldo', nome: 'Aldo', testo: 'Apro la botola', stato: 'in_coda', dipende_da: [], turno: 2 },
        { id: 'a2', id_pg: 'bea', nome: 'Bea', testo: 'Anch’io', stato: 'da_confermare', dipende_da: ['Aldo'], turno: 2 },
      ],
    });
    expect(altriAlTavolo(s, 'aldo').map((a) => a.id)).toEqual(['a2']);
    expect(altriAlTavolo(s, null)).toHaveLength(2);
  });

  it('«con …» per le azioni collegate', () => {
    expect(conChi([])).toBeNull();
    expect(conChi(['Ginestra Valli'])).toBe('con Ginestra');
    expect(conChi(['Ginestra', 'Corrado', 'Ginestra'])).toBe('con Ginestra e Corrado');
  });

  it('banner per ogni fase', () => {
    expect(bannerTelefono(stato({ fase: 'attesa' }), 'aldo').tipo).toBe('attesa');
    expect(bannerTelefono(stato({ fase: 'apertura' }), 'aldo').tipo).toBe('narratore');
    const narra = bannerTelefono(stato({ fase: 'narrazione' }), 'aldo');
    expect(narra.titolo).toBe('Il narratore sta preparando…');
    expect(narra.dettaglio).toMatch(/Puoi già scrivere/);
    expect(bannerTelefono(stato({ fase: 'fermata' }), 'aldo').tipo).toBe('fermata');
    const altro = bannerTelefono(stato(), 'cosimo');
    expect(altro.tipo).toBe('non_chiamato');
    expect(altro.titolo).toMatch(/non sei chiamato/);
    expect(altro.dettaglio).toMatch(/Puoi scrivere lo stesso/);
    expect(bannerTelefono(stato(), 'bea')).toMatchObject({ tipo: 'tocca_a_te', titolo: 'Tocca a te: cosa fai?', dettaglio: null, scadenzaMs: null });
    expect(bannerTelefono(stato(), 'aldo')).toMatchObject({ tipo: 'inviata', titolo: 'Azione inviata' });
  });

  it('il conto alla rovescia arriva nel banner solo al ritmo concitato', () => {
    const s = stato({ ritmo: 'concitato' });
    s.finestra.chiusura_prevista_ms = 123_456;
    expect(bannerTelefono(s, 'bea')).toMatchObject({ scadenzaMs: 123_456, dettaglio: expect.stringMatching(/di corsa/) });
    expect(bannerTelefono(s, 'cosimo').scadenzaMs).toBe(123_456);
  });
});

describe('pausa', () => {
  it('la mette solo il master: si può scrivere, l’azione entra alla ripresa', () => {
    const b = bannerTelefono(stato({ fase: 'pausa' }), 'pg_a');
    expect(b).toMatchObject({ tipo: 'pausa', titolo: 'Tavolo in pausa' });
    expect(b.dettaglio).toMatch(/master/);
  });
});
