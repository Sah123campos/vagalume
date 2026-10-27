# VAGALUME — um sonho que não quer acabar

RPG narrativo de navegador, em pixel art, inspirado na experiência de **OMORI** (OMOCAT): exploração em mapas 2D, amigos com personalidades fortes, batalhas por turnos com **emoções** que mudam a estratégia, humor estranho e terror psicológico que cresce aos poucos.

Todo o conteúdo é original: história, personagens, mapas, diálogos, arte e música. A arte é desenhada pixel a pixel em código, e a música é sintetizada em tempo real. O jogo não usa imagens, músicas, servidores nem bibliotecas externas.

> **A história.** Algodoal é um mundo macio onde nada de ruim dura muito. Mas, numa noite, o **Farol** se apaga e o **Vô Faísca**, seu guardião, desaparece. LUME, uma menina de capa de chuva amarela, precisa reunir os amigos BRISA, TOCO e NINA, recuperar as três Brasas da Chama-Mãe e reacender a luz. Só que, quanto mais a luz volta, mais Algodoal fica estranho. E LUME começa a lembrar de um dia no lago.

---

## Recursos implementados

**Exploração**
- 24 mapas conectados: Casa da Árvore, Bosque do Quintal, Vila Pavio, Campos Pastel, Floresta Sussurrante, Coração da Floresta, Gruta das Águas Paradas, Fundo da Gruta, Casa Abandonada, Bairro Esquecido, Rochedo Uivante, Farol e mais.
- **14 interiores** com função própria: Casa da Árvore, Prefeitura, Padaria, Biblioteca (com sala secreta), Oficina, Casa da Brisa, Pousada, Casa Abandonada, Casa 3, Casa 5, Casa 7, Casa do Vô (base do Farol), Topo do Farol e Quarto 214.
- Movimento em grade com animação em 4 direções, corrida (Shift), colisão real, câmera com limites, grupo seguindo em fila, portas que levam ao lugar certo e devolvem você na saída correta.
- NPCs com falas que mudam conforme a fase da história, as missões e as escolhas.
- Inimigos visíveis no mapa: alguns vagam, outros perseguem. Os **manequins** só se mexem quando você está de costas.
- Iluminação (a lamparina de LUME ilumina lugares escuros e fica mais forte a cada Brasa), partículas (vagalumes, pétalas, bolhas, vento, cinzas), noite, falhas visuais e "visões".

**Combate por turnos**
- Comandos por personagem (ATACAR, HABILIDADE, ITEM, DEFENDER, LUTAR/FUGIR), depois todos agem pela VELOCIDADE.
- **Emoções:** FELIZ vence IRRITADO, IRRITADO vence TRISTE, TRISTE vence FELIZ. Cada emoção tem 3 intensidades e muda atributos de verdade (detalhes abaixo). O retrato muda de cor e expressão.
- **LAÇO:** uma barra compartilhada que enche quando o grupo ataca, apanha ou defende. Com 3 pontos, depois de um ataque, dá para chamar um amigo para um **combo** (12 combos diferentes). Se os dois sentem a mesma emoção, acontece a **RESSONÂNCIA** (efeito x1.5). Com 10 pontos e os quatro de pé: **TODOS JUNTOS!**
- **SINTONIA:** três ou mais amigos com a mesma emoção ganham um bônus na rodada.
- 27 habilidades do grupo, efeitos de estado (sonolento, enraizado, atordoado, esquecido, medo, protegido, provocação, contra-ataque), itens de batalha.
- 16 tipos de inimigos e 4 chefes, cada um com mecânica própria:
  - **Mamãe Raiz:** casca grossa que só racha quando ela fica IRRITADA; brotinhos que a curam; segunda fase em que chora e enraíza.
  - **A Coisa no Fundo:** maré que sobe a cada rodada até uma MARÉ ALTA. A ISCA DE LUZ, quando destruída, baixa a maré e atordoa o monstro.
  - **Dona Ninguém:** troca de máscara (FELIZ, TRISTE, IRRITADO) a cada duas rodadas e fica imune a quem estiver em desvantagem emocional; faz o grupo esquecer habilidades; sem máscaras, age duas vezes.
  - **O Apagador:** apaga emoções, escurece a arena (LUME pode ERGUER AS BRASAS) e, no fim, não é vencido pela força: é preciso escolher.
