"""Stato del gioco tra le sessioni (docs/strati.md, «Il ciclo tra le sessioni»; fase D3).

Due classi:
  STATO        stato/stato.yaml è il registro canonico di ciò che è successo in gioco. Ogni fatto ha una
               fonte verificabile: un turno di un registro di sessione (sessioni/<nn>/registro.yaml,
               estratto in modo deterministico dall'archivio del server, mai scritto da un modello), con
               una citazione esatta o un evento del turno; oppure un avanzamento «fuori scena» tra due
               sessioni, col motivo. Un fatto non si cancella: si supera (superato_da), con un fatto dopo.
  CONTINUITÀ   il pacchetto della sessione dopo (sessioni/<nn+1>/) non contraddice lo stato: un PNG
               morto non torna, ciò che un PNG ha saputo non è nel suo non_sa, ciò che i PG hanno saputo
               non è più segreto, gli orologi ripartono da dove erano, le promesse aperte si riprendono
               o si rimandano, i PG non tornano indietro di livello.

Lo stato «derivato» (PNG vivi o morti, dove, cosa sanno; oggetti; promesse; fili) si ricava applicando gli
`effetti` dei fatti non superati, in ordine di fonte: così ogni cambiamento ha la sua prova. Forma dei file:
.claude/skills/preparatore/riferimenti/tra-le-sessioni.md.

Il formato del registro lo decide il server (fase D2); qui si leggono solo i campi elencati in quel file,
in modo tollerante, e un campo che manca diventa un errore STATO.registro con il percorso esatto.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito

log = logging.getLogger(__name__)

# Gli eventi del registro che un fatto può citare (fonte.evento: {tipo: id}) → la sezione del registro
# (apps/server/src/sessione/registro.ts, RegistroSessione): ogni voce ha il suo turno.
EVENTI = {"battuta": "battute", "indizio": "indizi", "fatto": "fatti_noti", "menzogna": "menzogne", "orologio": "orologi"}
FORMATO_REGISTRO = 1      # registro.ts, FORMATO_REGISTRO
FILE_TRASCRIZIONE = "trascrizione.yaml"
STATI_PROMESSA = {"aperta", "mantenuta", "tradita", "sciolta"}
STATI_FILO = {"aperto", "chiuso"}
STATI_ATTEGGIAMENTO = {"ostile", "indifferente", "amichevole"}
FUORI_SCENA = 10 ** 9      # ordine di un fatto «tra le sessioni»: dopo tutti i turni di quella sessione


@dataclass
class Registro:
    """Il registro di una sessione come lo scrive il server (registro.yaml + trascrizione.yaml accanto)."""
    numero: int
    percorso: Path
    dati: dict
    trascrizione: dict

    def ultimo_turno(self) -> int:
        return int((self.dati.get("archivio") or {}).get("ultimo_turno") or 0)

    def turni(self) -> set[int]:
        """I turni giocati: da 1 all'ultimo dell'archivio, più quelli che compaiono nella trascrizione."""
        voci = {v.get("turno") for v in self.trascrizione.get("voci") or [] if isinstance(v, dict)}
        return set(range(1, self.ultimo_turno() + 1)) | {t for t in voci if isinstance(t, int)}

    def testi(self, turno: int) -> list[str]:
        """Ciò che si è detto e scritto in un turno, alla lettera: voci pubbliche, righe dei momenti, azioni dei PG."""
        out = [str(v.get("testo", "")) for v in self.trascrizione.get("voci") or [] if isinstance(v, dict) and v.get("turno") == turno]
        for m in self.dati.get("momenti") or []:
            if isinstance(m, dict) and m.get("turno") == turno:
                out += [str(r.get("testo", "")) for r in m.get("righe") or [] if isinstance(r, dict)]
        for pg in self.dati.get("pg") or []:
            for chiave in ("azioni_pubbliche", "azioni_private"):
                out += [str(a.get("testo", "")) for a in (pg or {}).get(chiave) or [] if isinstance(a, dict) and a.get("turno") == turno]
        return out

    def eventi(self, tipo: str, turno: int) -> set[str]:
        """Gli id di un tipo di evento in un turno (per gli orologi: quelli con un segno in quel turno)."""
        if tipo == "orologio":
            return {o.get("id") for o in self.dati.get("orologi") or [] if isinstance(o, dict)
                    and any(isinstance(s, dict) and s.get("turno") == turno for s in o.get("segni") or [])}
        return {v.get("id") for v in self.dati.get(EVENTI[tipo]) or [] if isinstance(v, dict) and v.get("turno") == turno}

    def pieni_alla_fine(self, oid: str) -> int | None:
        return next((o.get("pieni_alla_fine") for o in self.dati.get("orologi") or [] if isinstance(o, dict) and o.get("id") == oid), None)

    def fatti_noti(self) -> set[str]:
        return {v.get("id") for v in self.dati.get("fatti_noti") or [] if isinstance(v, dict)}


@dataclass
class Derivato:
    """Lo stato che risulta dai fatti non superati, nell'ordine delle loro fonti."""
    png: dict[str, dict] = field(default_factory=dict)        # id → {vivo, dove, atteggiamento, sa: set}
    oggetti: dict[str, dict] = field(default_factory=dict)
    promesse: dict[str, dict] = field(default_factory=dict)
    fili: dict[str, str] = field(default_factory=dict)
    saputi_dai_pg: set[str] = field(default_factory=set)      # f_ e g_ che i PG conoscono


