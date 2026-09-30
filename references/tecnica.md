# Técnica

## O contrato

- `film.html` + `engine.js` na mesma pasta. O filme chama `M.boot(seek, { duration, events, prepare })`.
- `seek(t)` define **todo** estilo visível a partir de `t`. Nada de CSS transition/animation automática, `setTimeout`, `requestAnimationFrame` no caminho do render, estado acumulado, `Math.random`.
- Constantes e elementos criados antes do primeiro `seek`. Trabalho pesado (pré-cálculo, textos quebrados em palavras, simulação) vai em `prepare` ou no topo do script, calculado uma vez.
- `window.ready` só depois de fontes e imagens carregadas (o `boot` cuida disso). Fontes em arquivo local (`fonts/*.woff2` com `@font-face`), não Google Fonts por link: o render tem que ser igual offline.
- Uma camada por intenção: `#world` (o que a câmera filma) e `#hud` (o que fica fixo na tela: CTA, vinheta, grão, legenda). `z-index` explícito quando houver sobreposição.
- Filho de elemento escondido: `visibility: inherit`, nunca `visible` (senão aparece mesmo com o pai escondido). `M.show`/`M.set({show})` já usam `inherit`.

## Movimento

- **Springs** (`M.step(tau, preset)`, `M.S(t, base, [[t0, alvo], ...], preset)`): dão massa (acelera, passa um pouco, assenta). Presets: `snappy` (UI, chips, botões), `base` (containers, câmera), `heavy` (tipografia grande, logo), `playful` (overshoot visível, elemento com personalidade). Bordas de um indicador que estica: frente e trás em springs diferentes.
- **Easings** (`M.E`): `expoOut` pra chegada rápida que assenta, `expoInOut` pra "chicote" entre dois pontos, `inOut` pra movimento neutro, `sineInOut` pra câmera seguindo. `M.P(t, t0, dur, ease)` dá o progresso 0→1 já com easing e retorna 0 e 1 exatos nas pontas (evita elemento "aparecendo" 2 s antes por arredondamento).
- **Linear é proibido** exceto em rotação contínua ou esteira.
- **Nada parado mais de ~1 s** sem ser uma pausa planejada. Pausa planejada é o que faz o momento forte bater.
- Elemento pequeno, fundo grande: quadro com respiro lê melhor do que quadro cheio.

## Câmera

- `M.camera(t, [[t, zoom, x, y, ease?], ...])`: (x, y) é o ponto do mundo no centro do quadro. Zoom interpolado em log (zoom 1→4 parece uniforme).
- Seguir um objeto: chave ~0,1 s à frente dele com `sineInOut`. Chicote pra um ponto: chave no ponto de chegada antes do movimento, com `expoInOut`.
- `M.hand(t, amp)`: flutuação lenta de operador; zerar nas pausas. `M.punch(t, [beats], amt)`: soco de ~1,2% por beat, ~3% por compasso depois do drop, com decaimento.
- Nunca zoom in e zoom out colados. Nunca perder o sujeito do quadro num chicote (conferir nos stills).

## Carry: transições sem corte

Em toda fronteira de cena, algo visível sobrevive e vira a próxima:

- **Caixa que vira caixa**: `M.box(el, M.mixRect(de, para, u))` (card cresce até a tela, botão vira página, janela vira celular). Texto que troca dentro de uma forma que se transforma ganha máscara própria.
- **Flood**: círculo nasce de um objeto, cobre o quadro inteiro (`M.floodR(cx, cy)` garante que chega no canto mais distante) em ~0,3 s e depois contrai no próximo objeto.
- **Mergulho**: a câmera empurra pra dentro de um elemento até ele ser a cena.
- **Elemento compartilhado**: a bolha leva as palavras pro próximo quadro; o cursor que clica é o mesmo que arrasta.
- **Linha que dispara** e vira grade, borda, sublinhado ou gráfico.
- **Íris**: a próxima cena abre de dentro do sujeito.

Corte seco só em rajada de impactos rítmicos (várias palavras batendo no beat) ou no fecho. Cenas que se substituem com `display:none` são slides, por melhor que seja o ritmo.

## Texto