- Vitória com EXP, botões (o dinheiro do jogo) e itens. Derrota leva à tela de fim de jogo, com opção de **tentar de novo** a mesma batalha.

**Progressão e sistemas**
- Níveis até 20, crescimento de atributos por personagem e habilidades desbloqueadas por nível (até 4 equipadas).
- Inventário em categorias (Lanches, Brinquedos, Equipamento, Importantes), uso fora e dentro da batalha, limite por item. Itens importantes não são consumidos.
- Equipamento: arma por personagem e amuleto (alguns começam a batalha com uma emoção, dão imunidade a medo ou recuperam BRILHO).
- 4 lojas com estoque limitado, compra e venda, verificação de dinheiro e espaço.
- **10 missões** (4 principais, 6 opcionais), com etapas que se completam sozinhas, recompensas e uma que pode **falhar** (vender a pipa do Pipoca para o Sapo).
- Enigmas: estátuas de coruja ligadas entre si, livros coloridos com pista em poema, pedras empurráveis sobre placas, corredor em loop. Segredos: passagem por uma árvore falsa, arbusto brilhante, a fonte dos desejos, uma pedra que escuta.
- Mapa do mundo (M), diário de missões, tela do grupo, configurações, créditos.

**Persistência**
- 3 espaços de salvamento manual (nos lampiões) + salvamento automático em lugares seguros e depois dos chefes.
- Cópia de segurança antes de sobrescrever, validação, migração de versões, aviso para saves ilegíveis (que **nunca são apagados sozinhos**).
- **Exportar e importar** saves em arquivo `.json`.

**Áudio:** 18 músicas procedurais (exploração, batalha, chefes, tristeza, epílogo, créditos), ambiências (vento, grilos, gotas, hospital, estática) e mais de 60 efeitos sonoros. Cada personagem tem um "som de voz" no diálogo.

**Acessibilidade:** teclas remapeáveis, controle (gamepad), controles de toque, volumes separados, silenciar, velocidade do texto, opção para **reduzir efeitos intensos** (tremores, flashes, falhas), escala "pixel perfeito" ou "preencher", pausa automática quando a aba perde o foco.

---

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Andar | Setas ou WASD | Direcional / analógico |
| Interagir / confirmar | Z, Enter ou Espaço | A |
| Cancelar / voltar | X, Esc ou Backspace | B |
| Correr | Shift (segurar) | X / RB |
| Menu | P ou Esc (X também abre o menu no mapa) | Start / Y |
| Mapa | M | Select |
| Itens | I | — |
| Grupo | C | — |
| Acelerar texto e batalha | segurar Z | segurar A |

Em celulares e tablets aparecem botões na tela (podem ser ligados ou desligados nas Configurações). Todas as teclas podem ser trocadas em **Configurações › Teclas**.

---

## Estrutura de pastas

