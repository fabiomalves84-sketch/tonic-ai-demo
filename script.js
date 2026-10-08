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

  var P = window.TonicParser;
  var parseTask = P.parseTask;
  var tasks = [];
  var TASKS_KEY = 'tonic_tasks';
  var MAX_TASKS = 30;

  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function safeRemove(k){ try{ localStorage.removeItem(k); }catch(e){} }

  // Optional real-LLM path: calls the Anthropic API directly from the browser
  // with a key the person configures locally. Falls back to parseTask() on
  // any error, so the demo never breaks mid-presentation.
  async function parseTaskWithLLM(raw){
    var apiKey = safeGet('tonic_api_key');
    if(!apiKey) throw new Error('no key configured');

    var prompt = P.buildLLMPrompt(raw);

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
    return P.normalizeLLMText(text, raw);
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
      return Array.isArray(arr) ? arr.slice(-MAX_TASKS) : null;
    }catch(e){ return null; }
  }

  function saveTasks(){
    safeSet(TASKS_KEY, JSON.stringify(tasks.slice(-MAX_TASKS)));
  }

  function updateClearBtn(){
    var b = document.getElementById('clearTasks');
    if(b) b.hidden = tasks.length === 0;
  }

  function renderTask(fields, skipSave){
    var list = document.getElementById('tasklist');
    if(!skipSave){
      tasks.push(fields);
      saveTasks();
    }
    updateClearBtn();
    var card = document.createElement('div');
    card.className = 'task-card';
    var prClass = fields.priority === 'Alta' ? 'priority-alta' : (fields.priority === 'Média' ? 'priority-media' : '');
    card.innerHTML =
      '<div class="task-title">'+esc(fields.title)+'</div>'+
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

  var toggleVisBtn = document.getElementById('toggleKeyVisibility');
  if(toggleVisBtn){
    toggleVisBtn.addEventListener('click', function(){
      var keyInput = document.getElementById('apiKeyInput');
      var showing = keyInput.type === 'text';
      keyInput.type = showing ? 'password' : 'text';
      toggleVisBtn.textContent = showing ? 'Mostrar' : 'Ocultar';
      toggleVisBtn.setAttribute('aria-label', showing ? 'Mostrar chave' : 'Ocultar chave');
    });
  }

  document.getElementById('submit').addEventListener('click', async function(){
    var input = document.getElementById('input');
    var val = input.value.trim();
    if(!val) return;

    var btn = document.getElementById('submit');
    var statusEl = document.getElementById('aiStatus');
    var useAI = !!safeGet('tonic_api_key') && safeGet('tonic_ai_enabled') === '1';
    var parts = P.splitTasks(val);
    var created = [];
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
      created.push(fields);
    }
    btn.disabled = false;

    // a ordem de inserção mantém a primeira tarefa da frase por cima
    for(var j = created.length - 1; j >= 0; j--){ renderTask(created[j]); }
    if(statusEl){
      var msg = fellBack ? 'IA real indisponível — usei o interpretador local.' : '';
      if(created.length > 1) msg = (msg ? msg + ' ' : '') + created.length + ' tarefas criadas.';
      statusEl.textContent = msg;
    }
    input.value = '';
    input.focus();
  });
  document.getElementById('input').addEventListener('keydown', function(e){
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
      document.getElementById('submit').click();
    }
  });

  updateAIUI();

  var clearBtnTasks = document.getElementById('clearTasks');
  if(clearBtnTasks){
    clearBtnTasks.addEventListener('click', function(){
      tasks = [];
      saveTasks();
      document.getElementById('tasklist').textContent = '';
      updateClearBtn();
    });
  }

  // Tarefas guardadas no browser; na primeira visita abre com dois exemplos para o painel não estar vazio.
  var saved = loadTasks();
  if(saved === null){
    renderTask(parseTask('cria uma tarefa para preparar a apresentação para segunda, prioridade média'));
    renderTask(parseTask('marca reunião com o cliente Sousa amanhã às 9h30, urgente'));
  } else {
    tasks = saved;
    saved.forEach(function(f){ renderTask(f, true); });
  }
  updateClearBtn();
})();
