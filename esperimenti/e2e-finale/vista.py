"""The evidence view of one scripted run, for the blind judge of the final round.

    python3 -I esperimenti/e2e-finale/vista.py <results dir> > vista.md

Input: a results folder written by the harness and esperimenti/risultati/finale/giro.sh: its `tavolo.md` (what the
table heard, turn by turn, with the dice cards the projector showed) and `log-server/server.jsonl` (the server's
log, tokens already masked). Output on stdout: «# Evidence view: <run>», then each section of tavolo.md («Apertura»,
«Turno N») followed by «**Engine log for this turn:**», the engine records of that turn chosen by vista_eventi.py
(facts, cards with numbers, who is out of play, combat order, WARN guard events, world/stall/clock lines, the rule
modules). The judge's brief (esperimenti/risultati/finale/finale*-brief-giudice.md) describes how to read it.

A turn the engine logged but the table heard nothing of still gets its section, so no engine fact is lost. Runs made
before the harness wrote the dice cards into tavolo.md (A32) get them from the log's «prove: tiri del turno».
Progress and anomalies go to stderr, never into the view.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vista_eventi import APERTURA, eventi_per_turno, leggi_eventi, riga_evento  # noqa: E402

TITOLO_SEZIONE = re.compile(r"^## (Apertura|Turno (\d+))\b.*$", re.M)
CARTE = "*Carte dei dadi sul proiettore:*"


def sezioni(tavolo: str) -> tuple[str, list[tuple[int, str]]]:
    """tavolo.md split into its preamble and its sections, each with its turn number (APERTURA for the opening)."""
    pezzi = list(TITOLO_SEZIONE.finditer(tavolo))
    if not pezzi:
        return tavolo, []
    preambolo = tavolo[: pezzi[0].start()]
    out: list[tuple[int, str]] = []
    for i, m in enumerate(pezzi):
        fine = pezzi[i + 1].start() if i + 1 < len(pezzi) else len(tavolo)
        n = int(m.group(2)) if m.group(2) else APERTURA
        out.append((n, tavolo[m.start():fine].rstrip()))
    return preambolo, out


def carte_dal_log(eventi: list[dict]) -> dict[int, list[str]]:
    """The projector's cards per turn, from «prove: tiri del turno» (`tavolo`), for runs before A32."""
    carte: dict[int, list[str]] = {}
    for e in eventi:
        if e.get("msg") == "prove: tiri del turno" and e.get("tavolo"):
            carte.setdefault(int(e.get("turno") or 0), []).extend(str(t) for t in e["tavolo"])
    return carte


def componi(nome: str, tavolo: str, eventi: list[dict]) -> str:
    """The whole view as markdown."""
    per_turno = eventi_per_turno(eventi)
    preambolo, sez = sezioni(tavolo)
    vecchie_carte = carte_dal_log(eventi) if CARTE not in tavolo else {}
    presenti = {n for n, _ in sez}
    # Turns with engine records but no section at the table: added in their place, so no fact is lost.
    for n in sorted(set(per_turno) - presenti):
        sez.append((n, "## Apertura" if n == APERTURA else f"## Turno {n}\n\n*(nothing at the table this turn)*"))
        print(f"vista: turn {n} has engine records but no section in tavolo.md", file=sys.stderr)
    sez.sort(key=lambda s: s[0])
    out = [f"# Evidence view: {nome}\n", preambolo.rstrip() + "\n"]
    for n, testo in sez:
        out.append("\n" + testo + "\n")
        if vecchie_carte.get(n):
            out.append(f"\n{CARTE} " + " · ".join(vecchie_carte[n]) + "\n")
        righe = per_turno.get(n, [])
        if righe:
            out.append("\n**Engine log for this turn:**\n" + "\n".join(riga_evento(e) for e in righe) + "\n")
    return "".join(out)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        return 2
    ris = Path(argv[1])
    tavolo_md, log = ris / "tavolo.md", ris / "log-server" / "server.jsonl"
    if not tavolo_md.is_file():
        print(f"vista: {tavolo_md} missing", file=sys.stderr)
        return 1
    if not log.is_file():
        print(f"vista: {log} missing, the view has no engine log", file=sys.stderr)
    eventi = list(leggi_eventi(log.read_text(encoding="utf-8", errors="replace").splitlines())) if log.is_file() else []
    vista = componi(ris.name, tavolo_md.read_text(encoding="utf-8"), eventi)
    sys.stdout.write(vista)
    print(f"vista: {ris.name}: {len(eventi)} records, {vista.count(chr(10) + '- ')} in the view", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
