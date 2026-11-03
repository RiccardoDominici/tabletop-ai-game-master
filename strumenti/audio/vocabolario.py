"""Il vocabolario chiuso dell'audio e le regole a parole chiave che traducono i testi della campagna.

Perché un vocabolario nostro: le fonti (Incompetech, Internet Archive, Freesound…) hanno ognuna i
suoi tag. La campagna parla solo questa lingua; ogni fonte ha il suo traduttore verso di essa.
Le regole sono trasparenti: ogni tag dedotto porta con sé la parola che l'ha fatto scattare
(vedi `trova`), e finisce in audio/descrittori.json, così si capisce sempre PERCHÉ un luogo ha
avuto quella musica o quella pioggia.

Le espressioni regolari coprono italiano (i testi delle schede) e inglese (i prompt immagine e lo
stile delle immagini sono in inglese). Si cercano su testo minuscolo, per radice di parola.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# --- Umori: i sei tag chiusi del manuale (§4, E14). La scena li usa in musica.tag. ---------------
UMORI = ("esplorazione_tesa", "taverna_calda", "rito_sacro", "inseguimento", "combattimento_epico", "lutto")

ENERGIE = ("bassa", "media", "alta")

# Energia tipica di ogni umore (si combina con l'intensità della scena).
ENERGIA_UMORE = {
    "esplorazione_tesa": "media", "taverna_calda": "media", "rito_sacro": "bassa",
    "inseguimento": "alta", "combattimento_epico": "alta", "lutto": "bassa",
}

# --- Descrittori di luogo per la musica ------------------------------------------------------
ORE = ("alba", "giorno", "imbrunire", "notte")
METEO = ("sereno", "pioggia", "temporale", "neve", "vento", "nebbia", "gelo")
EPOCHE = ("antica", "moderna", "futura")

# Ambientazioni: ognuna con le parole inglesi da cercare nelle DESCRIZIONI dei brani di Incompetech.
AMBIENTAZIONI: dict[str, str] = {
    "taverna": r"tavern|pub\b|inn\b|drinking|jig|reel|celtic|merry|feast",
    "chiesa": r"church|choir|chant|sacred|monaster|hymn|cathedral|prayer|requiem|organ",
    "ponte": r"bridge|river|water|flow",
    "fiume": r"river|water|flow|stream|rain|flood",
    "borgo": r"village|town|folk|rustic|street|alley",
    "piazza": r"village|town|square|folk|market",
    "mulino": r"mill|rustic|folk|countryside|village",
    "montagna": r"mountain|snow|winter|cold|wind|alpine|highland",
    "casa": r"home|hearth|warm|fire|cozy|intimate",
    "bosco": r"forest|woods|nature|wild|tree",
    "strada": r"journey|travel|road|walk|wander",
    "sotterraneo": r"cave|crypt|dungeon|underground|cellar|dark",
    "castello": r"castle|royal|court|noble|king",
    "mare": r"sea|ocean|ship|sail|wave|harbo",
    "mercato": r"market|bustle|busy|bazaar",
    "palazzo": r"palace|court|noble|elegant",
}

# --- Tag d'ambiente (strati in loop) ---------------------------------------------------------
# Per ognuno: le query per le fonti (inglese) e se è un suono «fermo» (pioggia, vento: varia poco,
# lo si controlla con l'LRA) o «vivo» (folla, campane: può variare).
@dataclass(frozen=True)
class TagAmbiente:
    query: tuple[str, ...]          # parole da cercare nelle fonti (in ordine di preferenza)
    fermo: bool                     # vero se dev'essere un tappeto uniforme
    volume: float                   # guadagno suggerito come strato principale (0–1)
    sintetizzabile: bool = False    # vero se c'è un ripiego sintetico (rumore filtrato)


AMBIENTI: dict[str, TagAmbiente] = {
    "pioggia": TagAmbiente(("rain", "rain ambience", "rainfall"), True, 0.55, True),
    "temporale": TagAmbiente(("thunderstorm", "thunder rain"), False, 0.5, False),
    "fiume": TagAmbiente(("river", "stream", "creek", "waterfall"), True, 0.6, True),
    "acqua": TagAmbiente(("water lapping", "water", "lake shore"), True, 0.4, True),
    "vento": TagAmbiente(("wind", "wind howling", "windy"), True, 0.45, True),
    "neve": TagAmbiente(("snow wind", "blizzard", "winter wind"), True, 0.4, True),
    "fuoco": TagAmbiente(("fireplace", "crackling fire", "campfire", "fire"), True, 0.45, True),
    "folla": TagAmbiente(("crowd murmur", "crowd talking", "crowd"), False, 0.35, False),
    "taverna": TagAmbiente(("tavern", "pub crowd", "inn ambience", "restaurant crowd"), False, 0.4, False),
    "campane": TagAmbiente(("church bells", "church bell", "bells"), False, 0.35, False),
    "canto": TagAmbiente(("choir", "chant", "singing church"), False, 0.3, False),
    "notte": TagAmbiente(("crickets", "night crickets", "night ambience"), True, 0.35, False),
    "stalla": TagAmbiente(("farm animals", "barn", "geese", "chickens"), False, 0.25, False),
    "gocce": TagAmbiente(("dripping water", "drip", "cave drips"), False, 0.3, False),
    "mare": TagAmbiente(("sea waves", "ocean waves", "waves"), True, 0.55, True),
    "bosco": TagAmbiente(("forest birds", "forest ambience", "birdsong"), False, 0.4, False),
    "mulino": TagAmbiente(("water mill", "watermill", "mill wheel"), False, 0.4, False),
}

# --- Effetti (colpi singoli) --------------------------------------------------------------
EFFETTI: dict[str, tuple[str, ...]] = {
    "campana": ("church bell toll", "bell toll", "church bell"),
    "porta": ("door creak", "wooden door", "door"),
    "catena": ("chains", "chain rattle"),
    "tuono": ("thunder", "thunder clap"),
    "monete": ("coins", "coin drop"),
    "chiave": ("key lock", "lock"),
}


# --- Regole a parole chiave ----------------------------------------------------------------
@dataclass(frozen=True)
class Regola:
    tag: str
    schema: str        # espressione regolare (minuscolo)
    peso: float = 1.0


def _r(tag: str, schema: str, peso: float = 1.0) -> Regola:
    return Regola(tag, schema, peso)


# Ambienti d'ambiente dedotti dai testi del luogo. Il peso dice quanto conta una parola: «paese»
# è vago (0,5), «pioggia» no. Le soglie sono in descrittori.py.
REGOLE_AMBIENTE = [
    _r("pioggia", r"\bpiogg|\bpiov[eo]|\bbagnat|fradic|grondai|acquazzon|\brain|drizzl|downpour"),
    _r("temporale", r"temporal|\btuon[oi]|\bfulmin|thunder|lightning|\bstorm"),
    _r("fiume", r"\bfium|\bpiena\b|\barcat|torrent|ruscell|\bcorrente\b|\bargin|\bguado|\briver|\bstream|\bbrook|\bfrozen mountain stream"),
    _r("acqua", r"\bacqua\b|allagat|sott'acqua|\bflooded|waist-deep|\bwater\b", 0.7),
    _r("vento", r"\bvent[oi]\b|\bfolat|\braffic|\bbufer|tormenta|spiffer|\bwind|\bgust"),
    # Solo la neve vera: «acqua gelata» o «ferro gelato» sono freddo, non neve che cade.
    _r("neve", r"\bnev[ei]\b|innevat|\bsnow|blizzard|tormenta"),
    _r("fuoco", r"\bfuoco|camin|\bforn[oi]\b|\bstuf[ae]\b|\bbrac[ei]\b|fiamm|focolar|crepit|\bfire\b|hearth|fireplace|\boven\b|\bembers"),
    _r("folla", r"\bfolla|\bgente\b|mormor|brusio|\bfamiglie|\bcrowd|townsfolk|villagers|murmur", 0.8),
    _r("folla", r"\bvoci\b|\bpaese\b|\bvecchi\b|\bbambini\b", 0.4),
    _r("taverna", r"osteri|tavern|locand|\bvino\b|boccal|\bbancone|\binn\b|\bpub\b|tankard"),
    _r("campane", r"campan|rintocc|\btocc(o|hi)\b|\bbells?\b|belfry"),
    _r("canto", r"\bcant[oia]\b|\bcantano|\bcoro\b|\bveglia|preghier|litani|\bsalm|\bchoir|chant|\bhymn|singing"),
    _r("stalla", r"\bstall[ae]\b|\bcapr[ae]\b|\bmucc|\bpecor|gallin|\boca\b|\boche\b|\bstable|livestock|\bgoose"),
    _r("gocce", r"\bgocc|gocciol|stillicid|\bdrip"),
    _r("mare", r"\bmare\b|\bonde\b|\bporto\b|\bsea\b|\bwaves\b|harbou?r"),
    _r("bosco", r"\bbosc[oh]|\bforest|\bfoglie|\buccell|\bwoods\b|\bbirds?\b"),
    _r("mulino", r"\bmulin|watermill|water wheel|\bmill\b"),
]

# La «notte» d'ambiente (grilli, civette) si aggiunge solo se il luogo è all'aperto, di notte,
# e NON piove né nevica (i grilli d'inverno sarebbero un errore): la regola sta in descrittori.py.
REGOLE_ESTERNO = [_r("esterno", r"\bpiazz|\bstrad|\bsentier|mulattier|\bvicol|\bponte\b|\briva\b|\bargin|all'aperto|\bsquare\b|\boutdoor|\bpath\b|\balley|\bbridge|\bvalley|\bvalle\b")]
REGOLE_INTERNO = [_r("interno", r"osteri|tavern|locand|dispens|cantin|\bstanz|\bsala\b|dentro|\binterno|\bcucina|\bstudio\b|\bcamin|\bbancone|\bindoors?|\binterior|\broom\b|\binside\b")]

REGOLE_EFFETTI = [
    _r("campana", r"rintocc|\btocc(o|hi)\b|campan|\bbell toll"),
    _r("porta", r"\b(la|una|le|alla|dalla|sulla|ogni) port[ae]\b|\bporte\b|\buscio|\bimposte|chiavistell|\bdoors?\b"),
    _r("catena", r"\bcaten[ae]\b|\bchains?\b"),
    _r("tuono", r"temporal|\btuon[oi]|thunder"),
    _r("monete", r"\bmonet[ae]\b|\bsoldo\b|\bsoldi\b|\bcorone\b|\bfiorin|\bpedaggi|\bcoins?\b"),
    _r("chiave", r"\bchiav[ei]\b|serratur|lucchett|\bkeys?\b|\block\b"),
]

REGOLE_AMBIENTAZIONE = [
    _r("taverna", r"osteri|tavern|locand|\binn\b"),
    _r("chiesa", r"\bchies[ae]|cappell|\bcurato|campanil|\bchurch|chapel"),
    _r("ponte", r"\bpont[ei]\b|\bbridge"),
    _r("fiume", r"\bfium|\briver\b|\btorrent"),
    _r("borgo", r"\bborg[oh]|\bvicol|\bquartier|\bvillage|\balley|\bquarter\b"),
    _r("piazza", r"\bpiazz|\bsquare\b"),
    _r("mulino", r"\bmulin|watermill|\bmill\b"),
    _r("montagna", r"montagn|\bvalle\b|\bcolle\b|collin|\bmountain|\bvalley|\bhill"),
    _r("casa", r"\bcasa\b|\bstanz|\bstudio\b|\bhouse\b|\broom\b|\bhall\b"),
    _r("bosco", r"\bbosc[oh]|\bforest|\bwoods\b"),
    _r("strada", r"\bstrad|\bsentier|mulattier|\bpasso\b|\broad\b|\bpath\b"),
    _r("sotterraneo", r"cantin|\bcript|sotterran|dispens|\bcellar|\bcrypt|dungeon|storeroom"),
    _r("castello", r"castell|\brocca\b|fortezz|\bcastle|fortress"),
    _r("mare", r"\bmare\b|\bporto\b|\bsea\b|harbou?r"),
    _r("mercato", r"mercat|\bmarket"),
    _r("palazzo", r"palazz|\bpalace"),
]

REGOLE_ORA = [
    _r("notte", r"\bnott[ei]\b|\bbuio\b|mezzanott|\bnight|moonlit|\bcandlelight|lanterns? light"),
    _r("imbrunire", r"imbrun|tramont|crepuscol|\bsera\b|\bdusk\b|sunset|twilight"),
    _r("alba", r"\balba\b|\bmattin|\bdawn\b|sunrise"),
    _r("giorno", r"mezzogiorno|pomerigg|\bdaylight|\bsunny|\bnoon\b"),
]

REGOLE_METEO = [
    _r("pioggia", r"\bpiogg|\bpiov[eo]|\brain"),
    _r("temporale", r"temporal|\btuon|thunder|\bstorm"),
    _r("neve", r"\bnev[ei]\b|\bsnow|blizzard"),
    _r("gelo", r"\bgel[oa]\b|gelat|ghiacc|\bfrozen|\bicy\b|\bfrost"),
    _r("vento", r"\bvent[oi]\b|\bfolat|\bwind\b|\bgust"),
    _r("nebbia", r"nebbi|foschi|\bfog\b|\bmist"),
]

REGOLE_EPOCA = [
    _r("antica", r"medieval|folk-tale|fiaba|storybook|\bold italian|\bcastell|\bcavalier|\blantern|candel|\bpaese\b|\bborgo\b|\bcorone\b|\bfiorini\b|fantasy|\bdrag|tiefling|\belf"),
    _r("moderna", r"\bcittà moderna|\bautomobil|\btelefon|\bneon\b|\bcar\b|\bcars\b|\bmodern\b"),
    _r("futura", r"\bcyber|\bsci-?fi|futur|astronav|\bspaceship|\brobot"),
]

# Toni della campagna → modo musicale del motivo di campagna (se stile.audio.modo manca).
REGOLE_MODO_CAMPAGNA = [
    _r("dorico", r"\bcup[ao]|mister|paura|\btes[ao]\b|\bombr|\bnott|\binquiet"),
    _r("eolio", r"tragic|\blutto|\bdolor|\bmorte|\bperdit|malincon"),
    _r("misolidio", r"\bcald[ao]|\bumano|sorris|\bpaese\b|\bfiaba"),
    _r("ionio", r"\ballegr|comic|\bfesta|\bleggero|\bspensierat"),
]

# --- Modi (scale in semitoni dalla tonica) -------------------------------------------------
MODI: dict[str, tuple[int, ...]] = {
    "ionio": (0, 2, 4, 5, 7, 9, 11),
    "dorico": (0, 2, 3, 5, 7, 9, 10),
    "frigio": (0, 1, 3, 5, 7, 8, 10),
    "lidio": (0, 2, 4, 6, 7, 9, 11),
    "misolidio": (0, 2, 4, 5, 7, 9, 10),
    "eolio": (0, 2, 3, 5, 7, 8, 10),
}
# Sinonimi che il Preparatore può scrivere in stile.audio / png.tema.
SINONIMI_MODO = {
    "maggiore": "ionio", "major": "ionio", "ionian": "ionio",
    "minore": "eolio", "minor": "eolio", "aeolian": "eolio",
    "dorian": "dorico", "phrygian": "frigio", "lydian": "lidio", "mixolydian": "misolidio",
}

# Note per nome (italiano e inglese) → classe di altezza.
NOTE = {"do": 0, "re": 2, "mi": 4, "fa": 5, "sol": 7, "la": 9, "si": 11,
        "c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}

# Registri → nota MIDI centrale del motivo (poi si stringe nell'estensione dello strumento).
REGISTRI = {"basso": 48, "medio": 60, "alto": 72}


# --- Strumenti -----------------------------------------------------------------------------
@dataclass(frozen=True)
class Strumento:
    gm: int                  # programma General MIDI, CONTATO DA ZERO (come tinysoundfont)
    estensione: tuple[int, int]   # note MIDI suonabili bene
    it: str                  # regex sui testi italiani (tavolozza_musicale.strumenti, png.tema.strumento)
    en: str                  # regex sul campo instruments di Incompetech
    famiglia: str            # archi | legni | ottoni | ance_libere | corde | percussioni_intonate | tastiere | voci | elettronici | percussioni


STRUMENTI: dict[str, Strumento] = {
    "flauto": Strumento(73, (60, 96), r"\bflaut(o|i)\b(?! di legno| dolce)|piffer|ottavin", r"flute|piccolo|pan ?flute|pipe", "legni"),
    "flauto_dolce": Strumento(74, (60, 91), r"flauto (di legno|dolce)|zufol|\bflauti di legno", r"recorder|whistle|tin whistle", "legni"),
    "clarinetto": Strumento(71, (50, 89), r"clarinett", r"clarinet", "legni"),
    "oboe": Strumento(68, (58, 89), r"\boboe|\bciaramell", r"oboe|english horn|shawm", "legni"),
    "fagotto": Strumento(70, (34, 72), r"fagott", r"bassoon", "legni"),
    "fisarmonica": Strumento(21, (53, 89), r"fisarmonic", r"accordion", "ance_libere"),
    "organetto": Strumento(23, (55, 86), r"organett|concertin", r"concertina|squeezebox|bandoneon", "ance_libere"),
    "ghironda": Strumento(110, (55, 84), r"ghiron", r"hurdy", "archi"),
    "cornamusa": Strumento(109, (58, 77), r"cornamus|zampogn", r"bagpipe|pipes", "ance_libere"),
    "violino": Strumento(40, (55, 96), r"violin(o|i)\b|\bviolin\b", r"violin|fiddle", "archi"),
    "viola": Strumento(41, (48, 84), r"\bviol[ae]\b(?! da)", r"\bviola", "archi"),
    "violoncello": Strumento(42, (36, 76), r"violoncell|\bcell[oi]\b", r"cello", "archi"),
    "contrabbasso": Strumento(32, (28, 60), r"contrabbass", r"contrabass|double bass|upright bass|acoustic bass", "archi"),
    "archi": Strumento(48, (40, 91), r"\barchi\b|orchestra d'archi", r"strings|string ensemble|violins|violas|cellos", "archi"),
    "arpa": Strumento(46, (36, 96), r"\barp[ae]\b", r"harp", "corde"),
    "liuto": Strumento(24, (40, 81), r"\bliut|chitarr|mandol", r"lute|guitar|mandolin|bouzouki|oud", "corde"),
    "salterio": Strumento(15, (48, 88), r"salteri|dulcimer|cimbal", r"dulcimer|hammered|zither|cimbalom", "corde"),
    "campane": Strumento(14, (60, 77), r"campan", r"bell|chime|tubular", "percussioni_intonate"),
    "celesta": Strumento(8, (60, 96), r"celest|carillon", r"celesta|glockenspiel|music ?box", "percussioni_intonate"),
    "organo": Strumento(19, (36, 89), r"\borgan[oi]\b(?!ett)", r"\borgan\b|pipe organ|church organ", "tastiere"),
    "pianoforte": Strumento(0, (36, 96), r"pianofort|\bpiano\b", r"piano", "tastiere"),
    "voci": Strumento(52, (52, 79), r"\bvoc[ei]\b|\bcoro\b|\bcanto\b", r"choir|voice|vocal|chant|soprano", "voci"),
    "corno": Strumento(60, (41, 77), r"\bcorn[oi]\b(?!amus)", r"french horn|\bhorns?\b", "ottoni"),
    "tromba": Strumento(56, (54, 84), r"\btromb[ae]\b", r"trumpet", "ottoni"),
    "ottoni": Strumento(61, (40, 82), r"\bottoni\b|trombon|\btuba\b", r"brass|trombone|tuba", "ottoni"),
    "percussioni": Strumento(47, (36, 60), r"percuss|tambur|timpan", r"drum|percussion|timpani|taiko|tambourine|bodhran|cymbal", "percussioni"),
    "elettronici": Strumento(88, (36, 96), r"sintetizz|elettronic|elettric", r"synth|electric|electronic|drum machine|808|bass guitar|e-bass", "elettronici"),
}

# Strumenti adatti a un motivo di PNG (melodici, riconoscibili da soli).
STRUMENTI_TEMA = tuple(k for k, s in STRUMENTI.items() if s.famiglia not in ("percussioni", "elettronici") and k != "archi")

# Parole che negano lo strumento che segue nella stessa frase («Niente percussioni da battaglia»).
NEGAZIONI = r"\b(niente|senza|mai|no|evitare|vietat[oei])\b"


# --- Caratteri dei PNG (tema) ----------------------------------------------------------------
@dataclass(frozen=True)
class Carattere:
    schema: str                     # regex sui campi PUBBLICI del PNG
    modo: str                       # modo del suo tema
    trasformazioni: tuple[str, ...]  # inversione | aumentazione | diminuzione | salto | staccato | ripetizione
    strumenti: tuple[str, ...]      # preferenze, in ordine
    registro: str | None = None     # spinta di registro, se c'è


# NB: nessuna regola guarda menzogne, segreti o il ruolo nella trama. Il tema nasce solo dalla
# persona pubblica (aspetto.lettura, personalita.superficie/sotto_pressione, voce senza mai_dice),
# e nessun carattere dedotto produce un modo «sinistro» (frigio): un PNG che mente non suona
# diverso da uno onesto. Il frigio resta disponibile solo se lo scrive il Preparatore in png.tema.
CARATTERI: dict[str, Carattere] = {
    "caldo": Carattere(r"\bcald[aoei]\b|gentil|affettuos|matern|premuros|\bdolc[ei]\b|accoglient|cordial|\bbuon[ao]\b", "ionio", ("legato",), ("flauto_dolce", "clarinetto", "arpa", "fisarmonica", "violoncello")),
    "gioviale": Carattere(r"giovial|allegr|scherz|\bride\b|risat|chiacchier|loquac|sta zitt|vivac|svelt|spiritos|battut", "misolidio", ("diminuzione", "staccato"), ("fisarmonica", "organetto", "violino", "flauto", "liuto"), "alto"),
    "burbero": Carattere(r"burber|\bbrusc|scontros|ruvid|brontol|sbrigativ|spiccio|\bsecc[oa]\b|\bduro\b|\bdura\b", "dorico", ("accento",), ("fagotto", "contrabbasso", "violoncello", "corno"), "basso"),
    "solenne": Carattere(r"solenn|\bsever|autorevol|formal|\bdign|\bprecis|ordinat|\bmisurat|ceremon", "dorico", ("aumentazione",), ("organo", "corno", "violoncello", "archi"), "basso"),
    "nervoso": Carattere(r"nervos|agitat|ansios|inquiet|\btrem|spaventat|impaurit|balbett|sobbalz|in fretta", "eolio", ("diminuzione", "ripetizione"), ("clarinetto", "violino", "flauto", "salterio"), "alto"),
    "freddo": Carattere(r"\bfredd|taglient|distacc|glacial|calcolat|impassibil|gelid|\bsprezz", "eolio", ("inversione",), ("clarinetto", "oboe", "celesta", "viola")),
    "malinconico": Carattere(r"malinconi|\btrist|\bstanc|rassegnat|dolent|\bpiang|nostalg", "eolio", ("aumentazione",), ("violoncello", "oboe", "viola", "flauto_dolce"), "basso"),
    "fiero": Carattere(r"\bfier|orgoglios|testard|ostinat|\bdecis|coraggios|sfrontat|impettit|\bsfida", "misolidio", ("salto",), ("corno", "tromba", "violino", "cornamusa")),
    "pacato": Carattere(r"pacat|\bcalm|tranquill|pazient|riflessiv|cortes|\bpiano\b|sottovoce|\blent[oa]\b", "dorico", ("legato",), ("arpa", "liuto", "violoncello", "flauto")),
    "timido": Carattere(r"timid|riservat|\bschiv|silenzios|\bsvelt[oa]? a nascond|\bimpacciat", "lidio", ("staccato",), ("celesta", "flauto", "arpa", "salterio"), "alto"),
}


def _minuscolo(testo: str) -> str:
    return (testo or "").lower().replace("’", "'")


def trova(regole: list[Regola], testo: str) -> dict[str, list[tuple[str, float]]]:
    """Applica le regole a un testo. Ritorna {tag: [(parola trovata, peso), ...]} (la prova del perché)."""
    testo = _minuscolo(testo)
    out: dict[str, list[tuple[str, float]]] = {}
    for r in regole:
        for m in re.finditer(r.schema, testo):
            out.setdefault(r.tag, []).append((m.group(0).strip(), r.peso))
    return out


def strumenti_in(testo: str) -> tuple[list[str], list[str]]:
    """Gli strumenti citati in un testo libero, divisi in (ammessi, vietati), in ordine di comparsa.

    Una frase con una negazione («Niente percussioni da battaglia», «senza ottoni») mette gli
    strumenti che cita tra i vietati. Le frasi si dividono su punto e punto e virgola.
    """
    ammessi, vietati = [], []
    for frase in re.split(r"[.;\n]", _minuscolo(testo)):
        negata = re.search(NEGAZIONI, frase) is not None
        trovati = sorted(((m.start(), nome) for nome, s in STRUMENTI.items() for m in [re.search(s.it, frase)] if m))
        for _, nome in trovati:
            (vietati if negata else ammessi).append(nome)
    return list(dict.fromkeys(ammessi)), list(dict.fromkeys(vietati))


def strumenti_incompetech(campo: str) -> set[str]:
    """Traduce il campo `instruments` di Incompetech nei nostri strumenti."""
    testo = _minuscolo(campo)
    return {nome for nome, s in STRUMENTI.items() if re.search(s.en, testo)}


def normalizza_modo(valore: str | None) -> str | None:
    if not valore:
        return None
    v = _minuscolo(str(valore)).strip()
    v = SINONIMI_MODO.get(v, v)
    return v if v in MODI else None


def tonica_da_testo(valore: str | None) -> tuple[int | None, str | None]:
    """«re minore», «D dorian», «la» → (classe di altezza, modo o None)."""
    if not valore:
        return None, None
    parole = _minuscolo(str(valore)).replace("♭", "b").replace("#", " diesis").split()
    if not parole:
        return None, None
    nota = NOTE.get(parole[0].rstrip("b"))
    if nota is not None and (parole[0].endswith("b") and len(parole[0]) > 1 and parole[0] not in ("b",)):
        nota = (nota - 1) % 12
    if nota is not None and "diesis" in parole[1:2]:
        nota = (nota + 1) % 12
    modo = next((normalizza_modo(p) for p in parole[1:] if normalizza_modo(p)), None)
    return nota, modo
