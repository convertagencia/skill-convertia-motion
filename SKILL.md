---
name: convertia-motion
description: Cria vídeos em motion design com áudio, 100% em código (HTML renderizado quadro a quadro, sem After Effects, Remotion ou modelo de vídeo), pra qualquer cliente ou nicho. Três modos: institucional/lançamento, demo de produto (UI reconstruída a partir de prints) e criativo de anúncio (Meta Ads, TikTok Ads, Google/YouTube) com 9:16, 4:5, 1:1 e variações A/B. Cada vídeo tem conceito próprio; o que se repete é a técnica e o acabamento (springs, câmera contínua, transições sem corte, motion blur real, trilha sincronizada no pico, -14 LUFS). Use quando pedirem "motion", "motion design", "vídeo animado", "reel animado", "vídeo de lançamento", "vídeo institucional", "criativo em vídeo", "anúncio em vídeo", "vídeo pro Meta Ads/TikTok", "demo do sistema em vídeo", "vídeo do produto", "refazer a trilha do vídeo" ou /convertia-motion.
---

# convertia-motion

Vídeo em motion design com áudio, feito como programa: um `film.html` em que **cada quadro é função pura do tempo** (`window.seek(t)`), renderizado quadro a quadro pelo Chromium e montado no ffmpeg. Mesmo input, mesmo quadro, sempre. Uma correção é uma edição de poucas linhas e um re-render dos segundos afetados.

`<skill>` abaixo = a pasta desta skill (o "Base directory" mostrado ao carregar). Todos os comandos rodam com `node "<skill>/scripts/..."`.

**O prompt é 10% do vídeo. Os outros 90% são este protocolo.** Não pular etapa.

## 0. Antes de tudo

- Rodar `node "<skill>/scripts/doctor.mjs"`. Se faltar algo: `bash "<skill>/setup.sh"` (só precisa de Node 18+).
- Pasta do filme: seguir as regras de pasta do `CLAUDE.md` do projeto. Na falta de regra: `saidas/motion/<cliente-ou-tema>-<AAAA-MM-DD>/`. Criar com `node "<skill>/scripts/new.mjs" <pasta>` (copia `film.html`, `engine.js`, `score.json`, `ROTEIRO.md`).
- Esforço: alto pra filme novo, médio pra ajuste pontual.

## 1. Entradas (preencher `ROTEIRO.md` §1)

Ler o que já existe no projeto antes de perguntar: `_memoria/`, `identidade/design-guide.md`, pasta do cliente, logos (SVG de preferência), prints do produto. Perguntar só o que faltar, com AskUserQuestion e opção recomendada primeiro:

- **Modo**: institucional, demo de produto ou anúncio (ver `references/modos.md`). Muda roteiro, duração e formato.
- **Cliente**: o que vende, pra quem, qual o **momento-chave** (o instante em que o cliente do cliente sente o valor).
- **Identidade**: logo oficial, cores (hex), fontes (arquivos locais em `fonts/`), tom de voz. Nunca inventar identidade.
- **Formatos e duração**; **CTA** e **segmento** (no anúncio); **material real** (prints, números verdadeiros); **referência de estilo** se houver.

## 2. Conceito: três ideias antes de qualquer roteiro

Um conceito é uma frase sobre a **imagem**, não sobre o produto. Propor **três que diferem na ideia central** (não três histórias com os mesmos cards). Para cada um: o quadro do gancho, o que carrega entre as cenas, o que ele descarta, o visual. A metáfora vem do mundo daquele cliente (numa clínica, numa barbearia ou num escritório de advocacia, cada uma é outra coisa). O usuário escolhe.

Ideias de eixo: um elemento que se transforma em tudo; um movimento de câmera atravessando escalas; antes/depois; reação em cadeia (cada beat causa o próximo); metáfora física do nicho; sistema tipográfico.

**Nunca** reaproveitar o roteiro, a abertura ou o visual do filme anterior. O esqueleto do `film.html` é contrato técnico, não história.

## 3. Roteiro e beat map (`ROTEIRO.md` §3 e §4)

