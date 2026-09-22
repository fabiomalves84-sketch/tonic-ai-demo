# Tonic Task Assistant

Protótipo interativo de uma funcionalidade de IA: transforma uma frase em linguagem natural numa tarefa já estruturada (categoria, data, hora, prioridade e responsável), sem formulários nem menus.

Preparado como demonstração para uma proposta apresentada à equipa da Tonic.

## Experimentar

Não há build nem dependências — é HTML/CSS/JS puro.

1. Clona o repositório
2. Abre `index.html` diretamente no browser (duplo clique, ou `open index.html` no macOS)

Ou publica a pasta em qualquer alojamento de sites estáticos (GitHub Pages, Netlify, Vercel) — não há passo de build a configurar.

Experimenta escrever frases como:

- `marca reunião com o cliente Ferreira amanhã às 15h, prioridade alta`
- `lembra-me de preparar a proposta até sexta`
- `enviar relatório mensal à equipa até fim do dia, urgente`

## Estrutura

```
index.html   — estrutura da página
style.css    — identidade visual (tema claro/escuro automático)
script.js    — lógica de interpretação de linguagem e interação
```

## Como funciona

Todo o processamento corre no browser — nenhum texto escrito sai do dispositivo nem é enviado a um servidor.

O interpretador em `script.js` usa expressões regulares para reconhecer, em português (com ou sem acentos):

- **Data** — hoje, amanhã, depois de amanhã, dias da semana
- **Hora** — formatos `15h`, `15h30` e `15:30`
- **Prioridade** — alta/urgente, média, baixa/sem pressa
- **Categoria** — reunião, chamada, documento, comunicação, ou tarefa genérica
- **Responsável** — nomes próprios após "com o/a", ou palavras-chave como "cliente", "fornecedor", "equipa"

## Limitações conhecidas

Este é um protótipo de demonstração, não um produto final:

- O interpretador é baseado em regras (regex), não num modelo de linguagem — funciona bem nos padrões testados, mas frases muito fora do comum podem não ser reconhecidas corretamente
- A extração de nomes de pessoas exige que estejam escritos com maiúscula inicial
- Não há persistência: as tarefas criadas desaparecem ao recarregar a página

O deck de apresentação completo (contexto, esforço estimado e princípios de tratamento de dados para produção) não faz parte deste repositório — vive à parte, como material de apresentação.

## Licença

Todos os direitos reservados. Este repositório contém material de proposta comercial preparado para uma empresa específica e não está licenciado para reutilização — não inclui uma licença open source de propósito geral. Se quiseres tornar este código reutilizável por terceiros, adiciona um ficheiro `LICENSE` (por exemplo MIT) antes de tornar o repositório público.

## Autor

Fábio Alves — Consultor IA
