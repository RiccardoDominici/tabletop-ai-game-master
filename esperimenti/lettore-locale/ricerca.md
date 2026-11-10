# Lettore locale: ricerca sui modelli e sul prompt cache

Data: 9 novembre 2026. Scopo: scegliere due o tre modelli piccoli su MLX da confrontare con Haiku 5.5 come lettore del
modo B (repertorio), dove il modello «stupido» legge e sceglie battute pre-scritte e l'intelligenza sta nel contesto
preparato da Claude Code.

## 1. Candidati verificati su Hugging Face

I repo sono stati controllati con `huggingface_hub` (esistenza e dimensione dei file `.safetensors`). Il peso è quello
su disco; a questo va sommata la cache KV del prefisso (circa 150 KB per token per un 4B, cioè circa 2 GB con i circa
15 000 token del contesto di una scena di nozze-neve).

| Repo (mlx-community) | Peso su disco | Note |
|---|---:|---|
| `Qwen3-4B-Instruct-2507-4bit` | 2,26 GB | Versione 2507, solo risposte (non ragionamento). Scelto come primo candidato. |
| `Qwen3.5-4B-4bit` | 3,03 GB | Serie più recente. Architettura ibrida: vedi §3, il prompt cache può non funzionare. |
| `gemma-3-4b-it-qat-4bit` | 3,00 GB | Gemma 3 4B quantizzata in QAT: di solito più stabile sulle lingue non inglesi. |
| `Qwen3-8B-4bit` | 4,61 GB | Più grande: fa da riferimento sulla qualità se il 4B non regge. |
| `Qwen3.5-9B-4bit` | 5,95 GB | Escluso: su 16 GB con il contesto di 15k token non entra con margine. |
| `gemma-4-e4b-it-4bit` | 5,15 GB | Escluso per dimensione; la guida del 2026 lo consiglia per 16 GB, ma non è stato provato. |
| `Llama-3.2-3B-Instruct-4bit` | 1,81 GB | Escluso: più debole in italiano dei candidati Qwen e Gemma. |
| `Qwen3.5-2B-4bit` | 1,72 GB | Escluso: troppo piccolo per seguire un protocollo con 69 battute nel catalogo. |

Le indicazioni delle guide 2026 per 16 GB (Codersera, WillItRunAI, Rapid-MLX) convergono su Qwen3.5 4B/9B e Gemma 4
come scelte di punta; le guide sono di tipo SEO e non concordano sui numeri, quindi i repo e le dimensioni sopra sono
quelli verificati, non quelli citati.

Fonti: [Qwen3-4B-Instruct-2507 4bit su mlx-community](https://huggingface.co/mlx-community/Qwen3-4B-Instruct-2507-4bit),
[Apple Silicon LLMs 2026](https://codersera.com/blog/apple-silicon-llms-complete-guide-2026/),
[Best LLM for Mac 2026](https://willitrunai.com/blog/best-llm-for-mac-apple-silicon-2026),
[Rapid-MLX](https://github.com/raullenchai/Rapid-MLX).

**Lingua italiana.** Non ho trovato benchmark pubblici in italiano per questi repo MLX. Il test di qualità è quindi
fatto sul set reale (30 turni di nozze-neve), non su dati generici.

## 2. Prompt cache del prefisso fisso (mlx-lm)

Il prompt del selettore è fatto così: sistema (prompt del selettore più contesto della scena, circa 15 000 token)
fisso per tutta la scena, più messaggio del turno variabile. Va elaborato una sola volta per scena.

API verificate nell'installazione `mlx-lm 0.31.3` (`services/lettore/.venv`):

- `mlx_lm.models.cache.make_prompt_cache(model)`: crea la cache vuota, una per livello del modello.
- `mlx_lm.generate.stream_generate(model, tok, prompt=<lista di id>, max_tokens, sampler, prompt_cache=cache)`: passando
  solo il suffisso e la cache già piena del prefisso, il modello elabora solo il suffisso.
- `can_trim_prompt_cache(cache)` e `trim_prompt_cache(cache, n)`: riportano la cache alla lunghezza del prefisso dopo
  ogni turno. Il misuratore fa così quando la cache si può trimmare; se no, copia il prefisso con `copy.deepcopy`.
- `mlx_lm.models.cache.LRUPromptCache`: cache per più richieste, usata dal server di mlx-lm. Non serve qui, perché il
  set è una sola sequenza per scena.

Il prefisso va separato con cura. Il misuratore renderizza il prompt con il template del modello, cerca il messaggio
del turno dentro il testo, prende come prefisso tutto ciò che precede, e verifica che i token del prefisso siano
l'inizio dei token del prompt intero. Se non lo sono, si ferma: un prefisso spezzato in un punto sbagliato
darebbe risposte diverse senza che nessuno se ne accorga.

Fonti: [Apple WWDC25, MLX](https://developer.apple.com/videos/play/wwdc2025/298/),
[mlx-lm: prefix cache sui modelli ibridi](https://github.com/ml-explore/mlx-lm/issues/980).

## 3. Limite noto: i modelli ibridi

Su mlx-lm, `can_trim_prompt_cache()` ritorna falso per i modelli con livelli a finestra scorrevole o SSM (Mamba,
linear attention). Il riuso del prefisso con trim allora non funziona e la cache non viene riusata. È quello che
segnala la [issue 980 di mlx-lm](https://github.com/ml-explore/mlx-lm/issues/980); una segnalazione per LocalAI descrive
lo stesso problema con Qwen3.5 e Qwen3.6 ([LocalAI #12451](https://github.com/mudler/LocalAI/issues/12451)).

Conseguenza per la misura: per `Qwen3.5-4B` il misuratore copia il prefisso (`deepcopy`) ogni turno invece di
trimmarlo. La copia costa tempo e RAM, e va riportata come tale nei risultati. Un TTFT alto su quel modello non è
colpa del modello ma del fatto che il riuso non è possibile.

## 4. Piano di misura (in breve)

- Un modello alla volta, scaricato con `snapshot_download`, eliminato dalla cache HF (solo i suoi repo
  `models--mlx-community--<nome>`) prima del successivo se lo spazio non basta.
- Controllo `pgrep -f mflux` prima di ogni misura: la GPU occupata da una generazione di immagini falsa i tempi.
- Set: 30 turni del selettore (`dati/set.jsonl`), costruito con le funzioni reali del server.
- Metriche: TTFT, token/s, RAM, validità del protocollo, annunci, accordo con Haiku (esatto e Jaccard), righe in
  lingua sbagliata o rotte. Tutte in `misura.py`, output in `risultati.md`.
