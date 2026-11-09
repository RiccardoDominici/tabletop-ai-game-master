"""Schede numeriche e prove (docs/prove.md, §2). Le regole stanno lì; qui il controllo.

- `regole.dadi` in campagna.yaml: booleano. `false` = campagna senza dadi: le schede non sono obbligatorie.
- PG: personaggi[].scheda. PNG: scheda in png/*.yaml. Senza dadi una scheda che manca non è un errore.
- Scheda: caratteristiche (1–20 per i PG, 1–30 per i PNG), competenze, maestrie, tiri salvezza, armatura
  o CA, PF, attacchi. Modificatori, CA dall'armatura, PF massimi e tiri per colpire li calcola il codice:
  una scheda che li scrive a mano è un errore.
- PNG: GS, CA, PF e attacchi coerenti con il GS (fasce approssimate, in srd.py).
- Prove della scena (`prove:`): id p_…, `quando` breve, una sola abilità/caratteristica/salvezza, CD 5–30,
  indizio esistente e non essenziale (F3).
- `richiede.prova` del repertorio: deve nominare una prova che esiste (abilità, caratteristica, id p_…
  della scena, un attacco, o il tipo di prova).
"""

from __future__ import annotations

import re

from . import srd
from .carica import Campagna
from .esito import Esito
from .regole_repertorio import blocchi_richiede
from .testo import n_parole

CHIAVI_PG = {"caratteristiche", "competenze", "maestrie", "tiri_salvezza", "armatura", "ca", "pf", "attacchi"}
CHIAVI_PNG = CHIAVI_PG | {"gs", "livello", "influenza"}
CHIAVI_ATTACCO = {"nome", "caratteristica", "danno", "tipo_danno", "distanza", "competente", "bonus"}
CHIAVI_PROVA = {"id", "quando", "abilita", "caratteristica", "salvezza", "cd", "indizio", "se_fallisce"}
# Modificatori scritti a mano: il codice li calcola (docs/prove.md §2).
MODIFICATORI = {"modificatore", "modificatori", "mod", "bonus_competenza", "bonus_di_competenza", "competenza",
                "passiva", "passive", "percezione_passiva", "tiro_colpire", "tiro_per_colpire", "bonus_attacco",
                "bonus_danno", "bonus_abilita", "pb"}
TIPI_PROVA_RICHIEDE = {"prova", "salvezza", "attacco", "contrapposta"}
DANNO = re.compile(r"^(\d*)d(\d+)$")


def dadi_attivi(c: Campagna) -> bool:
    regole = c.campagna.get("regole")
    return not (isinstance(regole, dict) and regole.get("dadi") is False)


def _intero(v, minimo: int, massimo: int) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and minimo <= v <= massimo


def _grado(v) -> float | None:
    """GS come numero (0, 1/8, 1/4, 1/2, 1…30), o None se non è un grado di sfida."""
    if isinstance(v, bool):
        return None
    if isinstance(v, int) and 0 <= v <= 30:
        return float(v)
    if isinstance(v, str):
        t = v.strip()
        if t in srd.GS_FRAZIONI:
            return srd.GS_FRAZIONI[t]
        if re.fullmatch(r"\d+", t) and int(t) <= 30:
            return float(int(t))
    return None


def _regole(c: Campagna, e: Esito) -> None:
    regole = c.campagna.get("regole")
    if regole is None:
        return
    if not isinstance(regole, dict):
        e.errore("SCHEDA.regole", "campagna.yaml", "regole è un oggetto: {dadi: true|false}")
    elif "dadi" in regole and not isinstance(regole["dadi"], bool):
        e.errore("SCHEDA.regole", "campagna.yaml", "regole.dadi è true o false")


def _punteggi(e: Esito, dove: str, v, massimo: int) -> dict[str, int] | None:
    if not isinstance(v, dict):
        e.errore("SCHEDA.caratteristiche", dove, "servono tutte e sei le caratteristiche (forza… carisma)")
        return None
    ok = True
    for k in srd.CARATTERISTICHE:
        if k not in v:
            e.errore("SCHEDA.caratteristiche", dove, f"manca {k}")
            ok = False
    for k, val in v.items():
        if k not in srd.CARATTERISTICHE:
            e.errore("SCHEDA.caratteristiche", dove, f"«{k}» non è una caratteristica (forza, destrezza, costituzione, "
                                                     "intelligenza, saggezza, carisma)")
            ok = False
        elif not _intero(val, 1, massimo):
            ok = False
            if isinstance(val, str) and re.match(r"^[+\-−]", val.strip()):
                e.errore("SCHEDA.modificatore_a_mano", dove, f"{k}: {val} è un modificatore; scrivi il punteggio (1–{massimo})")
            else:
                e.errore("SCHEDA.caratteristiche", dove, f"{k} = {val}: punteggio da 1 a {massimo}")
    if not ok:
        return None
    return {k: v[k] for k in srd.CARATTERISTICHE}


