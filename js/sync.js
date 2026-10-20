// ==========================================================================
// LIFE OS — SYNC & PERSISTENCE ADAPTER (GitHub API, data.json & Backup)
// ==========================================================================

function getGHConfig() {
  try {
    const raw = localStorage.getItem(GH_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    repo: 'gustaaffs/LifeOS',
    branch: 'main',
    file: 'data.json'
  };
}

function hasGHConfig() {
  const token = localStorage.getItem(GH_TOKEN_KEY) || '';
  const cfg = getGHConfig();
  return !!(token && cfg.repo);
}

function updateSyncIndicator(status, text) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncText');
  const mobileBtn = document.getElementById('syncBtnMobile');

  if (!dot || !label) return;

  dot.className = 'w-2 h-2 rounded-full transition-all duration-300 ';
  
  if (status === 'syncing') {
    dot.className += 'bg-amber-400 animate-pulse';
    label.textContent = text || 'Sincronizando...';
    if (mobileBtn) mobileBtn.classList.add('opacity-70', 'animate-spin');
  } else if (status === 'saved') {
    dot.className += 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    label.textContent = text || (hasGHConfig() ? 'Sincronizado' : 'Salvo local');
    if (mobileBtn) mobileBtn.classList.remove('opacity-70', 'animate-spin');
  } else if (status === 'error') {
    dot.className += 'bg-rose-500';
    label.textContent = text || 'Erro sync';
    if (mobileBtn) mobileBtn.classList.remove('opacity-70', 'animate-spin');
  } else {
    dot.className += 'bg-slate-400';
    label.textContent = text || 'Local';
    if (mobileBtn) mobileBtn.classList.remove('opacity-70', 'animate-spin');
  }
}

// Puxar dados do GitHub
async function pullFromGitHub(silent = false) {
  const token = localStorage.getItem(GH_TOKEN_KEY) || '';
  const cfg = getGHConfig();

  if (!token || !cfg.repo) {
    if (!silent) showToast('Configure o Token e Repositório nas Configurações', 'error');
    return false;
  }

  updateSyncIndicator('syncing', 'Baixando do GitHub...');
  try {
    const [owner, repo] = cfg.repo.split('/');
    const branch = cfg.branch || 'main';
    const file = cfg.file || 'data.json';

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file}?ref=${branch}`, {
      headers: {
        Authorization: 'token ' + token,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      throw new Error(`Status ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    // Decodifica UTF-8 base64 com segurança
    const decodedStr = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
    const remoteData = JSON.parse(decodedStr);

    state = Object.assign(defaultState(), remoteData);
    saveState();
    
    updateSyncIndicator('saved', 'Atualizado do GitHub');
    if (!silent) showToast('Dados atualizados com sucesso do GitHub! ✨', 'success');
    
    // Dispara recarregamento da interface
    window.dispatchEvent(new CustomEvent('lifeos-render-all'));
    return true;
  } catch (err) {
    console.error('Erro ao puxar do GitHub:', err);
    updateSyncIndicator('error', 'Falha ao baixar');
    if (!silent) showToast('Erro ao sincronizar: ' + err.message, 'error');
    return false;
  }
}

// Enviar dados para o GitHub (salvar no data.json do repositório)
async function pushToGitHub(silent = false) {
  const token = localStorage.getItem(GH_TOKEN_KEY) || '';
  const cfg = getGHConfig();

  if (!token || !cfg.repo) {
    if (!silent) showToast('Configure o Token e Repositório do GitHub em Configurações', 'error');
    return false;
  }

  updateSyncIndicator('syncing', 'Enviando ao GitHub...');
  try {
    const [owner, repo] = cfg.repo.split('/');
    const branch = cfg.branch || 'main';
    const file = cfg.file || 'data.json';

    // 1. Obter o SHA atual do arquivo no repositório
    let currentSha = null;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file}?ref=${branch}`, {
        headers: {
          Authorization: 'token ' + token,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      }
    } catch (e) {
      console.warn('Não foi possível obter SHA existente, tentando criar:', e);
    }

    // 2. Codificar JSON em Base64 UTF-8 seguro
    const jsonStr = JSON.stringify(state, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));

    // 3. Fazer PUT commit
    const putBody = {
      message: `Sync Life OS [${new Date().toISOString().replace('T', ' ').slice(0, 19)}]`,
      content: encodedContent,
      branch: branch
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, {
      method: 'PUT',
      headers: {
        Authorization: 'token ' + token,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `Erro HTTP ${putRes.status}`);
    }

    updateSyncIndicator('saved', 'GitHub Atualizado');
    if (!silent) showToast('Sincronizado e salvo no GitHub! ✓', 'success');
    return true;
  } catch (err) {
    console.error('Erro ao enviar para o GitHub:', err);
    updateSyncIndicator('error', 'Erro ao salvar');
    if (!silent) showToast('Erro ao sincronizar com GitHub: ' + err.message, 'error');
    return false;
  }
}

// Carregar data.json local inicial se localStorage estiver vazio
async function loadInitialDataJsonIfEmpty() {
  const hasLocal = localStorage.getItem(STORAGE_KEY);
  if (!hasLocal) {
    try {
      const res = await fetch('data.json');
      if (res.ok) {
        const initialJson = await res.json();
        state = Object.assign(defaultState(), initialJson);
        saveState();
        console.log('Dados iniciais carregados com sucesso do data.json local');
        window.dispatchEvent(new CustomEvent('lifeos-render-all'));
      }
    } catch (e) {
      console.log('Nenhum data.json encontrado ou erro de CORS local:', e);
    }
  }
}

// Exportar Backup para arquivo .json local
function exportDataBackup() {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup exportado com sucesso! 📁', 'success');
}

// Importar Backup de arquivo .json
function importDataBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (typeof parsed === 'object' && parsed !== null) {
        state = Object.assign(defaultState(), parsed);
        saveState();
        showToast('Dados restaurados com sucesso! ✨', 'success');
        window.dispatchEvent(new CustomEvent('lifeos-render-all'));
      } else {
        throw new Error('Arquivo com formato inválido');
      }
    } catch (err) {
      showToast('Erro ao ler arquivo JSON: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

