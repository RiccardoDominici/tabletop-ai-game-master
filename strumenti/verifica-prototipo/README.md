# Controlli prototipo della campagna

Script scritti dall'agente della scena per verificare `campagne/prova-f0` contro il manuale del master
(§3 schede PNG, §4 scena, C2–C8, N1/N5/N11) e il repertorio (schema, riferimenti, copertura, segnali,
parole segrete). Sono la base del validatore di F1 (E1), che li sostituirà dentro il Motore.

```
services/voce/.venv/bin/python strumenti/verifica-prototipo/controlli.py campagne/prova-f0
services/voce/.venv/bin/python strumenti/verifica-prototipo/controlli_repertorio.py campagne/prova-f0
```

Servono Python 3 e PyYAML (il venv del servizio voce li ha). Uscita 0 = nessun errore.
