# Research: generating images locally (M1, 16 GB)

Collected on 2 November 2026 by a research agent (read-only). Constraints: Mac M1 with 16 GB, about 19 GB of free disk,
paid APIs paused. Images generated before the session (places and portraits), a painterly style consistent within each
campaign, NPC faces identical from one image to the next. [OPENED] = page read; [SNIPPET] = no.

## Agent conclusion
On the verified numbers, the only solution that fits the constraints is **mflux with FLUX.2 klein 4B**. Face consistency
must come from editing with reference images, not from a trained LoRA (mflux-lora requires 32 GB).
No source has timings on a base M1, nor tests of fantasy painterly style: the timings below are from M1 Max or newer chips.

## Candidates
- **FLUX.2 klein 4B (distilled)**: Apache 2.0 base, commercial use allowed. [OPENED](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B)
  The model card describes editing with multiple references, without saying how many.
  - Disk: 4-bit mflux version 4.61 GB [OPENED](https://huggingface.co/ar9av/FLUX.2-klein-4B-mflux-4bit); q8 about 8.6 GB [OPENED](https://pypi.org/project/mflux-lora/).
  - Speed on M1 Max 64 GB, mflux 0.17.5, 4 steps: 1024² in 31–41.5 s; 512² about 12 s. [OPENED](https://lilting.ch/en/articles/flux2-klein-4b-mflux-iris-m1-max)
- **Z-Image Turbo (6B, 9 steps)**: licence contradictory between the model card (Apache-2.0) and the mflux version (Tongyi Qianwen);
  no references (the Edit model is "To be released"); q8 about 10 GB. [OPENED](https://github.com/Tongyi-MAI/Z-Image)
- **Qwen-Image (20B)**: Apache 2.0 but 16 GB at 6 bit: too large. [OPENED](https://wiki.drawthings.ai/wiki/Qwen_Image)
- **Qwen-Image-2.1 (7B)**: up to 10 references, but a non-commercial research license. [OPENED](https://huggingface.co/Qwen/Qwen-Image-2.1)
- **FLUX 3 Image Klein (15/10/2026)**: supported by mflux, up to 10 references, but it requires a «prompt upsampler»
  of 18.8 GB, and the license limits commercial use. Worth keeping an eye on. [OPENED](https://huggingface.co/black-forest-labs/flux-3-image-klein)
- **Kontext, PuLID, IP-Adapter XLabs**: all tied to the non-commercial terms of FLUX.1-dev. [OPENED](https://huggingface.co/black-forest-labs/FLUX.1-Kontext-dev)
- **DiffusionKit**: archived (21/3/2026). [OPENED](https://github.com/argmaxinc/DiffusionKit) · **diffusers on MPS for FLUX.2**: "unstable". [OPENED](https://lilting.ch/en/articles/flux2-klein-apple-silicon)

## Identity LoRA on Mac
- mflux-lora: minimum 32 GB. [OPENED](https://pypi.org/project/mflux-lora/) Not feasible.
- Draw Things: LoRA training for FLUX.2 klein since 10/4/2026, "usually 16–32 GB"; on 16 GB not tested, GUI only. [OPENED](https://drawthings.ai/downloads/)

## Recommendation
1. **mflux + FLUX.2 klein 4B, 4 bit**: `uv tool install --upgrade mflux`, then
   `mflux-generate-flux2 --model flux2-klein-4b --model-path ar9av/FLUX.2-klein-4B-mflux-4bit --prompt "..." --steps 4`.
   The parameter for references is to be verified with `--help`. Risks: no LoRA on 16 GB; faces consistent only with
   reference images and fixed seeds; a base M1 will be slower than the numbers above.
2. **If the faces drift too far**: Draw Things with an identity LoRA (not tested on 16 GB).
