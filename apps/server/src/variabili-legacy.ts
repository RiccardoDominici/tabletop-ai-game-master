/**
 * Compatibilità dei nomi delle variabili d'ambiente: il prefisso è passato da CANTASTORIE_ a TAGM_
 * (il progetto si chiama Tabletop AI Game Master). Le istanze già in uso (partita.sh, .env, script
 * personali) continuano a funzionare: se una variabile TAGM_X manca e CANTASTORIE_X è impostata,
 * il valore vecchio viene copiato sul nuovo e il nome vecchio viene tolto dall'ambiente, così che
 * i processi figli (il server lanciato da uno script, gli esperimenti) vedano solo i nomi nuovi.
 *
 * Il modulo si esegue all'importazione: va importato per primo dal punto d'ingresso, prima che
 * altri moduli leggano process.env all'avvio (es. sceneggiatore/processo.ts).
 */
export const PREFISSO_VECCHIO = 'CANTASTORIE_';
export const PREFISSO_NUOVO = 'TAGM_';

/** Nomi vecchi trovati e copiati dall'ultima chiamata: il chiamante ne registra un solo avviso nel log. */
let ultimeUsate: string[] = [];
export function variabiliLegacyUsate(): string[] {
  return ultimeUsate;
}

/** Allinea env in place. Restituisce i nomi vecchi che sono stati copiati (vuoto = niente da fare). */
export function allineaVariabiliLegacy(env: NodeJS.ProcessEnv): string[] {
  const usate: string[] = [];
  for (const vecchio of Object.keys(env)) {
    if (!vecchio.startsWith(PREFISSO_VECCHIO)) continue;
    const nuovo = PREFISSO_NUOVO + vecchio.slice(PREFISSO_VECCHIO.length);
    const valore = env[vecchio];
    if (env[nuovo] === undefined && valore !== undefined) env[nuovo] = valore;
    delete env[vecchio];
    usate.push(vecchio);
  }
  ultimeUsate = usate;
  return usate;
}

allineaVariabiliLegacy(process.env);
