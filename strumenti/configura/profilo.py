"""Sceglie il profilo di questo computer dal rilevamento (tabella in docs/profili.md) e scrive config/locale.yaml.

Tabella, in ordine (la prima regola che vale vince):
  1. Apple silicon, RAM >= 15,5 GiB (16 GB nominali):  lettore Qwen3 8B 4 bit, voce Qwen3-TTS locale,
     immagini FLUX.2 klein q4 (mflux) solo se il disco basta dopo i download, altrimenti nessuna.
  2. Apple silicon, RAM sotto 15,5 GiB:               lettore Qwen3 4B 4 bit, voce locale, immagini nessuna.
  3. Altro sistema (non Apple silicon):               nessun modello locale ancora (docs/da-fare.md).
     Il lettore è «finto» (narratore a copione, non una partita vera) finché non c'è una chiave Anthropic;
     la voce è «finto» (un tono). Le chiavi sono sempre un'opzione, mai un requisito.

Le chiavi trovate (ANTHROPIC_API_KEY, OPENROUTER_API_KEY) sono solo offerte: compaiono in `chiavi_offerte`
e diventano scelte solo con `applica_chiavi=True` (`--con-chiavi` in configura.py).

Funzioni pure: nessun accesso alla rete né al disco, tranne `scrivi_locale` che scrive il file indicato.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

# Soglie e nomi: in un posto solo, così la tabella in docs/profili.md resta leggibile.
RAM_APPLE_GB = 15.5  # 16 GB nominali, misurati come GiB arrotondati
DISCO_IMMAGINI_GB = 8.0  # strumenti/immagini/motore.py: DISCO_MINIMO_GB, il minimo per generare
MODELLO_LETTORE_GRANDE = "mlx-community/Qwen3-8B-4bit"
MODELLO_LETTORE_PICCOLO = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
MODELLO_VOCE = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit"
MODELLO_IMMAGINI = "mflux-community/flux2-klein-4b-mflux-q4"
# Dimensioni approssimate (GB) usate solo se la rete non risponde; quelle vere si leggono da Hugging Face.
DIMENSIONI_APPROSSIMATE_GB = {
    MODELLO_LETTORE_GRANDE: 4.6,
    MODELLO_LETTORE_PICCOLO: 3.6,
    MODELLO_VOCE: 2.0,
    MODELLO_IMMAGINI: 4.6,
}
# Cartelle .venv misurate sul Mac di sviluppo (10 nov 2026, docs/guide/installation.md, tabella «What gets written»).
AMBIENTE_GB = {"lettore": 0.45, "voce": 0.47, "immagini": 1.2}
# Spazio che un computer nuovo deve avere libero per ciascun profilo: modelli + ambienti + npm. Su Apple silicon
# la skill (passo 2) crea i tre ambienti Python, quindi sono sempre contati. Il modello delle immagini è a parte.
FABBISOGNO_GB = {
    "apple-16": {"modelli": DIMENSIONI_APPROSSIMATE_GB[MODELLO_LETTORE_GRANDE] + DIMENSIONI_APPROSSIMATE_GB[MODELLO_VOCE],
                 "ambienti": sum(AMBIENTE_GB.values()),
                 "immagini": DIMENSIONI_APPROSSIMATE_GB[MODELLO_IMMAGINI]},
    "apple-piccolo": {"modelli": DIMENSIONI_APPROSSIMATE_GB[MODELLO_LETTORE_PICCOLO] + DIMENSIONI_APPROSSIMATE_GB[MODELLO_VOCE],
                      "ambienti": sum(AMBIENTE_GB.values()),
                      "immagini": 0.0},
    # Senza modelli locali: solo i pacchetti npm del repository (node_modules, misurati a 201 MB).
    "altro": {"modelli": 0.0, "ambienti": 0.0, "immagini": 0.0},
}
NPM_GB = 0.2


def fabbisogno_gb(profilo_id: str) -> float:
    """Gigabyte che il profilo richiede su un computer nuovo, senza il modello delle immagini (vedi FABBISOGNO_GB)."""
    f = FABBISOGNO_GB[profilo_id]
    return round(f["modelli"] + f["ambienti"] + NPM_GB, 1)


def fabbisogno_testo(profilo_id: str) -> str:
    """La frase che si legge prima di qualsiasi download."""
    f = FABBISOGNO_GB[profilo_id]
    testo = (f"about {fabbisogno_gb(profilo_id)} GB on a new computer ({f['modelli']:.1f} GB models + "
             f"{f['ambienti']:.1f} GB Python environments + {NPM_GB} GB npm packages)")
    if f["immagini"]:
        testo += f"; +{f['immagini']:.1f} GB more if you also want the image model"
    return testo


def alternative_leggere() -> list[str]:
    """Le scelte più leggere, da proporre quando il disco non basta per il profilo scelto."""
    return [
        f"apple-piccolo (Apple silicon under 16 GB, 4B reader): {fabbisogno_testo('apple-piccolo')}",
        f"text-only with an Anthropic or OpenRouter key (no local models): {fabbisogno_testo('altro')}",
    ]


# Quale ambiente Python del progetto serve a quale modello (strumenti/configura/scarica.py lo usa).
AMBIENTE_PER_COMPONENTE = {"lettore": "lettore", "voce": "voce", "immagini": "immagini"}


def _componente(provider: str, riserve: list[str] | None = None, **extra: Any) -> dict[str, Any]:
    """Una scelta di componente. `motivo` si legge a voce alta: deve spiegare perché, in una frase."""
    scelta: dict[str, Any] = {"provider": provider, "riserve": riserve or []}
    scelta.update(extra)
    return scelta


def _disco_dopo(rilevamento: dict[str, Any], da_scaricare_gb: float) -> float | None:
    libero = rilevamento.get("disco_libero_gb")
    return None if libero is None else round(libero - da_scaricare_gb, 1)


def _modelli_mancanti(rilevamento: dict[str, Any], modelli: list[str]) -> list[str]:
    cache = rilevamento.get("modelli_in_cache", {})
    return [m for m in modelli if not cache.get(m, False)]


def _gb(modelli: list[str]) -> float:
    return round(sum(DIMENSIONI_APPROSSIMATE_GB[m] for m in modelli), 1)


LINGUE = ("it", "en")  # docs/lingue.md: codici ISO 639-1 supportati dalla configurazione


def scegli(rilevamento: dict[str, Any], applica_chiavi: bool = False, lingua: str = "it") -> dict[str, Any]:
    """Il profilo per questo computer. Sempre deterministico: stesso rilevamento, stessa scelta.

    `lingua` è la lingua dell'interfaccia e dei testi fissi (docs/lingue.md). Non cambia la scelta dei modelli.
    """
    if lingua not in LINGUE:
        raise ValueError(f"lingua non supportata: {lingua!r} (valide: {', '.join(LINGUE)})")
    chiavi = rilevamento.get("chiavi", {})
    anthropic = bool(chiavi.get("ANTHROPIC_API_KEY"))
    openrouter = bool(chiavi.get("OPENROUTER_API_KEY"))
    offerte = []
    if anthropic:
        offerte.append({"chiave": "ANTHROPIC_API_KEY", "sblocca": "lettore", "provider": "anthropic",
                        "nota": "Haiku as narrator: better prose, pay per use"})
    if openrouter:
        offerte.append({"chiave": "OPENROUTER_API_KEY", "sblocca": "voce", "provider": "openrouter",
                        "nota": "drama-3 voice, pay per use"})

    avvisi: list[str] = []
    apple = bool(rilevamento["cpu"]["apple_silicon"])
    # Un ambiente Python mancante rende inutile la scelta locale: lo si dice, non lo si nasconde.
    # (Chiave assente = non misurata: nessun avviso.)
    ambienti = rilevamento.get("ambienti", {})
    if apple:
        ram = rilevamento.get("ram_gb") or 0
        if ram >= RAM_APPLE_GB:
            profilo_id, nome = "apple-16", "Apple silicon, 16 GB"
            modello_lettore = MODELLO_LETTORE_GRANDE
            # Le immagini si scelgono solo se il disco resta sopra il minimo DOPO i download che servono.
            da_scaricare = _modelli_mancanti(rilevamento, [MODELLO_IMMAGINI])
            dopo = _disco_dopo(rilevamento, _gb(da_scaricare))
            immagini_ok = dopo is not None and dopo >= DISCO_IMMAGINI_GB
            if immagini_ok:
                immagini = _componente("locale", ["nessuno"], modello=MODELLO_IMMAGINI,
                                       motivo="FLUX.2 klein 4 bit generates the scene images on this Mac.")
            else:
                immagini = _componente("nessuno", motivo=(
                    f"Disk too tight for the image model: {dopo} GB would be left, {DISCO_IMMAGINI_GB} GB needed. "
                    "The play uses the atmosphere background instead of images."))
                avvisi.append("Images off: free disk space is below the minimum for the image model.")
        else:
            profilo_id, nome = "apple-piccolo", "Apple silicon, under 16 GB"
            modello_lettore = MODELLO_LETTORE_PICCOLO
            immagini = _componente("nessuno", motivo=(
                "Under 16 GB the image model plus its generation peak do not fit comfortably: the play uses the atmosphere background."))
            if ram < 8:
                avvisi.append("Under 8 GB of RAM: the local reader may be slow or fail. Expect delays.")
    else:
        profilo_id, nome = "altro", "Not Apple silicon"
        modello_lettore = None
        immagini = _componente("nessuno", motivo="Local images need Apple silicon (MLX): not yet supported here.")
        avvisi.append("Not Apple silicon: the local reader and voice are not supported here yet (docs/da-fare.md).")

    if apple:
        lettore = _componente("locale", ["finto"], modo="auto", motivo=(
            "Qwen3 runs on this Mac through MLX; the model is the one measured for the reader."))
        voce = _componente("locale", ["finto"], motivo="Qwen3-TTS runs on this Mac through MLX.")
        modelli = [modello_lettore, MODELLO_VOCE] + ([MODELLO_IMMAGINI] if immagini["provider"] == "locale" else [])
    else:
        lettore = _componente("finto", motivo=(
            "No local reader here yet. Without a key the narrator is the scripted one: not a real game. "
            "An Anthropic key makes the narrator real."))
        voce = _componente("finto", motivo="No local voice here yet: a tone stands in for the voice.")
        modelli = []

    if applica_chiavi and anthropic:
        lettore = _componente("anthropic", ["locale", "finto"], motivo=(
            "Haiku as narrator, because a key was found and you asked for it. Local is the fallback."))
    if applica_chiavi and openrouter:
        voce = _componente("openrouter", ["locale" if apple else "finto"], motivo=(
            "drama-3 voice, because a key was found and you asked for it. The fallback is the local voice."))

    locali = [c for c in ("lettore", "voce", "immagini") if componenti_locali(c, lettore, voce, immagini)]
    ambienti_mancanti = [c for c in locali if ambienti.get(c) is False]

    componenti = {
        "lettore": lettore,
        "arbitro_azioni": _componente("regole", motivo="Simultaneous actions are decided by rules; a small model is too slow for it."),
        "arbitro_prove": _componente("regole", motivo="Dice checks are decided by the code (SRD 5.2 classifier), no model needed."),
        "riassunto": _componente("locale" if apple else "regole", ["regole"], motivo="«Last time…» summary from the local reader; the rules summary is the fallback."),
        "regole": _componente("locale" if apple else "regole", ["regole"], motivo="«Ask a rule» from the phone; rule search is the fallback."),
        "voce": voce,
        "immagini": immagini,
    }
    modelli_da_scaricare = _modelli_mancanti(rilevamento, modelli)
    return {
        "lingua": lingua,
        "id": profilo_id,
        "nome": nome,
        "apple_silicon": apple,
        "modello_lettore": modello_lettore,
        "componenti": componenti,
        "modelli": modelli,
        "da_scaricare": modelli_da_scaricare,
        "chiavi_offerte": offerte,
        "chiavi_applicate": applica_chiavi and bool(offerte),
        "ambienti_mancanti": ambienti_mancanti,
        "avvisi": avvisi,
    }


def componenti_locali(nome: str, lettore: dict, voce: dict, immagini: dict) -> bool:
    """Vero se il componente è locale nella scelta (il suo ambiente Python serve)."""
    scelta = {"lettore": lettore, "voce": voce, "immagini": immagini}[nome]
    return scelta["provider"] == "locale"


def testo_locale(profilo: dict[str, Any], quando: str | None = None) -> str:
    """Il contenuto di config/locale.yaml per questo profilo. Ogni scelta ha il suo commento."""
    stampa = quando or datetime.now().strftime("%Y-%m-%d %H:%M")
    righe = [
        f"# Choices of this computer, written by strumenti/configura/configura.py on {stampa}. Not tracked by git.",
        f"# Profile: {profilo['id']} ({profilo['nome']}). Docs: docs/profili.md. Config/predefinita.yaml gives the rest.",
        "# Each choice is explained above its line. Keys are never written here: only the provider names.",
    ]
    if profilo.get("modello_lettore") and profilo["modello_lettore"] != MODELLO_LETTORE_GRANDE:
        righe += ["backend:", "  locale:", f"    # Smaller reader for this Mac (under 16 GB).", f"    modello: {profilo['modello_lettore']}"]
    righe += [
        "# Language of the interface and fixed texts (docs/lingue.md). Overrides config/predefinita.yaml.",
        f"lingua: {profilo.get('lingua', 'it')}",
    ]
    righe.append("componenti:")
    for nome, scelta in profilo["componenti"].items():
        righe.append(f"  # {scelta['motivo']}")
        riserve = ", ".join(scelta["riserve"])
        riga = f"  {nome}: {{provider: {scelta['provider']}"
        riga += f", riserve: [{riserve}]}}" if riserve else "}"
        righe.append(riga)
    return "\n".join(righe) + "\n"


def scrivi_locale(profilo: dict[str, Any], percorso: Path, quando: str | None = None) -> None:
    """Scrive il file indicato. Non legge né tocca altri file: chi chiama decide il percorso."""
    percorso.parent.mkdir(parents=True, exist_ok=True)
    percorso.write_text(testo_locale(profilo, quando), encoding="utf-8")
