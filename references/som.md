# Som

## Origem da trilha

Banco gratuito com uso comercial + efeitos sintetizados. Aceita música enviada pelo cliente só com licença confirmada pra o uso (anúncio exige licença de publicidade).

- **Mixkit** (principal, busca integrada): `mixkit.mjs music <termo>` e `mixkit.mjs sfx <termo>`. Licença "Mixkit Free License": uso em projetos comerciais, sem redistribuir o arquivo. Ler `mixkit.co/license` na primeira vez em cada tipo de uso novo (ex: anúncio pago) e registrar no `score.json`.
- **Pixabay Music**, **YouTube Audio Library**, **Free Music Archive** (só faixas CC que permitem uso comercial): busca manual, baixar e registrar fonte + licença.
- **Sintetizado** (`synth:` no score): zero risco de direito autoral. `pad` serve de fundo tonal quando não houver música.
- Nunca puxar música comercial/protegida por conta própria.

Gêneros por clima (ponto de partida): 60-80 BPM solene/premium, 90-110 suave/confiante, 115-123 sofisticado/elegante, > 125 energia/hype. Institucional premium: poucos sons, suaves. Anúncio: batida clara, drop cedo.

## Drop no momento-chave

1. `analyze-song.mjs faixa.mp3`: BPM, energia por segundo (total/grave) e candidatos a drop.
2. Refinar: `--near <segundos>` mede em janelas de 20 ms e acha o salto do grave. **Nunca confiar em grade automática** (já errou 2 beats numa faixa).
3. No `score.json`: `"drop_in_song": <medido>, "drop_in_film": <instante da virada no filme>`. A música começa em `drop_in_song - drop_in_film`.
4. Cenas começam no beat (`beat = 60 / BPM`). `render.mjs beats` gera um still por beat pra conferir.
5. Se a música acabar antes do filme, o `audio.mjs` avisa: trocar de trecho ou de faixa.
6. **Filme mais longo que o trecho entre dois drops:** montar a música por trechos com `"segments": [[inicio, fim], ...]` (segundos da faixa, emendados em sequência a partir do segundo 0 do filme, com crossfade curto). Cortar sempre em início de compasso. Ex.: repetir 2 compassos da parte de construção pra o segundo drop cair no lugar certo.

## Efeitos

- Declarados no filme: `EVENTS = [[t, nome, ganho, pan], ...]`, no mesmo tempo da animação que causa o som (clique no frame do clique, tecla no ritmo da digitação via `M.typeTimes`).
- Nome do evento resolve em `score.json > sounds` (arquivo ou `synth:...`) ou, se não houver, no sintetizado de mesmo nome.
- Sintetizados: `click`, `tick`, `key`, `pop`, `bubble`, `whoosh` (len, lo, hi), `riser` (len), `impact`, `thump`, `chime` (notes em Hz separadas por vírgula, decay), `sparkle`, `shutter`, `swell` (len, notes), `pad` (len, notes, lfo). Parâmetros: `synth:whoosh?len=0.6&hi=7000`.
- IDs Mixkit úteis já vistos: click 1125, tecla 2568, tick suave 1117, check 1113, toggle 1120, pop 2364, bolha 2357, whoosh 1490/1489/1492, rise 1489, impacto 1143, obturador 1430, brilho 3083, sucesso 2865. Conferir o título com `mixkit.mjs sfx <termo>` antes.
- **Posicionamento pelo pico**: o `audio.mjs` alinha o pico de cada som ao instante do evento (não o início do arquivo).
- Ganhos típicos: 0,04 a 0,3. Tecla e pop pequenos (0,04 a 0,08), impacto no drop (0,2 a 0,35).
- **Menos eventos que beats.** Som em todo movimento soa barato. Um material coerente (poucos tipos de som), uma sala só (`room`, 0,1 a 0,18).
- `duck`: abaixa a música alguns dB em cada efeito, útil quando a faixa é cheia.

## Mixagem

- `fade_in` da música ~0,25 s, `fade_out` final 0,6 a 0,9 s.
- Normalização em duas passadas a **-14 LUFS**, true peak ≤ -1,5 dBTP (padrão de Reels, TikTok, YouTube, X, LinkedIn).
- `CREDITOS.txt` sai junto: música, efeitos de banco e licenças. Guardar com o filme.
- Narração (quando pedida): gravada pelo cliente ou TTS com licença comercial; música abaixada ~9 dB sob a voz; texto na tela continua carregando a mensagem.
