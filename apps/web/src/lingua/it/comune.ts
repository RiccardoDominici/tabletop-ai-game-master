/**
 * Dizionario «comune» dell'interfaccia, lingua it (docs/lingue.md). Chiavi piatte «comune.…», segnaposto {nome}.
 * Le chiavi sono quelle di lingua/it/comune.ts: il compilatore e lingua.test.ts controllano che non ne manchi nessuna.
 */
export const comune = {
  /** Congiunzione dell'ultimo elemento di un elenco («A, B e C»), con gli spazi. */
  'comune.elenco.e': ' e ',
  /** Battuta o testo tra caporali. */
  'comune.citazione': '«{testo}»',

  // Pagina non trovata e caricamento del pannello del master (App.tsx)
  'comune.app.carico_master': 'Carico il pannello del master…',
  'comune.app.non_trovata': 'Pagina non trovata',
  'comune.app.apri': 'Apri',
  'comune.app.per_giocare_o': 'per giocare o',
  'comune.app.sul_proiettore': 'sul proiettore.',

  // Codice QR e connessione
  'comune.qr.aria': 'Codice QR per collegare il telefono',
  'comune.connessione.persa': 'Connessione persa: riprovo…',
  'comune.connessione.persa_tentativo': 'Connessione persa: riprovo (tentativo {n})…',
  'comune.connessione.collegamento': 'Collegamento al tavolo…',
  'comune.socket.risposta_vuota': 'Risposta vuota dal server.',
  'comune.socket.timeout': 'Il server non ha risposto in tempo: riprova.',
  'comune.socket.non_connesso': 'Non connesso al server',
  'comune.socket.non_connesso_tavolo': 'Non sei connesso al tavolo: riprova tra un attimo.',

  // Esiti e carte dei tiri (lib/tiri.ts, components/CartaTiro.tsx)
  'comune.esito.riuscita': 'Riuscita',
  'comune.esito.parziale': 'Parziale',
  'comune.esito.fallita': 'Fallita',
  'comune.esito.critico': 'Critico',
  'comune.esito.disastro': 'Disastro',
  'comune.esito.colpo_critico': 'Colpo critico',
  'comune.esito.uno_naturale': '1 naturale',
  'comune.esito.colpito': 'Colpito',
  'comune.esito.mancato': 'Mancato',
  'comune.esito.pareggio': 'Pareggio',
  'comune.carta.png': 'PNG',
  'comune.carta.privata': 'privata',
  'comune.carta.a_terra': 'a terra',
  'comune.carta.contro': 'contro',
  'comune.tiri.cd': 'CD',
  'comune.tiri.ca': 'CA',
  'comune.tiri.soglia': 'soglia',
  'comune.tiri.tiro': 'tiro {dado}',
  'comune.tiri.sotto_soglia': 'tiro {dado} ≤ {valore}',
  'comune.tiri.sotto_soglia_domanda': 'tiro {dado} ≤ {valore}?',
  'comune.tiri.regola': 'Regola: {regola}',
  'comune.tiri.contro_nome': '{cosa} contro {nome}',
  'comune.tiri.vantaggio': 'Vantaggio',
  'comune.tiri.svantaggio': 'Svantaggio',
  'comune.tiri.con_motivo': '{parola}: {motivo}',
  'comune.tiri.danni': 'Danni {formula}: {somma}',
  'comune.tiri.frase': '{nome}, {cosa}: {conto}. {esito}.',
  'comune.tiri.conto_fasce': '{dadi} {mod} = {totale} contro {bersaglio}',
  'comune.tiri.contro_avversario': 'contro {nome} ({conto})',
  'comune.tiri.contro_valore': 'contro {bersaglio}',
  'comune.tiri.a_terra_frase': '{chi} è a terra.',
  'comune.tiri.il_bersaglio': 'il bersaglio',

  // Combattimento
  'comune.combat.round': 'Round {n}',
  'comune.combat.round_fase': 'Round {n} · fase {fase}',
  'comune.combat.a_terra': 'a terra',
  'comune.combat.morto': 'morto',
  'comune.combat.fuggito': 'fuggito',

  // Serata (diario, fine serata, preavviso del master)
  'comune.serata.minuti': '{n} min',
  'comune.serata.ore_h': '{n} h',
  'comune.serata.ore_minuti': '{ore} h {minuti} min',
  'comune.serata.oltre': 'oltre di {testo}',
  'comune.serata.un_ora': '{n} ora',
  'comune.serata.piu_ore': '{n} ore',
  'comune.serata.manca_un_minuto': 'Manca 1 minuto: avviati alla chiusura',
  'comune.serata.mancano': 'Mancano {n} minuti: avviati alla chiusura',
  'comune.serata.climax': '{testo} · c\'è un climax in corso: il narratore aspetta',
} as const;
