/* Pure task lifecycle helpers, shared by the UI and regression tests. */
(function(root){
  function iso(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  function validDate(value){
    if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var d = new Date(value+'T12:00:00'); return !isNaN(d) && iso(d) === value;
  }
  function clock(value){var m=/^(\d{1,2})[h:](\d{2})$/.exec(value || '');return m && +m[1]<24 && +m[2]<60 ? m[1].padStart(2,'0')+':'+m[2] : '';}
  function migrate(task){
    var copy=Object.assign({},task);
    copy.dateISO=validDate(copy.dateISO) ? copy.dateISO : null;
    copy.completed=copy.completed === true;
    copy.timeZone=typeof copy.timeZone === 'string' ? copy.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone;
    return copy;
  }
  function warnings(task,raw){
    var result=[];
    if(!task.dateISO) result.push(task.date ? 'Data antiga sem ano confirmado: escolhe a data completa.' : 'Não foi identificada uma data. Podes deixar a tarefa sem prazo.');
    if(/\b(talvez|algum dia|logo|mais tarde|quando puder|ou)\b/i.test(raw || '')) result.push('A frase pode ter mais de uma interpretação. Confirma os campos.');
    if(/\d{1,2}[h:]\d{0,2}/i.test(raw || '') && !clock(task.time)) result.push('A hora não foi reconhecida como válida. Confirma-a.');
    if(task.time === 'fim do dia') result.push('Fim do dia não define uma hora exata. Preenche a hora se precisares de um prazo preciso.');
    if(task.person) result.push('“Com” indica a pessoa envolvida; não atribui automaticamente a tarefa.');
    return result;
  }
  function csv(tasks){
    function cell(value){var s=String(value == null ? '' : value);if(/^[\s]*[=+@\-]/.test(s)) s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
    var rows=[['Título','Categoria','Data ISO','Data antiga','Hora','Fuso horário','Prioridade','Com','Estado']];
    tasks.slice().reverse().forEach(function(t){rows.push([t.title,t.category,t.dateISO,t.dateISO?'':t.date,t.time,t.timeZone,t.priority,t.person,t.completed?'Concluída':'Pendente']);});
    return '\uFEFF'+rows.map(function(row){return row.map(cell).join(',');}).join('\r\n');
  }
  root.TonicTasks={iso:iso,validDate:validDate,clock:clock,migrate:migrate,warnings:warnings,csv:csv};
})(typeof window !== 'undefined' ? window : this);
