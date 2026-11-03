"""Descrittori audio dai dati della campagna: musica e ambienti per luogo, tema per PNG.

Ordine di precedenza, sempre:
  1. i campi espliciti `audio` (stile, scena, nodo) e `tema` (PNG) scritti dal Preparatore;
  2. altrimenti le regole a parole chiave di vocabolario.py sui testi pubblici (campagna_audio.py).
Ogni scelta porta il suo `perche` (campo, parola trovata, peso): finisce in audio/descrittori.json.
"""

from __future__ import annotations

import logging
import zlib
from dataclasses import asdict, dataclass, field

import vocabolario as V
from campagna_audio import CampagnaAudio, LuogoTesti, PngTesti

log = logging.getLogger("audio.descrittori")

# Quanto conta ogni campo di un luogo per gli ambienti e i descrittori. I sensi sono scritti
# apposta per questo (tre dettagli, almeno due non visivi); la descrizione mescola la pianta di
# altri posti («Bice fa da faro dal parapetto»), quindi pesa la metà.
PESI_CAMPI = {"nome": 1.0, "sensi": 1.2, "prompt_luogo": 1.0, "invarianti": 0.8, "elementi": 0.6,
              "apertura": 0.8, "descrizione": 0.5, "abbozzo": 1.0}
PESO_STILE = 0.35          # lo stile della campagna (es. «rain-soaked night») vale per tutti i luoghi
SOGLIA_AMBIENTE = 1.0      # punteggio minimo perché un tag d'ambiente diventi il primo strato
# Il secondo e il terzo strato devono essere via via più sicuri: un odore di stalla citato una
# volta non deve diventare un coro di oche.
SOGLIE_STRATI = (1.0, 1.3, 1.6)
MAX_STRATI = 3             # strati d'ambiente per luogo
MAX_PAROLE_PERCHE = 4      # quante parole trovate si tengono come prova, per tag
CONTRARI = [{"staccato", "legato"}, {"aumentazione", "diminuzione"}]
UMORE_AMBIENTAZIONE = {"chiesa": "rito_sacro", "taverna": "taverna_calda"}


@dataclass
class ProfiloCampagna:
    id: str
    modo: str
    tonica: int                      # classe di altezza 0–11
    bpm: int
    strumenti: list[str]             # la tavolozza ammessa (nostro vocabolario)
    vietati: list[str]
    epoca: str
    umore_base: str
    motivo: dict | None              # stile.audio.motivo esplicito (gancio per un LLM), se c'è
    perche: dict = field(default_factory=dict)


@dataclass
class DescrittoreMusica:
    umore: str
    energia: str
    ambientazioni: list[str]
    ora: str | None
    meteo: list[str]
    interno: bool
    parole: list[str] = field(default_factory=list)   # descrittori liberi espliciti (audio.musica)


@dataclass
class DescrittoreLuogo:
    id: str
    nome: str
    alias_di: str | None
    musica: DescrittoreMusica | None
    ambiente: list[tuple[str, float]]   # (tag, volume suggerito)
    transizioni: list[str]
    perche: dict = field(default_factory=dict)


@dataclass
class SpecTema:
    png: str
    nome: str
    carattere: list[str]
    strumento: str
    modo: str
    registro: str
    trasformazioni: list[str]
    perche: dict = field(default_factory=dict)


def _punteggi(regole: list[V.Regola], testi: dict[str, str], pesi: dict[str, float]) -> tuple[dict[str, float], dict[str, list[str]]]:
    """Somma i pesi delle regole sui campi; ritorna (punteggio per tag, prove «campo: parola»)."""
    punti: dict[str, float] = {}
    prove: dict[str, list[str]] = {}
    for campo, testo in testi.items():
        peso_campo = pesi.get(campo, 0.5)
        for tag, trovate in V.trova(regole, testo).items():
            # Una parola ripetuta nello stesso campo conta una volta sola, più un piccolo extra.
            uniche = {p for p, _ in trovate}
            punti[tag] = punti.get(tag, 0.0) + peso_campo * max(w for _, w in trovate) * (1 + 0.15 * (len(uniche) - 1))
            for p in sorted(uniche)[:MAX_PAROLE_PERCHE]:
                prova = f"{campo}: {p}"
                if prova not in prove.setdefault(tag, []) and len(prove[tag]) < MAX_PAROLE_PERCHE:
                    prove[tag].append(prova)
    return punti, prove


