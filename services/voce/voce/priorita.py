"""Priorità del thread di generazione su macOS (classe QoS).

Su Apple Silicon lo scheduler usa la classe QoS del thread per scegliere tra
core di prestazione (P) e di efficienza (E). Il ciclo di Qwen3-TTS è molto
"Python + tanti piccoli kernel": con la macchina carica (browser, Docker), un
thread a QoS di default finisce spesso sugli E-core e il RTF peggiora.
USER_INTERACTIVE si può chiedere senza privilegi (non è `nice` negativo).
"""
from __future__ import annotations

import ctypes
import logging
import sys

log = logging.getLogger("voce.priorita")

# <sys/qos.h>
QOS_USER_INTERACTIVE = 0x21
QOS_USER_INITIATED = 0x19
QOS_DEFAULT = 0x15
QOS_UTILITY = 0x11

_NOMI = {"interattiva": QOS_USER_INTERACTIVE, "avviata": QOS_USER_INITIATED, "default": QOS_DEFAULT,
         "utility": QOS_UTILITY}


def imposta_qos_thread(nome: str = "interattiva") -> bool:
    """Imposta la classe QoS del thread CORRENTE. True se riuscito (solo macOS)."""
    if sys.platform != "darwin":
        return False
    classe = _NOMI[nome]
    try:
        libc = ctypes.CDLL("/usr/lib/libSystem.B.dylib")
        esito = libc.pthread_set_qos_class_self_np(ctypes.c_uint(classe), ctypes.c_int(0))
    except (OSError, AttributeError) as e:
        log.warning("QoS non impostata: %s", e)
        return False
    if esito != 0:
        log.warning("pthread_set_qos_class_self_np(%s) ha restituito %d", nome, esito)
        return False
    return True