def _yaml(p: Path) -> dict:
    try:
        d = yaml.safe_load(p.read_text(encoding="utf-8"))
        return d if isinstance(d, dict) else {}
    except (OSError, yaml.YAMLError) as err:
        log.warning("%s illeggibile: %s", p, err)
        return {}


def _numero_cartella(p: Path) -> int | None:
    return int(p.name) if re.fullmatch(r"\d{1,3}", p.name) else None


def carica_registri(c: Campagna, e: Esito) -> dict[int, Registro]:
    out = {}
    for cartella in sorted((c.cartella / "sessioni").glob("*")):
        n = _numero_cartella(cartella)
        f = cartella / "registro.yaml"
        if n is None or not f.exists():
            continue
        d = _yaml(f)
        dove = f"sessioni/{cartella.name}/registro.yaml"
        if d.get("sessione") != n:
            e.errore("STATO.registro", dove, f"dice sessione {d.get('sessione')!r}, ma sta nella cartella {cartella.name}")
        if d.get("formato") != FORMATO_REGISTRO:
            e.avviso("STATO.registro", dove, f"formato {d.get('formato')!r}: il validatore legge il formato {FORMATO_REGISTRO}")
        if d.get("campagna") not in (None, c.cartella.name, (c.campagna or {}).get("id")):
            e.errore("STATO.registro", dove, f"è il registro della campagna {d.get('campagna')!r}")
        file_trascrizione = cartella / str((d.get("trascrizione") or {}).get("file") or FILE_TRASCRIZIONE)
        if not file_trascrizione.exists():
            e.errore("STATO.registro", dove, f"manca {file_trascrizione.name}: senza, le citazioni non si possono verificare")
        out[n] = Registro(n, f, d, _yaml(file_trascrizione) if file_trascrizione.exists() else {})
    return out


def _ordine(fonte: dict) -> tuple[int, int]:
    if "tra_sessioni" in fonte:
        return (int(fonte.get("tra_sessioni") or 0), FUORI_SCENA)
    return (int(fonte.get("sessione") or 0), int(fonte.get("turno") or 0))


# Le regole che muovono il mondo fuori scena: orologi, pericoli e fronti (dal livello campagna anche le fazioni).
RX_REGOLA = r"\b(?:o|p|fronte)_[a-z0-9_]+"


def regole_del_mondo(c: Campagna) -> set[str]:
    out = set(c.orologi) | {f.get("id") for f in c.fronti if f.get("id")}
    out |= {p.get("id") for f in c.fronti for p in f.get("pericoli") or [] if isinstance(p, dict) and p.get("id")}
    return out


