(function () {
  const originalRenderSavedTracker =
    window.renderSavedTracker;

  if (typeof originalRenderSavedTracker !== 'function') {
    return;
  }

  function managerNames(rows) {
    const seen = new Set();

    return (rows || [])
      .map(row =>
        row.managerName ||
        row.teamName ||
        `Manager ${row.managerId}`
      )
      .filter(name => {
        const key = String(name);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  function joinNames(names) {
    if (!names.length) {
      return '';
    }

    if (names.length === 1) {
      return names[0];
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }

    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  function getWarningElement() {
    let warning =
      document.getElementById('tracker-data-warning');

    if (warning) {
      return warning;
    }

    const summary =
      document.getElementById('tracker-summary');

    if (!summary || !summary.parentNode) {
      return null;
    }

    warning = document.createElement('div');
    warning.id = 'tracker-data-warning';
    warning.className = 'tracker-data-warning';
    warning.hidden = true;

    summary.parentNode.insertBefore(
      warning,
      summary
    );

    return warning;
  }

  function renderCoverageWarning(data) {
    const warning = getWarningElement();

    if (!warning) {
      return;
    }

    const coverage =
      data && data.coverage
        ? data.coverage
        : null;

    if (!coverage || coverage.complete !== false) {
      warning.hidden = true;
      warning.textContent = '';
      return;
    }

    const incompleteManagers =
      managerNames([
        ...(coverage.missingPeriodManagers || []),
        ...(coverage.missingCurrentGameweekManagers || [])
      ]);

    const managerText =
      incompleteManagers.length
        ? ` for ${joinNames(incompleteManagers)}`
        : '';

    warning.innerHTML = `
      <strong>FPL data incomplete${escapeHtml(managerText)}.</strong>
      <span>
        The tracker is showing the data currently available. Standings and
        prize positions remain provisional until the missing scores are available.
      </span>
    `;

    warning.hidden = false;

    if (coverage.periodComplete === false) {
      const periodMeta =
        document.getElementById('current-period-meta');

      if (periodMeta) {
        periodMeta.textContent =
          periodMeta.textContent
            .replace('Final standings', 'Results incomplete');

        if (!periodMeta.textContent.includes('Data incomplete')) {
          periodMeta.textContent += ' · Data incomplete';
        }
      }

      document
        .querySelectorAll('#current-period-standings .prize-projection')
        .forEach(el => {
          el.hidden = true;
        });
    }

    if (coverage.currentGameweekComplete === false) {
      const gameweekMeta =
        document.getElementById('current-gw-meta');

      if (
        gameweekMeta &&
        !gameweekMeta.textContent.includes('Data incomplete')
      ) {
        gameweekMeta.textContent += ' · Data incomplete';
      }
    }
  }

  window.renderSavedTracker = function (data) {
    originalRenderSavedTracker(data);
    renderCoverageWarning(data);
  };
})();
