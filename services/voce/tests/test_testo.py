"""Test della normalizzazione del testo (voce/testo.py). Niente MLX: girano in un attimo."""
import unicodedata

import pytest

from voce.testo import normalizza


@pytest.mark.parametrize(
    "ingresso, atteso",
    [
        # virgolette di ogni tipo tolte, contenuto intatto
        ("Disse: «Vattene, straniero.»", "Disse: Vattene, straniero."),
        # chiusura seguita da minuscola -> virgola (pausa); dopo ? ! nessuna virgola in più
        ("«Vattene, straniero» disse la guardia.", "Vattene, straniero, disse la guardia."),
        ("«Chi va là?» chiese l'oste.", "Chi va là? chiese l'oste."),
        ("«Fermi» urlò, «la strada è chiusa».", "Fermi, urlò, la strada è chiusa."),
        ("Lo chiamano \"il Corvo\" in città.", "Lo chiamano il Corvo, in città."),
        ("“Chi va là?” chiese la guardia.", "Chi va là? chiese la guardia."),
        ('Il cartello dice "Chiuso".', "Il cartello dice Chiuso."),
        # apostrofi tipografici -> apostrofo semplice (elisioni)
        ("L’oste versò dell’idromele.", "L'oste versò dell'idromele."),
        ("Un po´ di pane.", "Un po' di pane."),
        # trattini: lungo e staccato -> pausa; iniziale di dialogo tolto; trattino di parola intatto
        ("La porta — chiusa da anni — cigolò.", "La porta, chiusa da anni, cigolò."),
        ("Il vento – freddo – soffiava.", "Il vento, freddo, soffiava."),
        ("— Fermi tutti!", "Fermi tutti!"),
        ("Andate a nord-est - presto.", "Andate a nord-est, presto."),
        # ellissi e raffiche
        ("Forse… o forse no.", "Forse... o forse no."),
        ("Aspetta.....", "Aspetta..."),
        ("Cosa?!?", "Cosa?"),
        ("Fuori!!!", "Fuori!"),
        # markup e indicazioni di scena
        ("Il **drago** si *sveglia*.", "Il drago si sveglia."),
        ("[ride] Non ci credo.", "Non ci credo."),
        ("<b>Attenzione</b>, il ponte crolla.", "Attenzione, il ponte crolla."),
        ("Leggi [la mappa](http://x.y/z) con cura.", "Leggi la mappa con cura."),
        ("# Titolo\n- primo punto", "Titolo primo punto."),
        # emoji e simboli
        ("Che bello 🎲🐉!", "Che bello!"),
        ("Il 50% delle frecce & le spade.", "Il 50 per cento delle frecce e le spade."),
        # spazi e punto finale
        ("  Il   fuoco\nscoppietta ,  piano  ", "Il fuoco scoppietta, piano."),
        ("Benvenuti a Brunvalle", "Benvenuti a Brunvalle."),
        ("Ci vediamo domani,", "Ci vediamo domani."),
        ("Chi c'è?", "Chi c'è?"),
        # testo già pulito: invariato
        ("Ostilia versa due boccali di idromele a Benolfo e Kara.",
         "Ostilia versa due boccali di idromele a Benolfo e Kara."),
    ],
)
def test_normalizza(ingresso, atteso):
    assert normalizza(ingresso) == atteso


def test_nfc_compone_le_accentate():
    scomposto = unicodedata.normalize("NFD", "Perché è così.")
    assert scomposto != "Perché è così."
    assert normalizza(scomposto) == "Perché è così."


def test_caratteri_invisibili_tolti():
    assert normalizza("Spa​da e scu­do.") == "Spada e scudo."


@pytest.mark.parametrize("vuoto", ["", "   ", "🎲🐉", "***", "[ride]", "« »", "— ..."])
def test_niente_da_leggere(vuoto):
    assert normalizza(vuoto) == ""


def test_idempotente():
    testi = ["Disse: «Vattene» — e se ne andò…", "Il **drago** 🐉 dorme", "— Chi è?!"]
    for t in testi:
        una = normalizza(t)
        assert normalizza(una) == una
