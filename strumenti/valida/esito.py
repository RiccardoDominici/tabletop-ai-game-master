"""Raccolta dei risultati della validazione: errori e avvisi, ognuno con un codice di classe.

Il codice ha la forma `CLASSE.regola` (es. `PNG.sa_non_sa`): la classe dice quale famiglia di regole
del manuale è violata, la regola quale controllo preciso. I test controllano i codici, non i messaggi.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Classi di errore, con la parte del manuale (docs/manuale-master.md) o del documento che le fonda.
CLASSI = {
    "STRUTTURA": "file mancanti, YAML illeggibile, campi obbligatori assenti",
    "STILE": "carta di stile e C1 (premessa, tono, linee e veli, [STILE], musica)",
    "CANONE": "registro dei fatti (E10): id unici, riferimenti esistenti",
    "PNG": "scheda PNG obbligatoria (§3) e controlli incrociati",
    "SCENA": "scheda scena/luogo (§4)",
    "INDIZI": "regola dei tre indizi e colli di bottiglia (C4)",
    "FRONTI": "fronti, pericoli, orologi, cattivo, segreti astratti, archi (C2, C3, C6, C8)",
    "GRAFO": "nodi e collegamenti senza vicoli ciechi (C5)",
    "SESSIONE": "inizio forte, cinque stanze, scene potenziali, chiusura (C9–C13)",
    "PG": "personaggi giocanti e conoscenze private (T9)",
    "PROSA": "scrittura per l'ascolto (§5, §6: N1, N2, N5, N11, D3)",
    "REPERTORIO": "schema delle battute e riferimenti (docs/repertorio.md)",
    "COPERTURA": "copertura minima del repertorio: indizi, menzogne, confessioni, segni, finali, voce",
    "SEGRETI": "parole segrete: nulla di nascosto nei campi pubblici o nel catalogo del selettore",
    "IMMAGINI": "prompt delle immagini (strumenti/immagini): [STILE], luoghi, tratti visibili",
    "MONDO": "cronologia e logistica (preparazione): eventi in ordine, date dei documenti, tempi e capienze",
    "AUDIO": "campi espliciti dell'audio (docs/audio.md): vocabolario chiuso, motivo, niente segreti nei temi",
}


@dataclass
class Voce:
    gravita: str          # "errore" | "avviso"
    codice: str           # CLASSE.regola
    dove: str             # file o id
    messaggio: str

    def __str__(self) -> str:
        etichetta = "ERRORE" if self.gravita == "errore" else "AVVISO"
        return f"{etichetta:<7} [{self.codice}] {self.dove}: {self.messaggio}"


@dataclass
class Esito:
    """Accumula le voci. `rigoroso` trasforma in errori gli avvisi marcati come «rigorosi»."""

    rigoroso: bool = False
    voci: list[Voce] = field(default_factory=list)

    def errore(self, codice: str, dove: str, messaggio: str) -> None:
        self._controlla_codice(codice)
        self.voci.append(Voce("errore", codice, dove, messaggio))

    def avviso(self, codice: str, dove: str, messaggio: str, rigoroso: bool = False) -> None:
        """Un avviso; se `rigoroso` e la validazione è rigorosa, diventa un errore."""
        self._controlla_codice(codice)
        gravita = "errore" if (rigoroso and self.rigoroso) else "avviso"
        self.voci.append(Voce(gravita, codice, dove, messaggio))

    @staticmethod
    def _controlla_codice(codice: str) -> None:
        classe = codice.split(".", 1)[0]
        if classe not in CLASSI:
            raise ValueError(f"classe di errore sconosciuta: {codice}")

    @property
    def errori(self) -> list[Voce]:
        return [v for v in self.voci if v.gravita == "errore"]

    @property
    def avvisi(self) -> list[Voce]:
        return [v for v in self.voci if v.gravita == "avviso"]

    def codici(self) -> set[str]:
        return {v.codice for v in self.errori}
