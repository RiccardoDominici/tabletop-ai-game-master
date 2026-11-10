# Esempi a confronto

Tutto generato da report.py dai file in risultati/. Le colonne sono affiancate per il controllo a mano.

## 1. Selettore completo: Haiku contro Qwen3-4B, prompt breve (5 turni)

### Turno t01 (nozze-neve-caotico-B, scena_casera)

**Azioni**

- Nando (pg_nando): «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso»
- Remo (pg_remo): «adelina la scatolina vuota la peso a occhio, varra due fiorini»
- Gunda (pg_gunda): «ferma tutti, mani dove si vedono, io sorrido e basta»

**Haiku (riferimento)**

```text
[narratore] Nando, la fisarmonica esce dalla cinghia con un lamento, e tu la suoni prima ancora di chiedere la mezza paga.
[narratore] Gaspare si toglie la matita da dietro l'orecchio e annota qualcosa.
[usa] gas_dote > pg_nando
[narratore] Remo pesa la scatolina nel palmo, con l'aria di chi ha fatto i conti in fretta.
[narratore] Adelina lo guarda da sopra gli occhiali, e le chiavi alla cintura tintinnano.
[png_adelina] Due fiorini, dice. Una scatolina vuota pesa meno di niente, e quattro anni di forme valgono di più.
[narratore] Gunda si mette in mezzo alla riga di forme, con le mani aperte e un sorriso storto. Nessuno la spinge via.
[narratore] Vanda resta dov'è, con un mulo di pensiero nello sguardo.
[invito] pg_nando, pg_remo, pg_gunda
```

**Qwen3-4B, prompt breve**

```text
[narratore] Nando tira fuori la fisarmonica  
[usa] nar_polka > pg_nando  
[narratore] Remo pesa la scatolina vuota  
[usa] nar_scatolina > pg_remo  
[narratore] Gunda ferma tutti, sorride e basta  
[png_adelina] La scatolina è vuota, come dicevo  
[invito] pg_nando, pg_remo, pg_gunda
```

### Turno t07 (nozze-neve-caotico-B, scena_sasso)

**Azioni**

- Vanda (pg_vanda): «sessant'anni fa? custode, la neve era la stessa di oggi?»
- Remo (pg_remo): «gunda dillo piu piano, cosi ci scrivo sopra il contratto ahah»
- Gunda (pg_gunda): «ehi tutti, il custode ha un libro con roba di quei due, sessant'anni fa! ah ops»

**Haiku (riferimento)**

```text
[narratore] Vanda, annunci la domanda sulla neve di sessant'anni fa e la sala si gira verso il Custode.
[narratore] Il Libro del Sasso sul leggio apre la sua pagina più antica, e le righe di inchiostro sono sbiadite.
[usa] nar_libro_pagina > pg_vanda
[narratore] Remo, Gunda abbassa la voce, e tu cominci a scrivere sul dorso del contratto quello che senti.
[narratore] Gunda, il tuo grido ha già fatto girare cento teste verso il Sasso, e Adelina ti guarda con le chiavi in mano.
[png_adelina] Ah, la prima neve. Quella l'ho raccontata io, e la racconto ancora a chi ha la lingua lunga.
[narratore] Il sole è passato sul passo: nessuno ha messo l'anello alla sposa.
[usa] fin_tramonto
[usa] nar_chiusura
[invito] pg_vanda,pg_remo,pg_gunda,pg_nando
```

**Qwen3-4B, prompt breve**

```text
[narratore] Vanda chiede al Custode se la neve era uguale sessant'anni fa.  
[usa] nar_libro_pagina > pg_vanda  
[narratore] Remo chiede a Gunda di parlare più piano, come se scrivesse un contratto.  
[usa] nar_borsa_garzone > pg_remo  
[narratore] Gunda dice che il Custode ha un libro con roba dei due, da sessant'anni fa.  
[usa] nar_libro_spose > pg_gunda  
[invito] pg_vanda, pg_remo, pg_gunda
```

### Turno t13 (nozze-neve-caotico-B3, scena_casa_bonfanti)

**Azioni**

- Nando (pg_nando): «zio gaspare, pagami la mezza paga e ti canto la canzone del cassetto»
- Vanda (pg_vanda): «bastiano ti tiro un calcio di mula se mi menti ahah. ferma la mano!»
- Remo (pg_remo): «gaspare sei sicuro di non voler firmare il patto ora? ti presto la penna»

