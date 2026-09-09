(function () {
  const originalRenderSavedTracker =
    window.renderSavedTracker;

  if (typeof originalRenderSavedTracker !== 'function') {
    return;
  }

  function escape(value) {
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

  function placeLabel(place) {
    const value = Number(place) || 0;

    if (value === 1) return '1st';
    if (value === 2) return '2nd';
    if (value === 3) return '3rd';

    return value ? `${value}th` : 'Prize';
  }

  function getPanel() {
    let panel =
      document.getElementById('tracker-history-panel');

    if (panel) {
      return panel;
    }

    const prizes =
      document.getElementById('tracker-prizes');

    const prizePanel =
      prizes && prizes.closest
        ? prizes.closest('.panel')
        : null;

    if (!prizePanel || !prizePanel.parentNode) {
      return null;
    }

    panel = document.createElement('section');
    panel.id = 'tracker-history-panel';
    panel.className = 'panel';
    panel.hidden = true;

    panel.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="eyebrow">COMPLETED COMPETITIONS</span>
          <h2>Period winners</h2>
          <p class="section-copy">
            Final results appear here after FPL has data-checked every gameweek in the period.
          </p>
        </div>
      </div>

      <div id="tracker-period-history" class="history-period-list"></div>

      <div class="history-winnings-heading">
        <span class="eyebrow">RECURRING WINNINGS</span>
        <h3>Prize money won</h3>
      </div>

      <div id="tracker-recurring-winnings" class="history-winnings-list"></div>
    `;

    prizePanel.parentNode.insertBefore(
      panel,
      prizePanel
    );

    return panel;
  }

  function renderAwards(period) {
    const awards =
      Array.isArray(period.awards)
        ? period.awards
        : [];

    if (!awards.length) {
      return '<span class="history-empty">No payout recorded</span>';
    }

    return awards.map(award => `
      <div class="history-award">
        <span class="history-award-place">${escape(placeLabel(award.place))}</span>
        <span class="history-award-name">${escape(award.managerName || award.teamName)}</span>
        <strong>${escape(money(award.prize))}</strong>
      </div>
    `).join('');
  }

  function renderPeriodHistory(data) {
    const panel = getPanel();

    if (!panel) {
      return;
    }

    const periods =
      Array.isArray(data && data.periodHistory)
        ? data.periodHistory
        : [];

    const winnings =
      data && data.winnings &&
      Array.isArray(data.winnings.managers)
        ? data.winnings.managers
        : [];

    if (!periods.length) {
      panel.hidden = true;
      return;
    }

    const historyEl =
      document.getElementById('tracker-period-history');

    const winningsEl =
      document.getElementById('tracker-recurring-winnings');

    if (historyEl) {
      historyEl.innerHTML = periods.map(period => `
        <div class="history-period-row">
          <div class="history-period-title">
            <div class="period-name">${escape(period.name)}</div>
            <div class="period-label">${escape(period.label)}</div>
          </div>

          <div class="history-awards">
            ${renderAwards(period)}
          </div>
        </div>
      `).join('');
    }

    if (winningsEl) {
      winningsEl.innerHTML = winnings.map(row => `
        <div class="history-winnings-row">
          <div class="score-place">${escape(row.place || '—')}</div>

          <div>
            <div class="team-name">${escape(row.teamName)}</div>
            <div class="manager-name">${escape(row.managerName)}</div>
          </div>

          <div class="history-winnings-value">
            ${escape(money(row.recurringWinnings))}
          </div>
        </div>
      `).join('');
    }

    panel.hidden = false;
  }

  window.renderSavedTracker = function (data) {
    originalRenderSavedTracker(data);
    renderPeriodHistory(data);
  };
})();