- Tabela: `t · beat · o que se move · o que fica parado · o que carrega pro próximo · som`.
- **Ritmo**: durações de plano variadas (≥ 4x entre o mais curto e o mais longo), pelo menos uma pausa real, algo novo a cada 2 a 4 s, nada parado mais de ~1 s sem intenção.
- **Carry**: em toda fronteira de cena, algo visível sobrevive e se transforma no próximo (card que cresce e vira a tela, linha que vira a grade, campo que abre e vira o app, flood que sai de um objeto e contrai no próximo). Troca seca só em rajada de impactos ou no fecho.
- **Música**: escolher a faixa (ver `references/som.md`), medir BPM e drop com `analyze-song.mjs`, e pôr o **drop no momento visual-chave**. Cenas começam no beat.
- Textos por variante (A/B...) já no roteiro. Checar: sem travessão, só promessa que o cliente cumpre, dado ilustrativo rotulado como exemplo, regras do segmento.
- **Mostrar o roteiro pro usuário e esperar OK antes de codar.**

## 4. Construir o `film.html`

Regras do motor (detalhe e receitas em `references/tecnica.md`):

- Tudo calculado a partir de `t` dentro de `seek(t)`. **Proibido**: CSS transition/animation rodando sozinha, `setTimeout`, estado entre quadros, `Math.random` (usar `M.rng(seed)`).
- Movimento com **springs** (`M.S`, `M.step`, presets `snappy/base/heavy/playful`) e easings de `M.E`. Movimento linear = barato, nunca.
- **Câmera** em `#world` com `M.camera` (zoom em escala log), `M.hand` (flutuação de operador), `M.punch` (soco no beat). Não fazer zoom in e out colados.
- Texto com `M.rise` (palavra por palavra, mascarado), `M.type` (digitação), `M.count` (contador).
- Transições com `M.box`/`M.mixRect`/`M.fullRect` (caixa vira caixa) e `M.floodR` (círculo que cobre o quadro inteiro).
- **Formatos**: layout derivado de `M.W`, `M.H` e `M.SAFE` (áreas seguras), com `M.byFmt({...})` pra ajustes. Recompor por formato, nunca só cortar.
- **Variantes**: textos em `M.pick({A: {...}, B: {...}})`.
- **Sons**: lista `EVENTS = [[t, nome, ganho, pan], ...]` no próprio filme, no mesmo tempo da animação que causa o som.
- Identidade do cliente em tokens CSS (`--bg`, `--ink`, `--accent`, `--display`...). Logo embutido a partir do SVG oficial quando for animar partes dele.
- **UI de produto (modo demo)**: reconstruir as telas em HTML a partir dos prints, com cores medidas por pixel, e animar elemento por elemento. Nunca colar o print parado e nunca inventar tela que o produto não tem.
- Prévia no navegador: `film.html?play`, `film.html?t=6.4`, `&fmt=4x5`, `&v=B`.

## 5. Stills antes do render

```
node "<skill>/scripts/render.mjs" stills <pasta>/film.html --times 0.4,1.8,3.2,5.5 [--fmt 9x16] [--v A]
node "<skill>/scripts/render.mjs" beats  <pasta>/film.html --bpm 120 --offset 0
```

**Abrir a folha (`out/stills-.../sheet.png`) com Read e olhar de verdade.** Corrigir no still é 2 minutos; achar no render completo é um re-render. Stills de todos os formatos pedidos. Mostrar pro usuário os stills-chave antes do render final.

## 6. Render

```
node "<skill>/scripts/render.mjs" draft <pasta>/film.html [--fmt] [--v]     # 30 fps, sem blur, meia resolução: ritmo
node "<skill>/scripts/render.mjs" full  <pasta>/film.html [--fmt] [--v]     # 60 fps, 8 subquadros (motion blur), 1080p
    [--sub 8] [--shutter 0.5] [--workers 6] [--from 4 --to 7] [--out arquivo.mp4]
```

Motion blur = 8 capturas por quadro dentro de um obturador de 180°, média em luz linear. 4 subquadros deixa fantasma em movimento rápido. Quadros parados pulam as capturas do meio. Referência de tempo: ~40 s de render pra 5 s de filme com 6 workers. Render longo: rodar em background e avisar a estimativa.

## 7. Trilha

```
node "<skill>/scripts/mixkit.mjs" music <termo>        # buscar faixa (ver licença em references/som.md)
node "<skill>/scripts/mixkit.mjs" get music <id> <pasta>/music
node "<skill>/scripts/analyze-song.mjs" <faixa.mp3> [--near 31.9]
node "<skill>/scripts/render.mjs" events <pasta>/film.html    # exporta os EVENTS do filme
node "<skill>/scripts/audio.mjs" <pasta>/score.json           # mixa, sala, -14 LUFS, CREDITOS.txt
node "<skill>/scripts/render.mjs" mux <video.mp4> <pasta>/out/audio.wav
```

