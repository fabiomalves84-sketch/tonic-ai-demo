#!/usr/bin/env python3
"""
Avalia o interpretador de tarefas da demo contra eval/casos.json.

  python3 eval/run.py                  interpretador local (regras), o que a demo usa por omissão
  python3 eval/run.py --llm            modelo real, com o mesmo pedido que a demo envia
  python3 eval/run.py --write FICHEIRO grava o relatório em Markdown
  python3 eval/run.py --parser FICH.js mede outra versão do interpretador

O interpretador corre em JavaScriptCore (o motor do Safari), através do jsc que vem com o macOS,
por isso o código medido é exatamente o de parser.js. O modo --llm precisa de ANTHROPIC_API_KEY.
"""
import json, os, subprocess, sys, tempfile, time, unicodedata, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
MODEL = "claude-haiku-4-5-20251001"  # o mesmo modelo que a demo usa no modo "IA real"
CAMPOS = ["categoria", "prioridade", "data", "hora", "pessoa", "titulo"]


PARSER = ROOT / "parser.js"


def jsc(ref, body):
    """Corre JavaScript com o parser carregado e devolve o JSON impresso na última linha."""
    code = (
        f"load({json.dumps(str(PARSER))});\n"
        "var P = TonicParser;\n"
        f"var NOW = new Date({json.dumps(ref)});\n"
        "if (isNaN(NOW.getTime())) { throw new Error('data de referencia invalida'); }\n"
        + body
    )
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(code)
        path = f.name
    try:
        out = subprocess.run([JSC, path], capture_output=True, text=True, timeout=60)
    finally:
        os.unlink(path)
    if out.returncode != 0:
        sys.exit("Erro no jsc:\n" + out.stdout + out.stderr)
    return json.loads(out.stdout.strip().splitlines()[-1])


def sem_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def como_lista(v):
    return v if isinstance(v, list) else [v]


def pontuar(esp, obt, datas_esperadas):
    r = {}
    r["categoria"] = obt["category"] in como_lista(esp["categoria"])
    r["prioridade"] = obt["priority"] == esp["prioridade"]
    r["data"] = obt["date"] in datas_esperadas
    hora = lambda h: None if h is None else h.replace(" ", "").lower()
    r["hora"] = hora(obt["time"]) == hora(esp["hora"])
    pessoas = [p for p in como_lista(esp["pessoa"])]
    r["pessoa"] = obt["person"] in pessoas
    titulo = sem_acentos(obt["title"] or "")
    r["titulo"] = all(sem_acentos(k) in titulo for k in esp["titulo_contem"])
    return r