def _motivo_con_regola(e: Esito, dove: str, motivo: str, regole: set[str]) -> bool:
    """docs/strati.md, principio 4: il motivo di un fatto fuori scena nomina l'orologio o la regola che lo produce."""
    citate = set(re.findall(RX_REGOLA, str(motivo)))
    if not citate:
        e.errore("STATO.fonte", dove, "il motivo di un fatto fuori scena nomina l'orologio o la regola che lo produce "
                                      "(o_…, p_…, fronte_…)")
        return False
    for x in sorted(citate - regole):
        e.errore("STATO.fonte", dove, f"il motivo cita {x}, che non è un orologio, un pericolo o un fronte della campagna")
        return False
    return True


def _fonte(e: Esito, dove: str, fonte, registri: dict[int, Registro], dopo: int, regole: set[str] | None = None) -> bool:
    """La fonte di un fatto esiste nei registri e dice davvero ciò che il fatto le attribuisce.

    `regole`: se c'è, un avanzamento fuori scena deve nominare una di queste (fatti e orologi; non la crescita dei PG).
    """
    if not isinstance(fonte, dict):
        e.errore("STATO.fonte", dove, "ogni fatto ha una fonte: {sessione, turno, citazione | evento} o {tra_sessioni, motivo}")
        return False
    if "tra_sessioni" in fonte:
        n = fonte.get("tra_sessioni")
        if not isinstance(n, int) or not 1 <= n <= dopo:
            e.errore("STATO.fonte", dove, f"tra_sessioni {n!r}: il numero di una sessione già giocata (1–{dopo})")
            return False
        if not fonte.get("motivo"):
            e.errore("STATO.fonte", dove, "un avanzamento fuori scena dice il motivo (la regola del fronte o della fazione)")
            return False
        return regole is None or _motivo_con_regola(e, dove, fonte["motivo"], regole)
    n, turno = fonte.get("sessione"), fonte.get("turno")
    reg = registri.get(n) if isinstance(n, int) else None
    if reg is None:
        e.errore("STATO.fonte", dove, f"sessione {n!r} senza registro (sessioni/{n:02d}/registro.yaml)" if isinstance(n, int)
                 else "fonte senza sessione")
        return False
    if not isinstance(turno, int) or turno not in reg.turni():
        e.errore("STATO.fonte", dove, f"il registro della sessione {n} non ha il turno {turno!r}")
        return False
    citazione, evento = fonte.get("citazione"), fonte.get("evento")
    if not citazione and not evento:
        e.errore("STATO.fonte", dove, "la fonte cita il turno con una citazione esatta o con un evento del registro")
        return False
    if citazione and not any(str(citazione) in testo for testo in reg.testi(turno)):
        e.errore("STATO.fonte", dove, f"«{str(citazione)[:60]}» non è nel turno {turno} della sessione {n}: la fonte non lo dice")
        return False
    if evento:
        if not (isinstance(evento, dict) and len(evento) == 1 and next(iter(evento)) in EVENTI):
            e.errore("STATO.fonte", dove, f"evento nella forma {{tipo: id}} con tipo tra {sorted(EVENTI)}")
            return False
        tipo, ident = next(iter(evento.items()))
        if ident not in reg.eventi(tipo, turno):
            e.errore("STATO.fonte", dove, f"nel turno {turno} della sessione {n} non c'è l'evento {tipo} {ident}")
            return False
    return True


def _riferimenti(c: Campagna, e: Esito, dove: str, eff: dict, fatti_gioco: set[str], png_sessione: set[str]) -> None:
    png_noti = set(c.png) | png_sessione
    for pid, cambi in (eff.get("png") or {}).items():
        if pid not in png_noti:
            e.errore("STATO.riferimento", dove, f"PNG inesistente {pid}")
        for f in (cambi or {}).get("sa") or []:
            if f not in c.canone and f not in fatti_gioco:
                e.errore("STATO.riferimento", dove, f"{pid} sa un fatto inesistente {f}")
        for pg, a in ((cambi or {}).get("atteggiamento") or {}).items():
            if pg not in c.pg_ids or a not in STATI_ATTEGGIAMENTO:
                e.errore("STATO.riferimento", dove, f"atteggiamento di {pid} verso {pg}: un PG esistente e uno tra {sorted(STATI_ATTEGGIAMENTO)}")
    for pid, p in (eff.get("promesse") or {}).items():
        if (p or {}).get("stato") not in STATI_PROMESSA:
            e.errore("STATO.forma", dove, f"promessa {pid}: stato tra {sorted(STATI_PROMESSA)}")
    for fid, s in (eff.get("fili") or {}).items():
        if s not in STATI_FILO:
            e.errore("STATO.forma", dove, f"filo {fid}: aperto o chiuso")


