(function(){
  try{
    var bubblesEl = document.getElementById('bubbles');
    var n = 14;
    for(var i=0;i<n;i++){
      var b = document.createElement('div');
      b.className='bubble';
      var size = 6 + Math.random()*22;
      b.style.width = size+'px';
      b.style.height = size+'px';
      b.style.left = (Math.random()*96)+'%';
      b.style.animationDuration = (7 + Math.random()*9)+'s';
      b.style.animationDelay = (Math.random()*10)+'s';
      bubblesEl.appendChild(b);
    }
  }catch(e){}

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

  function fmtDate(d){
    var days=['dom','seg','ter','qua','qui','sex','sáb'];
    var months=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return days[d.getDay()]+', '+d.getDate()+' '+months[d.getMonth()];
  }

  function parseTask(raw){
    var text = raw.trim();
    var lower = text.toLowerCase();
    var now = new Date();
    var fields = {};

    // priority
    if(/urgente|prioridade alta|máxima prioridade/.test(lower)){ fields.priority = 'Alta'; }
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
    } else if(/fim do dia/.test(lower)){
      fields.time = 'fim do dia';
    } else {
      fields.time = null;
    }

    // person / team
    var person = null;
    var pMatch = text.match(/com (?:o|a) ([A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)?)/);
    if(pMatch){ person = pMatch[1]; }
    else if(/equipa/.test(lower)){ person = 'Equipa'; }
    else if(/fornecedor/.test(lower)){ person = 'Fornecedor'; }
    else if(/cliente/.test(lower)){
      var cMatch = text.match(/cliente ([A-ZÀ-Ú][a-zà-ú]+)/);
      person = cMatch ? ('Cliente ' + cMatch[1]) : 'Cliente';
    }
    fields.person = person;

    // category
    var category = 'Tarefa';
    if(/reuni[ãa]o/.test(lower)) category = 'Reunião';
    else if(/liga|telefon|chamada/.test(lower)) category = 'Chamada';
    else if(/relat[oó]rio|proposta|documento|apresenta[cç][aã]o/.test(lower)) category = 'Documento';
    else if(/email|mensagem|enviar/.test(lower)) category = 'Comunicação';
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

  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function safeRemove(k){ try{ localStorage.removeItem(k); }catch(e){} }

  function resolveDate(descriptor){
    if(!descriptor) return null;
    var now = new Date();
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

  // Optional real-LLM path: calls the Anthropic API directly from the browser
  // with a key the person configures locally. Falls back to parseTask() on
  // any error, so the demo never breaks mid-presentation.
  async function parseTaskWithLLM(raw){
    var apiKey = safeGet('tonic_api_key');
    if(!apiKey) throw new Error('no key configured');

    var prompt = 'Extrai desta frase em portugues os campos de uma tarefa. ' +
      'Responde APENAS com um objeto JSON valido, sem markdown, sem comentarios, com exatamente estas chaves:\n' +
      '{"title": string curto e limpo da tarefa sem mencoes a data/hora/prioridade, ' +
      '"category": um de "Reunião","Chamada","Documento","Comunicação","Tarefa", ' +
      '"priority": um de "Alta","Média","Baixa","Normal", ' +
      '"relative_date": um de "hoje","amanha","depois_de_amanha","domingo","segunda","terca","quarta","quinta","sexta","sabado", ou null, ' +
      '"time": hora no formato "HH:MM" em 24h se mencionada, ou null, ' +
      '"fim_do_dia": true se a frase disser "fim do dia", caso contrario false, ' +
      '"person": nome de pessoa, "Cliente X", "Fornecedor", "Equipa", ou null}\n\n' +
      'Frase: "' + raw.replace(/"/g,'\\"') + '"';

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if(!res.ok) throw new Error('api error ' + res.status);
    var data = await res.json();
    var text = data && data.content && data.content[0] && data.content[0].text;
    if(!text) throw new Error('empty response');
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('no json in response');
    var parsed = JSON.parse(jsonMatch[0]);

    return {
      title: (parsed.title && String(parsed.title).trim()) || (raw.charAt(0).toUpperCase() + raw.slice(1)),
      category: CATEGORY_SET.indexOf(parsed.category) !== -1 ? parsed.category : 'Tarefa',
      priority: PRIORITY_SET.indexOf(parsed.priority) !== -1 ? parsed.priority : 'Normal',
      date: parsed.fim_do_dia ? null : resolveDate(parsed.relative_date),
      time: parsed.fim_do_dia ? 'fim do dia' : formatTimeHHMM(parsed.time),
      person: (parsed.person && String(parsed.person).trim()) || null
    };
  }

  function fieldHtml(label, value, extraClass){
    if(!value) return '';
    return '<span class="field '+(extraClass||'')+'"><b>'+label+':</b> '+value+'</span>';
  }

  function renderTask(fields){
    var list = document.getElementById('tasklist');
    var card = document.createElement('div');
    card.className = 'task-card';
    var prClass = fields.priority === 'Alta' ? 'priority-alta' : (fields.priority === 'Média' ? 'priority-media' : '');
    card.innerHTML =
      '<div class="task-title">'+fields.title+'</div>'+
      '<div class="task-fields">'+
        fieldHtml('Categoria', fields.category)+
        fieldHtml('Data', fields.date)+
        fieldHtml('Hora', fields.time)+
        fieldHtml('Prioridade', fields.priority, prClass)+
        fieldHtml('Com', fields.person)+
      '</div>';
    list.insertBefore(card, list.firstChild);
  }

  var EXAMPLES = [
    'marca reunião com o cliente Ferreira amanhã às 15h, prioridade alta',
    'lembra-me de preparar a proposta até sexta',
    'liga ao fornecedor amanhã às 10h, prioridade alta',
    'enviar relatório mensal à equipa até fim do dia, urgente'
  ];

  var chipsEl = document.getElementById('chips');
  EXAMPLES.forEach(function(ex){
    var c = document.createElement('button');
    c.className = 'chip mono';
    c.type = 'button';
    c.textContent = ex.length > 44 ? ex.slice(0,44)+'…' : ex;
    c.addEventListener('click', function(){
      document.getElementById('input').value = ex;
      document.getElementById('input').focus();
    });
    chipsEl.appendChild(c);
  });

  function updateAIUI(){
    var hasKey = !!safeGet('tonic_api_key');
    var enabled = hasKey && safeGet('tonic_ai_enabled') === '1';
    var toggle = document.getElementById('aiToggle');
    if(toggle){
      toggle.textContent = enabled ? 'IA real: ligada' : 'IA real: desligada';
      toggle.classList.toggle('is-on', enabled);
    }
    var clearBtn = document.getElementById('clearKeyBtn');
    if(clearBtn) clearBtn.hidden = !hasKey;
  }

  var aiToggleBtn = document.getElementById('aiToggle');
  if(aiToggleBtn){
    aiToggleBtn.addEventListener('click', function(){
      var hasKey = !!safeGet('tonic_api_key');
      if(!hasKey){
        var panel = document.getElementById('aiSettingsPanel');
        if(panel) panel.hidden = false;
        return;
      }
      var enabled = safeGet('tonic_ai_enabled') === '1';
      safeSet('tonic_ai_enabled', enabled ? '0' : '1');
      updateAIUI();
    });
  }

  var settingsLink = document.getElementById('aiSettingsLink');
  if(settingsLink){
    settingsLink.addEventListener('click', function(){
      var panel = document.getElementById('aiSettingsPanel');
      if(panel) panel.hidden = !panel.hidden;
    });
  }

  var saveKeyBtn = document.getElementById('saveKeyBtn');
  if(saveKeyBtn){
    saveKeyBtn.addEventListener('click', function(){
      var keyInput = document.getElementById('apiKeyInput');
      var val = keyInput.value.trim();
      if(!val) return;
      safeSet('tonic_api_key', val);
      safeSet('tonic_ai_enabled', '1');
      keyInput.value = '';
      document.getElementById('aiSettingsPanel').hidden = true;
      updateAIUI();
    });
  }

  var clearKeyBtn = document.getElementById('clearKeyBtn');
  if(clearKeyBtn){
    clearKeyBtn.addEventListener('click', function(){
      safeRemove('tonic_api_key');
      safeRemove('tonic_ai_enabled');
      updateAIUI();
    });
  }

  document.getElementById('submit').addEventListener('click', async function(){
    var input = document.getElementById('input');
    var val = input.value.trim();
    if(!val) return;

    var btn = document.getElementById('submit');
    var statusEl = document.getElementById('aiStatus');
    var useAI = !!safeGet('tonic_api_key') && safeGet('tonic_ai_enabled') === '1';
    var fields = null;

    if(useAI){
      btn.disabled = true;
      if(statusEl) statusEl.textContent = 'A pensar…';
      try{
        fields = await parseTaskWithLLM(val);
      }catch(e){
        fields = null;
      }
      btn.disabled = false;
    }

    if(!fields){
      if(statusEl) statusEl.textContent = useAI ? 'IA real indisponível — usei o interpretador local.' : '';
      fields = parseTask(val);
    } else if(statusEl){
      statusEl.textContent = '';
    }

    renderTask(fields);
    input.value = '';
    input.focus();
  });
  document.getElementById('input').addEventListener('keydown', function(e){
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
      document.getElementById('submit').click();
    }
  });

  updateAIUI();

  // seed with two example tasks so the panel opens non-empty
  renderTask(parseTask('cria uma tarefa para preparar a apresentação para segunda, prioridade média'));
  renderTask(parseTask('marca reunião com o cliente Sousa amanhã às 9h30, urgente'));
})();
