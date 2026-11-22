"""Set di regole della campagna (docs/regole.md, §2): i controlli [V] del validatore, classe REGOLE.

Il set sta in campagne/<id>/regole/: regole.yaml (struttura), riassunto.md (per i giocatori), estratti/*.md
(passi del manuale). Senza regole.yaml la campagna gioca con l'SRD 5.2 e questo modulo non fa nulla.
Con un set non SRD (id diverso da srd-5.2) i controlli SRD di regole_schede e le schede PNG con le sei
caratteristiche di D&D non si applicano: le schede e le prove si controllano qui, contro il set.

Le regole non marcate [V] nel documento sono avvisi, non errori.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito
from . import regole_combattimento
from . import regole_classi
from . import regole_progressione
from . import regole_poteri
from . import regole_catalogo
from . import regole_bestiario
from . import regole_creazione
from .regole_effetti import controlla_cadute, controlla_effetti, controlla_riposo
from .regole_repertorio import blocchi_richiede
from .lingua import generiche_in
from .regole_schede import TIPI_PROVA_RICHIEDE, _id_attacchi, _prove_della_campagna, dadi_attivi
from .testo import n_parole

ID_SRD = "srd-5.2"
TIPI = ("d20_cd", "2d6_fasce", "sotto_soglia")
MODIFICATORI = ("srd", "diretto", "soglia", "tabella")
VANTAGGI = ("due_dadi", "dado_bonus", "bonus", "nessuno")
ESITI_FASCIA = ("successo", "parziale", "fallimento")
ATTACCHI = ("prova", "automatico")
RIASSUNTO_MAX_PAROLE = 400
ESTRATTO_MAX_RIGHE = 12
RE_ID_SET = re.compile(r"^[a-z0-9][a-z0-9.-]*$")       # id del set: minuscole, cifre, - e .
RE_CHIAVE = re.compile(r"^[a-z][a-z0-9_]*$")          # id di caratteristiche, abilità, mosse, difficoltà
FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _testo(v) -> str | None:
    return v.strip() if isinstance(v, str) and v.strip() else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def attivo(c: Campagna) -> bool:
    """Vero se la campagna ha un set non SRD: allora i controlli SRD di schede e prove non si applicano."""
    return isinstance(c.regole, dict) and str(c.regole.get("id", "")) != ID_SRD


def _err(e: Esito, regola: str, dove: str, msg: str) -> None:
    e.errore(f"REGOLE.{regola}", dove, msg)


def _voci(v, campo: str, dove: str, e: Esito, obbligatorio: bool) -> list[dict]:
    """Un elenco di {id, nome, …}: id in snake_case senza accenti, unico. Ritorna le voci valide."""
    if v is None:
        if obbligatorio:
            _err(e, campo, dove, f"manca {campo}")
        return []
    if not isinstance(v, list):
        _err(e, campo, dove, f"{campo} deve essere un elenco")
        return []
    viste: set[str] = set()
    out = []
    for i, x in enumerate(v, start=1):
        o = _ogg(x)
        cid = _testo(o.get("id")) if o else None
        if not cid or not RE_CHIAVE.match(cid):
            _err(e, campo, dove, f"{campo}[{i}]: serve un id in snake_case senza accenti")
            continue
        if cid in viste:
            _err(e, campo, dove, f"{campo}: id ripetuto «{cid}»")
            continue
        viste.add(cid)
        out.append(o)
    return out


def _identita(r: dict, e: Esito, dove: str) -> None:
    """id, nome, fonte e licenza: i campi che il giocatore e il repository vedono."""
    if not isinstance(r.get("id"), str) or not RE_ID_SET.match(r["id"]):
        _err(e, "id", dove, "id: serve come «pbta-2d6» (minuscole, cifre, - e .)")
    if not _testo(r.get("nome")):
        _err(e, "nome", dove, "manca nome (come lo vedono i giocatori)")
    fonte = _ogg(r.get("fonte")) or {}
    if not _testo(fonte.get("titolo")):
        _err(e, "fonte", dove, "manca fonte.titolo")
    lic = _ogg(r.get("licenza")) or {}
    if not _testo(lic.get("nome")):
        _err(e, "licenza", dove, "manca licenza.nome (o «proprietaria», «CC0», …)")
    if not isinstance(lic.get("libera"), bool):
        _err(e, "licenza", dove, "licenza.libera: true o false")


def _risoluzione(r: dict, e: Esito, dove: str) -> tuple[str | None, int | None]:
    """Tipo di risoluzione e facce del dado principale. Ritorna (tipo, facce) o (None, None) se rotto."""
    ris = _ogg(r.get("risoluzione"))
    tipo = ris.get("tipo") if ris else None
    if tipo not in TIPI:
        _err(e, "risoluzione", dove, f"risoluzione.tipo: uno tra {', '.join(TIPI)}")
        return None, None
    if tipo == "sotto_soglia":
        dado = ris.get("dado")
        if dado not in (20, 100):
            _err(e, "dado", dove, "risoluzione.dado: 20 o 100 per sotto_soglia")
            return tipo, None
        return tipo, dado
    if tipo == "2d6_fasce":
        return tipo, 6
    # d20_cd: i naturali critico (da 2 a 20) e disastro (da 1 a 19); assenti = SRD (20 e 1), null = nessuno.
    for k, (da, a) in (("critico", (2, 20)), ("disastro", (1, 19))):
        if ris.get(k) is not None and not (_intero(ris[k]) and da <= ris[k] <= a):
            _err(e, k, dove, f"risoluzione.{k}: nel d20_cd un dado naturale da {da} a {a}, o null")
    # attacchi_e_salvezze: also the abilities marked `salvezza: true` (Basic Fantasy p. 60), checked in controlla().
    if ris.get("critici") is not None and ris["critici"] not in ("attacchi", "attacchi_e_salvezze", "tutti"):
        _err(e, "critici", dove, "risoluzione.critici: attacchi, attacchi_e_salvezze o tutti")
    return tipo, 20


def _fasce(r: dict, e: Esito, dove: str) -> None:
    fasce = _ogg(r.get("risoluzione")) or {}
    grezze = fasce.get("fasce") or []
    for i, x in enumerate(grezze, start=1):
        o = _ogg(x)
        if not o or o.get("esito") not in ESITI_FASCIA:
            _err(e, "fasce", dove, f"risoluzione.fasce[{i}]: esito successo, parziale o fallimento")
    if grezze and not any(_ogg(x) and _ogg(x).get("min") is None for x in grezze):
        e.avviso("REGOLE.fasce", dove, "risoluzione.fasce: manca la fascia più bassa (min vuoto)")


def _reazioni(r: dict, car: set[str], e: Esito, dove: str) -> None:
    """The reaction tables (regole/reazioni.ts; Basic Fantasy pp. 46, 50): dice, characteristic, bands from the lowest."""
    v = r.get("reazioni")
    if v is None:
        return
    if not isinstance(v, list):
        _err(e, "reazioni", dove, "reazioni: un elenco di {id, nome, dadi, caratteristica, fasce}")
        return
    visti: set[str] = set()
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        rid = o.get("id")
        if not (isinstance(rid, str) and re.match(r"^[a-z0-9_]+$", rid)):
            _err(e, "reazioni", dove, f"reazioni[{i}]: un id in snake_case")
            continue
        if rid in visti:
            _err(e, "reazioni", dove, f"reazioni: id ripetuto «{rid}»")
        visti.add(rid)
        if not (isinstance(o.get("dadi"), str) and re.match(r"^\d*d\d+([+-]\d+)?$", o["dadi"].replace(" ", ""))):
            _err(e, "reazioni", dove, f"reazioni.{rid}.dadi: una formula come \"2d6\"")
        if o.get("caratteristica") is not None and o["caratteristica"] not in car:
            _err(e, "reazioni", dove, f"reazioni.{rid}.caratteristica: «{o['caratteristica']}» non è una caratteristica del set")
        fasce = [f for f in o.get("fasce") or [] if isinstance(f, dict)]
        if not fasce or len(fasce) != len(o.get("fasce") or []):
            _err(e, "reazioni", dove, f"reazioni.{rid}.fasce: almeno una, {{fino_a, nome, atteggiamento}}")
            continue
        limiti = [f.get("fino_a") for f in fasce]
        if limiti[-1] is not None or any(not _intero(n) for n in limiti[:-1]) or any(limiti[k] <= limiti[k - 1] for k in range(1, len(limiti) - 1)):
            _err(e, "reazioni", dove, f"reazioni.{rid}.fasce: «fino_a» cresce fascia dopo fascia, e solo l'ultima è null")
        for f in fasce:
            if not (isinstance(f.get("nome"), str) and f["nome"].strip()):
                _err(e, "reazioni", dove, f"reazioni.{rid}.fasce: ogni fascia ha un nome")
            if f.get("atteggiamento") is not None and f["atteggiamento"] not in ("ostile", "indifferente", "amichevole"):
                _err(e, "reazioni", dove, f"reazioni.{rid}.fasce.atteggiamento: ostile, indifferente o amichevole")


def _difficolta(r: dict, tipo: str | None, e: Esito, dove: str) -> list[str]:
    """Difficoltà: la CD per d20_cd, il divisore per sotto_soglia. Ritorna gli id."""
    voci = _voci(r.get("difficolta"), "difficolta", dove, e, obbligatorio=True)
    ids = []
    for o in voci:
        ids.append(o["id"])
        if tipo == "d20_cd" and not _intero(o.get("valore")):
            _err(e, "difficolta", dove, f"difficolta.{o['id']}: serve valore (la CD)")
        if tipo == "sotto_soglia" and not (_intero(o.get("divisore")) and o["divisore"] >= 1):
            _err(e, "difficolta", dove, f"difficolta.{o['id']}: serve divisore (1 = normale)")
        # M9: the percentage points a d100 threshold gets at this rung (the slimy wall's −20).
        if "percentuale" in o and not (_intero(o["percentuale"]) and -100 <= o["percentuale"] <= 100):
            _err(e, "difficolta", dove, f"difficolta.{o['id']}.percentuale: punti percentuali da −100 a 100 per le soglie su d100")
    if not ids:
        return ids
    pred = r.get("difficolta_predefinita")
    if pred is not None and pred not in ids:
        _err(e, "difficolta_predefinita", dove, f"difficolta_predefinita «{pred}» non è tra le difficoltà")
    # The default rung's number by the character's level (Basic Fantasy p. 189; regole/prove-livello.ts).
    righe = r.get("difficolta_per_livello")
    if righe is not None:
        if tipo != "d20_cd":
            _err(e, "difficolta", dove, "difficolta_per_livello: solo con risoluzione d20_cd")
        elif not (isinstance(righe, list) and righe and all(isinstance(x, dict) and _intero(x.get("da")) and x["da"] >= 0 and _intero(x.get("valore")) for x in righe)):
            _err(e, "difficolta", dove, "difficolta_per_livello: un elenco di {da: <livello da 0>, valore: <il numero da fare>}")
        elif any(righe[i]["da"] <= righe[i - 1]["da"] for i in range(1, len(righe))):
            _err(e, "difficolta", dove, "difficolta_per_livello: «da» cresce riga dopo riga")
    return ids


def _modificatore(r: dict, tipo: str | None, e: Esito, dove: str) -> None:
    mod = _ogg(r.get("modificatore")) or {}
    t = mod.get("tipo")
    if t is None:
        return
    if t not in MODIFICATORI:
        _err(e, "modificatore", dove, "modificatore.tipo: srd, diretto, soglia o tabella")
    elif (t == "soglia") != (tipo == "sotto_soglia"):
        _err(e, "modificatore", dove, "modificatore.tipo «soglia» va (solo) con risoluzione sotto_soglia")
    if t == "tabella":
        righe = mod.get("tabella")
        ok = isinstance(righe, list) and righe and all(_ogg(x) and _intero(_ogg(x).get("da")) and _intero(_ogg(x).get("mod")) for x in righe)
        if not ok:
            _err(e, "modificatore", dove, "modificatore.tabella: righe {da, mod} con numeri interi, almeno una")
        elif any(righe[i]["da"] <= righe[i - 1]["da"] for i in range(1, len(righe))):
            _err(e, "modificatore", dove, "modificatore.tabella: «da» cresce riga dopo riga")


def _generiche(e: Esito, dove: str, campo: str, gen: list[str]) -> None:
    """Parole generiche in una lista che sceglie la prova (lingue/<codice>/prove.yaml, `parole.generiche`)."""
    e.avviso("REGOLE.parole_generiche", dove, f"{campo}: «{', '.join(gen)}»: parole generiche (luoghi, corpo, oggetti "
             "comuni) che da sole non dicono quale prova: l'arbitro a regole le ignora; scrivi parole specifiche, o una voce di più parole («passaggio segreto»)",
             rigoroso=True)


def tabella_modificatori(r: dict) -> list[tuple[int, int]] | None:
    """Le righe (da, mod) della tabella del set, o None se il set non usa `tabella`."""
    mod = _ogg(r.get("modificatore")) or {}
    if mod.get("tipo") != "tabella" or not isinstance(mod.get("tabella"), list):
        return None
    return [(x["da"], x["mod"]) for x in mod["tabella"] if _ogg(x) and _intero(x.get("da")) and _intero(x.get("mod"))]


def _vantaggio(r: dict, dado: int | None, e: Esito, dove: str) -> None:
    v = _ogg(r.get("vantaggio")) or {}
    t = v.get("tipo")
    if t is None:
        return
    if t not in VANTAGGI:
        _err(e, "vantaggio", dove, "vantaggio.tipo: due_dadi, dado_bonus, bonus o nessuno")
    elif t == "dado_bonus" and dado != 100:
        _err(e, "vantaggio", dove, "vantaggio.tipo dado_bonus solo con d100 (risoluzione sotto_soglia, dado 100)")


def _schema_sociale_attacchi(r: dict, car: set[str], abi: set[str], e: Esito, dove: str) -> None:
    soc = _ogg(r.get("sociale")) or {}
    if soc.get("caratteristica") is not None and soc["caratteristica"] not in car:
        _err(e, "sociale", dove, f"sociale.caratteristica inesistente «{soc['caratteristica']}»")
    if soc.get("abilita") is not None and soc["abilita"] not in abi:
        _err(e, "sociale", dove, f"sociale.abilita inesistente «{soc['abilita']}»")
    att = _ogg(r.get("attacchi")) or {}
    if att.get("tipo") is not None and att["tipo"] not in ATTACCHI:
        _err(e, "attacchi", dove, "attacchi.tipo: prova o automatico")
    if att.get("danno_critico") is not None and att["danno_critico"] not in ("doppio", "normale"):
        _err(e, "attacchi", dove, "attacchi.danno_critico: doppio o normale")
    if "danno_minimo" in att and not (_intero(att["danno_minimo"]) and att["danno_minimo"] >= 0):
        _err(e, "attacchi", dove, "attacchi.danno_minimo: un intero da 0 in su")


def _mosse(r: dict, car: set[str], e: Esito, dove: str) -> set[str]:
    ids = set()
    for o in _voci(r.get("mosse"), "mosse", dove, e, obbligatorio=False):
        ids.add(o["id"])
        if o.get("caratteristica") not in car:
            _err(e, "mosse", dove, f"mosse.{o['id']}: caratteristica inesistente «{o.get('caratteristica')}»")
        es = _ogg(o.get("esiti")) or {}
        if not _testo(es.get("successo")) or not _testo(es.get("fallimento")):
            _err(e, "mosse", dove, f"mosse.{o['id']}: esiti.successo e esiti.fallimento sono obbligatori")
    return ids


def _abilita(r: dict, car: set[str], e: Esito, dove: str) -> set[str]:
    ids = set()
    for o in _voci(r.get("abilita"), "abilita", dove, e, obbligatorio=False):
        ids.add(o["id"])
        if o.get("caratteristica") is not None and o["caratteristica"] not in car:
            _err(e, "abilita", dove, f"abilita.{o['id']}: caratteristica inesistente «{o['caratteristica']}»")
        # A saving throw of the manual: its natural d20s follow risoluzione.critici (attacchi_e_salvezze).
        # true, or the id of a column of tiri_salvezza (checked by regole_classi.colonne_delle_abilita).
        if "salvezza" in o and not isinstance(o["salvezza"], (bool, str)):
            _err(e, "abilita", dove, f"abilita.{o['id']}.salvezza: true o false, o una colonna di tiri_salvezza")
        # Abilità tirata a parte sotto la soglia della scheda: percentuale (d100) o «x su 6» (d6).
        if "soglia" in o:
            so = _ogg(o["soglia"])
            pred = so.get("predefinita") if so else None
            if not so or so.get("dado") not in (6, 20, 100) or (pred is not None and not (_intero(pred) and 0 <= pred <= so["dado"])):
                _err(e, "abilita", dove, f"abilita.{o['id']}.soglia: {{dado: 6 | 20 | 100, predefinita: da 0 al dado o vuota}}")
            # A failure band (M9): a failed roll above oltre_volte × the threshold (or the top face) is a bad failure.
            # What raises the threshold from `predefinita` (regole/schede.ts valoriDaSoglie): a characteristic's bonus, or
            # `valore` from the score `da` up.
            for i, x in enumerate((so or {}).get("piu") or [], start=1):
                xo = _ogg(x) or {}
                if xo.get("caratteristica") not in car or ("da" in xo) != ("valore" in xo) or not all(_intero(xo[k]) for k in ("da", "valore") if k in xo):
                    _err(e, "abilita", dove, f"abilita.{o['id']}.soglia.piu[{i}]: {{caratteristica: <del set>}} o {{caratteristica, da: <punteggio>, valore: <punti>}}")
            # Whoever lacks the value rolls on another die (a non-thief listening: 1 in 1d6).
            se = (so or {}).get("senza")
            if se is not None and not (isinstance(se, dict) and se.get("dado") in (6, 20, 100) and _intero(se.get("valore")) and 0 <= se["valore"] <= se["dado"]):
                _err(e, "abilita", dove, f"abilita.{o['id']}.soglia.senza: {{dado: 6 | 20 | 100, valore: da 0 al dado}}")
            if se is not None and pred is not None:
                _err(e, "abilita", dove, f"abilita.{o['id']}.soglia: predefinita o senza, non tutte e due")
            gr = (so or {}).get("grave")
            if gr is not None and not (isinstance(gr, dict) and isinstance(gr.get("oltre_volte"), (int, float)) and gr["oltre_volte"] >= 1
                                       and isinstance(gr.get("nome"), str) and gr["nome"].strip()):
                _err(e, "abilita", dove, f"abilita.{o['id']}.soglia.grave: {{oltre_volte: 2, col_massimo: true, nome: \"…\"}}")
        # A roll the Game Master makes in secret (M9): how a failure is told.
        if "segreta" in o and o["segreta"] not in ("niente", "riuscita"):
            _err(e, "abilita", dove, f"abilita.{o['id']}.segreta: niente (non nota niente) o riuscita (crede di esserci riuscito)")
    return ids


def _modificatori(r: dict, abi: set[str], e: Esito, dove: str) -> None:
    """Situational attack modifiers (regole.yaml → modificatori, apps/server/src/regole/modificatori.ts): from behind,
    a charge, range. What makes one apply is in the set: words of the PC's action, the kind of attack, the weapon."""
    v = r.get("modificatori")
    if v is None:
        return
    if not isinstance(v, list):
        _err(e, "modificatori", dove, "modificatori: una lista")
        return
    visti: set[str] = set()
    for i, o in enumerate(v, 1):
        o = _ogg(o) or {}
        mid = o.get("id")
        luogo = f"modificatori.{mid if isinstance(mid, str) else f'[{i}]'}"
        if not isinstance(mid, str) or not mid or not mid.replace("_", "").isalnum() or mid != mid.lower() or mid in visti:
            _err(e, "modificatori", dove, f"{luogo}: serve un id snake_case, unico")
            continue
        visti.add(mid)
        b = o.get("bonus")
        if not _intero(b) or b == 0 or abs(b) > 10:
            _err(e, "modificatori", dove, f"{luogo}: bonus: un intero da −10 a 10, non 0")
        if o.get("attacchi", "tutti") not in ("tutti", "mischia", "distanza"):
            _err(e, "modificatori", dove, f"{luogo}: attacchi: tutti, mischia o distanza")
        parole = o.get("parole")
        if not isinstance(parole, list) or not parole or not all(isinstance(p, str) and p.strip() for p in parole):
            _err(e, "modificatori", dove, f"{luogo}: parole: almeno una (le parole dell'azione del PG che lo fanno valere)")
        for k in ("armi", "non_con"):
            if k in o and (not isinstance(o[k], list) or not all(isinstance(p, str) and p.strip() for p in o[k])):
                _err(e, "modificatori", dove, f"{luogo}: {k}: una lista di parole")
        for a in o.get("non_con") or []:
            if isinstance(a, str) and a not in abi:
                _err(e, "modificatori", dove, f"{luogo}: non_con: «{a}» non è un'abilità del set")
        if o.get("danno", "normale") not in ("normale", "doppio"):
            _err(e, "modificatori", dove, f"{luogo}: danno: normale o doppio")


