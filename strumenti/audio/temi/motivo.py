"""Il motivo della campagna (poche battute, come DATI) e le sue variazioni per ogni PNG.

Un motivo è una lista di note in gradi della scala (0 = tonica; 7 = la tonica un'ottava sopra;
negativi sotto) con durate in movimenti (beat). Non contiene altezze assolute: la stessa melodia
diventa dorica, ionia o eolia a seconda del modo in cui la si realizza. Così ogni PNG ha una
variazione riconoscibile dello STESSO motivo della campagna (la campagna «suona» unita).

Da dove viene il motivo, in ordine:
  1. stile.audio.motivo, scritto dal Preparatore (o proposto da un LLM e incollato lì);
  2. un gancio esterno: la variabile d'ambiente TAGM_MOTIVO_GANCIO="modulo:funzione", una
     funzione che riceve il profilo della campagna e ritorna un dict {metro, note: [[grado, durata], ...]};
  3. il generatore deterministico qui sotto, seminato con l'id della campagna.
Tutto ciò che non viene dal generatore passa da `valida`: un modello scrive musica valida solo a
volte (docs/ricerca-audio.md), e un motivo sbagliato si scarta, non si «aggiusta» a caso.
"""

from __future__ import annotations

import importlib
import logging
import os
import random
import zlib
from dataclasses import dataclass, field, replace

log = logging.getLogger("audio.temi.motivo")


@dataclass(frozen=True)
class Nota:
    grado: int | None      # None = pausa
    durata: float          # in movimenti


@dataclass
class Motivo:
    note: list[Nota]
    metro: int             # movimenti per battuta (3 o 4)
    origine: str = "generato"

    @property
    def movimenti(self) -> float:
        return sum(n.durata for n in self.note)

    def come_dati(self) -> dict:
        return {"metro": self.metro, "origine": self.origine, "note": [[n.grado, n.durata] for n in self.note]}


@dataclass
class Evento:
    """Una nota realizzata: altezza MIDI, inizio e durata in movimenti, intensità 1–127."""
    altezza: int
    inizio: float
    durata: float
    intensita: int


@dataclass
class Variazione:
    eventi: list[Evento]
    movimenti: float
    trasformazioni: list[str] = field(default_factory=list)
    tonica: int = 60           # la tonica MIDI effettiva, dopo lo spostamento di registro


# --- Generatore deterministico ---------------------------------------------------------------
# Celle ritmiche cantabili, per battuta. L'ultima battuta finisce sempre su una nota lunga.
CELLE = {
    4: {"prime": [(1, 1, 1, 1), (1.5, 0.5, 1, 1), (2, 1, 1), (1, 1, 2), (0.5, 0.5, 1, 2), (1, 0.5, 0.5, 2)],
        "ultime": [(1, 1, 2), (2, 2), (1.5, 0.5, 2), (1, 3), (0.5, 0.5, 3)]},
    3: {"prime": [(1, 1, 1), (2, 1), (1.5, 0.5, 1), (1, 2), (0.5, 0.5, 2)],
        "ultime": [(1, 2), (3,), (2, 1), (1.5, 1.5)]},
}
ESTENSIONE = (-3, 8)       # gradi ammessi: dalla sesta sotto alla nona sopra la tonica


