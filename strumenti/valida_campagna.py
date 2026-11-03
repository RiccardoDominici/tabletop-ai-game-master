"""Validatore di una cartella di campagna contro il manuale del master (docs/manuale-master.md, E1)
e il documento del repertorio (docs/repertorio.md).

    python3 -I strumenti/valida_campagna.py campagne/<id>
    python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso        regole per le campagne nuove
    python3 -I strumenti/valida_campagna.py campagne/<id> --copioni esperimenti/copioni
    python3 -I strumenti/valida_campagna.py campagne/<id> --solo STILE,CANONE   solo alcune classi (controlli parziali)
    python3 -I strumenti/valida_campagna.py campagne/<id> --sessione 2      il pacchetto sessioni/02/, unito alla campagna
    python3 -I strumenti/valida_campagna.py campagne/<id> --classi          elenco delle classi di errore

Uscita: 0 se non ci sono errori (gli avvisi non contano), 1 se ce n'è almeno uno, 2 se gli argomenti
sono sbagliati. Ogni riga ha un codice `CLASSE.regola`: la classe dice quale parte del manuale è violata.

--rigoroso trasforma in errori gli avvisi pensati per le campagne nuove scritte con la skill
`preparatore`: confessioni senza cancello (`richiede.privata`, `da_pg`, indizi), menzogne senza id,
indizi senza `modi`, PNG senza `alias`, temi generici, tratti nascosti nei prompt delle immagini.

--solo serve ai controlli dei passi intermedi della skill: mostra (e conta nel codice d'uscita) solo le
classi o i codici elencati, così un passo non chiede di correggere errori di file non ancora scritti.

Serve PyYAML. Il contesto vero del modo B si compila con node (strumenti/contesto_modo_b.ts): senza
node, o con --senza-node, quel controllo diventa un avviso. Le regole stanno in strumenti/valida/.
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # con -I la cartella dello script non è nel path

from valida import CLASSI, valida  # noqa: E402
from valida import copioni as prova_copioni  # noqa: E402
from valida.pacchetto import valida_pacchetto  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Valida una campagna di Cantastorie.")
    ap.add_argument("cartella", nargs="?", help="cartella della campagna, es. campagne/prova-f0")
    ap.add_argument("--rigoroso", action="store_true", help="regole piene per le campagne nuove")
    ap.add_argument("--voci", type=Path, help="registro delle voci (predefinito: assets/voci/voci.yaml risalendo)")
    ap.add_argument("--copioni", type=Path, help="cartella di copioni di azioni: misura il catalogo per azione")
    ap.add_argument("--avvisi", action="store_true", help="mostra anche gli avvisi (predefinito: solo il conteggio)")
    ap.add_argument("--senza-node", action="store_true",
                    help="non compilare il contesto vero del modo B (strumenti/contesto_modo_b.ts): resta un avviso")
    ap.add_argument("--solo", help="classi o codici da mostrare, separati da virgole (es. STILE,CANONE,SCENA.voci)")
    ap.add_argument("--sessione", type=int, help="valida il pacchetto sessioni/<nn>/ unito alla campagna, più STATO e CONTINUITÀ")
    ap.add_argument("--classi", action="store_true", help="elenca le classi di errore ed esce")
    a = ap.parse_args(argv)
    if a.classi:
        for k, v in CLASSI.items():
            print(f"{k:<11} {v}")
        return 0
    if not a.cartella:
        ap.print_usage(sys.stderr)
        return 2
    solo = [x.strip() for x in (a.solo or "").split(",") if x.strip()]
    sconosciute = [x for x in solo if x.split(".")[0] not in CLASSI]
    if sconosciute:
        print(f"--solo: classi sconosciute {sconosciute} (vedi --classi)", file=sys.stderr)
        return 2
    # Senza le regole del modo B, se --solo non le chiede: risparmia la compilazione con node.
    serve_b = not solo or any(x.split(".")[0] == "SEGRETI" for x in solo)
    if a.sessione:
        try:
            esito, campagna = valida_pacchetto(Path(a.cartella), a.sessione, a.rigoroso, a.voci, serve_b and not a.senza_node)
        except RuntimeError as err:
            print(f"pacchetto della sessione {a.sessione} non validabile: {err}", file=sys.stderr)
            return 1
    else:
        esito, campagna = valida(Path(a.cartella), rigoroso=a.rigoroso, voci=a.voci, contesto_b=serve_b and not a.senza_node)
    if solo:
        tieni = lambda v: any(v.codice == x or v.codice.split(".")[0] == x for x in solo)  # noqa: E731
        esito.voci = [v for v in esito.voci if tieni(v)]
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
    modo = ("rigoroso" if a.rigoroso else "normale") + (f", solo {','.join(solo)}" if solo else "")
    print(f"\n{campagna.cartella}: {len(esito.errori)} errori ({sintesi}), {len(esito.avvisi)} avvisi — modo {modo}, "
          f"{len(campagna.scene)} scene, {len(campagna.png)} PNG, {len(campagna.battute)} battute")
    return 1 if esito.errori else 0


if __name__ == "__main__":
    sys.exit(main())