def _testi_stile(c: CampagnaAudio) -> dict[str, str]:
    return {"stile_immagini": c.stile["stile_immagini"], "tono": c.stile["tono"]}


# --- Profilo di campagna -------------------------------------------------------------------
def profilo_campagna(c: CampagnaAudio) -> ProfiloCampagna:
    a = c.audio or {}
    perche: dict = {}
    # Tonalità e modo: espliciti in stile.audio, altrimenti dal tono; la tonica, se manca, viene
    # dall'id della campagna (deterministica) tra tonalità comode da cantare.
    tonica, modo = V.tonica_da_testo(a.get("tonalita"))
    modo = V.normalizza_modo(a.get("modo")) or modo
    if modo:
        perche["modo"] = "stile.audio"
    else:
        punti, prove = _punteggi(V.REGOLE_MODO_CAMPAGNA, {"tono": c.stile["tono"], "tema": c.stile["tema"]}, {"tono": 1.0, "tema": 0.6})
        modo = max(V.REGOLE_MODO_CAMPAGNA, key=lambda r: (punti.get(r.tag, 0), -V.REGOLE_MODO_CAMPAGNA.index(r))).tag if punti else "dorico"
        perche["modo"] = prove.get(modo, ["predefinito"])
    if tonica is None:
        tonica = (2, 4, 7, 9, 0)[zlib.crc32(c.id.encode()) % 5]   # re, mi, sol, la, do
        perche["tonica"] = "dall'id della campagna"
    bpm = int(a.get("tempo") or 0) or 88
    # Strumenti: stile.audio.strumenti (lista o testo) prima, poi tavolozza_musicale.strumenti.
    sorgente = a.get("strumenti")
    testo_strumenti = ", ".join(sorgente) if isinstance(sorgente, list) else (sorgente or c.stile["strumenti"])
    strumenti, vietati = V.strumenti_in(testo_strumenti)
    perche["strumenti"] = testo_strumenti
    punti, prove = _punteggi(V.REGOLE_EPOCA, {**_testi_stile(c), "regole_prosa": c.stile["regole_prosa"]}, {})
    epoca = a.get("epoca") if a.get("epoca") in V.EPOCHE else ("futura" if punti.get("futura", 0) > 1 else "moderna" if punti.get("moderna", 0) > punti.get("antica", 0) + 1 else "antica")
    perche["epoca"] = prove.get(epoca, ["predefinita: fantasy"])
    umore_base = a.get("umore_base") if a.get("umore_base") in V.UMORI else (c.tavolozza_tag[0] if c.tavolozza_tag else "esplorazione_tesa")
    return ProfiloCampagna(c.id, modo, tonica, bpm, strumenti, vietati, epoca, umore_base, a.get("motivo"), perche)


# --- Luoghi --------------------------------------------------------------------------------
def _classifica_parole(parole: list[str]) -> dict[str, list[str]]:
    """Le parole di audio.musica, ognuna nella sua categoria del vocabolario (le altre restano libere)."""
    out: dict[str, list[str]] = {"umore": [], "energia": [], "ora": [], "meteo": [], "ambientazione": [], "libere": []}
    for p in parole or []:
        p = str(p).strip().lower()
        if p in V.UMORI:
            out["umore"].append(p)
        elif p in V.ENERGIE:
            out["energia"].append(p)
        elif p in V.ORE:
            out["ora"].append(p)
        elif p in V.METEO:
            out["meteo"].append(p)
        elif p in V.AMBIENTAZIONI:
            out["ambientazione"].append(p)
        else:
            out["libere"].append(p)
    return out


def _energia(intensita: int | None, umore: str) -> str:
    base = V.ENERGIA_UMORE.get(umore, "media")
    if intensita is None:
        return base
    da_intensita = "bassa" if intensita <= 2 else "media" if intensita == 3 else "alta"
    # Vince la più alta tra intensità e umore, salvo gli umori calmi (lutto, rito) che restano bassi.
    if base == "bassa" and umore in ("lutto", "rito_sacro"):
        return "bassa" if intensita <= 3 else "media"
    ordine = {"bassa": 0, "media": 1, "alta": 2}
    return max(base, da_intensita, key=ordine.get)


