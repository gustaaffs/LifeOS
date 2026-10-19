// ==========================================================================
// LIFE OS — STUDY & POMODORO MODULE (ESTUDOS & FOCO)
// ==========================================================================

let pomodoroTimer = null;
let pomodoroMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
let pomodoroSecondsLeft = 25 * 60;
let pomodoroTotalSeconds = 25 * 60;
let pomodoroIsRunning = false;
let pomodoroSelectedPerson = 'gus';

function initStudyModule() {
  renderStudyView();
}

function switchPomodoroMode(mode) {
  pausePomodoro();
  pomodoroMode = mode;
  if (mode === 'focus') {
    pomodoroTotalSeconds = 25 * 60;
  } else if (mode === 'shortBreak') {
    pomodoroTotalSeconds = 5 * 60;
  } else if (mode === 'longBreak') {
    pomodoroTotalSeconds = 15 * 60;
  }
  pomodoroSecondsLeft = pomodoroTotalSeconds;
  updatePomodoroDisplay();
  renderStudyView();
}

function startPomodoro() {
  if (pomodoroIsRunning) return;
  pomodoroIsRunning = true;
  pomodoroTimer = setInterval(() => {
    if (pomodoroSecondsLeft > 0) {
      pomodoroSecondsLeft--;
      updatePomodoroDisplay();
    } else {
      pausePomodoro();
      showToast('Tempo de foco concluído! 🎉 Bom trabalho!', 'success');
      // Toca um beep suave se suportado
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    }
  }, 1000);
  renderStudyView();
}

function pausePomodoro() {
  pomodoroIsRunning = false;
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
  renderStudyView();
}

function resetPomodoro() {
  pausePomodoro();
  pomodoroSecondsLeft = pomodoroTotalSeconds;
  updatePomodoroDisplay();
  renderStudyView();
}

function updatePomodoroDisplay() {
  const m = Math.floor(pomodoroSecondsLeft / 60);
  const s = pomodoroSecondsLeft % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  
  const timerEl = document.getElementById('pomodoroTimeDisplay');
  if (timerEl) timerEl.textContent = timeStr;

  // Atualiza círculo de progresso
  const circle = document.getElementById('pomodoroProgressCircle');
  if (circle) {
    const circumference = 2 * Math.PI * 45; // r=45
    const pct = pomodoroSecondsLeft / pomodoroTotalSeconds;
    circle.style.strokeDashoffset = circumference * (1 - pct);
  }
}

