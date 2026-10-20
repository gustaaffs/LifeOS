// ==========================================================================
// LIFE OS — APP CONTROLLER & SHELL NAVIGATION
// ==========================================================================

let currentPage = 'financas';

function showPage(page) {
  currentPage = page;

  // Atualiza visibilidade das seções
  document.querySelectorAll('.app-page-section').forEach(el => {
    el.classList.toggle('hidden', el.dataset.page !== page);
  });

  // Atualiza links da sidebar
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  // Atualiza links da barra mobile
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Mostra ou oculta navegador de mês (só faz sentido em Finanças)
  const monthNav = document.getElementById('topbarMonthNav');
  if (monthNav) {
    monthNav.classList.toggle('hidden', page !== 'financas');
  }

  // Títulos da Topbar
  const titleMap = {
    financas: 'Gestão Financeira',
    viagens: 'Viagens & Aventuras',
    casa: 'Casa & Rotina',
    estudos: 'Estudos & Pomodoro',
    config: 'Configurações do Sistema'
  };
  const titleEl = document.getElementById('topbarPageTitle');
  if (titleEl) titleEl.textContent = titleMap[page] || 'Life OS';

  // Renderiza o módulo específico
  if (page === 'financas' && typeof initFinanceModule === 'function') {
    initFinanceModule();
  } else if (page === 'viagens' && typeof initTravelModule === 'function') {
    initTravelModule();
  } else if (page === 'casa' && typeof initTasksModule === 'function') {
    initTasksModule();
  } else if (page === 'estudos' && typeof initStudyModule === 'function') {
    initStudyModule();
  } else if (page === 'config') {
    renderConfigView();
  }

  if (window.lucide) lucide.createIcons();
}

// ===================== CONFIGURAÇÕES & GITHUB =====================