def descrivi_luogo(l: LuogoTesti, prof: ProfiloCampagna, c: CampagnaAudio) -> DescrittoreLuogo:
    if l.alias_di:
        return DescrittoreLuogo(l.id, l.nome, l.alias_di, None, [], [], {"alias_di": l.alias_di})
    a = l.audio or {}
    esplicite = _classifica_parole(a.get("musica") or [])
    perche: dict = {}
    testi_stile = _testi_stile(c)
    pesi_stile = {k: PESO_STILE for k in testi_stile}

    # Umore: audio.umore_iniziale > audio.musica > musica.tag della scena > umore di base.
    umore = next((u for u in [a.get("umore_iniziale"), *esplicite["umore"], l.umore] if u in V.UMORI), None)
    perche["umore"] = "audio.umore_iniziale" if a.get("umore_iniziale") in V.UMORI else "audio.musica" if esplicite["umore"] else "scena.musica.tag" if l.umore else None

    def dedotti(regole, soglia=0.8, con_stile=True):
        testi = {**l.testi, **(testi_stile if con_stile else {})}
        pesi = {**PESI_CAMPI, **pesi_stile, **({"nome": 2.0} if regole is V.REGOLE_AMBIENTAZIONE else {})}
        punti, prove = _punteggi(regole, testi, pesi)
        scelti = sorted((t for t, p in punti.items() if p >= soglia), key=lambda t: -punti[t])
        return scelti, {t: {"punti": round(punti[t], 2), "prove": prove.get(t, [])} for t in scelti}

    ambientazioni, perche["ambientazioni"] = (esplicite["ambientazione"], "audio.musica") if esplicite["ambientazione"] else dedotti(V.REGOLE_AMBIENTAZIONE, con_stile=False)
    if umore is None:
        # Un nodo senza scheda non ha musica.tag: lo dice il tipo di posto (una chiesa è un rito,
        # un'osteria una taverna), altrimenti vale l'umore di base della campagna.
        primo = ambientazioni[0] if ambientazioni else None
        umore = UMORE_AMBIENTAZIONE.get(primo, prof.umore_base)
        perche["umore"] = f"ambientazione {primo}" if primo in UMORE_AMBIENTAZIONE else "umore di base della campagna"
    energia = esplicite["energia"][0] if esplicite["energia"] else _energia(l.intensita, umore)
    perche["energia"] = "audio.musica" if esplicite["energia"] else f"intensità {l.intensita}, umore {umore}"
    ore, p_ore = dedotti(V.REGOLE_ORA, soglia=0.3)
    ora = esplicite["ora"][0] if esplicite["ora"] else (ore[0] if ore else None)
    perche["ora"] = "audio.musica" if esplicite["ora"] else p_ore
    meteo, perche["meteo"] = (esplicite["meteo"], "audio.musica") if esplicite["meteo"] else dedotti(V.REGOLE_METEO, soglia=0.3)
    p_est, _ = _punteggi(V.REGOLE_ESTERNO, l.testi, PESI_CAMPI)
    p_int, _ = _punteggi(V.REGOLE_INTERNO, l.testi, PESI_CAMPI)
    interno = p_int.get("interno", 0) > p_est.get("esterno", 0)
    perche["interno"] = {"interno": round(p_int.get("interno", 0), 2), "esterno": round(p_est.get("esterno", 0), 2)}
    musica = DescrittoreMusica(umore, energia, ambientazioni, ora, meteo, interno, esplicite["libere"])

    # Ambienti: audio.ambiente esplicito (lista di tag, o di {tag, volume}) prima di tutto.
    esplicito = a.get("ambiente")
    if esplicito:
        ambiente = []
        for voce in esplicito:
            tag, vol = (voce.get("tag"), voce.get("volume")) if isinstance(voce, dict) else (voce, None)
            if tag in V.AMBIENTI:
                ambiente.append((tag, float(vol) if vol is not None else V.AMBIENTI[tag].volume))
            else:
                log.warning("%s: audio.ambiente %r fuori dal vocabolario, ignorato", l.id, tag)
        perche["ambiente"] = "audio.ambiente"
    else:
        ambiente, perche["ambiente"] = _ambienti_dedotti(l, musica, testi_stile, pesi_stile)
    return DescrittoreLuogo(l.id, l.nome, None, musica, ambiente, l.transizioni, perche)


