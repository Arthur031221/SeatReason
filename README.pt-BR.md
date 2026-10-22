[Demonstração online](https://arthur031221.github.io/SeatReason/) | [English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Português (Brasil)](README.pt-BR.md)

<img src="assets/logo.svg" width="56" height="56" alt="SeatReason logo">

# SeatReason

Regras de assentos que explicam por que não podem valer todas juntas.

Mediana de 18 a 32 ms, e 0,38 s no pior caso, para achar um conflito mínimo que precisa do solucionador SAT. As prévias de reparo dos mesmos casos levam uma mediana de 0,26 a 0,49 s. 51 casos, cinco execuções, método em [Medições](#medições).

Os pedidos de um professor podem ser impossíveis juntos, e a maioria dos planejadores só responde "sem solução". O SeatReason aponta os poucos pedidos que se chocam, deixa você tentar abrir mão de cada um e verifica todo o conjunto restante antes de o mapa mudar.

![Um conflito na turma de exemplo, um mapa reparado com os assentos alterados contornados e, em seguida, um movimento manual que quebra um assento fixo e é desfeito](assets/demo.gif)

É um aplicativo web estático. Os nomes ficam no navegador e nada é enviado.

## Antes e depois

O exemplo "Aperto na primeira fileira": 24 alunos, uma sala de 5 por 6 com duas carteiras faltando, 10 pedidos.

|                    | Antes                                                    | Depois de escolher "Noor senta na primeira fileira"   |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------- |
| Resultado          | "Estes 6 pedidos não podem ser atendidos ao mesmo tempo" | "O mapa pode atender a todos os pedidos (9 ativados)" |
| O que a página diz | Os 6 pedidos, numerados, em palavras simples             | Os assentos que mudam aparecem contornados na sala    |
| Assentos alterados | Nenhum                                                   | 4                                                     |
| Mapa substituído   | Não                                                      | Só depois de "Usar este mapa e desativar o pedido"    |

## Como um mapa é feito

1. **Descreva a turma.** Cole nomes ou uma coluna CSV, até 40 alunos. Nomes iguais são separados por ids internos. Defina as fileiras e os assentos por fileira e marque as carteiras que faltam. A sala tem no máximo 48 assentos.
2. **Adicione pedidos.** Há três tipos: um assento fixo, um lugar nas primeiras N fileiras e dois alunos que não podem sentar um ao lado do outro (à esquerda, à direita, na frente ou atrás). Cada um pode ser desativado sem ser apagado.
3. **Leia o veredito.** Pouco depois de cada mudança, a verificação roda sozinha em um worker, com botão de cancelar. Ela termina como resolvido, impossível ou inconclusivo. Impossível vem com um conjunto mínimo de pedidos: desative qualquer um deles e o resto funciona. O SeatReason só diz isso depois de testar cada pedido do conjunto.
4. **Experimente um reparo.** Cada pedido no conflito cuja retirada deixa o resto valer tem um botão "Ver este mapa". A prévia planeja de novo sem esse pedido e mantém os assentos atuais onde der. Os assentos alterados ficam contornados. O mapa só é substituído quando você aperta o botão que diz isso.
5. **Ajuste e guarde.** Arraste alunos ou clique em dois assentos para trocá-los, e fixe um aluno no lugar atual com um botão. Um movimento que quebra um pedido aparece com o motivo e pode ser desfeito. A turma é salva no navegador, exportada para um arquivo `.seatreason.json` e impressa como mapa com um resumo dos pedidos.

## Arquivos

| Caminho                       | Função                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/core/sat.ts`             | Resolvedor SAT guiado por conflitos, com suposições, orçamento de conflitos e callback de parada |
| `src/core/encode.ts`          | Converte as regras de assentos em cláusulas, um seletor por pedido                               |
| `src/core/hall.ts`            | Emparelhamento e violadores de Hall para assentos fixos e primeiras fileiras                     |
| `src/core/analyze.ts`         | Planejamento, extração do conflito mínimo e prévias de reparo                                    |
| `src/core/validate.ts`        | Verificador de mapas independente, usado pelo app e pelos testes                                 |
| `src/core/oracle.ts`          | Busca exaustiva usada só nos testes                                                              |
| `src/core/project.ts`         | Modelo do projeto, ações de histórico, importação e exportação de arquivos                       |
| `src/worker.ts`, `src/hooks/` | Worker, cancelamento e limite de tempo, histórico de desfazer                                    |
| `src/ui/`, `src/style.css`    | Interface, mapa de assentos, folha de impressão, temas claro e escuro                            |
| `src/locales/`                | Nove arquivos de idioma e um teste de que têm as mesmas chaves                                   |
| `tests/e2e/`                  | Testes de navegador contra o app compilado                                                       |
| `scripts/`                    | Benchmark, gravação da demonstração, geração do cartão social                                    |
| `docs/`                       | Notas de instalação, uso, configuração e arquitetura                                             |

## Instalação

```sh
git clone https://github.com/Arthur031221/SeatReason && cd SeatReason && npm ci && npm start
```

A página fica então em `http://127.0.0.1:4173/`.

<details>
<summary>Linux e macOS</summary>

Instale o Node.js 22.12 ou mais recente e execute o comando acima em um terminal.

</details>

<details>
<summary>Windows</summary>

Instale o Node.js 22.12 ou mais recente. No PowerShell, execute estes comandos um após o outro:

```powershell
git clone https://github.com/Arthur031221/SeatReason
cd SeatReason
npm ci
npm start
```

</details>

<details>
<summary>Qualquer hospedagem estática</summary>

Execute `npm ci && npm run build` e envie a pasta `dist/`. Todos os caminhos são relativos, então funciona a partir de uma subpasta. Não há código de servidor nem requisição de rede depois que a página carrega.

</details>

## Uso

A página abre no exemplo "Aperto na primeira fileira", então a lista do conflito já está lá, com um reparo sob cada pedido. Os outros exemplos ficam em Turma de exemplo.

Para usar a sua própria turma:

1. Cole a lista e aperte "Atualizar turma".
2. Defina o tamanho da sala e marque as carteiras que faltam.
3. Adicione pedidos. A verificação recomeça sozinha.
4. Sob um pedido em conflito, aperte "Ver este mapa" e, se aceitar, "Usar este mapa e desativar o pedido".
5. Aperte "Imprimir" para o mapa e o resumo dos pedidos, ou "Salvar arquivo" para uma cópia de segurança.

Ajustes, arquivos e limites estão em [docs/config.md](docs/config.md). Os detalhes dos passos estão em [docs/usage.md](docs/usage.md).

## Medições

O `npm run bench` roda dois conjuntos de turmas aleatórias com sementes fixas e depois um caso fixo. Os dois conjuntos estão na tabela.

- **Turmas aleatórias.** 40 turmas de 40 alunos em uma sala de 6 por 8, cada uma com 12 a 31 pedidos aleatórios dos três tipos. Todo caso impossível deste conjunto é achado só pelo emparelhamento, porque assentos fixos e fileiras da frente aleatórios colidem muito antes de os pares a separar importarem.
- **Pares a separar.** 80 turmas em que 8 alunos precisam ocupar os 8 assentos da frente, com 14 a 26 pares aleatórios a separar. Assentos fixos e fileiras da frente sozinhos sempre podem ser atendidos, então todo conflito deste conjunto vem do solucionador SAT.

| Conjunto          | Resultado                              | Casos | Mediana      | Mais lento     |
| ----------------- | -------------------------------------- | ----- | ------------ | -------------- |
| Turmas aleatórias | Resolvido                              | 19    | 8 a 16 ms    | 17 a 44 ms     |
| Turmas aleatórias | Impossível, conjunto mínimo encontrado | 21    | 8 a 22 ms    | 20 a 45 ms     |
| Turmas aleatórias | Prévias de reparo desses casos         | 21    | 20 a 43 ms   | 26 a 71 ms     |
| Pares a separar   | Resolvido                              | 29    | 3 a 5 ms     | 10 a 22 ms     |
| Pares a separar   | Impossível, conjunto mínimo encontrado | 51    | 18 a 32 ms   | 327 a 382 ms   |
| Pares a separar   | Prévias de reparo desses casos         | 51    | 262 a 492 ms | 1234 a 2133 ms |

Cada célula é a faixa de cinco execuções do `npm run bench`, em um AMD Ryzen 5 7500F com Node 24.21, uma única thread, na linha de comando e sem navegador. A máquina estava com outros trabalhos rodando, por isso as execuções diferem. Os casos são os mesmos a cada vez. São turmas aleatórias. Uma turma real com muitos pares a separar pode ser mais difícil. A medição dá 20 segundos ao planejamento e não limita as prévias, enquanto a página divide 8 segundos. O caso mais lento aqui levou 2,1 segundos.

A medição termina com um caso fixo: nove alunos que querem todos os oito assentos da frente. O emparelhamento decide em 2 a 5 ms.

Os testes comparam o resolvedor com uma busca exaustiva em salas pequenas. Também verificam que todo conflito informado é mínimo e que todo mapa reparado passa pelo verificador independente.

## Limites

- Um conjunto com muitos pares a separar entre si em uma sala apertada pode ser difícil demais para o limite de 8 segundos. A página então diz "inconclusivo" e não afirma que as regras são impossíveis. Nove alunos que devem ficar todos afastados em uma sala de 4 por 4 são um caso assim.
- Separar significa vizinhos ortogonais. Assentos na diagonal são permitidos.
- A prévia de reparo tenta um pedido por vez. Ela não busca o reparo que altera menos assentos.
- Existem só três tipos de pedido. Não há equilíbrio de gênero, grupos nem rodízio.

## Princípios de projeto

- Uma verificação que falhou é informada como falha. Esgotar o tempo nunca é informado como impossível.
- Um mapa é verificado por código que não compartilha a codificação do resolvedor. Nos testes, cada conflito é comparado com uma busca exaustiva.
- Um mapa que o professor arrumou à mão só é substituído por escolha dele. Depois de uma mudança na turma ou nos pedidos, um mapa que quebra algum pedido é planejado de novo, e Desfazer o traz de volta.
- Os nomes ficam no dispositivo. As turmas de exemplo são fictícias.

## Desenvolvimento

`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` e `npm run test:e2e` são as verificações que o CI executa. Veja [CONTRIBUTING.md](CONTRIBUTING.md) e [docs/architecture.md](docs/architecture.md).

Licença MIT.

Assisted by Claude/Codex.
