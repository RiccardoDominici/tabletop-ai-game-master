/**
 * DEBUG — dati finti per il banco di prova delle carte dei tiri (ProvaCarte.tsx). Non li usa mai
 * la partita vera: servono a vedere le carte senza server (/schermo?carte=prova, /telefono?carte=prova).
 *
 * Gli esempi coprono i casi della carta: prova con vantaggio riuscita, salvezza fallita, colpo
 * critico di balestra con danno e «a terra», attacco di un PNG mancato, contrapposta tra due PG
 * finita pari, prova privata, 1 naturale di un PNG, prova con svantaggio e modificatore negativo.
 */
import type { AzionePrivata, InfoServer, StatoTavolo, TiroMostrato, VoceTrascrizione } from '@cantastorie/shared';

export const TURNO_ESEMPIO = 3;

/** Una carta con i campi più comuni già messi; `id` e il resto li dà ogni esempio. */
function carta(parziale: Partial<TiroMostrato> & Pick<TiroMostrato, 'id' | 'nome' | 'etichetta'>): TiroMostrato {
  return {
    turno: TURNO_ESEMPIO,
    chi: parziale.nome.toLowerCase(),
    di_png: false,
    tipo: 'prova',
    dadi: [10],
    dado: 10,
    vantaggio: null,
    motivo_vantaggio: null,
    modificatore: 0,
    totale: 10,
    contro: { tipo: 'CD', valore: 10, descrizione: null },
    bersaglio: null,
    riuscita: true,
    critico: false,
    fallimento_critico: false,
    danno: null,
    a_terra: false,
    privata: false,
    avversario: null,
    ...parziale,
  };
}

/** Le carte d'esempio, nell'ordine in cui le manderebbe il Motore. `prefisso` cambia gli id (animazioni indipendenti). */
export function carteEsempio(prefisso = 'prova'): TiroMostrato[] {
  return [
    carta({
      id: `${prefisso}-persuasione`,
      chi: 'arianna',
      nome: 'Arianna',
      etichetta: 'Persuasione (Carisma)',
      bersaglio: { id: 'bran', nome: 'Bran' },
      dadi: [17, 9],
      dado: 17,
      vantaggio: 'vantaggio',
      motivo_vantaggio: 'Corrado la aiuta',
      modificatore: 5,
      totale: 22,
      contro: { tipo: 'CD', valore: 15, descrizione: 'Bran diffida dei forestieri' },
      riuscita: true,
    }),
    carta({
      id: `${prefisso}-salvezza`,
      chi: 'corrado',
      nome: 'Corrado',
      tipo: 'salvezza',
      etichetta: 'Tiro salvezza su Destrezza',
      dadi: [6],
      dado: 6,
      modificatore: 1,
      totale: 7,
      contro: { tipo: 'CD', valore: 13, descrizione: 'la trave che crolla' },
      riuscita: false,
    }),
    carta({
      id: `${prefisso}-balestra`,
      chi: 'bianca',
      nome: 'Bianca',
      tipo: 'attacco',
      etichetta: 'Balestra leggera',
      bersaglio: { id: 'goblin_1', nome: 'il goblin' },
      dadi: [20],
      dado: 20,
      modificatore: 5,
      totale: 25,
      contro: { tipo: 'CA', valore: 13, descrizione: null },
      riuscita: true,
      critico: true,
      danno: { formula: '2d8+3', dadi: [6, 4], bonus: 3, totale: 13, tipo: 'perforante' },
      a_terra: true,
    }),
    carta({
      id: `${prefisso}-scimitarra`,
      chi: 'capo_goblin',
      nome: 'Il capo goblin',
      di_png: true,
      tipo: 'attacco',
      etichetta: 'Scimitarra',
      bersaglio: { id: 'corrado', nome: 'Corrado' },
      dadi: [8],
      dado: 8,
      modificatore: 4,
      totale: 12,
      contro: { tipo: 'CA', valore: 16, descrizione: null },
      riuscita: false,
    }),
    carta({
      id: `${prefisso}-contrapposta`,
      chi: 'corrado',
      nome: 'Corrado',
      tipo: 'contrapposta',
      etichetta: 'Atletica (Forza)',
      bersaglio: { id: 'bianca', nome: 'Bianca' },
      dadi: [12],
      dado: 12,
      modificatore: 3,
      totale: 15,
      contro: { tipo: 'CD', valore: 15, descrizione: null },
      riuscita: false,
      avversario: { nome: 'Bianca', etichetta: 'Acrobazia (Destrezza)', dadi: [11], dado: 11, modificatore: 4, totale: 15 },
    }),
    carta({
      id: `${prefisso}-privata`,
      chi: 'arianna',
      nome: 'Arianna',
      etichetta: 'Rapidità di mano (Destrezza)',
      dadi: [14],
      dado: 14,
      modificatore: 7,
      totale: 21,
      contro: { tipo: 'CD', valore: 15, descrizione: 'la tasca del mercante' },
      riuscita: true,
      privata: true,
    }),
    carta({
      id: `${prefisso}-morso`,
      chi: 'lupo',
      nome: 'Il lupo',
      di_png: true,
      tipo: 'attacco',
      etichetta: 'Morso',
      bersaglio: { id: 'arianna', nome: 'Arianna' },
      dadi: [1],
      dado: 1,
      modificatore: 4,
      totale: 5,
      contro: { tipo: 'CA', valore: 14, descrizione: null },
      riuscita: false,
      fallimento_critico: true,
    }),
    carta({
      id: `${prefisso}-percezione`,
      chi: 'corrado',
      nome: 'Corrado',
      etichetta: 'Percezione (Saggezza)',
      dadi: [15, 4],
      dado: 4,
      vantaggio: 'svantaggio',
      motivo_vantaggio: 'buio fitto',
      modificatore: -1,
      totale: 3,
      contro: { tipo: 'CD', valore: 12, descrizione: null },
      riuscita: false,
    }),
  ];
}