def _ambienti_dedotti(l: LuogoTesti, m: DescrittoreMusica, testi_stile: dict, pesi_stile: dict):
    punti, prove = _punteggi(V.REGOLE_AMBIENTE, {**l.testi, **testi_stile}, {**PESI_CAMPI, **pesi_stile})
    # Ridondanze: con la pioggia vera, l'«acqua» generica non serve; la neve col vento è un solo strato.
    if punti.get("fiume", 0) >= SOGLIA_AMBIENTE:
        punti.pop("acqua", None)
    if punti.get("neve", 0) >= SOGLIA_AMBIENTE and punti.get("vento", 0) < punti.get("neve", 0):
        punti.pop("vento", None)
    if punti.get("taverna", 0) >= SOGLIA_AMBIENTE:
        punti["taverna"] += 0.5 * punti.pop("folla", 0)   # la taverna è già una folla
    # La notte d'ambiente (grilli, civette) solo fuori, di notte, senza pioggia, neve o gelo.
    if m.ora == "notte" and not m.interno and not set(m.meteo) & {"pioggia", "neve", "gelo", "temporale"}:
        punti["notte"] = max(punti.get("notte", 0), SOGLIA_AMBIENTE)
        prove.setdefault("notte", []).append("notte all'aperto senza pioggia né neve")
    ordinati = sorted((t for t in punti if t in V.AMBIENTI), key=lambda t: -punti[t])
    scelti = [t for i, t in enumerate(ordinati[:MAX_STRATI]) if punti[t] >= SOGLIE_STRATI[i]]
    ambiente = []
    for i, tag in enumerate(scelti):
        vol = V.AMBIENTI[tag].volume * (1.0, 0.75, 0.6)[i]
        # Dentro casa la pioggia, il vento e il fiume si sentono attraverso i muri: più piano.
        if m.interno and tag in ("pioggia", "vento", "neve", "fiume", "temporale", "acqua"):
            vol *= 0.5
        ambiente.append((tag, round(vol, 2)))
    return ambiente, {t: {"punti": round(punti[t], 2), "prove": prove.get(t, [])} for t in scelti}


def effetti_campagna(c: CampagnaAudio) -> dict[str, list[str]]:
    """Gli effetti singoli che la campagna cita (campane, porte, catene…), con le prove."""
    testi = {"regole_prosa": c.stile["regole_prosa"]}
    for l in c.luoghi:
        for k in ("nome", "sensi", "elementi", "apertura", "abbozzo", "descrizione"):
            if l.testi.get(k):
                testi[f"{l.id}.{k}"] = l.testi[k]
    # Ogni campo pesa 1: basta una menzione chiara (un effetto costa poco e il master lo usa a mano).
    punti, prove = _punteggi(V.REGOLE_EFFETTI, testi, {k: 1.0 for k in testi})
    return {t: prove.get(t, []) for t, p in sorted(punti.items(), key=lambda x: -x[1]) if p >= 1.0 and t in V.EFFETTI}


# --- Temi dei PNG --------------------------------------------------------------------------
def _registro(p: PngTesti, spinte: list[str]) -> tuple[str, str]:
    if p.altezza in ("bassa", "grave"):
        base, motivo = "basso", f"voce {p.altezza}"
    elif p.altezza in ("alta", "acuta"):
        base, motivo = "alto", f"voce {p.altezza}"
    else:
        base, motivo = "medio", "voce media"
    if p.eta is not None and p.eta >= 60 and base == "medio":
        base, motivo = "basso", f"età {p.eta}"
    elif p.eta is not None and p.eta <= 20 and base == "medio":
        base, motivo = "alto", f"età {p.eta}"
    if base == "medio" and spinte:
        base, motivo = spinte[0], "carattere"
    return base, motivo