```
vagalume/
  index.html          página do jogo (ponto de entrada)
  README.md           este arquivo
  css/style.css       layout da página, toque, mensagens de erro
  js/
    core.js           namespace, utilidades, relógio de jogo, erros
    engine.js         configurações, pilha de cenas, laço principal, pausa
    data.js           carrega data/*.json (ou data/bundle.js no file://)
    font.js           fonte bitmap original com acentos
    pixel.js          ferramenta de pixel art (formas, contorno, sombreamento)
    renderer.js       canvas 384x216, escala, efeitos de tela, janelas da interface
    input.js          teclado remapeável, toque, gamepad
    audio.js          sintetizador: música, ambiências e efeitos
    art-sprites.js    personagens (4 direções) e retratos com expressões
    art-tiles.js      chão, paredes, árvores, construções e móveis por região
    art-enemies.js    inimigos e chefes
    effects.js        partículas, clima, iluminação, falhas, visões
    state.js          estado salvo, condições, inventário, grupo e níveis
    quests.js         missões
    save.js           salvar/carregar, validação, migração, exportar/importar
    dialogue.js       caixa de diálogo
    events.js         interpretador de scripts de evento
    world.js          mapas, entidades, colisão, câmera, cena de exploração
    screens.js        título, salvar/carregar, configurações, créditos, fim de jogo
    menu.js           menu de pausa e lojas
    emotions.js       regras das emoções
    combat.js         lógica da batalha
    combat-ai.js      IA dos inimigos e chefes
    combat-ui.js      interface e efeitos da batalha
    validate.js       verifica referências quebradas nos dados
    debug.js          ferramentas de depuração (só com ?debug=1)
    main.js           inicialização
  data/
    maps.json         mapas, entidades, portas, eventos, mapa-múndi
    characters.json   grupo (atributos, habilidades) e NPCs (aparência)
    enemies.json      inimigos e tropas
    items.json        itens, equipamentos e lojas
    skills.json       habilidades, combos e TODOS JUNTOS
    quests.json       missões
    dialogues.json    scripts de evento, diálogos e créditos
    music.json        partituras das músicas
    bundle.js         cópia gerada dos JSON (para abrir pelo arquivo)
  assets/icon.svg     ícone da aba
  tools/              build-bundle.py e build-bundle.mjs (geram data/bundle.js)
  tests/              e2e.js (testes automáticos) e art-preview.html (prévia da arte)
```

As pastas `assets/sprites`, `assets/tiles`, `assets/audio` e `assets/fonts` não existem porque nada disso é arquivo: sprites, tiles, fonte e áudio são gerados pelo código ao abrir o jogo.

---

## Requisitos

- Um navegador moderno: Chrome, Edge, Firefox ou Safari (versões dos últimos ~3 anos).
- Nada para instalar. Não precisa de internet depois que os arquivos estão no seu computador.

---

## Como jogar no seu computador

**Jeito mais simples:** descompacte o ZIP e dê dois cliques em `index.html`. O jogo abre no navegador. (Nesse modo, ele lê os dados de `data/bundle.js`.)

**Jeito recomendado (servidor local, igual ao GitHub Pages):**

1. Abra um terminal na pasta `vagalume`.
2. Rode um destes comandos:
   - Python: `python3 -m http.server 8000` (no Windows pode ser `py -m http.server 8000`)
   - Node: `npx serve .`
3. Abra `http://localhost:8000` no navegador.

Se a tela mostrar "Não foi possível carregar os dados do jogo", veja a seção **Problemas comuns**.

---

## Como publicar no GitHub Pages

1. Crie uma conta em https://github.com, se ainda não tiver.
2. Clique em **New repository** (botão verde). Dê um nome, por exemplo `vagalume`, deixe como **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** (ou **Add file › Upload files**).
4. Arraste **o conteúdo** da pasta `vagalume` (o `index.html` e as pastas `css`, `js`, `data`, `assets`, `tools`, `tests`, e o `README.md`). O `index.html` precisa ficar na **raiz** do repositório, e não dentro de outra pasta.
5. Clique em **Commit changes**.
6. Vá em **Settings** (Configurações) do repositório › **Pages** (menu da esquerda).
7. Em **Build and deployment › Source**, escolha **Deploy from a branch**. Em **Branch**, escolha `main` e a pasta `/ (root)`. Clique em **Save**.
8. Espere 1 ou 2 minutos e recarregue a página de Settings › Pages. Vai aparecer o endereço, algo como `https://SEU-USUARIO.github.io/vagalume/`.
9. Abra o endereço e jogue. O jogo funciona em subpastas porque todos os caminhos são relativos.

