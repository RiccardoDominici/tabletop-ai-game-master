/**
 * E2E of exploration on the clock (docs/prove.md §14–15; rules-engine package R6), on real pages with manual dice and the
 * scripted narrator:
 *
 * 1. a copy of the invented cunicolo fixture (port 5031, a fixed dice seed): the party goes down into the dark tunnel,
 *    Aldo lights a torch; the windows pass on the clock until the torch burns out (the dark: Aldo and Bice see nothing,
 *    Dora sees by darkvision) and a wandering monster check fires and pulls an entry of the tunnel's table; past an
 *    hour without a rest the PCs are weary; they fight the creature in the dark (Aldo blinded, −4 on his card; Dora not),
 *    rest («ci riposiamo»), and travel through the woods for a day (rations and water at midnight, the leader's secret
 *    course check, the panel only);
 * 2. a copy of torre-mozza with creation at the table (port 5032): an elf fighter/magic-user built by Basic Fantasy's
 *    rules (both Prime Requisites, the d6, the magic-user's book, chain mail with no casting penalty), approved, its
 *    «Scheda» opened on the phone; then an exploration stretch with manual rolls: the Game Master darkens the scene, rolls
 *    an encounter on the manual's first dungeon level, the elf casts magic missile in chain mail (the player's die), and
 *    the party sets off through the forest (the leader's check, the day's rations).
 *
 * Run by esperimenti/risultati/regole-r6/rifai.sh, which prepares the copies, starts and stops the servers:
 *   E2E_PORTA=5031 E2E_URL_TM=http://localhost:5032 E2E_MASTER_TOKEN=<token> \
 *     npx playwright test -c playwright.config.ts e2e/esplorazione.spec.ts
 * Screenshots in esperimenti/risultati/regole-r6/playwright/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { RADICE } from './percorsi';

const CARTELLA = path.join(RADICE, 'esperimenti', 'risultati', 'regole-r6', 'playwright');
const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? '';
const URL_TM = process.env['E2E_URL_TM'] ?? '';

let n = 0;
async function foto(p: Page, nome: string): Promise<void> {
  n += 1;
  fs.mkdirSync(CARTELLA, { recursive: true });
  await p.screenshot({ path: path.join(CARTELLA, `${String(n).padStart(2, '0')}-${nome}.png`), fullPage: true });
}

const salute = async (p: Page) => (await (await p.request.get('/api/salute')).json()) as { fase: string; turno: number };

async function telefono(browser: Browser, base: string, pg: string | null, errori: string[]): Promise<Page> {
  const p = await (await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  p.on('pageerror', (e) => errori.push(`[${pg ?? 'telefono'}] ${e.message}`));
  await p.goto('/telefono');
  if (pg) {
    await p.getByTestId(`scelta-pg-${pg}`).click();
    await expect(p.getByTestId('nome-pg')).toBeVisible();
  }
  return p;
}

async function pannello(browser: Browser, base: string, errori: string[]): Promise<Page> {
  const m = await (await browser.newContext({ baseURL: base, viewport: { width: 1500, height: 1400 } })).newPage();
  m.on('pageerror', (e) => errori.push(`[master] ${e.message}`));
  await m.goto(`/master?token=${TOKEN}`);
  await expect(m.getByTestId('master-combattimento')).toBeVisible({ timeout: 20_000 });
  return m;
}

async function invia(p: Page, testo: string): Promise<void> {
  await p.getByTestId('testo-azione').fill(testo);
  await p.getByTestId('invia-azione').click();
}

/**
 * Close the open window from the panel and play it to the next one: every roll card a phone shows is filled with the
 * player's dice (17 on a d20, else 3 or the die's top) until the next window opens.
 */
async function giocaFinestra(master: Page, tel: Page[], ms = 90_000, finePausa = false): Promise<number> {
  const prima = (await salute(master)).turno;
  await master.getByTestId('master-chiudi-finestra').click();
  const fine = Date.now() + ms;
  for (;;) {
    const s = await salute(master);
    if (s.fase === 'finestra' && s.turno > prima) return s.turno;
    // The party down after a fight: the table pauses for the Game Master (a lone caster against a band).
    if (finePausa && s.fase === 'pausa') return s.turno;
    if (Date.now() > fine) throw new Error(`timeout: the window after turn ${prima} (${JSON.stringify(s)})`);
    for (const p of tel) {
      if (!(await p.getByTestId('tiro-da-fare').isVisible().catch(() => false))) continue;
      const k = await p.locator('[data-testid^="tiro-dado-"]').count();
      for (let i = 0; i < k; i++) {
        const lab = (await p.getByTestId(`tiro-dado-${i}`).getAttribute('aria-label')) ?? '';
        const facce = Number(/(\d+)\D*$/.exec(lab)?.[1] ?? 20);
        await p.getByTestId(`tiro-dado-${i}`).fill(String(facce >= 20 ? 17 : Math.min(3, facce)));
      }
      await p.getByTestId('tiro-invia').click();
    }
    await master.waitForTimeout(300);
  }
}

