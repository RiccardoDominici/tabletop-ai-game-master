"""Qualità e normalizzazione con ffmpeg: loop, loudnorm a due passate, controlli, codifica AAC.

Catena di ogni file (vedi `prepara`):
  sorgente (mp3, flac, WAV sintetico…) → decodifica a 48 kHz stereo float (numpy)
  → loop (giunta con dissolvenza incrociata) oppure taglio dell'effetto
  → WAV → loudnorm a due passate (linear=true) → AAC-LC .m4a (aac_at di macOS, CBR)
  → controllo sul file FINALE decodificato: durata, loudness (ebur128), picco e clipping
    (astats), silenzi (silencedetect), giunta del loop (salto di livello e di campione).
Il loop si salva con mezzo secondo di margine prima e dopo (con_margini): la giunta resta perfetta
anche se il decoder del browser sposta l'inizio (riempimento AAC). Il controllo confronta le due
copie della testa del loop nel file decodificato.

Perché AAC .m4a: Safari e Chrome lo decodificano entrambi con decodeAudioData (Opus in WebM su
Safari è arrivato tardi e non ovunque). Il loop è già cucito nel file: il proiettore lo ripete così
com'è (vedi docs/audio.md, «Manifest»).
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
import wave
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from percorsi import CANALI, FFMPEG, SR

log = logging.getLogger("audio.qualita")

# Bersagli per tipo: loudness integrata (LUFS), true peak (dBTP), bitrate AAC.
BERSAGLI = {
    "musica": {"lufs": -23.0, "tp": -2.0, "kbps": 128},
    "ambiente": {"lufs": -30.0, "tp": -3.0, "kbps": 96},
    "tema": {"lufs": -20.0, "tp": -1.5, "kbps": 96},
    "effetto": {"lufs": -21.0, "tp": -3.0, "kbps": 96},
}
ATTACCO_S = 0.05          # silenzio davanti a temi ed effetti (il suono parte a 50 ms)
TOLLERANZA_LUFS = 1.5      # scarto ammesso dal bersaglio sul file finale
SOGLIA_SILENZIO_DB = -50   # silencedetect: sotto questo livello, per almeno…
DURATA_SILENZIO_S = 1.5    # …questi secondi, è un buco (in una musica o in un ambiente non deve esserci)


# --- ffmpeg di base ---------------------------------------------------------------------------
def _ffmpeg(*args: str, cattura: bool = True) -> subprocess.CompletedProcess:
    cmd = [FFMPEG, "-hide_banner", "-nostdin", *args]
    r = subprocess.run(cmd, capture_output=cattura, text=False)
    if r.returncode != 0:
        errore = (r.stderr or b"").decode("utf-8", "replace")[-1500:]
        raise RuntimeError(f"ffmpeg fallito ({' '.join(args[:6])}…): {errore}")
    return r


def decodifica(sorgente: Path, sr: int = SR, canali: int = CANALI) -> np.ndarray:
    """Qualsiasi file audio → array float32 (campioni, canali) a `sr` Hz."""
    r = _ffmpeg("-v", "error", "-i", str(sorgente), "-f", "f32le", "-acodec", "pcm_f32le", "-ac", str(canali), "-ar", str(sr), "-")
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, canali).copy()


def scrivi_wav(percorso: Path, audio: np.ndarray, sr: int = SR) -> None:
    """WAV a 16 bit (stdlib): basta per i passaggi intermedi, ffmpeg poi lavora in float."""
    percorso.parent.mkdir(parents=True, exist_ok=True)
    dati = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    with wave.open(str(percorso), "wb") as w:
        w.setnchannels(audio.shape[1])
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(dati.tobytes())


def _db(x: float) -> float:
    return 20 * np.log10(max(float(x), 1e-9))


def inviluppo_db(audio: np.ndarray, sr: int = SR, finestra_s: float = 0.05) -> np.ndarray:
    """Livello RMS in dB per finestre consecutive (mono)."""
    mono = audio.mean(axis=1)
    n = int(sr * finestra_s)
    k = len(mono) // n
    if k == 0:
        return np.array([_db(np.sqrt(np.mean(mono ** 2)))])
    blocchi = mono[: k * n].reshape(k, n)
    return 20 * np.log10(np.maximum(np.sqrt((blocchi ** 2).mean(axis=1)), 1e-9))


# --- Loop e tagli -------------------------------------------------------------------------------
@dataclass
class InfoLoop:
    inizio_s: float
    fine_s: float
    dissolvenza_s: float
    durata_s: float
    scarto_livello_db: float
    note: list[str] = field(default_factory=list)


def estrai_loop(audio: np.ndarray, obiettivo_s: float, minimo_s: float, massimo_s: float,
                dissolvenza_s: float, sr: int = SR) -> tuple[np.ndarray, InfoLoop]:
    """Un tratto [S, E) che si ripete senza giunta udibile.

    Si salta il silenzio iniziale; S cade almeno `dissolvenza_s` dopo, perché la coda del loop si
    sfuma (cos) mentre entra (sin) il tratto che PRECEDE S: arrivati alla fine, il suono è
    esattamente quello che porta a S, e il loop riparte senza salto. La testa resta pulita (la
    prima volta il brano parte com'è), la cucitura sta tutta in coda.
    E si sceglie vicino all'obiettivo dove il livello somiglia a quello di S, lontano dalla
    sfumatura finale del brano.
    """
    env = inviluppo_db(audio, sr)
    passo = 0.05
    soglia = max(np.percentile(env, 90) - 35, -60)
    suona = np.nonzero(env > soglia)[0]
    primo = suona[0] * passo if len(suona) else 0.0
    ultimo = (suona[-1] + 1) * passo if len(suona) else len(audio) / sr
    note = []
    S = primo + dissolvenza_s
    disponibile = ultimo - S - 0.5
    if disponibile < minimo_s:
        note.append(f"sorgente corta: {disponibile:.1f} s utili (minimo {minimo_s:.0f})")
        E = S + max(disponibile, dissolvenza_s * 3)
    else:
        def livello(t0: float, t1: float) -> float:
            a, b = int(t0 / passo), max(int(t1 / passo), int(t0 / passo) + 1)
            return float(np.mean(env[a:b]))
        rif = livello(S, S + 1.0)
        mediana = float(np.median(env))
        migliore, costo_min = None, 1e9
        t = S + minimo_s
        while t <= min(S + massimo_s, ultimo - 0.5):
            liv = livello(t - 1.0, t)
            costo = abs(liv - rif) + abs((t - S) - obiettivo_s) / 15
            if liv < mediana - 9:          # siamo in una sfumatura o in una pausa: no
                costo += 10
            if costo < costo_min:
                migliore, costo_min = t, costo
            t += 0.25
        E = migliore if migliore is not None else min(S + obiettivo_s, ultimo - 0.5)
    iS, iE, n = int(S * sr), int(E * sr), int(dissolvenza_s * sr)
    loop = audio[iS:iE].copy()
    x = np.linspace(0, np.pi / 2, n, dtype=np.float32)[:, None]
    loop[-n:] = audio[iE - n:iE] * np.cos(x) + audio[iS - n:iS] * np.sin(x)
    scarto = abs(_db(np.sqrt(np.mean(loop[-int(sr * 0.5):] ** 2))) - _db(np.sqrt(np.mean(loop[: int(sr * 0.5)] ** 2))))
    return loop, InfoLoop(round(S, 3), round(E, 3), dissolvenza_s, round(len(loop) / sr, 3), round(scarto, 2), note)


def loop_intero(audio: np.ndarray, dissolvenza_s: float, sr: int = SR) -> np.ndarray:
    """Per un suono già periodico (sintesi via FFT) o un tratto qualsiasi: cuce fine e inizio.

    Si sovrappone la coda alla testa e si toglie la testa: la lunghezza cala di `dissolvenza_s`.
    """
    n = int(dissolvenza_s * sr)
    if n <= 0 or len(audio) < 3 * n:
        return audio
    x = np.linspace(0, np.pi / 2, n, dtype=np.float32)[:, None]
    corpo = audio[n:-n].copy()
    coda = audio[-n:] * np.cos(x) + audio[:n] * np.sin(x)
    return np.concatenate([corpo, coda])


def taglia_effetto(audio: np.ndarray, massimo_s: float = 6.0, sr: int = SR) -> np.ndarray:
    """Un colpo singolo dal file: dall'attacco del suono più forte fino a quando si spegne."""
    env = inviluppo_db(audio, sr, 0.01)
    passo = 0.01
    picco = int(np.argmax(env))
    inizio = picco
    while inizio > 0 and env[inizio - 1] > env[picco] - 30 and (picco - inizio) * passo < 1.0:
        inizio -= 1
    fine = picco
    while fine < len(env) - 1 and env[fine] > env[picco] - 45 and (fine - inizio) * passo < massimo_s:
        fine += 1
    a, b = max(0, int((inizio * passo - 0.02) * sr)), int(fine * passo * sr)
    if b - a < int(0.4 * sr):          # un colpo cortissimo: almeno 0,4 s, per non tagliare la coda
        b = min(len(audio), a + int(0.4 * sr))
    out = audio[a:b].copy()
    nf = min(int(0.3 * sr), len(out) // 3)
    if nf > 0:
        out[-nf:] *= np.linspace(1, 0, nf, dtype=np.float32)[:, None]
    ni = min(int(0.005 * sr), len(out) // 10)
    if ni > 0:
        out[:ni] *= np.linspace(0, 1, ni, dtype=np.float32)[:, None]
    return out


# --- Loudnorm a due passate -------------------------------------------------------------------
def _json_finale(testo: str) -> dict:
    m = re.findall(r"\{[^{}]*\}", testo, flags=re.S)
    if not m:
        raise RuntimeError("loudnorm: nessun JSON nell'uscita di ffmpeg")
    return json.loads(m[-1])


def misura_loudnorm(sorgente: Path, lufs: float, tp: float, lra: float) -> dict:
    r = _ffmpeg("-i", str(sorgente), "-af", f"loudnorm=I={lufs}:TP={tp}:LRA={lra}:print_format=json", "-f", "null", "-")
    return _json_finale(r.stderr.decode("utf-8", "replace"))


def _finito(valore) -> bool:
    try:
        return np.isfinite(float(valore))
    except (TypeError, ValueError):
        return False


def normalizza(sorgente: Path, destinazione: Path, lufs: float, tp: float) -> dict:
    """Due passate: misura, poi applica con linear=true (guadagno costante, nessuna compressione).

    Il bersaglio LRA si alza fino all'LRA misurato: con un LRA più basso del brano ffmpeg
    rinuncerebbe al lineare e comprimerebbe la dinamica. Se anche così il true peak non ci sta,
    ffmpeg passa al dinamico: lo si legge in `normalization_type` e finisce nel controllo.
    """
    m1 = misura_loudnorm(sorgente, lufs, tp, 11)
    if not _finito(m1["input_i"]) or float(m1["input_i"]) < -70:
        # Troppo corto o troppo piano per la misura EBU R128 (servono 400 ms sopra la soglia):
        # si porta il picco a tp dB, che per un colpo breve è la normalizzazione sensata.
        r = _ffmpeg("-i", str(sorgente), "-af", "astats=metadata=0", "-f", "null", "-")
        picco = float(re.findall(r"Peak level dB:\s+(-?[\d.]+)", r.stderr.decode("utf-8", "replace"))[-1])
        _ffmpeg("-y", "-i", str(sorgente), "-af", f"volume={tp - picco}dB", "-ar", str(SR), "-c:a", "pcm_f32le", str(destinazione))
        return {"misura": {k: m1[k] for k in ("input_i", "input_tp", "input_lra")}, "tipo": "picco", "uscita_i": None, "uscita_tp": tp}
    lra = min(50.0, max(11.0, float(m1["input_lra"]) + 1.0))
    filtro = (f"loudnorm=I={lufs}:TP={tp}:LRA={lra}:measured_I={m1['input_i']}:measured_TP={m1['input_tp']}:"
              f"measured_LRA={m1['input_lra']}:measured_thresh={m1['input_thresh']}:offset={m1['target_offset']}:"
              f"linear=true:print_format=json")
    r = _ffmpeg("-y", "-i", str(sorgente), "-af", filtro, "-ar", str(SR), "-c:a", "pcm_f32le", str(destinazione))
    m2 = _json_finale(r.stderr.decode("utf-8", "replace"))
    out = {"misura": {k: m1[k] for k in ("input_i", "input_tp", "input_lra")}, "tipo": m2.get("normalization_type"),
           "uscita_i": m2.get("output_i"), "uscita_tp": m2.get("output_tp")}
    # loudnorm lineare non limita: con colpi secchi (monete) il picco può superare il tetto.
    # Allora si abbassa tutto quanto basta (guadagno costante, la forma resta quella).
    picco = _picco_db(destinazione)
    if picco > tp:
        tmp = destinazione.with_suffix(".picco.wav")
        _ffmpeg("-y", "-i", str(destinazione), "-af", f"volume={tp - picco - 0.3:.2f}dB", "-c:a", "pcm_f32le", str(tmp))
        tmp.replace(destinazione)
        out["abbassato_db"] = round(tp - picco - 0.3, 2)
    return out


def _picco_db(percorso: Path) -> float:
    r = _ffmpeg("-i", str(percorso), "-af", "astats=metadata=0", "-f", "null", "-")
    valori = re.findall(r"Peak level dB:\s+(-?[\d.]+|-inf)", r.stderr.decode("utf-8", "replace"))
    return float(valori[-1]) if valori and valori[-1] != "-inf" else -99.0


def codifica_m4a(sorgente: Path, destinazione: Path, kbps: int) -> str:
    """AAC-LC in .m4a con l'encoder aac di ffmpeg.

    Perché non aac_at (AudioToolbox), che suona un filo meglio: misurato il 3 novembre 2026 su un
    seno di 10 s, aac_at scrive nell'edit list una durata più lunga di 288 campioni e alla
    decodifica lascia 1.216 campioni muti in coda; l'aac di ffmpeg scrive la durata esatta
    (480.000) e ne lascia 256. Per un loop la coda muta è un buco a ogni giro: vince l'esattezza.
    Il proiettore usa comunque loopEnd = durata_s del manifest, che è la durata VERA del contenuto.
    """
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    _ffmpeg("-y", "-i", str(sorgente), "-vn", "-ac", "2", "-ar", str(SR), "-c:a", "aac", "-b:a", f"{kbps}k",
            "-movflags", "+faststart", str(destinazione))
    return f"aac {kbps}k"


# --- Controlli sul file finale ----------------------------------------------------------------
def analizza(percorso: Path, loop: bool, tipo: str, campioni: int | None = None,
             punti: tuple[int, int] | None = None, silenzi_ammessi: bool = False) -> dict:
    """Misure sul file così come lo decodificherà il proiettore.

    `campioni` è la lunghezza vera del contenuto (prima della codifica): il decodificatore può
    aggiungere in coda qualche centinaio di campioni di riempimento AAC, che non fanno parte del
    loop. La giunta e la durata si misurano sul contenuto vero; il riempimento si riporta a parte.
    """
    r = _ffmpeg("-i", str(percorso), "-af",
                f"silencedetect=noise={SOGLIA_SILENZIO_DB}dB:d={DURATA_SILENZIO_S},astats=metadata=0,ebur128=peak=true",
                "-f", "null", "-")
    err = r.stderr.decode("utf-8", "replace")
    silenzi, inizio = [], None
    for riga in err.splitlines():
        if "silence_start" in riga:
            inizio = float(riga.split("silence_start:")[1].split()[0])
        elif "silence_end" in riga and inizio is not None:
            silenzi.append((round(max(inizio, 0), 2), round(float(riga.split("silence_end:")[1].split()[0]), 2)))
            inizio = None
    audio = decodifica(percorso)
    riempimento = len(audio) - campioni if campioni else 0
    if campioni and riempimento >= 0:
        audio = audio[:campioni]
    durata = len(audio) / SR
    if inizio is not None:
        silenzi.append((round(inizio, 2), round(len(decodifica(percorso)) / SR, 2)))
    riassunto = err[err.rfind("Summary:"):] if "Summary:" in err else ""
    def valore(schema: str, testo: str) -> float | None:
        m = re.search(schema, testo)
        return float(m.group(1)) if m else None
    lufs = valore(r"I:\s+(-?[\d.]+) LUFS", riassunto)
    lra = valore(r"LRA:\s+(-?[\d.]+) LU", riassunto)
    tp = valore(r"Peak:\s+(-?[\d.inf]+) dBFS", riassunto)
    overall = err[err.rfind("Overall"):] if "Overall" in err else err
    picco = valore(r"Peak level dB:\s+(-?[\d.inf]+)", overall)
    piatto = valore(r"Flat factor:\s+(-?[\d.]+)", overall)
    picco_campioni = float(np.max(np.abs(audio))) if len(audio) else 0.0
    clipping = int(np.sum(np.abs(audio) >= 0.999))
    out = {"durata_s": round(durata, 4), "riempimento_campioni": int(riempimento), "lufs": lufs, "lra": lra, "true_peak_db": tp, "picco_db": picco,
           "fattore_piatto": piatto, "campioni_al_limite": int(clipping), "silenzi": silenzi}
    problemi = []
    b = BERSAGLI[tipo]
    tolleranza = 3.0 if tipo == "effetto" else TOLLERANZA_LUFS   # su un colpo di mezzo secondo la misura balla
    if lufs is not None and tipo == "effetto" and durata < 1.0:   # sotto 1 s la loudness integrata non è affidabile
        tolleranza = 99.0
    if lufs is None and tipo != "effetto" or lufs is not None and abs(lufs - b["lufs"]) > tolleranza:
        problemi.append(f"loudness {lufs} LUFS lontana dal bersaglio {b['lufs']}")
    if clipping > 0 or picco_campioni >= 0.999:
        problemi.append(f"clipping: {clipping} campioni al limite")
    if tipo in ("musica", "ambiente") and silenzi and not silenzi_ammessi:
        problemi.append(f"silenzi: {silenzi}")
    if loop:
        if punti:
            out["loop_inizio_s"] = round(punti[0] / SR, 6)
            out["loop_fine_s"] = round(punti[1] / SR, 6)
            out["giunta"] = giunta(audio, *punti)
        else:
            out["giunta"] = {"ok": False, "nota": "punti del loop sconosciuti"}
        if not out["giunta"]["ok"]:
            problemi.append(f"giunta: {out['giunta']}")
    out["problemi"] = problemi
    out["ok"] = not problemi
    return out


def giunta(audio: np.ndarray, inizio: int, fine: int, sr: int = SR) -> dict:
    """La giunta del loop [inizio, fine) sul file DECODIFICATO.

    Il file contiene il loop con mezzo secondo prima (la coda del loop) e mezzo secondo dopo (la
    testa): così le due copie della testa, quella dopo `inizio` e quella dopo `fine`, devono essere
    uguali a meno del rumore di codifica. Si misura:
      - somiglianza_db: quanto la differenza tra le due copie (100 ms) sta sotto il segnale;
      - rapporto_salto: il salto tra il campione prima di `fine` e quello a `inizio` (ciò che si
        sente al giro), diviso la variazione tipica tra campioni vicini; molto sopra 1 è un clic.
    """
    n = int(0.1 * sr)
    a, b = audio[inizio:inizio + n], audio[fine:fine + n]
    if len(b) < n or inizio < 1:
        return {"somiglianza_db": None, "rapporto_salto": None, "ok": False, "nota": "mancano i margini attorno al loop"}
    rms = lambda x: float(np.sqrt(np.mean(x ** 2))) + 1e-9
    somiglianza = 20 * np.log10(rms(a) / rms(a - b))
    # Il salto al giro contro i salti più forti (99° percentile) che il suono fa da sé lì intorno:
    # sopra 1,5 si sente un clic. Per i rumori (pioggia) l'AAC non conserva la forma d'onda
    # (somiglianza bassa) ma un salto dentro un rumore non si sente: conta il salto, non la somiglianza.
    vicini = np.abs(np.diff(audio[fine - n:fine + n], axis=0))
    forte = float(np.percentile(vicini, 99)) + 1e-6
    salto = float(np.max(np.abs(audio[fine - 1] - audio[inizio])))
    rapporto = salto / forte
    m = int(0.05 * sr)
    livello = abs(20 * np.log10(rms(audio[fine - m:fine]) / rms(audio[inizio:inizio + m])))
    return {"somiglianza_db": round(float(somiglianza), 1), "rapporto_salto": round(float(rapporto), 2),
            "salto_livello_db": round(float(livello), 2), "ok": bool(rapporto <= 1.5 and livello <= 6.0)}


MARGINE_LOOP_S = 0.5    # coda prima e testa dopo il loop, nel file: assorbe ritardi e riempimenti del decoder


def con_margini(loop: np.ndarray, sr: int = SR) -> tuple[np.ndarray, int, int]:
    """[coda del loop] + loop + [testa del loop]: il loop è circolare, quindi ogni tratto lungo quanto
    il loop preso tra i margini è ancora un loop perfetto. Se il browser sposta l'inizio di qualche
    decina di millisecondi (riempimento AAC non tolto), la ripetizione resta senza giunta."""
    m = min(int(MARGINE_LOOP_S * sr), len(loop) // 4)
    return np.concatenate([loop[-m:], loop, loop[:m]]), m, m + len(loop)


# --- Tutto insieme --------------------------------------------------------------------------------
def prepara(audio: np.ndarray, destinazione: Path, tipo: str, loop: bool, lavoro: Path,
            silenzi_ammessi: bool = False) -> dict:
    """Normalizza, codifica e controlla un audio già tagliato (o già in loop). Ritorna il controllo.

    Per un loop il file ha i margini di `con_margini`; il controllo riporta i punti del loop
    (`loop_inizio_s`, `loop_fine_s`) che il proiettore usa come loopStart e loopEnd.
    """
    b = BERSAGLI[tipo]
    lavoro.mkdir(parents=True, exist_ok=True)
    grezzo, norm = lavoro / f"{destinazione.stem}.grezzo.wav", lavoro / f"{destinazione.stem}.norm.wav"
    punti = None
    if loop:
        audio, i0, i1 = con_margini(audio)
        punti = (i0, i1)
    else:
        # 50 ms di silenzio davanti: un attacco secco proprio sul primo frame AAC sfora il picco
        # (misurato: monete a +0,4 dBFS a 36 ms dall'inizio, anche con 6 dB di margine).
        audio = np.concatenate([np.zeros((int(ATTACCO_S * SR), audio.shape[1]), dtype=np.float32), audio])
    scrivi_wav(grezzo, audio)
    n = normalizza(grezzo, norm, b["lufs"], b["tp"])
    codec = codifica_m4a(norm, destinazione, b["kbps"])
    controllo = analizza(destinazione, loop, tipo, len(audio), punti, silenzi_ammessi)   # loudnorm lineare non cambia la lunghezza
    if any(p.startswith("clipping") for p in controllo["problemi"]):
        # L'AAC può superare il picco di qualche dB sui colpi secchi: si rifà con 3 dB di margine in più.
        log.info("%s: clipping dopo la codifica, rifaccio con più margine", destinazione.name)
        n = normalizza(grezzo, norm, b["lufs"], b["tp"] - 3.0)
        codec = codifica_m4a(norm, destinazione, b["kbps"])
        controllo = analizza(destinazione, loop, tipo, len(audio), punti, silenzi_ammessi)
        controllo["margine_extra_db"] = 3.0
    for f in (grezzo, norm):
        f.unlink(missing_ok=True)
    controllo["normalizzazione"] = n
    controllo["codec"] = codec
    controllo["kb"] = round(destinazione.stat().st_size / 1000)
    return controllo
