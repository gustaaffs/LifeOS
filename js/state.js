// ==========================================================================
// LIFE OS — GLOBAL STATE MANAGEMENT & REPOSITORY SCHEMA
// ==========================================================================

const STORAGE_KEY = 'lifeos_v6';
const GH_TOKEN_KEY = 'lifeos_gh_token';
const GH_CONFIG_KEY = 'lifeos_gh_config';

function defaultState() {
  return {
    name1: 'Gus',
    name2: 'Maria',
    salaries: { gus: 4000, maria: 3000 },
    cardClosingDay: 1,
    rules: [
      { id: 'cat_moradia',     name: 'Casa',        color: '#10b981' },
      { id: 'cat_cartao',      name: 'Cartão',      color: '#f59e0b' },
      { id: 'cat_divida',      name: 'Dívida',      color: '#f43f5e' },
      { id: 'cat_alimentacao', name: 'Alimentação', color: '#ec4899' },
      { id: 'cat_transporte',  name: 'Transporte',  color: '#38bdf8' },
      { id: 'cat_lazer',       name: 'Lazer',       color: '#a855f7' },
      { id: 'cat_outros',      name: 'Outros',      color: '#9ba1b6' },
    ],
    planBuckets: [
      { id: '7buv3di', name: 'Essenciais',                 pct: 50, color: '#38bdf8', isSpending: true },
      { id: 'e7cd1q7', name: 'Mesada',                     pct: 20, color: '#f0f1f7', isSpending: false },
      { id: '9u0bmtj', name: 'Investimentos + Reserva',    pct: 20, color: '#10b981', isSpending: false },
      { id: 'teufyrt', name: 'Metas de curto/médio prazo', pct: 10, color: '#ec4899', isSpending: false }
    ],
    monthActuals: {},
    entries: [],
    recurring: [],
    cardExpenses: [],
    cards: [],
    cardInvoices: [],
    goals: [],
    cofrinhos: [],
    tasks: [],
    taskChecks: {},
    study: {
      gus: { sessions: [] },
      maria: { sessions: [] }
    },
    // NOVO MÓDULO VIAGENS
    trips: [],
    _cardModelMigrated: true
  };
}

let state = defaultState();
let currentMonth = new Date().toISOString().slice(0, 7);

// Carregamento de Estado com Migração e Fallback
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(defaultState(), parsed);
      
      // Garante que o array de viagens exista
      if (!Array.isArray(state.trips)) {
        state.trips = [];
      }
      
      // Migração de baldes
      if (state.planBuckets && state.planBuckets.length && !state.planBuckets.some(b => b.isSpending)) {
        state.planBuckets[0].isSpending = true;
      }
      return state;
    }
  } catch (err) {
    console.error('Erro ao ler localStorage:', err);
  }

  state = defaultState();
  return state;
}

// Salva no LocalStorage e notifica componentes
function saveState(options = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('lifeos-state-changed', { detail: { state } }));
    
    // Atualiza indicador visual
    if (typeof updateSyncIndicator === 'function') {
      updateSyncIndicator('saved');
    }
  } catch (err) {
    console.error('Erro ao salvar state:', err);
  }
}

// ===================== HELPER FUNCTIONS =====================

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

function fmtMoney(val) {
  const num = Number(val || 0);
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  // Formata YYYY-MM-DD para DD/MM/YYYY
  const parts = d.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return d;
}

function getTripCategoryMeta(cat) {
  const map = {
    combustivel: { label: 'Combustível / Transporte', icon: 'fuel', color: '#f59e0b' },
    hospedagem:  { label: 'Hospedagem',              icon: 'bed', color: '#6366f1' },
    alimentacao: { label: 'Alimentação',             icon: 'utensils', color: '#10b981' },
    passeio:     { label: 'Passeios & Lazer',         icon: 'ticket', color: '#ec4899' },
    compras:     { label: 'Compras & Souvenirs',     icon: 'shopping-bag', color: '#a855f7' },
    outros:      { label: 'Outros / Emergências',     icon: 'help-circle', color: '#9ba1b6' },
  };
  return map[cat] || { label: cat, icon: 'tag', color: '#9ba1b6' };
}

// Inicializa estado imediato
state = loadState();