def chamar_modelo(prompt, chave):
    corpo = json.dumps({"model": MODEL, "max_tokens": 300,
                        "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=corpo, method="POST",
        headers={"content-type": "application/json", "x-api-key": chave,
                 "anthropic-version": "2023-06-01"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=60) as r:
        d = json.load(r)
    return d["content"][0]["text"], time.time() - t0, d.get("usage", {})


def verificar_ambiente(ref):
    """Falha cedo se as datas não se resolverem, para a avaliação não passar por defeito."""
    v = jsc(ref, 'print(JSON.stringify([P.resolveDate("amanha", NOW), P.resolveDate("sexta", NOW), P.parseTask("ligar amanhã", NOW).date]));')
    if "NaN" in " ".join(map(str, v)) or v[0] != v[2] or v[0] == v[1]:
        sys.exit(f"Verificação do ambiente falhou: {v}")


def desdobrar(casos):
    """Uma frase com várias tarefas passa a várias unidades de medição (P01a, P01b, ...)."""
    unidades = []
    for c in casos:
        if "partes" in c:
            for i, esp in enumerate(c["partes"]):
                unidades.append({"id": c["id"] + "abcdefgh"[i], "grupo": c["grupo"], "texto": c["texto"],
                                 "esperado": esp, "parte": i, "de": len(c["partes"])})
        else:
            unidades.append({**c, "parte": None})
    return unidades


VAZIO = {"category": None, "priority": None, "date": None, "time": None, "person": None, "title": ""}


def correr(casos, ref, usar_llm):
    verificar_ambiente(ref)
    if usar_llm:
        casos = [c for c in casos if "partes" not in c]  # o pedido ao modelo devolve uma só tarefa
    unidades = desdobrar(casos)
    textos = [u["texto"] for u in unidades]
    datas = jsc(ref, ("var C = %s;\n"
                      "print(JSON.stringify(C.map(function(c){ return c.map(function(d){ return d === null ? null : P.resolveDate(d, NOW); }); })));"
                      % json.dumps([como_lista(u["esperado"]["data"]) for u in unidades])))
    meta = {"modo": "llm" if usar_llm else "local", "recorreu_ao_local": 0, "latencias": [], "tokens_in": 0, "tokens_out": 0}
    if not usar_llm:
        # Para cada frase pede todas as tarefas; sem parseTasks (versões antigas) devolve só a primeira.
        todas = jsc(ref, ("var T = %s;\n"
                          "print(JSON.stringify(T.map(function(t){ return P.parseTasks ? P.parseTasks(t, NOW) : [P.parseTask(t, NOW)]; })));"
                          % json.dumps(textos)))
        obtidos = []
        for u, lista in zip(unidades, todas):
            if u["parte"] is None:
                obtidos.append(lista[0])
            else:
                obtidos.append(lista[u["parte"]] if len(lista) == u["de"] else dict(VAZIO))
        return unidades, obtidos, datas, meta
    chave = os.environ.get("ANTHROPIC_API_KEY")
    if not chave:
        sys.exit("Defina ANTHROPIC_API_KEY para usar --llm.")
    prompts = jsc(ref, ("var T = %s;\nprint(JSON.stringify(T.map(function(t){ return P.buildLLMPrompt(t); })));" % json.dumps(textos)))
    respostas = []
    for p in prompts:
        try:
            txt, seg, uso = chamar_modelo(p, chave)
            meta["latencias"].append(seg)
            meta["tokens_in"] += uso.get("input_tokens", 0)
            meta["tokens_out"] += uso.get("output_tokens", 0)
            respostas.append(txt)
        except (urllib.error.URLError, KeyError, TimeoutError):
            respostas.append(None)
    obtidos = jsc(ref, ("var T = %s, R = %s;\n"
                        "print(JSON.stringify(T.map(function(t,i){ try { var o = P.normalizeLLMText(R[i], t, NOW); o._llm = true; return o; } catch(e) { var l = P.parseTask(t, NOW); l._llm = false; return l; } })));"
                        % (json.dumps(textos), json.dumps(respostas))))
    meta["recorreu_ao_local"] = sum(1 for o in obtidos if not o.get("_llm"))
    return unidades, obtidos, datas, meta


def relatorio(casos, obtidos, datas, meta, ref, total_frases):
    linhas, falhas = [], []
    por_grupo = {}
    for c, o, d in zip(casos, obtidos, datas):  # casos = unidades de medição
        r = pontuar(c["esperado"], o, d)
        g = por_grupo.setdefault(c["grupo"], {"n": 0, "ok": {k: 0 for k in CAMPOS}, "completos": 0})
        g["n"] += 1
        for k in CAMPOS:
            g["ok"][k] += r[k]
        g["completos"] += all(r.values())
        for k in CAMPOS:
            if not r[k]:
                esp = {"categoria": c["esperado"]["categoria"], "prioridade": c["esperado"]["prioridade"],
                       "data": d, "hora": c["esperado"]["hora"], "pessoa": c["esperado"]["pessoa"],
                       "titulo": c["esperado"]["titulo_contem"]}[k]
                obt = {"categoria": o["category"], "prioridade": o["priority"], "data": o["date"],
                       "hora": o["time"], "pessoa": o["person"], "titulo": o["title"]}[k]
                falhas.append((c["id"], c["texto"], k, esp, obt))
    todos = {"n": 0, "ok": {k: 0 for k in CAMPOS}, "completos": 0}
    for nome, g in por_grupo.items():
        if nome in ("dificil", "datas", "varias"):
            continue
        todos["n"] += g["n"]
        todos["completos"] += g["completos"]
        for k in CAMPOS:
            todos["ok"][k] += g["ok"][k]
    ordem = ["todos"] + [k for k in por_grupo if k not in ("dificil", "datas", "varias")] + [k for k in ("datas", "varias", "dificil") if k in por_grupo]
    por_grupo = {"todos": todos, **por_grupo}
    por_grupo = {k: por_grupo[k] for k in ordem}

    pct = lambda a, b: f"{100 * a / b:.0f}%"
    out = []
    out.append(f"Modo: **{'modelo ' + MODEL if meta['modo'] == 'llm' else 'interpretador local (regras)'}** · data de referência {ref} · {todos['n']} frases de medição + {len(casos) - todos['n']} de funcionalidades novas e frases difíceis\n")
    out.append("| Conjunto | Frases | Categoria | Prioridade | Data | Hora | Pessoa | Título | Frase totalmente certa |")
    out.append("|---|---|---|---|---|---|---|---|---|")
    for nome, g in por_grupo.items():
        out.append(f"| {nome} | {g['n']} | " + " | ".join(pct(g["ok"][k], g["n"]) for k in CAMPOS) + f" | {pct(g['completos'], g['n'])} ({g['completos']}/{g['n']}) |")
    if meta["modo"] == "llm":
        lat = sorted(meta["latencias"])
        if lat:
            out.append(f"\nLatência por pedido: mediana {lat[len(lat)//2]:.1f} s, máxima {lat[-1]:.1f} s. "
                       f"Tokens: {meta['tokens_in']} de entrada, {meta['tokens_out']} de saída. "
                       f"Recorreu ao interpretador local em {meta['recorreu_ao_local']} frases.")
    out.append("\n### Falhas\n")
    out.append("| Caso | Frase | Campo | Esperado | Obtido |")
    out.append("|---|---|---|---|---|")
    for i, t, k, e, ob in falhas:
        out.append(f"| {i} | {t} | {k} | {json.dumps(e, ensure_ascii=False)} | {json.dumps(ob, ensure_ascii=False)} |")
    return "\n".join(out) + "\n", por_grupo


def main():
    args = sys.argv[1:]
    usar_llm = "--llm" in args
    destino = args[args.index("--write") + 1] if "--write" in args else None
    if "--parser" in args:
        global PARSER
        PARSER = Path(args[args.index("--parser") + 1]).resolve()
    cfg = json.load(open(ROOT / "eval" / "casos.json", encoding="utf-8"))
    casos = cfg["casos"]
    unidades, obtidos, datas, meta = correr(casos, cfg["data_referencia"], usar_llm)
    texto, _ = relatorio(unidades, obtidos, datas, meta, cfg["data_referencia"], len(casos))
    print(texto)
    if destino:
        Path(destino).write_text(texto, encoding="utf-8")


if __name__ == "__main__":
    main()