Cada efeito é posicionado pelo **pico** do som, não pelo início. Todos passam pela mesma sala. Menos eventos que beats: som em todo evento soa barato. Música sempre de banco livre pra uso comercial (fonte e licença no `score.json` e no `CREDITOS.txt`) ou sintetizada; música enviada pelo cliente só com licença confirmada. Detalhes em `references/som.md`.

## 8. Conferência e crítica (até tudo 8+)

```
node "<skill>/scripts/check.mjs" video  <final.mp4>             # pulos, cortes, pausas, ritmo, loudness
node "<skill>/scripts/check.mjs" sheets <final.mp4> --at 2.7,8.1   # visão geral, celular (360 px), tiras de 12 quadros
```

Abrir as folhas com Read e ser **diretor exigente, não autor orgulhoso**. Nota de 1 a 10 em: gancho nos 2 s iniciais · legibilidade em 360 px · qualidade do movimento · variedade · composição · marca e dados corretos · sincronia do som. Listar os 3 piores problemas com tempo, corrigir, re-renderizar só os segundos afetados (`--from/--to` + juntar, ou tudo se for curto), repetir **até toda nota ≥ 8**. Roteiro de caça em `references/critica.md`. Registrar as rodadas no `ROTEIRO.md` §6.

## 9. Entrega

- Arquivos finais com nome claro: `<cliente>-<modo>-<formato>-<variante>.mp4` na pasta do filme.
- Checklist: ☐ stills aprovados ☐ 0 pulo sem explicação ☐ drop no momento-chave ☐ -14 LUFS e pico ≤ -1 dBTP ☐ rótulo "exemplo" em dado ilustrativo ☐ sem travessão ☐ regras do segmento ☐ áreas seguras (anúncio) ☐ CREDITOS.txt ☐ legenda do post verdadeira.
- Dar o caminho dos arquivos e abrir a pasta (`open <pasta>/out`).
- Se o filme ensinou algo novo (erro, técnica, preferência do usuário), propor adicionar em `references/`.

## Regras que não quebram

- **Cada vídeo é único.** Conceito novo por cliente e por pedido; o que se repete é técnica e acabamento.
- **Identidade é sempre a do cliente** em questão, com logo oficial. Nunca misturar marcas (ex: filme de um cliente não leva marca da ConvertIA, salvo pedido).
- **Nada inventado na tela**: só recurso que o produto tem, números reais ou rotulados como exemplo.
- **Legenda verdadeira**: nada de "feito em 10 minutos" se não foi.
- **Sem travessão** em nenhum texto do vídeo ou da legenda.
- **Regras de publicidade do segmento** (OAB, saúde/estética, finanças) e políticas de Meta, Google e TikTok. Na dúvida, sinalizar pro usuário.
- **Determinismo**: renderizar o mesmo segundo duas vezes dá o mesmo quadro.

## Arquivos

| caminho | o que é |
|---|---|
| `lib/engine.js` | motor (`window.M`): easings, springs, câmera, texto, caixas, formatos, variantes, `boot` |
| `templates/film.html` | esqueleto do filme (contrato, não roteiro) |
| `templates/score.json` | modelo de trilha |
| `templates/ROTEIRO.md` | entradas, conceitos, beat map, textos, crítica |
| `scripts/new.mjs` | cria a pasta de um filme |
| `scripts/render.mjs` | `stills`, `beats`, `draft`, `full`, `events`, `mux` |
| `scripts/audio.mjs` | mixer: música pelo drop, efeitos pelo pico, sala, ducking, loudnorm, créditos |
| `scripts/analyze-song.mjs` | BPM, energia, drop pelo grave |
| `scripts/mixkit.mjs` | busca e baixa música e efeitos gratuitos |
| `scripts/check.mjs` | relatório do vídeo e folhas de quadros |
| `scripts/doctor.mjs` | confere a instalação |
| `references/modos.md` | institucional, demo de produto, anúncio (formatos, áreas seguras, A/B, segmentos) |
| `references/tecnica.md` | receitas do motor, câmera, carry, presets, armadilhas |
| `references/som.md` | música, efeitos sintetizados, licenças, mixagem |
| `references/critica.md` | loop de crítica e o que caçar nos quadros |
| `references/casos.md` | filmes já feitos e o que cada um ensinou |