function renderStudyView() {
  const container = document.getElementById('studyTabContent');
  if (!container) return;

  const study = state.study || { gus: { sessions: [] }, maria: { sessions: [] } };
  const gusSessions = study.gus?.sessions || [];
  const mariaSessions = study.maria?.sessions || [];

  const gusTotalHours = gusSessions.reduce((acc, s) => acc + (Number(s.hours) || 0), 0);
  const mariaTotalHours = mariaSessions.reduce((acc, s) => acc + (Number(s.hours) || 0), 0);

  const m = Math.floor(pomodoroSecondsLeft / 60);
  const s = pomodoroSecondsLeft % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const circumference = 2 * Math.PI * 45;
  const strokeOffset = circumference * (1 - (pomodoroSecondsLeft / pomodoroTotalSeconds));

  container.innerHTML = `
    <!-- Top KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="surface-card p-5 border-l-4 border-l-sky-400">
        <span class="text-xs font-mono uppercase text-slate-400">Horas de ${state.name1}</span>
        <div class="text-2xl font-bold text-sky-400 mt-1">${gusTotalHours.toFixed(1)}h</div>
        <div class="text-xs text-slate-500 mt-1">${gusSessions.length} sessões registradas</div>
      </div>

      <div class="surface-card p-5 border-l-4 border-l-pink-400">
        <span class="text-xs font-mono uppercase text-slate-400">Horas de ${state.name2}</span>
        <div class="text-2xl font-bold text-pink-400 mt-1">${mariaTotalHours.toFixed(1)}h</div>
        <div class="text-xs text-slate-500 mt-1">${mariaSessions.length} sessões registradas</div>
      </div>

      <div class="surface-card p-5 flex items-center justify-between">
        <div>
          <span class="text-xs font-mono uppercase text-slate-400">Total Conjunto</span>
          <div class="text-2xl font-bold text-white mt-1">${(gusTotalHours + mariaTotalHours).toFixed(1)}h</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openManualStudySessionModal()">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Lançar Horas
        </button>
      </div>
    </div>

    <!-- Pomodoro & Sessões Recentes -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Cronômetro Pomodoro -->
      <div class="surface-card p-6 flex flex-col items-center justify-center text-center">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
          <i data-lucide="timer" class="w-4 h-4 text-amber-400"></i> Timer de Foco Pomodoro
        </h4>

        <!-- Botões de Modo -->
        <div class="flex items-center gap-2 bg-slate-900 p-1 rounded-xl mb-6 border border-slate-800">
          <button class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroMode === 'focus' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400'}" onclick="switchPomodoroMode('focus')">Foco (25m)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroMode === 'shortBreak' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400'}" onclick="switchPomodoroMode('shortBreak')">Pausa Curta (5m)</button>
          <button class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroMode === 'longBreak' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400'}" onclick="switchPomodoroMode('longBreak')">Pausa Longa (15m)</button>
        </div>

        <!-- Círculo e Contador -->
        <div class="relative w-48 h-48 flex items-center justify-center mb-6">
          <svg class="w-full h-full pomodoro-ring" viewBox="0 0 100 100">
            <circle class="pomodoro-circle-bg" cx="50" cy="50" r="45" fill="none" stroke-width="6"></circle>
            <circle id="pomodoroProgressCircle" class="pomodoro-circle-progress" cx="50" cy="50" r="45" fill="none" stroke-width="6" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}"></circle>
          </svg>
          <div class="absolute flex flex-col items-center">
            <span id="pomodoroTimeDisplay" class="text-4xl font-mono font-extrabold text-white tracking-wider">${timeStr}</span>
            <span class="text-[11px] text-slate-500 uppercase mt-1 tracking-widest">${pomodoroIsRunning ? 'Em Foco...' : 'Pausado'}</span>
          </div>
        </div>

        <!-- Controles de Ação -->
        <div class="flex items-center gap-3 mb-6">
          ${!pomodoroIsRunning ? `
            <button class="btn btn-primary px-6" onclick="startPomodoro()">
              <i data-lucide="play" class="w-4 h-4"></i> Iniciar
            </button>
          ` : `
            <button class="btn btn-secondary px-6" onclick="pausePomodoro()">
              <i data-lucide="pause" class="w-4 h-4"></i> Pausar
            </button>
          `}
          <button class="btn btn-ghost" onclick="resetPomodoro()" title="Reiniciar">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Salvar Sessão Concluída -->
        <div class="pt-4 border-t border-slate-800/80 w-full flex items-center justify-center gap-3">
          <span class="text-xs text-slate-400">Atribuir foco a:</span>
          <select id="pomoPersonSelect" class="form-control bg-slate-900 border-slate-700 text-xs py-1 px-2.5 rounded-md text-slate-300 w-auto" onchange="pomodoroSelectedPerson = this.value">
            <option value="gus" ${pomodoroSelectedPerson === 'gus' ? 'selected' : ''}>${state.name1}</option>
            <option value="maria" ${pomodoroSelectedPerson === 'maria' ? 'selected' : ''}>${state.name2}</option>
          </select>
          <button class="btn btn-secondary btn-sm text-xs" onclick="savePomodoroSession()">
            <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Registrar 25m
          </button>
        </div>
      </div>

      <!-- Histórico de Sessões -->
      <div class="surface-card p-6">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <i data-lucide="history" class="w-4 h-4 text-sky-400"></i> Sessões Recentes
        </h4>

        <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          ${[...gusSessions.map(s => ({ ...s, person: 'gus' })), ...mariaSessions.map(s => ({ ...s, person: 'maria' }))]
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, 10)
            .map(s => `
              <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div class="font-medium text-sm text-white">${s.note || 'Sessão de estudos'}</div>
                  <div class="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span class="badge ${s.person === 'gus' ? 'badge-gus' : 'badge-maria'}">${s.person === 'gus' ? state.name1 : state.name2}</span>
                    <span>${fmtDate(s.date)}</span>
                  </div>
                </div>
                <span class="font-mono font-bold text-amber-400 text-sm">${s.hours}h</span>
              </div>
            `).join('') || '<div class="text-center py-10 text-slate-500 text-sm">Nenhuma sessão registrada ainda.</div>'}
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function savePomodoroSession() {
  if (!state.study) state.study = { gus: { sessions: [] }, maria: { sessions: [] } };
  const target = state.study[pomodoroSelectedPerson];
  if (!target.sessions) target.sessions = [];

  target.sessions.push({
    date: new Date().toISOString().slice(0, 10),
    hours: 0.5, // 25-30 min
    note: 'Sessão Pomodoro'
  });

  saveState();
  showToast(`Sessão de 30m registrada para ${pomodoroSelectedPerson === 'gus' ? state.name1 : state.name2}! 📚`, 'success');
  renderStudyView();
}

function openManualStudySessionModal() {
  const person = prompt(`Para quem é a sessão? (${state.name1} = 1, ${state.name2} = 2):`, '1');
  if (!person) return;
  const key = person === '2' ? 'maria' : 'gus';
  const hoursStr = prompt('Quantidade de horas estudadas (ex: 1.5):');
  const hours = parseFloat(hoursStr) || 0;
  if (hours <= 0) return;
  const note = prompt('Assunto ou matéria estudada (opcional):') || '';

  if (!state.study) state.study = { gus: { sessions: [] }, maria: { sessions: [] } };
  if (!state.study[key].sessions) state.study[key].sessions = [];

  state.study[key].sessions.push({
    date: new Date().toISOString().slice(0, 10),
    hours,
    note
  });

  saveState();
  showToast('Sessão de estudos registrada!', 'success');
  renderStudyView();
}