test.afterEach(async ({ browser }) => {
  for (const c of browser.contexts()) await c.close();
});

test.describe.serial('exploration on the clock', () => {
  test('the fixture: a dungeon crawl with a torch, a wandering monster, the dark, a rest, a day in the woods', async ({ browser, baseURL }) => {
    test.setTimeout(600_000);
    const base = baseURL!;
    const errori: string[] = [];
    const schermo = await (await browser.newContext({ baseURL: base, viewport: { width: 1600, height: 900 } })).newPage();
    if ((await salute(schermo)).fase !== 'attesa') await schermo.request.post('/api/scena/ricomincia');
    await schermo.goto('/schermo');
    const aldo = await telefono(browser, base, 'pg_aldo', errori);
    const bice = await telefono(browser, base, 'pg_bice', errori);
    const dora = await telefono(browser, base, 'pg_dora', errori);
    const tel = [aldo, bice, dora];
    const master = await pannello(browser, base, errori);
    await schermo.getByTestId('inizia-sessione').click();
    await expect.poll(async () => (await salute(master)).fase, { timeout: 60_000 }).toBe('finestra');

    // The inn: nothing explored, no check counted.
    await invia(aldo, 'Ci prepariamo a scendere nel cunicolo');
    await giocaFinestra(master, tel);
    await expect(master.getByTestId('master-tempo-incontri')).toHaveCount(0);

    // Down into the tunnel: dark, the tunnel's checks every two turns; Aldo lights a torch.
    await master.getByTestId('master-scena-scena_galleria').click();
    await expect(master.getByTestId('master-tempo-incontri')).toContainText('Sotterraneo', { timeout: 15_000 });
    await expect(master.getByTestId('master-tempo-luce')).toContainText('Non vedono nulla: Aldo, Bice');
    await foto(master, 'galleria-buia');
    await invia(aldo, 'Accendo una torcia');
    await invia(dora, 'Avanzo davanti a tutti');
    await giocaFinestra(master, tel);
    await expect(master.getByTestId('master-tempo-luce')).toContainText('illumina 9 metri');
    await expect(master.getByTestId('master-tempo-luci')).toContainText('Torcia');
    await foto(master, 'torcia-accesa');

    // The windows go by on the clock: the torch burns out, a wandering check fires, the party grows weary.
    let incontro = false;
    let buio = false;
    for (let k = 0; k < 12 && !(incontro && buio); k++) {
      await invia(dora, 'Avanziamo nella galleria');
      await giocaFinestra(master, tel);
      if (!buio && (await master.getByTestId('master-tempo-luce').textContent())?.includes('Non vedono nulla')) {
        buio = true;
        await foto(master, 'torcia-spenta');
      }
      if (!incontro && (await master.getByTestId('master-tempo-incontro').count())) {
        incontro = true;
        await foto(master, 'incontro');
        await foto(schermo, 'incontro-proiettore');
      }
    }
    expect(incontro && buio).toBe(true);
    const creatura = (await master.getByTestId('master-tempo-incontro').textContent()) ?? '';
    const nome = /creature, ([^.]+)\.|arriva ([^.]+)\./.exec(creatura);
    const parola = (nome?.[1] ?? nome?.[2] ?? 'ratto').split(' ')[0]!;

    // A fight in the dark: Aldo strikes first, blinded (−4 on his card); Dora, who sees by darkvision, after him.
    await invia(aldo, `Attacco il ${parola} con la spada`);
    await giocaFinestra(master, tel, 180_000);
    // Aldo's card, as Dora's phone shows the turn's rolls (a tap opens them whole): Strength +1 and the class's +1, weary
    // −1 and blinded −4 make −3 (the rule line with «Accecato −4», which names the AC, stays the Game Master's: the log).
    await dora.getByTestId('tiri-turno').click();
    await expect(dora.getByTestId('tiri-turno')).toContainText('Aldo', { timeout: 30_000 });
    await expect(dora.getByTestId('tiri-turno')).toContainText('−3');
    await foto(dora, 'scontro-al-buio-telefono');
    await foto(master, 'scontro-pannello');
    if (await master.getByTestId('master-combattimento-termina').isVisible()) {
      await invia(dora, `Attacco il ${parola} con la mazza`);
      await giocaFinestra(master, tel, 180_000);
    }
    // Whatever is left of the fight, the panel ends it.
    if (await master.getByTestId('master-combattimento-termina').isVisible()) {
      await master.getByTestId('master-combattimento-termina').click();
      await master.getByTestId('master-combattimento-termina').click();
    }

    // The rest rule (the fixture's: a turn every hour): weary, then «ci riposiamo».
    await expect(master.getByTestId('master-combattimento')).toContainText('Riposo: i PG sono affaticato', { timeout: 15_000 });
    await foto(master, 'stanchi');
    await invia(bice, 'Ci riposiamo un momento contro la parete');
    await giocaFinestra(master, tel);
    await expect(master.getByTestId('master-combattimento')).toContainText("Riposo: l'ultimo", { timeout: 15_000 });

    // A day in the woods: the journey's checks on the woods' table, the leader's course check, food and water at midnight.
    await master.getByTestId('master-tempo-distanza').fill('9');
    await master.getByTestId('master-tempo-terreno').selectOption('bosco');
    await master.getByTestId('master-tempo-guida').selectOption('pg_dora');
    await master.getByTestId('master-tempo-viaggio').click();
    await expect(master.getByTestId('master-combattimento')).toContainText(/Dora (tiene la rotta|ha perso la strada)/, { timeout: 15_000 });
    await expect(master.getByTestId('master-combattimento')).toContainText('Bice: 1 giorni senza cibo');
    await foto(master, 'viaggio-nel-bosco');
    await dora.getByTestId('apri-scheda').click();
    await foto(dora, 'dora-scheda');
    expect(errori).toEqual([]);
  });

  test('torre-mozza: an elf fighter/magic-user built and playing; an exploration stretch with manual rolls', async ({ browser }) => {
    test.setTimeout(400_000);
    test.skip(!URL_TM, 'E2E_URL_TM: the torre-mozza copy\'s server');
    const errori: string[] = [];
    const tel = await telefono(browser, URL_TM, null, errori);
    await tel.getByTestId('crea-pg').click();
    await expect(tel.getByTestId('creazione-tiro-per')).toHaveText('Forza');
    // 3d6 in order (p. 3): Forza 13, Intelligenza 14, Saggezza 10, Destrezza 12, Costituzione 11, Carisma 9.
    for (const d of [[5, 4, 4], [5, 5, 4], [4, 3, 3], [4, 4, 4], [4, 4, 3], [3, 3, 3]]) {
      const per = await tel.getByTestId('creazione-tiro-per').textContent();
      for (const [i, v] of d.entries()) await tel.getByTestId(`creazione-dado-${i}`).fill(String(v));
      await tel.getByTestId('creazione-tira').click();
      await expect(tel.getByTestId('creazione-tiro-per')).not.toHaveText(per ?? '', { timeout: 5000 }).catch(() => undefined);
    }
    await tel.getByTestId('creazione-conferma').click();
    await tel.getByTestId('creazione-razza-elfo').click();
    // p. 6: only elves; both Prime Requisites (Forza 13, Intelligenza 14).
    await expect(tel.getByTestId('creazione-classe-guerriero_mago')).toHaveAttribute('data-ammessa', 'true');
    await foto(tel, 'tm-classi-elfo');
    await tel.getByTestId('creazione-classe-guerriero_mago').click();
    // The magic-user's book (p. 8): read magic and one more.
    await expect(tel.getByTestId('creazione-passo-incantesimi')).toContainText('Leggere il magico');
    await tel.getByTestId('creazione-libro-dardo_incantato').check();
    await tel.getByTestId('creazione-prepara-dardo_incantato').check();
    await tel.getByTestId('creazione-conferma').click();
    // p. 6: a d6 for hit points (Costituzione 11: +0).
    await expect(tel.getByTestId('creazione-tiro-per')).toHaveText('Punti ferita del 1° livello');
    await tel.getByTestId('creazione-dado-0').fill('5');
    await tel.getByTestId('creazione-tira').click();
    // 3d6 × 10 gold pieces: 150 (the money's card replaces the hit points' one).
    await expect(tel.getByTestId('creazione-tiro-per')).toHaveText('Monete iniziali');
    for (const [i, v] of [5, 5, 5].entries()) await tel.getByTestId(`creazione-dado-${i}`).fill(String(v));
    await tel.getByTestId('creazione-tira').click();
    // Chain mail and a longsword: a fighter/magic-user casts in armor (p. 6), so no «niente incantesimi» on it.
    await tel.getByTestId('creazione-tipo-armatura').click();
    await expect(tel.getByTestId('creazione-voce-cotta_di_maglia')).not.toContainText(/incantesim/);
    await tel.getByTestId('creazione-compra-cotta_di_maglia').click();
    await tel.getByTestId('creazione-tipo-arma').click();
    await tel.getByTestId('creazione-compra-spada_lunga').click();
    // A week's rations and a waterskin for the road (p. 44: a day's food and a quart of water).
    await tel.getByTestId('creazione-tipo-attrezzo').click();
    await tel.getByTestId('creazione-compra-razioni').click();
    await tel.getByTestId('creazione-compra-otre').click();
    await foto(tel, 'tm-acquisti-guerriero-mago');
    await tel.getByTestId('creazione-conferma').click();
    // Intelligenza 14 (+1): one language more.
    await tel.getByTestId('creazione-lingua-goblin').check();
    await tel.getByTestId('creazione-conferma').click();
    await tel.getByTestId('creazione-nome').fill('Fiordaliso');
    await tel.getByTestId('creazione-conferma').click();
    await expect(tel.getByTestId('creazione-riepilogo')).toHaveAttribute('data-stato', 'pronta');
    await foto(tel, 'tm-pronto');
    const m = await pannello(browser, URL_TM, errori);
    const id = (await m.locator('[data-bozza]').first().getAttribute('data-bozza'))!;
    await m.getByTestId(`master-creazione-${id}-approva`).click();
    await expect(tel.getByTestId('nome-pg')).toHaveText('Fiordaliso', { timeout: 30_000 });
    // The created PC's «Scheda» on the phone (R5 never opened it).
    await tel.getByTestId('apri-scheda').click();
    await expect(tel.getByTestId('scheda-pg')).toBeVisible();
    await foto(tel, 'tm-scheda-fiordaliso');
    await tel.getByTestId('scheda-pg').getByRole('button').first().click();

    // Play: the projector starts; the Game Master darkens the scene and rolls an encounter on the dungeon's first level.
    const schermo = await (await browser.newContext({ baseURL: URL_TM, viewport: { width: 1600, height: 900 } })).newPage();
    await schermo.goto('/schermo');
    await schermo.getByTestId('inizia-sessione').click();
    const mp = await pannello(browser, URL_TM, errori);
    await expect.poll(async () => (await salute(mp)).fase, { timeout: 60_000 }).toBe('finestra');
    await mp.getByTestId('master-tempo-luce-livello').selectOption('buio');
    await expect(mp.getByTestId('master-tempo-luce')).toContainText('Fiordaliso vede al buio fino a 18 metri');
    await mp.getByTestId('master-incontro').locator('summary').click();
    await mp.getByTestId('master-incontro-tabella').selectOption('sotterraneo_1');
    // A creature to aim at: a group without a stat block (NPC adventurers) has none, so the Game Master rolls again.
    let bersaglio: string | null = null;
    for (let k = 0; k < 10 && !bersaglio; k++) {
      await mp.getByTestId('master-incontro-tira').click();
      // Two rolls may give the same group: wait for the command's round trip, not for a different line.
      await expect(mp.getByTestId('master-incontro-tira')).toBeEnabled({ timeout: 15_000 });
      await expect(mp.getByTestId('master-tempo-incontro')).toBeVisible({ timeout: 15_000 });
      await mp.waitForTimeout(1000);
      const testoIncontro = (await mp.getByTestId('master-tempo-incontro').textContent()) ?? '';
      const creatura = /creature, ([^.]+)\.|arriva ([^.]+)\./.exec(testoIncontro);
      bersaglio = creatura?.[1] ?? creatura?.[2] ?? null;
    }
    expect(bersaglio).not.toBeNull();
    await foto(mp, 'tm-incontro-e-buio');
    // Through the forest: the leader's save vs. Death Ray with Wisdom (the Game Master's secret), the day's rations.
    await mp.getByTestId('master-tempo-distanza').fill('8');
    await mp.getByTestId('master-tempo-terreno').selectOption('foresta');
    await mp.getByTestId('master-tempo-guida').selectOption({ label: 'Fiordaliso' });
    await mp.getByTestId('master-tempo-viaggio').click();
    await expect(mp.getByTestId('master-combattimento')).toContainText(/Fiordaliso (tiene la rotta|ha perso la strada)/, { timeout: 15_000 });
    await foto(mp, 'tm-viaggio-foresta');
    // Magic missile in chain mail (p. 6: a fighter/magic-user casts in armor): the player rolls the damage die.
    await invia(tel, `Lancio il dardo incantato contro ${bersaglio}`);
    await giocaFinestra(mp, [tel], 120_000, true);
    // The card is there (not refused for the armor): the panel's last cards, «Fiordaliso · Dardo incantato».
    await expect(mp.getByTestId('master-tiri-carte')).toContainText('Dardo incantato', { timeout: 30_000 });
    await foto(mp, 'tm-dardo-in-armatura');
    if (await mp.getByTestId('master-combattimento-termina').isVisible()) {
      await mp.getByTestId('master-combattimento-termina').click();
      await mp.getByTestId('master-combattimento-termina').click();
    }
    expect(errori).toEqual([]);
  });
});
