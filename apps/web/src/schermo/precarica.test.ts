import { describe, expect, it } from 'vitest';
import { Precaricatore, urlDaPrecaricare, type ImmagineCaricabile } from './precarica';

/** Fabbrica finta: registra le URL create; `decode` fallisce per le URL che contengono «rotta». */
function fabbricaFinta() {
  const create: string[] = [];
  const fabbrica = (url: string): ImmagineCaricabile => {
    create.push(url);
    return { decode: () => (url.includes('rotta') ? Promise.reject(new Error('404')) : Promise.resolve()) };
  };
  return { create, fabbrica };
}

describe('Precaricatore', () => {
  it('niente doppioni tra precaricamenti e caricamenti', async () => {
    const { create, fabbrica } = fabbricaFinta();
    const p = new Precaricatore(fabbrica);
    p.precarica(['/a.jpg', '/b.jpg', '/a.jpg', '']);
    p.precarica(['/b.jpg']);
    expect(create).toEqual(['/a.jpg', '/b.jpg']);
    expect(await p.carica('/a.jpg')).toBe(true);
    expect(create).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('la decodifica si fa una volta sola per URL', async () => {
    let decodifiche = 0;
    const p = new Precaricatore(() => ({
      decode: () => {
        decodifiche += 1;
        return Promise.resolve();
      },
    }));
    await Promise.all([p.carica('/a.jpg'), p.carica('/a.jpg')]);
    await p.carica('/a.jpg');
    expect(decodifiche).toBe(1);
  });

  it('un caricamento fallito risolve false e si può ritentare', async () => {
    const { create, fabbrica } = fabbricaFinta();
    const p = new Precaricatore(fabbrica);
    expect(await p.carica('/rotta.jpg')).toBe(false);
    expect(p.dimensione).toBe(0);
    await p.carica('/rotta.jpg');
    expect(create).toEqual(['/rotta.jpg', '/rotta.jpg']);
  });

  it('tetto alla memoria: si scartano le meno recenti', () => {
    const { create, fabbrica } = fabbricaFinta();
    const p = new Precaricatore(fabbrica, 2);
    p.precarica(['/1.jpg', '/2.jpg']);
    p.precarica(['/1.jpg']); // /1 torna la più recente
    p.precarica(['/3.jpg']); // esce /2
    expect(p.dimensione).toBe(2);
    p.precarica(['/1.jpg', '/2.jpg']);
    expect(create).toEqual(['/1.jpg', '/2.jpg', '/3.jpg', '/2.jpg']);
  });
});

describe('urlDaPrecaricare', () => {
  it('luoghi probabili prima, poi i ritratti, senza doppioni né vuoti', () => {
    expect(
      urlDaPrecaricare(['/luogo_b.jpg', '/ritratto_o.jpg', ''], { png_ottavia: '/ritratto_o.jpg', png_baldrin: '/ritratto_b.jpg' }),
    ).toEqual(['/luogo_b.jpg', '/ritratto_o.jpg', '/ritratto_b.jpg']);
  });
});
