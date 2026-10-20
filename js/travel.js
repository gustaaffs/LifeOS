// ==========================================================================
// LIFE OS — TRAVEL & TRIP EXPENSE MODULE (MÓDULO VIAGENS)
// ==========================================================================

let activeTripId = null;
let travelCategoryChart = null;
let travelDailyBarChart = null;
let travelFilterCategory = 'all';
let travelFilterPayer = 'all';

function initTravelModule() {
  if (!state.trips || !Array.isArray(state.trips)) {
    state.trips = [];
  }

  // Se nenhuma viagem estiver selecionada e existirem viagens, seleciona a primeira
  if (!activeTripId && state.trips.length > 0) {
    activeTripId = state.trips[0].id;
  }

  renderTravelView();
}

function renderTravelView() {
  const container = document.getElementById('travelModuleContainer');
  if (!container) return;

  if (state.trips.length === 0) {
    container.innerHTML = `
      <div class="surface-card p-12 text-center max-w-xl mx-auto my-8">
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="plane" class="w-8 h-8"></i>
        </div>
        <h3 class="text-xl font-bold text-white mb-2">Nenhuma viagem cadastrada</h3>
        <p class="text-slate-400 text-sm mb-6">Planeje sua próxima aventura! Controle o orçamento, combustível, passeios e acerto de contas do casal em tempo real.</p>
        <button class="btn btn-primary" onclick="openNewTripModal()">
          <i data-lucide="plus" class="w-4 h-4"></i> Criar Primeira Viagem
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Viagem ativa atual
  const trip = state.trips.find(t => t.id === activeTripId) || state.trips[0];
  activeTripId = trip.id;

  // Cálculos financeiros da viagem
  const expenses = trip.expenses || [];
  const totalSpent = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const budget = Number(trip.budget) || 0;
  const remaining = budget > 0 ? (budget - totalSpent) : 0;
  const pctUsed = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 999) : 0;

  // Total gasto por pagador
  const paidGus = expenses.filter(e => e.payer === 'gus').reduce((s, e) => s + Number(e.amount), 0);
  const paidMaria = expenses.filter(e => e.payer === 'maria').reduce((s, e) => s + Number(e.amount), 0);
  const paidCasal = expenses.filter(e => e.payer === 'casal').reduce((s, e) => s + Number(e.amount), 0);

  // Acerto de contas simples: (Gus - Maria)/2 para equilibrar os gastos individuais
  const diff = paidGus - paidMaria;
  let splitSummary = '';
  if (Math.abs(diff) < 0.01) {
    splitSummary = 'Contas da viagem 100% equilibradas entre o casal! 🙌';
  } else if (diff > 0) {
    splitSummary = `${state.name2} deve repassar <strong>${fmtMoney(diff / 2)}</strong> para ${state.name1} para equilibrar os gastos.`;
  } else {
    splitSummary = `${state.name1} deve repassar <strong>${fmtMoney(Math.abs(diff) / 2)}</strong> para ${state.name2} para equilibrar os gastos.`;
  }

  // Agrupamento por categoria
  const catTotals = {};
  expenses.forEach(e => {
    const cat = e.category || 'outros';
    catTotals[cat] = (catTotals[cat] || 0) + (Number(e.amount) || 0);
  });

  // Filtros aplicados na lista
  const filteredExpenses = expenses.filter(e => {
    const matchCat = travelFilterCategory === 'all' || e.category === travelFilterCategory;
    const matchPayer = travelFilterPayer === 'all' || e.payer === travelFilterPayer;
    return matchCat && matchPayer;
  });

  container.innerHTML = `
    <!-- Barra Superior de Seleção de Viagem -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3 overflow-x-auto max-w-full pb-2 md:pb-0">
        <label class="text-xs uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5 shrink-0">
          <i data-lucide="compass" class="w-4 h-4 text-amber-400"></i> Viagem:
        </label>
        <select class="form-control bg-slate-900 border-slate-700 text-white font-medium py-1.5 px-3 text-sm rounded-lg" onchange="selectTrip(this.value)">
          ${state.trips.map(t => `<option value="${t.id}" ${t.id === trip.id ? 'selected' : ''}>${t.name} (${t.destination || 'Sem destino'})</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm shrink-0" onclick="openNewTripModal()" title="Cadastrar nova viagem">
          <i data-lucide="plus" class="w-3.5 h-3.5 text-amber-400"></i> Nova
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button class="btn btn-secondary btn-sm" onclick="editTrip('${trip.id}')" title="Editar detalhes da viagem">
          <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteTrip('${trip.id}')" title="Excluir viagem">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>

    <!-- Cards Principais de Indicadores -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="surface-card p-5 border-l-4 border-l-amber-400">
        <span class="text-xs font-mono uppercase text-slate-400">Orçamento Previsto</span>
        <div class="text-2xl font-bold text-white mt-1">${fmtMoney(budget)}</div>
        <div class="text-xs text-slate-500 mt-1">${trip.startDate ? `${fmtDate(trip.startDate)} a ${fmtDate(trip.endDate)}` : 'Datas a definir'}</div>
      </div>

      <div class="surface-card p-5 border-l-4 border-l-rose-400">
        <span class="text-xs font-mono uppercase text-slate-400">Total Gasto</span>
        <div class="text-2xl font-bold text-rose-400 mt-1">${fmtMoney(totalSpent)}</div>
        <div class="text-xs text-slate-400 mt-1">${expenses.length} lançamento(s)</div>
      </div>

      <div class="surface-card p-5 border-l-4 ${remaining >= 0 ? 'border-l-emerald-400' : 'border-l-rose-500'}">
        <span class="text-xs font-mono uppercase text-slate-400">${remaining >= 0 ? 'Saldo Restante' : 'Estourou em'}</span>
        <div class="text-2xl font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-500'} mt-1">${fmtMoney(Math.abs(remaining))}</div>
        <div class="text-xs text-slate-400 mt-1">${pctUsed}% do orçamento</div>
      </div>

      <div class="surface-card p-5 flex flex-col justify-between">
        <div>
          <span class="text-xs font-mono uppercase text-slate-400">Consumo do Orçamento</span>
          <div class="w-full bg-slate-800 rounded-full h-2.5 mt-2 overflow-hidden">
            <div class="h-2.5 rounded-full ${pctUsed > 100 ? 'bg-rose-500' : pctUsed > 80 ? 'bg-amber-400' : 'bg-emerald-400'}" style="width: ${Math.min(pctUsed, 100)}%"></div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm w-full mt-3" onclick="openNewTripExpenseModal('${trip.id}')">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> Lançar Despesa
        </button>
      </div>
    </div>

    <!-- Divisão Casal & Gráfico -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Card de Rateio do Casal -->
      <div class="surface-card p-6 flex flex-col justify-between">
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <i data-lucide="users" class="w-4 h-4 text-purple-400"></i> Quem Pagou o Quê?
          </h4>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span class="flex items-center gap-2 font-medium text-slate-300">
                <span class="w-2.5 h-2.5 rounded-full bg-sky-400"></span> ${state.name1}
              </span>
              <span class="font-bold text-white">${fmtMoney(paidGus)}</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span class="flex items-center gap-2 font-medium text-slate-300">
                <span class="w-2.5 h-2.5 rounded-full bg-pink-400"></span> ${state.name2}
              </span>
              <span class="font-bold text-white">${fmtMoney(paidMaria)}</span>
            </div>
            <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span class="flex items-center gap-2 font-medium text-slate-300">
                <span class="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Conta Conjunta / Casal
              </span>
              <span class="font-bold text-white">${fmtMoney(paidCasal)}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
          <i data-lucide="info" class="w-3.5 h-3.5 inline mr-1 text-amber-400"></i> ${splitSummary}
        </div>
      </div>

      <!-- Gráfico de Rosca por Categoria -->
      <div class="surface-card p-6 lg:col-span-2">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <i data-lucide="pie-chart" class="w-4 h-4 text-emerald-400"></i> Distribuição dos Gastos por Categoria
        </h4>
        <div class="flex flex-col sm:flex-row items-center justify-around gap-6">
          <div class="w-48 h-48 relative">
            <canvas id="travelDonutCanvas"></canvas>
          </div>
          <div class="grid grid-cols-2 gap-3 text-xs flex-1">
            ${['combustivel', 'hospedagem', 'alimentacao', 'passeio', 'compras', 'outros'].map(c => {
              const meta = getTripCategoryMeta(c);
              const val = catTotals[c] || 0;
              const pct = totalSpent > 0 ? ((val / totalSpent) * 100).toFixed(1) : '0';
              return `
                <div class="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800/80">
                  <div class="flex items-center gap-2 truncate">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${meta.color}"></span>
                    <span class="text-slate-300 truncate">${meta.label.split('/')[0]}</span>
                  </div>
                  <span class="font-mono text-white font-semibold">${fmtMoney(val)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico de Gastos por Dia da Viagem -->
    <div class="surface-card p-6 mb-8">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-sky-400"></i> Gastos por Dia da Viagem
          </h4>
          <p class="text-xs text-slate-500 mt-0.5">Distribuição diária dos gastos e média por dia da viagem.</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="badge badge-green text-xs" id="travelDailyAverageBadge">Média: R$ 0,00/dia</span>
          <span class="badge badge-gus text-xs" id="travelDailyPeakBadge">Pico: R$ 0,00</span>
        </div>
      </div>
      <div class="h-60 relative w-full">
        <canvas id="travelDailyBarCanvas"></canvas>
      </div>
    </div>

    <!-- Tabela / Lista de Gastos da Viagem -->
    <div class="surface-card p-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <i data-lucide="receipt" class="w-4 h-4 text-amber-400"></i> Despesas Registradas
        </h4>

        <!-- Filtros Rápidos -->
        <div class="flex flex-wrap items-center gap-2">
          <select class="form-control bg-slate-900 border-slate-700 text-xs py-1 px-2.5 rounded-md text-slate-300" onchange="filterTravelCategory(this.value)">
            <option value="all" ${travelFilterCategory === 'all' ? 'selected' : ''}>Todas as Categorias</option>
            <option value="combustivel" ${travelFilterCategory === 'combustivel' ? 'selected' : ''}>⛽ Combustível</option>
            <option value="hospedagem" ${travelFilterCategory === 'hospedagem' ? 'selected' : ''}>🏨 Hospedagem</option>
            <option value="alimentacao" ${travelFilterCategory === 'alimentacao' ? 'selected' : ''}>🍽️ Alimentação</option>
            <option value="passeio" ${travelFilterCategory === 'passeio' ? 'selected' : ''}>🎟️ Passeios</option>
            <option value="compras" ${travelFilterCategory === 'compras' ? 'selected' : ''}>🛍️ Compras</option>
            <option value="outros" ${travelFilterCategory === 'outros' ? 'selected' : ''}>📦 Outros</option>
          </select>

          <select class="form-control bg-slate-900 border-slate-700 text-xs py-1 px-2.5 rounded-md text-slate-300" onchange="filterTravelPayer(this.value)">
            <option value="all" ${travelFilterPayer === 'all' ? 'selected' : ''}>Todos os Pagadores</option>
            <option value="gus" ${travelFilterPayer === 'gus' ? 'selected' : ''}>${state.name1}</option>
            <option value="maria" ${travelFilterPayer === 'maria' ? 'selected' : ''}>${state.name2}</option>
            <option value="casal" ${travelFilterPayer === 'casal' ? 'selected' : ''}>Casal</option>
          </select>

          <button class="btn btn-primary btn-sm" onclick="openNewTripExpenseModal('${trip.id}')">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Novo Gasto
          </button>
        </div>
      </div>

      ${filteredExpenses.length === 0 ? `
        <div class="text-center py-10 text-slate-500 text-sm">
          Nenhuma despesa encontrada para os filtros selecionados.
        </div>
      ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
                <th class="py-3 px-3">Data</th>
                <th class="py-3 px-3">Descrição</th>
                <th class="py-3 px-3">Categoria</th>
                <th class="py-3 px-3">Pago por</th>
                <th class="py-3 px-3 text-right">Valor</th>
                <th class="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${filteredExpenses.slice().reverse().map(e => {
                const meta = getTripCategoryMeta(e.category);
                const badgeClass = e.payer === 'gus' ? 'badge-gus' : e.payer === 'maria' ? 'badge-maria' : 'badge-casal';
                const payerName = e.payer === 'gus' ? state.name1 : e.payer === 'maria' ? state.name2 : 'Casal';
                return `
                  <tr class="hover:bg-slate-800/20 transition-colors">
                    <td class="py-3 px-3 text-slate-400 font-mono text-xs whitespace-nowrap">${fmtDate(e.date)}</td>
                    <td class="py-3 px-3 font-medium text-white">${e.description || '—'}${e.notes ? `<span class="block text-xs text-slate-400 font-normal">${e.notes}</span>` : ''}</td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium" style="background: ${meta.color}20; color: ${meta.color}; border: 1px solid ${meta.color}40">
                        <i data-lucide="${meta.icon}" class="w-3 h-3"></i> ${meta.label}
                      </span>
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="badge ${badgeClass}">${payerName}</span>
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">${fmtMoney(e.amount)}</td>
                    <td class="py-3 px-3 text-right whitespace-nowrap">
                      <button class="btn btn-ghost btn-sm text-slate-400 hover:text-rose-400" onclick="deleteTripExpense('${trip.id}', '${e.id}')" title="Excluir gasto">
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

  if (window.lucide) lucide.createIcons();
  renderTravelDonutChart(catTotals);
  renderTravelDailyChart(expenses, trip);
}

function renderTravelDonutChart(catTotals) {
  const canvas = document.getElementById('travelDonutCanvas');
  if (!canvas || !window.Chart) return;

  if (travelCategoryChart) {
    travelCategoryChart.destroy();
  }

  const categories = ['combustivel', 'hospedagem', 'alimentacao', 'passeio', 'compras', 'outros'];
  const labels = [];
  const data = [];
  const bgColors = [];

  categories.forEach(c => {
    const val = catTotals[c] || 0;
    if (val > 0) {
      const meta = getTripCategoryMeta(c);
      labels.push(meta.label.split('/')[0].trim());
      data.push(val);
      bgColors.push(meta.color);
    }
  });

  if (data.length === 0) {
    labels.push('Sem gastos');
    data.push(1);
    bgColors.push('#282c3f');
  }

  const ctx = canvas.getContext('2d');
  travelCategoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderColor: '#13141c',
        borderWidth: 3,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1c28',
          titleColor: '#f0f1f7',
          bodyColor: '#9ba1b6',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const val = context.raw || 0;
              return ` ${context.label}: ${fmtMoney(val)}`;
            }
          }
        }
      },
      cutout: '72%'
    }
  });
}

