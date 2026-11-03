Sovrapposizione al mini (`../mini`) per i test di STATO e CONTINUITÀ: il mini giocato una volta, con il
registro della sessione 1 nella forma che scrive il server (apps/server/src/sessione/registro.ts:
registro.yaml + trascrizione.yaml), lo stato dopo la sessione 1 e il pacchetto della sessione 2.
I test copiano il mini e ci mettono sopra questi file.