def genera(seme: str) -> Motivo:
    """Un motivo di due battute, cantabile: per gradi congiunti, al più un salto, chiude su tonica o quinta."""
    rnd = random.Random(zlib.crc32(seme.encode()))
    for _ in range(200):           # pochi tentativi: si tiene il primo che passa la validazione
        metro = rnd.choice((4, 4, 3))
        ritmo = list(rnd.choice(CELLE[metro]["prime"])) + list(rnd.choice(CELLE[metro]["ultime"]))
        gradi = [rnd.choice((0, 2, 4))]
        salti = 0
        for i in range(1, len(ritmo)):
            ultimo = i == len(ritmo) - 1
            if ultimo:
                gradi.append(rnd.choice((0, 0, 0, 4, 7)) if gradi[-1] >= 3 else rnd.choice((0, 0, 4)))
                continue
            passi = [-2, -1, -1, 1, 1, 2]
            # Dopo un salto, si torna indietro per grado (regola del contrappunto, suona «giusto»).
            if i >= 2 and abs(gradi[-1] - gradi[-2]) >= 3:
                passi = [-1] if gradi[-1] > gradi[-2] else [1]
            elif salti == 0 and rnd.random() < 0.3:
                passi = [-4, -3, 3, 4, 5]
            g = gradi[-1] + rnd.choice(passi)
            salti += abs(g - gradi[-1]) >= 3
            gradi.append(g)
        m = Motivo([Nota(g, d) for g, d in zip(gradi, ritmo)], metro)
        if not valida(m):
            return m
    raise RuntimeError("generatore del motivo: nessun motivo valido (non dovrebbe succedere)")


def valida(m: Motivo) -> list[str]:
    """Problemi del motivo (lista vuota = valido)."""
    problemi = []
    suonate = [n for n in m.note if n.grado is not None]
    if m.metro not in (2, 3, 4, 6):
        problemi.append(f"metro {m.metro} non ammesso")
    if not 4 <= len(suonate) <= 12:
        problemi.append(f"{len(suonate)} note (servono da 4 a 12)")
    if any(n.durata <= 0 or n.durata > 4 for n in m.note):
        problemi.append("durate fuori da (0, 4]")
    if abs(m.movimenti / m.metro - round(m.movimenti / m.metro)) > 1e-6 or not 1 <= round(m.movimenti / m.metro) <= 4:
        problemi.append(f"{m.movimenti} movimenti: non fanno da 1 a 4 battute intere di {m.metro}")
    if suonate:
        gradi = [n.grado for n in suonate]
        if min(gradi) < ESTENSIONE[0] or max(gradi) > ESTENSIONE[1]:
            problemi.append(f"estensione {min(gradi)}..{max(gradi)} oltre {ESTENSIONE}")
        if any(abs(a - b) > 5 for a, b in zip(gradi, gradi[1:])):
            problemi.append("un salto più ampio di una sesta")
        if any(gradi[i] == gradi[i + 1] == gradi[i + 2] for i in range(len(gradi) - 2)):
            problemi.append("tre note uguali di fila")
        if suonate[-1].durata < 1:
            problemi.append("l'ultima nota è troppo corta per chiudere")
    return problemi


def da_dati(dati: dict, origine: str) -> Motivo | None:
    """Un motivo scritto come dati ({metro, note: [[grado, durata], ...]}), validato; None se non va."""
    try:
        note = [Nota(None if g is None else int(g), float(d)) for g, d in dati["note"]]
        m = Motivo(note, int(dati.get("metro", 4)), origine)
    except (KeyError, TypeError, ValueError) as e:
        log.warning("motivo da %s illeggibile (%s): uso il generatore", origine, e)
        return None
    problemi = valida(m)
    if problemi:
        log.warning("motivo da %s scartato: %s", origine, "; ".join(problemi))
        return None
    return m


def motivo_campagna(id_campagna: str, esplicito: dict | None, profilo=None) -> Motivo:
    """Il motivo della campagna: esplicito, poi il gancio esterno, poi il generatore."""
    if esplicito:
        m = da_dati(esplicito, "stile.audio.motivo")
        if m:
            return m
    # Nome vecchio CANTASTORIE_MOTIVO_GANCIO letto per compatibilità.
    gancio = os.environ.get("TAGM_MOTIVO_GANCIO") or os.environ.get("CANTASTORIE_MOTIVO_GANCIO")
    if gancio:
        modulo, _, funzione = gancio.partition(":")
        try:
            proposta = getattr(importlib.import_module(modulo), funzione)(profilo)
            m = da_dati(proposta, f"gancio {gancio}") if proposta else None
            if m:
                return m
        except Exception as e:  # il gancio è codice di terzi: non deve mai fermare la pipeline
            log.warning("gancio del motivo %s fallito: %s", gancio, e)
    return genera(f"motivo|{id_campagna}")


