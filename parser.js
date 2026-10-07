/*
 * Interpretação de frases em português para tarefas estruturadas.
 * Usado pela página (script.js) e pelo avaliador (eval/run.py), para que
 * o que se mede seja exatamente o que a demo corre.
 */
(function(root){
  var WEEKDAY_PATTERNS = [/domingo/,/segunda/,/ter[cç][ãa]/,/quarta/,/quinta/,/sexta/,/s[áa]bado/];
  var WEEKDAY_INDEX = {domingo:0, segunda:1, terca:2, quarta:3, quinta:4, sexta:5, sabado:6};
  var CATEGORY_SET = ['Reunião','Chamada','Documento','Comunicação','Tarefa'];
  var PRIORITY_SET = ['Alta','Média','Baixa','Normal'];
  var TRIGGERS = [
    'lembra-me de','lembra me de','lembra-me','lembra me',
    'cria uma tarefa para','criar tarefa para','cria tarefa para',
    'marca uma reunião com','marca reunião com','marcar reunião com','marca reunião',
    'agenda uma reunião com','agendar reunião com','agenda reunião com',
    'envia','enviar','liga a','liga ao','liga à','ligar a','ligar ao','ligar à',
    'preparar','prepara','organizar','organiza'
  ];

  // Nome próprio introduzido por preposição ou "com": "ao Rui", "à Marta", "com a Dra. Helena", "com Pedro".
  var NAME = '[A-ZÀ-Ú][a-zà-ú]+';
  var PERSON_RE = new RegExp('(?:^|\\s)(?:ao|à|com o|com a|com|c/\\s*(?:o|a)?|para o|para a)\\s+((?:(?:Dr|Dra|Sr|Sra|Eng|Prof)\\.?ª?\\s+)?' + NAME + '(?:\\s+' + NAME + ')?)');

  function fmtDate(d){
    var days=['dom','seg','ter','qua','qui','sex','sáb'];
    var months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return days[d.getDay()]+', '+d.getDate()+' '+months[d.getMonth()];
  }

  function parseTask(raw, nowArg){
    var text = raw.trim();
    var lower = text.toLowerCase();
    var now = nowArg || new Date();
    var fields = {};

    // priority
    if(/urgente|urgent[ií]ssimo|prioridade alta|prioridade m[aá]xima|m[aá]xima prioridade|n[aã]o pode esperar|para ontem/.test(lower)){ fields.priority = 'Alta'; }
    else if(/prioridade média|prioridade media/.test(lower)){ fields.priority = 'Média'; }
    else if(/prioridade baixa|sem pressa/.test(lower)){ fields.priority = 'Baixa'; }
    else { fields.priority = 'Normal'; }

    // date
    var date = null;
    if(/depois de amanh[ãa]/.test(lower)){ date = new Date(now); date.setDate(date.getDate()+2); }
    else if(/amanh[ãa]/.test(lower)){ date = new Date(now); date.setDate(date.getDate()+1); }
    else if(/\bhoje\b/.test(lower)){ date = new Date(now); }
    else {
      for(var wd=0; wd<7; wd++){
        if(WEEKDAY_PATTERNS[wd].test(lower)){
          var diff = (wd - now.getDay() + 7) % 7;
          if(diff === 0) diff = 7;
          date = new Date(now); date.setDate(date.getDate()+diff);
          break;
        }
      }
    }
    fields.date = date ? fmtDate(date) : null;

    // time
    var timeMatch = lower.match(/(\d{1,2})[:h](\d{1,2})?/);
    if(timeMatch){
      fields.time = timeMatch[1] + 'h' + (timeMatch[2] ? timeMatch[2].padStart(2,'0') : '00');
    } else if(/meio[- ]dia/.test(lower)){
      fields.time = '12h00';
    } else if(/fim do dia/.test(lower)){
      fields.time = 'fim do dia';
    } else if((timeMatch = lower.match(/(?:^|\s)às?\s+(\d{1,2})(?:\s+horas?)?(?:\s+da\s+(tarde|noite))?(?![\dh:])/))){
      var hour = parseInt(timeMatch[1], 10);
      if(timeMatch[2] && hour < 12) hour += 12;
      fields.time = hour + 'h00';
    } else {
      fields.time = null;
    }

    // person / team
    var person = null;
    var pMatch = text.match(PERSON_RE);
    var rMatch = text.match(/\b(cliente|fornecedor|candidato) ([A-ZÀ-Ú][a-zà-ú]+)/);
    if(pMatch){ person = pMatch[1]; }
    else if(/equipa/.test(lower)){ person = 'Equipa'; }
    else if(rMatch){ person = rMatch[1].charAt(0).toUpperCase() + rMatch[1].slice(1) + ' ' + rMatch[2]; }
    else if(/fornecedor/.test(lower)){ person = 'Fornecedor'; }
    else if(/cliente/.test(lower)){ person = 'Cliente'; }
    fields.person = person;

    // category
    var category = 'Tarefa';
    if(/\b(atas?|minutas?)\b/.test(lower)) category = 'Documento';
    else if(/reuni[ãa]o|v[ií]deo ?confer[eê]ncia/.test(lower)) category = 'Reunião';
    else if(/liga|telefon|chamada|\bchamar\b|\bcall\b/.test(lower)) category = 'Chamada';
    else if(/relat[oó]rio|proposta|documento|apresenta[cç][aã]o/.test(lower)) category = 'Documento';
    else if(/e?mail|mensagem|enviar/.test(lower)) category = 'Comunicação';
    fields.category = category;

    // title cleanup
    var title = text;
    var lowerTitle = title.toLowerCase();
    TRIGGERS.sort(function(a,b){return b.length-a.length;});
    for(var t=0;t<TRIGGERS.length;t++){
      var trig = TRIGGERS[t];
      if(lowerTitle.indexOf(trig) === 0){
        title = title.slice(trig.length).trim();
        break;
      }
    }
    title = title.replace(/,?\s*(depois de amanh[ãa]|amanh[ãa]|hoje)(?=[\s,.]|$)/gi,'')
                 .replace(/,?\s*(à|às|as)?\s*\d{1,2}[:h](\d{1,2})?\b/gi,'')
                 .replace(/,?\s*prioridade (alta|média|media|baixa)\b/gi,'')
                 .replace(/,?\s*urgente\b/gi,'')
                 .replace(/,?\s*fim do dia\b/gi,'')
                 .replace(/,?\s*(segunda|ter[cç][ãa]|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?\b/gi,'')
                 .replace(/^(a|à|ao|o|com|para|até|de)\s+/i,'')
                 .replace(/\s+(a|à|ao|o|com|para|até|de)$/i,'')
                 .replace(/^,|,$/g,'')
                 .replace(/\s{2,}/g,' ')
                 .trim();
    if(title.length === 0) title = text;
    if(title === title.toUpperCase() && title !== title.toLowerCase()){
      title = title.toLowerCase();
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);
    fields.title = title;

    return fields;
  }

  function resolveDate(descriptor, nowArg){
    if(!descriptor) return null;
    var now = nowArg || new Date();
    if(descriptor === 'hoje') return fmtDate(now);
    if(descriptor === 'amanha'){ var d1=new Date(now); d1.setDate(d1.getDate()+1); return fmtDate(d1); }
    if(descriptor === 'depois_de_amanha'){ var d2=new Date(now); d2.setDate(d2.getDate()+2); return fmtDate(d2); }
    if(WEEKDAY_INDEX.hasOwnProperty(descriptor)){
      var wd = WEEKDAY_INDEX[descriptor];
      var diff = (wd - now.getDay() + 7) % 7;
      if(diff === 0) diff = 7;
      var d3 = new Date(now); d3.setDate(d3.getDate()+diff);
      return fmtDate(d3);
    }
    return null;
  }

  function formatTimeHHMM(t){
    if(!t) return null;
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    if(!m) return null;
    return m[1] + 'h' + m[2];
  }

  // Pedido enviado ao modelo (modo opcional "IA real").
  function buildLLMPrompt(raw){
    return 'Extrai desta frase em portugues os campos de uma tarefa. ' +
      'Responde APENAS com um objeto JSON valido, sem markdown, sem comentarios, com exatamente estas chaves:\n' +
      '{"title": string curto e limpo da tarefa sem mencoes a data/hora/prioridade, ' +
      '"category": um de "Reunião","Chamada","Documento","Comunicação","Tarefa", ' +
      '"priority": um de "Alta","Média","Baixa","Normal", ' +
      '"relative_date": um de "hoje","amanha","depois_de_amanha","domingo","segunda","terca","quarta","quinta","sexta","sabado", ou null, ' +
      '"time": hora no formato "HH:MM" em 24h se mencionada, ou null, ' +
      '"fim_do_dia": true se a frase disser "fim do dia", caso contrario false, ' +
      '"person": nome de pessoa, "Cliente X", "Fornecedor", "Equipa", ou null}\n\n' +
      'Frase: "' + raw.replace(/"/g,'\\"') + '"';
  }

  // Converte o texto devolvido pelo modelo nos mesmos campos de parseTask.
  // Lança erro se não houver JSON utilizável (o chamador recorre ao interpretador local).
  function normalizeLLMText(text, raw, nowArg){
    if(!text) throw new Error('empty response');
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('no json in response');
    var parsed = JSON.parse(jsonMatch[0]);
    return {
      title: (parsed.title && String(parsed.title).trim()) || (raw.charAt(0).toUpperCase() + raw.slice(1)),
      category: CATEGORY_SET.indexOf(parsed.category) !== -1 ? parsed.category : 'Tarefa',
      priority: PRIORITY_SET.indexOf(parsed.priority) !== -1 ? parsed.priority : 'Normal',
      date: parsed.fim_do_dia ? null : resolveDate(parsed.relative_date, nowArg),
      time: parsed.fim_do_dia ? 'fim do dia' : formatTimeHHMM(parsed.time),
      person: (parsed.person && String(parsed.person).trim()) || null
    };
  }

  var api = {
    parseTask: parseTask,
    fmtDate: fmtDate,
    resolveDate: resolveDate,
    buildLLMPrompt: buildLLMPrompt,
    normalizeLLMText: normalizeLLMText
  };
  root.TonicParser = api;
})(typeof window !== 'undefined' ? window : this);
