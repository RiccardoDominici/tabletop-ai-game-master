"""Ambienti sintetici: il ripiego per i suoni «di rumore» (pioggia, vento, fiume, fuoco, neve, acqua, mare).

Quando il fondo locale non ha una registrazione buona per un tag, questi strati li fa il codice:
rumore modellato nello spettro (FFT), modulato da curve lente. Tutto è PERIODICO per costruzione
(l'antitrasformata di uno spettro è un segnale circolare; le modulazioni hanno un numero intero
di cicli nel loop; gocce e scoppiettii si piazzano in modo circolare), quindi il loop non ha giunta.
Deterministico: lo stesso tag e lo stesso seme danno lo stesso file. Nessuna licenza esterna.
"""

from __future__ import annotations

import numpy as np

from percorsi import SR


def _spettro(n: int, rnd: np.random.Generator, curva) -> np.ndarray:
    """Rumore bianco → spettro moltiplicato per curva(f) → segnale periodico di n campioni, RMS 1."""
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(rnd.standard_normal(n)) * curva(np.maximum(f, 1.0))
    x = np.fft.irfft(X, n)
    return (x / (np.sqrt(np.mean(x ** 2)) + 1e-12)).astype(np.float32)


def _modulazione(n: int, rnd: np.random.Generator, cicli: tuple[int, ...], profondita: float) -> np.ndarray:
    """Curva lenta periodica in [1-profondità, 1]: somma di coseni con un numero intero di cicli nel loop."""
    t = np.arange(n) / n
    m = sum(rnd.uniform(0.5, 1.0) * np.cos(2 * np.pi * k * t + rnd.uniform(0, 2 * np.pi)) for k in cicli)
    m = (m - m.min()) / (m.max() - m.min() + 1e-12)
    return (1 - profondita + profondita * m).astype(np.float32)


def _banda(lo: float, hi: float, pendenza: float = 1.0):
    """Curva passa-banda morbida (in ottave) con un'inclinazione 1/f^pendenza."""
    def curva(f):
        g = 1 / (1 + (lo / f) ** 4) / (1 + (f / hi) ** 4)
        return g / f ** (pendenza / 2)
    return curva


def _impulsi(n: int, rnd: np.random.Generator, al_secondo: float, durata_ms: tuple[float, float],
             colore: tuple[float, float], ampiezza: tuple[float, float]) -> np.ndarray:
    """Colpi brevi (gocce, scoppiettii) di rumore filtrato con decadimento esponenziale, posti in modo circolare."""
    out = np.zeros(n, dtype=np.float32)
    quanti = rnd.poisson(al_secondo * n / SR)
    for _ in range(quanti):
        lung = int(SR * rnd.uniform(*durata_ms) / 1000)
        lung = max(lung, 16)
        b = rnd.standard_normal(lung).astype(np.float32)
        # colore: un passa-basso/alto grezzo con una differenza o una media mobile
        if colore[0] > 1000:
            b = np.diff(b, prepend=0)
        if colore[1] < 3000:
            b = np.convolve(b, np.ones(8, dtype=np.float32) / 8, mode="same")
        b *= np.exp(-np.linspace(0, 6, lung, dtype=np.float32))
        a = rnd.pareto(2.5) * ampiezza[0] + ampiezza[1] * rnd.random()
        inizio = rnd.integers(0, n)
        idx = (inizio + np.arange(lung)) % n
        out[idx] += b * a
    return out


def _stereo(rnd, n: int, fn, comune: float = 0.6) -> np.ndarray:
    """Due canali: una parte comune e una indipendente, così lo strato ha ampiezza ma non «salta»."""
    c = fn(np.random.default_rng(rnd.integers(1 << 30)))
    l = fn(np.random.default_rng(rnd.integers(1 << 30)))
    r = fn(np.random.default_rng(rnd.integers(1 << 30)))
    return np.stack([comune * c + (1 - comune) * l, comune * c + (1 - comune) * r], axis=1)


def pioggia(n, rnd):
    def strato(g):
        fondo = _spettro(n, g, _banda(500, 9000, 0.3)) * 0.6
        gocce = _impulsi(n, g, 140, (2, 12), (1500, 9000), (0.25, 0.4))
        return fondo * _modulazione(n, g, (1, 2, 3), 0.15) + gocce
    return _stereo(rnd, n, strato, 0.5)


def vento(n, rnd, acuto: bool = False):
    def strato(g):
        lo, hi = (500, 2500) if acuto else (150, 1200)
        corpo = _spettro(n, g, _banda(lo, hi, 1.0)) * _modulazione(n, g, (2, 3, 5), 0.75)
        fischio = _spettro(n, g, _banda(hi * 0.6, hi * 0.9, 0.0)) * _modulazione(n, g, (3, 4, 7), 0.9) * 0.25
        return corpo + fischio
    return _stereo(rnd, n, strato, 0.7)


def fiume(n, rnd):
    def strato(g):
        rombo = _spettro(n, g, _banda(60, 900, 1.2))
        gorgoglio = _spettro(n, g, _banda(400, 2500, 0.5)) * _modulazione(n, g, tuple(range(40, 140, 13)), 0.8) * 0.5
        return rombo * _modulazione(n, g, (1, 2), 0.2) + gorgoglio
    return _stereo(rnd, n, strato, 0.5)


def fuoco(n, rnd):
    def strato(g):
        brontolio = _spettro(n, g, _banda(40, 350, 1.0)) * 0.5 * _modulazione(n, g, (3, 5, 8), 0.4)
        soffio = _spettro(n, g, _banda(2000, 8000, 0.0)) * 0.08 * _modulazione(n, g, (6, 11, 17), 0.7)
        scoppi = _impulsi(n, g, 9, (1, 6), (2000, 9000), (0.9, 1.5))
        tonfi = _impulsi(n, g, 1.5, (8, 25), (100, 1500), (0.6, 0.6))
        return brontolio + soffio + scoppi + tonfi
    return _stereo(rnd, n, strato, 0.6)


def acqua(n, rnd, onde: tuple[int, ...] = (9, 13, 17), profondita: float = 0.7):
    def strato(g):
        x = _spettro(n, g, _banda(80, 2500, 1.0))
        return x * _modulazione(n, g, onde, profondita)
    return _stereo(rnd, n, strato, 0.6)


GENERATORI = {
    "pioggia": pioggia,
    "vento": vento,
    "neve": lambda n, rnd: vento(n, rnd, acuto=True) * 0.6,
    "fiume": fiume,
    "fuoco": fuoco,
    "acqua": acqua,
    "mare": lambda n, rnd: acqua(n, rnd, onde=(4, 5, 6), profondita=0.9),
}


def genera(tag: str, durata_s: float, seme: int) -> np.ndarray:
    """Uno strato periodico di `durata_s` secondi (float32 stereo, picco 0,5) per un tag sintetizzabile."""
    n = int(durata_s * SR)
    x = GENERATORI[tag](n, np.random.default_rng(seme))
    return (x / (np.max(np.abs(x)) + 1e-9) * 0.5).astype(np.float32)