# --- Variazioni ---------------------------------------------------------------------------------
def inverti(m: Motivo) -> Motivo:
    """Inversione attorno alla prima nota: dove saliva scende. Riconoscibile (stesso ritmo), ma «girato»."""
    perno = next(n.grado for n in m.note if n.grado is not None)
    return replace(m, note=[Nota(None if n.grado is None else 2 * perno - n.grado, n.durata) for n in m.note])


def scala_durate(m: Motivo, fattore: float) -> Motivo:
    """Aumentazione (fattore > 1) o diminuzione (< 1)."""
    return replace(m, note=[Nota(n.grado, n.durata * fattore) for n in m.note])


def ripeti_inizio(m: Motivo) -> Motivo:
    """La prima battuta detta due volte prima del motivo intero: un carattere che insiste."""
    prima, somma = [], 0.0
    for n in m.note:
        if somma >= m.metro - 1e-6:
            break
        prima.append(n)
        somma += n.durata
    return replace(m, note=prima + list(m.note))


def realizza(m: Motivo, scala: tuple[int, ...], tonica_midi: int, trasformazioni: list[str],
             estensione: tuple[int, int]) -> Variazione:
    """Dal motivo (gradi) alle note MIDI del PNG: modo, registro, articolazione, accenti.

    Ordine fisso delle trasformazioni, così due PNG con gli stessi tratti suonano uguali:
    inversione → ripetizione → aumentazione/diminuzione → salto finale → articolazione e accenti.
    """
    usate = []
    if "inversione" in trasformazioni:
        m, _ = inverti(m), usate.append("inversione")
    if "ripetizione" in trasformazioni:
        m, _ = ripeti_inizio(m), usate.append("ripetizione")
    if "aumentazione" in trasformazioni:
        m, _ = scala_durate(m, 1.5), usate.append("aumentazione")
    elif "diminuzione" in trasformazioni:
        m, _ = scala_durate(m, 0.75), usate.append("diminuzione")

    def altezza(grado: int) -> int:
        ottava, passo = divmod(grado, len(scala))
        return tonica_midi + 12 * ottava + scala[passo]

    gradi = [n.grado for n in m.note]
    if "salto" in trasformazioni:
        # Chiusura un'ottava sopra: un carattere fiero finisce «in alto».
        ultimo = max(i for i, g in enumerate(gradi) if g is not None)
        gradi[ultimo] += len(scala)
        usate.append("salto")
    articolazione = 0.55 if "staccato" in trasformazioni else 1.02 if "legato" in trasformazioni else 0.9
    usate += [t for t in ("staccato", "legato", "accento") if t in trasformazioni]
    eventi, t = [], 0.0
    for n, g in zip(m.note, gradi):
        if g is not None:
            forte = abs(t % m.metro) < 1e-6
            intensita = 96 if forte else 80
            if "accento" in trasformazioni:
                intensita = 110 if forte else 72
            eventi.append(Evento(altezza(g), t, n.durata * articolazione, intensita))
        t += n.durata
    # L'ultima nota si tiene tutta (anche in staccato): è la firma del tema.
    if eventi:
        eventi[-1].durata = m.movimenti - eventi[-1].inizio
    # Registro: si sposta tutto di ottave finché sta nell'estensione dello strumento.
    lo, hi = estensione
    spostamento = 0
    for _ in range(4):
        basso, alto = min(e.altezza for e in eventi), max(e.altezza for e in eventi)
        if basso < lo and alto + 12 <= hi + 2:
            for e in eventi:
                e.altezza += 12
            spostamento += 12
        elif alto > hi and basso - 12 >= lo - 2:
            for e in eventi:
                e.altezza -= 12
            spostamento -= 12
        else:
            break
    return Variazione(eventi, m.movimenti, usate, tonica_midi + spostamento)
