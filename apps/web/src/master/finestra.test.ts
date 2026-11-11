import { describe, expect, it } from 'vitest';
import type { FinestraPubblica, PgPubblico } from '@tabletop-ai-gm/shared';
import { righeInvitati } from './finestra';

const pg: PgPubblico[] = [
  { id: 'ginestra', nome: 'Ginestra', descrizione: '', telefoni: 1 },
  { id: 'corrado', nome: 'Corrado', descrizione: '', telefoni: 1 },
  { id: 'bruno', nome: 'Bruno', descrizione: '', telefoni: 0 },
];

function finestra(parziale: Partial<FinestraPubblica>): FinestraPubblica {
  return { aperta: true, turno: 2, invitati: [], azioni: [], aspettiamo: [], chiusura_prevista_ms: null, ...parziale };
}

describe('righeInvitati', () => {
  it('invitati con «ha inviato» sì/no, poi chi ha scritto senza invito', () => {
    const righe = righeInvitati({
      pg,
      finestra: finestra({
        invitati: ['ginestra', 'corrado'],
        azioni: [
          { id_pg: 'corrado', scritta: true },
          { id_pg: 'bruno', scritta: true },
        ],
      }),
    });
    expect(righe).toEqual([
      { id_pg: 'ginestra', nome: 'Ginestra', invitato: true, scritta: false },
      { id_pg: 'corrado', nome: 'Corrado', invitato: true, scritta: true },
      { id_pg: 'bruno', nome: 'Bruno', invitato: false, scritta: true },
    ]);
  });
  it('«tutti» si espande in tutti i PG', () => {
    const righe = righeInvitati({ pg, finestra: finestra({ invitati: ['tutti'] }) });
    expect(righe.map((r) => r.id_pg)).toEqual(['ginestra', 'corrado', 'bruno']);
    expect(righe.every((r) => r.invitato)).toBe(true);
  });
  it('un id sconosciuto si mostra come id; niente doppioni', () => {
    const righe = righeInvitati({ pg, finestra: finestra({ invitati: ['zeta', 'zeta'] }) });
    expect(righe).toEqual([{ id_pg: 'zeta', nome: 'zeta', invitato: true, scritta: false }]);
  });
});
