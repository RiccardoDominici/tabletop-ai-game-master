#!/usr/bin/env python3
"""
conta.py — metriche di "prosa per l'orecchio" sulle trascrizioni cieche.

Per ogni trascrizione:
  - estrae le righe [narratore] per turno (il Turno 0 è testo fisso: escluso dalle
    statistiche principali, riportato a parte);
  - spezza in frasi (fine frase = . ! ? eventualmente seguiti da » o ", poi spazio/fine);
  - conta le parole (token separati da spazi che contengono almeno una lettera;
    "all'osteria" vale una parola);
  - calcola media, mediana, % frasi > 16 parole, % frasi > 20 parole (limite N1);
  - frasi e parole per blocco (limite N2: 4 frasi / ~60 parole);
  - se il blocco del narratore si chiude con una domanda (N9/A13);
  - indirizzo in seconda persona (vocativi del PG + pronomi/possessivi di 2a persona)
    contro menzioni dei PG in terza persona (nome non vocativo, o ruolo: "la chierica"...).
    Le menzioni in terza persona vengono stampate con il contesto per verifica manuale.

Uso:  python3 -I conta.py <cartella con le trascrizioni>
"""
import re
import statistics
import sys
from pathlib import Path

PG_NOMI = ["Ginestra", "Assenzio", "Teodora", "Corrado"]
# Ruoli con cui il narratore potrebbe riferirsi a un PG in terza persona.
PG_RUOLI = [r"la chierica", r"la sacerdotessa", r"il soldato", r"il balestriere",
            r"il tiefling", r"l'halfling", r"la druida", r"l'erborista", r"il ladro"]
# Pronomi e possessivi di seconda persona (singolare e plurale).
SECONDA = r"\b(tu|ti|te|tuo|tua|tuoi|tue|voi|vi|vostro|vostra|vostri|vostre)\b"

RE_TURNO = re.compile(r"^## Turno (\d+)")
RE_FRASE = re.compile(r"(?<=[.!?])[»\"]?\s+")


def parole(frase: str) -> int:
    """Numero di parole: token con almeno una lettera."""
    return sum(1 for t in frase.split() if re.search(r"[A-Za-zÀ-ÿ]", t))


def frasi_di(riga: str) -> list[str]:
    """Spezza una riga in frasi; elimina i pezzi vuoti."""
    pezzi = RE_FRASE.split(riga.strip())
    return [p.strip() for p in pezzi if parole(p) > 0]


def leggi(path: Path) -> dict[int, list[str]]:
    """Ritorna {turno: [testo delle righe narratore]} leggendo solo i blocchi ```text."""
    turni: dict[int, list[str]] = {}
    turno = None
    in_blocco = False
    for riga in path.read_text(encoding="utf-8").splitlines():
        m = RE_TURNO.match(riga)
        if m:
            turno = int(m.group(1))
            turni.setdefault(turno, [])
            continue
        if riga.startswith("```"):
            in_blocco = not in_blocco
            continue
        if in_blocco and turno is not None and riga.startswith("[narratore]"):
            turni[turno].append(riga[len("[narratore]"):].strip())
    return turni


def menzioni(testo: str):
    """Classifica le menzioni dei PG: vocativo (2a persona) o terza persona."""
    voc, terza = [], []
    for nome in PG_NOMI:
        for m in re.finditer(rf"\b{nome}\b", testo):
            prima = testo[:m.start()].rstrip()
            dopo = testo[m.end():m.end() + 1]
            inizio_frase = prima == "" or prima[-1] in ".!?:»"
            tra_virgole = prima.endswith(",") and dopo in [",", ":"]
            if (inizio_frase and dopo in [",", ":"]) or tra_virgole:
                voc.append(nome)
            else:
                a, b = max(0, m.start() - 40), min(len(testo), m.end() + 40)
                terza.append(f"{nome}: …{testo[a:b]}…")
    for ruolo in PG_RUOLI:
        for m in re.finditer(ruolo, testo, flags=re.IGNORECASE):
            a, b = max(0, m.start() - 40), min(len(testo), m.end() + 40)
            terza.append(f"[ruolo] {m.group(0)}: …{testo[a:b]}…")
    return voc, terza


def analizza(path: Path):
    turni = leggi(path)
    tutte, righe_turni = [], []
    voc_tot, sec_tot, terza_tot = 0, 0, []
    for t in sorted(turni):
        if t == 0:
            continue  # apertura fissa, identica nelle due versioni
        testo = " ".join(turni[t])
        fr = [f for r in turni[t] for f in frasi_di(r)]
        lung = [parole(f) for f in fr]
        tutte.extend(lung)
        chiude_domanda = bool(fr) and fr[-1].rstrip("»\" ").endswith("?")
        voc, terza = menzioni(testo)
        sec = len(re.findall(SECONDA, testo, flags=re.IGNORECASE))
        voc_tot += len(voc)
        sec_tot += sec
        terza_tot.extend(f"T{t} {x}" for x in terza)
        righe_turni.append((t, len(fr), sum(lung), max(lung) if lung else 0,
                            chiude_domanda, len(voc), sec, len(terza)))
        lunghe = [(n, f) for n, f in zip(lung, fr) if n > 16]
        for n, f in lunghe:
            print(f"   frase>16  T{t} ({n}): {f}")
    return tutte, righe_turni, voc_tot, sec_tot, terza_tot


def main():
    cartella = Path(sys.argv[1])
    for nome in ["indagine-X", "indagine-Y", "pressione-X", "pressione-Y"]:
        path = cartella / f"{nome}.md"
        print(f"\n=== {nome} ===")
        tutte, righe, voc, sec, terza = analizza(path)
        n = len(tutte)
        print(f"frasi narratore (T1-T8): {n}")
        print(f"parole/frase: media {statistics.mean(tutte):.1f}, mediana {statistics.median(tutte):.1f}, "
              f"max {max(tutte)}")
        print(f"% frasi >16 parole: {100 * sum(x > 16 for x in tutte) / n:.1f}%   "
              f"% frasi >20 parole (N1): {100 * sum(x > 20 for x in tutte) / n:.1f}%")
        print("turno | frasi | parole | max | chiude con domanda | vocativi | pronomi 2a | menzioni 3a")
        for r in righe:
            print(f"  T{r[0]}  |  {r[1]:>3}  |  {r[2]:>4}  | {r[3]:>3} | {'sì' if r[4] else 'no':>3} | "
                  f"{r[5]:>3} | {r[6]:>3} | {r[7]:>3}")
        blocchi_oltre = sum(1 for r in righe if r[1] > 4)
        print(f"blocchi oltre 4 frasi (N2): {blocchi_oltre}/{len(righe)}; "
              f"blocchi oltre 60 parole: {sum(1 for r in righe if r[2] > 60)}/{len(righe)}")
        print(f"chiusure con domanda: {sum(1 for r in righe if r[4])}/{len(righe)}")
        print(f"seconda persona: vocativi {voc} + pronomi/possessivi {sec} = {voc + sec}; "
              f"menzioni in terza persona: {len(terza)}")
        for x in terza:
            print(f"   3a persona  {x}")


if __name__ == "__main__":
    main()