/** Ordine delle carte pubbliche d'esempio per un turno «grande» (al massimo 4). */
export const ID_GRANDI = ['persuasione', 'salvezza', 'balestra', 'scimitarra'];

export type FaseProva = 'narrazione' | 'dopo';

const VOCI: VoceTrascrizione[] = [
  { id: 1, turno: 2, tipo: 'narrazione', chi: 'narratore', nome: 'Narratore', testo: 'La casera è buia; dal fienile arriva un rumore di passi.' },
  { id: 2, turno: 3, tipo: 'azione', chi: 'arianna', nome: 'Arianna', testo: 'Convinco Bran a farci entrare: siamo amici di Ettore.' },
  { id: 3, turno: 3, tipo: 'azione', chi: 'bianca', nome: 'Bianca', testo: 'Tiro con la balestra al goblin sul tetto.' },
  { id: 4, turno: 3, tipo: 'narrazione', chi: 'narratore', nome: 'Narratore', testo: 'Il dardo parte con un sibilo secco.' },
];

/** Uno StatoTavolo finto col turno 3 in narrazione (o con la finestra del turno 4 già aperta). */
export function statoEsempio(opzioni: {
  fase: FaseProva;
  tiri: TiroMostrato[];
  pf?: { attuali: number; massimi: number } | null;
  immagine?: string | null;
  ritratti?: Record<string, string>;
}): StatoTavolo {
  const dopo = opzioni.fase === 'dopo';
  const turno = dopo ? TURNO_ESEMPIO + 1 : TURNO_ESEMPIO;
  return {
    versione_stato: 1,
    versione_scena: 1,
    fase: dopo ? 'finestra' : 'narrazione',
    turno,
    scena: {
      id_campagna: 'prova',
      titolo: 'La casera sotto la neve',
      umore: 'tensione',
      intensita: 3,
      luogo: 'casera',
      immagine: opzioni.immagine ?? null,
      ritratti: opzioni.ritratti ?? {},
      situazione: null,
      prossime: [],
      // La fila dei ritratti dei PNG in scena (FilaPersonaggi), per vedere che le carte non la coprono.
      personaggi: [
        { id: 'bran', nome: 'Bran', ritratto: opzioni.ritratti?.bran ?? null, presente: true },
        { id: 'capo_goblin', nome: 'Capo goblin', ritratto: null, presente: true },
        { id: 'lupo', nome: 'Lupo', ritratto: null, presente: true },
      ],
    },
    pg: [
      { id: 'arianna', nome: 'Arianna Valsecca', descrizione: 'mezzelfa, barda', telefoni: 1, pf: opzioni.pf === undefined ? { attuali: 5, massimi: 12 } : opzioni.pf },
      { id: 'corrado', nome: 'Corrado', descrizione: 'umano, guerriero', telefoni: 1, pf: { attuali: 14, massimi: 14 } },
      { id: 'bianca', nome: 'Bianca', descrizione: 'halfling, ladra', telefoni: 1, pf: { attuali: 0, massimi: 9 } },
    ],
    finestra: {
      aperta: dopo,
      turno,
      invitati: dopo ? ['arianna', 'corrado', 'bianca'] : [],
      azioni: [],
      aspettiamo: dopo ? ['Arianna', 'Corrado', 'Bianca'] : [],
      chiusura_prevista_ms: null,
    },
    al_tavolo: [],
    trascrizione: VOCI,
    voce_motore: 'mock',
    schermo_connesso: true,
    ritmo: 'calmo',
    ora_server_ms: Date.now(),
    dadi: true,
    tiri: opzioni.tiri,
  };
}

/** La mia azione finta (Arianna): risolta, con una carta pubblica e una privata. */
export function azioneEsempio(tiri: TiroMostrato[]): AzionePrivata {
  return {
    id: 'azione-prova',
    id_pg: 'arianna',
    testo: 'Convinco Bran a farci entrare e intanto gli sfilo la chiave dalla tasca.',
    privata: false,
    stato: 'risolta',
    motivo: null,
    richiesta: null,
    versione_vista: 1,
    turno: TURNO_ESEMPIO,
    inviata_alle: Date.now() - 30_000,
    tiri,
  };
}

/** Un QR finto (scacchiera): serve solo a vedere dove sta nel layout. */
const QR_FINTO = (() => {
  const celle: string[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) if ((x * 7 + y * 3 + x * y) % 3 === 0) celle.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21">${celle.join('')}</svg>`;
})();

export const INFO_ESEMPIO: InfoServer = {
  url_telefono: 'http://192.168.1.20:4610/telefono',
  url_schermo: 'http://192.168.1.20:4610/schermo',
  ip_lan: '192.168.1.20',
  porta: 4610,
  qr_svg: QR_FINTO,
};
