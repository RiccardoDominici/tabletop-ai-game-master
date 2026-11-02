"""Validatore di una cartella di campagna contro il manuale del master (docs/manuale-master.md, E1)
e il documento del repertorio (docs/repertorio.md).

    python3 -I strumenti/valida_campagna.py campagne/<id>
    python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso        regole per le campagne nuove
    python3 -I strumenti/valida_campagna.py campagne/<id> --copioni esperimenti/copioni
    python3 -I strumenti/valida_campagna.py campagne/<id> --classi          elenco delle classi di errore

Uscita: 0 se non ci sono errori (gli avvisi non contano), 1 se ce n'è almeno uno, 2 se gli argomenti
sono sbagliati. Ogni riga ha un codice `CLASSE.regola`: la classe dice quale parte del manuale è violata.

--rigoroso trasforma in errori gli avvisi pensati per le campagne nuove scritte con la skill
`preparatore`: confessioni senza cancello (`richiede.privata`, `da_pg`, indizi), menzogne senza id,
indizi senza `modi`, PNG senza `alias`, temi generici, tratti nascosti nei prompt delle immagini.

Serve solo PyYAML. Le regole stanno in strumenti/valida/ (un modulo per famiglia di regole).
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # con -I la cartella dello script non è nel path

from valida import CLASSI, valida  # noqa: E402
from valida import copioni as prova_copioni  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Valida una campagna di Cantastorie.")
    ap.add_argument("cartella", nargs="?", help="cartella della campagna, es. campagne/prova-f0")
    ap.add_argument("--rigoroso", action="store_true", help="regole piene per le campagne nuove")
    ap.add_argument("--voci", type=Path, help="registro delle voci (predefinito: assets/voci/voci.yaml risalendo)")
    ap.add_argument("--copioni", type=Path, help="cartella di copioni di azioni: misura il catalogo per azione")
    ap.add_argument("--avvisi", action="store_true", help="mostra anche gli avvisi (predefinito: solo il conteggio)")
    ap.add_argument("--classi", action="store_true", help="elenca le classi di errore ed esce")
    a = ap.parse_args(argv)
    if a.classi:
        for k, v in CLASSI.items():
            print(f"{k:<11} {v}")
        return 0
    if not a.cartella:
        ap.print_usage(sys.stderr)
        return 2
    esito, campagna = valida(Path(a.cartella), rigoroso=a.rigoroso, voci=a.voci)
    for v in esito.errori:
        print(v)
    if a.avvisi:
        for v in esito.avvisi:
            print(v)
    if a.copioni:
        print("\n== Catalogo per azione (copioni) ==")
        for riga in prova_copioni.controlla(campagna, esito, a.copioni):
            print(f"  {riga}")
    per_classe = Counter(v.codice.split(".")[0] for v in esito.errori)
    sintesi = ", ".join(f"{k} {n}" for k, n in sorted(per_classe.items())) or "nessuno"
    modo = "rigoroso" if a.rigoroso else "normale"
    print(f"\n{campagna.cartella}: {len(esito.errori)} errori ({sintesi}), {len(esito.avvisi)} avvisi — modo {modo}, "
          f"{len(campagna.scene)} scene, {len(campagna.png)} PNG, {len(campagna.battute)} battute")
    return 1 if esito.errori else 0


if __name__ == "__main__":
    sys.exit(main())
