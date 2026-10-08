# Tonic Task Assistant

Protótipo interativo de uma funcionalidade de IA: transforma uma frase em linguagem natural numa tarefa já estruturada (categoria, data, hora, prioridade e responsável), sem formulários nem menus.

Preparado como demonstração para uma proposta apresentada à equipa da Tonic.

**Demo ao vivo:** https://fabiomalves84-sketch.github.io/tonic-ai-demo/

## Experimentar

Não há build nem dependências — é HTML/CSS/JS puro.

- Abre o link do demo ao vivo acima, ou
- Clona o repositório e abre `index.html` diretamente no browser (duplo clique, ou `open index.html` no macOS)

A página está publicada via GitHub Pages diretamente a partir da branch `main` — qualquer push atualiza o site automaticamente, sem passo de build.

Experimenta escrever frases como:

- `marca reunião com o cliente Ferreira amanhã às 15h, prioridade alta`
- `lembra-me de preparar a proposta até sexta`
- `enviar relatório mensal à equipa até fim do dia, urgente`

## Estrutura

```
index.html        — estrutura da página
style.css         — identidade visual (tema claro/escuro automático)
parser.js         — interpretador de frases e pedido ao modelo (partilhado pela página e pela avaliação)
script.js         — interação e desenho da página
eval/casos.json   — 82 frases com o resultado esperado
eval/run.py       — mede o interpretador (local ou com modelo)
eval/RESULTADOS.md — resultados e limites da medição
```

## Como funciona

Por omissão, todo o processamento corre no browser — nenhum texto escrito sai do dispositivo nem é enviado a um servidor.

O interpretador local em `script.js` usa expressões regulares para reconhecer, em português (com ou sem acentos):

- **Data** — hoje, amanhã, depois de amanhã, dias da semana
- **Hora** — formatos `15h`, `15h30` e `15:30`
- **Prioridade** — alta/urgente, média, baixa/sem pressa
- **Categoria** — reunião, chamada, documento, comunicação, ou tarefa genérica
- **Responsável** — nomes próprios após "com o/a", ou palavras-chave como "cliente", "fornecedor", "equipa"

## Modo opcional: IA real (LLM)

A página tem um botão "IA real: desligada" por cima da demo. Ao ligá-lo (depois de configurar uma chave de API da Anthropic), os pedidos passam a ser interpretados por um modelo de linguagem real em vez do interpretador local por regras.

Pontos importantes sobre este modo:

- **Está desligado por omissão.** Sem configurar uma chave, a página funciona exactamente como descrito acima — só local.
- **A chave fica só no teu browser** (`localStorage`), nunca é escrita em nenhum ficheiro do repositório nem passa por nós.
- **Ligar este modo muda a forma como os dados são tratados** — o texto que escreves passa a ser enviado diretamente do browser para a API da Anthropic. Isto é diferente da afirmação "nenhum texto sai do dispositivo" feita acima, que só é válida com o modo desligado.
- **Falha graciosamente.** Se a chamada à IA falhar por qualquer razão (chave inválida, rede em baixo, limite de utilização), a página cai automaticamente para o interpretador local e avisa visualmente — a demo nunca fica bloqueada a meio de uma apresentação.
- Este modo chama a API diretamente do browser (não há servidor próprio), pelo que a chave circula em pedidos de rede visíveis a quem inspecionar o tráfego dessa página — aceitável para uma demonstração pessoal, não para produção.

## Avaliação

O interpretador é medido contra 136 frases em português, com `python3 eval/run.py` (precisa do macOS, que traz o `jsc`). Na medida mais limpa, 23 frases escritas depois das últimas funcionalidades e corridas uma só vez, o interpretador original acertava 4, e o atual acerta 17 (74%). Os números por conjunto, as falhas que ficam e porque os 100% noutros conjuntos não são uma previsão estão em [eval/RESULTADOS.md](eval/RESULTADOS.md).

O modo com modelo também se mede (`python3 eval/run.py --llm`, com `ANTHROPIC_API_KEY`), mas essa comparação ainda não foi feita.

## Limitações conhecidas

Este é um protótipo de demonstração, não um produto final:

- Por omissão o interpretador é baseado em regras (regex), não num modelo de linguagem. Construções menos comuns falham (ver [eval/RESULTADOS.md](eval/RESULTADOS.md)). O modo "IA real" opcional deve resolver mais casos, à custa de deixar de ser 100% local
- Uma frase com várias tarefas ("enviar X hoje e ligar ao Y amanhã") é dividida pelas regras locais; no modo "IA real" cada parte é enviada ao modelo em separado
- Datas: hoje, amanhã, depois de amanhã, dias da semana, "dia 15", "daqui a 3 dias" e "próxima semana" (a segunda-feira seguinte). Horas relativas e meses por extenso não são suportados
- As tarefas ficam guardadas no `localStorage` do browser (últimas 30), não numa conta nem entre dispositivos

## Licença

Todos os direitos reservados. Este repositório contém material de proposta comercial preparado para uma empresa específica — está publicamente visível, mas não está licenciado para reutilização (não inclui uma licença open source de propósito geral). Se quiseres permitir reutilização por terceiros, adiciona um ficheiro `LICENSE` (por exemplo MIT).

## Autor

Fábio Alves — Consultor IA