def soglie_abilita(r: dict) -> dict[str, int]:
    """Le abilità tirate sotto soglia, con il dado (per controllare i valori delle schede)."""
    out = {}
    for x in r.get("abilita") or []:
        o, so = _ogg(x), _ogg((_ogg(x) or {}).get("soglia"))
        if o and so and so.get("dado") in (6, 20, 100) and isinstance(o.get("id"), str):
            out[o["id"]] = so["dado"]
    return out


def _file_del_set(c: Campagna, e: Esito, dove_base: Path) -> None:
    """riassunto.md, estratti/*.md, il .gitignore del set se la licenza non è libera."""
    r = c.regole or {}
    lic = _ogg(r.get("licenza")) or {}
    if lic.get("libera") is False:
        gi = dove_base / ".gitignore"
        if not gi.exists() or "*" not in gi.read_text(encoding="utf-8").splitlines():
            _err(e, "licenza_gitignore", "regole/.gitignore", "licenza non libera: la cartella regole/ deve avere un .gitignore con «*»")
    riass = dove_base / "riassunto.md"
    if not riass.exists():
        e.avviso("REGOLE.riassunto", "regole/riassunto.md", "manca il riassunto per i giocatori: la scheda «Regole» resta vuota")
    else:
        parole = n_parole(riass.read_text(encoding="utf-8"))
        if parole > RIASSUNTO_MAX_PAROLE:
            e.avviso("REGOLE.riassunto", "regole/riassunto.md", f"{parole} parole: il massimo è {RIASSUNTO_MAX_PAROLE}")
    cartella_estratti = dove_base / "estratti"
    file_estratti = sorted(cartella_estratti.glob("*.md")) if cartella_estratti.is_dir() else []
    for f in file_estratti:
        dove = f"regole/estratti/{f.name}"
        m = FRONTMATTER.match(f.read_text(encoding="utf-8"))
        if not m:
            _err(e, "estratto", dove, "manca l'intestazione (---, titolo, parole, ---)")
            continue
        try:
            meta = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError as err:
            _err(e, "estratto", dove, f"intestazione non leggibile: {str(err).splitlines()[0]}")
            continue
        meta = _ogg(meta) or {}
        if not _testo(meta.get("titolo")):
            _err(e, "estratto", dove, "manca titolo")
        parole = meta.get("parole")
        if not isinstance(parole, list) or not any(_testo(x) for x in parole):
            _err(e, "parole", dove, "parole: un elenco con almeno una parola (è così che l'estratto si trova)")
        elif meta.get("per") and (gen := generiche_in(parole, c.lingua)):
            _generiche(e, dove, "parole", gen)
        if "pagina" in meta and not _intero(meta["pagina"]):
            _err(e, "estratto", dove, "pagina: un numero intero")
        corpo = m.group(2).strip()
        if not corpo:
            _err(e, "estratto", dove, "il passo è vuoto")
        elif len(corpo.splitlines()) > ESTRATTO_MAX_RIGHE:
            e.avviso("REGOLE.estratto", dove, f"{len(corpo.splitlines())} righe: il massimo è {ESTRATTO_MAX_RIGHE}")


