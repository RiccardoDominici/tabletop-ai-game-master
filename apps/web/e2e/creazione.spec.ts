/**
 * E2E of creation at the table (docs/creazione.md; rules-engine package R5), on real pages, with manual dice:
 *
 * 1. a two-session copy of the invented fucina fixture (port 5021): two phones each build a PC die by die — a fighter
 *    and a caster with a starting spellbook —, one illegal choice is refused by the server (a race the scores close),
 *    the purchases change the AC and the load, the Game Master approves a step and both PCs, the server restarts and
 *    the phones take their PCs; the session is played and closed, the between-session step writes the next package
 *    from the log, and session 2 starts with both PCs;
 * 2. a copy of torre-mozza with creation at the table (port 5022): an elf magic-user built by Basic Fantasy's rules
 *    (3d6 in order, the race's and class's requirements, read magic and one more, two extra languages by Intelligence).
 *
 * Run by esperimenti/risultati/regole-r5/rifai.sh, which prepares the copies, starts and stops the servers:
 *   E2E_PORTA=5021 E2E_URL_TM=http://localhost:5022 E2E_CAMPAGNA=<copy of fucina> E2E_MASTER_TOKEN=prova_creazione \
 *     npx playwright test -c playwright.config.ts e2e/creazione.spec.ts
 * Screenshots in esperimenti/risultati/regole-r5/playwright/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test, type Browser, type Page } from '@playwright/test';
import YAML from 'yaml';
import { RADICE } from './percorsi';

const CARTELLA = path.join(RADICE, 'esperimenti', 'risultati', 'regole-r5', 'playwright');
const TOKEN = process.env['E2E_MASTER_TOKEN'] ?? 'prova_creazione';
const CAMPAGNA = process.env['E2E_CAMPAGNA'] ?? '';
const URL_TM = process.env['E2E_URL_TM'] ?? '';

let n = 0;
async function foto(p: Page, nome: string): Promise<void> {
  n += 1;
  await p.screenshot({ path: path.join(CARTELLA, `${String(n).padStart(2, '0')}-${nome}.png`), fullPage: true });
}

async function telefono(browser: Browser, base: string, errori: string[]): Promise<Page> {
  const tel = await (await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
  tel.on('pageerror', (e) => errori.push(e.message));
  await tel.goto('/telefono');
  return tel;
}

/** Enters one roll die by die (the player's real dice) and sends it. */
async function dadi(tel: Page, valori: number[]): Promise<void> {
  const per = await tel.getByTestId('creazione-tiro-per').textContent();
  for (const [i, v] of valori.entries()) await tel.getByTestId(`creazione-dado-${i}`).fill(String(v));
  await tel.getByTestId('creazione-tira').click();
  // The next roll (another score, the next step) replaces the card, or the card goes.
  await expect(tel.getByTestId('creazione-tiro-per')).not.toHaveText(per ?? '', { timeout: 5000 }).catch(() => undefined);
}

async function conferma(tel: Page): Promise<void> {
  await tel.getByTestId('creazione-conferma').click();
}

async function master(browser: Browser, base: string): Promise<Page> {
  const m = await (await browser.newContext({ baseURL: base, viewport: { width: 1400, height: 1300 } })).newPage();
  await m.goto(`/master?token=${TOKEN}`);
  await expect(m.getByTestId('master-creazione')).toBeVisible({ timeout: 20_000 });
  return m;
}