**Haiku (riferimento)**

```text
[narratore] Nando annuncia che chiede a Gaspare la mezza paga, e promette la canzone del cassetto.
[narratore] Vanda annuncia che minaccia Bastiano con un calcio di mula, e le sue mani restano ferme sul fianco.
[narratore] Remo annuncia che chiede a Gaspare se vuole firmare il patto ora, offrendo la sua penna.
[narratore] Gunda resta dov'è, in attesa, con lo scudo appoggiato al ginocchio.
[narratore] Vanda prova a far paura a Gaspare, ma il vecchio non si scompone e la guarda fissa da sopra gli occhiali.
[png_gaspare] Mi minacci nella mia cucina? Con rispetto parlando, questo non lo metto nei conti.
[narratore] Gaspare si siede di nuovo, e con la matita batte piano sul libro dei conti, senza rispondere a Nando.
[narratore] Remo protende la penna verso Gaspare, e il vecchio la guarda come si guarda un debito.
[png_gaspare] La penna la tengo io. E un patto si firma con calma, non stasera, magari.
[narratore] Dalla stalla, sotto la botola, arriva il campanaccio della Duchessa, fermo e pesante.
[narratore] Il corno del Custode suona lontano, il secondo segno dello zio: il tempo stringe.
[invito] pg_nando,pg_vanda,pg_remo,pg_gunda
```

**Qwen3-4B, prompt breve**

```text
[narratore] Nando chiede al zio di pagargli la mezza paga e dice che canta la canzone del cassetto.  
[usa] nar_scrittoio_cassetto > pg_nando  
[narratore] Vanda minaccia Bastiano di tirargli un calcio di mula se mente, poi ferma la mano.  
[narratore] Remo chiede a Gaspare se è sicuro di non voler firmare il patto ora, e gli offre la penna.  
[png_gaspare] Con rispetto, il patto non si firma prima del tramonto.  
[invito] pg_nando, pg_vanda, pg_remo
```

### Turno t19 (nozze-neve-indagine-B, scena_casa_bonfanti)

**Azioni**

- Ida (pg_ida): «adelina, il nonno Ettore e la lettera chiusa con la ceralacca: lei sa qualcosa di quella lettera?»
- Vanda (pg_vanda): «bastiano, lo zio ti accusa del furto. io non ci credo: cosa hai fatto tra le undici e mezzogiorno?»
- Livia (pg_livia): «agnese, la nonna ha l'anello al dito o nella tasca? me lo dici con la testa, sì o no»

**Haiku (riferimento)**

```text
[narratore] Ida annuncia: chiede ad Adelina della lettera chiusa con la ceralacca, e se lei sa qualcosa del nonno Ettore.
[narratore] Adelina alza gli occhi dalla scatolina e la fissa a lungo, senza rispondere subito.
[png_adelina] Quella lettera la scrisse mia sorella, tanti anni fa. Il sigillo lo conosco. Ma di Ettore non parlo, a voce alta.
[narratore] Vanda annuncia: chiede a Bastiano dove fosse tra le undici e mezzogiorno, e gli dice che non crede all'accusa.
[narratore] Bastiano stringe la cinghia del basto e guarda la porta della stalla come per cercare una via d'uscita.
[narratore] Livia annuncia: chiede ad Agnese se la nonna ha l'anello al dito o in tasca, e le chiede di rispondere con la testa.
[narratore] Agnese, dietro lo specchio, si volta piano verso la finestra. Non annuisce e non scuote la testa: stringe le mani sul grembo, e sul velluto della veste resta un'ombra di inchiostro.
[narratore] Dal Sasso arriva il quinto richiamo del corno, lungo e basso. Fuori la luce gialla si fa rossa sui tetti.
[usa] nar_sole_5
[narratore] Ida, Vanda, Livia: il tempo è quasi finito, e la sposa non ha ancora detto nulla. Cosa fate ora?
[invito] tutti
```

**Qwen3-4B, prompt breve**

