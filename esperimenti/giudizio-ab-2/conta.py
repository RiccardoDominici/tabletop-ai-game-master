#!/usr/bin/env python3
"""
conta.py - metriche di "prosa per l'orecchio" sulle trascrizioni cieche (giudizio2/cieco/*.md).

Cosa misura (solo righe generate: il Turno 0 e' testo fisso della scena, identico nei 4 file,
e viene escluso dalle medie; lo si riporta a parte per riferimento):
  - parole per frase delle righe [narratore]: media, mediana, % > 16, % > 20, massimo, elenco > 20;
  - frasi per segmento [narratore] e segmenti con piu' di 4 frasi;
  - frasi e parole del narratore per turno (blocco N2: max 4 frasi / ~60 parole);
  - battute PNG (righe consecutive dello stesso PNG unite) con piu' di 2 frasi (D3);
  - chiusure: ultima riga parlata del turno; domanda o invito? del narratore o di un PNG?;
  - indirizzo ai PG: vocativi (Nome, ...), menzioni in terza persona, marcatori di 2a persona;
  - lista nera N5 e "all'improvviso";
  - righe identiche ripetute nello stesso file.

Convenzioni:
  - frase = testo chiuso da . ! ? (anche seguiti da virgolette/caporali); ':' e ';' NON chiudono;
  - parola = token separato da spazi che contiene almeno una lettera o cifra
    ("l'oste" conta 1, come nei contatori di parole comuni).

Uso:  python3 -I conta.py <cartella_trascrizioni>
"""
import os
import re
import sys
import statistics
from collections import Counter, defaultdict

PG_NOMI = ["Ginestra", "Corrado", "Teodora", "Assenzio"]

# Lista nera N5 (cliche' e aggettivi che nominano l'emozione) + qualche variante.
LISTA_NERA = [
    r"brivid\w* lungo la schiena", r"sangue gelato", r"aria (?:e' |è )?(?:densa|carica)",
    r"silenzio assordante", r"tempo si fosse fermato", r"non potete fare a meno",
    r"qualcosa non va", r"aura di mistero", r"danza di ombre",
    r"inquietant\w*", r"misterios\w*", r"terrificant\w*", r"mozzafiato", r"\bepic\w*",
    r"all'improvviso", r"improvvis\w*", r"nocche (?:diventano )?bianche", r"ha paura",
    r"silenzio (?:si fa|pesa)", r"quiete strana", r"un'ombra",
]

# Formule di invito/domanda in chiusura (N9).
INVITO_RE = re.compile(
    r"(che fate|cosa fate|che fai|cosa fai|tocca a te|a te la parola|che fai ora|cosa fate ora)",
    re.IGNORECASE,
)

RIGA_RE = re.compile(r"^\[([a-z_]+)\]\s?(.*)$")
TURNO_RE = re.compile(r"^## Turno (\d+)")
# Fine frase: . ! ? (anche ...) eventualmente seguiti da virgolette di chiusura.
FINE_FRASE_RE = re.compile(r"(?<=[.!?…])[»\"”']?\s+")
PAROLA_RE = re.compile(r"[A-Za-zÀ-ÿ0-9]")

MARCATORI_2S = re.compile(r"\b(ti|tu|tuo|tua|tuoi|tue|te)\b", re.IGNORECASE)
MARCATORI_2P = re.compile(r"\b(vi|voi|vostro|vostra|vostri|vostre|vedete|sentite|fate)\b", re.IGNORECASE)


def frasi(testo):
    """Spezza un testo in frasi (vedi convenzioni)."""
    pezzi = [p.strip() for p in FINE_FRASE_RE.split(testo.strip()) if p.strip()]
    return [p for p in pezzi if PAROLA_RE.search(p)]


def parole(frase):
    return [t for t in frase.split() if PAROLA_RE.search(t)]


