"""Temi dei personaggi: il motivo della campagna (motivo.py), variato per ogni PNG e suonato (rendi.py)."""

from __future__ import annotations

import vocabolario as V
from temi.motivo import Motivo, Variazione, motivo_campagna, realizza  # noqa: F401

# Il carattere cambia un poco il passo del tema rispetto al tempo della campagna.
TEMPO_CARATTERE = {"gioviale": 1.15, "nervoso": 1.2, "timido": 1.05, "solenne": 0.85,
                   "malinconico": 0.85, "pacato": 0.92, "caldo": 0.97, "burbero": 1.0, "freddo": 0.95, "fiero": 1.05}
DURATA_MIN_S, DURATA_MAX_S = 3.5, 5.5     # la melodia (la coda di riverbero si aggiunge dopo)


def tonica_nel_registro(classe: int, registro: str) -> int:
    """La tonica della campagna (classe 0–11) nell'ottava più vicina al centro del registro."""
    centro = V.REGISTRI[registro]
    t = centro + ((classe - centro) % 12)
    return t - 12 if t - centro > 6 else t


def componi(spec, prof, motivo: Motivo):
    """Da specifica di tema + profilo + motivo a (audio float32 stereo, info per il manifest)."""
    from temi.rendi import nome_programma, rendi

    strumento = V.STRUMENTI[spec.strumento]
    v: Variazione = realizza(motivo, V.MODI[spec.modo], tonica_nel_registro(prof.tonica, spec.registro),
                             spec.trasformazioni, strumento.estensione)
    bpm = prof.bpm * TEMPO_CARATTERE.get(spec.carattere[0], 1.0)
    # Il tema dura tra 3,5 e 5,5 secondi: si corregge il tempo, mai la melodia.
    durata = v.movimenti * 60 / bpm
    if durata > DURATA_MAX_S:
        bpm = v.movimenti * 60 / DURATA_MAX_S
    elif durata < DURATA_MIN_S:
        bpm = v.movimenti * 60 / DURATA_MIN_S
    audio = rendi(v, strumento.gm, bpm, v.tonica)
    info = {"strumento": spec.strumento, "programma_gm": strumento.gm, "suono": nome_programma(strumento.gm),
            "modo": spec.modo, "registro": spec.registro, "bpm": round(bpm, 1), "tonica_midi": v.tonica,
            "trasformazioni": v.trasformazioni,
            "note": [[e.altezza, round(e.inizio, 3), round(e.durata, 3), e.intensita] for e in v.eventi]}
    return audio, info