```text
[narratore] Ida chiede a Adelina se sa qualcosa sulla lettera chiusa con la ceralacca.  
[usa] gas_chi_cera > pg_vanda  
[narratore] Livia chiede alla sposa se la nonna ha l'anello al dito o nella tasca.  
[usa] nar_sposa_mima > pg_livia  
[png_gaspare] Il cassetto non contiene nulla di strano, solo i conti.  
[invito] pg_ida, pg_livia, pg_vanda
```

### Turno t25 (nozze-neve-indagine-B3, scena_casa_bonfanti)

**Azioni**

- Ida (pg_ida): «adelina, il nonno Ettore e la lettera chiusa con la ceralacca: lei sa qualcosa di quella lettera?»
- Vanda (pg_vanda): «bastiano, lo zio ti accusa del furto. io non ci credo: cosa hai fatto tra le undici e mezzogiorno?»
- Livia (pg_livia): «agnese, la nonna ha l'anello al dito o nella tasca? me lo dici con la testa, sì o no»

**Haiku (riferimento)**

```text
[narratore] Ida chiede ad Adelina dell'anello e della lettera sigillata. La vecchia si ferma con le chiavi in mano e non risponde subito.
[png_adelina] Quella lettera non è mia da aprire. Il formaggio buono vuole tempo, e le lettere anche.
[narratore] Vanda chiede a Bastiano dove fosse tra le undici e mezzogiorno. Il garzone alza gli occhi dalla neve sporca di fango.
[narratore] Bastiano dice che era nella stalla dei Morlacchi, a ferrare un mulo. Il ferro ha ancora il chiodo sporco di grasso.
[narratore] Livia chiede ad Agnese se la nonna ha l'anello al dito o in tasca. La sposa non parla: fa un cenno lento, sì, senza guardare la sorella.
[usa] nar_sposa_mima
[invito] pg_ida,pg_vanda,pg_livia
```

**Qwen3-4B, prompt breve**

```text
[narratore] Ida chiede a Adelina se sa qualcosa della lettera chiusa con la ceralacca.  
[usa] gas_chi_cera > pg_vanda  
[narratore] Vanda chiede a Bastiano cosa abbia fatto tra le undici e mezzogiorno.  
[usa] nar_sposa_mima > pg_livia  
[narratore] Livia chiede alla sposa se la nonna ha l'anello al dito o nella tasca.  
[invito] pg_ida, pg_vanda, pg_livia
```

## 2. Annuncio: modello locale contro deterministico (10 azioni, Qwen3-4B)

| # | Turno | Azione del giocatore | Annuncio del modello locale | Deterministico |
|---:|---|---|---|---|
| 1 | t01 | Nando: «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso» | Nando tira fuori la fisarmonica e si balla. | Nando: «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso» |
| 2 | t01 | Remo: «adelina la scatolina vuota la peso a occhio, varra due fiorini» | Remo pesa a occhio la scatolina vuota e dice due fiorini. | Remo: «adelina la scatolina vuota la peso a occhio, varra due fiorini» |
| 3 | t01 | Gunda: «ferma tutti, mani dove si vedono, io sorrido e basta» | Gunda ferma tutti, mani dove si vedono, io sorrido e basta. | Gunda: «ferma tutti, mani dove si vedono, io sorrido e basta» |
| 4 | t02 | Remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah» | Remo dice che vanda scommetto un formaggio che il vento non c'entra niente, ahah. | Remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah» |
| 5 | t02 | Gunda: «ettore ha l'aria di uno che ha perso la scatola e la dignita, lo dico a voce alta» | Gunda dice a voce alta che Ettore ha l'aria di uno che ha perso la scatola e la dignità. | Gunda: «ettore ha l'aria di uno che ha perso la scatola e la dignita, lo dico a voce alta» |
| 6 | t02 | Nando: «suoniamo la marcia dei muli, Gigia balla anche lei» | Nando suona la marcia dei muli, Gigia balla anche lei. | Nando: «suoniamo la marcia dei muli, Gigia balla anche lei» |
| 7 | t03 | Remo: «gunda il pugno chiuso fammelo vedere, sono curioso ahah» | Remo gunda il pugno chiuso e glielo fa vedere. | Remo: «gunda il pugno chiuso fammelo vedere, sono curioso ahah» |
| 8 | t03 | Gunda: «ferma nando, la prendo io per il braccio, piano, tipo sacco di farina» | Gunda ferma Nando, la prende io per il braccio, piano, tipo sacco di farina. | Gunda: «ferma nando, la prendo io per il braccio, piano, tipo sacco di farina» |
| 9 | t03 | Nando: «treccia rossa! esci fuori, ti canto la canzone della treccia a squarciagola» | Nando trecca rossa! esci fuori, ti canto la canzone della treccia a squarciagola. | Nando: «treccia rossa! esci fuori, ti canto la canzone della treccia a squarciagola» |
| 10 | t04 | Nando: «le scale scricchiolano, faccio la scala musicale: do re mi scricchiolo» | Nando le scale scricchiolano, fa la scala musicale: do re mi scricchiolano. | Nando: «le scale scricchiolano, faccio la scala musicale: do re mi scricchiolo» |

