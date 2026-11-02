# Ricerca: generare le immagini in locale (M1, 16 GB)

Raccolta il 2 novembre 2026 da un agente di ricerca (solo lettura). Vincoli: Mac M1 con 16 GB, circa 19 GB di disco
libero, API a pagamento in pausa. Immagini generate prima della sessione (luoghi e ritratti), stile pittorico
coerente per campagna, volti dei PNG uguali tra un'immagine e l'altra. [OPENED] = pagina letta; [SNIPPET] = no.

## Conclusione dell'agente
Sui numeri verificati, l'unica soluzione che rientra nei vincoli è **mflux con FLUX.2 klein 4B**. La coerenza dei volti
deve venire dalla modifica con immagini di riferimento, non da un LoRA addestrato (mflux-lora richiede 32 GB).
Nessuna fonte ha tempi su M1 base, né prove di stile pittorico fantasy: i tempi sotto sono di M1 Max o chip più nuovi.

## Candidati
- **FLUX.2 klein 4B (distillato)**: base Apache 2.0, uso commerciale ammesso. [OPENED](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)
  La scheda descrive la modifica con più riferimenti, senza dire quanti.
  - Disco: versione mflux a 4 bit 4,61 GB [OPENED](https://huggingface.co/ar9av/FLUX.2-klein-4B-mflux-4bit); q8 circa 8,6 GB [OPENED](https://pypi.org/project/mflux-lora/).
  - Velocità su M1 Max 64 GB, mflux 0.17.5, 4 passi: 1024² in 31–41,5 s; 512² circa 12 s. [OPENED](https://lilting.ch/en/articles/flux2-klein-4b-mflux-iris-m1-max)
- **Z-Image Turbo (6B, 9 passi)**: licenza contraddittoria tra scheda (Apache-2.0) e versione mflux (Tongyi Qianwen);
  niente riferimenti (il modello Edit «To be released»); q8 circa 10 GB. [OPENED](https://github.com/Tongyi-MAI/Z-Image)
- **Qwen-Image (20B)**: Apache 2.0 ma 16 GB a 6 bit: troppo grande. [OPENED](https://wiki.drawthings.ai/wiki/Qwen_Image)
- **Qwen-Image-2.1 (7B)**: fino a 10 riferimenti, ma licenza di ricerca non commerciale. [OPENED](https://huggingface.co/Qwen/Qwen-Image-2.1)
- **FLUX 3 Image Klein (15/10/2026)**: supportato da mflux, fino a 10 riferimenti, ma richiede un «prompt upsampler»
  da 18,8 GB e la licenza limita l'uso commerciale. Da tenere d'occhio. [OPENED](https://huggingface.co/black-forest-labs/flux-3-image-klein)
- **Kontext, PuLID, IP-Adapter XLabs**: tutti legati ai termini non commerciali di FLUX.1-dev. [OPENED](https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev)
- **DiffusionKit**: archiviato (21/3/2026). [OPENED](https://github.com/argmaxinc/DiffusionKit) · **diffusers su MPS per FLUX.2**: «instabile». [OPENED](https://lilting.ch/en/articles/flux2-klein-apple-silicon)

## LoRA di identità su Mac
- mflux-lora: minimo 32 GB. [OPENED](https://pypi.org/project/mflux-lora/) Non fattibile.
- Draw Things: addestramento LoRA per FLUX.2 klein dal 10/4/2026, «di solito 16–32 GB»; su 16 GB non provato, solo interfaccia grafica. [OPENED](https://drawthings.ai/downloads/)

## Raccomandazione
1. **mflux + FLUX.2 klein 4B, 4 bit**: `uv tool install --upgrade mflux`, poi
   `mflux-generate-flux2 --model flux2-klein-4b --model-path ar9av/FLUX.2-klein-4B-mflux-4bit --prompt "..." --steps 4`.
   Il parametro per i riferimenti è da verificare con `--help`. Rischi: niente LoRA su 16 GB; volti coerenti solo con
   immagini di riferimento e semi fissi; M1 base sarà più lento dei numeri sopra.
2. **Se i volti si allontanano troppo**: Draw Things con LoRA di identità (non provato su 16 GB).
