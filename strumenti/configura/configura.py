"""Setup of this computer: detect, choose the profile, write the local config, download what is needed.

    python3 -I strumenti/configura/configura.py                      show the detection and the profile; writes nothing
    python3 -I strumenti/configura/configura.py --out F             also write the profile's config/locale.yaml to F
    python3 -I strumenti/configura/configura.py --con-chiavi        offer the found keys as upgrades (applied)
    python3 -I strumenti/configura/configura.py --scarica           show sizes and free disk, then ask before downloading
    python3 -I strumenti/configura/configura.py --scarica --si      download without asking (after you have seen the sizes)

Nothing is written to config/locale.yaml unless --out says so: the real file belongs to the user.
Costs in plain words: local choices cost 0 USD; keys are pay-per-use and are never required.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # `python3 -I` leaves the script folder out of sys.path: add it back.

from profilo import alternative_leggere, fabbisogno_testo, scegli, scrivi_locale  # noqa: E402
from rileva import RADICE, rileva  # noqa: E402
import scarica  # noqa: E402

log = logging.getLogger("configura")


def riepilogo(rilevamento: dict, profilo: dict) -> list[str]:
    """Le righe per una persona: cosa c'è, cosa si sceglie, cosa costa, cosa resta fuori."""
    cpu = rilevamento["cpu"]
    righe = [
        f"This computer: {rilevamento['sistema']['os']}, {cpu['nome'] or 'chip not read'}, "
        f"RAM {rilevamento['ram_gb']} GB, free disk {rilevamento['disco_libero_gb']} GB.",
        f"Profile: {profilo['nome']} ({profilo['id']}). Interface language: {profilo['lingua']}.",
    ]
    for nome, scelta in profilo["componenti"].items():
        riserve = f" (fallback: {', '.join(scelta['riserve'])})" if scelta["riserve"] else ""
        righe.append(f"  {nome:<15} {scelta['provider']}{riserve}")
        righe.append(f"                  why: {scelta['motivo']}")
    righe.append("Cost: 0 USD with these local choices.")
    for offerta in profilo["chiavi_offerte"]:
        stato = "applied" if profilo["chiavi_applicate"] else "available, not applied (add --con-chiavi)"
        righe.append(f"Optional upgrade: {offerta['chiave']} for {offerta['sblocca']} ({offerta['nota']}): {stato}.")
    righe.append(f"Disk needed: {fabbisogno_testo(profilo['id'])}.")
    if rilevamento["disco_libero_gb"] is not None:
        righe.append(f"Free disk now: {rilevamento['disco_libero_gb']} GB.")
    for c in profilo.get("ambienti_mancanti", []):
        righe.append(f"NOT READY: the '{c}' environment is missing, so that choice falls back to its reserve "
                     "until setup step 2 creates it.")
    for avviso in profilo["avvisi"] + rilevamento["avvisi"]:
        righe.append(f"Note: {avviso}")
    return righe


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Detect this computer, choose the profile, write config, download.")
    parser.add_argument("--out", type=Path, help="write the profile's config/locale.yaml to this path")
    parser.add_argument("--con-chiavi", action="store_true", help="apply the keys found as upgrades")
    parser.add_argument("--scarica", action="store_true", help="download what the profile needs")
    parser.add_argument("--si", action="store_true", help="with --scarica: do not ask for confirmation")
    parser.add_argument("--json", action="store_true", help="print the detection and the profile as JSON")
    parser.add_argument("--lingua", choices=("it", "en"), default="it",
                        help="interface language written to config/locale.yaml (default: it)")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    rilevamento = rileva()
    profilo = scegli(rilevamento, applica_chiavi=args.con_chiavi, lingua=args.lingua)
    if args.json:
        print(json.dumps({"rilevamento": rilevamento, "profilo": profilo}, indent=2, ensure_ascii=False))
    else:
        print("\n".join(riepilogo(rilevamento, profilo)))

    if args.out:
        scrivi_locale(profilo, args.out)
        log.info("written %s (profile %s); the keys are not in it", args.out, profilo["id"])
        print(f"Written: {args.out}")

    if args.scarica:
        p = scarica.piano(profilo["modelli"], rilevamento, RADICE)
        print("\n".join(scarica.descrivi(p)))
        if not p["da_scaricare_gb"]:
            print("Nothing to download: everything is already on disk.")
            return 0
        if not p["spazio_ok"]:
            print("Lighter options that fit this disk (choose one, then run setup step 5 with its profile):")
            for alternativa in alternative_leggere():
                print(f"  - {alternativa}")
            return 3
        if not args.si:
            if not sys.stdin.isatty():
                print("Not confirmed. Run again with --si to download.")
                return 2
            risposta = input(f"Download about {p['da_scaricare_gb']} GB? [y/N] ").strip().lower()
            if risposta not in ("y", "s", "si", "yes"):
                print("Nothing downloaded.")
                return 0
        print("\n".join(scarica.esegui(p, RADICE)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
