# Tonic Task Assistant

Demonstração em português de uma proposta à equipa Tonic: transformar texto natural em tarefas que o utilizador revê, corrige, guarda e acompanha. Sem integração real com o board.

Demo: https://fabiomalves84-sketch.github.io/tonic-ai-demo/

## Experimentar

Sem build nem dependências no frontend. Abrir `index.html` ou servir a pasta por HTTP. GitHub Pages usa apenas o interpretador local: o texto não é enviado a fornecedores de IA.

1. Escolher um exemplo ou escrever uma frase (até 2000 caracteres e 10 tarefas).
2. Rever título, categoria, data completa, hora, fuso, prioridade e pessoa envolvida. Os avisos destacam alguns casos ambíguos; não são uma estimativa de confiança do modelo.
3. Confirmar para guardar. Depois é possível editar, concluir e reabrir. As últimas 30 tarefas persistem neste browser.
4. Exportar JSON (inclui texto original) ou CSV. O CSV protege células que parecem fórmulas.

As tarefas antigas mantêm a data original marcada com «ano por confirmar»; nunca se inventa o ano durante a migração. Datas novas usam ISO YYYY-MM-DD. As horas são locais ao fuso IANA indicado; alterar o fuso não converte a hora nem reinterpreta a frase. Não há lembretes nem agendamento de notificações.

## IA opcional com servidor local

A chave deixou de ser introduzida ou usada no frontend. A versão anterior podia guardar chaves no browser; esta versão remove essas entradas antigas ao carregar.

Para testar IA real, definir `ANTHROPIC_API_KEY` no ambiente do terminal (nunca num ficheiro público ou commit) e executar:

```
python3 server.py
```

Abrir **http://127.0.0.1:8766** e ligar «IA real». Só então o texto é enviado à Anthropic e podem existir custos na conta configurada. `ANTHROPIC_API_KEY` ausente mantém a IA indisponível. O modelo configurado é `claude-haiku-4-5-20251001`; a disponibilidade deve ser validada com a conta do utilizador.

O servidor é exclusivamente local, ligado a 127.0.0.1: verifica Host/Origin, limita corpo e tamanho de texto, aceita uma chamada de cada vez, impõe intervalo mínimo e timeout e serve apenas os ficheiros permitidos. Não regista conteúdo, cabeçalhos ou respostas do fornecedor. Falhas fazem o frontend usar regras locais e avisar. Os testes usam fornecedor simulado, sem consumo de tokens.

**Não publicar este servidor de desenvolvimento.** Um serviço público requer alojamento próprio, HTTPS, autenticação, limites e orçamento por utilizador, retenção/privacidade e monitorização. GitHub Pages não executa este backend. Processos ou pessoas com acesso ao mesmo computador não são isolados por estas proteções locais.

## Testes

A partir da pasta do projeto, no macOS:

```
python3 eval/run.py
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc eval/regression.js
python3 eval/test_server.py
```

- Avaliação existente: 107/113 casos principais totalmente corretos; conjunto novo3: 17/23. Mais 32 unidades nos grupos datas/varias/dificil corretas. Estes conjuntos não representam toda a linguagem real.
- 20 testes de regressão: datas/horas, respostas LLM, ano novo, bissextos, migração, ambiguidade e CSV.
- 7 testes HTTP: página, CSP, ficheiros privados, Host/Origin, falta de chave, entrada inválida e contrato do fornecedor simulado.

## Limitações

O parser por regras ainda falha em algumas pessoas, categorias e frases com várias tarefas. Os avisos são heurísticos e não detetam todas as ambiguidades. Uma pessoa identificada não equivale à atribuição de um responsável. «Fim do dia» não define hora exata e é preservado até ser substituído por uma hora.

Dados locais não são cifrados, não sincronizam e podem perder-se ao limpar o browser. Exportações contêm dados das tarefas; guardar em local apropriado. O limite de 30 descarta os registos mais antigos.

Foram melhorados labels, foco, contraste do cabeçalho claro/escuro, tamanhos dos controlos, reduced-motion e responsividade. Não existe certificação WCAG nem medição de Core Web Vitals. Chamadas reais ao fornecedor não foram executadas nesta revisão.

## Estrutura

- `index.html`, `style.css`, `script.js`: interface e interação.
- `parser.js`: regras e normalização da resposta LLM.
- `task-model.js`: datas, migração, avisos e exportação CSV.
- `server.py`: backend exclusivamente local e opcional.
- `eval/`: avaliação e regressões.

## Autor e licença

Fábio Alves — Consultor IA. Todos os direitos reservados. Material de proposta comercial para uma empresa específica; não inclui licença geral de reutilização.
