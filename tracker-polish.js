(() => {
  function compactGameweekRanges(root) {
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      node.nodeValue = String(node.nodeValue || '').replace(
        /\bGW(\d+)[–-]\1\b/g,
        'GW$1'
      );
    }
  }

  function tidyPrizeSummary() {
    const container = document.getElementById('tracker-prizes');
    if (!container) return;

    const lines = [...container.querySelectorAll('.prize-line')];
    const byLabel = new Map(
      lines.map(line => [
        line.querySelector('span')?.textContent.trim(),
        line
      ])
    );

    const periodPot = byLabel.get('Each remaining period');
    const periodPayouts = byLabel.get('Remaining period payouts');

    if (!periodPot || !periodPayouts) return;

    const potValue = periodPot.querySelector('strong')?.textContent.trim();
    const payoutValue = periodPayouts.querySelector('strong')?.textContent.trim();

    if (potValue && payoutValue && potValue === payoutValue) {
      periodPayouts.hidden = true;
      return;
    }

    periodPayouts.hidden = false;
    const label = periodPayouts.querySelector('span');
    if (label) label.textContent = 'Payout split per period';
  }

  function tidyPeriodCards() {
    document.querySelectorAll('#tracker-periods .period-row').forEach(row => {
      compactGameweekRanges(row);

      const pot = row.querySelector('.period-pot');
      const payout = row.querySelector('.period-payout');

      if (!pot || !payout) return;

      const potValue = pot.textContent.trim();
      const payoutValue = payout.textContent.trim();

      payout.hidden = Boolean(
        potValue &&
        payoutValue &&
        potValue === payoutValue
      );
    });
  }

  function tidyOrganiserPanel() {
    const panel = document.getElementById('participant-admin');
    if (!panel) return;

    const summary = panel.querySelector('details > summary');
    const intro = panel.querySelector('details > .section-copy');
    const button = panel.querySelector('#organiser-open');

    if (summary) summary.textContent = 'Manage tracker';
    if (intro) {
      intro.textContent = 'Enter your private organiser code to check for new league members. Prize settings stay locked after creation.';
    }
    if (button) button.textContent = 'Check for new participants';
  }

  function applyTrackerPolish() {
    compactGameweekRanges(document.getElementById('tracker-subtitle'));
    compactGameweekRanges(document.getElementById('current-period-title'));
    compactGameweekRanges(document.getElementById('prize-result'));
    compactGameweekRanges(document.getElementById('review'));
    tidyPrizeSummary();
    tidyPeriodCards();
    tidyOrganiserPanel();
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;

    queueMicrotask(() => {
      scheduled = false;
      applyTrackerPolish();
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  applyTrackerPolish();
})();