def _schede(c: Campagna, e: Esito, car: set[str], abi: set[str], dadi: bool, tabella: list[tuple[int, int]] | None = None,
            soglie: dict[str, int] | None = None, per_scheda=None, mostri: dict[str, dict] | None = None) -> None:
    """Le schede di PG e PNG seguono il set: caratteristiche tutte e sole quelle del set, abilità, PF, attacchi. Una
    scheda con `mostro:` si controlla con le chiavi del mostro del bestiario sotto le sue (regole_bestiario)."""
    soglie = soglie or {}
    mostri = mostri or {}
    da_controllare = [(p["_creato"] if p.get("_creato") else f"pg.yaml {p.get('id', '?')}", p) for p in c.personaggi if "scheda" in p]
    da_controllare += [(nome, d) for _, (nome, d) in c.png.items() if "scheda" in d]
    for p in c.personaggi:
        if "scheda" not in p and dadi:
            e.errore("SCHEDA.mancante", p.get("id", "?"), "manca la scheda (caratteristiche del set, pf, attacchi)")
    for pid, (nome, d) in c.png.items():
        if "scheda" not in d and dadi:
            e.errore("SCHEDA.mancante", nome, "manca la scheda (caratteristiche del set, pf, attacchi)")
    for dove, dati in da_controllare:
        s = _ogg(dati.get("scheda")) or {}
        if "mostro" in s and s["mostro"] not in mostri:
            e.errore("REGOLE.bestiario", dove, f"scheda.mostro: «{s['mostro']}» non è un mostro del bestiario del set")
        s, da_mostro = regole_bestiario.scheda_con_mostro(s, mostri)
        if per_scheda:
            per_scheda(s, dove)
        cars = _ogg(s.get("caratteristiche"))
        if cars is None and da_mostro:
            pass  # a monster has no ability scores (Basic Fantasy p. 62): the +0 value, as the Engine reads it
        elif cars is None:
            _err(e, "scheda", dove, "scheda.caratteristiche: una mappa con le caratteristiche del set")
        else:
            mancanti, in_piu = sorted(car - set(cars)), sorted(set(cars) - car)
            if mancanti or in_piu:
                _err(e, "scheda", dove, f"caratteristiche: mancano {mancanti or '-'}, di troppo {in_piu or '-'} (il set ha {sorted(car)})")
            for k, v in cars.items():
                if not _intero(v):
                    _err(e, "scheda", dove, f"caratteristiche.{k}: un numero intero")
                elif tabella and v < tabella[0][0]:
                    # Con la tabella la scheda scrive il punteggio: un valore sotto la prima riga è un bonus scritto per sbaglio.
                    e.avviso("REGOLE.scheda", dove, f"caratteristiche.{k} = {v}: sotto la tabella del set (da {tabella[0][0]}); "
                             "con modificatore «tabella» la scheda scrive il punteggio, non il bonus", rigoroso=True)
        for k, v in (_ogg(s.get("abilita")) or {}).items():
            if k not in abi:
                _err(e, "scheda", dove, f"abilita.{k}: non è un'abilità del set")
            elif not _intero(v):
                _err(e, "scheda", dove, f"abilita.{k}: un numero intero")
            elif k in soglie and not 0 <= v <= soglie[k]:
                _err(e, "scheda", dove, f"abilita.{k} = {v}: è una soglia sul d{soglie[k]}, da 0 a {soglie[k]}")
        # Hit points: written, a formula rolled once by the Engine («1d2»), or none with hit dice (rolled by the bestiary).
        pf_ok = (_intero(s.get("pf")) and s["pf"] > 0) or (isinstance(s.get("pf"), str) and regole_bestiario.formula(s["pf"]))
        if not pf_ok and not ("pf" not in s and regole_bestiario.dadi_vita_validi(s.get("dadi_vita"))):
            _err(e, "scheda", dove, "pf: un numero intero maggiore di zero (o, con i dadi vita, niente: li tira il Motore)")
        for campo in ("difesa", "armatura"):
            if s.get(campo) is not None and not _intero(s[campo]):
                _err(e, "scheda", dove, f"{campo}: un numero intero")
        if "morale" in s and not regole_bestiario.morale_valido(s["morale"]):
            _err(e, "scheda", dove, "morale: un numero da 2 a 12 (2d6 contro il morale, docs/combattimento.md)")
        for i, at in enumerate(s.get("attacchi") or [], start=1):
            o = _ogg(at) or {}
            if "distanza" in o and not isinstance(o["distanza"], bool):
                _err(e, "scheda", dove, f"attacchi[{i}].distanza: true o false")
            if "automatico" in o and not isinstance(o["automatico"], bool):
                _err(e, "scheda", dove, f"attacchi[{i}].automatico: true o false (true = colpisce sempre, si tira il danno)")
            if not _testo(o.get("nome")):
                _err(e, "scheda", dove, f"attacchi[{i}]: manca nome")
            if "caratteristica" in o and o["caratteristica"] not in car:
                _err(e, "scheda", dove, f"attacchi[{i}]: caratteristica «{o['caratteristica']}» non è del set")
            if "abilita" in o and o["abilita"] not in abi:
                _err(e, "scheda", dove, f"attacchi[{i}]: abilità «{o['abilita']}» non è del set")
            if "caratteristica" not in o and "abilita" not in o:
                e.avviso("REGOLE.scheda", dove, f"attacchi[{i}]: senza caratteristica né abilita del set (come si tira?)")