def _elenco_abilita(e: Esito, dove: str, v, campo: str) -> list[str]:
    if v is None:
        return []
    if not isinstance(v, list):
        e.errore("SCHEDA.abilita", dove, f"{campo} è una lista")
        return []
    out: list[str] = []
    for x in v:
        a = srd.come_abilita(x)
        if a is None:
            e.errore("SCHEDA.abilita", dove, f"{campo}: «{x}» non è una delle 18 abilità")
        elif a in out:
            e.errore("SCHEDA.abilita", dove, f"{campo}: {a} ripetuta")
        else:
            out.append(a)
    return out


def _armatura(e: Esito, dove: str, s: dict, mod_des: int) -> int:
    """Armatura, scudo e CA: la CA calcolata vince su quella scritta (come il Motore, ma come errore)."""
    arm = s.get("armatura")
    scudo, tipo = False, arm
    if isinstance(arm, dict):
        for k in arm:
            if k not in {"tipo", "scudo"}:
                e.errore("SCHEDA.campo", dove, f"armatura.{k} non è previsto (tipo, scudo)")
        scudo, tipo = arm.get("scudo", False), arm.get("tipo")
        if not isinstance(scudo, bool):
            e.errore("SCHEDA.armatura", dove, "armatura.scudo è true o false")
            scudo = False
    armatura = None
    if tipo not in (None, "nessuna"):
        armatura = srd.come_armatura(tipo)
        if armatura is None:
            e.errore("SCHEDA.armatura", dove, f"«{tipo}» non è un'armatura dell'SRD (es. giaco di maglia, cuoio, cotta di maglia)")
    ca_scritta = s.get("ca")
    if ca_scritta is not None and not _intero(ca_scritta, 1, 30):
        e.errore("SCHEDA.ca", dove, f"ca {ca_scritta}: un intero da 1 a 30")
        ca_scritta = None
    calcolata = srd.classe_armatura(mod_des, armatura, scudo) if (armatura or scudo or ca_scritta is None) else None
    if ca_scritta is not None and calcolata is not None and (armatura or scudo) and ca_scritta != calcolata:
        e.errore("SCHEDA.ca", dove, f"ca scritta {ca_scritta}, ma l'armatura dà {calcolata}: togli ca, la calcola il codice")
    return calcolata if calcolata is not None else (ca_scritta if ca_scritta is not None else 10 + mod_des)


