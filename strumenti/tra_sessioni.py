"""Le parti deterministiche del lavoro tra le sessioni (riferimenti/tra-le-sessioni.md; scripts/tra-sessioni.sh).

Ciò che non chiede giudizio lo fa il codice, così l'agente scrive solo ciò che va scritto:
  riassunto  il registro della sessione giocata, letto per l'agente (che cosa è uscito, a che turno);
  mondo      la mossa del mondo che le regole fisse danno da sole: l'orologio d'arco più `ritmo.per_sessione`,
             e le condizioni di `accelera` / `rallenta` che l'agente deve giudicare sul registro;
  completo   il pacchetto di sessioni/<n+1>/ ha ciò che lo scheletro lascia all'agente: riassunto, scene con la
             loro scheda, un repertorio, e per ogni filo se è ripreso o rimandato;
  pacchetto  lo scheletro di sessioni/<n+1>/ dallo stato: pieni_all_inizio, i fili aperti da riprendere o
             rimandare, le schede aggiornate dei PNG ricorrenti cambiati in gioco (sa, non_sa e atteggiamento
             dallo stato), le parole segrete senza quelle dei fatti che i PG ormai sanno.
Non sovrascrive mai un file che esiste: si può rilanciare.

    python3 strumenti/tra_sessioni.py riassunto campagne/<id> <n>
    python3 strumenti/tra_sessioni.py mondo campagne/<id> <n>
    python3 strumenti/tra_sessioni.py pacchetto campagne/<id> <n>
    python3 strumenti/tra_sessioni.py completo campagne/<id> <n>
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import valida  # noqa: E402
from valida.esito import Esito  # noqa: E402
from valida.regole_stato import carica_registri, deriva  # noqa: E402

log = logging.getLogger("tra_sessioni")


def _yaml(p: Path) -> dict:
    d = yaml.safe_load(p.read_text(encoding="utf-8")) if p.exists() else None
    return d if isinstance(d, dict) else {}


def _scrivi(p: Path, dati: dict, intestazione: str) -> bool:
    """Scrive solo se il file non c'è (mai sopra il lavoro dell'agente). Ritorna vero se ha scritto."""
    if p.exists():
        print(f"  c'è già, non lo tocco: {p}")
        return False
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(intestazione + yaml.safe_dump(dati, allow_unicode=True, sort_keys=False, width=110), encoding="utf-8")
    print(f"  scritto: {p}")
    return True


def riassunto(cartella: Path, n: int) -> int:
    _, c = valida(cartella, contesto_b=False)
    reg = carica_registri(c, Esito()).get(n)
    if reg is None:
        print(f"manca sessioni/{n:02d}/registro.yaml: lo scrive il server a «Fine sessione»", file=sys.stderr)
        return 1
    d = reg.dati
    print(f"Sessione {n} di {d.get('campagna')}: {reg.ultimo_turno()} turni, {(d.get('archivio') or {}).get('motivo_chiusura')}")
    for s in d.get("scene") or []:
        print(f"  scena {s.get('id')}: turni {s.get('dal_turno')}–{s.get('al_turno')}")
    for sezione, nome in (("indizi", "indizi rivelati"), ("fatti_noti", "fatti resi noti ai PG"), ("menzogne", "menzogne dette")):
        voci = d.get(sezione)
        if voci is None:
            print(f"  {nome}: non registrati (modalità A)")
            continue
        print(f"  {nome}: " + (", ".join(f"{v['id']} (t{v['turno']})" for v in voci) or "nessuno"))
    momenti = [b for b in d.get("battute") or [] if b.get("tipo") in ("confessione", "momento", "finale")]
    print("  momenti: " + (", ".join(f"{b['id']} (t{b['turno']})" for b in momenti) or "nessuno"))
    for o in d.get("orologi") or []:
        print(f"  orologio {o.get('id')}: da {o.get('pieni_all_inizio')} a {o.get('pieni_alla_fine')} di {o.get('segmenti')}"
              f"{' (completo)' if o.get('completo') else ''}")
    print("  PNG incontrati: " + (", ".join(f"{p['id']} (t{p['primo_turno']}–{p['ultimo_turno']})" for p in d.get("png_incontrati") or []) or "nessuno"))
    for pg in d.get("pg") or []:
        print(f"  {pg.get('id')}: {len(pg.get('azioni_pubbliche') or [])} azioni pubbliche, {len(pg.get('azioni_private') or [])} private")
    print(f"  trascrizione: sessioni/{n:02d}/{(d.get('trascrizione') or {}).get('file', 'trascrizione.yaml')} "
          f"({len(reg.trascrizione.get('voci') or [])} voci)")
    return 0


def mondo(cartella: Path, n: int) -> int:
    _, c = valida(cartella, contesto_b=False)
    reg = carica_registri(c, Esito()).get(n)
    arco = c.preparazione.get("arco") or {}
    oid = arco.get("orologio")
    if reg is None or not oid:
        print("niente da muovere: serve il registro della sessione e un arco con il suo orologio (riferimenti/arco.md)")
        return 0
    ritmo = arco.get("ritmo") or {}
    segmenti = int((c.orologi.get(oid) or {}).get("segmenti") or 0)
    fine = reg.pieni_alla_fine(oid)
    if fine is None:
        fine = int((c.orologi.get(oid) or {}).get("pieni_all_inizio") or 0)   # l'orologio d'arco non era in scena
    base = min(segmenti, fine + int(ritmo.get("per_sessione") or 0))
    print(f"Orologio d'arco {oid}: {fine} a fine sessione {n}, {segmenti} segmenti.")
    print(f"  regola fissa: +{ritmo.get('per_sessione')} → {base}")
    print("  l'agente giudica sul registro, e aggiunge o toglie un segno per ciascuna condizione vera:")
    for x in ritmo.get("accelera") or []:
        print(f"    accelera (+1): {x}")
    for x in ritmo.get("rallenta") or []:
        print(f"    rallenta (−1): {x}")
    tappe = [t for t in arco.get("tappe") or [] if isinstance(t, dict) and fine < int(t.get("segno") or 0) <= base]
    for t in tappe:
        print(f"  con la regola fissa si compie la tappa {t.get('id')}: {t.get('cosa')} (segno visibile: {t.get('segno_visibile')})")
    print("\nDa mettere in stato/stato.yaml (il motivo nomina l'orologio, come vuole STATO):")
    print(yaml.safe_dump({"orologi": {oid: {"pieni": base, "fonte": {"tra_sessioni": n, "motivo": f"{oid}: ritmo d'arco, +{ritmo.get('per_sessione')}"}}}},
                         allow_unicode=True, sort_keys=False).rstrip())
    return 0


def _scheda_base(c, pid: str, n: int) -> dict | None:
    """L'ultima scheda di un PNG: quella del pacchetto più recente fino alla sessione n, o quella della campagna."""
    for k in range(n, 0, -1):
        p = c.cartella / "sessioni" / f"{k:02d}" / "png" / f"{pid}.yaml"
        if p.exists():
            return _yaml(p)
    return dict(c.png[pid][1]) if pid in c.png else None


