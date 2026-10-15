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

  var backendAvailable = false;
  var aiEnabled = false;
  // Remove credentials persisted by previous versions; never read or migrate them.
  try { localStorage.removeItem('tonic_api_key'); localStorage.removeItem('tonic_ai_enabled'); } catch(e) {}
  var P = window.TonicParser;
  var parseTask = P.parseTask;
  var M = window.TonicTasks;
  var tasks = [];
  var TASKS_KEY = 'tonic_tasks';
  var MAX_TASKS = 30;

  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } }

  // The key stays on the local server; GitHub Pages remains local-parser only.
  async function parseTaskWithLLM(raw){
    var controller = new AbortController();
    var timeout = setTimeout(function(){controller.abort();},12000);
    try{
      var response=await fetch('/api/interpret',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({raw:raw})});
      if(!response.ok) throw new Error('AI unavailable');
      var data=await response.json();
      return P.normalizeLLMText(data.text,raw);
    }finally{clearTimeout(timeout);}
  }

  function esc(v){
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function fieldHtml(label, value, extraClass){
    if(!value) return '';
    return '<span class="field '+(extraClass||'')+'"><b>'+label+':</b> '+esc(value)+'</span>';
  }

  function loadTasks(){
    var raw = safeGet(TASKS_KEY);
    if(raw === null) return null;
    try{
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function(f){ return f && typeof f.title === 'string' && ['category','date','time','priority','person'].every(function(k){ return f[k] == null || typeof f[k] === 'string'; }); }).slice(-MAX_TASKS).map(M.migrate) : null;
    }catch(e){ return null; }
  }

  function saveTasks(){
    var stored = safeSet(TASKS_KEY, JSON.stringify(tasks.slice(-MAX_TASKS)));
    document.querySelector('.empty-hint').textContent = stored ? 'Últimas 30 tarefas guardadas neste browser. Sem sincronização com a Tonic.' : 'Armazenamento indisponível: as tarefas perdem-se ao recarregar esta página.';
  }

  function updateClearBtn(){
    var b = document.getElementById('clearTasks');
    if(b) b.hidden = tasks.length === 0;
  }

  function renderTask(fields, skipSave){
    var list = document.getElementById('tasklist');
    if(!skipSave){
      tasks.push(fields);
      tasks = tasks.slice(-MAX_TASKS);
      saveTasks();
    }
    updateClearBtn();
    var card = document.createElement('div');
    card.className = 'task-card' + (fields.completed ? ' is-complete' : '');
    var prClass = fields.priority === 'Alta' ? 'priority-alta' : (fields.priority === 'Média' ? 'priority-media' : '');
    card.innerHTML =
      '<div class="task-title">'+esc(fields.title)+'</div>'+
      '<div class="task-fields">'+
        fieldHtml('Categoria', fields.category)+
        fieldHtml('Data', fields.dateISO || (fields.date ? fields.date+' (ano por confirmar)' : null))+
        fieldHtml('Fuso', fields.time ? fields.timeZone : null)+
        fieldHtml('Estado', fields.completed ? 'Concluída' : 'Pendente')+
        fieldHtml('Hora', fields.time)+
        fieldHtml('Prioridade', fields.priority, prClass)+
        fieldHtml('Com', fields.person)+
      '</div>';
    var actions = document.createElement('div'); actions.className='task-actions';
    var edit = document.createElement('button'); edit.type='button'; edit.className='btn-secondary'; edit.textContent='Editar'; edit.setAttribute('aria-label','Editar '+fields.title);
    edit.addEventListener('click',function(){showReview([fields], fields);}); actions.appendChild(edit);
    var complete = document.createElement('button'); complete.type='button'; complete.className='btn-secondary'; complete.textContent=fields.completed?'Reabrir':'Concluir'; complete.setAttribute('aria-label',complete.textContent+' '+fields.title);
    complete.addEventListener('click',function(){fields.completed=!fields.completed;saveTasks();redraw();document.getElementById('aiStatus').textContent=fields.completed?'Tarefa concluída.':'Tarefa reaberta.';document.getElementById('tasklist').focus();}); actions.appendChild(complete); card.appendChild(actions);
    list.insertBefore(card, list.firstChild);
    while(list.children.length > MAX_TASKS) list.lastChild.remove();
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
    c.setAttribute('aria-label', ex);
    c.title = ex;
    c.textContent = ex.length > 44 ? ex.slice(0,44)+'…' : ex;
    c.addEventListener('click', function(){
      document.getElementById('input').value = ex;
      document.getElementById('input').focus();
    });
    chipsEl.appendChild(c);
  });

  function updateAIUI(){
    var toggle=document.getElementById('aiToggle');
    toggle.textContent=aiEnabled?'IA real: ligada':'IA real: desligada';
    toggle.setAttribute('aria-pressed',String(aiEnabled));
    toggle.classList.toggle('is-on',aiEnabled);
  }
  document.getElementById('aiToggle').addEventListener('click',function(){
    if(!backendAvailable){document.getElementById('aiStatus').textContent='IA real indisponível neste alojamento. A demonstração continua com o interpretador local.';return;}
    aiEnabled=!aiEnabled; updateAIUI();
    document.getElementById('aiStatus').textContent=aiEnabled?'IA ligada: o texto será enviado à Anthropic e pode gerar custos na conta configurada no servidor.':'Modo local: o texto fica neste dispositivo.';
  });
  if(location.hostname === '127.0.0.1' && location.port === '8766'){
    fetch('/api/status').then(function(r){return r.ok?r.json():null;}).then(function(data){backendAvailable=!!(data && data.available);}).catch(function(){});
  }

  function redraw(){
    document.getElementById('tasklist').textContent='';
    tasks.forEach(function(task){renderTask(task,true);});
    updateClearBtn();
  }

  function showReview(created, existing){
    var review = document.getElementById('review');
    review.textContent = '';
    review.hidden = false;
    var heading = document.createElement('h3');
    heading.textContent = existing ? 'Editar tarefa' : 'Rever antes de guardar';
    review.appendChild(heading);
    var form = document.createElement('form');
    created.forEach(function(fields, i){
      var group = document.createElement('fieldset');
      var legend = document.createElement('legend'); legend.textContent = 'Tarefa ' + (i+1); group.appendChild(legend);
      var warnings=M.warnings(fields,fields.source);
      if(warnings.length){var note=document.createElement('p');note.className='review-note';note.textContent=warnings.join(' ');group.appendChild(note);}
      ['title','category','dateISO','time','timeZone','priority','person'].forEach(function(key, k){
        var label = document.createElement('label');
        label.textContent = ['Título','Categoria','Data completa','Hora','Fuso horário','Prioridade','Com (pessoa envolvida)'][k];
        var control;
        var options = key === 'category' ? ['Reunião','Chamada','Documento','Comunicação','Tarefa'] : key === 'priority' ? ['Alta','Média','Baixa','Normal'] : null;
        control = document.createElement(options ? 'select' : 'input');
        control.name = i + '-' + key;
        if(options) options.forEach(function(value){ var option = document.createElement('option'); option.value = value; option.textContent = value; control.appendChild(option); });
        else { control.maxLength = key === 'title' ? 300 : 100; control.required = key === 'title'; }
        if(key === 'dateISO') control.type='date';
        if(key === 'time') control.type='time';
        if(key === 'timeZone') control.required=true;
        control.value = key === 'time' ? M.clock(fields.time) : (key === 'timeZone' ? fields.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone : fields[key] || '');
        label.appendChild(control); group.appendChild(label);
      });
      form.appendChild(group);
    });
    var save = document.createElement('button'); save.type = 'submit'; save.className = 'btn'; save.textContent = 'Confirmar e guardar'; form.appendChild(save);
    var cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn-secondary'; cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', function(){ review.hidden = true; document.getElementById('input').focus(); }); form.appendChild(cancel);
    form.addEventListener('submit', function(event){
      event.preventDefault();
      var edited = created.map(function(fields, i){
        var result = Object.assign({},fields);
        ['title','category','dateISO','time','timeZone','priority','person'].forEach(function(key){ result[key] = form.elements.namedItem(i+'-'+key).value.trim() || null; });
        result.date = result.dateISO || fields.dateISO ? null : fields.date;
        if(!result.time && fields.time === 'fim do dia') result.time='fim do dia';
        if(result.dateISO && !M.validDate(result.dateISO)) throw new Error('Data inválida');
        return result;
      });
      if(edited.some(function(f){ return !f.title; })) return;
      for(var z=0;z<edited.length;z++){
        try{new Intl.DateTimeFormat('pt-PT',{timeZone:edited[z].timeZone});}catch(e){var zone=form.elements.namedItem(z+'-timeZone');zone.setCustomValidity('Usa um fuso válido, por exemplo Atlantic/Madeira.');zone.reportValidity();zone.addEventListener('input',function(){this.setCustomValidity('');},{once:true});return;}
      }
      if(existing){Object.assign(existing,edited[0]);saveTasks();redraw();}
      else edited.reverse().forEach(function(fields){ renderTask(fields); });
      review.hidden = true;
      document.getElementById('aiStatus').textContent = edited.length + ' tarefa(s) confirmada(s). Consulta o estado de armazenamento abaixo.';
      document.getElementById('input').value = '';
      document.getElementById('input').focus();
    });
    review.appendChild(form); form.querySelector('input').focus();
  }

  document.getElementById('submit').addEventListener('click', async function(){
    var input = document.getElementById('input');
    var val = input.value.trim();
    if(!val || val.length > 2000){
      document.getElementById('aiStatus').textContent = 'Escreve uma tarefa com até 2000 caracteres.';
      input.focus(); return;
    }
    if(document.getElementById('submit').disabled) return;

    var btn = document.getElementById('submit');
    var statusEl = document.getElementById('aiStatus');
    var useAI = backendAvailable && aiEnabled;
    var parts = P.splitTasks(val);
    if(parts.length > 10){ statusEl.textContent = 'Divide o pedido em grupos de até 10 tarefas.'; return; }
    var created = [];
    btn.disabled = true;
    input.setAttribute('aria-busy', 'true');
    var fellBack = false;

    if(useAI){
      btn.disabled = true;
      if(statusEl) statusEl.textContent = 'A pensar…';
    }
    for(var i = 0; i < parts.length; i++){
      var fields = null;
      if(useAI){
        try{
          fields = await parseTaskWithLLM(parts[i]);
        }catch(e){
          fields = null;
        }
      }
      if(!fields){
        if(useAI) fellBack = true;
        fields = parseTask(parts[i]);
      }
      fields=M.migrate(fields);
      fields.source=parts[i];
      created.push(fields);
    }
    btn.disabled = false;

    input.removeAttribute('aria-busy');
    showReview(created);
    if(statusEl){
      var msg = fellBack ? 'IA real indisponível — usei o interpretador local.' : 'Interpretação concluída. Revê os campos antes de guardar.';
      if(created.length > 1) msg = (msg ? msg + ' ' : '') + created.length + ' tarefas para rever.';
      statusEl.textContent = msg;
    }
    // Keep the source text available while reviewing.
  });
  document.getElementById('input').addEventListener('keydown', function(e){
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
      document.getElementById('submit').click();
    }
  });

  ['JSON','CSV'].forEach(function(format){
    document.getElementById('export'+format).addEventListener('click',function(){
      if(!tasks.length){document.getElementById('aiStatus').textContent='Ainda não há tarefas para exportar.';return;}
      var text=format==='JSON'?JSON.stringify({version:2,tasks:tasks},null,2):M.csv(tasks);
      var url=URL.createObjectURL(new Blob([text],{type:format==='JSON'?'application/json;charset=utf-8':'text/csv;charset=utf-8'}));
      var link=document.createElement('a');link.href=url;link.download='tonic-tarefas.'+format.toLowerCase();document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
      document.getElementById('aiStatus').textContent='Exportação '+format+' preparada.';
    });
  });
  updateAIUI();

  var clearBtnTasks = document.getElementById('clearTasks');
  if(clearBtnTasks){
    clearBtnTasks.addEventListener('click', function(){
      if(!window.confirm('Limpar as tarefas guardadas neste browser?')) return;
      tasks = [];
      document.getElementById('review').hidden=true;
      saveTasks();
      document.getElementById('tasklist').textContent = '';
      updateClearBtn();
    });
  }

  // Preserve stored tasks; first visit starts empty.
  var saved = loadTasks();
  if(saved === null){
    document.getElementById('aiStatus').textContent = 'Modo local. Escolhe um exemplo ou escreve a tua primeira tarefa.';
  } else {
    tasks = saved;
    saved.forEach(function(f){ renderTask(f, true); });
  }
  updateClearBtn();
})();