## 3. Classificatore: scelta del modello contro Haiku (Qwen3-4B)

| # | Turno | Azione | Candidate | Haiku | Modello locale |
|---:|---|---|---|---|---|
| 1 | t01 | Nando: «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso» | nar_polka | gas_dote | nar_polka |
| 2 | t02 | Remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah» | (nessuna) | nar_scatolina | nessuna |
| 3 | t05 | Remo: «scommessa: chi apre per primo i cassetti del gaspare ha vinto. zio gaspare, io apro il tuo» | nar_scrittoio_cassetto | nar_scrittoio_cassetto | nar_scrittoio_cassetto |
| 4 | t05 | Vanda: «remo aspetta, li apro io, ho le mani piu grosse» | (nessuna) | gas_campanella | nessuna |
| 5 | t07 | Vanda: «sessant'anni fa? custode, la neve era la stessa di oggi?» | nar_custode_regole, nar_libro_pagina | nar_libro_pagina | nar_custode_regole |
| 6 | t09 | Nando: «ettore col bastone, canzone per te: il vecchio batte il legno, ta ta ta, ballate!» | nar_polka | nar_polka | nar_polka |
| 7 | t11 | Remo: «gaspare il contratto del prato alto lo firmi dopo il tramonto se le nozze saltano? la penna e mia» | gas_dote, nar_borsa_garzone | gas_dote | gas_dote |
| 8 | t12 | Gunda: «stalla! odore di fieno, mi nascondo sotto la mangiatoia e aspetto» | nar_stalla_entrata | nar_stalla_entrata | nar_stalla_entrata |

## 4. Scrittore Claude Code: haiku contro sonnet, stessi prompt

| # | PNG | Azione del giocatore | haiku (s) | sonnet (s) |
|---:|---|---|---|---|
| 1 | Adelina | «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso» | La fisarmonica tiratela pure, ma la mezza paga non si tocca: il formaggio buono vuole tempo. (8.3) | Sentì, Nando: la mezza paga si dà a festa finita. Intanto suona. Il formaggio buono vuole tempo. (4.3) |
| 2 | Adelina | «vanda scommetto un formaggio che il vento non c'entra niente, ahah» | Il formaggio buono vuole tempo, e tu scommetti in fretta. Il vento c'entra eccome. (6.5) | Ahah! Scommetti pure, ragazzo. Il vento non porta via gli anelli: le mani sì. (3.9) |
| 3 | Adelina | «gunda il pugno chiuso fammelo vedere, sono curioso ahah» | Curioso sei, tu. Il pugno resta chiuso: il formaggio buono vuole tempo. (7.2) | Il pugno chiuso lo apro io, caro, quando il latte è cagliato. Prima si siede e mangia. (3.9) |
| 4 | Gaspare Bonfanti | «le scale scricchiolano, faccio la scala musicale: do re mi scricchiolo» | Bella musica, davvero. Facciamo due conti: quanti scalini ha contato ciascuno di voi? (7.9) | Facciamo due conti: quella scala ha tredici gradini, e ne ho sentiti scricchiolare almeno quattro. Chi sale, per favore? (3.9) |
| 5 | Gaspare Bonfanti | «scommessa: chi apre per primo i cassetti del gaspare ha vinto. zio gaspare, io apro il tuo» | Facciamo due conti, con calma. Lei non ha vinto niente: i cassetti sono miei. (7.3) | Facciamo due conti: aprire il cassetto di un uomo senza permesso non è una vittoria, è un ammanco. Lo lasci stare, la prego. (4.2) |