**Problemas comuns**
- **Página 404:** o `index.html` não está na raiz do repositório, ou o Pages ainda está publicando (espere mais um pouco).
- **Tela de erro "Não foi possível carregar os dados":** a pasta `data/` não foi enviada, ou algum arquivo foi renomeado. O GitHub Pages diferencia **maiúsculas de minúsculas**: `Data/Maps.json` não é o mesmo que `data/maps.json`.
- **Mudanças não aparecem:** o GitHub Pages guarda cache por alguns minutos. Recarregue com Ctrl+Shift+R.
- **Sem som:** os navegadores só liberam áudio depois de um clique ou tecla. Pressione Z na tela inicial. Confira também o volume nas Configurações.

## Como atualizar o projeto

1. Edite os arquivos (por exemplo um diálogo em `data/dialogues.json`).
2. Se editou algum arquivo em `data/`, rode `python3 tools/build-bundle.py` (ou `node tools/build-bundle.mjs`) para atualizar o `data/bundle.js`. Isso só é necessário para quem abre o jogo pelo arquivo, sem servidor.
3. Envie os arquivos alterados ao GitHub (Add file › Upload files, substituindo os antigos). O Pages atualiza sozinho.

Os saves continuam valendo depois de atualizações. Se o formato do save mudar, aumente `R.SAVE_VERSION` em `js/core.js` e escreva a conversão em `MIGRATIONS`, no `js/save.js`.

---

## Como salvar e recuperar o progresso

- Para salvar, examine um **lampião** (no seu quarto, na praça da vila, nos Campos, na Floresta, na Gruta, no Bairro, no Rochedo e no Farol) e escolha "Escrever no diário". Há 3 espaços.
- O jogo também salva sozinho no espaço **Automático** ao entrar em áreas seguras e depois dos chefes (dá para desligar nas Configurações).
- "Continuar", na tela inicial, carrega o save mais recente.
- **Atenção:** os saves ficam guardados no navegador (localStorage). Se você limpar os dados de navegação, usar uma janela anônima ou trocar de navegador ou computador, eles somem. Para guardar uma cópia, use **Carregar › escolher o espaço › Exportar arquivo**. Para recuperar, use **Importar save de um arquivo**.
- Um save que não puder ser lido aparece como "Ilegível" e **não é apagado**: você ainda pode exportá-lo ou restaurar a cópia anterior.

---

## Regras das emoções

| Emoção | Intensidade 1 / 2 / 3 | Efeito |
|---|---|---|
| FELIZ / RADIANTE / EUFÓRICO | VEL x1.25 / 1.5 / 2.0 | crítico +10/20/30%, precisão x0.9/0.8/0.7 |
| TRISTE / ABATIDO / DESOLADO | DEF x1.25 / 1.4 / 1.6 | VEL x0.8/0.65/0.5; 30/50/100% do dano recebido sai do BRILHO |
| IRRITADO / FURIOSO / COLÉRICO | ATQ x1.3 / 1.5 / 2.0 | DEF x0.7/0.5/0.3 |
| COM MEDO (2 rodadas) | ATQ x0.8, DEF x0.75 | não pode usar habilidades |

- Atacante com vantagem (FELIZ › IRRITADO › TRISTE › FELIZ): dano x1.5. Com desvantagem: x0.65.
- Aplicar a mesma emoção sobe a intensidade, até o máximo do personagem (veja em Menu › Grupo). Aplicar outra emoção substitui a atual. O MEDO substitui qualquer emoção e passa sozinho. Quando uma ação causa várias emoções, vale a última.
- Emoções duram até o fim da batalha ou até serem trocadas.

---

## Para quem quer modificar