function renderConfigView() {
  const container = document.getElementById('configTabContent');
  if (!container) return;

  const cfg = getGHConfig();
  const token = localStorage.getItem(GH_TOKEN_KEY) || '';

  container.innerHTML = `
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Identidade do Casal & Salários Padrão -->
      <div class="surface-card p-6">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <i data-lucide="user-check" class="w-4 h-4 text-amber-400"></i> Identidade & Salário Base Padrão
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="form-label">Nome 1</label>
            <input type="text" id="cfgName1" value="${state.name1}" class="form-control mb-3">
            <label class="form-label">Salário Padrão ${state.name1} (R$)</label>
            <input type="number" step="0.01" id="cfgSal1" value="${state.salaries?.gus || 0}" class="form-control">
          </div>
          <div>
            <label class="form-label">Nome 2</label>
            <input type="text" id="cfgName2" value="${state.name2}" class="form-control mb-3">
            <label class="form-label">Salário Padrão ${state.name2} (R$)</label>
            <input type="number" step="0.01" id="cfgSal2" value="${state.salaries?.maria || 0}" class="form-control">
          </div>
        </div>
        <p class="text-[11px] text-slate-400 mb-4">
          O salário padrão é aplicado automaticamente em todos os meses. Você pode alterar valores excepcionais mês a mês pelo Dashboard.
        </p>
        <button class="btn btn-primary btn-sm" onclick="saveIdentityConfig()">
          Salvar Identidade & Salários
        </button>
      </div>

      <!-- Sincronização com GitHub (data.json) -->
      <div class="surface-card p-6">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <i data-lucide="github" class="w-4 h-4 text-emerald-400"></i> Sincronização GitHub (data.json)
          </h4>
          <span class="badge ${hasGHConfig() ? 'badge-green' : 'badge-red'}">
            ${hasGHConfig() ? 'Conectado' : 'Não configurado'}
          </span>
        </div>
        <p class="text-xs text-slate-400 mb-4">
          Conecta diretamente ao seu repositório para ler e salvar no arquivo <code>data.json</code> via GitHub API.
        </p>

        <div class="space-y-4">
          <div>
            <label class="form-label">GitHub Personal Access Token (PAT)</label>
            <input type="password" id="cfgToken" value="${token}" placeholder="ghp_xxxxxxxxxxxx" class="form-control font-mono text-xs">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="form-label">Repositório (owner/repo)</label>
              <input type="text" id="cfgRepo" value="${cfg.repo || 'gustaaffs/LifeOS'}" class="form-control text-xs">
            </div>
            <div>
              <label class="form-label">Branch</label>
              <input type="text" id="cfgBranch" value="${cfg.branch || 'main'}" class="form-control text-xs">
            </div>
            <div>
              <label class="form-label">Arquivo</label>
              <input type="text" id="cfgFile" value="${cfg.file || 'data.json'}" class="form-control text-xs">
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button class="btn btn-primary btn-sm" onclick="saveGHConfig()">
              <i data-lucide="save" class="w-3.5 h-3.5"></i> Salvar Configuração
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pullFromGitHub()">
              <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i> Puxar do GitHub
            </button>
            <button class="btn btn-secondary btn-sm" onclick="pushToGitHub()">
              <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i> Enviar ao GitHub
            </button>
          </div>
        </div>
      </div>

      <!-- Backup Local & Restauração -->
      <div class="surface-card p-6">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
          <i data-lucide="hard-drive" class="w-4 h-4 text-sky-400"></i> Backup Manual (Arquivo JSON)
        </h4>
        <p class="text-xs text-slate-400 mb-4">
          Você pode baixar uma cópia completa dos dados para o seu computador a qualquer momento.
        </p>

        <div class="flex flex-wrap items-center gap-4">
          <button class="btn btn-secondary btn-sm" onclick="exportDataBackup()">
            <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-400"></i> Exportar Arquivo JSON
          </button>

          <label class="btn btn-secondary btn-sm cursor-pointer">
            <i data-lucide="upload" class="w-3.5 h-3.5 text-sky-400"></i> Importar Arquivo JSON
            <input type="file" accept=".json" class="hidden" onchange="importDataBackup(event)">
          </label>
        </div>
      </div>

      <!-- Instalar como Aplicativo PWA -->
      <div class="surface-card p-6">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
          <i data-lucide="smartphone" class="w-4 h-4 text-emerald-400"></i> Aplicativo para Celular (PWA)
        </h4>
        <p class="text-xs text-slate-400 mb-4">
          Instale o Life OS na tela inicial do seu celular para abrir como um aplicativo de verdade (sem barra de endereço do navegador).
        </p>
        <button class="btn btn-primary btn-sm" onclick="promptInstallPWA()">
          <i data-lucide="download" class="w-3.5 h-3.5"></i> Instalar como Aplicativo
        </button>
      </div>

      <!-- Reset Geral -->
      <div class="surface-card p-6 border-rose-500/20">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-rose-400 mb-2">Zona de Perigo</h4>
        <p class="text-xs text-slate-400 mb-4">Limpar todos os dados locais do navegador (localStorage).</p>
        <button class="btn btn-danger btn-sm" onclick="resetAllData()">
          Resetar Dados Locais
        </button>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function saveIdentityConfig() {
  const n1 = document.getElementById('cfgName1')?.value.trim();
  const n2 = document.getElementById('cfgName2')?.value.trim();
  const s1 = parseFloat(document.getElementById('cfgSal1')?.value) || 0;
  const s2 = parseFloat(document.getElementById('cfgSal2')?.value) || 0;

  if (n1) state.name1 = n1;
  if (n2) state.name2 = n2;
  if (!state.salaries) state.salaries = {};
  state.salaries.gus = s1;
  state.salaries.maria = s2;

  saveState();
  updateBrandLabels();
  showToast('Identidade e salários padrão atualizados!', 'success');
}

function saveGHConfig() {
  const token = document.getElementById('cfgToken')?.value.trim() || '';
  const repo = document.getElementById('cfgRepo')?.value.trim() || '';
  const branch = document.getElementById('cfgBranch')?.value.trim() || 'main';
  const file = document.getElementById('cfgFile')?.value.trim() || 'data.json';

  localStorage.setItem(GH_TOKEN_KEY, token);
  localStorage.setItem(GH_CONFIG_KEY, JSON.stringify({ repo, branch, file }));

  showToast('Configuração do GitHub salva!', 'success');
  updateSyncIndicator('saved');
}

function resetAllData() {
  if (confirm('Tem certeza absoluta que deseja resetar os dados locais? Certifique-se de ter um backup antes.')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    showToast('Dados resetados com sucesso!', 'info');
    showPage('financas');
  }
}

function updateBrandLabels() {
  const brandSub = document.getElementById('sidebarBrandSub');
  if (brandSub) brandSub.textContent = `${state.name1} & ${state.name2}`;
}

// ===================== MODAIS & TOAST =====================

function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

// Fecha modal com clique fora ou tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
  }
});

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'error') iconName = 'alert-triangle';

  t.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span>${msg}</span>
  `;
  container.appendChild(t);
  if (window.lucide) lucide.createIcons();

  requestAnimationFrame(() => {
    t.classList.add('show');
  });

  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 300);
  }, 3500);
}

// ===================== INICIALIZAÇÃO DA APLICAÇÃO =====================

window.addEventListener('DOMContentLoaded', async () => {
  // Carrega do data.json local se primeira execução
  await loadInitialDataJsonIfEmpty();

  updateBrandLabels();
  updateSyncIndicator('saved');
  showPage('financas');

  // Listener para re-renderização global quando os dados mudam
  window.addEventListener('lifeos-render-all', () => {
    updateBrandLabels();
    showPage(currentPage);
  });
});

