/**
 * DEBUG — dati finti per il banco di prova delle carte dei tiri (ProvaCarte.tsx). Non li usa mai
 * la partita vera: servono a vedere le carte senza server (/schermo?carte=prova, /telefono?carte=prova).
 *
 * Gli esempi coprono i casi della carta: prova con vantaggio riuscita, salvezza fallita, colpo
 * critico di balestra con danno e «a terra», attacco di un PNG mancato, contrapposta tra due PG
 * finita pari, prova privata, 1 naturale di un PNG, prova con svantaggio e modificatore negativo.
 * In coda, i set di regole non SRD: 2d6 a fasce (parziale, fallimento) e sotto soglia (d100, d20).
 */
import type {
  AzionePrivata,
  CombattimentoPubblico,
  InfoServer,
  PgPubblico,
  StatoTavolo,
  TiroMostrato,
  VoceTrascrizione,
} from '@cantastorie/shared';

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
    // Set di regole non SRD: 2d6 a fasce (PbtA) e tiro sotto soglia (d100 e d20).
    carta({
      id: `${prefisso}-fasce-parziale`,
      chi: 'arianna',
      nome: 'Arianna',
      tipo: 'prova',
      etichetta: '2d6 + Fascino',
      bersaglio: { id: 'bran', nome: 'Bran' },
      risoluzione: '2d6_fasce',
      facce: 6,
      dadi: [4, 3],
      dado: 7,
      modificatore: 1,
      totale: 8,
      contro: { tipo: 'fasce', valore: 7, descrizione: '7–9' },
      grado: { id: 'parziale', nome: 'Successo con un costo' },
      regola: '2d6+Fascino: 7–9, successo con un costo',
      riuscita: true,
    }),
    carta({
      id: `${prefisso}-fasce-fallimento`,
      chi: 'corrado',
      nome: 'Corrado',
      tipo: 'prova',
      etichetta: '2d6 + Carisma',
      risoluzione: '2d6_fasce',
      facce: 6,
      dadi: [2, 3],
      dado: 5,
      modificatore: 1,
      totale: 6,
      contro: { tipo: 'fasce', valore: 7, descrizione: '6-' },
      grado: { id: 'fallimento', nome: 'Fallimento: la scena si complica' },
      regola: '2d6+Carisma: 6-, fallimento',
      riuscita: false,
    }),
    carta({
      id: `${prefisso}-sotto-successo`,
      chi: 'arianna',
      nome: 'Arianna',
      tipo: 'prova',
      etichetta: 'Persuasione',
      bersaglio: { id: 'bran', nome: 'Bran' },
      risoluzione: 'sotto_soglia',
      facce: 100,
      dadi: [23],
      dado: 23,
      modificatore: 0,
      totale: 23,
      contro: { tipo: 'soglia', valore: 45, descrizione: null },
      grado: { id: 'successo', nome: 'Successo difficile' },
      regola: 'Persuasione 45%: difficile, serve 22 o meno',
      riuscita: true,
    }),
    carta({
      id: `${prefisso}-sotto-fallimento`,
      chi: 'corrado',
      nome: 'Corrado',
      tipo: 'prova',
      etichetta: 'Muoversi in silenzio (Destrezza)',
      risoluzione: 'sotto_soglia',
      facce: 20,
      dadi: [14],
      dado: 14,
      modificatore: 0,
      totale: 14,
      contro: { tipo: 'soglia', valore: 11, descrizione: null },
      grado: { id: 'fallimento', nome: 'Fallimento' },
      regola: 'Furtività d20: tiro sotto la soglia della scheda',
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
  /** Lo scontro in corso (barra del proiettore, riquadro del telefono); assente = nessuno. */
  combattimento?: CombattimentoPubblico | null;
  /** I PG del tavolo; assenti = i tre di sempre (Arianna, Corrado, Bianca). */
  pg?: PgPubblico[];
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
    pg: opzioni.pg ?? [
      { id: 'arianna', nome: 'Arianna Valsecca', descrizione: 'mezzelfa, barda', telefoni: 1, pf: opzioni.pf === undefined ? { attuali: 5, massimi: 12 } : opzioni.pf },
      { id: 'corrado', nome: 'Corrado', descrizione: 'umano, guerriero', telefoni: 1, pf: { attuali: 14, massimi: 14 } },
      { id: 'bianca', nome: 'Bianca', descrizione: 'halfling, ladra', telefoni: 1, pf: { attuali: 0, massimi: 9 } },
    ],
    combattimento: opzioni.combattimento ?? null,
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
    lingua: { interfaccia: 'it', contenuti: 'it' },
    ora_server_ms: Date.now(),
    dadi: true,
    tiri: opzioni.tiri,
  };
}

/**
 * Lo scontro del banco di prova, round 2: Ida di turno (PG, pieno), Ruggero (PNG, ferito, prono),
 * Corrado (PG a 0 PF, a terra, con i tiri contro la morte), Bertoldo (PNG fuggito).
 */
export function combattimentoEsempio(): CombattimentoPubblico {
  return {
    round: 2,
    fase: null,
    iniziativa: 'individuale',
    combattenti: [
      { id: 'ida', nome: 'Ida', di_png: false, iniziativa: 18, corrente: true, pf: { attuali: 9, massimi: 9 }, condizioni: [], stato: 'in_gioco', tiri_morte: null },
      {
        id: 'ruggero',
        nome: 'Ruggero',
        di_png: true,
        iniziativa: 15,
        corrente: false,
        pf: { attuali: 3, massimi: 11 },
        condizioni: [{ id: 'prono', nome: 'Prono', icona: '⬇' }],
        stato: 'in_gioco',
        tiri_morte: null,
      },
      {
        id: 'corrado',
        nome: 'Corrado',
        di_png: false,
        iniziativa: 12,
        corrente: false,
        pf: { attuali: 0, massimi: 12 },
        condizioni: [{ id: 'privo_di_sensi', nome: 'Privo di sensi', icona: '💤' }],
        stato: 'a_terra',
        tiri_morte: { successi: 1, fallimenti: 2 },
      },
      { id: 'bertoldo', nome: 'Bertoldo', di_png: true, iniziativa: 9, corrente: false, pf: null, condizioni: [], stato: 'fuggito', tiri_morte: null },
    ],
    turno_di: ['ida'],
    azioni: [
      { nome: 'Azione', quante: 'una' },
      { nome: 'Movimento', quante: 'fino alla tua Velocità' },
    ],
  };
}

/** I PG dello scontro (Ida e Corrado con i PF del combattimento), per il telefono del banco di prova. */
export const PG_COMBATTIMENTO: PgPubblico[] = [
  { id: 'ida', nome: 'Ida', descrizione: 'umana, ladra', telefoni: 1, pf: { attuali: 9, massimi: 9 } },
  { id: 'corrado', nome: 'Corrado', descrizione: 'umano, guerriero', telefoni: 1, pf: { attuali: 0, massimi: 12 } },
];

/** La mia azione finta: risolta, con una carta pubblica e una privata (per il PG `idPg`). */
export function azioneEsempio(tiri: TiroMostrato[], idPg = 'arianna'): AzionePrivata {
  return {
    id: 'azione-prova',
    id_pg: idPg,
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