def _richiede_prova_set(c: Campagna, e: Esito, car: set[str], abi: set[str], mosse: set[str]) -> None:
    """`richiede.prova` delle battute: una prova che il set conosce. Come il motore (prove/risolutore-regole.ts),
    che apre il cancello con mossa, abilità o caratteristica del set, più il tipo di prova, gli id p_… delle scene e
    gli attacchi delle schede. Gli id di D&D non valgono in un set non SRD."""
    ammessi = TIPI_PROVA_RICHIEDE | car | abi | mosse | set(_prove_della_campagna(c)) | _id_attacchi(c)
    dadi = dadi_attivi(c)
    for b in c.battute:
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        for r in blocchi_richiede(b.get("richiede") or {}):
            if "prova" not in r:
                continue
            v = r["prova"]
            if not isinstance(v, str) or v not in ammessi:
                _err(e, "richiede_prova", dove, f"richiede.prova «{v}»: una prova del set (mossa, abilità, caratteristica), "
                                                "un id p_… di una scena, un attacco, o prova/salvezza/attacco/contrapposta")
            elif not dadi:
                e.avviso("REGOLE.richiede_prova", dove, "richiede.prova in una campagna senza dadi: la battuta non uscirà mai")


def condizioni_del_set(r: dict) -> set[str]:
    """The ids of the set's conditions (combattimento.condizioni): typed effects may only give these."""
    comb = _ogg(r.get("combattimento")) or {}
    return {o["id"] for o in comb.get("condizioni") or [] if isinstance(o, dict) and isinstance(o.get("id"), str)}


