# Modos

Os três usam o mesmo motor, a mesma técnica e o mesmo acabamento. O que muda é roteiro, duração, formato e regras.

## Institucional / lançamento

Apresentação da marca, lançamento de produto ou serviço, perfil, vídeo pra site.

- **Duração**: 15 a 30 s (lançamento de produto pode ir a 45-60 s se o usuário pedir).
- **Formato**: 9:16 (Reels, TikTok, Shorts) por padrão; 16:9 pra site, apresentação e YouTube; 4:5 pra feed e LinkedIn.
- **Estrutura típica** (não obrigatória): abertura que prende → uma história contínua mostrando o momento-chave → um momento forte de virada (flash, frase grande, drop da música) → fecho com a marca sendo construída.
- Pode abrir com construção mais lenta, desde que os 2 primeiros segundos já tenham algo acontecendo.
- Som: trilha com clima escolhido pro conceito, drop no momento de virada. Funciona com som (mas legenda na tela continua sendo boa prática).

## Demo de produto

Mostrar uma ferramenta funcionando: portal de gestão, sistema de agendamento, app, SaaS, site entregue pra um cliente da ConvertIA.

- **Duração**: 15 a 45 s (60 s no máximo).
- **Formato**: 16:9 pra site e apresentação, 9:16 recomposto pra redes.
- **História = uma corrente**: o problema nas palavras do cliente (3 a 5 s) → cada passo PRODUZ o que o próximo usa (o objeto que sai de um passo vira a próxima cena, câmera contínua, sem corte) → o resultado mensurável na tela → CTA. Cada passo 2 a 7 s. Todo elemento termina de animar e fica legível por pelo menos 1,5 s.
- **Telas reconstruídas em código, nunca coladas**:
  1. Pedir prints de cada tela (ou capturar com Playwright se o sistema estiver acessível).
  2. Medir cores por amostragem de pixel, fonte, raios, sombras, bordas, espaçamentos. Guardar como tokens CSS no filme.
  3. Reconstruir os componentes que vão animar (linhas entrando em cascata, contadores, cards, digitação, cursor, toggles).
  4. Comparar lado a lado com o print até ficar reconhecível à primeira vista.
- **A causa tem que aparecer**: um cursor, um dedo, um objeto que dispara cada reação. Tela reagindo a nada parece protetor de tela.
- **Nunca mostrar tela ou recurso que o produto não tem.** Dados de cliente real: anonimizar (empresa fictícia consistente, avatar neutro). Número ilustrativo com rótulo "exemplo".
- Sem som de fundo como apoio da mensagem: o texto na tela carrega (o vídeo de site toca mudo).
- Página inteira em miniatura não lê: ou a tela ocupa o quadro, ou só um componente vivo dentro de um card.

## Anúncio (criativos pra tráfego pago)

Criativos pra Meta Ads (Facebook/Instagram), TikTok Ads, Google/YouTube. Regras a mais:

1. **Gancho em 1 a 2 s**: o primeiro quadro já traz a dor ou a promessa, em texto grande. Nada de introdução, nada de logo abrindo.
2. **Funciona sem som**: a mensagem inteira está no texto da tela. O áudio reforça, não carrega.
3. **Curto**: 6 a 15 s na maioria dos casos. Conferir a recomendação atual de cada plataforma na hora (WebSearch) se houver dúvida.
4. **CTA no fim**, alinhado ao objetivo da campanha e definido pelo cliente ("Fale com a gente no WhatsApp", "Agende sua avaliação"). CTA visível por pelo menos 1,5 s.
5. **Vários formatos da mesma peça**: 9:16 (Stories, Reels, TikTok), 4:5 (feed), 1:1 quando precisar. Mesmo `film.html`, layout recomposto por formato via `M.W/M.H/M.SAFE/M.byFmt`. Nunca só cortar.
6. **Áreas seguras**: nada importante embaixo dos botões, da legenda ou do nome do perfil. Valores do motor (`M.SAFE`, conservadores):
   - 9:16: topo 270 px, base 480 px, esquerda 70, direita 120 (coluna de botões).
   - 4:5 e 1:1: 60 a 70 px em volta.
   - 16:9: 80 px em cima e embaixo, 110 nas laterais.
   Rodar os stills de cada formato e conferir. As plataformas mudam as interfaces: se houver dúvida, pesquisar a zona segura atual.
7. **Variações pra teste A/B**: 2 a 4 versões trocando gancho, frase principal ou CTA (`?v=A`, `?v=B`...). Uma variável por vez quando o objetivo for aprender o que funciona. Renderizar todas nos formatos pedidos.
8. **Regras de publicidade do segmento**: perguntar o segmento e respeitar no roteiro.
   - **Advocacia**: OAB, Provimento 205/2021. Sem promessa de resultado, sem captação agressiva, sem mercantilização, sem preço como chamariz. Conteúdo informativo e sóbrio.
   - **Saúde e estética**: conselhos profissionais (CFM, CRO, COFFITO, conselhos de biomedicina e enfermagem conforme quem assina) e Anvisa. Em geral: sem antes/depois sensacionalista, sem promessa de resultado, sem preço como chamariz, procedimento só por quem é habilitado. Conferir a regra do conselho do profissional responsável.
   - **Finanças, crédito, apostas, bebida, suplementos**: regulados e com restrição forte nas plataformas.
   - **Políticas de anúncio** da Meta, do Google e do TikTok valem por cima de tudo (ex: nada de aludir a atributos pessoais do espectador, como "você que está acima do peso").
   - Na dúvida: sinalizar pro usuário em vez de arriscar.
9. **Trilha com licença pra anúncio**: sintetizada (sem risco) ou de banco livre com uso comercial confirmado. Música enviada pelo cliente só com licença pra publicidade. Música de terceiros sem licença bloqueia ou limita o anúncio.

Entrega do modo anúncio: uma pasta com `<cliente>-anuncio-<formato>-<variante>.mp4` pra cada combinação + um `VARIANTES.md` curto dizendo o que muda em cada variante (pra quem vai montar o teste na campanha).