def _attacchi(e: Esito, dove: str, v, punteggi: dict[str, int] | None, pb: int | None, gs: float | None) -> None:
    if v is None:
        return
    if not isinstance(v, list):
        e.errore("SCHEDA.attacco", dove, "attacchi è una lista")
        return
    for i, a in enumerate(v, 1):
        dv = f"{dove} attacchi[{i}]"
        if not isinstance(a, dict):
            e.errore("SCHEDA.attacco", dv, "un attacco è un oggetto {nome, caratteristica, danno, …}")
            continue
        for k in a:
            if k in MODIFICATORI or k in {"tiro", "tiro_colpire", "danno_bonus"}:
                e.errore("SCHEDA.modificatore_a_mano", dv, f"{k}: il tiro per colpire e il danno li calcola il codice")
            elif k not in CHIAVI_ATTACCO:
                e.errore("SCHEDA.campo", dv, f"{k} non è previsto (nome, caratteristica, danno, tipo_danno, distanza, competente, bonus)")
        nome = a.get("nome")
        if not isinstance(nome, str) or not nome.strip():
            e.errore("SCHEDA.attacco", dv, "manca il nome")
        car = a.get("caratteristica")
        if car not in srd.CARATTERISTICHE:
            e.errore("SCHEDA.attacco", dv, f"caratteristica «{car}»: forza, destrezza… (quella che si usa per colpire)")
        m = DANNO.match(str(a.get("danno", "")))
        dadi_ok = m is not None and int(m.group(2)) in (4, 6, 8, 10, 12) and 1 <= int(m.group(1) or 1) <= 4
        if not dadi_ok:
            e.errore("SCHEDA.attacco", dv, f"danno «{a.get('danno')}»: NdF con F in 4, 6, 8, 10, 12 (il bonus va in «bonus», non nella formula)")
        for campo in ("distanza", "competente"):
            if campo in a and not isinstance(a[campo], bool):
                e.errore("SCHEDA.attacco", dv, f"{campo} è true o false")
        bonus = a.get("bonus", 0)
        if not isinstance(bonus, int) or isinstance(bonus, bool):
            e.errore("SCHEDA.attacco", dv, "bonus è un intero (es. 1 per un'arma magica)")
            continue
        if dadi_ok and gs is not None and pb is not None and punteggi is not None and car in srd.CARATTERISTICHE:
            tiro = srd.modificatore(punteggi[car]) + (pb if a.get("competente", True) else 0) + bonus
            if tiro > pb + 5 + bonus:
                e.errore("SCHEDA.gs", dv, f"tiro per colpire {tiro:+d}: troppo alto per un GS {_nome_gs(gs)}")
            if gs < 2 and int(m.group(1) or 1) > 2:
                e.errore("SCHEDA.gs", dv, f"danno {a['danno']}: più di due dadi per un GS {_nome_gs(gs)}")


def _nome_gs(gs: float) -> str:
    for nome, v in (("1/8", 0.125), ("1/4", 0.25), ("1/2", 0.5)):
        if gs == v:
            return nome
    return str(int(gs))


def _scheda(c: Campagna, e: Esito, dove: str, s, png: bool, pg: dict | None) -> None:
    if not isinstance(s, dict):
        e.errore("SCHEDA.forma", dove, "scheda è un oggetto YAML")
        return
    chiavi = CHIAVI_PNG if png else CHIAVI_PG
    for k in s:
        if k in MODIFICATORI:
            e.errore("SCHEDA.modificatore_a_mano", dove, f"{k}: i modificatori li calcola il codice (docs/prove.md §2)")
        elif k not in chiavi:
            e.errore("SCHEDA.campo", dove, f"{k} non è previsto nella scheda")
    gs: float | None = None
    livello: int | None = None
    if png:
        gs = _grado(s.get("gs"))
        if gs is None and s.get("livello") is not None and _intero(s.get("livello"), 1, 20):
            gs = float(s["livello"])
        if gs is None:
            e.errore("SCHEDA.gs", dove, "manca gs (grado di sfida: 0, 1/8, 1/4, 1/2, 1…30) o un livello 1–20")
        elif "gs" in s and _grado(s.get("gs")) is None:
            e.errore("SCHEDA.gs", dove, f"gs «{s.get('gs')}» non è un grado di sfida")
    else:
        livello = pg.get("livello") if pg else None
        if not _intero(livello, 1, 20):
            e.errore("PG.campo", dove, "livello del PG: un intero da 1 a 20 (serve per le schede)")
            livello = None
    massimo = 30 if png else 20
    punteggi = _punteggi(e, dove, s.get("caratteristiche"), massimo)
    pb = srd.bonus_competenza(gs if png else (livello or 1)) if (gs is not None or livello is not None) else None
    mod_des = srd.modificatore(punteggi["destrezza"]) if punteggi else 0

    competenze = _elenco_abilita(e, dove, s.get("competenze"), "competenze")
    maestrie = _elenco_abilita(e, dove, s.get("maestrie"), "maestrie")
    for m in maestrie:
        if m not in competenze:
            e.errore("SCHEDA.abilita", dove, f"maestria in {srd.NOME_ABILITA[m]} senza la competenza")
    if not png and len(maestrie) > 2 and livello is not None and livello < 3:
        e.errore("SCHEDA.abilita", dove, f"{len(maestrie)} maestrie a livello {livello}: al massimo due")

    tiri = s.get("tiri_salvezza")
    if tiri is not None:
        if not isinstance(tiri, list):
            e.errore("SCHEDA.tiri_salvezza", dove, "tiri_salvezza è una lista")
        else:
            for x in tiri:
                if x not in srd.CARATTERISTICHE:
                    e.errore("SCHEDA.tiri_salvezza", dove, f"«{x}» non è una caratteristica")
            if not png and len(tiri) != 2:
                e.errore("SCHEDA.tiri_salvezza", dove, f"{len(tiri)} tiri salvezza: un PG ha esattamente due (SRD 5.2, classe)")
    if not png and tiri is None:
        e.errore("SCHEDA.tiri_salvezza", dove, "manca tiri_salvezza: un PG ha due tiri salvezza di classe")

    ca = _armatura(e, dove, s, mod_des)
    if not png and not 10 <= ca <= 20:
        e.errore("SCHEDA.ca", dove, f"CA {ca}: fuori dalle CA di un PG di primo livello (10–20)")
    if png and gs is not None and not (9 <= ca <= srd.ca_attesa(gs)):
        e.errore("SCHEDA.gs", dove, f"CA {ca} fuori dalla fascia di un GS {_nome_gs(gs)} (da 9 a {srd.ca_attesa(gs)})")

    pf = s.get("pf")
    if not _intero(pf, 1, 10_000):
        e.errore("SCHEDA.pf", dove, f"pf {pf}: un intero positivo")
    elif png:
        tetto = srd.pf_massimi_gs(gs) if gs is not None else None
        if tetto is not None and pf > tetto:
            e.errore("SCHEDA.gs", dove, f"{pf} PF: troppi per un GS {_nome_gs(gs)} (fino a {tetto})")
    elif livello is not None and punteggi is not None:
        dado = srd.dado_vita((pg or {}).get("classe"))
        mod_cos = srd.modificatore(punteggi["costituzione"])
        if dado is None:
            e.avviso("SCHEDA.pf", dove, f"classe «{(pg or {}).get('classe')}» non riconosciuta: i PF non si possono verificare")
        elif pf > livello * (dado + mod_cos):
            e.errore("SCHEDA.pf", dove, f"{pf} PF: al livello {livello} con dado {dado} e Costituzione {mod_cos:+d} "
                                        f"il massimo è {livello * (dado + mod_cos)}")

    _attacchi(e, dove, s.get("attacchi"), punteggi, pb, gs)

    infl = s.get("influenza")
    if infl is not None:
        if not isinstance(infl, dict) or set(infl) - {"cd"} or ("cd" in infl and not _intero(infl["cd"], 5, 30)):
            e.errore("SCHEDA.influenza", dove, "influenza: {cd: 5–30}, la CD fissa per convincere il PNG")