def _parole_base(c, n: int) -> dict:
    for k in range(n, 0, -1):
        p = c.cartella / "sessioni" / f"{k:02d}" / "repertorio" / "parole_segrete.yaml"
        if p.exists():
            return _yaml(p)
    return dict(c.parole_segrete or {})


def pacchetto(cartella: Path, n: int) -> int:
    _, c = valida(cartella, contesto_b=False)
    stato = _yaml(c.cartella / "stato" / "stato.yaml")
    if stato.get("dopo_sessione") != n:
        print(f"lo stato dice dopo_sessione {stato.get('dopo_sessione')!r}: scrivilo fino alla sessione {n} prima del pacchetto",
              file=sys.stderr)
        return 1
    registri = carica_registri(c, Esito())
    d = deriva([f for f in stato.get("fatti") or [] if isinstance(f, dict)])
    for reg in registri.values():
        d.saputi_dai_pg |= reg.fatti_noti()
    dest = c.cartella / "sessioni" / f"{n + 1:02d}"
    print(f"Scheletro di {dest} dallo stato dopo la sessione {n}:")
    fili = [{"id": pid, "cosa": p.get("cosa", ""), "come": "da_decidere"} for pid, p in sorted(d.promesse.items()) if p.get("stato") == "aperta"]
    fili += [{"id": fid, "come": "da_decidere"} for fid, s in sorted(d.fili.items()) if s == "aperto"]
    _scrivi(dest / "sessione.yaml", {
        "riassunto_iniziale": "",
        "scene": [],
        # Solo gli orologi che il Motore gioca (campagna.yaml → orologi); quelli dei fronti restano nello stato.
        "pieni_all_inizio": {oid: (o or {}).get("pieni") for oid, o in sorted((stato.get("orologi") or {}).items())
                             if oid in {x.get("id") for x in c.campagna.get("orologi") or [] if isinstance(x, dict)}},
        "preparazione": {"fili": fili},
    }, f"# Pacchetto della sessione {n + 1}: scheletro di strumenti/tra_sessioni.py. Da scrivere: riassunto_iniziale\n"
       "# (dai fatti dello stato), scene, repertorio; per ogni filo, come: ripreso o rimandato.\n")
    # Schede dei PNG ricorrenti cambiati in gioco: la scheda intera, con ciò che lo stato dice di loro.
    for pid, p in sorted(d.png.items()):
        if p.get("vivo") is False or not (p["sa"] or p["atteggiamento"] or p.get("dove")):
            continue
        scheda = _scheda_base(c, pid, n)
        if scheda is None:
            continue
        scheda["sa"] = list(dict.fromkeys([*(scheda.get("sa") or []), *sorted(p["sa"])]))
        scheda["non_sa"] = [f for f in scheda.get("non_sa") or [] if f not in p["sa"]]
        for pg, a in sorted(p["atteggiamento"].items()):
            scheda.setdefault("atteggiamento_pg", {}).setdefault(pg, {})["stato"] = a
        _scrivi(dest / "png" / f"{pid}.yaml", scheda,
                f"# {pid} dopo la sessione {n}: scheda intera, sostituisce quella della campagna per la sessione {n + 1}.\n"
                "# sa, non_sa e atteggiamento vengono dallo stato; riscrivi perche e vuole, e ciò che il gioco ha cambiato.\n")
    # Parole segrete: le ultime in uso, senza quelle che proteggono solo fatti che i PG ormai sanno.
    base = _parole_base(c, n)
    tenute = [v for v in base.get("parole") or [] if isinstance(v, dict) and not set(v.get("fatti") or []) <= d.saputi_dai_pg]
    tolte = [v.get("parola") for v in base.get("parole") or [] if isinstance(v, dict) and v not in tenute]
    _scrivi(dest / "repertorio" / "parole_segrete.yaml", {"parole": tenute},
            f"# Parole segrete della sessione {n + 1}: sostituiscono quelle della campagna (docs/strati.md, principio 6).\n"
            f"# Tolte perché i PG le sanno: {', '.join(map(str, tolte)) or 'nessuna'}. Aggiungi quelle dei segreti nuovi.\n")
    return 0