def deriva(fatti: list[dict]) -> Derivato:
    """Applica gli effetti dei fatti non superati, nell'ordine delle fonti."""
    d = Derivato()
    vivi = sorted((f for f in fatti if not f.get("superato_da") and isinstance(f.get("fonte"), dict)), key=lambda f: _ordine(f["fonte"]))
    for f in vivi:
        if f.get("noto_ai_pg"):
            d.saputi_dai_pg.add(f["id"])
            d.saputi_dai_pg |= set(f.get("rende_noti") or [])
        eff = f.get("effetti") or {}
        for pid, cambi in (eff.get("png") or {}).items():
            p = d.png.setdefault(pid, {"vivo": True, "sa": set(), "atteggiamento": {}})
            cambi = cambi or {}
            for k in ("vivo", "dove"):
                if k in cambi:
                    p[k] = cambi[k]
            p["sa"] |= set(cambi.get("sa") or [])
            p["atteggiamento"].update(cambi.get("atteggiamento") or {})
        for oid, o in (eff.get("oggetti") or {}).items():
            d.oggetti.setdefault(oid, {}).update(o or {})
        for pid, p in (eff.get("promesse") or {}).items():
            d.promesse.setdefault(pid, {}).update(p or {})
        d.fili.update(eff.get("fili") or {})
    return d


def _stato(c: Campagna, e: Esito, stato: dict, registri: dict[int, Registro]) -> tuple[list[dict], int]:
    dopo = stato.get("dopo_sessione")
    if not isinstance(dopo, int) or dopo < 1:
        e.errore("STATO.forma", "stato/stato.yaml", "dopo_sessione: il numero dell'ultima sessione che lo stato riflette")
        return [], 0
    for n in range(1, dopo + 1):
        if n not in registri:
            e.errore("STATO.registro", "stato/stato.yaml", f"lo stato arriva alla sessione {dopo}, ma manca sessioni/{n:02d}/registro.yaml")
    fatti = [f for f in stato.get("fatti") or [] if isinstance(f, dict)]
    regole = regole_del_mondo(c)
    ids = [f.get("id") for f in fatti]
    fatti_gioco = {i for i in ids if i}
    png_sessione = {p.stem for p in (c.cartella / "sessioni").glob("*/png/*.yaml")}
    per_id = {}
    for f in fatti:
        fid = f.get("id")
        dove = f"stato fatto {fid or '?'}"
        if not fid or not re.fullmatch(r"g_[a-z0-9_]+", str(fid)):
            e.errore("STATO.forma", dove, "id nella forma g_nome (i fatti di gioco; i f_ sono il canone preparato)")
        elif ids.count(fid) > 1:
            e.errore("STATO.forma", dove, "id ripetuto")
        if not f.get("testo"):
            e.errore("STATO.forma", dove, "manca testo")
        per_id[fid] = f
        _fonte(e, dove, f.get("fonte"), registri, dopo, regole)
        for x in f.get("supera") or []:
            if x not in c.canone:
                e.errore("STATO.riferimento", dove, f"supera un fatto del canone inesistente {x}")
        for x in f.get("rende_noti") or []:
            if x not in c.canone:
                e.errore("STATO.riferimento", dove, f"rende noto un fatto del canone inesistente {x}")
        if isinstance(f.get("fonte"), dict) and "tra_sessioni" in f["fonte"] and f.get("noto_ai_pg"):
            e.avviso("STATO.fonte", dove, "un fatto fuori scena è noto ai PG? Lo sapranno solo quando lo vedono in gioco")
        _riferimenti(c, e, dove, f.get("effetti") or {}, fatti_gioco, png_sessione)
    # Un fatto superato lo supera un fatto che viene DOPO.
    for f in fatti:
        dopo_id = f.get("superato_da")
        if not dopo_id:
            continue
        nuovo = per_id.get(dopo_id)
        dove = f"stato fatto {f.get('id')}"
        if nuovo is None:
            e.errore("STATO.riferimento", dove, f"superato_da un fatto inesistente {dopo_id}")
        elif isinstance(nuovo.get("fonte"), dict) and isinstance(f.get("fonte"), dict) and _ordine(nuovo["fonte"]) <= _ordine(f["fonte"]):
            e.errore("STATO.superato", dove, f"superato da {dopo_id}, che non viene dopo: un fatto si supera solo con uno più recente")
    # Orologi: alla fine di una sessione valgono quelli del registro; poi solo avanzamenti fuori scena col motivo.
    for oid, o in (stato.get("orologi") or {}).items():
        dove = f"stato orologio {oid}"
        if oid not in c.orologi:
            e.errore("STATO.riferimento", dove, "orologio inesistente")
            continue
        _fonte_orologio(e, dove, o or {}, registri, dopo, oid, regole)
    for pg, p in (stato.get("pg") or {}).items():
        if pg not in c.pg_ids:
            e.errore("STATO.riferimento", f"stato pg {pg}", "PG inesistente")
        elif not isinstance((p or {}).get("livello"), int) or not (p or {}).get("fonte"):
            e.errore("STATO.forma", f"stato pg {pg}", "livello intero, con la sua fonte")
        else:
            _fonte(e, f"stato pg {pg}", p["fonte"], registri, dopo)
    return fatti, dopo