function renderTravelDailyChart(expenses, trip) {
  const canvas = document.getElementById('travelDailyBarCanvas');
  if (!canvas || !window.Chart) return;

  if (travelDailyBarChart) {
    travelDailyBarChart.destroy();
    travelDailyBarChart = null;
  }

  // Agrupa os gastos por data
  const dailyTotals = {};
  (expenses || []).forEach(e => {
    const d = e.date || 'Sem data';
    dailyTotals[d] = (dailyTotals[d] || 0) + (Number(e.amount) || 0);
  });

  const sortedDates = Object.keys(dailyTotals).sort();
  const daysCount = sortedDates.length;
  const totalSpent = Object.values(dailyTotals).reduce((a, b) => a + b, 0);
  const dailyAvg = daysCount > 0 ? (totalSpent / daysCount) : 0;

  let peakVal = 0;
  let peakDate = '';
  sortedDates.forEach(d => {
    if (dailyTotals[d] > peakVal) {
      peakVal = dailyTotals[d];
      peakDate = d;
    }
  });

  const avgBadge = document.getElementById('travelDailyAverageBadge');
  if (avgBadge) {
    avgBadge.textContent = daysCount > 0 ? `Média: ${fmtMoney(dailyAvg)}/dia (${daysCount} ${daysCount === 1 ? 'dia' : 'dias'})` : 'Média: R$ 0,00/dia';
  }

  const peakBadge = document.getElementById('travelDailyPeakBadge');
  if (peakBadge) {
    peakBadge.textContent = peakVal > 0 ? `Pico: ${fmtMoney(peakVal)} (${fmtDate(peakDate).slice(0, 5)})` : 'Pico: R$ 0,00';
  }

  const labels = sortedDates.map(d => {
    if (d === 'Sem data') return d;
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
  });
  const data = sortedDates.map(d => dailyTotals[d]);

  if (data.length === 0) {
    labels.push('Sem despesas');
    data.push(0);
  }

  const ctx = canvas.getContext('2d');
  travelDailyBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Gasto diário',
        data: data,
        backgroundColor: 'rgba(56, 189, 248, 0.8)',
        hoverBackgroundColor: '#38bdf8',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1c28',
          titleColor: '#f0f1f7',
          bodyColor: '#38bdf8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: function(items) {
              const idx = items[0].dataIndex;
              const fullDate = sortedDates[idx];
              return fullDate && fullDate !== 'Sem data' ? `Dia: ${fmtDate(fullDate)}` : items[0].label;
            },
            label: function(context) {
              return ` Total gasto: ${fmtMoney(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ba1b6', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: {
            color: '#9ba1b6',
            font: { size: 10 },
            callback: function(val) {
              return 'R$ ' + val;
            }
          }
        }
      }
    }
  });
}

function selectTrip(id) {
  activeTripId = id;
  renderTravelView();
}

function filterTravelCategory(cat) {
  travelFilterCategory = cat;
  renderTravelView();
}

function filterTravelPayer(payer) {
  travelFilterPayer = payer;
  renderTravelView();
}

// ===================== MODAIS DE VIAGEM =====================

function openNewTripModal() {
  const modal = document.getElementById('modalTrip');
  if (!modal) return;
  document.getElementById('tripForm').reset();
  document.getElementById('tripModalTitle').textContent = 'Nova Viagem';
  document.getElementById('tripIdField').value = '';
  modal.classList.add('active');
}

function editTrip(id) {
  const trip = state.trips.find(t => t.id === id);
  if (!trip) return;
  const modal = document.getElementById('modalTrip');
  document.getElementById('tripModalTitle').textContent = 'Editar Viagem';
  document.getElementById('tripIdField').value = trip.id;
  document.getElementById('tripName').value = trip.name || '';
  document.getElementById('tripDestination').value = trip.destination || '';
  document.getElementById('tripStartDate').value = trip.startDate || '';
  document.getElementById('tripEndDate').value = trip.endDate || '';
  document.getElementById('tripBudget').value = trip.budget || '';
  document.getElementById('tripNotes').value = trip.notes || '';
  modal.classList.add('active');
}

function saveTripSubmit(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('tripIdField').value;
  const name = document.getElementById('tripName').value.trim();
  const destination = document.getElementById('tripDestination').value.trim();
  const startDate = document.getElementById('tripStartDate').value;
  const endDate = document.getElementById('tripEndDate').value;
  const budget = parseFloat(document.getElementById('tripBudget').value) || 0;
  const notes = document.getElementById('tripNotes').value.trim();

  if (!name) {
    showToast('Informe o nome da viagem', 'error');
    return;
  }

  if (id) {
    const existing = state.trips.find(t => t.id === id);
    if (existing) {
      existing.name = name;
      existing.destination = destination;
      existing.startDate = startDate;
      existing.endDate = endDate;
      existing.budget = budget;
      existing.notes = notes;
    }
    showToast('Viagem atualizada!', 'success');
  } else {
    const newTrip = {
      id: uid(),
      name,
      destination,
      startDate,
      endDate,
      budget,
      notes,
      status: 'planned',
      expenses: []
    };
    state.trips.push(newTrip);
    activeTripId = newTrip.id;
    showToast('Nova viagem criada com sucesso! ✈️', 'success');
  }

  saveState();
  closeModal('modalTrip');
  renderTravelView();
}

function deleteTrip(id) {
  const trip = state.trips.find(t => t.id === id);
  if (!trip) return;

  if (confirm(`Excluir a viagem "${trip.name}" e todas as suas despesas registradas?`)) {
    state.trips = state.trips.filter(t => t.id !== id);
    activeTripId = state.trips.length > 0 ? state.trips[0].id : null;
    saveState();
    showToast('Viagem excluída', 'info');
    renderTravelView();
  }
}

// Modais de Despesa da Viagem
function openNewTripExpenseModal(tripId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;

  const modal = document.getElementById('modalTripExpense');
  document.getElementById('tripExpenseForm').reset();
  document.getElementById('tripExpenseTripId').value = tripId;
  document.getElementById('tripExpenseDate').value = new Date().toISOString().slice(0, 10);
  
  // Atualiza nomes de Gus e Maria no select
  const selectPayer = document.getElementById('tripExpensePayer');
  if (selectPayer) {
    selectPayer.options[0].text = state.name1;
    selectPayer.options[1].text = state.name2;
  }

  modal.classList.add('active');
}

function saveTripExpenseSubmit(e) {
  if (e) e.preventDefault();
  const tripId = document.getElementById('tripExpenseTripId').value;
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;

  const description = document.getElementById('tripExpenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('tripExpenseAmount').value) || 0;
  const category = document.getElementById('tripExpenseCategory').value;
  const payer = document.getElementById('tripExpensePayer').value;
  const date = document.getElementById('tripExpenseDate').value;
  const notes = document.getElementById('tripExpenseNotes').value.trim();

  if (!description || amount <= 0) {
    showToast('Preencha a descrição e um valor válido', 'error');
    return;
  }

  if (!trip.expenses) trip.expenses = [];
  trip.expenses.push({
    id: uid(),
    description,
    amount,
    category,
    payer,
    date: date || new Date().toISOString().slice(0, 10),
    notes
  });

  saveState();
  closeModal('modalTripExpense');
  showToast('Despesa da viagem lançada! 💸', 'success');
  renderTravelView();
}

function deleteTripExpense(tripId, expId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip || !trip.expenses) return;

  trip.expenses = trip.expenses.filter(e => e.id !== expId);
  saveState();
  showToast('Despesa removida', 'info');
  renderTravelView();
}