def _id_attacchi(c: Campagna) -> set[str]:
    out: set[str] = set()
    for p in c.personaggi:
        out |= _nomi_attacchi(p.get("scheda"))
    for _, d in c.png.values():
        out |= _nomi_attacchi(d.get("scheda"))
    return out


def _nomi_attacchi(s) -> set[str]:
    if not isinstance(s, dict) or not isinstance(s.get("attacchi"), list):
        return set()
    return {srd.chiave(a["nome"]) for a in s["attacchi"] if isinstance(a, dict) and isinstance(a.get("nome"), str)}


def _prove_della_campagna(c: Campagna) -> dict[str, list[str]]:
    """id p_… → scene in cui compaiono (per le duplicazioni e per `richiede.prova`)."""
    out: dict[str, list[str]] = {}
    for nome, s in c.scene:
        for p in s.get("prove") or []:
            if isinstance(p, dict) and isinstance(p.get("id"), str):
                out.setdefault(p["id"], []).append(nome)
    return out


def _prove_scena(c: Campagna, e: Esito, nome: str, s: dict, doppie: set[str]) -> None:
    prove = s.get("prove")
    if prove is None:
        return
    if not isinstance(prove, list):
        e.errore("SCHEDA.prove", nome, "prove è una lista di prove (id, quando, abilita, cd…)")
        return
    for i, p in enumerate(prove, 1):
        if not isinstance(p, dict):
            e.errore("SCHEDA.prove", nome, f"prove[{i}] è un oggetto")
            continue
        pid = p.get("id")
        dove = f"{nome} {pid or f'prove[{i}]'}"
        for k in p:
            if k not in CHIAVI_PROVA:
                e.errore("SCHEDA.prove", dove, f"{k} non è previsto in una prova")
        if not isinstance(pid, str) or not pid.startswith("p_"):
            e.errore("SCHEDA.prove", dove, "l'id della prova è p_… (p_serratura)")
        elif pid in doppie:
            e.errore("SCHEDA.prove", dove, f"id {pid} ripetuto in più scene: ogni prova ha un id suo")
        quando = p.get("quando")
        if not isinstance(quando, str) or not quando.strip():
            e.errore("SCHEDA.prove", dove, "manca «quando»: la situazione in cui vale, pubblica, in una frase")
        elif n_parole(quando) > 15:
            e.errore("SCHEDA.prove", dove, f"«quando» di {n_parole(quando)} parole (max 15): l'arbitro lo legge per intero")
        scelte = [k for k in ("abilita", "caratteristica", "salvezza") if k in p]
        if len(scelte) != 1:
            e.errore("SCHEDA.prove", dove, "serve una sola fra abilita, caratteristica o salvezza")
        elif scelte[0] == "abilita":
            if srd.come_abilita(p["abilita"]) is None or srd.come_abilita(p["abilita"]) != p["abilita"]:
                e.errore("SCHEDA.prove", dove, f"abilita «{p['abilita']}»: un id delle 18 abilità (es. percezione, rapidita_di_mano)")
        elif p[scelte[0]] not in srd.CARATTERISTICHE:
            e.errore("SCHEDA.prove", dove, f"{scelte[0]} «{p[scelte[0]]}»: una caratteristica (forza… carisma)")
        cd = p.get("cd")
        if not _intero(cd, 5, 30):
            e.errore("SCHEDA.prove", dove, f"cd {cd}: una CD da 5 a 30 (10 facile, 15 media, 20 difficile)")
        if "indizio" in p:
            ind = p["indizio"]
            if not isinstance(ind, str) or ind not in c.indizi:
                e.errore("SCHEDA.prove", dove, f"indizio inesistente: {ind}")
            elif c.indizi[ind].get("essenziale") is True:
                e.errore("SCHEDA.prove", dove, f"l'indizio {ind} è essenziale: non sta dietro un tiro (F3). Lo dà la scena, con un prezzo (se_fallisce)")
        if "se_fallisce" in p and not isinstance(p["se_fallisce"], str):
            e.errore("SCHEDA.prove", dove, "se_fallisce è un testo")