- `M.rise(el, t, { at, out, stagger, dur })`: palavras sobem mascaradas (105% → 0) com leve rotação, uma a uma (55 ms). `out` faz a saída pra cima.
- `M.type(el, texto, t, t0, cps, caret)` + `M.typeTimes(texto, t0, cps)` pra gerar os eventos de tecla no mesmo ritmo.
- `M.count(t, t0, dur, de, até)` pra contadores (formatar com `toLocaleString('pt-BR')`).
- Texto que precisa ficar nítido numa transição: nunca escalar uma cópia borrada; trocar só o preenchimento.
- Medir texto com canvas (`measureText`), não com `getBoundingClientRect`, quando a câmera está com escala.
- Todo título numa linha em 16:9; em 9:16, no máximo 3 linhas curtas.
- Troca de títulos no mesmo lugar: a saída de `M.rise` dura ~0,34 s + 0,03 s por palavra. O próximo título só entra depois disso (título de 6 palavras: `out` ≥ 0,5 s antes do `at` do próximo), senão os dois se sobrepõem.
- Elementos que viajam até posições novas (encaixe numa linha, grade): atribuir os destinos de forma que os caminhos não se cruzem, e disparar na ordem em que o gatilho passa (ex: a ponta da linha).
- Legibilidade mínima em celular: corpo ≥ 44 px no quadro de 1080 de largura, títulos ≥ 90 px.

## Imagens, logos e vídeo

- Logo: SVG oficial embutido no HTML quando for animar partes (símbolo, letras, tagline separados). Revelar a marca a partir de uma linha: achatar o logo real verticalmente (`scaleY 0.014 → 1`) com a linha sólida por cima nos primeiros 12%; nunca fazer crossfade de um desenho aproximado pro logo (fica um fantasma cinza).
- Fotos: do cliente (preferível) ou de banco livre (Unsplash, Pexels) com licença conferida. Montar uma folha e olhar antes de usar.
- Vídeo dentro do filme: reencodar all-intra (`-g 1`), carregar como blob e, no `seek`, setar `currentTime` e esperar o evento `seeked` (tornar o `seek` assíncrono nesse caso).
- Bibliotecas de animação só se forem "seekáveis": Anime.js (`autoplay: false` + `anim.seek(ms)`), Theatre.js (`sequence.position = t`). Nada que só anima em tempo real (Spline, Lottie tocando sozinho, framer-motion ao vivo).

## Render

- `render.mjs full`: 60 fps, 8 subquadros por quadro espalhados num obturador de 180° (`--shutter 0.5`), média em luz linear 16 bits. Quadro sem mudança entre a primeira e a última captura pula as do meio.
- Movimento muito rápido com faixas: subir `--sub` pra 12. 4 subquadros deixa fantasma.
- `--workers`: navegadores em paralelo (padrão: núcleos - 2, máx 6).
- `--from/--to`: re-render de um trecho. Pra juntar trechos, re-renderizar o filme inteiro se for curto (mais seguro que emendar).
- Saída: H.264 CRF 16, yuv420p, BT.709 faixa TV, `+faststart`. Áudio AAC 256k 48 kHz no `mux`.

## Armadilhas já conhecidas

- Easing que devolve 1e-9 em vez de 0 dispara `if (u > 0)` cedo demais: usar `M.P`, que devolve 0 exato.
- `goto` só com hash não recarrega a página: o render abre a URL completa com `?fmt&v&render=1`.
- Render longo em notebook: fechar a tampa derruba o render (o Chromium morre no meio). O `render.mjs` roda `caffeinate -i` no macOS, que evita o sono por inatividade, mas não segura a tampa fechada. Avisar a estimativa de tempo e pedir pra deixar o notebook aberto. Ao encadear comandos, nunca usar `| tail` depois do render (esconde o erro e o passo seguinte roda sobre o vídeo antigo).
- Caminho com espaço (comum no macOS): sempre entre aspas nos comandos.
- ffmpeg do sistema pode não existir: a skill usa o `ffmpeg-static` da própria pasta.
- A skill é só Node (sem Python) de propósito: um runtime só pra instalar em qualquer máquina.
