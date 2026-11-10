/**
 * Dizionario «comune» dell'interfaccia, lingua en (docs/lingue.md). Chiavi piatte «comune.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/comune.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const comune = {
  /** Congiunzione dell'ultimo elemento di un elenco («A, B e C»), con gli spazi. */
  'comune.elenco.e': ' and ',
  /** Battuta o testo tra caporali. */
  'comune.citazione': '“{testo}”',

  // Pagina non trovata e caricamento del pannello del master (App.tsx)
  'comune.app.carico_master': 'Loading the game master panel…',
  'comune.app.non_trovata': 'Page not found',
  'comune.app.apri': 'Open',
  'comune.app.per_giocare_o': 'to play, or',
  'comune.app.sul_proiettore': 'on the projector.',

  // Codice QR e connessione
  'comune.qr.aria': 'QR code to connect the phone',
  'comune.connessione.persa': 'Connection lost: retrying…',
  'comune.connessione.persa_tentativo': 'Connection lost: retrying (attempt {n})…',
  'comune.connessione.collegamento': 'Connecting to the table…',
  'comune.socket.risposta_vuota': 'Empty reply from the server.',
  'comune.socket.timeout': 'The server didn’t reply in time: try again.',
  'comune.socket.non_connesso': 'Not connected to the server',
  'comune.socket.non_connesso_tavolo': 'You’re not connected to the table: try again in a moment.',

  // Esiti e carte dei tiri (lib/tiri.ts, components/CartaTiro.tsx)
  'comune.esito.riuscita': 'Success',
  'comune.esito.parziale': 'Partial',
  'comune.esito.fallita': 'Failure',
  'comune.esito.critico': 'Critical',
  'comune.esito.disastro': 'Disaster',
  'comune.esito.colpo_critico': 'Critical hit',
  'comune.esito.uno_naturale': 'natural 1',
  'comune.esito.colpito': 'Hit',
  'comune.esito.mancato': 'Miss',
  'comune.esito.pareggio': 'Tie',
  'comune.carta.png': 'NPC',
  'comune.carta.privata': 'private',
  'comune.carta.a_terra': 'down',
  'comune.carta.contro': 'against',
  'comune.tiri.cd': 'DC',
  'comune.tiri.ca': 'AC',
  'comune.tiri.soglia': 'threshold',
  'comune.tiri.tiro': 'roll {dado}',
  'comune.tiri.sotto_soglia': 'roll {dado} ≤ {valore}',
  'comune.tiri.sotto_soglia_domanda': 'roll {dado} ≤ {valore}?',
  'comune.tiri.regola': 'Rule: {regola}',
  'comune.tiri.contro_nome': '{cosa} against {nome}',
  'comune.tiri.vantaggio': 'Advantage',
  'comune.tiri.svantaggio': 'Disadvantage',
  'comune.tiri.con_motivo': '{parola}: {motivo}',
  'comune.tiri.danni': 'Damage {formula}: {somma}',
  /** Con il tipo di danno com'è arrivato dal Motore, nella lingua dei contenuti («perforanti», «piercing»). */
  'comune.tiri.danni_tipo': 'Damage {formula}: {somma} {tipo}',
  'comune.tiri.frase': '{nome}, {cosa}: {conto}. {esito}.',
  'comune.tiri.conto_fasce': '{dadi} {mod} = {totale} against {bersaglio}',
  'comune.tiri.contro_avversario': 'against {nome} ({conto})',
  'comune.tiri.contro_valore': 'against {bersaglio}',
  'comune.tiri.a_terra_frase': '{chi} is down.',
  'comune.tiri.il_bersaglio': 'the target',

  // Combattimento
  'comune.combat.round': 'Round {n}',
  'comune.combat.round_fase': 'Round {n} · phase {fase}',
  'comune.combat.a_terra': 'down',
  'comune.combat.morto': 'dead',
  'comune.combat.fuggito': 'fled',

  // Serata (diario, fine serata, preavviso del master)
  'comune.serata.minuti': '{n} min',
  'comune.serata.ore_h': '{n} h',
  'comune.serata.ore_minuti': '{ore} h {minuti} min',
  'comune.serata.oltre': 'over by {testo}',
  'comune.serata.un_ora': '{n} hour',
  'comune.serata.piu_ore': '{n} hours',
  'comune.serata.manca_un_minuto': '1 minute left: start wrapping up',
  'comune.serata.mancano': '{n} minutes left: start wrapping up',
  'comune.serata.climax': '{testo} · a climax is under way: the narrator is waiting',
} satisfies Record<keyof typeof import('../it/comune').comune, string>;
