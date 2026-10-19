// ==========================================================================
// LIFE OS — FINANCE MODULE (DASHBOARD, RATEIO, LANÇAMENTOS, CARTÕES, METAS)
// ==========================================================================

let finCurrentTab = 'dashboard';
let finCategoryDonutChart = null;
let finHistoryBarChart = null;
let finSearchQuery = '';
let finFilterOwner = 'all';
let finFilterCategory = 'all';

function initFinanceModule() {
  updateMonthNavigationDisplay();
  renderFinanceView();
}

function changeMonth(delta) {
  const [y, m] = currentMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  currentMonth = d.toISOString().slice(0, 7);
  updateMonthNavigationDisplay();
  renderFinanceView();
}

function updateMonthNavigationDisplay() {
  const label = document.getElementById('monthDisplayLabel');
  if (!label) return;
  const [y, m] = currentMonth.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  label.textContent = `${months[parseInt(m, 10) - 1]} ${y}`;
}

// ===================== CÁLCULOS FINANCEIROS DO MÊS =====================

function getMonthFinancials(ym) {
  const actual = (state.monthActuals && state.monthActuals[ym]) || {};
  const salaryGus = actual.salaryGus !== undefined ? actual.salaryGus : (state.salaries?.gus || 0);
  const salaryMaria = actual.salaryMaria !== undefined ? actual.salaryMaria : (state.salaries?.maria || 0);
  const baseSalaryTotal = salaryGus + salaryMaria;

  // Lançamentos Avulsos do mês
  const monthEntries = (state.entries || []).filter(e => e.month === ym);
  const extraIncomes = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + (Number(e.actual !== undefined ? e.actual : e.projected) || 0), 0);
  const totalIncome = baseSalaryTotal + extraIncomes;

  // Despesas Avulsas
  const itemizedExpenses = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (Number(e.actual !== undefined ? e.actual : e.projected) || 0), 0);

  // Despesas Fixas / Recorrentes do mês
  const recurOverrides = actual.recurOverrides || {};
  let recurringExpenses = 0;
  (state.recurring || []).forEach(r => {
    if (r.active !== false) {
      const val = recurOverrides[r.id] !== undefined ? recurOverrides[r.id] : Number(r.value || 0);
      recurringExpenses += val;
    }
  });

  // Faturas de Cartão do mês
  const invoices = (state.cardInvoices || []).filter(ci => ci.month === ym);
  const cardExpenses = invoices.reduce((s, ci) => s + (Number(ci.value) || 0), 0);

  // Total Geral de Gastos do mês
  const totalExpenses = itemizedExpenses + recurringExpenses + cardExpenses;
  const netBalance = totalIncome - totalExpenses;
  const savingsPct = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // ---------------- RATEIO PROPORCIONAL DO CASAL ----------------
  const propGus = totalIncome > 0 ? (salaryGus / totalIncome) : 0.5;
  const propMaria = totalIncome > 0 ? (salaryMaria / totalIncome) : 0.5;

  // Gastos compartilhados (onde owner === 'casal')
  let sharedSpentGus = 0;
  let sharedSpentMaria = 0;
  let sharedSpentTogether = 0;

  // Avulsos do casal
  monthEntries.forEach(e => {
    if (e.type === 'expense' && e.owner === 'casal') {
      const val = Number(e.actual !== undefined ? e.actual : e.projected) || 0;
      sharedSpentTogether += val;
    }
  });

  // Recorrentes do casal
  (state.recurring || []).forEach(r => {
    if (r.active !== false && r.owner === 'casal') {
      const val = recurOverrides[r.id] !== undefined ? recurOverrides[r.id] : Number(r.value || 0);
      sharedSpentTogether += val;
    }
  });

  // Faturas de cartão compartilhadas
  invoices.forEach(inv => {
    const card = (state.cards || []).find(c => c.id === inv.cardId);
    if (card && card.owner === 'casal') {
      sharedSpentTogether += Number(inv.value || 0);
    }
  });

  const totalShared = sharedSpentTogether + sharedSpentGus + sharedSpentMaria;
  const fairShareGus = totalShared * propGus;
  const fairShareMaria = totalShared * propMaria;

  return {
    isCustomGus: actual.salaryGus !== undefined,
    isCustomMaria: actual.salaryMaria !== undefined,
    salaryGus,
    salaryMaria,
    totalIncome,
    itemizedExpenses,
    recurringExpenses,
    cardExpenses,
    totalExpenses,
    netBalance,
    savingsPct,
    propGus,
    propMaria,
    totalShared,
    fairShareGus,
    fairShareMaria
  };
}

