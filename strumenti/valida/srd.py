"""Tabelle SRD 5.2 per il validatore delle schede (docs/prove.md, §2). Specchio di
apps/server/src/campagna/regole-srd.ts e schede.ts: se lì cambia una tabella, cambia qui.

Due blocchi, con fonti diverse:
- le tabelle del regolamento (abilità, caratteristiche, armature, dado vita di classe, formule):
  SRD 5.2 (CC-BY-4.0, Wizards of the Coast), nomi italiani dall'SRD 5.2.1 in italiano;
- le fasce di CA, PF e tiro per colpire per grado di sfida (GS): NON sono nell'SRD 5.2. Sono
  approssimazioni prudenti delle tabelle del Manuale del Master 2014, usate solo per segnalare
  un PNG fuori scala. Vanno rivedute se si trova una fonte migliore.
"""

from __future__ import annotations

import math
import re
import unicodedata

CARATTERISTICHE = ("forza", "destrezza", "costituzione", "intelligenza", "saggezza", "carisma")

ABILITA = (
    "acrobazia", "addestrare_animali", "arcano", "atletica", "furtivita", "indagare", "inganno",
    "intimidire", "intrattenere", "intuizione", "medicina", "natura", "percezione", "persuasione",
    "rapidita_di_mano", "religione", "sopravvivenza", "storia",
)

CARATTERISTICA_DI = {
    "acrobazia": "destrezza", "addestrare_animali": "saggezza", "arcano": "intelligenza",
    "atletica": "forza", "furtivita": "destrezza", "indagare": "intelligenza", "inganno": "carisma",
    "intimidire": "carisma", "intrattenere": "carisma", "intuizione": "saggezza", "medicina": "saggezza",
    "natura": "intelligenza", "percezione": "saggezza", "persuasione": "carisma",
    "rapidita_di_mano": "destrezza", "religione": "intelligenza", "sopravvivenza": "saggezza",
    "storia": "intelligenza",
}

# Nomi come li scrive la campagna (chiave() li riporta all'id).
NOME_ABILITA = {
    "acrobazia": "Acrobazia", "addestrare_animali": "Addestrare animali", "arcano": "Arcano",
    "atletica": "Atletica", "furtivita": "Furtività", "indagare": "Indagare", "inganno": "Inganno",
    "intimidire": "Intimidire", "intrattenere": "Intrattenere", "intuizione": "Intuizione",
    "medicina": "Medicina", "natura": "Natura", "percezione": "Percezione", "persuasione": "Persuasione",
    "rapidita_di_mano": "Rapidità di mano", "religione": "Religione", "sopravvivenza": "Sopravvivenza",
    "storia": "Storia",
}

# Sinonimi accettati (nomi inglesi dell'SRD e abbreviazioni), come in regole-srd.ts.
SINONIMI_ABILITA = {
    "acrobatics": "acrobazia", "animal_handling": "addestrare_animali", "addestrare": "addestrare_animali",
    "arcana": "arcano", "athletics": "atletica", "stealth": "furtivita", "investigation": "indagare",
    "deception": "inganno", "intimidation": "intimidire", "performance": "intrattenere",
    "insight": "intuizione", "medicine": "medicina", "nature": "natura", "perception": "percezione",
    "persuasion": "persuasione", "sleight_of_hand": "rapidita_di_mano", "religion": "religione",
    "survival": "sopravvivenza", "history": "storia",
}

SINONIMI_CARATTERISTICA = {
    "for": "forza", "str": "forza", "strength": "forza", "des": "destrezza", "dex": "destrezza",
    "dexterity": "destrezza", "cos": "costituzione", "con": "costituzione", "constitution": "costituzione",
    "int": "intelligenza", "intelligence": "intelligenza", "sag": "saggezza", "wis": "saggezza",
    "wisdom": "saggezza", "car": "carisma", "cha": "carisma", "charisma": "carisma",
}

# CA base e tetto della Destrezza aggiunta (None = tutta, 0 = nessuna): SRD 5.2, «Armature».
ARMATURE = {
    "armatura_imbottita": (11, None), "armatura_di_cuoio": (11, None),
    "armatura_di_cuoio_borchiato": (12, None), "armatura_di_pelle": (12, 2), "giaco_di_maglia": (13, 2),
    "corazza_a_scaglie": (14, 2), "corazza_di_piastre": (14, 2), "mezza_armatura": (15, 2),
    "corazza_ad_anelli": (14, 0), "cotta_di_maglia": (16, 0), "corazza_a_strisce": (17, 0),
    "armatura_a_piastre": (18, 0),
}

