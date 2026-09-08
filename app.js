const setupView = document.getElementById('setup-view');
const trackerView = document.getElementById('tracker-view');

const newTrackerButton = document.getElementById('new-tracker-button');
const refreshButton = document.getElementById('refresh-button');

const leagueForm = document.getElementById('league-form');
const leagueIdInput = document.getElementById('league-id');
const findButton = document.getElementById('find-button');
const leagueStatus = document.getElementById('league-status');
const leagueResult = document.getElementById('league-result');

const prizePanel = document.getElementById('prize-panel');
const entryFeeInput = document.getElementById('entry-fee');
const prizeStatus = document.getElementById('prize-status');
const prizeResult = document.getElementById('prize-result');

const createPanel = document.getElementById('create-panel');
const review = document.getElementById('review');
const createButton = document.getElementById('create-button');
const createStatus = document.getElementById('create-status');

const trackerLoading = document.getElementById('tracker-loading');
const trackerError = document.getElementById('tracker-error');
const trackerErrorMessage = document.getElementById('tracker-error-message');
const trackerErrorHome = document.getElementById('tracker-error-home');
const trackerContent = document.getElementById('tracker-content');

const trackerStatusBadge = document.getElementById('tracker-status-badge');
const trackerKeyLabel = document.getElementById('tracker-key-label');
const trackerLeagueName = document.getElementById('tracker-league-name');
const trackerSubtitle = document.getElementById('tracker-subtitle');
const trackerSummary = document.getElementById('tracker-summary');
const trackerManagerCount = document.getElementById('tracker-manager-count');
const trackerManagers = document.getElementById('tracker-managers');
const trackerPrizes = document.getElementById('tracker-prizes');
const trackerPeriods = document.getElementById('tracker-periods');
const dataUpdated = document.getElementById('data-updated');

const currentPeriodTitle = document.getElementById('current-period-title');
const currentPeriodMeta = document.getElementById('current-period-meta');
const currentPeriodStandings = document.getElementById('current-period-standings');

const currentGwTitle = document.getElementById('current-gw-title');
const currentGwMeta = document.getElementById('current-gw-meta');
const currentGwStandings = document.getElementById('current-gw-standings');

const shareUrlInput = document.getElementById('share-url');
const copyLinkButton = document.getElementById('copy-link-button');
const copyStatus = document.getElementById('copy-status');

let activeLeague = null;
let activePrizeConfig = null;
let activeTrackerKey = null;
let prizeTimer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase() || '?';
}

function formatChip(value) {
  const chips = {
    wildcard: 'Wildcard',
    freehit: 'Free Hit',
    bboost: 'Bench Boost',
    '3xc': 'Triple Captain',
    '3c': 'Triple Captain'
  };

  return chips[value] || value || '';
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function api(params) {
  const url = new URL(BARUC_API_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
}

function setStatus(el, message, type) {
  el.hidden = false;
  el.className = `status ${type}`;
  el.textContent = message;
}

function clearStatus(el) {
  el.hidden = true;
  el.textContent = '';
}

function getLeagueKeyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const value = String(params.get('league') || '').trim().toLowerCase();

  if (!value) {
    return null;
  }

  return /^[a-z0-9]{8}$/.test(value)
    ? value
    : '__invalid__';
}

function trackerUrl(leagueKey) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('league', leagueKey);
  return url.toString();
}

function showSetupView() {
  setupView.hidden = false;
  trackerView.hidden = true;
  newTrackerButton.hidden = true;
  refreshButton.hidden = true;

  document.title = 'Baruc';

  activeLeague = null;
  activePrizeConfig = null;
  activeTrackerKey = null;

  trackerContent.hidden = true;
  trackerError.hidden = true;
}

