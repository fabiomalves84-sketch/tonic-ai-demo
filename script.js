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

  document.getElementById('submit').addEventListener('click', function(){
    var input = document.getElementById('input');
    var val = input.value.trim();
    if(!val) return;
    renderTask(parseTask(val));
    input.value = '';
    input.focus();
  });
  document.getElementById('input').addEventListener('keydown', function(e){
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
      document.getElementById('submit').click();
    }
  });

  // seed with two example tasks so the panel opens non-empty
  renderTask(parseTask('cria uma tarefa para preparar a apresentação para segunda, prioridade média'));
  renderTask(parseTask('marca reunião com o cliente Sousa amanhã às 9h30, urgente'));
})();
