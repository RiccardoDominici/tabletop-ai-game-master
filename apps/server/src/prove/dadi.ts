/**
 * Dadi del Motore (docs/prove.md, «Dadi»). Il modello non tira mai: tira questo modulo.
 *
 * Generatore crittografico e riproducibile: il d-esimo valore è HMAC-SHA256(seme, contatore),
 * ridotto alle facce del dado con il rifiuto dei valori di coda (nessuna distorsione). Il seme
 * nasce da `crypto.randomBytes` a ogni sessione e si salva nell'archivio con il contatore: con
 * seme e contatore si rifà esattamente la stessa sequenza (test, indagini su una partita).
 *
 * Ogni tiro è registrato (`onTiro`): indice, facce, valore. Il log del server lo scrive accanto
 * all'esito della prova.
 */
import { createHmac, randomBytes } from 'node:crypto';

export interface TiroDado {
  /** Posizione nella sequenza della sessione (0 = primo dado tirato). */
  indice: number;
  facce: number;
  valore: number;
}

export interface FonteDadi {
  /** Seme esadecimale della sequenza. */
  readonly seme: string;
  /** Dadi già tirati con questo seme. */
  readonly contatore: number;
  /** Un dado da `facce` facce (1…facce). */
  tira(facce: number): number;
}

const MAX_U32 = 0x1_0000_0000;

export class DadiCrittografici implements FonteDadi {
  private n: number;

  constructor(
    readonly seme: string = randomBytes(16).toString('hex'),
    contatore = 0,
    private readonly onTiro?: (t: TiroDado) => void,
  ) {
    if (!/^[0-9a-f]{8,128}$/i.test(seme)) throw new Error(`seme dei dadi non valido: ${seme}`);
    this.n = contatore;
  }

  get contatore(): number {
    return this.n;
  }

  /** 32 bit pseudo-casuali dal blocco `indice` (con un sotto-indice per i rari rifiuti). */
  private blocco(indice: number, tentativo: number): number {
    const h = createHmac('sha256', Buffer.from(this.seme, 'hex')).update(`${indice}:${tentativo}`).digest();
    return h.readUInt32BE(0);
  }

  tira(facce: number): number {
    if (!Number.isInteger(facce) || facce < 2 || facce > 1000) throw new Error(`dado con ${facce} facce`);
    const indice = this.n++;
    // Rifiuto: si scartano i valori oltre il più grande multiplo di `facce` sotto 2^32.
    const limite = MAX_U32 - (MAX_U32 % facce);
    let tentativo = 0;
    let x = this.blocco(indice, tentativo);
    while (x >= limite) x = this.blocco(indice, ++tentativo);
    const valore = (x % facce) + 1;
    this.onTiro?.({ indice, facce, valore });
    return valore;
  }
}

/**
 * Dadi a copione per i test: restituisce i valori dati, nell'ordine (poi ricomincia). Controlla che
 * il valore stia nelle facce del dado chiesto, così un test sbagliato si vede subito.
 */
export class DadiACopione implements FonteDadi {
  readonly seme = 'copione';
  private n = 0;
  constructor(private readonly valori: number[]) {
    if (!valori.length) throw new Error('DadiACopione: nessun valore');
  }
  get contatore(): number {
    return this.n;
  }
  tira(facce: number): number {
    const v = this.valori[this.n++ % this.valori.length]!;
    if (v < 1 || v > facce) throw new Error(`DadiACopione: ${v} non sta su un d${facce}`);
    return v;
  }
}
