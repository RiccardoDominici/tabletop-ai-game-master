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
from .regole_repertorio import blocchi_richiede
from .regole_schede import TIPI_PROVA_RICHIEDE, _id_attacchi, _prove_della_campagna, dadi_attivi
from .testo import n_parole

ID_SRD = "srd-5.2"
TIPI = ("d20_cd", "2d6_fasce", "sotto_soglia")
MODIFICATORI = ("srd", "diretto", "soglia")
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
    if not ids:
        return ids
    pred = r.get("difficolta_predefinita")
    if pred is not None and pred not in ids:
        _err(e, "difficolta_predefinita", dove, f"difficolta_predefinita «{pred}» non è tra le difficoltà")
    return ids


def _modificatore(r: dict, tipo: str | None, e: Esito, dove: str) -> None:
    mod = _ogg(r.get("modificatore")) or {}
    t = mod.get("tipo")
    if t is None:
        return
    if t not in MODIFICATORI:
        _err(e, "modificatore", dove, "modificatore.tipo: srd, diretto o soglia")
    elif (t == "soglia") != (tipo == "sotto_soglia"):
        _err(e, "modificatore", dove, "modificatore.tipo «soglia» va (solo) con risoluzione sotto_soglia")


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
    return ids


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
        if "pagina" in meta and not _intero(meta["pagina"]):
            _err(e, "estratto", dove, "pagina: un numero intero")
        corpo = m.group(2).strip()
        if not corpo:
            _err(e, "estratto", dove, "il passo è vuoto")
        elif len(corpo.splitlines()) > ESTRATTO_MAX_RIGHE:
            e.avviso("REGOLE.estratto", dove, f"{len(corpo.splitlines())} righe: il massimo è {ESTRATTO_MAX_RIGHE}")


def _schede(c: Campagna, e: Esito, car: set[str], abi: set[str], dadi: bool) -> None:
    """Le schede di PG e PNG seguono il set: caratteristiche tutte e sole quelle del set, abilità, PF, attacchi."""
    da_controllare = [(f"pg.yaml {p.get('id', '?')}", p) for p in c.personaggi if "scheda" in p]
    da_controllare += [(nome, d) for _, (nome, d) in c.png.items() if "scheda" in d]
    for p in c.personaggi:
        if "scheda" not in p and dadi:
            e.errore("SCHEDA.mancante", p.get("id", "?"), "manca la scheda (caratteristiche del set, pf, attacchi)")
    for pid, (nome, d) in c.png.items():
        if "scheda" not in d and dadi:
            e.errore("SCHEDA.mancante", nome, "manca la scheda (caratteristiche del set, pf, attacchi)")
    for dove, dati in da_controllare:
        s = _ogg(dati.get("scheda")) or {}
        cars = _ogg(s.get("caratteristiche"))
        if cars is None:
            _err(e, "scheda", dove, "scheda.caratteristiche: una mappa con le caratteristiche del set")
        else:
            mancanti, in_piu = sorted(car - set(cars)), sorted(set(cars) - car)
            if mancanti or in_piu:
                _err(e, "scheda", dove, f"caratteristiche: mancano {mancanti or '-'}, di troppo {in_piu or '-'} (il set ha {sorted(car)})")
            for k, v in cars.items():
                if not _intero(v):
                    _err(e, "scheda", dove, f"caratteristiche.{k}: un numero intero")
        for k, v in (_ogg(s.get("abilita")) or {}).items():
            if k not in abi:
                _err(e, "scheda", dove, f"abilita.{k}: non è un'abilità del set")
            elif not _intero(v):
                _err(e, "scheda", dove, f"abilita.{k}: un numero intero")
        if not (_intero(s.get("pf")) and s["pf"] > 0):
            _err(e, "scheda", dove, "pf: un numero intero maggiore di zero")
        for campo in ("difesa", "armatura"):
            if s.get(campo) is not None and not _intero(s[campo]):
                _err(e, "scheda", dove, f"{campo}: un numero intero")
        if "morale" in s and not (_intero(s["morale"]) and 2 <= s["morale"] <= 12):
            _err(e, "scheda", dove, "morale: un numero da 2 a 12 (2d6 contro il morale, docs/combattimento.md)")
        for i, at in enumerate(s.get("attacchi") or [], start=1):
            o = _ogg(at) or {}
            if "distanza" in o and not isinstance(o["distanza"], bool):
                _err(e, "scheda", dove, f"attacchi[{i}].distanza: true o false")
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


def _prove_di_scena(c: Campagna, e: Esito, car: set[str], abi: set[str], mosse: set[str], diff: set[str]) -> None:
    """Le prove della scena (scena.yaml → prove) usano id del set: mossa, abilità, caratteristica, difficoltà."""
    for nome, s in c.scene:
        for i, p in enumerate(s.get("prove") or [], start=1):
            o = _ogg(p) or {}
            dove = f"{nome} prove[{i}]"
            if o.get("mossa") is not None and o["mossa"] not in mosse:
                _err(e, "prove", dove, f"mossa «{o['mossa']}» non è una mossa del set")
            if o.get("abilita") is not None and o["abilita"] not in abi:
                _err(e, "prove", dove, f"abilità «{o['abilita']}» non è un'abilità del set")
            if o.get("caratteristica") is not None and o["caratteristica"] not in car:
                _err(e, "prove", dove, f"caratteristica «{o['caratteristica']}» non è del set")
            if o.get("difficolta") is not None and o["difficolta"] not in diff:
                _err(e, "prove", dove, f"difficolta «{o['difficolta']}» non è una difficoltà del set")


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
    diff = set(_difficolta(r, tipo, e, dove))
    _modificatore(r, tipo, e, dove)
    _vantaggio(r, dado, e, dove)
    _schema_sociale_attacchi(r, car, abi, e, dove)
    mosse = _mosse(r, car, e, dove)
    regole_combattimento.controlla(r, car, e, dove)
    _schede(c, e, car, abi, dadi_attivi(c))
    _prove_di_scena(c, e, car, abi, mosse, diff)
    _richiede_prova_set(c, e, car, abi, mosse)
    _file_del_set(c, e, c.cartella / "regole")