function resetSetupForNewTracker() {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';

  window.history.pushState({}, '', url);

  leagueForm.reset();
  entryFeeInput.value = '75';

  leagueResult.hidden = true;
  leagueResult.innerHTML = '';

  prizePanel.hidden = true;
  prizeResult.innerHTML = '';

  createPanel.hidden = true;

  clearStatus(leagueStatus);
  clearStatus(prizeStatus);
  clearStatus(createStatus);

  showSetupView();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function showTrackerShell() {
  setupView.hidden = true;
  trackerView.hidden = false;
  newTrackerButton.hidden = false;
  refreshButton.hidden = false;

  trackerLoading.hidden = false;
  trackerError.hidden = true;
  trackerContent.hidden = true;
}

function renderLeaguePreview(data) {
  const managers = data.managers || [];

  leagueResult.innerHTML = `
    <div class="league-header">
      <div>
        <h3>${escapeHtml(data.league.name)}</h3>
      </div>
      <span class="manager-count">${managers.length} / ${data.maxManagers} managers</span>
    </div>

    <div class="manager-list">
      ${managers.map(manager => `
        <div class="manager-row">
          <div class="rank">#${escapeHtml(manager.leagueRank)}</div>

          <div>
            <div class="team-name">${escapeHtml(manager.teamName)}</div>
            <div class="manager-name">${escapeHtml(manager.managerName)}</div>
          </div>

          <div class="manager-points">${escapeHtml(manager.overallPoints)} pts</div>
        </div>
      `).join('')}
    </div>
  `;

  leagueResult.hidden = false;
}

function renderPrizeConfig(config) {
  activePrizeConfig = config;

  const overallPayouts =
    config.overall.payouts.map(money).join(' / ');

  const periodPayouts =
    config.recurring.payoutsPerPeriod.map(money).join(' / ');

  prizeResult.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">Total pool</span>
        <span class="summary-value">${money(config.totalPool)}</span>
      </div>

      <div class="summary-card">
        <span class="summary-label">Recurring prizes</span>
        <span class="summary-value">${money(config.recurring.totalPot)}</span>
      </div>
    </div>

    <div style="margin-top:16px">
      <div class="prize-line">
        <span>Overall</span>
        <strong>${overallPayouts}</strong>
      </div>

      <div class="prize-line">
        <span>Each period</span>
        <strong>${periodPayouts}</strong>
      </div>

      <div class="prize-line">
        <span>Period pot</span>
        <strong>${money(config.recurring.potPerPeriod)}</strong>
      </div>
    </div>

    <p class="period-note">
      10 competitions: GW1–4 through GW33–36, followed by the GW37–38 Final Sprint.
      Tied prize positions are combined and split equally.
    </p>
  `;

  renderReview();
}

function renderReview() {
  if (!activeLeague || !activePrizeConfig) {
    createPanel.hidden = true;
    return;
  }

  review.innerHTML = `
    <div class="review-box">
      <div class="review-title">${escapeHtml(activeLeague.league.name)}</div>

      <div class="review-meta">
        ${activeLeague.managerCount} managers ·
        ${money(activePrizeConfig.entryFee)} each ·
        ${money(activePrizeConfig.totalPool)} total pool
      </div>
    </div>
  `;

  createPanel.hidden = false;
}

async function calculatePrizes() {
  if (!activeLeague) {
    return;
  }

  clearStatus(prizeStatus);
  clearStatus(createStatus);

  const entryFee = Number(entryFeeInput.value);

  if (!Number.isFinite(entryFee) || entryFee < 0) {
    activePrizeConfig = null;
    createPanel.hidden = true;

    setStatus(
      prizeStatus,
      'Enter a valid entry fee.',
      'error'
    );

    return;
  }

  try {
    setStatus(
      prizeStatus,
      'Calculating prize structure…',
      'loading'
    );

    const data = await api({
      action: 'calculatePrizes',
      managerCount: activeLeague.managerCount,
      entryFee
    });

    if (!data.ok) {
      throw new Error(
        data.message || 'Could not calculate prizes.'
      );
    }

    clearStatus(prizeStatus);
    renderPrizeConfig(data);

  } catch (error) {
    activePrizeConfig = null;
    prizeResult.innerHTML = '';
    createPanel.hidden = true;

    setStatus(
      prizeStatus,
      error.message,
      'error'
    );
  }
}

function gameweekLabel(gameweek) {
  if (!gameweek || !gameweek.current) {
    return '—';
  }

  if (gameweek.showUpcoming && gameweek.next) {
    return `GW${gameweek.next}`;
  }

  return `GW${gameweek.current}`;
}

function gameweekStatusLabel(gameweek) {
  if (!gameweek) {
    return 'Unknown';
  }

  if (gameweek.isLive) {
    return 'Live';
  }

  if (gameweek.showUpcoming && gameweek.next) {
    return 'Upcoming';
  }

  if (gameweek.status === 'finished') {
    return 'Complete';
  }

  if (gameweek.status === 'upcoming') {
    return 'Upcoming';
  }

  return 'Current';
}

function renderPeriodStandings(data) {
  const period = data.currentPeriod;

  if (!period) {
    currentPeriodTitle.textContent = 'Period standings';
    currentPeriodMeta.textContent = '';

    currentPeriodStandings.innerHTML = `
      <div class="empty-state">
        No active competition period is available.
      </div>
    `;
    return;
  }

  currentPeriodTitle.textContent =
    `${period.name} · ${period.label}`;

  const statusText =
    period.isComplete
      ? 'Final standings'
      : (
          period.scoredThroughGameweek
            ? `Scored through GW${period.scoredThroughGameweek}`
            : 'No scores recorded yet'
        );

  currentPeriodMeta.textContent =
    `${money(period.pot)} pot · ${statusText}`;

  const standings =
    period.standings || [];

  if (!standings.length) {
    currentPeriodStandings.innerHTML = `
      <div class="empty-state">
        This competition has not started scoring yet.
      </div>
    `;
    return;
  }

  currentPeriodStandings.innerHTML =
    standings.map(row => {
      const prizeText =
        Number(row.prize) > 0
          ? (
              period.isComplete
                ? money(row.prize)
                : `${money(row.prize)} projected`
            )
          : '';

      return `
        <div class="score-row">
          <div class="score-place">
            ${row.place ? escapeHtml(row.place) : '—'}
          </div>

          <div>
            <div class="team-name">${escapeHtml(row.teamName)}</div>
            <div class="manager-name">${escapeHtml(row.managerName)}</div>
          </div>

          <div class="score-value">
            <strong>${escapeHtml(row.score)} pts</strong>
            ${prizeText ? `<span class="prize-projection">${escapeHtml(prizeText)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
}

function renderCurrentGameweek(data) {
  const gameweek = data.gameweek || {};
  const managers = data.managers || [];
  const gwNumber = gameweek.current;

  currentGwTitle.textContent =
    gwNumber
      ? `GW${gwNumber} scores`
      : 'Latest scores';

  let meta = gameweekStatusLabel(gameweek);

  if (gameweek.showUpcoming && gameweek.next && gameweek.nextDeadline) {
    meta +=
      ` · GW${gameweek.next} deadline ${formatDateTime(gameweek.nextDeadline)}`;
  }

  currentGwMeta.textContent = meta;

  const rows =
    managers.filter(manager =>
      manager.currentGameweek
    );

  if (!rows.length) {
    currentGwStandings.innerHTML = `
      <div class="empty-state">
        Current gameweek scores are not available yet.
      </div>
    `;
    return;
  }

  const sorted =
    [...rows].sort(
      (a, b) =>
        b.currentGameweek.netPoints -
        a.currentGameweek.netPoints
    );

  currentGwStandings.innerHTML =
    sorted.map((manager, index) => {
      const gw = manager.currentGameweek;
      const chip = formatChip(gw.activeChip);

      return `
        <div class="score-row">
          <div class="score-place">${index + 1}</div>

          <div>
            <div class="team-name">
              ${escapeHtml(manager.teamName)}
              ${chip ? `<span class="chip-badge">${escapeHtml(chip)}</span>` : ''}
            </div>
            <div class="score-secondary">
              ${escapeHtml(manager.managerName)}
              · ${escapeHtml(gw.grossPoints)} gross
              ${gw.hitCost ? ` · -${escapeHtml(gw.hitCost)} hit` : ''}
            </div>
          </div>

          <div class="score-value">
            <strong>${escapeHtml(gw.netPoints)} pts</strong>
          </div>
        </div>
      `;
    }).join('');
}

function renderOverallStandings(data) {
  const managers = data.managers || [];

  trackerManagerCount.textContent =
    `${managers.length} managers`;

  trackerManagers.innerHTML =
    managers.map((manager, index) => `
      <div class="tracker-manager-row">
        <div class="score-place">
          ${manager.leagueRank || (index + 1)}
        </div>

        <div>
          <div class="team-name">${escapeHtml(manager.teamName)}</div>
          <div class="manager-name">${escapeHtml(manager.managerName)}</div>
        </div>

        <div class="manager-points">
          ${escapeHtml(manager.overallPoints)} pts
        </div>
      </div>
    `).join('');
}

function renderSavedTracker(data) {
  const managers = data.managers || [];
  const prizes = data.prizes || {};
  const overall = prizes.overall || {};
  const recurring = prizes.recurring || {};
  const periods = recurring.periods || [];
  const gameweek = data.gameweek || {};
  const period = data.currentPeriod;

  activeTrackerKey = data.leagueKey;

  const badgeStatus =
    gameweek.isLive
      ? 'live'
      : (
          gameweek.showUpcoming ||
          gameweek.status === 'upcoming'
            ? 'upcoming'
            : 'active'
        );

  trackerStatusBadge.className =
    `status-badge ${badgeStatus}`;

  trackerStatusBadge.textContent =
    gameweekStatusLabel(gameweek);

  trackerKeyLabel.textContent =
    `Tracker ${data.leagueKey}`;

  trackerLeagueName.textContent =
    data.league.name;

  trackerSubtitle.textContent =
    period
      ? `${period.name} · ${period.label}`
      : 'Season-long competition tracker';

  document.title =
    `${data.league.name} · Baruc`;

  trackerSummary.innerHTML = `
    <div class="summary-card">
      <span class="summary-label">Gameweek</span>
      <span class="summary-value">${escapeHtml(gameweekLabel(gameweek))}</span>
    </div>

    <div class="summary-card">
      <span class="summary-label">Current period</span>
      <span class="summary-value">${period ? escapeHtml(period.name) : '—'}</span>
    </div>

    <div class="summary-card">
      <span class="summary-label">Prize pool</span>
      <span class="summary-value">${money(prizes.totalPool)}</span>
    </div>

    <div class="summary-card">
      <span class="summary-label">Managers</span>
      <span class="summary-value">${escapeHtml(managers.length)}</span>
    </div>
  `;

  renderPeriodStandings(data);
  renderCurrentGameweek(data);
  renderOverallStandings(data);

  const overallPayouts =
    (overall.payouts || [])
      .map(money)
      .join(' / ');

  const recurringPayouts =
    (recurring.payoutsPerPeriod || [])
      .map(money)
      .join(' / ');

  trackerPrizes.innerHTML = `
    <div class="prize-line">
      <span>Entry per manager</span>
      <strong>${money(prizes.entryFee)}</strong>
    </div>

    <div class="prize-line">
      <span>Overall pot</span>
      <strong>${money(overall.pot)}</strong>
    </div>

    <div class="prize-line">
      <span>Overall payouts</span>
      <strong>${overallPayouts || '—'}</strong>
    </div>

    <div class="prize-line">
      <span>Recurring total</span>
      <strong>${money(recurring.totalPot)}</strong>
    </div>

    <div class="prize-line">
      <span>Each period</span>
      <strong>${money(recurring.potPerPeriod)}</strong>
    </div>

    <div class="prize-line">
      <span>Period payouts</span>
      <strong>${recurringPayouts || '—'}</strong>
    </div>
  `;

  const currentPeriodId =
    period ? Number(period.id) : null;

  trackerPeriods.innerHTML =
    periods.map(item => `
      <div class="period-row ${Number(item.id) === currentPeriodId ? 'current' : ''}">
        <div>
          <div class="period-name">${escapeHtml(item.name)}</div>
          <div class="period-label">${escapeHtml(item.label)}</div>
        </div>

        <div class="period-money">
          <div class="period-pot">${money(item.pot)}</div>
          <div class="period-payout">
            ${(item.payouts || []).map(money).join(' / ')}
          </div>
        </div>
      </div>
    `).join('');

  shareUrlInput.value =
    trackerUrl(data.leagueKey);

  dataUpdated.textContent =
    data.dataUpdatedAt
      ? `Data updated ${formatDateTime(data.dataUpdatedAt)}`
      : '';

  trackerLoading.hidden = true;
  trackerError.hidden = true;
  trackerContent.hidden = false;
}

async function loadTrackerData(leagueKey) {
  showTrackerShell();

  activeTrackerKey = leagueKey;

  if (
    leagueKey === '__invalid__' ||
    !/^[a-z0-9]{8}$/.test(String(leagueKey || ''))
  ) {
    trackerLoading.hidden = true;
    trackerError.hidden = false;
    trackerErrorMessage.textContent =
      'That Baruc tracker link is not valid.';
    return;
  }

  refreshButton.disabled = true;

  try {
    const data = await api({
      action: 'getTrackerData',
      leagueKey
    });

    if (!data.ok) {
      throw new Error(
        data.message || 'Tracker not found.'
      );
    }

    renderSavedTracker(data);

  } catch (error) {
    trackerLoading.hidden = true;
    trackerContent.hidden = true;
    trackerError.hidden = false;
    trackerErrorMessage.textContent =
      error.message;

  } finally {
    refreshButton.disabled = false;
  }
}

async function routeApp() {
  const leagueKey = getLeagueKeyFromUrl();

  if (leagueKey) {
    await loadTrackerData(leagueKey);
  } else {
    showSetupView();
  }
}

leagueForm.addEventListener('submit', async event => {
  event.preventDefault();

  const leagueId =
    leagueIdInput.value.trim();

  if (!/^\d+$/.test(leagueId)) {
    setStatus(
      leagueStatus,
      'Enter a valid numeric FPL league ID.',
      'error'
    );
    return;
  }

  findButton.disabled = true;

  activeLeague = null;
  activePrizeConfig = null;

  leagueResult.hidden = true;
  prizePanel.hidden = true;
  createPanel.hidden = true;

  setStatus(
    leagueStatus,
    'Finding your FPL league…',
    'loading'
  );

  try {
    const data = await api({
      action: 'previewLeague',
      leagueId
    });

    if (!data.ok) {
      throw new Error(
        data.message || 'Could not load that FPL league.'
      );
    }

    activeLeague = data;

    setStatus(
      leagueStatus,
      `${data.league.name} found — ${data.managerCount} managers.`,
      'success'
    );

    renderLeaguePreview(data);

    prizePanel.hidden = false;

    await calculatePrizes();

  } catch (error) {
    setStatus(
      leagueStatus,
      error.message,
      'error'
    );

  } finally {
    findButton.disabled = false;
  }
});

entryFeeInput.addEventListener('input', () => {
  clearTimeout(prizeTimer);

  prizeTimer = setTimeout(
    calculatePrizes,
    250
  );
});

createButton.addEventListener('click', async () => {
  if (!activeLeague || !activePrizeConfig) {
    setStatus(
      createStatus,
      'Find a league and configure the prize pool first.',
      'error'
    );
    return;
  }

  createButton.disabled = true;
  createButton.textContent = 'Creating tracker…';

  setStatus(
    createStatus,
    'Saving your Baruc tracker…',
    'loading'
  );

  try {
    const data = await api({
      action: 'createLeague',
      leagueId: activeLeague.league.id,
      entryFee: activePrizeConfig.entryFee
    });

    if (!data.ok) {
      throw new Error(
        data.message || 'Could not create the tracker.'
      );
    }

    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('league', data.leagueKey);

    window.history.pushState(
      {},
      '',
      url
    );

    await loadTrackerData(
      data.leagueKey
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  } catch (error) {
    setStatus(
      createStatus,
      error.message,
      'error'
    );

    createButton.disabled = false;
    createButton.textContent = 'Create tracker';
  }
});

refreshButton.addEventListener('click', async () => {
  if (!activeTrackerKey) {
    return;
  }

  refreshButton.disabled = true;
  refreshButton.textContent = 'Refreshing…';

  await loadTrackerData(
    activeTrackerKey
  );

  refreshButton.textContent = 'Refresh';
  refreshButton.disabled = false;
});

copyLinkButton.addEventListener('click', async () => {
  copyStatus.textContent = '';

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        shareUrlInput.value
      );
    } else {
      shareUrlInput.focus();
      shareUrlInput.select();
      document.execCommand('copy');
    }

    copyStatus.textContent =
      'Link copied.';

  } catch (error) {
    shareUrlInput.focus();
    shareUrlInput.select();

    copyStatus.textContent =
      'Select the link and copy it.';
  }
});

newTrackerButton.addEventListener(
  'click',
  resetSetupForNewTracker
);

trackerErrorHome.addEventListener(
  'click',
  resetSetupForNewTracker
);

window.addEventListener(
  'popstate',
  routeApp
);

routeApp();
