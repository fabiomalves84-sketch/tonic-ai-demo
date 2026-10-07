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

  function renderTask(fields){
    var list = document.getElementById('tasklist');
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
