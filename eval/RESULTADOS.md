# Resultados da avaliação

Mede quão bem o interpretador local (regras) transforma uma frase em tarefa: categoria, prioridade, data, hora, pessoa e título.
Reproduzir: `python3 eval/run.py` (usa o `jsc` que vem com o macOS). Data de referência fixa: 7 de outubro de 2026.
Para medir outra versão: `python3 eval/run.py --parser caminho/parser.js`.

## Como ler

- 136 frases em `casos.json`, escritas por uma só pessoa, com o resultado que um utilizador esperaria. Onde há mais de uma resposta aceitável, o caso lista-as. Uma frase com duas tarefas conta como duas unidades.
- Cada conjunto foi escrito num momento diferente. Um conjunto só é uma medida limpa **antes** de se corrigirem as suas falhas. Depois de corrigidas, passa a medir apenas que a correção funciona.
- O título só verifica se contém as palavras-chave esperadas, não se está bem escrito.
- "Frase totalmente certa" exige os seis campos certos.

## Por versão (frase totalmente certa)

- **Original:** o interpretador do commit `05de7cd`.
- **Antes da 2.ª ronda:** com as correções de pessoa, categoria, hora e prioridade.
- **Atual:** com várias tarefas por frase, "dia 15", "daqui a 3 dias", "próxima semana", títulos melhores e "adiar de quarta para quinta".

| Conjunto | Unidades | Original | Antes da 2.ª ronda | Atual |
|---|---|---|---|---|
| dev — serviu para corrigir | 30 | 77% (23/30) | 100% (30/30) | 100% (30/30) |
| teste — também serviu para corrigir | 20 | 70% (14/20) | 100% (20/20) | 100% (20/20) |
| novo — limpa na 1.ª ronda | 20 | 50% (10/20) | 100% (20/20) | 100% (20/20) |
| novo2 — limpa na 1.ª ronda, usada depois para corrigir | 20 | 55% (11/20) | 85% (17/20) | 100% (20/20) |
| novo3 — limpa na 2.ª ronda (a única ainda por afinar) | 23 | 17% (4/23) | 39% (9/23) | 74% (17/23) |
| datas — escritas para a funcionalidade nova | 8 | 0% (0/8) | 0% (0/8) | 100% (8/8) |
| varias — escritas para a funcionalidade nova | 12 | 0% (0/12) | 0% (0/12) | 100% (12/12) |
| dificil — frases livres, serviu para corrigir | 12 | 8% (1/12) | 75% (9/12) | 100% (12/12) |
| todos (dev, teste, novo, novo2, novo3) | 113 | 55% (62/113) | 85% (96/113) | 95% (107/113) |

## O que isto diz

- **A medida mais honesta é o novo3**, escrito depois das últimas funcionalidades e corrido uma só vez: 4 em 23 no original, 9 em 23 antes da 2.ª ronda e **17 em 23 (74%)** agora. Parte da subida era esperada, porque o conjunto inclui datas e frases com duas tarefas que o original não fazia.
- **Os 100% nos outros conjuntos não são uma previsão.** Foram corrigidos precisamente os erros que apareceram neles.
- **Na 1.ª ronda**, em frases novas só de tarefas simples, o original acertava 50% a 55% e o interpretador corrigido 85%.
- **Sem regressões:** os conjuntos antigos continuam todos certos depois das mudanças.

## Falhas que ficam (novo3)

| Caso | Frase | Campo | Esperado | Obtido |
|---|---|---|---|---|
| Q09 | revisão de contas com a contabilista Graça amanhã às 16h | pessoa | ["Graça", "Contabilista Graça"] | null |
| Q10 | lembra-me de levar o portátil para a reunião de quarta | categoria | "Tarefa" | "Reunião" |
| Q11 | ligar para o escritório do Dr. Santos às 9h | pessoa | ["Dr. Santos", "Santos"] | null |
| Q14 | entrevista com a candidata Vaz quinta às 11h | pessoa | ["Candidata Vaz", "Vaz"] | null |
| R02a | reunião de arranque às 9h e almoço com o cliente Faria às 13h | categoria | "Reunião" | null |
| R02a | reunião de arranque às 9h e almoço com o cliente Faria às 13h | prioridade | "Normal" | null |
| R02a | reunião de arranque às 9h e almoço com o cliente Faria às 13h | hora | "9h00" | null |
| R02a | reunião de arranque às 9h e almoço com o cliente Faria às 13h | titulo | ["arranque"] | "" |
| R02b | reunião de arranque às 9h e almoço com o cliente Faria às 13h | categoria | ["Reunião", "Tarefa"] | null |
| R02b | reunião de arranque às 9h e almoço com o cliente Faria às 13h | prioridade | "Normal" | null |
| R02b | reunião de arranque às 9h e almoço com o cliente Faria às 13h | hora | "13h00" | null |
| R02b | reunião de arranque às 9h e almoço com o cliente Faria às 13h | pessoa | "Cliente Faria" | null |
| R02b | reunião de arranque às 9h e almoço com o cliente Faria às 13h | titulo | ["faria"] | "" |

São construções que as regras não cobrem: nomes depois de "do Dr.", "candidata", categoria quando "reunião" aparece só como contexto ("levar o portátil para a reunião"), e uma frase com "almoço" como segunda tarefa. Não foram corrigidas de propósito, para o novo3 continuar a ser uma medida limpa.

## O que falta

- **Correr o modo com modelo.** `python3 eval/run.py --llm` envia o mesmo pedido que a demo envia e mede as frases de uma só tarefa, com latência e tokens. Precisa de `ANTHROPIC_API_KEY` e não foi corrido, por isso **ainda não há comparação entre regras e modelo**.
- **Frases reais.** O conjunto foi escrito por uma pessoa. Convém substituir parte por frases de utilizadores da Tonic.
- **Fora do âmbito:** horas relativas ("daqui a 2 horas"), meses por extenso ("20 de novembro") e referências como "depois da reunião".