def _richiede_prova(c: Campagna, e: Esito, dadi: bool, prove_ids: set[str]) -> None:
    ammessi = TIPI_PROVA_RICHIEDE | set(srd.ABILITA) | set(srd.CARATTERISTICHE) | prove_ids | _id_attacchi(c)
    for b in c.battute:
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        for r in blocchi_richiede(b.get("richiede") or {}):
            if "prova" not in r:
                continue
            v = r["prova"]
            if not isinstance(v, str) or v not in ammessi:
                e.errore("SCHEDA.richiede_prova", dove, f"richiede.prova «{v}»: una prova che esiste (abilità, caratteristica, "
                                                        "id p_… di una scena, un attacco, prova/salvezza/attacco/contrapposta)")
            elif not dadi:
                e.avviso("SCHEDA.richiede_prova", dove, "richiede.prova in una campagna senza dadi: la battuta non uscirà mai")


def controlla(c: Campagna, e: Esito) -> None:
    _regole(c, e)
    dadi = dadi_attivi(c)
    doppie = {pid for pid, scene in _prove_della_campagna(c).items() if len(scene) > 1}
    for p in c.personaggi:
        pid = p.get("id", "?")
        if "scheda" not in p:
            if dadi:
                e.errore("SCHEDA.mancante", pid, "manca la scheda (scheda: caratteristiche, competenze, armatura, pf, attacchi). "
                                                 "Per una campagna senza dadi: regole: {dadi: false} in campagna.yaml")
            continue
        _scheda(c, e, pid, p["scheda"], png=False, pg=p)
    for pid, (nome_file, d) in c.png.items():
        if "scheda" not in d:
            if dadi:
                e.errore("SCHEDA.mancante", nome_file, "manca la scheda (gs, caratteristiche, CA, PF, attacchi)")
            continue
        _scheda(c, e, nome_file, d["scheda"], png=True, pg=None)
    for nome, s in c.scene:
        _prove_scena(c, e, nome, s, doppie)
    _richiede_prova(c, e, dadi, set(_prove_della_campagna(c)))
