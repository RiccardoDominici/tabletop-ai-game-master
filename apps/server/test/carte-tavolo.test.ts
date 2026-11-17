import { describe, expect, it } from 'vitest';
import { carteDelTavolo, conCarte, righeLogDelServer } from '../src/esperimenti/carte-tavolo';

const prima = '2026-11-18T10:00:00.000Z';
const dopo = '2026-11-18T10:05:00.000Z';
const riga = (time: string, turno: number, tavolo: string[] | undefined, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ msg: 'prove: tiri del turno', time, turno, ...(tavolo ? { tavolo } : {}), ...extra });

describe('carte del tavolo nell’harness (A32)', () => {
  it('prende le carte pubbliche del log dopo l’inizio dell’esecuzione, per turno', () => {
    const log = [
      riga(prima, 1, ['Ada: Forza 12, riuscita']),          // di un’esecuzione precedente: fuori
      riga(dopo, 1, ['Ada: Forza 12, riuscita']),
      riga(dopo, 2, ['Bruno: Destrezza 4, fallita']),
      riga(dopo, 2, undefined, { tiri: ['Bruno: Destrezza 4 contro CD 12, fallita'] }), // senza `tavolo`: niente carte
      JSON.stringify({ msg: 'altro evento', time: dopo, turno: 2, tavolo: ['non è un tiro'] }),
    ];
    const carte = carteDelTavolo(righeLogDelServer(log.join('\n')), '2026-11-18T10:01:00.000Z');
    expect(carte.get(1)).toEqual(['Ada: Forza 12, riuscita']);
    expect(carte.get(2)).toEqual(['Bruno: Destrezza 4, fallita']);
  });

  it('non porta nel tavolo il numero da battere del campo tiri', () => {
    const carte = carteDelTavolo(righeLogDelServer(riga(dopo, 3, undefined, { tiri: ['Ada: Forza 12 contro CD 15, fallita'] })), prima);
    expect(carte.size).toBe(0);
  });

  it('inserisce la riga delle carte in fondo al blocco del turno, e non tocca gli altri', () => {
    const tavolo = '# Al tavolo\n\n## Apertura\n\nIl narratore parla.\n\n## Turno 1\n\nAda agisce.\n\n## Turno 2\n\nBruno esita.\n';
    const out = conCarte(tavolo, new Map([[1, ['Ada: Forza 12, riuscita', 'Ada: Forza 9, fallita']]]));
    expect(out).toContain('Ada agisce.\n\n*Carte dei dadi sul proiettore:* Ada: Forza 12, riuscita · Ada: Forza 9, fallita\n\n## Turno 2');
    expect(out).not.toContain('Bruno esita.\n\n*Carte');
    expect(out.startsWith('# Al tavolo')).toBe(true);
  });

  it('salta le righe del log che non sono JSON', () => {
    const righe = righeLogDelServer(`${riga(dopo, 1, ['Ada: Forza 12, riuscita'])}\n{non json\n\n`);
    expect(righe).toHaveLength(1);
  });
});
