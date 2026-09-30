# Crítica: o filme se olha até tudo 8+

O Claude lê imagens. Esse é o hábito que separa o vídeo "mid" do vídeo que é aprovado.

## Quando

- Nos **stills**, antes de qualquer render completo.
- No **rascunho** (`draft`), pra ritmo.
- No **final**, com `check.mjs video` + `check.mjs sheets`.

## Como

1. `check.mjs video final.mp4`: ler os avisos (pulos, pausa longa demais, movimento uniforme, gancho fraco, loudness).
2. `check.mjs sheets final.mp4 --at <cada movimento rápido>`: abrir `visao-geral.png`, `celular.png` e as `tira-*.png` com Read.
3. Dar nota de 1 a 10, com honestidade de diretor exigente:
   - **Gancho**: os 2 primeiros segundos fazem alguém parar o scroll?
   - **Legibilidade no celular**: tudo lê na folha de 360 px?
   - **Movimento**: springs, nada linear, nenhum quadro morto, blur sem fantasma?
   - **Variedade**: algo novo a cada 2 a 4 s? Durações de plano variadas?
   - **Composição**: respiro, hierarquia, áreas seguras, nada cortado na borda?
   - **Marca e dados**: identidade correta, logo oficial, nada inventado, rótulo de exemplo?
   - **Som**: drop no momento-chave, efeitos no quadro certo, nada alto ou fora de lugar?
4. Listar os **3 piores problemas com tempo** (ex: "4,6 s: título encosta no card").
5. Corrigir, re-renderizar o trecho afetado, dar nota de novo. **Repetir até toda nota ≥ 8.** Registrar cada rodada no `ROTEIRO.md`.

## Leitura do relatório

- "Cortes secos" do `check.mjs` = quadros em que a imagem muda muito de uma vez. Flood, íris ou balão enchendo a tela entram nessa conta mesmo sendo contínuos. Sempre conferir com `sheets --at <tempo>` antes de mexer: se a tira mostra a forma crescendo quadro a quadro, é carry, não corte.
- "Pulos" isolados no beat costumam ser soco de câmera ou pulso de brilho com subida instantânea (o `M.punch` já tem 50 ms de subida).

## O que caçar

- Texto sobreposto durante troca de cena.
- Algo se movendo em velocidade constante (linear).
- Título centralizado sobre gradiente genérico ("cara de IA").
- Texto borrado por escala durante uma transição.
- Beat morto: um trecho em que nada acontece sem ser pausa planejada.
- Tudo entrando com fade (o "mid" clássico): trocar por máscara, spring, carry.
- Mesma duração em todos os planos (cara de slide).
- Cenas que se substituem sem nada carregando entre elas.
- Elemento importante na área dos botões/legenda da plataforma (anúncio).
- Movimento tão rápido que vira flash ilegível.
- Letras encavaladas em abertura animada, chips empilhados, texto cortado por forma.
- Marca do cliente errada, cor fora da paleta, fonte trocada.
- Número ou recurso que o cliente não tem.
- Travessão em qualquer texto.