def spec_temi(c: CampagnaAudio, prof: ProfiloCampagna) -> list[SpecTema]:
    """Una specifica di tema per PNG, con strumenti tutti diversi (si riconoscono a orecchio)."""
    pesi = {"superficie": 1.2, "sotto_pressione": 0.6, "voce": 0.8, "lettura": 0.7, "timbro": 0.8}
    regole = [V.Regola(nome, car.schema) for nome, car in V.CARATTERI.items()]
    bozze = []
    for p in c.png:
        t = p.tema or {}
        punti, prove = _punteggi(regole, p.testi, pesi)
        dedotti = sorted(punti, key=lambda k: (-punti[k], k))[:2] or ["pacato"]
        esplicito = t.get("carattere")
        if isinstance(esplicito, str):
            esplicito = [x.strip() for x in esplicito.replace(";", ",").split(",") if x.strip()]
        carattere = [x for x in (esplicito or []) if x in V.CARATTERI] or dedotti
        perche = {"carattere": "png.tema" if esplicito and carattere != dedotti else {k: prove.get(k, []) for k in carattere}}
        car = V.CARATTERI[carattere[0]]
        modo = V.normalizza_modo(t.get("modo")) or car.modo
        perche["modo"] = "png.tema" if V.normalizza_modo(t.get("modo")) else f"carattere {carattere[0]}"
        if t.get("registro") in V.REGISTRI:
            registro, perche["registro"] = t["registro"], "png.tema"
        else:
            spinte = [V.CARATTERI[k].registro for k in carattere if V.CARATTERI[k].registro]
            registro, perche["registro"] = _registro(p, spinte)
        # Il carattere principale porta tutte le sue trasformazioni; il secondo una sola, se non
        # contraddice (staccato/legato, aumentazione/diminuzione).
        trasf = list(V.CARATTERI[carattere[0]].trasformazioni)
        for x in (V.CARATTERI[carattere[1]].trasformazioni if len(carattere) > 1 else ()):
            if x not in trasf and not any({x, y} in CONTRARI for y in trasf):
                trasf.append(x)
                break
        esplicito_strum = V.strumenti_in(str(t.get("strumento") or ""))[0]
        bozze.append((p, carattere, modo, registro, trasf, esplicito_strum, perche))

    # Strumenti: prima quelli scritti nel tema; poi, per gli altri, la tavolozza della campagna
    # (in ordine di affinità col carattere), poi le preferenze del carattere; mai lo stesso due volte.
    usati: set[str] = set()
    out = []
    for p, carattere, modo, registro, trasf, esplicito_strum, perche in sorted(bozze, key=lambda b: not b[5]):
        candidati = [s for s in esplicito_strum if s in V.STRUMENTI_TEMA]
        preferiti = [s for k in carattere for s in V.CARATTERI[k].strumenti]
        tavolozza = [s for s in prof.strumenti if s in V.STRUMENTI_TEMA and s not in prof.vietati]
        # Ordine: tavolozza ∩ preferenze del carattere; poi la tavolozza «da solista» (un coro o una
        # campana tubolare non reggono un motivo da soli); poi le preferenze; poi il resto.
        gradi = {s: (0, preferiti.index(s)) if s in preferiti else
                 (2, 0) if V.STRUMENTI[s].famiglia in ("voci", "percussioni_intonate") else
                 (1, _affinita_registro(s, registro)) for s in tavolozza}
        tavolozza.sort(key=lambda s: gradi[s])
        solisti = [s for s in tavolozza if gradi[s][0] < 2]
        candidati += solisti + preferiti + [s for s in tavolozza if s not in solisti] + [s for s in V.STRUMENTI_TEMA if s not in prof.vietati]
        strumento = next((s for s in candidati if s not in usati), candidati[0])
        usati.add(strumento)
        perche["strumento"] = ("png.tema" if strumento in esplicito_strum else
                               "tavolozza della campagna" if strumento in tavolozza else
                               f"preferenza del carattere {carattere[0]}" if strumento in preferiti else "primo libero")
        out.append(SpecTema(p.id, p.nome, carattere, strumento, modo, registro, trasf, perche))
    return sorted(out, key=lambda s: s.png)


def _affinita_registro(strumento: str, registro: str) -> int:
    """0 se l'estensione dello strumento contiene bene il registro richiesto, poi cresce."""
    lo, hi = V.STRUMENTI[strumento].estensione
    centro = V.REGISTRI[registro]
    return 0 if lo + 5 <= centro <= hi - 7 else abs((lo + hi) / 2 - centro) // 6 + 1


def tutto(c: CampagnaAudio) -> dict:
    """Profilo, luoghi, effetti e temi in un solo dizionario (quello che va in descrittori.json)."""
    prof = profilo_campagna(c)
    luoghi = [descrivi_luogo(l, prof, c) for l in c.luoghi]
    return {"profilo": prof, "luoghi": luoghi, "effetti": effetti_campagna(c), "temi": spec_temi(c, prof)}


def come_json(d: dict) -> dict:
    return {
        "profilo": asdict(d["profilo"]),
        "luoghi": [asdict(l) for l in d["luoghi"]],
        "effetti": d["effetti"],
        "temi": [asdict(t) for t in d["temi"]],
    }