def _fonte_orologio(e: Esito, dove: str, o: dict, registri: dict[int, Registro], dopo: int, oid: str, regole: set[str]) -> bool:
    fonte = o.get("fonte")
    if not isinstance(o.get("pieni"), int) or not isinstance(fonte, dict):
        e.errore("STATO.forma", dove, "{pieni: k, fonte: {sessione: n} | {tra_sessioni: n, motivo}}")
        return False
    if "tra_sessioni" in fonte:
        return _fonte(e, dove, fonte, registri, dopo, regole)
    reg = registri.get(fonte.get("sessione"))
    if reg is None:
        e.errore("STATO.fonte", dove, f"sessione {fonte.get('sessione')!r} senza registro")
        return False
    alla_fine = reg.pieni_alla_fine(oid)
    if alla_fine != o["pieni"]:
        e.errore("STATO.orologio", dove, f"{o['pieni']} segni, ma alla fine della sessione {reg.numero} il registro ne dice {alla_fine}")
        return False
    return True


# --- CONTINUITÀ --------------------------------------------------------------------------------------

def _pacchetto(c: Campagna, numero: int) -> dict | None:
    cartella = c.cartella / "sessioni" / f"{numero:02d}"
    if not (cartella / "sessione.yaml").exists():
        return None
    battute = []
    for f in sorted((cartella / "repertorio").glob("*.yaml")):
        for b in _yaml(f).get("battute") or []:
            if isinstance(b, dict):
                battute.append({**b, "_file": f"sessioni/{cartella.name}/repertorio/{f.name}"})
    return {"cartella": cartella, "nome": f"sessioni/{cartella.name}", "sessione": _yaml(cartella / "sessione.yaml"),
            "scene": [(f"sessioni/{cartella.name}/scene/{f.name}", _yaml(f)) for f in sorted((cartella / "scene").glob("*.yaml"))],
            "png": {f.stem: _yaml(f) for f in sorted((cartella / "png").glob("*.yaml"))}, "battute": battute}


def _parlanti(b: dict) -> set[str]:
    out = {b.get("chi")} if str(b.get("chi", "")).startswith("png_") else set()
    for v in [b.get("testo") or []] + list(b.get("varianti") or []):
        for r in v if isinstance(v, list) else []:
            m = re.match(r"^\[(png_[a-z0-9_]+)\]", str(r))
            if m:
                out.add(m.group(1))
    return out


