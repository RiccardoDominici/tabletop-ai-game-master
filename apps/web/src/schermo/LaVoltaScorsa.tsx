/**
 * La carta «La volta scorsa…» del proiettore: il riassunto letto all'inizio di una serata che
 * continua. Sta nell'intestazione, sopra la scena, con un testo piccolo: non copre il luogo né la
 * narrazione. Il server la toglie quando si chiude la prima finestra (stato.la_volta_scorsa).
 */
import { t } from '../lingua';

export function LaVoltaScorsa({ testo }: { testo: string }) {
  return (
    <aside
      data-testid="la-volta-scorsa"
      className="max-w-[58vw] rounded-[1vw] border border-bordo/70 bg-notte/80 px-[1.4vw] py-[1.1vh] shadow-profonda"
    >
      <p className="text-[0.95vw] tracking-[0.25em] text-candela uppercase">{t('schermo.volta_scorsa')}</p>
      <p className="mt-[0.6vh] text-[1.35vw] leading-snug text-pergamena">{testo}</p>
    </aside>
  );
}