def leggi_turni(path):
    """Ritorna {turno: [(speaker, testo), ...]} leggendo solo i blocchi ```text."""
    turni = defaultdict(list)
    turno = None
    dentro = False
    with open(path, encoding="utf-8") as f:
        for riga in f:
            riga = riga.rstrip("\n")
            m = TURNO_RE.match(riga)
            if m:
                turno = int(m.group(1))
                continue
            if riga.startswith("```"):
                dentro = not dentro
                continue
            if dentro and turno is not None:
                m = RIGA_RE.match(riga.strip())
                if m:
                    turni[turno].append((m.group(1), m.group(2)))
    return turni


def analizza(path):
    nome = os.path.basename(path)
    turni = leggi_turni(path)
    out = []
    p = out.append
    p(f"=== {nome} ===")

    lunghezze = []          # parole per frase del narratore (turni >= 1)
    lunghe = []             # frasi > 20 parole
    seg_oltre4 = []         # segmenti narratore con > 4 frasi
    blocchi = []            # (turno, frasi_narr, parole_narr, frasi_png, n_segmenti)
    d3 = []                 # battute PNG con > 2 frasi
    chiusure = []
    vocativi = Counter()
    terza = []              # menzioni di PG non vocative
    s2 = s2p = 0
    nera = []
    righe_viste = Counter()
    domande_narr = 0

    for t in sorted(turni):
        segmenti = turni[t]
        parlate = [(s, x) for s, x in segmenti if s not in ("invito", "orologio")]
        fn = wn = fp = 0
        # battute PNG unite se consecutive e dello stesso PNG
        prec, buf = None, []
        battute = []
        for s, x in parlate:
            if s.startswith("png_"):
                if s == prec:
                    buf.append(x)
                else:
                    if prec and prec.startswith("png_"):
                        battute.append((prec, " ".join(buf)))
                    prec, buf = s, [x]
            else:
                if prec and prec.startswith("png_"):
                    battute.append((prec, " ".join(buf)))
                prec, buf = s, []
        if prec and prec.startswith("png_"):
            battute.append((prec, " ".join(buf)))

        for s, x in parlate:
            if t >= 1:
                righe_viste[(s, x)] += 1
            fr = frasi(x)
            if s == "narratore":
                fn += len(fr)
                for f in fr:
                    n = len(parole(f))
                    wn += n
                    if t >= 1:
                        lunghezze.append(n)
                        if n > 20:
                            lunghe.append((t, n, f))
                        if f.rstrip("»\"” ").endswith("?"):
                            domande_narr += 1
                if t >= 1 and len(fr) > 4:
                    seg_oltre4.append((t, len(fr)))
                if t >= 1:
                    for pat in LISTA_NERA:
                        for m in re.finditer(pat, x, re.IGNORECASE):
                            nera.append((t, m.group(0)))
                    # indirizzo
                    s2 += len(MARCATORI_2S.findall(x))
                    s2p += len(MARCATORI_2P.findall(x))
                    for nomepg in PG_NOMI:
                        for m in re.finditer(nomepg, x):
                            dopo = x[m.end():m.end() + 1]
                            prima = x[max(0, m.start() - 2):m.start()]
                            inizio = m.start() == 0 or prima.strip() in ("", ",", ":", ".")
                            if dopo in (",", ":") and inizio:
                                vocativi[nomepg] += 1
                            elif dopo == "," and prima.endswith(", "):
                                vocativi[nomepg] += 1  # vocativo interno: "..., Ginestra, ..."
                            else:
                                terza.append((t, nomepg, x))
            else:
                fp += len(fr)
        if t >= 1:
            for png, testo in battute:
                nf = len(frasi(testo))
                if nf > 2:
                    d3.append((t, png, nf, testo))
            blocchi.append((t, fn, wn, fp, len(parlate)))
            # chiusura: ultima riga parlata + destinatario dell'[invito]
            ultima = parlate[-1] if parlate else ("-", "")
            invito = [x for s, x in segmenti if s == "invito"]
            q = ultima[1].rstrip("»\"” ").endswith("?")
            inv = bool(INVITO_RE.search(ultima[1]))
            chiusure.append((t, ultima[0], q, inv, invito[0] if invito else "-", ultima[1]))

    # --- stampa ---
    if lunghezze:
        n = len(lunghezze)
        p(f"Frasi del narratore (turni 1-8): {n}")
        p(f"  parole/frase: media {statistics.mean(lunghezze):.1f}, mediana {statistics.median(lunghezze):.1f}, "
          f"max {max(lunghezze)}")
        p(f"  > 16 parole: {sum(1 for x in lunghezze if x > 16)} ({100*sum(1 for x in lunghezze if x > 16)/n:.0f}%)"
          f"   > 20 parole: {sum(1 for x in lunghezze if x > 20)} ({100*sum(1 for x in lunghezze if x > 20)/n:.0f}%)")
        p(f"  parole totali del narratore: {sum(lunghezze)}")
    p("  frasi > 20 parole:")
    for t, n_, f in lunghe:
        p(f"    T{t} ({n_}): {f}")
    p(f"Segmenti [narratore] con > 4 frasi: {len(seg_oltre4)} {seg_oltre4}")
    p("Blocchi per turno (turno, frasi narr, parole narr, frasi PNG, righe parlate):")
    for b in blocchi:
        flag = []
        if b[1] > 4:
            flag.append("N2>4 frasi")
        if b[2] > 60:
            flag.append(">60 parole")
        p(f"    T{b[0]}: {b[1]} frasi, {b[2]} parole, PNG {b[3]} frasi, {b[4]} righe  {' / '.join(flag)}")
    p(f"  turni con > 4 frasi del narratore: {sum(1 for b in blocchi if b[1] > 4)}/{len(blocchi)}; "
      f"con > 60 parole: {sum(1 for b in blocchi if b[2] > 60)}/{len(blocchi)}; "
      f"media frasi narratore/turno: {statistics.mean(b[1] for b in blocchi):.1f}")
    p(f"Battute PNG con > 2 frasi (D3, righe consecutive unite): {len(d3)}")
    for t, png, nf, testo in d3:
        p(f"    T{t} {png} ({nf}): {testo}")
    p("Chiusure (turno, chi parla per ultimo, domanda?, formula d'invito?, [invito]):")
    for t, chi, q, inv, invito, testo in chiusure:
        p(f"    T{t}: {chi:15s} domanda={'si' if q else 'no'} invito={'si' if inv else 'no'} [invito]={invito} | {testo[:90]}")
    p(f"  chiusure con domanda/invito del NARRATORE: "
      f"{sum(1 for c in chiusure if c[1]=='narratore' and (c[2] or c[3]))}/{len(chiusure)}; "
      f"chiusure con domanda di un PNG: {sum(1 for c in chiusure if c[1].startswith('png_') and c[2])}; "
      f"[invito] a un solo PG: {sum(1 for c in chiusure if c[4] != '-' and ',' not in c[4] and c[4] != 'tutti')}")
    p(f"Domande del narratore in tutta la trascrizione (turni 1-8): {domande_narr}")
    p(f"Indirizzo: vocativi ai PG {dict(vocativi)} (tot {sum(vocativi.values())}); "
      f"marcatori 2a sing. {s2}, 2a plur. {s2p}")
    p(f"  menzioni non vocative (da verificare a mano, possibile 3a persona): {len(terza)}")
    for t, nomepg, x in terza:
        p(f"    T{t} [{nomepg}] {x}")
    p(f"Lista nera N5 / formule sospette: {nera}")
    dup = [(k, v) for k, v in righe_viste.items() if v > 1]
    p(f"Righe identiche ripetute: {dup}")
    # Turno 0 a parte
    if 0 in turni:
        l0 = [len(parole(f)) for s, x in turni[0] if s == "narratore" for f in frasi(x)]
        p(f"(Turno 0 fisso: {len(l0)} frasi, media {statistics.mean(l0):.1f} parole, max {max(l0)})")
    p("")
    return "\n".join(out)


def main():
    cartella = sys.argv[1] if len(sys.argv) > 1 else "cieco"
    for nome in ["caotico-X.md", "caotico-Y.md", "cauto-X.md", "cauto-Y.md"]:
        print(analizza(os.path.join(cartella, nome)))


if __name__ == "__main__":
    main()