def _continuita(c: Campagna, e: Esito, stato: dict, fatti: list[dict], dopo: int, registri: dict[int, Registro]) -> None:
    pac = _pacchetto(c, dopo + 1)
    if pac is None:
        return
    d = deriva(fatti)
    # Ciò che i PG hanno saputo dai registri: i fatti resi noti in gioco, deterministici.
    for reg in registri.values():
        d.saputi_dai_pg |= reg.fatti_noti()
    nome = pac["nome"]
    morti = {pid for pid, p in d.png.items() if p.get("vivo") is False}
    for sid, s in pac["scene"]:
        for pid in sorted(set(s.get("png_presenti") or []) & morti):
            e.errore("CONTINUITÀ.morto", sid, f"{pid} è morto nello stato, ma è tra i png_presenti")
    for b in pac["battute"]:
        for pid in sorted(_parlanti(b) & morti):
            e.errore("CONTINUITÀ.morto", f"{b['_file']} {b.get('id')}", f"{pid} è morto nello stato, ma parla")
    # Le schede: quella del pacchetto (intera, stesso id) sostituisce per questa sessione quella della
    # campagna, che resta la versione iniziale (docs/strati.md, principio 6).
    schede = {**{pid: d_ for pid, (_, d_) in c.png.items()}, **pac["png"]}
    in_scena = {p for _, s in pac["scene"] for p in s.get("png_presenti") or []} | {p for b in pac["battute"] for p in _parlanti(b)}
    for pid in sorted(set(pac["png"]) & morti):
        e.errore("CONTINUITÀ.morto", f"{nome}/png/{pid}.yaml", f"{pid} è morto nello stato, ma il pacchetto ha la sua scheda")
    for pid, p in sorted(d.png.items()):
        if p.get("vivo") is False:
            continue
        scheda = schede.get(pid) or {}
        cambiato = bool(p["sa"] or p["atteggiamento"] or p.get("dove"))
        if cambiato and pid in in_scena and pid not in pac["png"]:
            e.errore("CONTINUITÀ.scheda", f"png {pid}", "è cambiato in gioco (ciò che sa, l'atteggiamento, dove sta) e torna in "
                                                         f"scena, ma il pacchetto non ha la sua scheda aggiornata: {nome}/png/{pid}.yaml")
        for f in sorted(p["sa"] & set(scheda.get("non_sa") or [])):
            e.errore("CONTINUITÀ.saputo", f"png {pid}", f"ha saputo {f} in gioco, ma la scheda lo mette nel suo non_sa")
        if pid in pac["png"]:
            for f in sorted(p["sa"] - set(scheda.get("sa") or [])):
                e.errore("CONTINUITÀ.saputo", f"{nome}/png/{pid}.yaml", f"ha saputo {f} in gioco, ma non è nel sa della scheda aggiornata")
            for pg, a in sorted(p["atteggiamento"].items()):
                nella_scheda = ((scheda.get("atteggiamento_pg") or {}).get(pg) or {}).get("stato")
                if nella_scheda != a:
                    e.errore("CONTINUITÀ.scheda", f"{nome}/png/{pid}.yaml", f"verso {pg} è {a} nello stato, {nella_scheda} nella scheda")
    _segreti_del_pacchetto(c, e, pac, d, schede, in_scena, fatti)
    # Orologi: la sessione riparte da dove lo stato li lascia.
    for o in pac["sessione"].get("orologi") or []:
        if not isinstance(o, dict):
            continue
        atteso = ((stato.get("orologi") or {}).get(o.get("id")) or {}).get("pieni")
        if atteso is not None and o.get("pieni_all_inizio") != atteso:
            e.errore("CONTINUITÀ.orologio", f"{nome}/sessione.yaml", f"{o.get('id')} parte da {o.get('pieni_all_inizio')} segni, "
                                                                      f"ma lo stato ne dice {atteso}")
    # Promesse aperte: la sessione le riprende o le rimanda, per scritto.
    citati = {x.get("id") if isinstance(x, dict) else x for x in pac["sessione"].get("fili") or []}
    for pid, p in sorted(d.promesse.items()):
        if p.get("stato") == "aperta" and pid not in citati:
            e.avviso("CONTINUITÀ.promessa", f"{nome}/sessione.yaml", f"la promessa aperta {pid} ({p.get('cosa', '?')}) non è tra i "
                                                                     "fili: riprendila o rimandala, ma scrivilo")
    for fid, s in sorted(d.fili.items()):
        if s == "aperto" and fid not in citati:
            e.avviso("CONTINUITÀ.promessa", f"{nome}/sessione.yaml", f"il filo aperto {fid} non è tra i fili della sessione")
    # Oggetti persi o distrutti non tornano negli elementi delle scene.
    for oid, o in d.oggetti.items():
        if o.get("stato") in ("distrutto", "perso") and o.get("nome"):
            for sid, s in pac["scene"]:
                if any(str(o["nome"]).lower() in json.dumps(el, ensure_ascii=False).lower() for el in s.get("elementi_interattivi") or []):
                    e.avviso("CONTINUITÀ.oggetto", sid, f"«{o['nome']}» è {o['stato']} nello stato, ma è tra gli elementi della scena")
    # I PG non tornano indietro.
    for pg, p in (stato.get("pg") or {}).items():
        attuale = next((x for x in c.personaggi if x.get("id") == pg), {})
        if isinstance(attuale.get("livello"), int) and isinstance((p or {}).get("livello"), int) and attuale["livello"] < p["livello"]:
            e.errore("CONTINUITÀ.pg", "pg.yaml", f"{pg} è di livello {attuale['livello']}, ma nello stato è già {p['livello']}")


