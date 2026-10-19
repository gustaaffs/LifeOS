// ==========================================================================
// LIFE OS — TASKS & HOUSEHOLD MODULE (MÓDULO CASA & TAREFAS)
// ==========================================================================

let currentCasaTab = 'hoje';

function initTasksModule() {
  renderTasksView();
}

function switchCasaTab(tab) {
  currentCasaTab = tab;
  document.querySelectorAll('.casa-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderTasksView();
}

function renderTasksView() {
  const container = document.getElementById('tasksTabContent');
  if (!container) return;

  const today = new Date().toISOString().slice(0, 10);
  const tasks = state.tasks || [];
  const checks = state.taskChecks || {};

  // Calcula tarefas de hoje
  const todayDow = new Date().getDay(); // 0 domingo, 1 segunda, ...
  const todayTasks = tasks.filter(t => {
    if (t.freq === 'once') return t.date === today;
    if (t.freq === 'daily') return true;
    if (t.freq === 'weekly') {
      if (Array.isArray(t.days)) return t.days.includes(todayDow);
      return true;
    }
    return true;
  });

  const doneCount = todayTasks.filter(t => !!checks[today + '_' + t.id]).length;
  const pendingCount = todayTasks.length - doneCount;

  container.innerHTML = `
    <!-- Top Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="surface-card p-5 border-l-4 border-l-emerald-400">
        <span class="text-xs font-mono uppercase text-slate-400">Tarefas de Hoje</span>
        <div class="text-2xl font-bold text-white mt-1">${todayTasks.length} tarefas</div>
        <div class="text-xs text-slate-500 mt-1">${doneCount} concluídas / ${pendingCount} pendentes</div>
      </div>

      <div class="surface-card p-5 border-l-4 border-l-sky-400">
        <span class="text-xs font-mono uppercase text-slate-400">Progresso do Dia</span>
        <div class="text-2xl font-bold text-sky-400 mt-1">
          ${todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 100}%
        </div>
        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
          <div class="bg-emerald-400 h-1.5 rounded-full" style="width: ${todayTasks.length > 0 ? (doneCount / todayTasks.length) * 100 : 100}%"></div>
        </div>
      </div>

      <div class="surface-card p-5 flex items-center justify-between">
        <div>
          <span class="text-xs font-mono uppercase text-slate-400">Organização da Casa</span>
          <div class="text-sm font-semibold text-white mt-1">Dividido por casal</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openNewTaskModal()">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Nova Tarefa
        </button>
      </div>
    </div>

    <!-- Lista de Tarefas -->
    <div class="surface-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i data-lucide="check-square" class="w-4 h-4 text-emerald-400"></i> ${currentCasaTab === 'hoje' ? 'Tarefas para Hoje' : 'Todas as Tarefas Cadastradas'}
        </h4>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm text-xs ${currentCasaTab === 'hoje' ? 'text-amber-400' : 'text-slate-400'}" onclick="switchCasaTab('hoje')">Hoje</button>
          <button class="btn btn-ghost btn-sm text-xs ${currentCasaTab === 'todas' ? 'text-amber-400' : 'text-slate-400'}" onclick="switchCasaTab('todas')">Todas</button>
        </div>
      </div>

      ${(currentCasaTab === 'hoje' ? todayTasks : tasks).length === 0 ? `
        <div class="text-center py-12 text-slate-500 text-sm">
          Nenhuma tarefa cadastrada. Clique no botão acima para adicionar!
        </div>
      ` : `
        <div class="space-y-3">
          ${(currentCasaTab === 'hoje' ? todayTasks : tasks).map(t => {
            const key = today + '_' + t.id;
            const isDone = !!checks[key];
            const badgeClass = t.owner === 'gus' ? 'badge-gus' : t.owner === 'maria' ? 'badge-maria' : 'badge-casal';
            const ownerName = t.owner === 'gus' ? state.name1 : t.owner === 'maria' ? state.name2 : 'Casal';
            return `
              <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition">
                <div class="flex items-center gap-3">
                  <div class="task-check-box ${isDone ? 'checked' : ''}" onclick="toggleTaskCheck('${key}')">
                    ${isDone ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                  </div>
                  <div>
                    <span class="font-medium text-sm text-white ${isDone ? 'line-through text-slate-500' : ''}">${t.name}</span>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="badge ${badgeClass}">${ownerName}</span>
                      ${t.time ? `<span class="text-xs text-slate-500 font-mono">🕒 ${t.time}</span>` : ''}
                      <span class="text-xs text-slate-500">${t.freq === 'weekly' ? 'Semanal' : t.freq === 'daily' ? 'Diária' : 'Pontual'}</span>
                    </div>
                  </div>
                </div>

                <button class="btn btn-ghost btn-sm text-slate-500 hover:text-rose-400" onclick="deleteTask('${t.id}')">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function toggleTaskCheck(key) {
  if (!state.taskChecks) state.taskChecks = {};
  state.taskChecks[key] = !state.taskChecks[key];
  saveState();
  renderTasksView();
}

function openNewTaskModal() {
  const name = prompt('Nome da tarefa (ex: Lavar louça, Compras de mercado):');
  if (!name) return;
  const owner = prompt(`Responsável (${state.name1} = gus, ${state.name2} = maria, Ambos = casal):`, 'casal') || 'casal';
  const time = prompt('Horário opcional (ex: 08:30 ou 19:00):', '') || '';

  if (!state.tasks) state.tasks = [];
  state.tasks.push({
    id: uid(),
    name,
    owner: owner.toLowerCase().trim(),
    freq: 'daily',
    time,
    note: ''
  });

  saveState();
  showToast('Tarefa adicionada!', 'success');
  renderTasksView();
}

function deleteTask(id) {
  if (confirm('Excluir esta tarefa?')) {
    state.tasks = (state.tasks || []).filter(t => t.id !== id);
    saveState();
    showToast('Tarefa excluída', 'info');
    renderTasksView();
  }
}