test.describe.serial('creation at the table', () => {
  test('two phones build a fighter and a caster; the Game Master approves; session 2 starts with both', async ({ browser, baseURL }) => {
    test.setTimeout(300_000);
    expect(CAMPAGNA, 'E2E_CAMPAGNA: the copy of the fixture').not.toBe('');
    fs.mkdirSync(CARTELLA, { recursive: true });
    const errori: string[] = [];
    const base = baseURL!;

    // --- Phone 1: the fighter.
    const gaspare = await telefono(browser, base, errori);
    await expect(gaspare.getByTestId('crea-pg')).toBeVisible({ timeout: 20_000 });
    await foto(gaspare, 'scelta-con-crea');
    await gaspare.getByTestId('crea-pg').click();
    await expect(gaspare.getByTestId('creazione-tiro-per')).toHaveText('Forza');
    await foto(gaspare, 'gaspare-primo-tiro');
    for (const d of [[6, 5, 5], [4, 4, 2], [5, 5, 1], [6, 4, 3]]) await dadi(gaspare, d);
    await expect(gaspare.getByTestId('creazione-punteggio-forza')).toContainText('16');
    await foto(gaspare, 'gaspare-punteggi');
    await conferma(gaspare);
    // The illegal choice: Forza 16 is over the small race's 15. Shown greyed with the reason, refused by the server.
    await expect(gaspare.getByTestId('creazione-razza-piccolo')).toContainText('Forza 16: serve ≤ 15');
    // aria-disabled: Playwright would wait for it to be enabled; the click goes through to the server, as a tap does.
    await gaspare.getByTestId('creazione-razza-piccolo').click({ force: true });
    await expect(gaspare.getByTestId('creazione-errore')).toHaveText('Non puoi essere Piccolo: Forza 16, serve ≤ 15.');
    await foto(gaspare, 'gaspare-razza-rifiutata');
    await gaspare.getByTestId('creazione-razza-umano').click();
    await gaspare.getByTestId('creazione-classe-lama').click();
    await expect(gaspare.getByTestId('creazione-tiro-per')).toHaveText('Punti ferita del 1° livello');
    await foto(gaspare, 'gaspare-punti-ferita');
    await dadi(gaspare, [7]);
    await expect(gaspare.getByTestId('creazione-tiro-per')).toHaveText('Monete iniziali');
    await dadi(gaspare, [5, 5, 5]);
    // Purchases: AC and load change with what is bought.
    await expect(gaspare.getByTestId('creazione-difesa')).toContainText('10');
    await expect(gaspare.getByTestId('creazione-carico')).toContainText('Carico leggero');
    await foto(gaspare, 'gaspare-acquisti-prima');
    await gaspare.getByTestId('creazione-tipo-armatura').click();
    await gaspare.getByTestId('creazione-compra-cotta').click();
    await expect(gaspare.getByTestId('creazione-difesa')).toContainText('14');
    await gaspare.getByTestId('creazione-tipo-scudo').click();
    await gaspare.getByTestId('creazione-compra-scudo').click();
    await gaspare.getByTestId('creazione-tipo-arma').click();
    await gaspare.getByTestId('creazione-compra-spada').click();
    await expect(gaspare.getByTestId('creazione-difesa')).toContainText('15');
    await expect(gaspare.getByTestId('creazione-monete')).toContainText('95 mo');
    await expect(gaspare.getByTestId('creazione-carico')).toContainText('Carico pesante');
    await expect(gaspare.getByTestId('creazione-attacchi')).toContainText('Spada 1d8+2');
    await foto(gaspare, 'gaspare-acquisti-dopo');
    await conferma(gaspare);
    await conferma(gaspare); // languages: Mente 10, none more
    await gaspare.getByTestId('creazione-nome').fill('Gaspare');
    await gaspare.getByTestId('creazione-aspetto').fill('Spalle larghe e una cicatrice sul mento.');
    await conferma(gaspare);
    await expect(gaspare.getByTestId('creazione-riepilogo')).toHaveAttribute('data-stato', 'pronta');
    await foto(gaspare, 'gaspare-pronto');

    // --- Phone 2: the caster, with its starting book.
    const selva = await telefono(browser, base, errori);
    await selva.getByTestId('crea-pg').click();
    for (const d of [[4, 3, 3], [6, 5, 3], [5, 4, 3], [4, 3, 3]]) await dadi(selva, d);
    await conferma(selva);
    await selva.getByTestId('creazione-razza-umano').click();
    await selva.getByTestId('creazione-classe-arcano').click();
    await expect(selva.getByTestId('creazione-passo-incantesimi')).toBeVisible();
    await selva.getByTestId('creazione-libro-scintilla').check();
    await selva.getByTestId('creazione-prepara-scintilla').check();
    await foto(selva, 'selva-libro');
    await conferma(selva);
    await dadi(selva, [3]);
    await dadi(selva, [4, 4, 4]);
    await selva.getByTestId('creazione-compra-pugnale').click();
    await selva.getByTestId('creazione-tipo-armatura').click();
    await expect(selva.getByTestId('creazione-voce-cotta')).toContainText('niente incantesimi indossandola');
    await foto(selva, 'selva-armatura-con-penalita');
    await conferma(selva);
    await selva.getByTestId('creazione-lingua-antico').check();
    await conferma(selva);
    await selva.getByTestId('creazione-nome').fill('Selva');
    await conferma(selva);
    await expect(selva.getByTestId('creazione-riepilogo')).toHaveAttribute('data-stato', 'pronta');

    // --- The Game Master: the two drafts, the rolls entered, one step approved, then each PC.
    const m = await master(browser, base);
    const bozze = m.locator('[data-bozza]');
    await expect(bozze).toHaveCount(2);
    const idGaspare = (await m.locator('[data-bozza]', { hasText: 'Gaspare' }).getAttribute('data-bozza'))!;
    const idSelva = (await m.locator('[data-bozza]', { hasText: 'Selva' }).getAttribute('data-bozza'))!;
    await expect(m.getByTestId(`master-creazione-${idGaspare}-tiri`)).toContainText('Forza 6+5+5');
    await m.getByTestId(`master-creazione-${idGaspare}-razza-approva`).click();
    await expect(m.getByTestId(`master-creazione-${idGaspare}-razza`)).toHaveAttribute('data-stato', 'approvato');
    await m.getByTestId('master-creazione').scrollIntoViewIfNeeded();
    await foto(m, 'pannello-creazione');
    await m.getByTestId(`master-creazione-${idGaspare}-approva`).click();
    // The server restarts with Gaspare in the campaign; the phone takes him.
    await expect(gaspare.getByTestId('nome-pg')).toHaveText('Gaspare', { timeout: 30_000 });
    await foto(gaspare, 'gaspare-al-tavolo');
    // The panel reconnects to the rebuilt server: Gaspare's draft is closed, Selva's is still there.
    await expect(m.locator('[data-bozza]')).toHaveCount(1, { timeout: 30_000 });
    await expect(m.getByTestId(`master-creazione-${idSelva}-approva`)).toBeEnabled({ timeout: 30_000 });
    await m.getByTestId(`master-creazione-${idSelva}-approva`).click();
    await expect(selva.getByTestId('nome-pg')).toHaveText('Selva', { timeout: 30_000 });
    // Written to the copy's pg-creati/ (TAGM_PG_CREATI), with the rolls entered.
    const fileGaspare = path.join(CAMPAGNA, 'pg-creati', 'pg_gaspare.yaml');
    const voce = YAML.parse(fs.readFileSync(fileGaspare, 'utf8')) as { scheda: Record<string, unknown>; creazione: { tiri: unknown[] } };
    expect(voce.scheda).toMatchObject({ classe: 'lama', razza: 'umano', pf: 8, monete: { mo: 95 }, equipaggiamento: ['cotta', 'scudo', 'spada'] });
    expect(voce.creazione.tiri).toHaveLength(6);
    expect((YAML.parse(fs.readFileSync(path.join(CAMPAGNA, 'pg-creati', 'pg_selva.yaml'), 'utf8')) as { scheda: Record<string, unknown> }).scheda).toMatchObject({ classe: 'arcano', libro: ['leggere_rune', 'scintilla'], incantesimi: ['scintilla'], lingue: ['comune', 'antico'] });

    // --- Session 1 is played (the projector starts it) and closed: the log carries the new PCs.
    const schermo = await (await browser.newContext({ baseURL: base, viewport: { width: 1280, height: 800 } })).newPage();
    await schermo.goto('/schermo');
    await schermo.getByTestId('inizia-sessione').click();
    await expect(gaspare.getByTestId('nome-pg')).toBeVisible();
    await m.reload();
    await expect(m.getByTestId('master-fine-sessione')).toBeEnabled({ timeout: 30_000 });
    await m.getByTestId('master-fine-sessione').click();
    await m.getByTestId('master-fine-sessione').click(); // confirm
    const registro = path.join(CAMPAGNA, 'sessioni', '01', 'registro.yaml');
    await expect.poll(() => fs.existsSync(registro), { timeout: 30_000 }).toBe(true);
    const fine = YAML.parse(fs.readFileSync(registro, 'utf8')) as { pg_alla_fine: Array<{ id: string; pf: number }> };
    expect(fine.pg_alla_fine.map((p) => p.id).sort()).toEqual(['pg_brina', 'pg_gaspare', 'pg_selva']);

    // --- Between the sessions: the deterministic step writes sessioni/02 from the log (the PCs' state included).
    const tra = spawnSync('bash', [path.join(RADICE, 'esperimenti', 'risultati', 'regole-r5', 'tra-sessioni.sh'), CAMPAGNA], { cwd: RADICE, encoding: 'utf8' });
    expect(tra.status, tra.stderr).toBe(0);
    fs.writeFileSync(path.join(CARTELLA, '..', 'pacchetto-02.txt'), tra.stdout);
    const s2 = YAML.parse(fs.readFileSync(path.join(CAMPAGNA, 'sessioni', '02', 'sessione.yaml'), 'utf8')) as { pg_all_inizio: Record<string, { pf: number }> };
    expect(Object.keys(s2.pg_all_inizio).sort()).toEqual(['pg_brina', 'pg_gaspare', 'pg_selva']);

    // --- Session 2: both PCs are at the table, the phones take them again.
    await m.reload();
    await expect(m.getByTestId('master-prossima-sessione')).toBeEnabled({ timeout: 30_000 });
    await m.getByTestId('master-prossima-sessione').click();
    await m.getByTestId('master-prossima-sessione').click(); // confirm
    // The server restarts on 02: while it is down the request fails, and the poll asks again.
    const pacchetto = async (): Promise<string | null> => {
      try {
        return ((await (await m.request.get('/api/salute')).json()) as { pacchetto?: string }).pacchetto ?? null;
      } catch {
        return null;
      }
    };
    await expect.poll(pacchetto, { timeout: 40_000 }).toBe('02');
    await expect(gaspare.getByTestId('nome-pg')).toHaveText('Gaspare', { timeout: 30_000 });
    await expect(selva.getByTestId('nome-pg')).toHaveText('Selva', { timeout: 30_000 });
    await foto(selva, 'sessione-2-selva');
    expect(errori).toEqual([]);
  });

  test('torre-mozza: an elf magic-user by Basic Fantasy\'s rules', async ({ browser }) => {
    test.setTimeout(180_000);
    test.skip(!URL_TM, 'E2E_URL_TM: the torre-mozza copy\'s server');
    const errori: string[] = [];
    const tel = await telefono(browser, URL_TM, errori);
    await tel.getByTestId('crea-pg').click();
    await expect(tel.getByTestId('creazione-tiro-per')).toHaveText('Forza');
    // 3d6 in order (p. 3): Forza 10, Intelligenza 16, Saggezza 12, Destrezza 14, Costituzione 11, Carisma 9.
    for (const d of [[3, 4, 3], [6, 5, 5], [4, 4, 4], [5, 4, 5], [4, 4, 3], [3, 3, 3]]) await dadi(tel, d);
    await conferma(tel);
    await foto(tel, 'tm-razze');
    await tel.getByTestId('creazione-razza-elfo').click();
    // p. 5: an elf may be any of the four; p. 8: the magic-user's Prime Requisite (Intelligenza 16 ≥ 9).
    await expect(tel.getByTestId('creazione-classe-mago')).toHaveAttribute('data-ammessa', 'true');
    await tel.getByTestId('creazione-classe-mago').click();
    // p. 8: read magic and one more first-level spell.
    await expect(tel.getByTestId('creazione-passo-incantesimi')).toContainText('Leggere il magico');
    await tel.getByTestId('creazione-libro-sonno').check();
    await tel.getByTestId('creazione-prepara-sonno').check();
    await foto(tel, 'tm-libro');
    await conferma(tel);
    // p. 3: the magic-user's d4 + Costituzione (11: +0).
    await expect(tel.getByTestId('creazione-tiro-per')).toHaveText('Punti ferita del 1° livello');
    await dadi(tel, [4]);
    // p. 3: 3d6 × 10 gold pieces.
    await dadi(tel, [4, 5, 6]);
    await tel.getByTestId('creazione-compra-pugnale').click();
    await expect(tel.getByTestId('creazione-voce-spadone')).toContainText('−5 a colpire');
    await tel.getByTestId('creazione-tipo-attrezzo').click();
    await tel.getByTestId('creazione-compra-libro_degli_incantesimi').click();
    await expect(tel.getByTestId('creazione-monete')).toContainText('123 mo');
    await foto(tel, 'tm-acquisti');
    await conferma(tel);
    // p. 4: Intelligenza 16 (+2): two languages more.
    await tel.getByTestId('creazione-lingua-goblin').check();
    await tel.getByTestId('creazione-lingua-orchesco').check();
    await conferma(tel);
    await tel.getByTestId('creazione-nome').fill('Ninfea');
    await conferma(tel);
    await expect(tel.getByTestId('creazione-riepilogo')).toHaveAttribute('data-stato', 'pronta');
    await foto(tel, 'tm-pronto');
    const m = await master(browser, URL_TM);
    const id = (await m.locator('[data-bozza]').first().getAttribute('data-bozza'))!;
    await m.getByTestId(`master-creazione-${id}-approva`).click();
    await expect(tel.getByTestId('nome-pg')).toHaveText('Ninfea', { timeout: 30_000 });
    await foto(tel, 'tm-al-tavolo');
    expect(errori).toEqual([]);
  });
});
