# convertia-motion

Skill do Claude Code da ConvertIA para criar **vídeos em motion design com áudio, 100% em código**.

Nada de After Effects, Premiere, Remotion ou modelo de vídeo por IA. Cada vídeo é uma página HTML em que **cada quadro é calculado a partir do tempo**. O Chromium tira uma foto de cada quadro, o ffmpeg monta o vídeo, e uma trilha sonora é mixada no ritmo exato das animações.

Resultado: vídeos com acabamento de produtora (movimento com peso, câmera contínua, transições sem corte, motion blur real, som no quadro certo) que podem ser refeitos, corrigidos e adaptados em minutos, para qualquer cliente e em qualquer formato.

---

## Sumário

1. [Requisitos](#1-requisitos)
2. [Instalação](#2-instalação)
3. [Verificar se está tudo certo](#3-verificar-se-está-tudo-certo)
4. [Atualizar, desinstalar e manter no git do projeto](#4-atualizar-desinstalar-e-manter-no-git-do-projeto)
5. [Como usar: primeiro vídeo](#5-como-usar-primeiro-vídeo)
6. [O que a skill faz, etapa por etapa](#6-o-que-a-skill-faz-etapa-por-etapa)
7. [Os três modos](#7-os-três-modos)
8. [Formatos e áreas seguras](#8-formatos-e-áreas-seguras)
9. [Variações para teste A/B](#9-variações-para-teste-ab)
10. [Trilha sonora e efeitos](#10-trilha-sonora-e-efeitos)
11. [O que faz o vídeo parecer caro](#11-o-que-faz-o-vídeo-parecer-caro)
12. [Crítica automática: o vídeo se olha até ficar bom](#12-crítica-automática-o-vídeo-se-olha-até-ficar-bom)
13. [Regras que a skill nunca quebra](#13-regras-que-a-skill-nunca-quebra)
14. [O que é gerado: a pasta de um filme](#14-o-que-é-gerado-a-pasta-de-um-filme)
15. [Referência de comandos](#15-referência-de-comandos)
16. [Referência do motor (engine.js)](#16-referência-do-motor-enginejs)
17. [Referência do score.json](#17-referência-do-scorejson)
18. [Tempo de render](#18-tempo-de-render)
19. [Solução de problemas](#19-solução-de-problemas)
20. [Estrutura do repositório](#20-estrutura-do-repositório)
21. [Licenças e créditos](#21-licenças-e-créditos)

---

## 1. Requisitos

| O quê | Versão | Observação |
|---|---|---|
| **Claude Code** | atual | Terminal, app desktop ou extensão do VS Code |
| **Node.js** | 18 ou mais novo | Único runtime necessário. Conferir com `node -v` |
| **npm** | vem com o Node | Instala o Playwright e o ffmpeg |
| **git** | qualquer | Para clonar e atualizar a skill |
| **Espaço em disco** | ~400 MB | ~65 MB de dependências + ~300 MB do Chromium do Playwright (compartilhado entre projetos) |
| **Internet** | só na instalação e para baixar música | O render funciona offline |

**Não precisa** instalar ffmpeg, Python nem nenhum editor de vídeo. O ffmpeg vem pelo pacote `ffmpeg-static`, dentro da própria pasta da skill.

Funciona em macOS, Linux e Windows (no Windows, rodar o `setup.sh` pelo Git Bash ou fazer os dois comandos dele à mão: `npm install` e `npx playwright install chromium`).

---

## 2. Instalação

Uma skill do Claude Code é uma pasta com um `SKILL.md`. Você pode instalar de dois jeitos.

### Opção A: só em um projeto

A skill fica disponível apenas quando o Claude Code está aberto naquela pasta. Bom para quando cada cliente tem o próprio projeto.

```bash
# dentro da pasta do projeto
git clone https://github.com/convertagencia/skill-convertia-motion.git .claude/skills/convertia-motion
bash .claude/skills/convertia-motion/setup.sh
```

### Opção B: em todos os projetos (global)

A skill fica disponível em qualquer pasta que você abrir no Claude Code.

```bash
git clone https://github.com/convertagencia/skill-convertia-motion.git ~/.claude/skills/convertia-motion
bash ~/.claude/skills/convertia-motion/setup.sh
```

> O nome da pasta de destino tem que ser `convertia-motion` (igual ao `name` do SKILL.md), mesmo o repositório se chamando `skill-convertia-motion`.

### O que o `setup.sh` faz

1. Confere se o Node está instalado.
2. Roda `npm install` dentro da pasta da skill: baixa o **Playwright** (controla o Chromium) e o **ffmpeg-static** (binário do ffmpeg).
3. Roda `npx playwright install chromium`: baixa o navegador usado no render. Se já existir no computador, é reaproveitado.
4. Roda o `doctor.mjs`, que testa Node, ffmpeg e Chromium e diz se está tudo pronto.

Tudo fica dentro da pasta da skill (`node_modules/`). Nada é instalado no sistema, e nada disso vai para o git.

### Depois de instalar

Abra (ou reinicie) o Claude Code na pasta do projeto. A skill aparece na lista de skills e pode ser chamada com:

```
/convertia-motion
```

ou simplesmente pedindo em linguagem natural: *"faz um motion de 15 segundos pro cliente X"*, *"cria um criativo em vídeo pro Meta Ads"*, *"quero um vídeo mostrando o sistema funcionando"*.

---

## 3. Verificar se está tudo certo

```bash
node .claude/skills/convertia-motion/scripts/doctor.mjs
```

Saída esperada:

```
node 24.x ok
ffmpeg ok (ffmpeg version 6.0)
chromium ok
convertia-motion pronto.
```

Se alguma linha falhar, rode o `setup.sh` de novo. Veja também [Solução de problemas](#19-solução-de-problemas).

---

## 4. Atualizar, desinstalar e manter no git do projeto

### Atualizar para a versão mais nova

```bash
git -C .claude/skills/convertia-motion pull
bash .claude/skills/convertia-motion/setup.sh
```

(troque `.claude/skills/convertia-motion` por `~/.claude/skills/convertia-motion` se instalou global)

### Desinstalar

```bash
rm -rf .claude/skills/convertia-motion
```

Os vídeos já feitos continuam funcionando: cada filme leva uma cópia do `engine.js` na própria pasta.

### Se o projeto também é um repositório git

A skill tem o próprio repositório. Para o git do projeto não tentar engolir a pasta dela, escolha um:

- **Ignorar** (mais simples): adicione ao `.gitignore` do projeto:
  ```
  .claude/skills/convertia-motion/
  ```
- **Submódulo** (se quiser que o projeto registre qual versão da skill usa):
  ```bash
  git submodule add https://github.com/convertagencia/skill-convertia-motion.git .claude/skills/convertia-motion
  ```

---

## 5. Como usar: primeiro vídeo

Você não precisa rodar nenhum comando. Basta pedir ao Claude Code. Exemplos:

**Institucional**
> Faz um motion institucional de 20 segundos pra ConvertIA, formato Reels, mostrando que a gente entrega site em dias e não em semanas.

**Demo de produto**
> Quero um vídeo de 30 segundos mostrando o portal de gestão que entreguei pro meu cliente funcionando. Os prints estão em `clientes/estudio-arq/prints/`.

**Anúncio**
> Cria criativos em vídeo pra Meta Ads da barbearia do meu cliente. Objetivo: mensagem no WhatsApp. Quero 9:16 e 4:5, com 3 variações de gancho.

A partir daí a skill conduz o processo: faz as perguntas que faltam, propõe conceitos, mostra o roteiro, mostra imagens de conferência e só então renderiza. **Você aprova em três momentos**: o conceito, o roteiro e as imagens de conferência.

### O que ter em mãos (ajuda muito)

- **Logo em SVG** do cliente (PNG funciona, mas SVG permite animar as partes do logo separadamente).
- **Cores** (hex) e **fontes** (arquivos `.woff2`, `.ttf` ou `.otf`) do cliente, ou um `design-guide.md`.
- **Prints** das telas, no caso de demo de produto.
- **Números reais** que podem aparecer no vídeo.
- **CTA** e **segmento** do cliente, no caso de anúncio.
- Uma **referência** (vídeo ou print de algo que você gostou), se tiver.

Se o projeto já tem essas informações em arquivos (`_memoria/`, `identidade/`, pasta do cliente), a skill lê antes de perguntar.

---

## 6. O que a skill faz, etapa por etapa

### Etapa 1: Entradas

Reúne tudo o que o vídeo precisa: modo, cliente, o que ele vende e para quem, o **momento-chave** (o instante em que o cliente do cliente sente o valor), identidade visual, formatos, duração, CTA, segmento, material real e referência. Lê o que já existe no projeto e pergunta só o que faltar, sempre com uma opção recomendada.

Tudo fica registrado no `ROTEIRO.md` da pasta do filme.

### Etapa 2: Três conceitos

Antes de qualquer roteiro, a skill propõe **três ideias centrais diferentes** para o vídeo. Um conceito é uma frase sobre a **imagem**, não sobre o produto. Exemplos de eixos:

- **Um elemento que se transforma em tudo**: um ponto vira o cursor, depois a lista, depois o gráfico e por fim uma parte do logo.
- **Um movimento de câmera atravessando escalas**: começa dentro de um detalhe e vai abrindo até o todo (ou o contrário).
- **Antes e depois**: o mesmo processo feito do jeito velho e do jeito novo, lado a lado.
- **Reação em cadeia**: cada cena é a batida que dispara a próxima.
- **Metáfora do nicho do cliente**: a imagem vem do mundo daquele cliente. Numa barbearia, numa clínica ou num escritório de advocacia a metáfora é outra.

Para cada conceito: qual é o quadro de abertura, o que liga uma cena à outra, o que ele descarta e como é o visual. **Você escolhe.**

Nenhum vídeo reaproveita o roteiro, a abertura ou o visual do anterior. O que se repete é a técnica, nunca o conteúdo.

### Etapa 3: Roteiro e beat map

O conceito escolhido vira uma tabela com o tempo de cada batida:

| t (s) | beat | o que se move | o que fica parado | o que carrega pro próximo | som |
|---|---|---|---|---|---|

Regras aplicadas:

- **Ritmo variado**: o plano mais longo tem pelo menos 4x a duração do mais curto (slide tem tudo igual).
- **Pelo menos uma pausa** de verdade. É ela que faz o momento forte bater.
- **Algo novo a cada 2 a 4 segundos.**
- **Nada parado por mais de ~1 segundo** sem ser a pausa planejada.
- **Continuidade**: em toda troca de cena, algo visível sobrevive e se transforma na próxima (ver [seção 11](#11-o-que-faz-o-vídeo-parecer-caro)).
- **Música**: a skill escolhe a faixa, mede o BPM e o **drop** (o momento em que a música "explode") e coloca o drop exatamente no momento visual mais importante.

Os textos de cada variante (A, B, C...) também entram aqui, já revisados: sem travessão, sem prometer o que o cliente não entrega, com rótulo de exemplo em dado ilustrativo e respeitando as regras do segmento.

**A skill mostra o roteiro e espera seu OK antes de escrever código.**

### Etapa 4: Construção

A skill cria a pasta do filme e escreve o `film.html`: as cenas, a câmera, os textos, o layout de cada formato, as variantes e a lista de eventos de som, tudo seguindo o motor (`engine.js`). A identidade do cliente entra como tokens CSS (cores e fontes).

No modo demo, as telas do produto são **reconstruídas em HTML** a partir dos prints (cores medidas pixel a pixel), para poderem ser animadas elemento por elemento e ampliadas sem perder nitidez.

Você pode ver o filme ao vivo no navegador a qualquer momento: abra `film.html?play`.

### Etapa 5: Imagens de conferência (stills)

Antes de gastar tempo com o render completo, a skill gera uma folha com quadros dos momentos-chave, em todos os formatos pedidos, e **olha para ela de verdade** (o Claude lê imagens). Corrigir um texto encavalado no still leva 2 minutos. Descobrir no vídeo pronto custa um render inteiro.

Você recebe os stills principais para aprovar.

### Etapa 6: Render

O vídeo é renderizado a 60 quadros por segundo, com **motion blur real**: cada quadro é a média de 8 fotos tiradas dentro do intervalo de um obturador de cinema (180°). É o que tira o aspecto "engasgado" de animação de computador. Vários navegadores trabalham em paralelo para acelerar.

Existe também o **rascunho** (30 fps, sem blur, meia resolução), que sai em segundos e serve para conferir ritmo.

### Etapa 7: Trilha

A skill exporta a lista de eventos de som do filme, busca e baixa música de banco gratuito (se for o caso), alinha o drop da música com o momento-chave, posiciona cada efeito sonoro no quadro exato da animação que o causa, aplica uma "sala" comum a todos os efeitos, normaliza o volume para o padrão das redes (-14 LUFS) e gera um arquivo de créditos com fonte e licença. Depois junta vídeo e áudio.

### Etapa 8: Crítica até tudo 8+

A skill analisa o vídeo pronto (pulos de quadro, cortes, trechos parados, ritmo uniforme demais, gancho fraco, volume), gera folhas de quadros (visão geral, tamanho de celular e tiras em câmera lenta nos movimentos rápidos) e dá nota de 1 a 10 em sete critérios. Corrige os três piores problemas, re-renderiza e repete **até toda nota ser 8 ou mais**. Detalhes na [seção 12](#12-crítica-automática-o-vídeo-se-olha-até-ficar-bom).

### Etapa 9: Entrega

Arquivos finais com nome claro (`<cliente>-<modo>-<formato>-<variante>.mp4`), checklist de entrega conferido, pasta aberta no Finder e, no modo anúncio, um `VARIANTES.md` explicando o que muda em cada versão para montar o teste na campanha.

---

## 7. Os três modos

### Institucional / lançamento

Para apresentação de marca, lançamento de produto ou serviço, perfil, vídeo de site.

| | |
|---|---|
| Duração | 15 a 30 s (até 45-60 s em lançamento, se pedido) |
| Formato padrão | 9:16. Também 16:9 (site, YouTube, apresentação) e 4:5 (feed, LinkedIn) |
| Estrutura típica | abertura que prende, história contínua mostrando o momento-chave, virada forte (flash, frase grande, drop), fecho com a marca sendo construída |
| Som | trilha com clima do conceito, drop na virada |

### Demo de produto

Para mostrar uma ferramenta funcionando: portal de gestão, sistema de agendamento, app, SaaS, site.

| | |
|---|---|
| Duração | 15 a 45 s (máximo 60) |
| Formato padrão | 16:9, com versão 9:16 recomposta |
| Estrutura | problema nas palavras do cliente (3-5 s), uma corrente de passos em que cada um produz o que o próximo usa, resultado mensurável na tela, CTA |
| Telas | reconstruídas em código a partir de prints, nunca coladas paradas |
| Som | apoio; o texto na tela carrega a mensagem (vídeo de site toca mudo) |

Regras específicas:
- **A causa aparece**: um cursor, um dedo ou um objeto dispara cada reação. Tela reagindo a nada parece protetor de tela.
- **Nunca mostrar tela ou recurso que o produto não tem.**
- Dados de clientes reais são **anonimizados** (empresa fictícia consistente, avatar neutro). Número ilustrativo leva rótulo "exemplo".
- Cada elemento fica legível por pelo menos 1,5 s depois de terminar de animar.

### Anúncio (criativo para tráfego pago)

Para Meta Ads (Facebook e Instagram), TikTok Ads e Google/YouTube.

| Regra | Como a skill aplica |
|---|---|
| Gancho em 1 a 2 s | O primeiro quadro já traz a dor ou a promessa, em texto grande. Sem introdução, sem logo abrindo |
| Funciona sem som | A mensagem inteira está no texto da tela. O áudio só reforça |
| Curto | 6 a 15 s na maioria dos casos |
| CTA no fim | Definido pelo cliente ("Fale com a gente no WhatsApp", "Agende sua avaliação"), visível por pelo menos 1,5 s |
| Vários formatos | 9:16, 4:5 e 1:1 do mesmo filme, com layout recomposto (nunca só cortado) |
| Áreas seguras | Nada importante embaixo dos botões, da legenda ou do nome do perfil |
| Variações A/B | 2 a 4 versões trocando gancho, frase principal ou CTA |
| Regras do segmento | Pergunta o segmento e respeita as restrições (abaixo) |
| Trilha licenciada | Sintetizada ou de banco com uso comercial. Música enviada pelo cliente só com licença de publicidade |

**Segmentos regulados** que a skill considera no roteiro:

- **Advocacia**: OAB, Provimento 205/2021. Sem promessa de resultado, sem captação agressiva, sem mercantilização, sem preço como chamariz.
- **Saúde e estética**: conselhos profissionais (CFM, CRO, COFFITO e outros, conforme o profissional responsável) e Anvisa. Sem antes/depois sensacionalista, sem promessa de resultado, sem preço como chamariz.
- **Finanças, crédito, apostas, bebida, suplementos**: restrições fortes nas plataformas.
- **Políticas da Meta, do Google e do TikTok** valem por cima de tudo (por exemplo: não aludir a atributos pessoais do espectador).

Na dúvida, a skill sinaliza para você em vez de arriscar.

---

## 8. Formatos e áreas seguras

O mesmo `film.html` renderiza em qualquer formato. O layout é calculado a partir da largura, da altura e das áreas seguras de cada um.

| Formato | Resolução | Onde usar | Área segura (topo / base / esquerda / direita) |
|---|---|---|---|
| `9x16` | 1080 × 1920 | Reels, Stories, TikTok, Shorts | 270 / 480 / 70 / 120 px |
| `4x5` | 1080 × 1350 | Feed do Instagram e Facebook, LinkedIn | 70 px em volta |
| `1x1` | 1080 × 1080 | Feed, alguns posicionamentos de anúncio | 60 px em volta |
| `16x9` | 1920 × 1080 | Site, YouTube, apresentação, X | 80 / 80 / 110 / 110 px |

As margens do 9:16 são conservadoras: a base protege legenda e nome do perfil, e a direita protege a coluna de botões (curtir, comentar, compartilhar). As plataformas mudam as interfaces com o tempo: na dúvida, a skill confere a recomendação atual.

---

## 9. Variações para teste A/B

Os textos de cada variante ficam numa tabela dentro do filme:

```js
const TXT = M.pick({
  A: { hook: 'Sua agenda ainda vive no WhatsApp?', cta: 'Fale com a gente' },
  B: { hook: 'Sexta lotada, segunda vazia?',       cta: 'Fale com a gente' },
  C: { hook: 'Sua agenda ainda vive no WhatsApp?', cta: 'Agende uma demonstração' },
});
```

Cada combinação de formato e variante é renderizada separadamente (`--fmt 4x5 --v B`). A recomendação é trocar **uma variável por vez** (só o gancho, ou só o CTA) quando o objetivo é descobrir o que funciona.

---

## 10. Trilha sonora e efeitos

### De onde vem a música

| Fonte | Como | Licença |
|---|---|---|
| **Mixkit** | Busca e download integrados (`mixkit.mjs`) | Mixkit Free License: uso comercial, sem redistribuir o arquivo. Conferir `mixkit.co/license` para usos novos (ex: anúncio pago) |
| Pixabay Music, YouTube Audio Library, Free Music Archive (CC comercial) | Download manual | Registrar fonte e licença no `score.json` |
| **Sintetizada** | Gerada em código (`pad`, `swell`) | Sem direitos de terceiros, risco zero |
| Enviada pelo cliente | Arquivo do cliente | Só com licença confirmada para o uso |

A skill **nunca** puxa música comercial protegida por conta própria. Todo vídeo sai com um `CREDITOS.txt` listando música e efeitos de banco com suas licenças.

Referência de clima por BPM: 60-80 solene/premium, 90-110 suave/confiante, 115-123 sofisticado, acima de 125 energia/hype.

### O drop no lugar certo

O `analyze-song.mjs` mede o BPM e encontra o drop pela **energia do grave**, refinada em janelas de 20 milissegundos. Grade de batida automática não é confiável (já errou por 2 batidas numa faixa real). Com o drop medido, o `score.json` diz em que segundo do filme ele deve cair, e a música é cortada para isso acontecer.

### Efeitos sonoros

Cada evento de som é declarado no próprio filme, no mesmo tempo da animação que o causa:

```js
const EVENTS = [
  [0.15, 'whoosh', 0.18],        // [tempo, nome, volume, pan]
  [1.55, 'pop',    0.22],
  [3.05, 'impact', 0.35],
];
```

Cada som é posicionado pelo **pico** (o ponto mais alto da onda), não pelo início do arquivo: o estalo cai exatamente no quadro do clique.

**Sons sintetizados disponíveis** (não precisam de arquivo):

| Nome | Som | Parâmetros |
|---|---|---|
| `click` | clique de interface | `freq` |
| `tick` | tique curtinho | `freq` |
| `key` | tecla de teclado | `seed` |
| `pop` | pop subindo | `from`, `to` |
| `bubble` | bolha | `from`, `to` |
| `whoosh` | passagem de ar, com pan da esquerda para a direita | `len`, `lo`, `hi` |
| `riser` | subida de tensão | `len` |
| `impact` | impacto grave com ruído | `seed` |
| `thump` | batida grave (bumbo) | |
| `chime` | sino / campainha | `notes` (Hz separados por vírgula), `decay` |
| `sparkle` | brilho | `seed` |
| `shutter` | obturador de câmera | `seed` |
| `swell` | acorde que cresce e some | `len`, `notes` |
| `pad` | fundo tonal contínuo (quando não há música) | `len`, `notes`, `lfo` |

Uso com parâmetros: `"synth:whoosh?len=0.6&hi=7000"`. Também dá para usar arquivos do Mixkit (`mixkit.mjs sfx whoosh` e `get sfx <id>`).

### Mixagem

- Todos os efeitos passam pela **mesma sala** (reverb curto), para soarem do mesmo ambiente.
- **Ducking** opcional: a música abaixa alguns dB a cada efeito.
- Fade de entrada da música e de saída do filme.
- **Normalização em duas passadas para -14 LUFS**, com pico real até -1,5 dBTP: o padrão de Reels, TikTok, YouTube, X e LinkedIn.
- Regra de ouro: **menos eventos que batidas**. Som em todo movimento soa barato.

---

## 11. O que faz o vídeo parecer caro

### Movimento com massa (springs)

Animação barata vai do ponto A ao B numa curva fixa. Animação cara tem peso: acelera, passa um pouquinho do ponto e assenta. A skill usa springs calculadas em forma fechada (sem simulação), com quatro presets:

| Preset | Uso |
|---|---|
| `snappy` | interface, botões, chips |
| `base` | containers, câmera |
| `heavy` | tipografia grande, logos |
| `playful` | elementos com personalidade (passa do ponto de forma visível) |

Movimento linear é proibido, exceto rotação contínua.

### Câmera operada

A câmera se move pelo "mundo" do vídeo: segue o assunto com um leve atraso, dá chicotes rápidos entre pontos, tem uma flutuação sutil de mão humana e um pequeno "soco" em cada batida da música. O zoom é interpolado em escala logarítmica, então parece uniforme.

### Transições sem corte

Em vez de trocar de slide, algo visível sobrevive a toda troca de cena:

- um **card cresce** até virar a tela inteira;
- um **círculo nasce de um objeto**, cobre o quadro e contrai no próximo objeto;
- a **câmera mergulha** dentro de um elemento até ele ser a cena;
- um **elemento compartilhado** (a bolha, o cursor, o card) leva a história adiante;
- uma **linha dispara** e vira grade, borda ou gráfico.

Corte seco só em rajadas rítmicas ou no fechamento.

### Texto que entra bem

Palavras sobem uma a uma de dentro de uma máscara, com leve rotação. Digitação com cursor sincronizada com o som de tecla. Contadores com desaceleração no fim.

### Motion blur real

8 capturas por quadro dentro de um obturador de 180°, com média em luz linear (16 bits). Isso evita o rastro escuro que aparece em elemento claro sobre fundo escuro, comum em motion blur feito do jeito simples.

---

## 12. Crítica automática: o vídeo se olha até ficar bom

O `check.mjs video` mede o vídeo pronto e avisa sobre:

- **pulos de quadro** (um quadro que muda muito mais que os vizinhos);
- **cortes secos**;
- **trechos parados** acima de 2,5 s;
- **falta de respiro** (nenhuma pausa);
- **movimento uniforme demais** (cara de slide);
- **gancho fraco** (pouco movimento nos 2 primeiros segundos);
- **volume** fora de -14 LUFS ou pico acima de -1 dBTP.

Ele também desenha o "gráfico de movimento" do vídeo, meio segundo por barra:

```
movimento (0,5 s por barra): ▆▂▂█▂▇▁▁
```

O `check.mjs sheets` gera:

- `visao-geral.png`: 2 quadros por segundo, o vídeo inteiro numa imagem;
- `celular.png`: 1 quadro por segundo em 360 px de largura, para testar leitura no celular;
- `tira-<t>.png`: 12 quadros seguidos em volta de um movimento rápido, para inspecionar o blur e a transição.

Com isso, a skill dá nota de 1 a 10 em: **gancho, legibilidade no celular, qualidade do movimento, variedade, composição, marca e dados, som**. Lista os 3 piores problemas com o tempo exato, corrige, re-renderiza e repete até **todas as notas ficarem em 8 ou mais**.

O que ela caça: texto sobreposto em troca de cena, movimento linear, título centralizado sobre gradiente genérico (a "cara de IA"), tudo entrando com fade, planos com a mesma duração, cenas que se substituem sem nada ligando, elemento importante na área dos botões, texto borrado, marca errada, número inventado e travessão.

---

## 13. Regras que a skill nunca quebra

1. **Cada vídeo é único.** Conceito novo para cada cliente e cada pedido.
2. **Identidade sempre do cliente**, com logo oficial. Filme de cliente não leva marca da ConvertIA, salvo pedido.
3. **Nada inventado na tela**: só recurso que o produto tem, número real ou rotulado como exemplo.
4. **Legenda do post verdadeira**: nada de "feito em 10 minutos" se não foi.
5. **Sem travessão** em nenhum texto do vídeo ou da legenda.
6. **Regras de publicidade do segmento** e políticas das plataformas.
7. **Música sempre licenciada** para o uso.
8. **Determinismo**: renderizar o mesmo segundo duas vezes dá exatamente o mesmo quadro. Correções são cirúrgicas.

---

## 14. O que é gerado: a pasta de um filme

A skill segue a regra de pastas do `CLAUDE.md` do projeto. Na falta dela, usa `saidas/motion/<cliente-ou-tema>-<AAAA-MM-DD>/`.

```
saidas/motion/barbearia-anuncio-2026-10-02/
├── film.html            o filme (cenas, câmera, textos, formatos, variantes, eventos de som)
├── engine.js            cópia do motor (o filme continua funcionando mesmo se a skill mudar)
├── ROTEIRO.md           entradas, 3 conceitos, beat map, textos por variante, rodadas de crítica
├── score.json           receita da trilha (música, drop, sons, sala, volume, créditos)
├── fonts/               fontes do cliente (o render é offline)
├── assets/              logos, prints, fotos
├── music/               faixas baixadas
├── sfx/                 efeitos baixados (se usar arquivos)
└── out/
    ├── stills-9x16-A/sheet.png         folhas de conferência
    ├── events-9x16-A.json              eventos de som exportados
    ├── video-9x16-A.mp4                vídeo sem som
    ├── audio.wav                       trilha final (-14 LUFS)
    ├── CREDITOS.txt                    música e efeitos com licença
    ├── video-9x16-A-final.mp4          vídeo final com som
    └── video-9x16-A-final-check/       relatório e folhas da crítica
```

Para abrir o filme ao vivo no navegador:

| URL | O que faz |
|---|---|
| `film.html?play` | toca em loop |
| `film.html?t=6.4` | congela no segundo 6,4 |
| `film.html?play&fmt=4x5` | outro formato |
| `film.html?play&v=B` | outra variante |

---

## 15. Referência de comandos

Todos os comandos são `node <pasta-da-skill>/scripts/<script>`. O Claude Code roda esses comandos sozinho, mas você pode usar direto no terminal.

### `doctor.mjs`

```bash
node scripts/doctor.mjs
```
Confere Node, ffmpeg e Chromium.

### `new.mjs`

```bash
node scripts/new.mjs <pasta-do-filme>
```
Cria a pasta com `film.html`, `engine.js`, `score.json`, `ROTEIRO.md`, `fonts/`, `assets/` e `out/`.

### `render.mjs`

```bash
node scripts/render.mjs stills <film.html> --times 0.5,2,4.2 [--fmt 9x16] [--v A] [--out pasta]
node scripts/render.mjs beats  <film.html> --bpm 120 [--offset 0] [--dur 15] [--fmt] [--v]
node scripts/render.mjs draft  <film.html> [--fmt] [--v] [--from s --to s]
node scripts/render.mjs full   <film.html> [--fmt] [--v] [opções]
node scripts/render.mjs events <film.html> [--fmt] [--v] [--out events.json]
node scripts/render.mjs mux    <video.mp4> <audio.wav> [--out final.mp4]
```

| Comando | O que faz |
|---|---|
| `stills` | PNGs nos tempos pedidos + `sheet.png` com todos |
| `beats` | um still por batida da música (confere se as cenas começam no beat) |
| `draft` | rascunho: 30 fps, sem blur, meia resolução |
| `full` | render final: 60 fps, motion blur, resolução cheia |
| `events` | exporta a lista de sons do filme para JSON |
| `mux` | junta vídeo e áudio (AAC 256 kbps, 48 kHz) |

Opções de `full` e `draft`:

| Opção | Padrão | O que faz |
|---|---|---|
| `--fmt` | `9x16` | `9x16`, `4x5`, `1x1`, `16x9` |
| `--v` | `A` | variante |
| `--fps` | 60 (draft 30) | quadros por segundo |
| `--sub` | 8 (draft 1) | capturas por quadro (motion blur). 12 para movimento muito rápido. 4 deixa fantasma |
| `--shutter` | 0.5 | abertura do obturador (0,5 = 180°) |
| `--scale` | 1 (draft 0.5) | escala da saída |
| `--workers` | núcleos - 2, máx 6 | navegadores em paralelo |
| `--from` / `--to` | início / fim | renderiza só um trecho |
| `--dur` | a do filme | força outra duração |
| `--no-linear` | | média do blur em sRGB em vez de luz linear |
| `--out` | `out/video-<fmt>-<v>.mp4` | arquivo de saída |

Saída: H.264, CRF 16, yuv420p, BT.709, `+faststart` (pronto para subir em qualquer rede).

### `audio.mjs`

```bash
node scripts/audio.mjs <score.json> [--out pasta]
```
Mixa música, efeitos e sala, normaliza em -14 LUFS e gera `out/audio.wav` e `out/CREDITOS.txt`. Formato do arquivo na [seção 17](#17-referência-do-scorejson).

### `analyze-song.mjs`

```bash
node scripts/analyze-song.mjs <musica.mp3> [--near 31.9] [--bpm 120]
```
Mostra duração, BPM estimado, energia por segundo (total e grave) e os candidatos a drop refinados em 20 ms. `--near` refina em volta de um tempo específico. `--bpm` força o BPM se a estimativa errar (por exemplo, dobrado ou pela metade).

### `mixkit.mjs`

```bash
node scripts/mixkit.mjs music <termo ou gênero>     # ex: corporate, cinematic, hip-hop, upbeat
node scripts/mixkit.mjs sfx   <termo>               # ex: whoosh, click, impact, typing
node scripts/mixkit.mjs get music <id> [pasta]      # padrão ./music
node scripts/mixkit.mjs get sfx   <id> [pasta]      # padrão ./sfx
```
Lista id, título, artista, gênero e duração, e baixa com o nome `mixkit-<id>.mp3`.

### `check.mjs`

```bash
node scripts/check.mjs video  <final.mp4>
node scripts/check.mjs sheets <final.mp4> [--at 2.7,8.1]
```
Relatório e folhas da [seção 12](#12-crítica-automática-o-vídeo-se-olha-até-ficar-bom). Tudo vai para `<video>-check/`, incluindo `relatorio.json`.

---

## 16. Referência do motor (engine.js)

O motor expõe `window.M`. Tudo é função pura do tempo `t` (em segundos).

### Contrato

```js
function seek(t) { /* define todo estilo a partir de t */ }
M.boot(seek, { duration: 15, events: EVENTS, prepare: async () => { /* opcional */ } });
```

`boot` dimensiona o `#stage`, espera fontes e imagens, expõe `window.seek`, `window.ready`, `window.__duration` e `window.__events`, e liga a prévia no navegador.

### Tempo e easing

| Função | O que faz |
|---|---|
| `M.P(t, t0, dur, ease)` | progresso 0→1 entre `t0` e `t0 + dur`, com easing, 0 e 1 exatos nas pontas |
| `M.E.linear / in / out / inOut / o5 / expoIn / expoOut / expoInOut / sineInOut / backOut` | easings |
| `M.step(tau, preset)` | resposta de spring de 0 a 1, `tau` = tempo desde o disparo |
| `M.S(t, base, [[t0, alvo], ...], preset)` | valor que muda de alvo várias vezes, uma spring por mudança |
| `M.SPRING` | presets `snappy`, `base`, `heavy`, `playful` (ou `{k, d}` próprio) |
| `M.keys(t, [[t, v], ...], ease)` | interpolação por chaves |
| `M.lerp`, `M.clamp`, `M.invLerp` | utilitários |
| `M.rng(seed)` | aleatório determinístico (nunca usar `Math.random`) |

### Formato e variante

| Item | O que é |
|---|---|
| `M.fmt` | formato atual (`9x16`, `4x5`, `1x1`, `16x9`), lido de `?fmt=` |
| `M.W`, `M.H` | largura e altura em px |
| `M.SAFE` | `{top, bottom, left, right}` da área segura |
| `M.byFmt({ '16x9': {...}, default: {...} })` | valor por formato |
| `M.variant` | variante atual, lida de `?v=` |
| `M.pick({ A: {...}, B: {...} })` | valor por variante (cai no A se faltar) |

### Câmera

| Função | O que faz |
|---|---|
| `M.camera(t, [[t, zoom, x, y, ease?], ...])` | posição da câmera; (x, y) é o ponto do mundo no centro do quadro; zoom em escala log |
| `M.hand(t, amp, seed)` | flutuação de mão de operador (`{x, y}`) |
| `M.punch(t, [tempos], amt, decay)` | soco de zoom nos tempos dados |
| `M.applyCam(el, cam, { punch, dx, dy })` | aplica a câmera no elemento `#world` |

### Elementos e texto

| Função | O que faz |
|---|---|
| `M.set(el, { x, y, s, sx, sy, r, o, blur, origin, show })` | transform, opacidade, blur e visibilidade numa chamada |
| `M.show(el, bool)` | mostra ou esconde (usa `visibility: inherit`) |
| `M.rise(el, t, { at, out, stagger, dur, ease })` | palavras sobem mascaradas, uma a uma; `out` faz a saída |
| `M.words(el)` | quebra o texto em palavras mascaradas (feito uma vez) |
| `M.type(el, texto, t, t0, cps, caret)` | digitação; retorna quantos caracteres estão visíveis |
| `M.typeTimes(texto, t0, cps)` | tempos de cada tecla, para gerar eventos de som |
| `M.count(t, t0, dur, de, até, ease)` | contador |

### Transições

| Função | O que faz |
|---|---|
| `M.box(el, {x, y, w, h, rad})` | posiciona e dimensiona uma caixa |
| `M.mixRect(a, b, u)` | interpola entre duas caixas (card que vira tela) |
| `M.fullRect(rad)` | a caixa do quadro inteiro |
| `M.floodR(cx, cy)` | raio que cobre o quadro inteiro a partir de um ponto |

---

## 17. Referência do score.json

Caminhos relativos ao próprio `score.json`.

```json
{
  "duration": 15,
  "events": "out/events-9x16-A.json",
  "sounds": {
    "whoosh": "synth:whoosh?len=0.5",
    "click": "sfx/mixkit-1125.mp3"
  },
  "music": {
    "file": "music/mixkit-1167.mp3",
    "drop_in_song": 16.389,
    "drop_in_film": 3.05,
    "gain": 0.7,
    "fade_in": 0.25,
    "source": "Mixkit #1167 'Close Up' (Michael Ramir C.)",
    "license": "Mixkit Free License"
  },
  "bed": "synth:pad?len=15",
  "duck": { "db": 4, "attack": 0.02, "release": 0.25 },
  "room": 0.14,
  "fade_out": 0.9,
  "lufs": -14,
  "credits": ["Efeitos: Mixkit #1125 (Mixkit Free License)"]
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `duration` | se `events` for lista | duração em segundos (vem do arquivo de eventos se for caminho) |
| `events` | sim | caminho do JSON exportado pelo `render.mjs events`, ou lista `[[t, nome, ganho, pan], ...]` |
| `sounds` | não | nome do evento → arquivo de áudio ou `synth:...`. Sem entrada, usa o sintetizado de mesmo nome |
| `music.file` | se houver música | arquivo da faixa |
| `music.drop_in_song` / `drop_in_film` | não | a música começa em `drop_in_song - drop_in_film` |
| `music.start` | não | alternativa: segundo da música em que o filme começa |
| `music.segments` | não | música montada por trechos: `[[inicio, fim], ...]` em segundos da faixa, emendados a partir do segundo 0 do filme (cortar em início de compasso). Serve pra repetir compassos e alongar o trecho entre dois drops. Substitui `drop_in_song`/`drop_in_film` |
| `music.gain` | não | volume da música (padrão 0,8) |
| `music.fade_in` | não | fade de entrada (padrão 0,25 s) |
| `music.source` / `license` | recomendado | vão para o `CREDITOS.txt` |
| `bed` | não | fundo sintetizado quando não há música |
| `duck` | não | abaixa a música em cada efeito (`db`, `attack`, `release`) |
| `room` | não | quantidade de sala nos efeitos (padrão 0,14) |
| `fade_out` | não | fade final (padrão 0,9 s) |
| `lufs` | não | alvo de volume (padrão -14) |
| `credits` | não | linhas extras para o `CREDITOS.txt` |

---

## 18. Tempo de render

Medido num Mac com 6 navegadores em paralelo:

| Render | Filme de 5 s | Estimativa por segundo de filme |
|---|---|---|
| `draft` (30 fps, sem blur, meia resolução) | ~1 s | segundos |
| `full` 9:16 (60 fps, 8 capturas por quadro) | ~40 s | ~8 s |

Trechos parados renderizam mais rápido (as capturas do meio são puladas). Filme de 20 s em 3 formatos e 3 variantes são 9 renders: planejar e rodar em segundo plano. O render mostra progresso e tempo restante.

---

## 19. Solução de problemas

| Problema | Solução |
|---|---|
| `doctor.mjs` diz que falta ffmpeg ou Chromium | `bash setup.sh` na pasta da skill |
| A skill não aparece no Claude Code | Conferir se a pasta se chama `convertia-motion` e tem o `SKILL.md` na raiz; reiniciar o Claude Code |
| `ERROS NA PÁGINA` no render | Erro de JavaScript no `film.html`: abrir `film.html?play` no navegador e ver o console |
| Render trava em "waiting for window.ready" | Fonte ou imagem que não carrega. Conferir caminhos em `fonts/` e `assets/` |
| Fonte errada no vídeo | A fonte precisa estar em arquivo local com `@font-face`; link do Google Fonts não é confiável no render |
| Fantasma ou faixas em movimento rápido | Subir `--sub` para 12 |
| Música acaba antes do filme | Aviso do `audio.mjs`: escolher outro trecho (outro drop) ou outra faixa |
| BPM estimado dobrado ou pela metade | o `analyze-song.mjs` lista também os outros picos; conferir e passar `--bpm <valor certo>` |
| Render parou no meio | Notebook entrou em repouso ou teve a tampa fechada: deixar aberto durante o render (no macOS o render já evita o repouso por inatividade) |
| Git do projeto reclama de repositório embutido | Ver [seção 4](#4-atualizar-desinstalar-e-manter-no-git-do-projeto) |
| Caminho com espaço dá erro | Sempre entre aspas nos comandos |

---

## 20. Estrutura do repositório

```
convertia-motion/
├── SKILL.md              protocolo que o Claude Code segue (o "cérebro" da skill)
├── README.md             este arquivo
├── THIRD-PARTY.md        créditos e licenças de terceiros
├── setup.sh              instalação das dependências
├── package.json          dependências (playwright, ffmpeg-static)
├── lib/
│   └── engine.js         o motor de animação (window.M)
├── scripts/
│   ├── new.mjs           cria a pasta de um filme
│   ├── render.mjs        stills, beats, draft, full, events, mux
│   ├── audio.mjs         mixer da trilha
│   ├── analyze-song.mjs  BPM e drop
│   ├── mixkit.mjs        busca e download de música e efeitos
│   ├── check.mjs         relatório e folhas de crítica
│   ├── doctor.mjs        diagnóstico da instalação
│   └── lib/
│       ├── ff.mjs        ffmpeg, leitura e escrita de áudio, loudness
│       └── synth.mjs     sons sintetizados e a sala
├── templates/
│   ├── film.html         esqueleto do filme (contrato técnico, não roteiro)
│   ├── score.json        modelo de trilha
│   └── ROTEIRO.md        modelo de entradas, conceitos, beat map e crítica
└── references/
    ├── modos.md          institucional, demo de produto, anúncio
    ├── tecnica.md        receitas do motor, câmera, transições, armadilhas
    ├── som.md            música, efeitos, licenças, mixagem
    ├── critica.md        loop de crítica e o que caçar
    └── casos.md          filmes já feitos e o que cada um ensinou
```

Os arquivos em `references/` são lidos pelo Claude Code quando precisa do detalhe. Cada filme novo que ensinar algo deve ser registrado em `references/casos.md`.

---

## 21. Licenças e créditos

- Código da ConvertIA, uso privado.
- Partes do fluxo e das técnicas foram adaptadas de [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design) (MIT, Raphaël Aubry). Aviso completo em [THIRD-PARTY.md](THIRD-PARTY.md).
- Ideias gerais de direção de motion inspiradas em `feitangyuan/onetake` (licença não comercial). Nenhum código, texto ou asset desse projeto foi copiado.
- Playwright (Apache-2.0) e ffmpeg-static (binário do ffmpeg, GPL-3.0) são baixados na instalação e não fazem parte do repositório.
- Músicas e efeitos de banco não fazem parte do repositório; cada filme registra fonte e licença no próprio `CREDITOS.txt`.
