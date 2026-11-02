"""Normalizzazione leggera del testo italiano prima della sintesi.

Parte pura (solo stdlib), coperta da tests/test_testo.py. Il modello legge quello
che riceve: virgolette, trattini lunghi, markup e simboli lo fanno inciampare
(pause strane, parole lette a metà, rumore a fine frase). Qui togliamo solo ciò
che non va letto e rendiamo uniforme la punteggiatura; il contenuto non si tocca.
L'effetto misurato (Whisper sul prima/dopo) è nel README.

Regole, nell'ordine in cui sono applicate:
  1. Unicode NFC (le vocali accentate scomposte, es. "e" + accento, diventano un solo carattere);
  2. via tag HTML/XML, link markdown -> solo il testo, via **, __, *, _, `, # e > di inizio riga;
  3. via le indicazioni di scena tra parentesi quadre: "[ride]", "[narratore]";
  4. via emoji e simboli grafici; "&" -> "e", "%" -> "per cento";
  5. apostrofi tipografici -> "'"; virgolette di ogni tipo (« » “ ” „ " ‹ ›) tolte, ma una
     virgoletta di CHIUSURA seguita da minuscola diventa virgola: «Vattene» disse -> Vattene, disse
     (la virgoletta segnava una pausa; senza, il modello legava le parole: "straniero disse alla");
  6. trattino lungo/medio e trattino staccato -> virgola (pausa); trattino iniziale di dialogo tolto;
  7. "…" e 4+ punti -> "..."; raffiche "!!!" / "?!?" -> un solo segno;
  8. spazi: a capo e tab -> spazio, niente spazi doppi né prima della punteggiatura;
  9. punto finale se manca (senza, il modello tende a non chiudere la frase).
"""
from __future__ import annotations

import re
import unicodedata

_TAG = re.compile(r"<[^<>]{1,200}>")
_LINK_MD = re.compile(r"\[([^\[\]]*)\]\([^()]*\)")
_QUADRE = re.compile(r"\[[^\[\]]{0,80}\]")
_ENFASI = re.compile(r"(\*\*|__|\*|`)")
# "_" usato come enfasi: solo se non è dentro una parola (es. _parola_).
_SOTTOLINEATO = re.compile(r"(?<!\w)_+|_+(?!\w)")
_INIZIO_RIGA_MD = re.compile(r"(?m)^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+(?=\S))")
_APOSTROFI = str.maketrans({"’": "'", "‘": "'", "ʼ": "'", "´": "'", "`": "'"})
_VIRGOLETTE = re.compile(r"[«»“”„‟\"‹›]")
# chiusura dopo una parola (non dopo ? ! . , che fanno già pausa) e prima di una minuscola
_CHIUSA_PRIMA_DI_MINUSCOLA = re.compile(r"(?<=[\w])\s*[»”\"›]\s+(?=[a-zàèéìòù])")
_TRATTINO_INIZIALE = re.compile(r"^\s*[—–-]\s*")
_TRATTINO_LUNGO = re.compile(r"\s*[—–]\s*")
_TRATTINO_STACCATO = re.compile(r"\s+-\s+")
_ELLISSI = re.compile(r"…|\.{4,}")
_RAFFICA = re.compile(r"([!?])[!?]+")
_SPAZI = re.compile(r"\s+")
_SPAZIO_PRIMA_PUNT = re.compile(r"\s+([,.;:!?])")
_VIRGOLE_RIPETUTE = re.compile(r",(?:\s*,)+")
_VIRGOLA_PRIMA_PUNTO = re.compile(r",\s*([.;:!?])")
_FINE_FRASE = ("...", ".", "!", "?")


def _togli_simboli(testo: str) -> str:
    """Toglie emoji, simboli grafici, caratteri di controllo e selettori di variante."""
    tenuti = []
    for c in testo:
        cat = unicodedata.category(c)
        if cat in ("So", "Sk", "Cs", "Co", "Cn", "Cf"):  # Cf: spazi a larghezza zero, trattino morbido
            continue
        if cat == "Cc" and c not in "\n\t\r":
            continue
        if cat == "Mn" and not unicodedata.combining(c):
            continue
        tenuti.append(c)
    return "".join(tenuti)


def normalizza(testo: str) -> str:
    """Restituisce il testo pronto per la sintesi ("" se non resta niente da leggere)."""
    if not testo:
        return ""
    t = unicodedata.normalize("NFC", testo)
    # 2. markup
    t = _TAG.sub(" ", t)
    t = _LINK_MD.sub(r"\1", t)
    t = _INIZIO_RIGA_MD.sub("", t)
    # 3. indicazioni di scena tra quadre
    t = _QUADRE.sub(" ", t)
    t = t.replace("[", " ").replace("]", " ")
    t = _ENFASI.sub("", t)
    t = _SOTTOLINEATO.sub("", t)
    # 5a. apostrofi PRIMA dei simboli: "´" è un simbolo (Sk) e verrebbe tolto invece che convertito
    t = t.translate(_APOSTROFI)
    # 4. simboli
    t = t.replace("&", " e ").replace("%", " per cento")
    t = _togli_simboli(t)
    # 5b. virgolette
    t = _CHIUSA_PRIMA_DI_MINUSCOLA.sub(", ", t)
    t = _VIRGOLETTE.sub("", t)
    # 6. trattini
    t = _SPAZI.sub(" ", t).strip()
    t = _TRATTINO_INIZIALE.sub("", t)
    t = _TRATTINO_LUNGO.sub(", ", t)
    t = _TRATTINO_STACCATO.sub(", ", t)
    # 7. ellissi e raffiche
    t = _ELLISSI.sub("...", t)
    t = _RAFFICA.sub(r"\1", t)
    # 8. spazi e virgole
    t = _SPAZI.sub(" ", t).strip()
    t = _SPAZIO_PRIMA_PUNT.sub(r"\1", t)
    t = _VIRGOLE_RIPETUTE.sub(",", t)
    t = _VIRGOLA_PRIMA_PUNTO.sub(r"\1", t)
    t = t.strip(" ,;:")
    if not any(c.isalnum() for c in t):
        return ""
    # 9. chiusura della frase
    if not t.endswith(_FINE_FRASE):
        t = t + "."
    return t