def _prove_di_scena(c: Campagna, e: Esito, car: set[str], abi: set[str], mosse: set[str], diff: set[str],
                    condizioni: set[str] | None = None) -> None:
    """Le prove della scena (scena.yaml → prove) usano id del set: mossa, abilità, caratteristica, difficoltà."""
    for nome, s in c.scene:
        for i, p in enumerate(s.get("prove") or [], start=1):
            o = _ogg(p) or {}
            dove = f"{nome} prove[{i}]"
            # The hazard of a failed check (a fall, a trap's damage): typed effects of the closed list.
            controlla_effetti(o.get("effetti_se_fallisce"), f"{dove}.effetti_se_fallisce", e, "REGOLE.prove", condizioni)
            if "nome" in o and not (isinstance(o["nome"], str) and o["nome"].strip()):
                _err(e, "prove", dove, "nome: il nome del pericolo, un testo")
            if gen := generiche_in(o.get("parole"), c.lingua):
                _generiche(e, dove, "parole", gen)
            if o.get("mossa") is not None and o["mossa"] not in mosse:
                _err(e, "prove", dove, f"mossa «{o['mossa']}» non è una mossa del set")
            if o.get("abilita") is not None and o["abilita"] not in abi:
                _err(e, "prove", dove, f"abilità «{o['abilita']}» non è un'abilità del set")
            if o.get("caratteristica") is not None and o["caratteristica"] not in car:
                _err(e, "prove", dove, f"caratteristica «{o['caratteristica']}» non è del set")
            if o.get("difficolta") is not None and o["difficolta"] not in diff:
                _err(e, "prove", dove, f"difficolta «{o['difficolta']}» non è una difficoltà del set")
            # M9: a situational adjustment of this check (points of the threshold, or of the d20 roll).
            if "aggiustamento" in o and not (_intero(o["aggiustamento"]) and -100 <= o["aggiustamento"] <= 100):
                _err(e, "prove", dove, "aggiustamento: un intero da −100 a 100 (punti della soglia, o del tiro)")


