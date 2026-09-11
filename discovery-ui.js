/* Existing tracker discovery. Activates only when backend 0.11+ supports findTrackers. */
(() => {
  const form = document.getElementById('league-form');
  const findPanel = document.getElementById('find-panel');
  const hero = document.querySelector('#setup-view .hero');
  const summaries = document.getElementById('setup-summaries');

  if (!form || !findPanel || !hero || !summaries) return;

  let enabled = false;
  let mode = 'create';
  let bypassDiscovery = false;
  let homePanel = null;
  let resultsPanel = null;

  function versionAtLeast(version, major, minor) {
    const parts = String(version || '').split('.').map(Number);
    return (parts[0] || 0) > major ||
      ((parts[0] || 0) === major && (parts[1] || 0) >= minor);
  }

  function ensurePanels() {
    if (!homePanel) {
      homePanel = document.createElement('section');
      homePanel.id = 'home-mode-panel';
      homePanel.className = 'panel home-mode-panel';
      homePanel.innerHTML = `
        <div class="step-heading">
          <div>
            <h2>What do you want to do?</h2>
            <p>Create a new Baruc competition or return to one that already exists.</p>
          </div>
        </div>
        <div class="choice-grid two">
          <button id="home-create-tracker" type="button">
            <strong>Create a tracker</strong>
            <span>Set up a new monthly pot and overall prize for an FPL mini-league.</span>
          </button>
          <button id="home-open-tracker" type="button">
            <strong>Open/manage existing tracker</strong>
            <span>Find Baruc trackers already linked to your FPL mini-league.</span>
          </button>
        </div>
      `;
      hero.after(homePanel);

      homePanel.querySelector('#home-create-tracker').addEventListener('click', () => {
        mode = 'create';
        showFinder();
      });

      homePanel.querySelector('#home-open-tracker').addEventListener('click', () => {
        mode = 'open';
        showFinder();
      });
    }

    if (!resultsPanel) {
      resultsPanel = document.createElement('section');
      resultsPanel.id = 'existing-trackers';
      resultsPanel.className = 'panel existing-trackers';
      resultsPanel.hidden = true;
      findPanel.after(resultsPanel);
    }
  }

  function updateFinderCopy() {
    const heading = findPanel.querySelector('.step-heading h2');
    const copy = findPanel.querySelector('.step-heading p');
    const button = document.getElementById('find-button');

    if (mode === 'open') {
      if (heading) heading.textContent = 'Find your existing tracker';
      if (copy) copy.textContent = 'Enter the numeric ID from your FPL classic mini-league.';
      if (button) button.textContent = 'Find trackers';
    } else {
      if (heading) heading.textContent = 'Find your league';
      if (copy) copy.textContent = 'Enter the numeric ID from your FPL classic mini-league.';
      if (button) button.textContent = 'Find league';
    }
  }

  function showHome() {
    ensurePanels();
    homePanel.hidden = false;
    findPanel.hidden = true;
    resultsPanel.hidden = true;
    resultsPanel.innerHTML = '';
    summaries.innerHTML = '';
    document.getElementById('league-status').hidden = true;
    document.getElementById('league-result').hidden = true;
  }

  function showFinder() {
    ensurePanels();
    homePanel.hidden = true;
    resultsPanel.hidden = true;
    resultsPanel.innerHTML = '';
    updateFinderCopy();
    findPanel.hidden = false;
    document.getElementById('league-id').focus();
  }

  function planLabel(tracker) {
    return tracker.competition === 'both'
      ? 'Manager of the Month + overall'
      : 'Overall winner';
  }

  function prizeLabel(tracker) {
    if (tracker.competition === 'both') {
      return `${money(tracker.periodPot)} per period · ${money(tracker.overallPot)} overall`;
    }

    return `${money(tracker.overallPot || tracker.totalPool)} overall`;
  }

  function openTracker(leagueKey, manage) {
    const url = new URL(trackerUrl(leagueKey));
    if (manage) url.searchParams.set('manage', '1');
    window.location.href = url.toString();
  }

  function continueCreateSetup() {
    resultsPanel.hidden = true;
    bypassDiscovery = true;
    form.requestSubmit();
    bypassDiscovery = false;
  }

  function renderTrackers(data) {
    const trackers = Array.isArray(data.trackers) ? data.trackers : [];

    resultsPanel.hidden = false;

    if (!trackers.length) {
      if (mode === 'create') {
        continueCreateSetup();
        return;
      }

      resultsPanel.innerHTML = `
        <div class="section-heading"><div><h2>No Baruc tracker found</h2>
        <p class="section-copy">There is no active Baruc tracker for that FPL league this season.</p></div></div>
        <button id="discovery-create-new" type="button">Create a tracker instead</button>
      `;
      resultsPanel.querySelector('#discovery-create-new').addEventListener('click', () => {
        mode = 'create';
        continueCreateSetup();
      });
      return;
    }

    const cards = trackers.map(tracker => {
      const startText = tracker.startGw ? `Starts GW${Number(tracker.startGw)}` : 'Season tracker';
      return `
        <article class="existing-tracker-card" data-league-key="${escapeHtml(tracker.leagueKey)}">
          <div class="existing-tracker-title">
            <strong>${escapeHtml(tracker.leagueName || 'Baruc tracker')}</strong>
            <span>${money(tracker.entryFee)} each</span>
          </div>
          <div class="existing-tracker-meta">
            ${escapeHtml(planLabel(tracker))} · ${escapeHtml(startText)} ·
            ${escapeHtml(tracker.managerCount)} entrants · ${money(tracker.totalPool)} pool<br>
            ${escapeHtml(prizeLabel(tracker))}
          </div>
          <div class="existing-tracker-actions">
            <button type="button" data-view>View tracker</button>
            <button type="button" class="text-button" data-manage>Manage tracker</button>
          </div>
        </article>
      `;
    }).join('');

    resultsPanel.innerHTML = `
      <div class="section-heading"><div>
        <h2>${trackers.length === 1 ? 'Existing tracker found' : 'Existing trackers found'}</h2>
        <p class="section-copy">Open the tracker, or manage participants with the private organiser code.</p>
      </div></div>
      <div class="existing-trackers-list">${cards}</div>
      ${mode === 'create' ? '<button id="discovery-create-another" class="text-button" type="button">Create another tracker for this league</button>' : ''}
    `;

    resultsPanel.querySelectorAll('[data-league-key]').forEach(card => {
      const key = card.dataset.leagueKey;
      card.querySelector('[data-view]').addEventListener('click', () => openTracker(key, false));
      card.querySelector('[data-manage]').addEventListener('click', () => openTracker(key, true));
    });

    resultsPanel.querySelector('#discovery-create-another')?.addEventListener('click', () => {
      mode = 'create';
      continueCreateSetup();
    });
  }

  async function discover(leagueId) {
    resultsPanel.hidden = false;
    resultsPanel.innerHTML = '<p class="discovery-status">Looking for existing Baruc trackers…</p>';

    const data = await api({ action: 'findTrackers', leagueId });
    if (!data.ok) throw new Error(data.message || 'Could not look up Baruc trackers.');
    renderTrackers(data);
  }

  document.addEventListener('submit', async event => {
    if (!enabled || bypassDiscovery || event.target !== form) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const leagueId = document.getElementById('league-id').value.trim();
    if (!/^\d+$/.test(leagueId)) {
      setStatus(document.getElementById('league-status'), 'Enter a valid numeric FPL league ID.', 'error');
      return;
    }

    const button = document.getElementById('find-button');
    button.disabled = true;

    try {
      clearStatus(document.getElementById('league-status'));
      await discover(leagueId);
    } catch (error) {
      setStatus(document.getElementById('league-status'), error.message, 'error');
      resultsPanel.hidden = true;
    } finally {
      button.disabled = false;
    }
  }, true);

  document.getElementById('new-tracker-button')?.addEventListener('click', () => {
    if (enabled) queueMicrotask(showHome);
  });

  function focusManagePanel() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('manage') !== '1') return false;

    const panel = document.getElementById('participant-admin');
    if (!panel || panel.hidden) return false;

    const details = panel.querySelector('details');
    const input = panel.querySelector('#organiser-code');
    if (details) details.open = true;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    input?.focus();
    return true;
  }

  const manageObserver = new MutationObserver(() => {
    if (focusManagePanel()) manageObserver.disconnect();
  });
  manageObserver.observe(document.body, { childList: true, subtree: true });
  if (focusManagePanel()) manageObserver.disconnect();

  (async () => {
    try {
      const health = await api({ action: 'health' });
      enabled = health.ok === true && versionAtLeast(health.version, 0, 11);
      if (!enabled) return;

      ensurePanels();
      if (!getLeagueKeyFromUrl()) showHome();
    } catch (_) {
      // Leave the existing setup flow untouched if discovery is unavailable.
    }
  })();
})();
