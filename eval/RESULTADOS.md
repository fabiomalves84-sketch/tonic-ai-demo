# Resultados da avaliação

Mede quão bem o interpretador local (regras) transforma uma frase em categoria, prioridade, data, hora, pessoa e título.
Reproduzir: `python3 eval/run.py` (usa o `jsc` que vem com o macOS). Data de referência fixa: 7 de outubro de 2026.

## O que se mediu e como ler

- 82 frases em `casos.json`, escritas por uma só pessoa, com o resultado que um utilizador esperaria. Onde há mais de uma resposta aceitável, o caso lista-as.
- **dev** (30) serviu para encontrar falhas e corrigir. **teste** (20) foi vista antes de corrigir, por isso também foi usada para afinar.
- **novo** (20) foi escrito depois das primeiras correções e corrido uma só vez, sem afinar: é a única medida limpa.
- **dificil** (12) são frases mais livres (abreviaturas, "às 3 da tarde", "meio-dia", inglês), escritas para ficarem fora do que o interpretador cobria.
- O título só verifica se contém as palavras-chave esperadas, não se está bem escrito.

## Antes e depois

Interpretador original (commit `05de7cd`):

| Conjunto | Frases | Categoria | Prioridade | Data | Hora | Pessoa | Título | Frase totalmente certa |
|---|---|---|---|---|---|---|---|---|
| todos | 70 | 93% | 100% | 100% | 99% | 76% | 100% | 67% (47/70) |
| dev | 30 | 97% | 100% | 100% | 100% | 80% | 100% | 77% (23/30) |
| teste | 20 | 95% | 100% | 100% | 100% | 75% | 100% | 70% (14/20) |
| novo | 20 | 85% | 100% | 100% | 95% | 70% | 100% | 50% (10/20) |
| dificil | 12 | 92% | 75% | 83% | 75% | 67% | 92% | 8% (1/12) |

Interpretador atual:

| Conjunto | Frases | Categoria | Prioridade | Data | Hora | Pessoa | Título | Frase totalmente certa |
|---|---|---|---|---|---|---|---|---|
| todos | 70 | 100% | 100% | 100% | 100% | 100% | 100% | 100% (70/70) |
| dev | 30 | 100% | 100% | 100% | 100% | 100% | 100% | 100% (30/30) |
| teste | 20 | 100% | 100% | 100% | 100% | 100% | 100% | 100% (20/20) |
| novo | 20 | 100% | 100% | 100% | 100% | 100% | 100% | 100% (20/20) |
| dificil | 12 | 100% | 100% | 83% | 100% | 100% | 92% | 75% (9/12) |

## O que isto diz

- **Medida limpa (novo):** o original acertava 10 em 20 frases por inteiro (50%). Depois das correções gerais, a primeira passagem acertou 17 em 20 (85%). As falhas dessa passagem eram "atas" no plural, "videoconferência" e um defeito meu no reconhecimento de "às 8" sem "h", que corrigi a seguir. **Depois disso a medida deixou de ser limpa.**
- **Os 100% em dev, teste e novo (e a subida em dificil, que também serviu para corrigir) não são uma previsão.** Foram corrigidos precisamente os erros que apareceram neles. Dão a certeza de que as correções funcionam nesses casos, não de que 100% das frases reais passam.
- **O ponto mais fraco era a pessoa** (78% no original), sobretudo nomes depois de "ao", "à" ou sem artigo ("ligar ao Rui"). Passou a ser reconhecido, incluindo "Dra.", "Sr." e dois nomes.
- **Datas, horas e prioridades já eram sólidas** nas frases comuns. Os limites estão nas formas livres.

## Falhas que ficam

| Caso | Frase | Campo | Esperado | Obtido |
|---|---|---|---|---|
| F02 | adiar a reunião de quarta para quinta | data | ["qui, 8 out"] | "qua, 14 out" |
| F09 | marcar reunião com a equipa na próxima segunda | titulo | ["reunião"] | "Equipa na próxima" |
| F11 | reuniao c/ a Rita seg 10h | data | ["seg, 12 out"] | null |

Não corrigidas de propósito: dependem de entender a frase (adiar de quarta *para quinta*), de abreviaturas ("seg") ou de o título ficar legível. São os casos em que um modelo de linguagem deve ganhar ao interpretador por regras.

## O que falta

- **Correr o modo com modelo.** `python3 eval/run.py --llm` envia o mesmo pedido que a demo envia e mede o mesmo conjunto, com latência e tokens. Precisa de `ANTHROPIC_API_KEY` e não foi corrido, por isso **não há ainda comparação entre regras e modelo**.
- **Frases reais.** O conjunto foi escrito por uma pessoa. Convém substituir parte por frases de utilizadores da Tonic.
- **Casos fora do âmbito:** "dia 15", "próxima semana", "daqui a 2 horas" e várias tarefas na mesma frase não são suportados.