// ===================== RENDERIZAÇÃO PRINCIPAL =====================

function switchFinTab(tab) {
  finCurrentTab = tab;
  document.querySelectorAll('.fin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderFinanceView();
}

function renderFinanceView() {
  const container = document.getElementById('finTabContent');
  if (!container) return;

  const fin = getMonthFinancials(currentMonth);

  if (finCurrentTab === 'dashboard') {
    renderFinDashboard(container, fin);
  } else if (finCurrentTab === 'lancamentos') {
    renderFinLancamentos(container, fin);
  } else if (finCurrentTab === 'cartao') {
    renderFinCartao(container, fin);
  } else if (finCurrentTab === 'orcamento') {
    renderFinOrcamento(container, fin);
  } else if (finCurrentTab === 'metas') {
    renderFinMetas(container, fin);
  }

  if (window.lucide) lucide.createIcons();
}

// 1. DASHBOARD TAB
function renderFinDashboard(container, fin) {
  container.innerHTML = `
    <!-- Top Hero KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="surface-card p-6 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border-amber-500/20">
        <div class="flex items-center justify-between text-xs font-mono uppercase text-slate-400 mb-2">
          <span>Saldo Líquido do Mês</span>
          <span class="badge ${fin.netBalance >= 0 ? 'badge-green' : 'badge-red'}">
            ${fin.savingsPct}% de Poupança
          </span>
        </div>
        <div class="text-3xl md:text-4xl font-extrabold ${fin.netBalance >= 0 ? 'text-white' : 'text-rose-400'} tracking-tight">
          ${fmtMoney(fin.netBalance)}
        </div>
        <div class="flex items-center gap-6 mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            <span class="text-emerald-400 font-semibold block text-sm">${fmtMoney(fin.totalIncome)}</span>
            <span>Receitas Totais</span>
          </div>
          <div class="h-6 w-px bg-slate-800"></div>
          <div>
            <span class="text-rose-400 font-semibold block text-sm">${fmtMoney(fin.totalExpenses)}</span>
            <span>Gastos do Mês</span>
          </div>
        </div>
      </div>

      <!-- Receitas Gus & Maria -->
      <div class="surface-card p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase text-slate-400">Renda ${state.name1}</span>
            <span class="badge badge-gus">${(fin.propGus * 100).toFixed(0)}%</span>
          </div>
          <div class="text-xl font-bold text-sky-400 font-mono">${fmtMoney(fin.salaryGus)}</div>
          <div class="text-xs text-slate-400 mt-1">
            ${fin.isCustomGus 
              ? `<span class="text-amber-300 font-semibold flex items-center gap-1">● Ajuste neste mês <span class="text-slate-500 font-normal">(Padrão: ${fmtMoney(state.salaries?.gus)})</span></span>` 
              : `<span class="text-slate-400 flex items-center gap-1">● Salário Global (Padrão)</span>`}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button class="btn btn-secondary btn-sm flex-1 text-[11px] py-1 px-2" onclick="openSalaryModal('month')" title="Ajustar apenas para este mês">
            <i data-lucide="calendar" class="w-3 h-3 text-amber-400"></i> Este Mês
          </button>
          <button class="btn btn-ghost btn-sm flex-1 text-[11px] py-1 px-2 text-slate-300 hover:text-white" onclick="openSalaryModal('global')" title="Editar salário base global que vale para todo mês">
            <i data-lucide="globe" class="w-3 h-3 text-sky-400"></i> Todo Mês
          </button>
        </div>
      </div>

      <div class="surface-card p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase text-slate-400">Renda ${state.name2}</span>
            <span class="badge badge-maria">${(fin.propMaria * 100).toFixed(0)}%</span>
          </div>
          <div class="text-xl font-bold text-pink-400 font-mono">${fmtMoney(fin.salaryMaria)}</div>
          <div class="text-xs text-slate-400 mt-1">
            ${fin.isCustomMaria 
              ? `<span class="text-amber-300 font-semibold flex items-center gap-1">● Ajuste neste mês <span class="text-slate-500 font-normal">(Padrão: ${fmtMoney(state.salaries?.maria)})</span></span>` 
              : `<span class="text-slate-400 flex items-center gap-1">● Salário Global (Padrão)</span>`}
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button class="btn btn-secondary btn-sm flex-1 text-[11px] py-1 px-2" onclick="openSalaryModal('month')" title="Ajustar apenas para este mês">
            <i data-lucide="calendar" class="w-3 h-3 text-amber-400"></i> Este Mês
          </button>
          <button class="btn btn-ghost btn-sm flex-1 text-[11px] py-1 px-2 text-slate-300 hover:text-white" onclick="openSalaryModal('global')" title="Editar salário base global que vale para todo mês">
            <i data-lucide="globe" class="w-3 h-3 text-sky-400"></i> Todo Mês
          </button>
        </div>
      </div>
    </div>

    <!-- Rateio Proporcional do Casal -->
    <div class="surface-card p-6 mb-6 border-l-4 border-l-purple-500">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <i data-lucide="scale" class="w-4 h-4 text-purple-400"></i> Rateio Proporcional das Contas Comuns
          </h4>
          <p class="text-xs text-slate-400 mt-1">
            Com base na proporção salarial de <strong>${(fin.propGus * 100).toFixed(1)}% (${state.name1})</strong> e <strong>${(fin.propMaria * 100).toFixed(1)}% (${state.name2})</strong>.
          </p>
        </div>
        <div class="text-right">
          <span class="text-xs text-slate-400 block">Total Compartilhado no Mês:</span>
          <span class="text-lg font-bold text-purple-300 font-mono">${fmtMoney(fin.totalShared)}</span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div class="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-sky-400">Parcela Justa de ${state.name1}:</span>
            <span class="font-mono font-bold text-white text-sm">${fmtMoney(fin.fairShareGus)}</span>
          </div>
          <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div class="bg-sky-400 h-1.5" style="width: ${(fin.propGus * 100)}%"></div>
          </div>
        </div>

        <div class="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-pink-400">Parcela Justa de ${state.name2}:</span>
            <span class="font-mono font-bold text-white text-sm">${fmtMoney(fin.fairShareMaria)}</span>
          </div>
          <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div class="bg-pink-400 h-1.5" style="width: ${(fin.propMaria * 100)}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráficos: Distribuição & Histórico -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="surface-card p-6">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <i data-lucide="pie-chart" class="w-4 h-4 text-amber-400"></i> Despesas por Categoria
        </h4>
        <div class="h-56 relative flex items-center justify-center">
          <canvas id="finCategoryDonutCanvas"></canvas>
        </div>
      </div>

      <div class="surface-card p-6 lg:col-span-2">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <i data-lucide="bar-chart-3" class="w-4 h-4 text-emerald-400"></i> Histórico: Receitas vs. Gastos (Últimos Meses)
        </h4>
        <div class="h-56 relative">
          <canvas id="finHistoryBarCanvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Potes / Planejamento 50-20-20-10 -->
    <div class="surface-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i data-lucide="target" class="w-4 h-4 text-sky-400"></i> Execução do Planejamento Orçamentário
        </h4>
        <button class="btn btn-ghost btn-sm text-xs text-amber-400" onclick="switchFinTab('orcamento')">
          Ajustar Metas & Potes →
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${(state.planBuckets || []).map(bucket => {
          const targetVal = fin.totalIncome * ((bucket.pct || 0) / 100);
          return `
            <div class="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-slate-300 truncate">${bucket.name}</span>
                <span class="text-xs font-mono font-bold" style="color: ${bucket.color || '#38bdf8'}">${bucket.pct}%</span>
              </div>
              <div class="text-base font-bold text-white font-mono">${fmtMoney(targetVal)}</div>
              <div class="text-xs text-slate-500 mt-1">Orçado p/ este mês</div>
              <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                <div class="h-1.5 rounded-full" style="width: 100%; background-color: ${bucket.color || '#38bdf8'}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  renderFinCharts();
}

// 2. LANÇAMENTOS TAB
function renderFinLancamentos(container, fin) {
  const monthEntries = (state.entries || []).filter(e => e.month === currentMonth);
  const recurring = state.recurring || [];
  const actual = (state.monthActuals && state.monthActuals[currentMonth]) || {};
  const recurOverrides = actual.recurOverrides || {};

  const filteredEntries = monthEntries.filter(e => {
    const matchOwner = finFilterOwner === 'all' || e.owner === finFilterOwner;
    const matchCat = finFilterCategory === 'all' || e.category === finFilterCategory;
    const matchSearch = !finSearchQuery || (e.name || '').toLowerCase().includes(finSearchQuery.toLowerCase());
    return matchOwner && matchCat && matchSearch;
  });

  container.innerHTML = `
    <!-- Barra de Ações e Filtros -->
    <div class="surface-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
        <div class="relative flex-1 min-w-[180px]">
          <input type="text" placeholder="Buscar lançamento..." value="${finSearchQuery}" oninput="finSearch(this.value)" class="form-control pl-9 py-2 text-xs">
          <i data-lucide="search" class="w-4 h-4 text-slate-500 absolute left-3 top-2.5"></i>
        </div>

        <select class="form-control bg-slate-900 border-slate-700 text-xs py-2 px-3 rounded-md text-slate-300" onchange="filterFinOwner(this.value)">
          <option value="all" ${finFilterOwner === 'all' ? 'selected' : ''}>Todos os Responsáveis</option>
          <option value="gus" ${finFilterOwner === 'gus' ? 'selected' : ''}>${state.name1}</option>
          <option value="maria" ${finFilterOwner === 'maria' ? 'selected' : ''}>${state.name2}</option>
          <option value="casal" ${finFilterOwner === 'casal' ? 'selected' : ''}>Casal</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" onclick="openNewRecurringModal()">
          <i data-lucide="repeat" class="w-3.5 h-3.5"></i> Nova Despesa Fixa
        </button>
        <button class="btn btn-primary btn-sm" onclick="openNewEntryModal()">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Novo Lançamento
        </button>
      </div>
    </div>

    <!-- Despesas Fixas / Recorrentes do Mês -->
    <div class="surface-card p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i data-lucide="repeat" class="w-4 h-4 text-sky-400"></i> Despesas Fixas / Recorrentes do Mês
        </h4>
        <span class="text-xs text-slate-500">Total: ${fmtMoney(fin.recurringExpenses)}</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        ${recurring.map(r => {
          const val = recurOverrides[r.id] !== undefined ? recurOverrides[r.id] : Number(r.value || 0);
          const isOverridden = recurOverrides[r.id] !== undefined;
          return `
            <div class="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition">
              <div>
                <div class="font-medium text-white text-sm flex items-center gap-2">
                  ${r.name}
                  ${isOverridden ? '<span class="text-[10px] text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">ajustado</span>' : ''}
                </div>
                <div class="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span class="badge ${r.owner === 'gus' ? 'badge-gus' : r.owner === 'maria' ? 'badge-maria' : 'badge-casal'}">${r.owner === 'gus' ? state.name1 : r.owner === 'maria' ? state.name2 : 'Casal'}</span>
                  <span>${r.category || 'Casa'}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-mono font-bold text-white text-sm block">${fmtMoney(val)}</span>
                <button class="text-[11px] text-slate-500 hover:text-amber-400 underline mt-1" onclick="editRecurringValue('${r.id}', ${val})">Alterar valor</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Lançamentos Avulsos do Mês -->
    <div class="surface-card p-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-amber-400"></i> Lançamentos Avulsos (${filteredEntries.length})
        </h4>
      </div>

      ${filteredEntries.length === 0 ? `
        <div class="text-center py-10 text-slate-500 text-sm">
          Nenhum lançamento avulso encontrado neste mês.
        </div>
      ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                <th class="py-3 px-3">Item</th>
                <th class="py-3 px-3">Categoria</th>
                <th class="py-3 px-3">Responsável</th>
                <th class="py-3 px-3 text-right">Valor</th>
                <th class="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${filteredEntries.map(e => {
                const isIncome = e.type === 'income';
                const val = Number(e.actual !== undefined ? e.actual : e.projected) || 0;
                return `
                  <tr class="hover:bg-slate-800/20 transition-colors">
                    <td class="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
                      ${e.name}
                    </td>
                    <td class="py-3 px-3 text-slate-400 text-xs">${e.category || 'Geral'}</td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="badge ${e.owner === 'gus' ? 'badge-gus' : e.owner === 'maria' ? 'badge-maria' : 'badge-casal'}">
                        ${e.owner === 'gus' ? state.name1 : e.owner === 'maria' ? state.name2 : 'Casal'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-white'}">
                      ${isIncome ? '+' : '-'}${fmtMoney(val)}
                    </td>
                    <td class="py-3 px-3 text-right">
                      <button class="btn btn-ghost btn-sm text-slate-500 hover:text-rose-400" onclick="deleteEntry('${e.id}')">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// 3. CARTÃO TAB
function renderFinCartao(container, fin) {
  const cards = state.cards || [];
  const invoices = (state.cardInvoices || []).filter(ci => ci.month === currentMonth);

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        <i data-lucide="credit-card" class="w-4 h-4 text-amber-400"></i> Faturas de Cartão de Crédito — ${currentMonth}
      </h4>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" onclick="openNewCardModal()">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Cadastrar Cartão
        </button>
        <button class="btn btn-primary btn-sm" onclick="openNewInvoiceModal()">
          <i data-lucide="file-plus" class="w-3.5 h-3.5"></i> Lançar Fatura
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      ${cards.map(card => {
        const inv = invoices.find(i => i.cardId === card.id);
        const invoiceVal = inv ? Number(inv.value || 0) : 0;
        return `
          <div class="surface-card p-5 relative overflow-hidden" style="border-top: 4px solid ${card.color || '#38bdf8'}">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-white text-base">${card.name}</span>
              <span class="badge ${card.owner === 'gus' ? 'badge-gus' : card.owner === 'maria' ? 'badge-maria' : 'badge-casal'}">${card.owner === 'gus' ? state.name1 : card.owner === 'maria' ? state.name2 : 'Casal'}</span>
            </div>
            <div class="text-xs text-slate-400 mb-4">Fecha todo dia <strong>${card.closingDay || 1}</strong></div>
            <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span class="text-xs text-slate-400">Fatura do Mês:</span>
              <span class="font-mono font-bold text-white text-lg">${fmtMoney(invoiceVal)}</span>
            </div>
            <div class="mt-4 flex items-center justify-end gap-2">
              <button class="btn btn-ghost btn-sm text-xs text-amber-400" onclick="editCardInvoice('${card.id}', ${invoiceVal})">
                ${invoiceVal > 0 ? 'Editar Fatura' : 'Lançar Fatura'}
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// 4. ORÇAMENTO TAB
function renderFinOrcamento(container, fin) {
  container.innerHTML = `
    <div class="surface-card p-6 max-w-3xl mx-auto">
      <h4 class="text-base font-bold text-white mb-2 flex items-center gap-2">
        <i data-lucide="pie-chart" class="w-5 h-5 text-amber-400"></i> Metodologia dos Potes (Orçamento Mensal)
      </h4>
      <p class="text-xs text-slate-400 mb-6">
        Defina como a receita do casal é distribuída (ex: 50% Essenciais, 20% Mesada/Lazer, 20% Investimentos e Reserva, 10% Metas).
      </p>

      <div class="space-y-4">
        ${(state.planBuckets || []).map(bucket => {
          return `
            <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: ${bucket.color || '#38bdf8'}"></span>
                <div>
                  <span class="font-semibold text-white text-sm block">${bucket.name}</span>
                  <span class="text-xs text-slate-500">${bucket.isSpending ? 'Gastos Diretos' : 'Poupança / Investimento'}</span>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 font-mono">
                  <input type="number" min="0" max="100" value="${bucket.pct}" onchange="updateBucketPct('${bucket.id}', this.value)" class="form-control w-16 text-center py-1 text-sm bg-slate-800 border-slate-700">
                  <span class="text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 5. METAS & COFRINHOS TAB
function renderFinMetas(container, fin) {
  const cofrinhos = state.cofrinhos || [];

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        <i data-lucide="piggy-bank" class="w-4 h-4 text-emerald-400"></i> Cofrinhos & Metas Financeiras
      </h4>
      <button class="btn btn-primary btn-sm" onclick="openNewCofrinhoModal()">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Criar Novo Cofrinho
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${cofrinhos.map(cof => {
        const deposits = cof.deposits || [];
        const totalSaved = deposits.reduce((s, d) => s + (Number(d.num) || 0), 0);
        const target = Number(cof.total || 0);
        const pct = target > 0 ? Math.min(Math.round((totalSaved / target) * 100), 100) : 0;
        return `
          <div class="surface-card p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="font-bold text-white text-base">${cof.name}</span>
                <span class="badge badge-green">${pct}%</span>
              </div>
              <div class="text-xs text-slate-400 mb-1">Acumulado:</div>
              <div class="text-2xl font-bold font-mono text-white mb-2">${fmtMoney(totalSaved)}</div>
              <div class="text-xs text-slate-500 mb-4">Meta total: ${fmtMoney(target)}</div>

              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <div class="bg-emerald-400 h-2 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-slate-800">
              <button class="btn btn-secondary btn-sm text-xs" onclick="addDepositToCofrinho('${cof.id}')">
                <i data-lucide="plus-circle" class="w-3 h-3 text-emerald-400"></i> Guardar Valor
              </button>
              <button class="btn btn-ghost btn-sm text-slate-500 hover:text-rose-400" onclick="deleteCofrinho('${cof.id}')">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ===================== GRÁFICOS FINANCEIROS =====================

function renderFinCharts() {
  const donutCanvas = document.getElementById('finCategoryDonutCanvas');
  const barCanvas = document.getElementById('finHistoryBarCanvas');

  if (!window.Chart) return;

  // 1. Donut Chart
  if (donutCanvas) {
    if (finCategoryDonutChart) finCategoryDonutChart.destroy();
    
    // Agrupa despesas do mês por categoria
    const monthEntries = (state.entries || []).filter(e => e.month === currentMonth && e.type === 'expense');
    const catMap = {};
    monthEntries.forEach(e => {
      const c = e.category || 'Outros';
      const val = Number(e.actual !== undefined ? e.actual : e.projected) || 0;
      catMap[c] = (catMap[c] || 0) + val;
    });

    const labels = Object.keys(catMap);
    const data = Object.values(catMap);

    finCategoryDonutChart = new Chart(donutCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['Sem dados'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: labels.length ? ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#a855f7', '#f43f5e', '#9ba1b6'] : ['#282c3f'],
          borderColor: '#13141c',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#9ba1b6', boxWidth: 10, font: { size: 10 } } }
        },
        cutout: '70%'
      }
    });
  }

  // 2. Bar Chart dos últimos 6 meses
  if (barCanvas) {
    if (finHistoryBarChart) finHistoryBarChart.destroy();

    const [currY, currM] = currentMonth.split('-').map(Number);
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currY, currM - 1 - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const incomeData = [];
    const expenseData = [];

    months.forEach(ym => {
      const f = getMonthFinancials(ym);
      incomeData.push(f.totalIncome);
      expenseData.push(f.totalExpenses);
    });

    finHistoryBarChart = new Chart(barCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months.map(m => m.slice(5) + '/' + m.slice(2, 4)),
        datasets: [
          { label: 'Receitas', data: incomeData, backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Gastos', data: expenseData, backgroundColor: '#f43f5e', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ba1b6', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ba1b6', font: { size: 10 } } }
        },
        plugins: {
          legend: { labels: { color: '#9ba1b6', font: { size: 11 } } }
        }
      }
    });
  }
}

// Filtros & Ações
function finSearch(q) {
  finSearchQuery = q;
  renderFinanceView();
}
function filterFinOwner(owner) {
  finFilterOwner = owner;
  renderFinanceView();
}

// Modais e Lógica de Cadastro
// Modais e Lógica de Gestão de Salários (Global vs Mensal)
let currentSalScopeTab = 'global';

function switchSalModalTab(scope) {
  currentSalScopeTab = scope;
  const btnGlobal = document.getElementById('btnSalScopeGlobal');
  const btnMonth = document.getElementById('btnSalScopeMonth');
  const viewGlobal = document.getElementById('salViewGlobal');
  const viewMonth = document.getElementById('salViewMonth');

  if (scope === 'global') {
    if (btnGlobal) btnGlobal.className = 'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30';
    if (btnMonth) btnMonth.className = 'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    if (viewGlobal) viewGlobal.classList.remove('hidden');
    if (viewMonth) viewMonth.classList.add('hidden');
  } else {
    if (btnGlobal) btnGlobal.className = 'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition text-slate-400 hover:text-white';
    if (btnMonth) btnMonth.className = 'py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30';
    if (viewGlobal) viewGlobal.classList.add('hidden');
    if (viewMonth) viewMonth.classList.remove('hidden');
  }

  if (window.lucide) lucide.createIcons();
}

function openSalaryModal(targetScope = 'global') {
  const modal = document.getElementById('modalSalaries');
  if (!modal) return;

  const actual = (state.monthActuals && state.monthActuals[currentMonth]) || {};
  const gusMonth = actual.salaryGus !== undefined ? actual.salaryGus : (state.salaries?.gus || 0);
  const mariaMonth = actual.salaryMaria !== undefined ? actual.salaryMaria : (state.salaries?.maria || 0);

  const [y, m] = currentMonth.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthName = `${months[parseInt(m, 10) - 1]} ${y}`;

  // Título e Labels
  const titleEl = document.getElementById('salMonthTitle');
  if (titleEl) titleEl.textContent = monthName;

  const lblMonthGus = document.getElementById('lblMonthSalGus');
  if (lblMonthGus) lblMonthGus.textContent = `Renda ${state.name1} em ${monthName} (R$)`;
  const lblMonthMaria = document.getElementById('lblMonthSalMaria');
  if (lblMonthMaria) lblMonthMaria.textContent = `Renda ${state.name2} em ${monthName} (R$)`;

  const lblDefGus = document.getElementById('lblDefSalGus');
  if (lblDefGus) lblDefGus.textContent = `Salário Padrão ${state.name1} (R$)`;
  const lblDefMaria = document.getElementById('lblDefSalMaria');
  if (lblDefMaria) lblDefMaria.textContent = `Salário Padrão ${state.name2} (R$)`;

  // Preenche inputs
  const inputMonthGus = document.getElementById('inputMonthSalGus');
  if (inputMonthGus) inputMonthGus.value = gusMonth || '';
  const inputMonthMaria = document.getElementById('inputMonthSalMaria');
  if (inputMonthMaria) inputMonthMaria.value = mariaMonth || '';

  const inputDefGus = document.getElementById('inputDefSalGus');
  if (inputDefGus) inputDefGus.value = state.salaries?.gus || '';
  const inputDefMaria = document.getElementById('inputDefSalMaria');
  if (inputDefMaria) inputDefMaria.value = state.salaries?.maria || '';

  switchSalModalTab(targetScope);
  modal.classList.add('active');
}

function saveGlobalSalary() {
  const defGus = parseFloat(document.getElementById('inputDefSalGus')?.value) || 0;
  const defMaria = parseFloat(document.getElementById('inputDefSalMaria')?.value) || 0;

  if (!state.salaries) state.salaries = {};
  state.salaries.gus = defGus;
  state.salaries.maria = defMaria;

  saveState();
  closeModal('modalSalaries');
  showToast('Salário Global salvo para todos os meses! 🌐', 'success');
  renderFinanceView();
}

function saveMonthSalary() {
  const monthGus = parseFloat(document.getElementById('inputMonthSalGus')?.value);
  const monthMaria = parseFloat(document.getElementById('inputMonthSalMaria')?.value);

  if (!state.monthActuals) state.monthActuals = {};
  if (!state.monthActuals[currentMonth]) state.monthActuals[currentMonth] = {};

  if (!isNaN(monthGus)) {
    state.monthActuals[currentMonth].salaryGus = monthGus;
  }
  if (!isNaN(monthMaria)) {
    state.monthActuals[currentMonth].salaryMaria = monthMaria;
  }

  const [y, m] = currentMonth.split('-');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthName = `${months[parseInt(m, 10) - 1]} ${y}`;

  saveState();
  closeModal('modalSalaries');
  showToast(`Renda ajustada apenas para ${monthName}! 📅`, 'success');
  renderFinanceView();
}

function resetMonthSalariesToDefault() {
  if (state.monthActuals && state.monthActuals[currentMonth]) {
    delete state.monthActuals[currentMonth].salaryGus;
    delete state.monthActuals[currentMonth].salaryMaria;
  }

  saveState();
  closeModal('modalSalaries');
  showToast('Ajuste do mês removido! Agora usando o Salário Global padrão. ✨', 'info');
  renderFinanceView();
}

function openNewEntryModal() {
  const name = prompt('Descrição do lançamento:');
  if (!name) return;
  const valStr = prompt('Valor (R$):');
  const val = parseFloat(valStr) || 0;
  if (val <= 0) return;
  const owner = prompt(`Responsável (${state.name1} = gus, ${state.name2} = maria, Ambos = casal):`, 'casal') || 'casal';

  if (!state.entries) state.entries = [];
  state.entries.push({
    id: uid(),
    name,
    month: currentMonth,
    type: 'expense',
    actual: val,
    projected: val,
    owner: owner.toLowerCase().trim(),
    category: 'Geral'
  });

  saveState();
  showToast('Lançamento adicionado!', 'success');
  renderFinanceView();
}

function deleteEntry(id) {
  if (confirm('Excluir este lançamento?')) {
    state.entries = (state.entries || []).filter(e => e.id !== id);
    saveState();
    showToast('Lançamento excluído', 'info');
    renderFinanceView();
  }
}

function openNewCardModal() {
  const name = prompt('Nome do cartão (ex: Nubank, Itaú):');
  if (!name) return;
  const day = parseInt(prompt('Dia de fechamento da fatura (ex: 15):', '15'), 10) || 15;
  const owner = prompt(`Titular (${state.name1} = gus, ${state.name2} = maria, Ambos = casal):`, 'casal') || 'casal';

  if (!state.cards) state.cards = [];
  state.cards.push({
    id: uid(),
    name,
    closingDay: day,
    owner: owner.toLowerCase().trim(),
    color: '#38bdf8'
  });

  saveState();
  showToast('Cartão cadastrado!', 'success');
  renderFinanceView();
}

function openNewInvoiceModal() {
  if (!state.cards || state.cards.length === 0) {
    showToast('Cadastre um cartão primeiro!', 'error');
    return;
  }
  const cardNames = state.cards.map((c, i) => `${i + 1} - ${c.name}`).join('\n');
  const sel = prompt(`Escolha o cartão:\n${cardNames}`);
  const idx = parseInt(sel, 10) - 1;
  if (isNaN(idx) || !state.cards[idx]) return;

  const card = state.cards[idx];
  const valStr = prompt(`Valor da fatura de ${card.name} para ${currentMonth}:`);
  const val = parseFloat(valStr) || 0;

  if (!state.cardInvoices) state.cardInvoices = [];
  const existing = state.cardInvoices.find(ci => ci.cardId === card.id && ci.month === currentMonth);
  if (existing) {
    existing.value = val;
  } else {
    state.cardInvoices.push({
      id: uid(),
      cardId: card.id,
      month: currentMonth,
      value: val,
      note: ''
    });
  }

  saveState();
  showToast('Fatura salva!', 'success');
  renderFinanceView();
}

function editCardInvoice(cardId, currentVal) {
  const valStr = prompt('Novo valor da fatura:', currentVal);
  if (valStr === null) return;
  const val = parseFloat(valStr) || 0;

  if (!state.cardInvoices) state.cardInvoices = [];
  const existing = state.cardInvoices.find(ci => ci.cardId === cardId && ci.month === currentMonth);
  if (existing) {
    existing.value = val;
  } else {
    state.cardInvoices.push({
      id: uid(),
      cardId: cardId,
      month: currentMonth,
      value: val,
      note: ''
    });
  }

  saveState();
  showToast('Fatura atualizada!', 'success');
  renderFinanceView();
}

function editRecurringValue(recurId, currentVal) {
  const valStr = prompt(`Novo valor para ${currentMonth}:`, currentVal);
  if (valStr === null) return;
  const val = parseFloat(valStr) || 0;

  if (!state.monthActuals) state.monthActuals = {};
  if (!state.monthActuals[currentMonth]) state.monthActuals[currentMonth] = {};
  if (!state.monthActuals[currentMonth].recurOverrides) state.monthActuals[currentMonth].recurOverrides = {};

  state.monthActuals[currentMonth].recurOverrides[recurId] = val;
  saveState();
  showToast('Despesa fixa ajustada para este mês!', 'success');
  renderFinanceView();
}

function openNewRecurringModal() {
  const name = prompt('Nome da despesa fixa (ex: Aluguel, Internet):');
  if (!name) return;
  const val = parseFloat(prompt('Valor padrão mensal:')) || 0;
  const owner = prompt(`Responsável (${state.name1} = gus, ${state.name2} = maria, Ambos = casal):`, 'casal') || 'casal';

  if (!state.recurring) state.recurring = [];
  state.recurring.push({
    id: uid(),
    name,
    value: val,
    category: 'Casa',
    owner: owner.toLowerCase().trim(),
    active: true
  });

  saveState();
  showToast('Despesa fixa cadastrada!', 'success');
  renderFinanceView();
}

function openNewCofrinhoModal() {
  const name = prompt('Nome do Cofrinho ou Meta (ex: Viagem, Reforma):');
  if (!name) return;
  const target = parseFloat(prompt('Valor total da meta (R$):')) || 0;

  if (!state.cofrinhos) state.cofrinhos = [];
  state.cofrinhos.push({
    id: uid(),
    name,
    total: target,
    deposits: []
  });

  saveState();
  showToast('Cofrinho criado!', 'success');
  renderFinanceView();
}

function addDepositToCofrinho(cofId) {
  const val = parseFloat(prompt('Valor a guardar no cofrinho:')) || 0;
  if (val <= 0) return;

  const cof = (state.cofrinhos || []).find(c => c.id === cofId);
  if (!cof) return;
  if (!cof.deposits) cof.deposits = [];

  cof.deposits.push({
    num: val,
    date: new Date().toISOString().slice(0, 10)
  });

  saveState();
  showToast('Depósito registrado no cofrinho! 🎉', 'success');
  renderFinanceView();
}

function deleteCofrinho(id) {
  if (confirm('Excluir este cofrinho?')) {
    state.cofrinhos = (state.cofrinhos || []).filter(c => c.id !== id);
    saveState();
    showToast('Cofrinho excluído', 'info');
    renderFinanceView();
  }
}

function updateBucketPct(bucketId, val) {
  const num = parseInt(val, 10) || 0;
  const bucket = (state.planBuckets || []).find(b => b.id === bucketId);
  if (bucket) {
    bucket.pct = num;
    saveState();
    showToast(`Percentual de ${bucket.name} atualizado!`, 'success');
    renderFinanceView();
  }
}