SINONIMI_ARMATURA = {
    "imbottita": "armatura_imbottita", "cuoio": "armatura_di_cuoio", "cuoio_borchiato": "armatura_di_cuoio_borchiato",
    "pelle": "armatura_di_pelle", "chain_shirt": "giaco_di_maglia", "scale_mail": "corazza_a_scaglie",
    "breastplate": "corazza_di_piastre", "half_plate": "mezza_armatura", "ring_mail": "corazza_ad_anelli",
    "chain_mail": "cotta_di_maglia", "splint": "corazza_a_strisce", "plate": "armatura_a_piastre",
    "piastre": "armatura_a_piastre",
}

BONUS_SCUDO = 2

# Dado vita per classe (SRD 5.2, «Classi»), con i femminili che usano le campagne. Una classe sconosciuta
# non è un errore: il validatore non può verificare i PF e lo dice come avviso.
DADO_VITA = {
    "barbaro": 12, "barbara": 12, "bardo": 8, "barda": 8, "chierico": 8, "chierica": 8, "druido": 8,
    "druida": 8, "guerriero": 10, "guerriera": 10, "ladro": 8, "ladra": 8, "mago": 6, "maga": 6,
    "monaco": 8, "monaca": 8, "paladino": 10, "paladina": 10, "ramingo": 10, "ramminga": 10,
    "stregone": 6, "stregona": 6, "warlock": 8,
    "ranger": 10,   # il nome inglese che usano le schede delle campagne (nozze-neve, pg Livia)
}

# Gradi di sfida ammessi (un intero da 0 a 30, o una frazione standard).
GS_FRAZIONI = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5}

# Fasce per GS (approssimate, non SRD: vedi la nota in testa al file).
def ca_attesa(gs: float) -> int:
    """CA tipica di un PNG a quel GS: un PNG può stare fino a tre punti sopra (3 in più di tolleranza)."""
    for tetto, ca in ((3, 13), (4, 14), (7, 15), (9, 16), (12, 17), (14, 18)):
        if gs <= tetto:
            return ca
    return 19


def pf_massimi_gs(gs: float) -> int | None:
    """Tetto dei PF per GS (None sopra GS 5: non si controlla)."""
    for tetto, pf in ((0, 6), (0.125, 35), (0.25, 49), (0.5, 70), (1, 85), (2, 100), (3, 115), (4, 130), (5, 145)):
        if gs <= tetto:
            return pf
    return None


def bonus_competenza(livello_o_gs: float) -> int:
    """+2 ai livelli 1–4, +3 ai 5–8, … (SRD 5.2)."""
    l = max(1, math.ceil(livello_o_gs))
    return 2 + (l - 1) // 4


def modificatore(punteggio: int) -> int:
    """(punteggio − 10) / 2 arrotondato per difetto (SRD 5.2)."""
    return (punteggio - 10) // 2


def chiave(t: str) -> str:
    """Stessa normalizzazione di regole-srd.ts: «Rapidità di mano» → «rapidita_di_mano»."""
    s = unicodedata.normalize("NFD", str(t).lower())
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"['’`]", "", s)
    s = re.sub(r"[\s-]+", "_", s)
    s = re.sub(r"[^a-z0-9_]", "", s)
    return re.sub(r"_+", "_", s).strip("_")


def come_abilita(v) -> str | None:
    """Id canonico di un'abilità (nome italiano, id o sinonimo inglese), o None."""
    if not isinstance(v, str):
        return None
    k = chiave(v)
    if k in ABILITA:
        return k
    if k in NOME_ABILITA_CHIAVI:
        return NOME_ABILITA_CHIAVI[k]
    return SINONIMI_ABILITA.get(k)


NOME_ABILITA_CHIAVI = {chiave(v): k for k, v in NOME_ABILITA.items()}


def come_caratteristica(v) -> str | None:
    if not isinstance(v, str):
        return None
    k = chiave(v)
    if k in CARATTERISTICHE:
        return k
    return SINONIMI_CARATTERISTICA.get(k)


def come_armatura(v) -> str | None:
    """Id canonico dell'armatura dell'SRD, o None se non è un'armatura."""
    if not isinstance(v, str):
        return None
    k = chiave(v)
    if k in ARMATURE:
        return k
    return SINONIMI_ARMATURA.get(k)


def classe_armatura(mod_destrezza: int, armatura: str | None, scudo: bool) -> int:
    """CA da armatura (o 10 + Destrezza senza), più lo scudo (SRD 5.2)."""
    if armatura is None:
        base = 10 + mod_destrezza
    else:
        ca, tetto = ARMATURE[armatura]
        base = ca + (mod_destrezza if tetto is None else min(mod_destrezza, tetto))
    return base + (BONUS_SCUDO if scudo else 0)


def dado_vita(classe) -> int | None:
    if not isinstance(classe, str):
        return None
    return DADO_VITA.get(chiave(classe))
