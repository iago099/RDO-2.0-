// app.js - Lógica Especializada para Redes de Distribuição de Energia (Linha Viva & Linha Morta - Padrão Equatorial)
// Inclui: Controle Dinâmico de Estoque (+/-), Vinculação por Viatura (ex: PI-FAO-V001M) e Geração Direta de PDF

(function () {
  'use strict';

  const STORAGE_KEY = 'gepops_eqtl_piaui_v3';
  const THEME_KEY = 'gepops_theme_preference';

  let state = {
    teams: [],
    materials: [],
    checkins: [],
    rdos: [],
    selectedTeamFilter: 'all',
    activeView: 'dashboard-view',
    theme: 'dark'
  };

  let charts = {
    productivity: null,
    materials: null,
    teamsHours: null,
    weather: null
  };

  let currentRdoPhotos = [];
  let currentViewingRdoId = '';
  let currentViewingCautelaTeamId = '';
  let isQuickAddFromRdo = false;

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================
  function initApp() {
    loadState();
    setupTheme();
    setupNavigation();
    setupClock();
    setupEventListeners();
    populateSelects();
    renderAll();
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        // Garantir que materiais e equipes tenham campos novos
        ensureDataIntegrity();
      } else {
        resetToSeedData(false);
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage, usando seed data:', e);
      resetToSeedData(false);
    }
  }

  function ensureDataIntegrity() {
    if (!state.materials || state.materials.length < 20) {
      state.materials = JSON.parse(JSON.stringify(INITIAL_MATERIALS));
    } else {
      // Mesclar novos materiais normativos (BRT e Cabos) se ainda não existirem
      INITIAL_MATERIALS.forEach(initMat => {
        if (!state.materials.some(m => m.id === initMat.id || m.name.toLowerCase() === initMat.name.toLowerCase())) {
          state.materials.push(JSON.parse(JSON.stringify(initMat)));
        }
      });
    }

    // Garantir que todos os materiais tenham stock
    state.materials.forEach(m => {
      if (m.stock === undefined) m.stock = m.defaultQty || 25;
    });

    if (!state.teams || state.teams.length === 0) {
      state.teams = JSON.parse(JSON.stringify(INITIAL_TEAMS));
    }
    // Garantir que as equipes tenham allocatedMaterials
    state.teams.forEach(t => {
      if (!t.allocatedMaterials) t.allocatedMaterials = [];
    });

    // Garantir que os RDOs tenham o croqui EXTEC inicial
    if (state.rdos && state.rdos.length > 0) {
      state.rdos.forEach(r => {
        if (!r.canvasExtec) {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 860;
          offCanvas.height = 320;
          const offCtx = offCanvas.getContext('2d');
          if (r.id === 'RDO-EQTL-002') {
            drawTemplateCabos(offCtx, 860, 320);
          } else {
            drawTemplateBrt(offCtx, 860, 320);
          }
          r.canvasExtec = offCanvas.toDataURL('image/png');
        }
      });
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
      showToast('Erro ao salvar dados localmente', 'danger');
    }
  }

  function resetToSeedData(notify = true) {
    state.teams = JSON.parse(JSON.stringify(INITIAL_TEAMS));
    state.materials = JSON.parse(JSON.stringify(INITIAL_MATERIALS));
    state.checkins = JSON.parse(JSON.stringify(INITIAL_CHECKINS));
    state.rdos = JSON.parse(JSON.stringify(INITIAL_RDOS));
    state.selectedTeamFilter = 'all';
    saveState();
    populateSelects();
    renderAll();
    if (notify) {
      showToast('Dados restaurados para o padrão Equatorial Piauí!', 'success');
    }
  }

  // ==========================================
  // TEMA (DARK / LIGHT)
  // ==========================================
  function setupTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme);

    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const next = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
      });
    }
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateAllCharts();
  }

  // ==========================================
  // NAVEGAÇÃO & RELÓGIO
  // ==========================================
  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        switchView(targetView);
        if (window.innerWidth <= 900 && sidebar) {
          sidebar.classList.remove('mobile-open');
          sidebarBackdrop?.classList.remove('active');
        }
      });
    });

    const btnMobile = document.getElementById('btn-mobile-menu');
    if (btnMobile && sidebar) {
      btnMobile.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('mobile-open');
        sidebarBackdrop?.classList.toggle('active', isOpen);
      });
    }

    if (sidebarBackdrop && sidebar) {
      sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarBackdrop.classList.remove('active');
      });
    }
  }

  window.switchView = function (viewId) {
    state.activeView = viewId;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.page-view').forEach(el => {
      el.classList.toggle('active', el.id === viewId);
    });

    const titles = {
      'dashboard-view': { title: 'Operações em Rede de Distribuição MT/BT', sub: 'Controle de Linha Viva, Linha Morta, materiais técnicos e RDOs' },
      'checkin-view': { title: 'Controle de Check-in / Check-out em Campo', sub: 'Registro diário de início e término de turno das equipes de rede' },
      'rdo-view': { title: 'Relatórios Diários de Operação - RDO (LV/LM)', sub: 'Emissão, consulta e folha técnica com subestação, alimentador e APR' },
      'materials-view': { title: 'Catálogo de Materiais & Ferragens de Rede', sub: 'Padrão Equatorial Piauí: controle de estoque (+/-), viaturas e RDOs' },
      'teams-view': { title: 'Equipes Operacionais de Linha', sub: 'Equipes de Linha Viva (Cesta/Contato), Linha Morta e Cautela de Viatura' }
    };

    const current = titles[viewId] || titles['dashboard-view'];
    document.getElementById('current-view-title').textContent = current.title;
    document.getElementById('current-view-subtitle').textContent = current.sub;

    if (viewId === 'dashboard-view') {
      setTimeout(() => updateAllCharts(), 50);
    }
  };

  function setupClock() {
    function update() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR');
      const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

      const clockEl = document.getElementById('live-clock');
      const dateEl = document.getElementById('live-date');
      if (clockEl) clockEl.textContent = timeStr;
      if (dateEl) dateEl.textContent = dateStr;
    }
    update();
    setInterval(update, 1000);
  }

  // ==========================================
  // FILTROS & SELECTS
  // ==========================================
  function populateSelects() {
    const globalFilter = document.getElementById('global-team-filter');
    const chkTeamSelect = document.getElementById('chk-team-select');
    const rdoTeamSelect = document.getElementById('rdo-team');
    const allocTeamSelect = document.getElementById('alloc-team-select');
    const allocMatSelect = document.getElementById('alloc-material-select');
    const cautelaMatSelect = document.getElementById('cautela-mat-select');

    if (globalFilter) {
      const currentVal = globalFilter.value || 'all';
      globalFilter.innerHTML = '<option value="all">Todas as Equipes de Linha</option>';
      state.teams.forEach(t => {
        globalFilter.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      });
      globalFilter.value = currentVal;
    }

    if (chkTeamSelect) {
      chkTeamSelect.innerHTML = '<option value="">Selecione a equipe de linha...</option>';
      state.teams.forEach(t => {
        chkTeamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      });
    }

    if (rdoTeamSelect) {
      rdoTeamSelect.innerHTML = '<option value="">Selecione a equipe de linha...</option>';
      state.teams.forEach(t => {
        rdoTeamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      });
    }

    if (allocTeamSelect) {
      allocTeamSelect.innerHTML = '<option value="">Selecione a equipe / viatura...</option>';
      state.teams.forEach(t => {
        allocTeamSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
      });
    }

    if (allocMatSelect) {
      allocMatSelect.innerHTML = '<option value="">Selecione o material da base...</option>';
      state.materials.forEach(m => {
        allocMatSelect.innerHTML += `<option value="${m.id}">${m.name} (Saldo: ${m.stock || 0} ${m.unit})</option>`;
      });
    }

    if (cautelaMatSelect) {
      cautelaMatSelect.innerHTML = '<option value="">Selecione o material...</option>';
      state.materials.forEach(m => {
        cautelaMatSelect.innerHTML += `<option value="${m.id}">${m.name} (Disponível na base: ${m.stock || 0} ${m.unit})</option>`;
      });
    }
  }

  function setupEventListeners() {
    // Filtro global
    document.getElementById('global-team-filter')?.addEventListener('change', (e) => {
      state.selectedTeamFilter = e.target.value;
      renderAll();
    });

    // Botões Novo RDO
    document.getElementById('btn-quick-new-rdo')?.addEventListener('click', () => openNewRdoModal());
    document.getElementById('btn-create-rdo-top')?.addEventListener('click', () => openNewRdoModal());

    // Modal RDO Fechar / Cancelar
    document.getElementById('btn-close-modal-rdo')?.addEventListener('click', closeRdoModal);
    document.getElementById('btn-cancel-rdo')?.addEventListener('click', closeRdoModal);
    document.getElementById('btn-save-rdo')?.addEventListener('click', handleSaveRdo);

    // Templates Normativos no RDO (BRT & Lançamento de Cabos)
    document.getElementById('btn-quick-act-brt')?.addEventListener('click', loadNormativeBrtActivities);
    document.getElementById('btn-quick-act-cabos')?.addEventListener('click', loadNormativeCabosActivities);
    document.getElementById('btn-quick-mat-brt')?.addEventListener('click', loadNormativeBrtMaterials);
    document.getElementById('btn-quick-mat-cabos')?.addEventListener('click', loadNormativeCabosMaterials);

    // Canvas EXTEC Toolbar & Templates
    document.getElementById('btn-draw-template-brt')?.addEventListener('click', () => drawTemplateBrt());
    document.getElementById('btn-draw-template-cabos')?.addEventListener('click', () => drawTemplateCabos());
    document.getElementById('btn-clear-canvas-extec')?.addEventListener('click', () => {
      if (confirm('Deseja limpar todo o desenho do croqui EXTEC?')) {
        if (ctxExtec && canvasExtec) {
          drawCanvasGrid(ctxExtec, canvasExtec.width, canvasExtec.height);
          showToast('Croqui EXTEC limpo.', 'info');
        }
      }
    });

    // Ferramentas do Canvas EXTEC
    document.querySelectorAll('.btn-canvas-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-canvas-tool').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.btn-canvas-stamp').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        canvasTool = btn.dataset.tool;
        canvasCurrentStamp = null;
      });
    });

    // Carimbos do Canvas EXTEC
    document.querySelectorAll('.btn-canvas-stamp').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-canvas-tool').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.btn-canvas-stamp').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        canvasTool = 'stamp';
        canvasCurrentStamp = btn.dataset.stamp;
        showToast(`Clique no croqui para carimbar "${btn.textContent.trim()}".`, 'info');
      });
    });

    // Paleta de Cores do Canvas
    document.querySelectorAll('#canvas-color-palette .color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('#canvas-color-palette .color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        canvasColor = dot.dataset.color;
        if (canvasTool === 'eraser') {
          const penBtn = document.querySelector('.btn-canvas-tool[data-tool="pen"]');
          if (penBtn) penBtn.click();
        }
      });
    });

    // Espessura do traço
    document.getElementById('canvas-line-width')?.addEventListener('change', (e) => {
      canvasLineWidth = Number(e.target.value) || 4;
    });

    // Modal View RDO (Impressão & PDF)
    document.getElementById('btn-close-view-rdo')?.addEventListener('click', () => {
      document.getElementById('modal-view-rdo').classList.remove('active');
    });
    document.getElementById('btn-print-rdo')?.addEventListener('click', () => {
      window.print();
    });
    document.getElementById('btn-download-rdo-pdf')?.addEventListener('click', handleDownloadRdoPdf);
    document.getElementById('btn-share-rdo-whatsapp')?.addEventListener('click', () => {
      if (currentViewingRdoId) {
        openRdoWhatsAppModal(currentViewingRdoId);
      }
    });

    // Modal WhatsApp RDO
    document.getElementById('btn-close-modal-whatsapp')?.addEventListener('click', closeRdoWhatsAppModal);
    document.getElementById('btn-cancel-whatsapp')?.addEventListener('click', closeRdoWhatsAppModal);
    document.getElementById('btn-copy-whatsapp-text')?.addEventListener('click', handleCopyWhatsAppText);
    document.getElementById('btn-open-whatsapp-link')?.addEventListener('click', handleOpenWhatsAppLink);

    // Modal Materiais
    document.getElementById('btn-open-material-modal')?.addEventListener('click', () => openMaterialModal(false));
    document.getElementById('btn-close-modal-material')?.addEventListener('click', closeMaterialModal);
    document.getElementById('btn-cancel-material')?.addEventListener('click', closeMaterialModal);
    document.getElementById('btn-save-material')?.addEventListener('click', handleSaveMaterial);

    // Botão rápido de adicionar material dentro do RDO
    document.getElementById('btn-quick-add-material-to-catalog')?.addEventListener('click', () => {
      openMaterialModal(true);
    });

    // Modal Importar Planilha
    document.getElementById('btn-open-sheet-import')?.addEventListener('click', openSheetImportModal);
    document.getElementById('btn-close-modal-sheet-import')?.addEventListener('click', closeSheetImportModal);
    document.getElementById('btn-cancel-sheet-import')?.addEventListener('click', closeSheetImportModal);
    document.getElementById('btn-fetch-sheet-url')?.addEventListener('click', handleFetchSheetUrl);
    document.getElementById('btn-process-sheet-import')?.addEventListener('click', handleProcessSheetImport);

    // Modal Vinculação de Material por Equipe
    document.getElementById('btn-open-allocate-modal')?.addEventListener('click', () => openAllocateMaterialModal());
    document.getElementById('btn-close-modal-allocate')?.addEventListener('click', closeAllocateModal);
    document.getElementById('btn-cancel-allocate')?.addEventListener('click', closeAllocateModal);
    document.getElementById('btn-save-allocate')?.addEventListener('click', handleSaveAllocateMaterial);

    // Modal Cautela de Viatura
    document.getElementById('btn-close-modal-cautela')?.addEventListener('click', closeTeamCautelaModal);
    document.getElementById('form-add-to-vehicle')?.addEventListener('submit', handleAddMaterialToVehicle);
    document.getElementById('btn-download-cautela-pdf')?.addEventListener('click', handleDownloadCautelaPdf);

    // Modal Movimentação Manual de Estoque (+ / -)
    document.getElementById('btn-close-modal-stock')?.addEventListener('click', closeStockModal);
    document.getElementById('btn-cancel-stock')?.addEventListener('click', closeStockModal);
    document.getElementById('btn-save-stock')?.addEventListener('click', handleSaveStockMovement);

    // Modal Equipes
    document.getElementById('btn-open-team-modal')?.addEventListener('click', openTeamModal);
    document.getElementById('btn-close-modal-team')?.addEventListener('click', closeTeamModal);
    document.getElementById('btn-cancel-team')?.addEventListener('click', closeTeamModal);
    document.getElementById('btn-save-team')?.addEventListener('click', handleSaveTeam);

    // Modal Dados / Backup
    document.getElementById('btn-open-data-modal')?.addEventListener('click', () => {
      document.getElementById('modal-data').classList.add('active');
    });
    document.getElementById('btn-close-modal-data')?.addEventListener('click', () => {
      document.getElementById('modal-data').classList.remove('active');
    });

    document.getElementById('btn-export-json')?.addEventListener('click', exportBackupJson);
    document.getElementById('import-json-input')?.addEventListener('change', importBackupJson);
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Deseja recarregar o catálogo padrão de Linha Viva, materiais e equipe PI-FAO-V001M da Equatorial Piauí?')) {
        resetToSeedData(true);
        document.getElementById('modal-data').classList.remove('active');
      }
    });

    // Checkin Form
    document.getElementById('form-checkin-out')?.addEventListener('submit', handleCheckinSubmit);

    // Auto-preencher líder
    document.getElementById('chk-team-select')?.addEventListener('change', (e) => {
      const team = state.teams.find(t => t.id === e.target.value);
      if (team) {
        document.getElementById('chk-leader-input').value = team.leader;
      }
    });

    document.getElementById('rdo-team')?.addEventListener('change', (e) => {
      const team = state.teams.find(t => t.id === e.target.value);
      if (team) {
        document.getElementById('rdo-leader').value = team.leader;
      }
    });

    // Botão Agora no check-in
    document.getElementById('btn-set-now-time')?.addEventListener('click', () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      document.getElementById('chk-time-input').value = `${hh}:${mm}`;
    });

    // Seletor de Regime no RDO (Linha Viva vs Linha Morta)
    const optLv = document.getElementById('opt-regime-lv');
    const optLm = document.getElementById('opt-regime-lm');
    if (optLv && optLm) {
      optLv.addEventListener('click', () => {
        optLv.classList.add('selected');
        optLm.classList.remove('selected');
        optLv.querySelector('input').checked = true;
        document.getElementById('chk-atr-ok').checked = false;
      });
      optLm.addEventListener('click', () => {
        optLm.classList.add('selected');
        optLv.classList.remove('selected');
        optLm.querySelector('input').checked = true;
        document.getElementById('chk-atr-ok').checked = true;
      });
    }

    // Linhas dinâmicas
    document.getElementById('btn-add-labor-row')?.addEventListener('click', () => addLaborRow());
    document.getElementById('btn-add-activity-row')?.addEventListener('click', () => addActivityRow());
    document.getElementById('btn-add-material-row')?.addEventListener('click', () => addMaterialRow());

    // Fotos
    const photoZone = document.getElementById('photo-upload-zone');
    const photoInput = document.getElementById('rdo-photos-input');
    if (photoZone && photoInput) {
      photoZone.addEventListener('click', () => photoInput.click());
      photoInput.addEventListener('change', handlePhotoSelect);
    }

    // Busca rápida
    document.getElementById('rdo-search-input')?.addEventListener('input', (e) => {
      renderRdoTable(e.target.value);
    });

    // Data filter check-in
    const chkDateFilter = document.getElementById('checkin-date-filter');
    if (chkDateFilter) {
      chkDateFilter.value = new Date().toISOString().split('T')[0];
      chkDateFilter.addEventListener('change', () => renderCheckinTable());
    }
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  function renderAll() {
    renderKPIs();
    updateAllCharts();
    renderRecentRdos();
    renderCheckinTable();
    renderRdoTable();
    renderMaterialsTable();
    renderTeamsGrid();
    updateSidebarBadges();
  }

  function getFilteredRdos() {
    if (state.selectedTeamFilter === 'all') return state.rdos;
    return state.rdos.filter(r => r.teamId === state.selectedTeamFilter);
  }

  function getFilteredCheckins() {
    if (state.selectedTeamFilter === 'all') return state.checkins;
    return state.checkins.filter(c => c.teamId === state.selectedTeamFilter);
  }

  // ==========================================
  // KPIS
  // ==========================================
  function renderKPIs() {
    const filteredRdos = getFilteredRdos();
    const filteredCheckins = getFilteredCheckins();

    const totalRdos = filteredRdos.length;
    const approvedRdos = filteredRdos.filter(r => r.status === 'Aprovado').length;
    const pctApproved = totalRdos > 0 ? Math.round((approvedRdos / totalRdos) * 100) : 100;
    document.getElementById('kpi-total-rdos').textContent = totalRdos;
    document.getElementById('kpi-rdos-approved-pct').textContent = `${pctApproved}% validados`;

    const todayStr = new Date().toISOString().split('T')[0];
    const activeToday = filteredCheckins.filter(c => c.date === todayStr && c.status === 'active').length;
    document.getElementById('kpi-active-teams').textContent = activeToday;

    const totalHours = filteredCheckins.reduce((acc, c) => acc + (Number(c.workedHours) || 0), 0);
    document.getElementById('kpi-worked-hours').textContent = `${totalHours.toFixed(1)}h`;

    document.getElementById('kpi-total-materials').textContent = state.materials.length;
    document.getElementById('kpi-punctuality').textContent = '100%';
  }

  function updateSidebarBadges() {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeToday = state.checkins.filter(c => c.date === todayStr && c.status === 'active').length;
    document.getElementById('active-checkin-badge').textContent = `${activeToday} em campo`;
    document.getElementById('rdo-count-badge').textContent = state.rdos.length;
  }

  // ==========================================
  // GRÁFICOS (CHART.JS - TEMA LARANJA & BRANCO)
  // ==========================================
  function updateAllCharts() {
    const isDark = state.theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const gridColor = isDark ? 'rgba(255, 85, 0, 0.12)' : 'rgba(0, 0, 0, 0.08)';

    // 1. Produtividade Semanal
    const ctxProd = document.getElementById('chart-productivity');
    if (ctxProd) {
      if (charts.productivity) charts.productivity.destroy();

      const days = [];
      const lvCounts = [];
      const lmCounts = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
        days.push(label);

        const rdosOnDay = getFilteredRdos().filter(r => r.date === dStr);
        const lv = rdosOnDay.filter(r => (r.regime || '').includes('Linha Viva')).length;
        const lm = rdosOnDay.filter(r => (r.regime || '').includes('Linha Morta')).length;
        lvCounts.push(lv);
        lmCounts.push(lm);
      }

      charts.productivity = new Chart(ctxProd, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [
            {
              label: '⚡ Linha Viva (Energizada)',
              data: lvCounts,
              backgroundColor: '#ff5500',
              borderRadius: 6
            },
            {
              label: '🔒 Linha Morta (Com ATR)',
              data: lmCounts,
              backgroundColor: '#0ea5e9',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor, font: { weight: 'bold' } } }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, beginAtZero: true }
          }
        }
      });
    }

    // 2. Consumo de Materiais em Rede
    const ctxMat = document.getElementById('chart-materials');
    if (ctxMat) {
      if (charts.materials) charts.materials.destroy();

      const usageMap = {};
      getFilteredRdos().forEach(r => {
        (r.materials || []).forEach(m => {
          usageMap[m.name] = (usageMap[m.name] || 0) + Number(m.qty || 0);
        });
      });

      let topLabels = Object.keys(usageMap);
      let topValues = Object.values(usageMap);

      if (topLabels.length === 0) {
        state.materials.slice(0, 5).forEach(m => {
          topLabels.push(m.name);
          topValues.push(m.totalUsed || 25);
        });
      } else {
        const sorted = topLabels.map((name, i) => ({ name, val: topValues[i] }))
          .sort((a, b) => b.val - a.val)
          .slice(0, 5);
        topLabels = sorted.map(s => s.name);
        topValues = sorted.map(s => s.val);
      }

      charts.materials = new Chart(ctxMat, {
        type: 'doughnut',
        data: {
          labels: topLabels,
          datasets: [{
            data: topValues,
            backgroundColor: ['#ff5500', '#ff8800', '#0ea5e9', '#10b981', '#8b5cf6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, boxWidth: 12, padding: 10, font: { size: 11, weight: '600' } }
            }
          }
        }
      });
    }

    // 3. Horas por Equipe
    const ctxTeams = document.getElementById('chart-teams-hours');
    if (ctxTeams) {
      if (charts.teamsHours) charts.teamsHours.destroy();

      const teamLabels = [];
      const teamHours = [];
      const teamColors = [];

      state.teams.forEach(t => {
        if (state.selectedTeamFilter === 'all' || state.selectedTeamFilter === t.id) {
          teamLabels.push(t.code || t.name.split(' ')[0] || t.name);
          const hrs = state.checkins
            .filter(c => c.teamId === t.id)
            .reduce((sum, c) => sum + (Number(c.workedHours) || 0), 0);
          teamHours.push(Number(hrs.toFixed(1)));
          teamColors.push(t.color || '#ff5500');
        }
      });

      charts.teamsHours = new Chart(ctxTeams, {
        type: 'bar',
        data: {
          labels: teamLabels,
          datasets: [{
            label: 'Horas em Campo (h)',
            data: teamHours,
            backgroundColor: teamColors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
          }
        }
      });
    }

    // 4. Clima nas Frentes de Rede
    const ctxWeather = document.getElementById('chart-weather');
    if (ctxWeather) {
      if (charts.weather) charts.weather.destroy();

      const weatherCounts = { 'Ensolarado': 0, 'Nublado': 0, 'Chuva Leve': 0, 'Chuvoso': 0 };
      getFilteredRdos().forEach(r => {
        if (r.weatherMorning && weatherCounts[r.weatherMorning] !== undefined) {
          weatherCounts[r.weatherMorning]++;
        }
      });

      charts.weather = new Chart(ctxWeather, {
        type: 'pie',
        data: {
          labels: ['☀️ Ensolarado', '⛅ Nublado', '🌦️ Chuva Leve', '🌧️ Chuva Forte (Paralisação)'],
          datasets: [{
            data: Object.values(weatherCounts),
            backgroundColor: ['#ff8800', '#64748b', '#0ea5e9', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, boxWidth: 12, padding: 10, font: { size: 11, weight: '600' } }
            }
          }
        }
      });
    }
  }

  // ==========================================
  // TABELAS
  // ==========================================
  function renderRecentRdos() {
    const tbody = document.getElementById('recent-rdos-tbody');
    if (!tbody) return;

    const rdos = getFilteredRdos().slice(0, 5);
    if (rdos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum RDO de rede encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = rdos.map(r => `
      <tr>
        <td style="font-weight: 800; color: var(--accent-primary);">${r.id}</td>
        <td>${formatDate(r.date)}</td>
        <td>${getRegimeBadge(r.regime)}</td>
        <td style="font-weight: 700;">${r.teamName || getTeamName(r.teamId)}</td>
        <td><strong>${r.substation || ''}</strong> - ${r.feeder || r.location || ''}</td>
        <td>${r.weatherMorning || 'Ensolarado'}</td>
        <td>${getStatusBadge(r.status)}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline btn-sm" onclick="viewRdoSheet('${r.id}')" title="Visualizar Folha Técnica Oficial de RDO">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Ver Folha</span>
            </button>
            <button class="btn btn-whatsapp btn-sm" onclick="openRdoWhatsAppModal('${r.id}')" title="Enviar resumo formatado no WhatsApp" style="padding: 0.35rem 0.55rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              <span>WhatsApp</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderCheckinTable() {
    const tbody = document.getElementById('checkins-tbody');
    if (!tbody) return;

    const dateFilter = document.getElementById('checkin-date-filter')?.value;
    let list = getFilteredCheckins();
    if (dateFilter) {
      list = list.filter(c => c.date === dateFilter);
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhuma equipe registrada nesta data.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(c => {
      const isActive = c.status === 'active';
      const statusBadge = isActive
        ? '<span class="badge badge-active"><span class="badge-dot"></span> Em Campo</span>'
        : '<span class="badge badge-completed"><span class="badge-dot"></span> Concluído</span>';

      const actionBtn = isActive
        ? `<button class="btn btn-danger btn-sm" onclick="quickCheckOut('${c.id}')">Dar Saída</button>`
        : `<span style="font-size: 0.8rem; color: var(--text-muted);">Encerrado</span>`;

      return `
        <tr>
          <td style="font-weight: 700;">${c.teamName || getTeamName(c.teamId)}</td>
          <td>${c.leaderName || '-'}</td>
          <td style="font-weight: 700; color: var(--accent-secondary);">${c.checkInTime || '-'}</td>
          <td style="font-weight: 700; color: var(--accent-danger);">${c.checkOutTime || '--:--'}</td>
          <td>${c.location || '-'}</td>
          <td><strong>${c.workedHours ? c.workedHours.toFixed(1) + 'h' : '--'}</strong></td>
          <td>${statusBadge}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    }).join('');
  }

  function renderRdoTable(searchTerm = '') {
    const tbody = document.getElementById('rdos-full-tbody');
    if (!tbody) return;

    let list = getFilteredRdos();
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r =>
        r.id.toLowerCase().includes(term) ||
        (r.substation && r.substation.toLowerCase().includes(term)) ||
        (r.feeder && r.feeder.toLowerCase().includes(term)) ||
        (r.location && r.location.toLowerCase().includes(term)) ||
        (r.teamName && r.teamName.toLowerCase().includes(term)) ||
        (r.teamCode && r.teamCode.toLowerCase().includes(term))
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nenhum RDO de rede encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(r => `
      <tr>
        <td style="font-weight: 800; color: var(--accent-primary);">${r.id}</td>
        <td>${formatDate(r.date)}</td>
        <td>${getRegimeBadge(r.regime)}</td>
        <td style="font-weight: 700;">${r.teamName || getTeamName(r.teamId)}</td>
        <td><strong>${r.substation || ''}</strong> - ${r.feeder || r.location || ''}</td>
        <td>${r.leader || '-'}</td>
        <td><span class="badge" style="background: rgba(255,85,0,0.12); color: var(--accent-primary); font-weight: bold;">${(r.materials || []).length} insumos</span></td>
        <td>${getStatusBadge(r.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-whatsapp btn-sm" onclick="openRdoWhatsAppModal('${r.id}')" title="Enviar resumo formatado no WhatsApp">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              <span>WhatsApp</span>
            </button>
            <button class="btn btn-primary btn-sm" onclick="viewRdoSheet('${r.id}')" title="Visualizar e Imprimir RDO">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>Folha A4</span>
            </button>
            <button class="icon-btn btn-sm" style="width: 32px; height: 32px; color: var(--accent-danger);" onclick="deleteRdo('${r.id}')" title="Excluir RDO">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================
  // TABELA DE MATERIAIS COM AJUSTE DINÂMICO (+ / -)
  // ==========================================
  function renderMaterialsTable() {
    const tbody = document.getElementById('materials-tbody');
    if (!tbody) return;

    // Calcular consumo total real a partir dos RDOs
    const consumptionMap = {};
    state.rdos.forEach(r => {
      (r.materials || []).forEach(m => {
        consumptionMap[m.name] = (consumptionMap[m.name] || 0) + Number(m.qty || 0);
      });
    });

    tbody.innerHTML = state.materials.map(m => {
      const used = (consumptionMap[m.name] || 0) + (m.totalUsed || 0);
      const stock = m.stock !== undefined ? m.stock : 0;

      // Calcular quanto deste material está em viaturas/equipes
      let allocatedTotal = 0;
      state.teams.forEach(t => {
        (t.allocatedMaterials || []).forEach(am => {
          if (am.id === m.id || am.name.toLowerCase() === m.name.toLowerCase()) {
            allocatedTotal += Number(am.qty || 0);
          }
        });
      });

      return `
        <tr>
          <td style="font-weight: 700;">${m.name}</td>
          <td><span class="badge" style="background: rgba(255,85,0,0.1); border: 1px solid rgba(255,85,0,0.25); color: var(--accent-orange-bright);">${m.category || 'Geral'}</span></td>
          <td><strong>${m.unit}</strong></td>
          
          <!-- Saldo em Base -->
          <td style="text-align: center;">
            <strong style="font-size: 1.05rem; color: ${stock > 0 ? 'var(--text-primary)' : 'var(--accent-danger)'};">${stock} ${m.unit}</strong>
          </td>

          <!-- Controles Rápidos (+ / -) -->
          <td style="text-align: center;">
            <div class="stock-control-group">
              <button class="btn-stock-quick btn-stock-sub" onclick="addStockQuick('${m.id}', -1)" title="Retirar 1 da Base">-</button>
              <span class="stock-value-badge">${stock}</span>
              <button class="btn-stock-quick btn-stock-add" onclick="addStockQuick('${m.id}', 1)" title="Adicionar 1 na Base">+</button>
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 11px; margin-left: 4px;" onclick="openStockMovementModal('${m.id}')" title="Ajuste com Motivo">Ajustar</button>
            </div>
          </td>

          <!-- Alocado nas Viaturas -->
          <td style="text-align: center;">
            <span class="badge badge-cautela" style="cursor: pointer;" onclick="switchView('teams-view')" title="Ver alocação nas viaturas">
              📦 ${allocatedTotal} ${m.unit}
            </span>
          </td>

          <!-- Total Aplicado -->
          <td style="text-align: center; font-weight: 800; color: var(--accent-primary);">${used} ${m.unit}</td>

          <!-- Ações -->
          <td style="text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 3px 8px; color: var(--accent-orange-bright);" onclick="openAllocateMaterialModal('${m.id}')" title="Vincular à Viatura">
                Vincular
              </button>
              <button class="icon-btn btn-sm" style="width: 28px; height: 28px; color: var(--accent-danger);" onclick="deleteMaterial('${m.id}')" title="Excluir Material">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // CONTROLE DINÂMICO DE ESTOQUE (+ / -)
  // ==========================================
  window.addStockQuick = function (matId, delta) {
    const mat = state.materials.find(m => m.id === matId);
    if (!mat) return;

    if (mat.stock === undefined) mat.stock = 0;
    if (mat.stock + delta < 0) {
      alert(`Saldo insuficiente na base para o material "${mat.name}".`);
      return;
    }

    mat.stock += delta;
    saveState();
    renderMaterialsTable();
    showToast(`${delta > 0 ? '+ ' + delta : delta} ${mat.unit} de "${mat.name}". Saldo atual: ${mat.stock}`, delta > 0 ? 'success' : 'info');
  };

  window.openStockMovementModal = function (matId) {
    const mat = state.materials.find(m => m.id === matId);
    if (!mat) return;

    document.getElementById('stock-mat-id').value = mat.id;
    document.getElementById('stock-mat-name').textContent = mat.name;
    document.getElementById('stock-mat-current').textContent = `${mat.stock || 0} ${mat.unit}`;
    document.getElementById('stock-move-qty').value = 10;
    document.getElementById('stock-move-reason').value = '';

    document.getElementById('modal-stock-movement').classList.add('active');
  };

  function closeStockModal() {
    document.getElementById('modal-stock-movement').classList.remove('active');
  }

  function handleSaveStockMovement(e) {
    e?.preventDefault();
    const matId = document.getElementById('stock-mat-id').value;
    const type = document.getElementById('stock-move-type').value;
    const qty = Number(document.getElementById('stock-move-qty').value) || 0;
    const reason = document.getElementById('stock-move-reason').value.trim();

    if (qty <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    const mat = state.materials.find(m => m.id === matId);
    if (!mat) return;

    if (mat.stock === undefined) mat.stock = 0;

    if (type === 'sub') {
      if (mat.stock < qty) {
        alert(`Saldo insuficiente! Há apenas ${mat.stock} ${mat.unit} no almoxarifado.`);
        return;
      }
      mat.stock -= qty;
      showToast(`Baixa de ${qty} ${mat.unit} de "${mat.name}" confirmada! Saldo: ${mat.stock}`, 'info');
    } else {
      mat.stock += qty;
      showToast(`Entrada de ${qty} ${mat.unit} de "${mat.name}" confirmada! Saldo: ${mat.stock}`, 'success');
    }

    saveState();
    renderMaterialsTable();
    closeStockModal();
  }

  // ==========================================
  // VINCULAÇÃO DE MATERIAL POR EQUIPE (CAUTELA)
  // ==========================================
  window.openAllocateMaterialModal = function (preSelectedMatId = null, preSelectedTeamId = null) {
    populateSelects();
    if (preSelectedMatId) {
      document.getElementById('alloc-material-select').value = preSelectedMatId;
      updateAllocStockFeedback(preSelectedMatId);
    }
    if (preSelectedTeamId) {
      document.getElementById('alloc-team-select').value = preSelectedTeamId;
    }
    document.getElementById('modal-allocate-material').classList.add('active');
  };

  function closeAllocateModal() {
    document.getElementById('modal-allocate-material').classList.remove('active');
  }

  document.getElementById('alloc-material-select')?.addEventListener('change', (e) => {
    updateAllocStockFeedback(e.target.value);
  });

  function updateAllocStockFeedback(matId) {
    const mat = state.materials.find(m => m.id === matId);
    const feedback = document.getElementById('alloc-stock-feedback');
    if (mat && feedback) {
      feedback.textContent = `Saldo disponível no almoxarifado base: ${mat.stock || 0} ${mat.unit}`;
    }
  }

  function handleSaveAllocateMaterial() {
    const teamId = document.getElementById('alloc-team-select').value;
    const matId = document.getElementById('alloc-material-select').value;
    const qty = Number(document.getElementById('alloc-qty-input').value) || 0;

    if (!teamId || !matId || qty <= 0) {
      alert('Selecione a equipe, o material e uma quantidade válida.');
      return;
    }

    const team = state.teams.find(t => t.id === teamId);
    const mat = state.materials.find(m => m.id === matId);

    if (!team || !mat) return;

    if (mat.stock === undefined) mat.stock = 0;
    if (mat.stock < qty) {
      if (!confirm(`O saldo na base é de apenas ${mat.stock} ${mat.unit}. Deseja prosseguir mesmo assim e ajustar o saldo?`)) {
        return;
      }
      mat.stock = 0;
    } else {
      mat.stock -= qty;
    }

    // Adiciona ou incrementa na viatura da equipe
    if (!team.allocatedMaterials) team.allocatedMaterials = [];
    const existing = team.allocatedMaterials.find(am => am.id === mat.id || am.name.toLowerCase() === mat.name.toLowerCase());
    if (existing) {
      existing.qty += qty;
    } else {
      team.allocatedMaterials.push({
        id: mat.id,
        name: mat.name,
        qty: qty,
        unit: mat.unit
      });
    }

    saveState();
    renderAll();
    closeAllocateModal();
    showToast(`${qty} ${mat.unit} de "${mat.name}" vinculados com sucesso à viatura ${team.code || team.name}!`, 'success');
  }

  // ==========================================
  // MODAL DE CAUTELA DA VIATURA (ex: PI-FAO-V001M)
  // ==========================================
  window.openTeamCautelaModal = function (teamId) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;

    currentViewingCautelaTeamId = team.id;
    document.getElementById('cautela-target-team-id').value = team.id;
    document.getElementById('cautela-team-title').textContent = `Cautela da Viatura - ${team.code || team.name}`;
    document.getElementById('cautela-team-subtitle').textContent = `Encarregado: ${team.leader} • Foco: ${team.specialty}`;

    populateSelects();
    renderTeamCautelaTable(team);
    document.getElementById('modal-team-cautela').classList.add('active');
  };

  function closeTeamCautelaModal() {
    document.getElementById('modal-team-cautela').classList.remove('active');
  }

  function renderTeamCautelaTable(team) {
    const tbody = document.getElementById('cautela-materials-tbody');
    if (!tbody) return;

    const list = team.allocatedMaterials || [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum material carregado nesta viatura no momento. Use o formulário acima para vincular insumos.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td style="font-weight: 700;">${item.name}</td>
        <td style="text-align: center; font-size: 1.1rem; font-weight: 900; color: var(--accent-orange-bright);">${item.qty}</td>
        <td style="text-align: center;"><strong>${item.unit}</strong></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 2px 6px;" onclick="changeVehicleMaterialQty('${team.id}', '${item.id}', 1)" title="Adicionar mais 1 da Base">+1 Base</button>
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 2px 6px; color: var(--accent-warning);" onclick="changeVehicleMaterialQty('${team.id}', '${item.id}', -1)" title="Devolver 1 para a Base">-1 Devolver</button>
            <button class="icon-btn btn-sm" style="width: 26px; height: 26px; color: var(--accent-danger);" onclick="returnAllVehicleMaterial('${team.id}', '${item.id}')" title="Devolver Tudo para a Base">×</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function handleAddMaterialToVehicle(e) {
    e.preventDefault();
    const teamId = document.getElementById('cautela-target-team-id').value;
    const matId = document.getElementById('cautela-mat-select').value;
    const qty = Number(document.getElementById('cautela-qty-input').value) || 0;

    if (!matId || qty <= 0) {
      alert('Selecione um material e informe a quantidade.');
      return;
    }

    const team = state.teams.find(t => t.id === teamId);
    const mat = state.materials.find(m => m.id === matId);
    if (!team || !mat) return;

    if (mat.stock === undefined) mat.stock = 0;
    if (mat.stock < qty) {
      if (!confirm(`Há apenas ${mat.stock} ${mat.unit} no almoxarifado base. Deseja carregar assim mesmo e ajustar o saldo?`)) {
        return;
      }
      mat.stock = 0;
    } else {
      mat.stock -= qty;
    }

    if (!team.allocatedMaterials) team.allocatedMaterials = [];
    const existing = team.allocatedMaterials.find(am => am.id === mat.id || am.name.toLowerCase() === mat.name.toLowerCase());
    if (existing) {
      existing.qty += qty;
    } else {
      team.allocatedMaterials.push({
        id: mat.id,
        name: mat.name,
        qty: qty,
        unit: mat.unit
      });
    }

    saveState();
    renderAll();
    renderTeamCautelaTable(team);
    showToast(`${qty} ${mat.unit} de "${mat.name}" carregados na viatura!`, 'success');
    document.getElementById('form-add-to-vehicle').reset();
    document.getElementById('cautela-target-team-id').value = team.id;
    populateSelects();
  }

  window.changeVehicleMaterialQty = function (teamId, matId, delta) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team || !team.allocatedMaterials) return;

    const item = team.allocatedMaterials.find(am => am.id === matId);
    if (!item) return;

    const mat = state.materials.find(m => m.id === matId);

    if (delta > 0) {
      // Puxar da base
      if (mat) {
        if (mat.stock === undefined) mat.stock = 0;
        if (mat.stock >= delta) {
          mat.stock -= delta;
        } else {
          alert('Sem saldo suficiente na base!');
          return;
        }
      }
      item.qty += delta;
      showToast(`+${delta} ${item.unit} carregado na viatura.`, 'success');
    } else {
      // Devolver para a base
      if (item.qty + delta <= 0) {
        returnAllVehicleMaterial(teamId, matId);
        return;
      }
      item.qty += delta;
      if (mat) mat.stock = (mat.stock || 0) - delta; // delta é negativo, logo soma
      showToast(`${Math.abs(delta)} ${item.unit} devolvido ao almoxarifado base.`, 'info');
    }

    saveState();
    renderAll();
    renderTeamCautelaTable(team);
  };

  window.returnAllVehicleMaterial = function (teamId, matId) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team || !team.allocatedMaterials) return;

    const idx = team.allocatedMaterials.findIndex(am => am.id === matId);
    if (idx === -1) return;

    const item = team.allocatedMaterials[idx];
    if (!confirm(`Devolver todas as ${item.qty} ${item.unit} de "${item.name}" para o almoxarifado base?`)) return;

    const mat = state.materials.find(m => m.id === matId);
    if (mat) {
      mat.stock = (mat.stock || 0) + item.qty;
    }

    team.allocatedMaterials.splice(idx, 1);
    saveState();
    renderAll();
    renderTeamCautelaTable(team);
    showToast(`Material "${item.name}" recolhido com sucesso para a base.`, 'info');
  };

  // ==========================================
  // GERAÇÃO DE PDF (HTML2PDF.JS)
  // ==========================================
  function handleDownloadRdoPdf() {
    const rdoElement = document.getElementById('rdo-sheet-container');
    if (!rdoElement) return;

    showToast('Gerando arquivo PDF do RDO oficial em página única...', 'info');

    if (typeof html2pdf === 'undefined') {
      window.print();
      return;
    }

    const filename = (currentViewingRdoId || 'RDO-EQTL') + '.pdf';
    
    // Ativa modo estrito de impressão para garantir exatamente 1 página A4
    rdoElement.classList.add('rdo-pdf-mode');

    const opt = {
      margin: [5, 6, 5, 6],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(rdoElement).save().then(() => {
      rdoElement.classList.remove('rdo-pdf-mode');
      showToast(`PDF ${filename} gerado em página única com sucesso!`, 'success');
    }).catch(err => {
      rdoElement.classList.remove('rdo-pdf-mode');
      console.error('Erro ao gerar PDF:', err);
      window.print();
    });
  }

  function handleDownloadCautelaPdf() {
    const team = state.teams.find(t => t.id === currentViewingCautelaTeamId);
    if (!team) return;

    const list = team.allocatedMaterials || [];
    const rowsHtml = list.map((item, idx) => `
      <tr>
        <td style="text-align: center; width: 30px;">${idx + 1}</td>
        <td style="font-weight: bold;">${item.name}</td>
        <td style="text-align: center; font-weight: bold; color: #ff5500;">${item.qty}</td>
        <td style="text-align: center;">${item.unit}</td>
      </tr>
    `).join('');

    const cautelaDoc = document.createElement('div');
    cautelaDoc.className = 'rdo-document-sheet';
    cautelaDoc.style.background = '#ffffff';
    cautelaDoc.style.color = '#000000';
    cautelaDoc.style.padding = '20px';
    cautelaDoc.innerHTML = `
      <div class="rdo-sheet-header">
        <div class="rdo-sheet-logo" style="background: #ff5500; color: #fff; padding: 10px; text-align: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 900;">EQUATORIAL ENERGIA</h3>
          <span style="font-size: 9px;">CONCESSIONÁRIA PIAUÍ</span>
        </div>
        <div class="rdo-sheet-title" style="text-align: center; padding: 10px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 900;">TERMO DE CAUTELA & INVENTÁRIO DE VIATURA</h2>
          <span style="font-size: 10px; color: #ea580c; font-weight: bold;">MATERIAIS E FERRAGENS DE REDE EM PODER DA EQUIPE</span>
        </div>
        <div class="rdo-sheet-meta" style="padding: 10px; font-size: 11px;">
          <div><strong>VIATURA:</strong> ${team.code || team.name}</div>
          <div><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <div class="rdo-sheet-box">
        <div class="rdo-box-header">1. DADOS DA EQUIPE OPERACIONAL</div>
        <div class="rdo-box-content">
          <div><strong>Equipe / Viatura:</strong> ${team.name}</div>
          <div><strong>Eletricista Encarregado:</strong> ${team.leader}</div>
          <div><strong>Especialidade:</strong> ${team.specialty}</div>
          <div><strong>Contato / Rádio:</strong> ${team.contact}</div>
        </div>
      </div>

      <div class="rdo-sheet-box">
        <div class="rdo-box-header">2. RELAÇÃO DE MATERIAIS E EQUIPAMENTOS CARREGADOS NA VIATURA</div>
        <table class="rdo-sheet-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr>
              <th style="width: 30px;">Item</th>
              <th>Descrição do Material / Insumo</th>
              <th style="width: 80px; text-align: center;">Qtd Cautelada</th>
              <th style="width: 80px; text-align: center;">Unidade</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div class="rdo-sheet-box">
        <div class="rdo-box-header">3. TERMO DE RESPONSABILIDADE & NR-10</div>
        <div class="rdo-box-content" style="font-size: 10px;">
          O eletricista encarregado declara que conferiu e recebeu os materiais e ferragens acima relacionados em perfeito estado operacional para atendimento das ordens de serviço da Equatorial Piauí. Qualquer avaria ou consumo deve ser devidamente reportado no respectivo RDO.
        </div>
      </div>

      <!-- Assinatura Oficial do Encarregado da Viatura -->
      <div class="rdo-sheet-signatures" style="display: flex; justify-content: center; margin-top: 40px;">
        <div style="text-align: center; border-top: 1px solid #000; width: 320px; font-size: 11px; font-weight: bold; padding-top: 5px;">
          ${team.leader}<br>
          <span style="font-weight: normal; color: #64748b;">Eletricista Encarregado da Equipe / Viatura</span>
        </div>
      </div>
    `;

    showToast('Gerando PDF da cautela da viatura...', 'info');

    if (typeof html2pdf === 'undefined') {
      window.print();
      return;
    }

    const filename = `CAUTELA_${team.code || 'VIATURA'}.pdf`;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(cautelaDoc).save().then(() => {
      showToast(`PDF da cautela ${filename} baixado com sucesso!`, 'success');
    });
  }

  // ==========================================
  // EXPORTAÇÃO DE RDO PARA WHATSAPP (TEXTO COM EMOJIS)
  // ==========================================
  let currentWhatsAppRdoText = '';

  function generateRdoWhatsAppText(rdo) {
    if (!rdo) return '';

    const isLinhaViva = (rdo.regime || '').includes('Linha Viva');
    const regimeHeader = isLinhaViva
      ? '⚡ *LINHA VIVA (REDE ENERGIZADA)*'
      : '🔒 *LINHA MORTA (DESENERGIZADA COM ATR)*';

    const totalWorkers = (rdo.labor || []).reduce((sum, l) => sum + (Number(l.qty) || 0), 0);

    const laborLines = (rdo.labor && rdo.labor.length > 0)
      ? rdo.labor.map(l => `  • ${l.qty}x ${l.role}`).join('\n')
      : '  • Efetivo padrão de campo';

    const actLines = (rdo.activities && rdo.activities.length > 0)
      ? rdo.activities.map(a => `  ✅ ${a.description} (${a.progress}% - ${a.status})`).join('\n')
      : '  • Nenhuma atividade registrada';

    const matLines = (rdo.materials && rdo.materials.length > 0)
      ? rdo.materials.map(m => `  🔹 ${m.qty} ${m.unit} - ${m.name}`).join('\n')
      : '  • Sem materiais aplicados';

    const occurrencesText = rdo.occurrences || 'Intervenção concluída com sucesso conforme normas técnicas da Equatorial Piauí.';
    const observationsText = rdo.observations ? `\n📝 *Observações:* ${rdo.observations}` : '';

    return `⚡ *RELATÓRIO DIÁRIO DE OPERAÇÃO - RDO* ⚡
*EQUATORIAL ENERGIA PIAUÍ*
━━━━━━━━━━━━━━━━━━━━━━
📋 *RDO Nº:* ${rdo.id}
📅 *Data:* ${formatDate(rdo.date)}
📑 *OS:* ${rdo.osNumber || 'OS-AVULSA'} | *APR:* ${rdo.aprNumber || 'APR-LIBERADA'}
👥 *Equipe:* ${rdo.teamName || getTeamName(rdo.teamId)}
👷‍♂️ *Encarregado:* ${rdo.leader || '-'}
⚡ *Regime:* ${regimeHeader}

📍 *CIRCUITO & LOCALIZAÇÃO*
🏢 *Subestação (SE):* ${rdo.substation || '-'}
⚡ *Alimentador MT:* ${rdo.feeder || '-'}
📌 *Local/Chave:* ${rdo.location || '-'}
🏗️ *Estrutura:* ${rdo.structureType || 'Padrão MT'}
☀️ *Clima:* ${rdo.weatherMorning || 'Ensolarado'} (M) / ${rdo.weatherAfternoon || 'Ensolarado'} (T)

👷 *EFETIVO NA FRENTE DE SERVIÇO (${totalWorkers} operadores)*
${laborLines}

🛠️ *ATIVIDADES EXECUTADAS*
${actLines}

📦 *MATERIAIS & EQUIPAMENTOS INSTALADOS*
${matLines}

⚠️ *OCORRÊNCIAS / CENTRO DE OPERAÇÃO (COD)*
${occurrencesText}${observationsText}
━━━━━━━━━━━━━━━━━━━━━━
✍️ *Emitido e Validado por:* ${rdo.leader || 'Eletricista Encarregado'}
🌐 *Sistema de Gestão Operacional REDE VIVA 360*`;
  }

  window.openRdoWhatsAppModal = function (rdoId) {
    const rdo = state.rdos.find(r => r.id === rdoId);
    if (!rdo) {
      showToast('Relatório RDO não encontrado.', 'danger');
      return;
    }

    currentViewingRdoId = rdo.id;
    currentWhatsAppRdoText = generateRdoWhatsAppText(rdo);
    const textarea = document.getElementById('whatsapp-rdo-text');
    if (textarea) textarea.value = currentWhatsAppRdoText;

    const copyLabel = document.getElementById('btn-copy-whatsapp-label');
    if (copyLabel) copyLabel.textContent = 'Copiar Texto Formatado';

    document.getElementById('modal-rdo-whatsapp')?.classList.add('active');
  };

  function closeRdoWhatsAppModal() {
    document.getElementById('modal-rdo-whatsapp')?.classList.remove('active');
  }

  function handleCopyWhatsAppText() {
    const textarea = document.getElementById('whatsapp-rdo-text');
    const text = textarea ? textarea.value : currentWhatsAppRdoText;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopySuccess();
      }).catch(() => {
        fallbackCopy(textarea);
      });
    } else {
      fallbackCopy(textarea);
    }
  }

  function fallbackCopy(textarea) {
    if (textarea) {
      textarea.select();
      document.execCommand('copy');
      showCopySuccess();
    }
  }

  function showCopySuccess() {
    const copyLabel = document.getElementById('btn-copy-whatsapp-label');
    if (copyLabel) copyLabel.textContent = '✓ Mensagem Copiada!';
    showToast('Texto do RDO com emojis copiado para a área de transferência!', 'success');
    setTimeout(() => {
      if (copyLabel) copyLabel.textContent = 'Copiar Texto Formatado';
    }, 2500);
  }

  function handleOpenWhatsAppLink() {
    const textarea = document.getElementById('whatsapp-rdo-text');
    const text = textarea ? textarea.value : currentWhatsAppRdoText;
    if (!text) return;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================
  // RENDERIZAÇÃO DE EQUIPES COM CAUTELA
  // ==========================================
  function renderTeamsGrid() {
    const grid = document.getElementById('teams-cards-grid');
    if (!grid) return;

    grid.innerHTML = state.teams.map(t => {
      const teamRdos = state.rdos.filter(r => r.teamId === t.id).length;
      const teamHours = state.checkins
        .filter(c => c.teamId === t.id)
        .reduce((sum, c) => sum + (Number(c.workedHours) || 0), 0);

      const allocatedCount = (t.allocatedMaterials || []).length;
      const totalUnits = (t.allocatedMaterials || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);

      return `
        <div class="kpi-card" style="flex-direction: column; align-items: stretch; border-top: 4px solid ${t.color || '#ff5500'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.2rem;">${t.name}</h4>
              <span style="font-size: 0.8rem; color: var(--accent-orange-bright); font-weight: 600;">${t.specialty || 'Distribuição de Energia'}</span>
            </div>
            <span class="badge badge-active"><span class="badge-dot"></span> Ativa</span>
          </div>

          <div style="font-size: 0.825rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem;">
            <div><strong>Eletricista Encarregado:</strong> ${t.leader || '-'}</div>
            <div><strong>Rádio / Contato:</strong> ${t.contact || '-'}</div>
            <div><strong>Efetivo Base:</strong> ${t.membersCount || 4} profissionais</div>
          </div>

          <!-- Destaque da Cautela de Materiais da Viatura -->
          <div style="background: rgba(255, 85, 0, 0.08); border: 1px solid rgba(255, 85, 0, 0.25); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.725rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Carga na Viatura</div>
              <strong style="color: var(--accent-orange-bright); font-size: 0.95rem;">${allocatedCount} itens (${totalUnits} un.)</strong>
            </div>
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 8px; color: var(--accent-orange-bright); border-color: var(--accent-primary);" onclick="openTeamCautelaModal('${t.id}')">
              📦 Ver Cautela
            </button>
          </div>

          <!-- Ações de Gerenciamento da Equipe (Editar & Excluir) -->
          <div style="display: flex; gap: 6px; margin-bottom: 0.75rem;">
            <button class="btn btn-outline btn-sm" style="flex: 1; font-size: 11px; padding: 5px 8px; color: var(--text-primary); border-color: var(--border-color); display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="editTeam('${t.id}')" title="Editar dados da equipe">
              <span>✏️ Editar Equipe</span>
            </button>
            <button class="btn btn-outline btn-sm" style="font-size: 11px; padding: 5px 8px; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; gap: 4px;" onclick="deleteTeam('${t.id}')" title="Excluir equipe e estornar materiais">
              <span>🗑️ Excluir</span>
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--border-color); font-size: 0.75rem;">
            <div>
              <span style="color: var(--text-muted);">RDOs Emitidos:</span>
              <strong style="color: var(--text-primary); margin-left: 4px;">${teamRdos}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Horas Totais:</span>
              <strong style="color: var(--accent-secondary); margin-left: 4px;">${teamHours.toFixed(1)}h</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // CHECK-IN / CHECK-OUT LOGIC
  // ==========================================
  function handleCheckinSubmit(e) {
    e.preventDefault();

    const teamId = document.getElementById('chk-team-select').value;
    const leaderName = document.getElementById('chk-leader-input').value;
    const date = document.getElementById('chk-date-input').value;
    const type = document.getElementById('chk-type-select').value;
    const time = document.getElementById('chk-time-input').value;
    const location = document.getElementById('chk-location-input').value;
    const notes = document.getElementById('chk-notes-input').value;

    const team = state.teams.find(t => t.id === teamId);
    const teamName = team ? team.name : 'Equipe de Linha';

    if (type === 'in') {
      const newChk = {
        id: 'chk-' + Date.now(),
        teamId,
        teamName,
        leaderName,
        date,
        checkInTime: time,
        checkOutTime: null,
        location,
        status: 'active',
        workedHours: 0,
        notes
      };
      state.checkins.unshift(newChk);
      showToast(`Check-in de "${teamName}" registrado às ${time}!`, 'success');
    } else {
      const existing = state.checkins.find(c => c.teamId === teamId && c.date === date && c.status === 'active');
      if (existing) {
        existing.checkOutTime = time;
        existing.status = 'completed';
        existing.workedHours = calculateHoursDiff(existing.checkInTime, time);
        if (notes) existing.notes += (existing.notes ? ' | ' : '') + notes;
        showToast(`Check-out de "${teamName}" registrado! Jornada: ${existing.workedHours.toFixed(1)}h`, 'success');
      } else {
        const newChk = {
          id: 'chk-' + Date.now(),
          teamId,
          teamName,
          leaderName,
          date,
          checkInTime: '07:30',
          checkOutTime: time,
          location,
          status: 'completed',
          workedHours: calculateHoursDiff('07:30', time),
          notes
        };
        state.checkins.unshift(newChk);
        showToast(`Saída avulsa registrada para "${teamName}"!`, 'info');
      }
    }

    saveState();
    renderAll();
    e.target.reset();
  }

  window.quickCheckOut = function (checkinId) {
    const chk = state.checkins.find(c => c.id === checkinId);
    if (!chk) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const time = `${hh}:${mm}`;

    chk.checkOutTime = time;
    chk.status = 'completed';
    chk.workedHours = calculateHoursDiff(chk.checkInTime, time);

    saveState();
    renderAll();
    showToast(`Check-out de "${chk.teamName}" confirmado às ${time}! Jornada: ${chk.workedHours.toFixed(1)}h`, 'success');
  };

  function calculateHoursDiff(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const [h1, m1] = startTime.split(':').map(Number);
    const [h2, m2] = endTime.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;
    const diff = endMins - startMins;
    return diff > 0 ? Number((diff / 60).toFixed(2)) : 0;
  }

  // ==========================================
  // TEMPLATES NORMATIVOS EQUATORIAL (BRT & CABOS)
  // ==========================================
  function loadNormativeBrtActivities() {
    const actContainer = document.getElementById('activity-rows-container');
    if (actContainer) actContainer.innerHTML = '';
    addActivityRow('Içamento e fixação do conjunto de reguladores monofásicos BRT na plataforma de poste duplo', 100, 'Concluído');
    addActivityRow('Instalação e alinhamento do jogo de chaves faca de bypass e seccionadoras de isolamento', 100, 'Concluído');
    addActivityRow('Conexão de para-raios de linha/carga e malha de aterramento da carcaça do BRT', 100, 'Concluído');
    addActivityRow('Parametrização do controle eletrônico microprocessado e teste de manobra de bypass', 100, 'Concluído');

    const structSelect = document.getElementById('rdo-structure');
    if (structSelect) structSelect.value = 'Estrutura Especial para BRT (Banco Regulador de Tensão - NT.00006 / NT.00022)';

    showToast('Atividades normativas de Instalação de BRT carregadas (NT.00006)!', 'success');
  }

  function loadNormativeCabosActivities() {
    const actContainer = document.getElementById('activity-rows-container');
    if (actContainer) actContainer.innerHTML = '';
    addActivityRow('Montagem de carretilhas e roldanas nos postes do vão P01 a P06', 100, 'Concluído');
    addActivityRow('Lançamento e puxamento de condutores de MT Cabo 1/0 CAA com cabo guia', 100, 'Concluído');
    addActivityRow('Tracionamento mecânico e regulagem de flecha conforme tabela de temperatura Equatorial', 100, 'Concluído');
    addActivityRow('Encabeçamento, amarração com laços preformados e ancoragem com alças preformadas', 100, 'Concluído');

    const structSelect = document.getElementById('rdo-structure');
    if (structSelect) structSelect.value = 'Estrutura de Lançamento e Tracionamento de Condutores MT/BT';

    showToast('Atividades normativas de Lançamento de Cabos carregadas (NT.00006)!', 'info');
  }

  function loadNormativeBrtMaterials() {
    addMaterialRow('Banco Regulador de Tensão Monofásico (BRT 15kV / 34.5kV)', 1, 'conjuntos');
    addMaterialRow('Plataforma Metálica de Suporte para BRT', 1, 'unidades');
    addMaterialRow('Chave Faca Bypass Unipolar 15kV 600A', 3, 'unidades');
    addMaterialRow('Para-raios 15kV', 6, 'unidades');
    addMaterialRow('Cabo cobreado 10mm (aterramento)', 25, 'metros');
    addMaterialRow('Haste de Aterramento Aço-Cobre 5/8" x 2.40m', 2, 'peças');
    showToast('Insumos normativos de BRT adicionados ao RDO!', 'success');
  }

  function loadNormativeCabosMaterials() {
    addMaterialRow('Cabo 1/0 CAA / CA', 350, 'metros');
    addMaterialRow('Alça 1/0', 6, 'peças');
    addMaterialRow('Laço 1/0', 12, 'peças');
    addMaterialRow('Isolador pilar 15kV', 6, 'peças');
    addMaterialRow('Conector estribo 1/0 e 2/0', 6, 'peças');
    addMaterialRow('Parafuso cabeça quadrada 250mm', 6, 'peças');
    showToast('Insumos normativos de Lançamento de Cabos adicionados ao RDO!', 'info');
  }

  // ==========================================
  // CANVAS EXTEC - CROQUI TÉCNICO INTERATIVO
  // ==========================================
  let canvasExtec = null;
  let ctxExtec = null;
  let canvasTool = 'pen';
  let canvasCurrentStamp = null;
  let canvasColor = '#ff5500';
  let canvasLineWidth = 4;
  let isCanvasDrawing = false;
  let canvasStartX = 0;
  let canvasStartY = 0;
  let canvasSnapshot = null;

  function initCanvasExtec(existingDataUrl = null) {
    canvasExtec = document.getElementById('canvas-extec');
    if (!canvasExtec) return;

    canvasExtec.width = 860;
    canvasExtec.height = 320;
    ctxExtec = canvasExtec.getContext('2d');

    if (existingDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctxExtec.drawImage(img, 0, 0, canvasExtec.width, canvasExtec.height);
      };
      img.src = existingDataUrl;
    } else {
      drawCanvasGrid(ctxExtec, canvasExtec.width, canvasExtec.height);
    }

    setupCanvasEvents();
  }

  function drawCanvasGrid(ctx, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CROQUI DE CAMPO EXTEC - PADRÃO EQUATORIAL PIAUÍ (NT.00006)', 12, 18);
  }

  function getCanvasCoords(e) {
    if (!canvasExtec) return { x: 0, y: 0 };
    const rect = canvasExtec.getBoundingClientRect();
    const scaleX = canvasExtec.width / rect.width;
    const scaleY = canvasExtec.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function setupCanvasEvents() {
    if (!canvasExtec || canvasExtec.dataset.eventsBound === 'true') return;
    canvasExtec.dataset.eventsBound = 'true';

    const startDraw = (e) => {
      e.preventDefault();
      const pos = getCanvasCoords(e);
      canvasStartX = pos.x;
      canvasStartY = pos.y;

      if (canvasTool === 'stamp' && canvasCurrentStamp) {
        drawStamp(canvasCurrentStamp, pos.x, pos.y);
        return;
      }

      isCanvasDrawing = true;
      canvasSnapshot = ctxExtec.getImageData(0, 0, canvasExtec.width, canvasExtec.height);

      ctxExtec.beginPath();
      ctxExtec.moveTo(pos.x, pos.y);
    };

    const moveDraw = (e) => {
      const pos = getCanvasCoords(e);
      const coordsEl = document.getElementById('canvas-coords');
      if (coordsEl) coordsEl.textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}`;

      if (!isCanvasDrawing) return;
      e.preventDefault();

      if (canvasTool === 'pen') {
        ctxExtec.strokeStyle = canvasColor;
        ctxExtec.lineWidth = canvasLineWidth;
        ctxExtec.lineCap = 'round';
        ctxExtec.lineJoin = 'round';
        ctxExtec.lineTo(pos.x, pos.y);
        ctxExtec.stroke();
      } else if (canvasTool === 'eraser') {
        ctxExtec.strokeStyle = '#ffffff';
        ctxExtec.lineWidth = canvasLineWidth * 4;
        ctxExtec.lineCap = 'round';
        ctxExtec.lineTo(pos.x, pos.y);
        ctxExtec.stroke();
      } else if (canvasTool === 'line') {
        ctxExtec.putImageData(canvasSnapshot, 0, 0);
        ctxExtec.strokeStyle = canvasColor;
        ctxExtec.lineWidth = canvasLineWidth;
        ctxExtec.lineCap = 'round';
        ctxExtec.beginPath();
        ctxExtec.moveTo(canvasStartX, canvasStartY);
        ctxExtec.lineTo(pos.x, pos.y);
        ctxExtec.stroke();
      }
    };

    const stopDraw = () => {
      if (isCanvasDrawing) {
        isCanvasDrawing = false;
        ctxExtec.closePath();
      }
    };

    canvasExtec.addEventListener('mousedown', startDraw);
    canvasExtec.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', stopDraw);

    canvasExtec.addEventListener('touchstart', startDraw, { passive: false });
    canvasExtec.addEventListener('touchmove', moveDraw, { passive: false });
    canvasExtec.addEventListener('touchend', stopDraw);
    canvasExtec.addEventListener('touchcancel', stopDraw);
  }

  function drawStamp(type, x, y) {
    if (!ctxExtec) return;

    if (type === 'poste') {
      ctxExtec.fillStyle = '#0f172a';
      ctxExtec.beginPath();
      ctxExtec.arc(x, y, 9, 0, Math.PI * 2);
      ctxExtec.fill();

      ctxExtec.fillStyle = '#ffffff';
      ctxExtec.font = 'bold 9px sans-serif';
      ctxExtec.textAlign = 'center';
      ctxExtec.textBaseline = 'middle';
      ctxExtec.fillText('P', x, y);

      ctxExtec.strokeStyle = '#64748b';
      ctxExtec.lineWidth = 3;
      ctxExtec.beginPath();
      ctxExtec.moveTo(x - 18, y - 10);
      ctxExtec.lineTo(x + 18, y - 10);
      ctxExtec.stroke();
    } else if (type === 'brt') {
      ctxExtec.fillStyle = '#f8fafc';
      ctxExtec.strokeStyle = '#ff5500';
      ctxExtec.lineWidth = 2;
      ctxExtec.fillRect(x - 25, y - 16, 50, 32);
      ctxExtec.strokeRect(x - 25, y - 16, 50, 32);

      ctxExtec.fillStyle = '#ff5500';
      ctxExtec.font = 'bold 10px sans-serif';
      ctxExtec.textAlign = 'center';
      ctxExtec.textBaseline = 'middle';
      ctxExtec.fillText('⚡ BRT', x, y);
    } else if (type === 'chave') {
      ctxExtec.strokeStyle = '#ef4444';
      ctxExtec.lineWidth = 2.5;
      ctxExtec.beginPath();
      ctxExtec.moveTo(x - 18, y);
      ctxExtec.lineTo(x - 6, y);
      ctxExtec.lineTo(x + 8, y - 12);
      ctxExtec.moveTo(x + 6, y);
      ctxExtec.lineTo(x + 18, y);
      ctxExtec.stroke();

      ctxExtec.fillStyle = '#ef4444';
      ctxExtec.beginPath();
      ctxExtec.arc(x - 6, y, 3, 0, Math.PI * 2);
      ctxExtec.arc(x + 6, y, 3, 0, Math.PI * 2);
      ctxExtec.fill();
    } else if (type === 'trafo') {
      ctxExtec.strokeStyle = '#0284c7';
      ctxExtec.lineWidth = 2;
      ctxExtec.beginPath();
      ctxExtec.arc(x - 7, y, 10, 0, Math.PI * 2);
      ctxExtec.stroke();
      ctxExtec.beginPath();
      ctxExtec.arc(x + 7, y, 10, 0, Math.PI * 2);
      ctxExtec.stroke();
      ctxExtec.fillStyle = '#0284c7';
      ctxExtec.font = 'bold 9px sans-serif';
      ctxExtec.textAlign = 'center';
      ctxExtec.fillText('TRAFO', x, y + 18);
    } else if (type === 'atr') {
      ctxExtec.strokeStyle = '#16a34a';
      ctxExtec.lineWidth = 2.5;
      ctxExtec.beginPath();
      ctxExtec.moveTo(x, y - 12);
      ctxExtec.lineTo(x, y);
      ctxExtec.moveTo(x - 12, y);
      ctxExtec.lineTo(x + 12, y);
      ctxExtec.moveTo(x - 8, y + 4);
      ctxExtec.lineTo(x + 8, y + 4);
      ctxExtec.moveTo(x - 4, y + 8);
      ctxExtec.lineTo(x + 4, y + 8);
      ctxExtec.stroke();
      ctxExtec.fillStyle = '#16a34a';
      ctxExtec.font = 'bold 9px sans-serif';
      ctxExtec.textAlign = 'center';
      ctxExtec.fillText('ATR', x, y + 20);
    }
  }

  function drawTemplateBrt(targetCtx = null, w = 860, h = 320) {
    const ctx = targetCtx || ctxExtec;
    if (!ctx) return;
    drawCanvasGrid(ctx, w, h);

    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 70);
    ctx.lineTo(810, 70);
    ctx.stroke();

    ctx.fillStyle = '#ff5500';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ALIMENTADOR MT (FASE A, B, C - 13.8kV)', 50, 56);

    const pole1X = 260;
    const pole2X = 600;

    [pole1X, pole2X].forEach((px, i) => {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px, 50);
      ctx.lineTo(px, 260);
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(px - 30, 68);
      ctx.lineTo(px + 30, 68);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`POSTE DT 12/600 (P0${i + 1})`, px, 276);
    });

    const platX = 330;
    const platY = 150;
    const platW = 200;
    const platH = 12;

    ctx.fillStyle = '#334155';
    ctx.fillRect(platX, platY, platW, platH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(platX, platY, platW, platH);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(platX, platY + platH);
    ctx.lineTo(pole1X, 210);
    ctx.moveTo(platX + platW, platY + platH);
    ctx.lineTo(pole2X, 210);
    ctx.stroke();

    const regPositions = [platX + 18, platX + 78, platX + 138];
    regPositions.forEach((rx, i) => {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(rx, 96, 44, 54);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, 96, 44, 54);

      ctx.fillStyle = '#ea580c';
      ctx.fillRect(rx + 6, 82, 9, 14);
      ctx.fillRect(rx + 29, 82, 9, 14);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BRT-${['A', 'B', 'C'][i]}`, rx + 22, 126);
    });

    ctx.fillStyle = '#fee2e2';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(380, 24, 100, 22);
    ctx.strokeRect(380, 24, 100, 22);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHAVE BYPASS UNIPOLAR', 430, 38);

    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(430, 162);
    ctx.lineTo(430, 280);
    ctx.moveTo(410, 280);
    ctx.lineTo(450, 280);
    ctx.moveTo(418, 286);
    ctx.lineTo(442, 286);
    ctx.moveTo(426, 292);
    ctx.lineTo(434, 292);
    ctx.stroke();

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MALHA DE ATERRAMENTO (HASTE 5/8" x 2.40m / CABO 10mm²)', 430, 308);

    if (!targetCtx) showToast('Esboço normativo de Instalação de BRT desenhado no Canvas EXTEC!', 'success');
  }

  function drawTemplateCabos(targetCtx = null, w = 860, h = 320) {
    const ctx = targetCtx || ctxExtec;
    if (!ctx) return;
    drawCanvasGrid(ctx, w, h);

    const poles = [
      { x: 90, label: 'P01 (N3 Ancoragem)' },
      { x: 310, label: 'P02 (N1 Tangente MT)' },
      { x: 530, label: 'P03 (N1 Tangente MT)' },
      { x: 750, label: 'P04 (N4 Fim de Linha)' }
    ];

    poles.forEach(p => {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x, 70);
      ctx.lineTo(p.x, 250);
      ctx.stroke();

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p.x - 30, 85);
      ctx.lineTo(p.x + 30, 85);
      ctx.stroke();

      ctx.fillStyle = '#ea580c';
      ctx.fillRect(p.x - 26, 75, 8, 10);
      ctx.fillRect(p.x - 4, 75, 8, 10);
      ctx.fillRect(p.x + 18, 75, 8, 10);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, 270);
    });

    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(90, 75);
    ctx.quadraticCurveTo(200, 105, 310, 75);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(310, 75);
    ctx.quadraticCurveTo(420, 105, 530, 75);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(530, 75);
    ctx.quadraticCurveTo(640, 105, 750, 75);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← VÃO 01: 45m (Cabo 1/0 CAA Raven) →', 200, 130);
    ctx.fillText('← VÃO 02: 45m (Cabo 1/0 CAA Raven) →', 420, 130);
    ctx.fillText('← VÃO 03: 45m (Cabo 1/0 CAA Raven) →', 640, 130);

    ctx.fillStyle = '#0f172a';
    ctx.font = '10px sans-serif';
    ctx.fillText('Tensão de tracionamento aplicada: 180 daN | Flecha regulada: 0,42m (Temp: 32°C - Padrão Equatorial)', 420, 155);

    ctx.fillStyle = '#16a34a';
    ctx.fillText('✓ Alças Preformadas de Distribuição instaladas nas ancoragens P01 e P04', 420, 175);
    ctx.fillText('✓ Laços Preformados de Topo 1/0 aplicados nos isoladores de pilar P02 e P03', 420, 195);

    if (!targetCtx) showToast('Esboço normativo de Lançamento de Cabos desenhado no Canvas EXTEC!', 'info');
  }

  // ==========================================
  // RDO (CRIAR, SALVAR, VISUALIZAR OFICIAL)
  // ==========================================
  function openNewRdoModal() {
    currentRdoPhotos = [];
    document.getElementById('form-rdo').reset();
    document.getElementById('rdo-edit-id').value = '';
    document.getElementById('rdo-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('photo-preview-grid').innerHTML = '';

    document.getElementById('opt-regime-lv').classList.add('selected');
    document.getElementById('opt-regime-lm').classList.remove('selected');
    document.getElementById('opt-regime-lv').querySelector('input').checked = true;

    document.getElementById('labor-rows-container').innerHTML = '';
    document.getElementById('activity-rows-container').innerHTML = '';
    document.getElementById('material-rows-container').innerHTML = '';

    addLaborRow('Encarregado de Linha Viva', 1);
    addLaborRow('Eletricista de Linha Viva MT', 2);
    addLaborRow('Operador de Guindauto / Motorista', 1);

    addActivityRow('Instalação de coberturas e mantas isolantes classe 4', 100, 'Concluído');
    addActivityRow('Substituição de chave fusível 15kV sob tensão', 100, 'Concluído');

    addMaterialRow('Chave fusível 15kV', 2, 'unidades');
    addMaterialRow('Para-raios 15kV', 2, 'unidades');
    addMaterialRow('Laço 1/0', 4, 'peças');

    // Inicializa o Canvas EXTEC
    setTimeout(() => initCanvasExtec(), 80);

    document.getElementById('modal-rdo-title').textContent = 'Novo Relatório Diário de Obra (RDO) - Rede de Distribuição';
    document.getElementById('modal-rdo').classList.add('active');
  }

  function closeRdoModal() {
    document.getElementById('modal-rdo').classList.remove('active');
  }

  function addLaborRow(role = '', qty = 1) {
    const container = document.getElementById('labor-rows-container');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <input type="text" class="form-control labor-role" placeholder="Função / Especialidade (ex: Eletricista de Linha Viva)" value="${role}" style="flex: 3;" required>
      <input type="number" class="form-control labor-qty" placeholder="Qtd" value="${qty}" min="1" style="flex: 1;" required>
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" title="Remover Linha">×</button>
    `;
    container.appendChild(row);
  }

  function addActivityRow(desc = '', progress = 100, status = 'Concluído') {
    const container = document.getElementById('activity-rows-container');
    const row = document.createElement('div');
    row.className = 'dynamic-row';
    row.innerHTML = `
      <input type="text" class="form-control act-desc" placeholder="Descrição da atividade de rede..." value="${desc}" style="flex: 4;" required>
      <input type="number" class="form-control act-progress" placeholder="Avanço %" value="${progress}" min="0" max="100" style="flex: 1;">
      <select class="form-control act-status" style="flex: 1.5;">
        <option value="Concluído" ${status === 'Concluído' ? 'selected' : ''}>Concluído</option>
        <option value="Em Andamento" ${status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
        <option value="Paralisado" ${status === 'Paralisado' ? 'selected' : ''}>Paralisado</option>
      </select>
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" title="Remover Linha">×</button>
    `;
    container.appendChild(row);
  }

  function addMaterialRow(name = '', qty = 1, unit = 'un') {
    const container = document.getElementById('material-rows-container');
    const row = document.createElement('div');
    row.className = 'dynamic-row';

    const optionsHtml = state.materials.map(m => `<option value="${m.name}" ${m.name === name ? 'selected' : ''}>${m.name} (${m.unit})</option>`).join('');

    row.innerHTML = `
      <input type="text" list="materials-datalist" class="form-control mat-name" placeholder="Selecione ou digite o material da rede..." value="${name}" style="flex: 3;" required>
      <datalist id="materials-datalist">${optionsHtml}</datalist>
      <input type="number" class="form-control mat-qty" placeholder="Qtd" value="${qty}" step="any" min="0" style="flex: 1;" required>
      <input type="text" class="form-control mat-unit" placeholder="Unidade" value="${unit}" style="flex: 1;">
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" title="Remover Linha">×</button>
    `;
    container.appendChild(row);
  }

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        currentRdoPhotos.push(dataUrl);
        renderPhotoPreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoPreviews() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;
    grid.innerHTML = currentRdoPhotos.map((url, idx) => `
      <div class="photo-preview-item">
        <img src="${url}" alt="Evidência ${idx + 1}">
        <button type="button" class="photo-preview-remove" onclick="removePhoto(${idx})" title="Remover Foto">×</button>
      </div>
    `).join('');
  }

  window.removePhoto = function (idx) {
    currentRdoPhotos.splice(idx, 1);
    renderPhotoPreviews();
  };

  function handleSaveRdo() {
    const date = document.getElementById('rdo-date').value;
    const teamId = document.getElementById('rdo-team').value;
    const leader = document.getElementById('rdo-leader').value;
    const substation = document.getElementById('rdo-substation').value;
    const feeder = document.getElementById('rdo-feeder').value;
    const osNumber = document.getElementById('rdo-os').value || 'OS-AVULSA';
    const aprNumber = document.getElementById('rdo-apr').value || 'APR-000';
    const location = document.getElementById('rdo-location').value;
    const structureType = document.getElementById('rdo-structure').value;

    const regimeEl = document.querySelector('input[name="rdo-regime"]:checked');
    const regime = regimeEl ? regimeEl.value : 'Linha Viva (Energizada)';

    if (!date || !teamId || !leader || !substation || !feeder) {
      alert('Por favor, preencha a Data, Equipe, Encarregado, Subestação e Alimentador.');
      return;
    }

    const team = state.teams.find(t => t.id === teamId);
    const teamName = team ? team.name : 'Equipe de Linha';
    const teamCode = team ? (team.code || team.name.split(' ')[0]) : 'EQTL';

    const labor = [];
    document.querySelectorAll('#labor-rows-container .dynamic-row').forEach(row => {
      const role = row.querySelector('.labor-role').value;
      const qty = Number(row.querySelector('.labor-qty').value) || 1;
      if (role) labor.push({ role, qty });
    });

    const activities = [];
    document.querySelectorAll('#activity-rows-container .dynamic-row').forEach(row => {
      const description = row.querySelector('.act-desc').value;
      const progress = Number(row.querySelector('.act-progress').value) || 0;
      const status = row.querySelector('.act-status').value;
      if (description) activities.push({ description, progress, status });
    });

    const materials = [];
    document.querySelectorAll('#material-rows-container .dynamic-row').forEach(row => {
      const name = row.querySelector('.mat-name').value;
      const qty = Number(row.querySelector('.mat-qty').value) || 0;
      const unit = row.querySelector('.mat-unit').value || 'un';
      if (name) {
        materials.push({ name, qty, unit });

        // Se a equipe tiver material em viatura, deduz do saldo da viatura
        if (team && team.allocatedMaterials) {
          const vehMat = team.allocatedMaterials.find(am => am.name.toLowerCase() === name.toLowerCase());
          if (vehMat && vehMat.qty >= qty) {
            vehMat.qty -= qty;
          }
        }
      }
    });

    const weatherMorning = document.getElementById('rdo-weather-morning').value;
    const weatherAfternoon = document.getElementById('rdo-weather-afternoon').value;
    const occurrences = document.getElementById('rdo-occurrences').value;
    const observations = document.getElementById('rdo-observations').value;

    const count = state.rdos.length + 1;
    const code = `RDO-EQTL-${String(count).padStart(3, '0')}`;

    // Captura o croqui técnico do Canvas EXTEC
    let canvasExtecData = null;
    if (canvasExtec) {
      try {
        canvasExtecData = canvasExtec.toDataURL('image/png');
      } catch (err) {
        console.warn('Erro ao exportar Canvas EXTEC:', err);
      }
    }

    const newRdo = {
      id: code,
      teamId,
      teamCode,
      teamName,
      leader,
      regime,
      substation,
      feeder,
      osNumber,
      aprNumber,
      client: 'Equatorial Piauí Distribuidora',
      project: `Manutenção MT/BT - ${substation} (${feeder})`,
      location,
      structureType,
      date,
      weatherMorning,
      weatherAfternoon,
      groundCondition: 'Praticável',
      status: 'Aprovado',
      safetyCheck: {
        aprApproved: document.getElementById('chk-apr-ok').checked,
        ppeInspected: document.getElementById('chk-ppe-ok').checked,
        atrInstalled: document.getElementById('chk-atr-ok').checked,
        dielectricChecked: document.getElementById('chk-dielectric-ok').checked
      },
      labor,
      activities,
      materials,
      canvasExtec: canvasExtecData,
      occurrences: occurrences || 'Intervenção executada conforme normas técnicas da Equatorial Piauí.',
      observations: observations || 'Sem observações adicionais.',
      photos: [...currentRdoPhotos]
    };

    state.rdos.unshift(newRdo);
    saveState();
    closeRdoModal();
    renderAll();
    showToast(`Relatório Diário ${code} emitido com sucesso!`, 'success');
  }

  window.deleteRdo = function (id) {
    if (!confirm(`Deseja realmente excluir o relatório ${id}?`)) return;
    state.rdos = state.rdos.filter(r => r.id !== id);
    saveState();
    renderAll();
    showToast(`Relatório ${id} removido.`, 'info');
  };

  // ==========================================
  // FOLHA TÉCNICA OFICIAL A4 DO RDO (EQUATORIAL)
  // ==========================================
  window.viewRdoSheet = function (rdoId) {
    const rdo = state.rdos.find(r => r.id === rdoId);
    if (!rdo) return;

    currentViewingRdoId = rdo.id;
    const container = document.getElementById('rdo-sheet-container');
    if (!container) return;

    const totalWorkers = (rdo.labor || []).reduce((sum, l) => sum + (Number(l.qty) || 0), 0);

    const isLinhaViva = (rdo.regime || '').includes('Linha Viva');
    const regimeBadge = isLinhaViva
      ? '<span style="background: #ff5500; color: #fff; padding: 2px 8px; font-weight: bold; border-radius: 3px; font-size: 9.5px;">⚡ LINHA VIVA (ENERGIZADA)</span>'
      : '<span style="background: #0ea5e9; color: #fff; padding: 2px 8px; font-weight: bold; border-radius: 3px; font-size: 9.5px;">🔒 LINHA MORTA (DESENERGIZADA / ATR)</span>';

    const laborRows = (rdo.labor && rdo.labor.length > 0)
      ? rdo.labor.map(l => `<tr><td>${l.role}</td><td style="text-align: center; font-weight: bold;">${l.qty}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align: center; color: #64748b;">Nenhum efetivo informado</td></tr>';

    const activityRows = (rdo.activities && rdo.activities.length > 0)
      ? rdo.activities.map((a, i) => `
          <tr>
            <td style="text-align: center; width: 26px; font-weight: bold;">${i + 1}</td>
            <td>${a.description}</td>
            <td style="text-align: center; width: 65px; font-weight: bold;">${a.progress}%</td>
            <td style="text-align: center; width: 85px;"><strong>${a.status}</strong></td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhuma atividade lançada</td></tr>';

    const materialRows = (rdo.materials && rdo.materials.length > 0)
      ? rdo.materials.map(m => `
          <tr>
            <td style="font-weight: bold;">${m.name}</td>
            <td style="text-align: center; font-weight: bold; color: #ea580c;">${m.qty}</td>
            <td style="text-align: center;">${m.unit}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="3" style="text-align: center; color: #64748b;">Nenhum material aplicado registrado</td></tr>';

    let photosHtml = '';
    if (rdo.photos && rdo.photos.length > 0) {
      photosHtml = `
        <div class="rdo-sheet-box rdo-photos-annex" style="page-break-before: always; break-before: page; margin-top: 15px;">
          <div class="rdo-box-header">REGISTRO FOTOGRÁFICO DE CAMPO - ANEXO (POSTES, CRUZETAS E MANOBRAS)</div>
          <div class="rdo-box-content" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px;">
            ${rdo.photos.map(p => `<img src="${p}" style="width: 100%; height: 120px; object-fit: cover; border: 1px solid #cbd5e1; border-radius: 4px;">`).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Cabeçalho Oficial Equatorial -->
      <div class="rdo-sheet-header">
        <div class="rdo-sheet-logo">
          <h4>EQUATORIAL ENERGIA</h4>
          <span>CONCESSIONÁRIA PIAUÍ</span>
        </div>
        <div class="rdo-sheet-title">
          <h2>RELATÓRIO DIÁRIO DE OPERAÇÃO - RDO</h2>
          <span>MANUTENÇÃO E OBRAS EM REDES DE DISTRIBUIÇÃO MT / BT (SEP / NR-10)</span>
        </div>
        <div class="rdo-sheet-meta">
          <div><strong>RDO Nº:</strong> <span style="color: #ff5500; font-weight: 900;">${rdo.id}</span></div>
          <div><strong>DATA:</strong> ${formatDate(rdo.date)}</div>
          <div><strong>ORDEM SERVIÇO:</strong> ${rdo.osNumber || '-'}</div>
        </div>
      </div>

      <!-- Regime de Intervenção & Segurança -->
      <div class="rdo-sheet-strip">
        <div>
          <span style="font-size: 9.5px; color: #475569; font-weight: bold; margin-right: 6px;">REGIME DE TRABALHO:</span>
          ${regimeBadge}
        </div>
        <div>
          <span style="font-size: 9.5px; color: #475569; font-weight: bold;">APR Nº:</span>
          <strong style="color: #0f172a; margin-left: 4px;">${rdo.aprNumber || 'APR-LIBERADA'}</strong>
        </div>
      </div>

      <!-- Box 1: Identificação Técnica da Rede -->
      <div class="rdo-sheet-box">
        <div class="rdo-box-header">1. DADOS TÉCNICOS DO CIRCUITO & LOCALIZAÇÃO</div>
        <div class="rdo-box-content" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6px;">
          <div>
            <div><strong>Subestação (SE):</strong> ${rdo.substation || '-'}</div>
            <div><strong>Alimentador MT:</strong> ${rdo.feeder || '-'}</div>
            <div><strong>Local / Chave:</strong> ${rdo.location || '-'}</div>
          </div>
          <div>
            <div><strong>Tipo de Estrutura:</strong> ${rdo.structureType || 'Padrão MT'}</div>
            <div><strong>Equipe de Linha:</strong> ${rdo.teamName || getTeamName(rdo.teamId)}</div>
            <div><strong>Eletricista Encarregado:</strong> ${rdo.leader || '-'}</div>
          </div>
          <div>
            <div><strong>Clima Manhã:</strong> ${rdo.weatherMorning || 'Ensolarado'}</div>
            <div><strong>Clima Tarde:</strong> ${rdo.weatherAfternoon || 'Ensolarado'}</div>
            <div><strong>Status RDO:</strong> ${rdo.status}</div>
          </div>
        </div>
      </div>

      <!-- Box 2: Atividades de Manutenção e Construção -->
      <div class="rdo-sheet-box">
        <div class="rdo-box-header">2. ATIVIDADES DE MANUTENÇÃO & CONSTRUÇÃO EXECUTADAS</div>
        <table class="rdo-sheet-table">
          <thead>
            <tr><th style="width: 26px; text-align: center;">Item</th><th>Descrição da Intervenção no Circuito MT/BT</th><th style="width: 65px; text-align: center;">Avanço</th><th style="width: 85px; text-align: center;">Situação</th></tr>
          </thead>
          <tbody>${activityRows}</tbody>
        </table>
      </div>

      <!-- Grid 2 Colunas: Efetivo + Ocorrências (Esq) e Materiais (Dir) -->
      <div style="display: grid; grid-template-columns: 1fr 1.25fr; gap: 6px; margin-bottom: 0.35rem;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div class="rdo-sheet-box" style="margin-bottom: 0; flex: 1;">
            <div class="rdo-box-header">3. EFETIVO PRESENTE (TOTAL: ${totalWorkers})</div>
            <table class="rdo-sheet-table">
              <thead>
                <tr><th>Função / NR-10</th><th style="width: 45px; text-align: center;">Qtd</th></tr>
              </thead>
              <tbody>${laborRows}</tbody>
            </table>
          </div>
          <div class="rdo-sheet-box" style="margin-bottom: 0;">
            <div class="rdo-box-header">4. OCORRÊNCIAS / COD</div>
            <div class="rdo-box-content" style="padding: 3px 5px;">
              <div><strong>Registro:</strong> ${rdo.occurrences || 'Intervenção concluída conforme normas.'}</div>
              <div><strong>Obs:</strong> ${rdo.observations || 'Sem anormalidades registradas.'}</div>
            </div>
          </div>
        </div>

        <div class="rdo-sheet-box" style="margin-bottom: 0;">
          <div class="rdo-box-header">5. MATERIAIS & FERRAGENS INSTALADOS (PADRÃO EQUATORIAL)</div>
          <table class="rdo-sheet-table">
            <thead>
              <tr><th>Insumo / Material</th><th style="width: 60px; text-align: center;">Qtd</th><th style="width: 50px; text-align: center;">Unid</th></tr>
            </thead>
            <tbody>${materialRows}</tbody>
          </table>
        </div>
      </div>

      <!-- Box 6: Croqui de Execução Técnica (EXTEC) - OTIMIZADO PARA CABER EM 1 PÁGINA ÚNICA -->
      ${rdo.canvasExtec ? `
        <div class="rdo-croqui-box">
          <div class="rdo-box-header">
            <span>6. CROQUI DE EXECUÇÃO TÉCNICA DE CAMPO - EXTEC (DISPOSIÇÃO DE ESTRUTURAS E CONDUTORES)</span>
            <span style="font-size: 8.5px; opacity: 0.85; font-weight: normal;">PADRÃO EQUATORIAL PIAUÍ</span>
          </div>
          <div class="rdo-box-content" style="text-align: center; background: #ffffff; padding: 3px;">
            <img src="${rdo.canvasExtec}" alt="Croqui EXTEC" class="rdo-croqui-img" style="border: 1px solid #cbd5e1; border-radius: 3px;">
          </div>
        </div>
      ` : ''}

      <!-- Assinatura Oficial do Encarregado da Frente de Serviço -->
      <div class="rdo-sheet-signatures">
        <div>
          <div class="signature-line">
            ${rdo.leader || 'Eletricista Encarregado'}<br>
            <span style="font-weight: normal; color: #475569;">Encarregado Técnico da Equipe Operacional</span>
          </div>
        </div>
      </div>

      <!-- Fotos Anexas (se houver, página 2) -->
      ${photosHtml}
    `;

    document.getElementById('modal-view-rdo').classList.add('active');
  };

  // ==========================================
  // MATERIAIS & EQUIPES (MODAIS & AÇÕES)
  // ==========================================
  function openMaterialModal(fromRdo = false) {
    isQuickAddFromRdo = fromRdo;
    document.getElementById('form-material').reset();
    document.getElementById('modal-material').classList.add('active');
  }

  function closeMaterialModal() {
    document.getElementById('modal-material').classList.remove('active');
    isQuickAddFromRdo = false;
  }

  function handleSaveMaterial() {
    const name = document.getElementById('mat-name-input').value.trim();
    const category = document.getElementById('mat-category-input').value.trim() || 'Geral';
    const unit = document.getElementById('mat-unit-input').value.trim();
    const defaultQty = Number(document.getElementById('mat-default-qty').value) || 0;

    if (!name || !unit) {
      alert('Informe o nome e a unidade do material.');
      return;
    }

    const newMat = {
      id: 'mat-' + Date.now(),
      name,
      category,
      unit,
      defaultQty,
      stock: defaultQty,
      totalUsed: 0
    };

    state.materials.push(newMat);
    saveState();
    closeMaterialModal();
    renderAll();
    populateSelects();
    showToast(`Material "${name}" cadastrado no catálogo master!`, 'success');

    if (isQuickAddFromRdo) {
      addMaterialRow(name, 1, unit);
    }
  }

  window.deleteMaterial = function (id) {
    const mat = state.materials.find(m => m.id === id);
    if (!mat || !confirm(`Deseja remover o material "${mat.name}"?`)) return;
    state.materials = state.materials.filter(m => m.id !== id);
    saveState();
    renderAll();
    showToast('Material removido do catálogo.', 'info');
  };

  // ==========================================
  // IMPORTAÇÃO DA PLANILHA GOOGLE / CSV
  // ==========================================
  function openSheetImportModal() {
    document.getElementById('sheet-pasted-data').value = '';
    document.getElementById('sheet-url-input').value = '';
    document.getElementById('modal-sheet-import').classList.add('active');
  }

  function closeSheetImportModal() {
    document.getElementById('modal-sheet-import').classList.remove('active');
  }

  async function handleFetchSheetUrl() {
    const url = document.getElementById('sheet-url-input').value.trim();
    if (!url) {
      alert('Informe o link CSV da planilha.');
      return;
    }

    try {
      showToast('Buscando dados da planilha...', 'info');
      const response = await fetch(url);
      if (!response.ok) throw new Error('Status ' + response.status);
      const csvText = await response.text();
      document.getElementById('sheet-pasted-data').value = csvText;
      showToast('Dados carregados com sucesso! Clique em Processar.', 'success');
    } catch (err) {
      console.warn('Erro ao buscar planilha via URL:', err);
      alert('Não foi possível carregar diretamente pela URL (restrição de segurança do Google ou planilha privada). Por favor, copie as células no Sheets/Excel e cole diretamente na caixa de texto abaixo.');
    }
  }

  function handleProcessSheetImport() {
    const raw = document.getElementById('sheet-pasted-data').value.trim();
    if (!raw) {
      alert('Por favor, cole os dados da planilha na área de texto.');
      return;
    }

    const lines = raw.split(/\r?\n/);
    let count = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let cols = [];
      if (trimmed.includes('\t')) {
        cols = trimmed.split('\t').map(c => c.trim());
      } else if (trimmed.includes(';')) {
        cols = trimmed.split(';').map(c => c.trim());
      } else if (trimmed.includes(',')) {
        cols = trimmed.split(',').map(c => c.trim());
      } else {
        cols = [trimmed];
      }

      const firstLower = (cols[0] || '').toLowerCase();
      if (firstLower.includes('material') || firstLower.includes('insumo') || firstLower.includes('item') || firstLower.includes('descri')) {
        return;
      }

      const name = cols[0];
      const category = cols[1] || 'Materiais de Rede';
      const unit = cols[2] || 'peças';
      const defaultQty = Number(cols[3]) || 20;

      if (name) {
        const exists = state.materials.find(m => m.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          state.materials.push({
            id: 'mat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name,
            category,
            unit,
            defaultQty,
            stock: defaultQty,
            totalUsed: 0
          });
          count++;
        }
      }
    });

    saveState();
    renderAll();
    populateSelects();
    closeSheetImportModal();
    showToast(`${count} novo(s) material(is) adicionado(s) da planilha!`, 'success');
  }

  // ==========================================
  // GESTÃO DE EQUIPES (CRIAR, EDITAR & EXCLUIR)
  // ==========================================
  function openTeamModal(teamId = null) {
    document.getElementById('form-team').reset();
    const editIdInput = document.getElementById('team-edit-id');
    const modalTitle = document.getElementById('modal-team-title');
    const btnSaveText = document.getElementById('btn-save-team-text');

    if (teamId && typeof teamId === 'string') {
      const team = state.teams.find(t => t.id === teamId);
      if (team) {
        if (editIdInput) editIdInput.value = team.id;
        if (modalTitle) modalTitle.textContent = `Editar Equipe - ${team.name}`;
        if (btnSaveText) btnSaveText.textContent = 'Salvar Alterações';

        document.getElementById('team-name-input').value = team.name || '';
        document.getElementById('team-specialty-input').value = team.specialty || '';
        document.getElementById('team-leader-input').value = team.leader || '';
        document.getElementById('team-contact-input').value = team.contact || '';
        document.getElementById('team-members-count').value = team.membersCount || 4;
        document.getElementById('team-color-input').value = team.color || '#ff5500';

        document.getElementById('modal-team').classList.add('active');
        return;
      }
    }

    // Modo Criação
    if (editIdInput) editIdInput.value = '';
    if (modalTitle) modalTitle.textContent = 'Cadastrar Nova Equipe de Distribuição';
    if (btnSaveText) btnSaveText.textContent = 'Salvar Equipe';
    document.getElementById('team-color-input').value = '#ff5500';
    document.getElementById('team-members-count').value = 4;
    document.getElementById('modal-team').classList.add('active');
  }

  function closeTeamModal() {
    document.getElementById('modal-team').classList.remove('active');
    document.getElementById('form-team').reset();
    const editIdInput = document.getElementById('team-edit-id');
    if (editIdInput) editIdInput.value = '';
  }

  window.editTeam = function (teamId) {
    openTeamModal(teamId);
  };

  window.deleteTeam = function (teamId) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;

    const totalUnits = (team.allocatedMaterials || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const confirmMsg = totalUnits > 0
      ? `Atenção: Deseja realmente remover a equipe "${team.name}"?\n\n📦 ${totalUnits} unidade(s) de materiais que estão vinculados à viatura serão estornados e devolvidos ao almoxarifado base!`
      : `Deseja realmente remover a equipe "${team.name}" do sistema?`;

    if (!confirm(confirmMsg)) return;

    // Estorna materiais da viatura para a base
    if (team.allocatedMaterials && team.allocatedMaterials.length > 0) {
      team.allocatedMaterials.forEach(alloc => {
        const mat = state.materials.find(m => m.id === alloc.id || m.name.toLowerCase() === alloc.name.toLowerCase());
        if (mat) {
          if (mat.stock === undefined) mat.stock = 0;
          mat.stock += Number(alloc.qty) || 0;
        }
      });
    }

    state.teams = state.teams.filter(t => t.id !== teamId);

    if (state.selectedTeamFilter === teamId) {
      state.selectedTeamFilter = 'all';
    }

    saveState();
    populateSelects();
    renderAll();
    showToast(`Equipe "${team.name}" removida com sucesso!`, 'info');
  };

  function handleSaveTeam() {
    const editId = (document.getElementById('team-edit-id')?.value || '').trim();
    const name = document.getElementById('team-name-input').value.trim();
    const specialty = document.getElementById('team-specialty-input').value.trim();
    const leader = document.getElementById('team-leader-input').value.trim();
    const contact = document.getElementById('team-contact-input').value.trim();
    const membersCount = Number(document.getElementById('team-members-count').value) || 4;
    const color = document.getElementById('team-color-input').value;

    if (!name || !leader) {
      alert('Informe o nome da equipe e o eletricista encarregado.');
      return;
    }

    const code = name.includes(' ') ? name.split(' ')[0].replace(/[[\]]/g, '') : name;

    if (editId) {
      const team = state.teams.find(t => t.id === editId);
      if (team) {
        team.name = name;
        team.code = code || team.code || 'EQTL';
        team.specialty = specialty || 'Manutenção em Rede MT/BT';
        team.leader = leader;
        team.contact = contact || '(86) 99999-9999';
        team.membersCount = membersCount;
        team.color = color || '#ff5500';

        saveState();
        populateSelects();
        closeTeamModal();
        renderAll();
        showToast(`Equipe "${name}" atualizada com sucesso!`, 'success');
        return;
      }
    }

    // Criação de nova equipe
    const newTeam = {
      id: 'eq-' + Date.now(),
      code: code || 'EQTL',
      name,
      specialty: specialty || 'Manutenção em Rede MT/BT',
      leader,
      contact: contact || '(86) 99999-9999',
      status: 'active',
      membersCount,
      color: color || '#ff5500',
      allocatedMaterials: []
    };

    state.teams.push(newTeam);
    saveState();
    populateSelects();
    closeTeamModal();
    renderAll();
    showToast(`Equipe "${name}" cadastrada com sucesso!`, 'success');
  }

  // ==========================================
  // BACKUP & UTILITÁRIOS
  // ==========================================
  function exportBackupJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `backup_redeviva_eqtl_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    showToast('Backup JSON exportado com sucesso!', 'success');
  }

  function importBackupJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && Array.isArray(imported.teams) && Array.isArray(imported.rdos)) {
          state = imported;
          ensureDataIntegrity();
          saveState();
          populateSelects();
          renderAll();
          document.getElementById('modal-data').classList.remove('active');
          showToast('Backup restaurado com sucesso!', 'success');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function getTeamName(teamId) {
    const t = state.teams.find(item => item.id === teamId);
    return t ? t.name : 'Equipe de Linha';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getStatusBadge(status) {
    if (status === 'Aprovado') {
      return '<span class="badge badge-active"><span class="badge-dot"></span> Validado</span>';
    } else if (status === 'Em Análise') {
      return '<span class="badge badge-pending"><span class="badge-dot"></span> Em Análise</span>';
    }
    return `<span class="badge badge-completed">${status || 'Registrado'}</span>`;
  }

  function getRegimeBadge(regime) {
    if ((regime || '').includes('Linha Viva')) {
      return '<span class="badge badge-linhaviva"><span class="badge-dot"></span> ⚡ Linha Viva</span>';
    }
    return '<span class="badge badge-linhamorta"><span class="badge-dot"></span> 🔒 Linha Morta</span>';
  }

  function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>${msg}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