def completo(cartella: Path, n: int) -> int:
    """Ciò che lo scheletro lascia all'agente c'è? (Un controllo di presenza: la qualità la giudica il validatore.)"""
    dest = cartella / "sessioni" / f"{n + 1:02d}"
    s = _yaml(dest / "sessione.yaml")
    mancano = []
    if not str(s.get("riassunto_iniziale") or "").strip():
        mancano.append("sessione.yaml: riassunto_iniziale vuoto")
    scene = s.get("scene") or []
    if not scene:
        mancano.append("sessione.yaml: nessuna scena")
    ids = {_yaml(f).get("id") for f in (dest / "scene").glob("*.yaml")}
    for sid in scene:
        if sid not in ids:
            mancano.append(f"la scena {sid} non ha la scheda in sessioni/{n + 1:02d}/scene/")
    for f in (s.get("preparazione") or {}).get("fili") or []:
        if isinstance(f, dict) and f.get("come") not in ("ripreso", "rimandato"):
            mancano.append(f"filo {f.get('id')}: come è ripreso o rimandato")
    if not any((_yaml(f).get("battute") for f in (dest / "repertorio").glob("*.yaml"))):
        mancano.append(f"sessioni/{n + 1:02d}/repertorio/: nessuna battuta")
    for m in mancano:
        print(f"  manca: {m}")
    if not mancano:
        print(f"  sessioni/{n + 1:02d}/ ha riassunto, scene, repertorio e fili decisi")
    return 1 if mancano else 0


def main() -> int:
    logging.basicConfig(level=logging.WARNING)
    ap = argparse.ArgumentParser(description="Parti deterministiche del lavoro tra le sessioni.")
    ap.add_argument("comando", choices=["riassunto", "mondo", "pacchetto", "completo"])
    ap.add_argument("cartella", type=Path)
    ap.add_argument("sessione", type=int, help="la sessione appena giocata")
    a = ap.parse_args()
    return {"riassunto": riassunto, "mondo": mondo, "pacchetto": pacchetto, "completo": completo}[a.comando](a.cartella, a.sessione)


if __name__ == "__main__":
    sys.exit(main())