def controlla(c: Campagna, e: Esito) -> None:
    """I controlli [V] di docs/regole.md sul set della campagna. Senza regole/regole.yaml non fa nulla."""
    file = c.cartella / "regole" / "regole.yaml"
    if not file.exists():
        return
    dove = "regole/regole.yaml"
    if not isinstance(c.regole, dict):
        _err(e, "id", dove, "regole.yaml deve essere una mappa (vedi docs/regole.md, §2)")
        return
    r = c.regole
    _identita(r, e, dove)
    if r.get("id") == ID_SRD:
        _file_del_set(c, e, c.cartella / "regole")  # SRD con passi e riassunto della campagna: solo i file
        return
    tipo, dado = _risoluzione(r, e, dove)
    _fasce(r, e, dove)
    car = {o["id"] for o in _voci(r.get("caratteristiche"), "caratteristiche", dove, e, obbligatorio=True)}
    abi = _abilita(r, car, e, dove)
    if (_ogg(r.get("risoluzione")) or {}).get("critici") == "attacchi_e_salvezze" and not any(
            isinstance(o, dict) and (o.get("salvezza") is True or isinstance(o.get("salvezza"), str)) for o in r.get("abilita") or []):
        _err(e, "critici", dove, "risoluzione.critici: attacchi_e_salvezze senza nessuna abilità con salvezza: true")
    diff = set(_difficolta(r, tipo, e, dove))
    _modificatore(r, tipo, e, dove)
    _vantaggio(r, dado, e, dove)
    _schema_sociale_attacchi(r, car, abi, e, dove)
    _modificatori(r, abi, e, dove)
    mosse = _mosse(r, car, e, dove)
    regole_combattimento.controlla(r, car, e, dove)
    for k, voci in (_ogg(r.get("parole_chiave")) or {}).items():
        # Same rule as the engine loader (regole/caricatore.ts): the id must be a trait, a skill or a move of the set.
        if k not in car | abi | mosse:
            _err(e, "parole_chiave", dove, f"parole_chiave.{k}: non è un'abilità, una mossa o una caratteristica del set")
        if gen := generiche_in(voci, c.lingua):
            _generiche(e, dove, f"parole_chiave.{k}", gen)
    colonne = regole_classi.colonne_salvezza(r, e, dove)
    classi = regole_classi.classi_del_set(r, colonne, e, dove)
    col_abil = regole_classi.colonne_delle_abilita(r, colonne, e, dove)
    tabelle = {o["id"] for o in r.get("classi") or [] if isinstance(o, dict) and o.get("tiri_salvezza")}
    salvezze = {o["id"] for o in r.get("abilita") or [] if isinstance(o, dict) and o.get("salvezza")}
    poteri = regole_poteri.poteri_del_set(r, salvezze, classi, condizioni_del_set(r), e, dove)
    regole_bestiario.bestiario_del_set(r, abi, e, dove)
    ln = r.get("livelli_negativi")
    if ln is not None and not (isinstance(ln, dict) and all(isinstance(ln.get(k, 0), int) and not isinstance(ln.get(k, 0), bool) for k in ("d20", "percentuali"))):
        e.errore("REGOLE.bestiario", dove, "livelli_negativi: {d20: −1, percentuali: −5} (interi)")
    mostri = regole_bestiario.mostri_del_set(c.cartella / "regole", r, set(classi), set(poteri), e)
    risorse = regole_poteri.risorse_del_set(r, e, dove)
    regole_poteri.abilita_d_attacco(r, e, dove)

    razze = regole_classi.razze_del_set(r, abi, set(colonne), e, dove)
    # Creation (M7): languages, the classes' and races' requirements and allow-lists, the procedure.
    regole_creazione.creazione_del_set(r, car, set(classi), set(razze), e, dove)
    regole_creazione.opzioni_campagna(c, r, e)
    _reazioni(r, car, e, dove)
    regole_progressione.progressione_del_set(r, abi, car, poteri, e, dove)
    regole_progressione.esperienza_del_set(r, e, dove)
    catalogo = regole_catalogo.catalogo_del_set(r, car, abi, set(classi), set(razze), None, e, dove)
    regole_catalogo.carico_del_set(r, car, set(razze), catalogo, e, dove)
    unita_tempo = regole_catalogo.tempo_del_set(r, catalogo, e, dove)
    # A scene's own window length (`tempo_per_finestra`, a talk scene): a duration in the set's clock units.
    for nome, sc in c.scene:
        if "tempo_per_finestra" in sc:
            if unita_tempo is None:
                e.avviso("REGOLE.tempo", nome, "tempo_per_finestra: il set non ha il tempo di gioco (tempo.unita): il Motore lo ignora")
            else:
                regole_catalogo.durata_in_unita(sc["tempo_per_finestra"], unita_tempo, "tempo_per_finestra", e, nome)
    regole_catalogo.viaggio_del_set(r, e, dove)

    def per_scheda(s: dict, d: str) -> None:
        regole_classi.controlla_scheda(s, d, classi, col_abil, tabelle, e, razze, abi, set(colonne))
        regole_poteri.controlla_scheda(s, d, r, poteri, risorse, e)
        regole_catalogo.controlla_scheda(s, d, r, catalogo, e)
        di_pg = d.startswith("pg.yaml") or d.startswith("pg-creati/")
        regole_progressione.controlla_scheda(s, d, r, e, di_png=not di_pg)
        if di_pg:
            # A PC against the set's creation rules: a pregenerated one is built by the same steps a player follows at the
            # table; one built at the table (pg-creati/) is held to them strictly, at the campaign's starting level.
            opz = ((c.campagna.get("regole") or {}).get("creazione") or {}) if isinstance(c.campagna.get("regole"), dict) else {}
            creato = d.startswith("pg-creati/")
            regole_creazione.controlla_scheda(s, d, r, e, creato=creato,
                                              livello_iniziale=opz.get("livello") if isinstance(opz.get("livello"), int) else None,
                                              punti_ferita=opz.get("punti_ferita") if opz.get("punti_ferita") in ("tira", "massimo") else None)
    _schede(c, e, car, abi, dadi_attivi(c), tabella_modificatori(r), soglie_abilita(r), per_scheda=per_scheda, mostri=mostri)
    _prove_di_scena(c, e, car, abi, mosse, diff, condizioni_del_set(r))
    controlla_cadute(r, e, dove)
    controlla_riposo(r, e, dove)
    _richiede_prova_set(c, e, car, abi, mosse)
    _file_del_set(c, e, c.cartella / "regole")
