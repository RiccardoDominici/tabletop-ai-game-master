"""Prova dei `temi` del repertorio sui copioni dell'esperimento (esperimenti/copioni/*.yaml).

Per ogni azione scritta dai giocatori simula il prefiltro del Motore (versione 2 del repertorio):
una battuta selezionabile entra nel catalogo se una parola dei suoi `temi` compare, come parola
intera, nel testo dell'azione. Controlla due cose:
  - richiamo: la battuta che deve rispondere all'azione (ATTESE, scritto a mano) è nel catalogo;
  - rumore: quante battute selezionabili entrano senza c'entrare.
Le battute solo_esempio e riempitivo non entrano mai per temi. I PNG nominati non sono simulati:
li aggiunge il Motore, e allargano il catalogo comunque.

Uso: python copertura_copioni.py campagne/prova-f0 esperimenti/copioni
"""
import re
import statistics
import sys
from pathlib import Path

import yaml

# (copione, turno, pg) -> battute che devono poter rispondere (almeno una nel catalogo).
# Le azioni senza voce qui (meta, fuori tema, domande senza battuta) si improvvisano.
ATTESE = {
    ("indagine", 1, "pg_assenzio"): ["ott_forestiero"],
    ("indagine", 2, "pg_teodora"): ["bal_chi_e", "ott_forestiero"],
    ("indagine", 2, "pg_ginestra"): ["ott_malati"],
    ("indagine", 3, "pg_teodora"): ["nar_preghiera"],
    ("indagine", 4, "pg_ginestra"): ["nar_pagnotta_spezza"],
    ("indagine", 5, "pg_assenzio"): ["tr_retro", "nar_cantina"],
    ("indagine", 5, "pg_teodora"): ["bal_rintocco"],
    ("indagine", 6, "pg_teodora"): ["nar_libro_rito"],
    ("indagine", 6, "pg_ginestra"): ["ott_segale_versione"],
    ("indagine", 8, "pg_ginestra"): ["ott_brucia_sacchi"],
    ("indagine", 8, "pg_assenzio"): ["ott_segale_passato"],
    ("pressione", 1, "pg_corrado"): ["bal_rintocco"],
    ("pressione", 1, "pg_assenzio"): ["ott_forestiero"],
    ("pressione", 2, "pg_teodora"): ["ott_forestiero", "bal_chi_e"],
    ("pressione", 3, "pg_assenzio"): ["nar_serratura"],
    ("pressione", 3, "pg_corrado"): ["seb_mestiere_versione", "seb_guerra_versione"],
    ("pressione", 5, "pg_teodora"): ["ott_accusa"],
    ("pressione", 5, "pg_corrado"): ["ott_pane_prima"],
    ("pressione", 6, "pg_teodora"): ["ott_niente_benedizione"],
    ("pressione", 6, "pg_assenzio"): ["tr_retro", "nar_cantina"],
    ("pressione", 7, "pg_corrado"): ["nar_spallata"],
    ("pressione", 7, "pg_teodora"): ["nar_preghiera"],
}
RUMORE_MAX = 6  # oltre questo numero di battute non pertinenti in un'azione, avviso


def parole(t):
    return set(re.findall(r"[a-zàèéìòù]+", t.lower()))


def main(campagna, copioni):
    battute = []
    for f in sorted(Path(campagna, "repertorio").glob("*.yaml")):
        d = yaml.safe_load(open(f, encoding="utf-8"))
        battute += d.get("battute", []) if isinstance(d, dict) else []
    selezionabili = [b for b in battute if not b.get("solo_esempio") and not b.get("riempitivo")]
    errori = avvisi = 0
    rumori = []
    for f in sorted(Path(copioni).glob("*.yaml")):
        nome = f.stem
        cop = yaml.safe_load(open(f, encoding="utf-8"))
        print(f"\n== {nome} ==")
        for n, turno in enumerate(cop["turni"], 1):
            for a in turno:
                w = parole(a["azione"])
                catalogo = [b["id"] for b in selezionabili if w & {t.lower() for t in b["temi"]}]
                attese = ATTESE.get((nome, n, a["pg"]), [])
                rumore = [x for x in catalogo if x not in attese]
                rumori.append(len(rumore))
                stato = "ok"
                if attese and not set(attese) & set(catalogo):
                    errori += 1
                    stato = "MANCA " + "/".join(attese)
                elif len(rumore) > RUMORE_MAX:
                    avvisi += 1
                    stato = f"rumore {len(rumore)}"
                print(f"  T{n} {a['pg'][3:]:<9} {stato:<28} catalogo {len(catalogo):>2}: {', '.join(catalogo)[:110]}")
    print(f"\nRumore per azione: media {statistics.mean(rumori):.1f}, mediana {statistics.median(rumori)}, massimo {max(rumori)}")
    print(f"Risultato: {errori} azioni senza la battuta attesa, {avvisi} azioni con rumore oltre {RUMORE_MAX}")
    return errori


if __name__ == "__main__":
    sys.exit(1 if main(sys.argv[1], sys.argv[2]) else 0)