- **Mapas** (`data/maps.json`): cada mapa tem `layout` (linhas de texto, um caractere por tile, veja `legendExterior` e `legendInterior`), `entities` (NPCs, objetos, baús, portas, construções, gatilhos, inimigos, pedras e placas), música, escuridão, partículas e `variants` (mudanças por condição, como a noite). As entidades têm `pages`: a primeira página cuja condição for verdadeira define aparência, posição e script. É assim que um personagem aparece em lugares diferentes ao longo da história.
- **Condições:** `flag:x`, `!flag:x`, `var:x>=3`, `phase>=2`, `item:id`, `item:id>=3`, `quest:id=active|done|failed|inactive`, `party:brisa`, `money>=10`. Listas significam "e"; `{"any": [...]}` significa "ou".
- **Comandos de evento** (`data/dialogues.json`): `say`, `think`, `choice`, `if`, `unless`, `random`, `call`, `end`, `flag`, `unflag`, `var`, `phase`, `give`, `take`, `money`, `quest`, `join`, `leave`, `exp`, `heal`, `wait`, `fade`, `flash`, `shake`, `glitch`, `vision`, `tint`, `sfx`, `music`, `ambience`, `teleport`, `move`, `setpos`, `face`, `faceplayer`, `emote`, `show`, `hide`, `camera`, `refresh`, `toast`, `learn`, `light`, `autosave`, `battle`, `shop`, `savepoint`, `card`, `credits`, `title`, `sleep`, `menu`, `cleared`. Texto aceita `{p}` (pausa), `{P}` (pausa longa), `{red}`, `{blue}`, `{yellow}`... e `{shake}`, `{wave}`, `{slow}`, fechados com `{/}`.
- **Habilidades e itens** usam a mesma lista de efeitos: `damage`, `fixed`, `heal`, `healBr`, `revive`, `emotion`, `buff`, `status`, `laco`, `taunt`, `cover`, `counter`, `guardAll`, `cleanse`, `drainBr`, `steal`, `special`.
- O jogo valida todas as referências ao abrir. Para ver os problemas, abra com `?debug=1`.

### Ferramentas de depuração
Abra `index.html?debug=1`. Atalhos: **F2** painel de informações (cena, mapa, posição, missões, flags, batalha, erros), **F3** colisões e nomes das entidades, **F4** teletransporte, **F6** dar item, **F7** vencer a batalha atual, **F8** atravessar paredes, **F9** definir flag ou variável. Também dá para começar direto num mapa: `index.html?debug=1&map=vila&x=21&y=14&party=lume,brisa,toco,nina&level=8&phase=2`.

### Testes automáticos
Com Node.js e Playwright instalados (`npm i playwright`), sirva a pasta **acima** de `vagalume` e rode:
```
python3 -m http.server 8765
node vagalume/tests/e2e.js http://localhost:8765/vagalume/
```
Para ver a arte gerada: `tests/art-preview.html#chars`, `#portraits`, `#tiles`, `#buildings`, `#props` ou `#enemies`.

---

## Limitações conhecidas

- Este é o **primeiro arco** da história. O final indica uma continuação.
- A arte é procedural: tem estilo consistente, mas não chega ao nível de detalhe de sprites desenhados à mão.
- A música é sintetizada no navegador. Em aparelhos muito fracos, pode falhar um pouco em cenas cheias de efeitos.
- Os controles de toque funcionam, mas o jogo foi pensado primeiro para teclado e controle. Em celulares em pé, a tela do jogo fica pequena: é melhor deitar o aparelho.
- O equilíbrio das batalhas foi testado com um "robô" que joga sozinho e por revisão das fórmulas, mas não com muitas pessoas. Se alguma luta ficar difícil demais, o arquivo `data/enemies.json` pode ser ajustado.
- No Safari antigo (iOS 14 ou anterior), o áudio pode demorar a iniciar.

---

## Créditos e licenças

- **Jogo, código, roteiro, arte procedural e música procedural:** criados para este projeto com Claude (Anthropic). Nenhum recurso de terceiros foi usado. Não há imagens, fontes, sons nem bibliotecas externas.
- **Inspiração:** OMORI, de OMOCAT. Este é um trabalho independente que segue os princípios de design daquele jogo, sem reutilizar nenhum mapa, sprite, música, texto, nome ou arquivo dele.
- Você pode estudar, modificar e publicar este projeto livremente.