def _segreti_del_pacchetto(c: Campagna, e: Esito, pac: dict, d: Derivato, schede: dict, in_scena: set[str],
                           fatti: list[dict]) -> None:
    """Le parole segrete del pacchetto sostituiscono quelle della campagna: non nascondono ciò che i PG sanno,
    e ogni fatto ancora segreto che entra nel contesto della sessione ha la sua parola."""
    nome = pac["nome"]
    file_parole = pac["cartella"] / "repertorio" / "parole_segrete.yaml"
    if not file_parole.exists():
        if pac["battute"]:
            e.errore("CONTINUITÀ.segreto", f"{nome}/repertorio/parole_segrete.yaml", "il pacchetto ha un repertorio ma non le sue "
                                                                                    "parole segrete: quelle della campagna non valgono più")
        return
    parole = [v for v in _yaml(file_parole).get("parole") or [] if isinstance(v, dict)]
    for v in parole:
        fatti_v = set(v.get("fatti") or [])
        if fatti_v and fatti_v <= d.saputi_dai_pg:
            e.errore("CONTINUITÀ.saputo", f"parola segreta «{v.get('parola')}»", f"protegge {sorted(fatti_v)}, che i PG hanno già "
                                                                                 "saputo: il selettore la tratterebbe ancora come segreta")
    # Ciò che entra nel contesto della sessione: le schede dei PNG in scena, i fatti delle battute del pacchetto.
    nel_contesto: dict[str, str] = {}
    for pid in sorted(in_scena):
        scheda = schede.get(pid) or {}
        for f in scheda.get("sa") or []:
            nel_contesto.setdefault(f, f"sa di {pid}")
        for m in scheda.get("mente_su") or []:
            if isinstance(m, dict) and m.get("verita"):
                nel_contesto.setdefault(m["verita"], f"menzogna di {pid}")
    for b in pac["battute"]:
        for f in (b.get("effetti") or {}).get("fatti_noti") or []:
            nel_contesto.setdefault(f, f"battuta {b.get('id')}")
    segreti = {i for i, f in c.canone.items() if not f.get("noto_ai_pg")} | {f.get("id") for f in fatti if not f.get("noto_ai_pg")}
    coperti = {x for v in parole for x in v.get("fatti") or []}
    for f in sorted((set(nel_contesto) & segreti) - d.saputi_dai_pg - coperti):
        e.errore("CONTINUITÀ.segreto", f"{nome}/repertorio/parole_segrete.yaml",
                 f"{f} è ancora segreto ed entra nella sessione ({nel_contesto[f]}), ma nessuna parola segreta lo protegge")


def controlla(c: Campagna, e: Esito) -> None:
    file_stato = c.cartella / "stato" / "stato.yaml"
    registri = carica_registri(c, e) if (c.cartella / "sessioni").is_dir() else {}
    if not file_stato.exists():
        if registri:
            e.avviso("STATO.forma", "stato/stato.yaml", f"{len(registri)} sessioni giocate ma nessuno stato: va scritto tra le sessioni")
        return
    stato = _yaml(file_stato)
    fatti, dopo = _stato(c, e, stato, registri)
    if dopo:
        _continuita(c, e, stato, fatti, dopo, registri)
