/* Guided setup. No write occurs until the reviewed configuration is locked. */
window.SetupUI = (() => {
  const el = id => document.getElementById(id);
  let mode = 'money', template = 'default', stage = 1, supported = false;
  const tips = {
    both: 'Monthly prizes give everyone a fresh chance and help keep the whole league engaged throughout the year. The overall prize rewards season-long consistency.',
    monthly: 'A fresh chance each period helps keep everyone engaged, even if they fall behind overall.',
    overall: 'Reward consistency across the full season, with as many winning places as your pool comfortably supports.',
    winner: 'One champion, one prize. A simple, bigger reward — but fewer chances for managers further down the table.'
  };
  function changed() {
    el('lock-confirm').checked = false;
    if (activeLeague) ParticipantUI.invalidatePreview();
  }
  function showStage(value, scroll = true) {
    stage = value;
    el('playing-panel').hidden = value !== 2;
    el('prize-panel').hidden = value !== 3;
    el('create-panel').hidden = value !== 4 || !activePrizeConfig;
    if (value === 4) renderReview();
    const target = value === 2 ? 'playing-panel' : value === 3 ? 'prize-panel' : 'create-panel';
    if (scroll) el(target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function sync() {
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    document.querySelectorAll('[data-template]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.template === template)));
    el('playing-tip').textContent = mode === 'fun' ? 'No entry fee and no cash prizes. Follow the standings, enjoy the rivalries and add an optional forfeit.' :
      mode === 'both' ? 'Tick the managers playing for money below. Everyone else joins for fun and can never take a cash prize.' : 'Every manager contributes to the pool. Choose Both if some managers are joining for fun.';
    el('manager-choices').open = mode === 'both';
    el('playing-next').textContent = mode === 'fun' ? 'Review your tracker' : 'Continue to prizes';
    const competition = el('competition-choice').value;
    el('competition-tip').textContent = tips[competition] + (['monthly','both'].includes(competition) ? ' Baruc uses nine four-gameweek periods and a final two-gameweek sprint, rather than calendar months.' : '');
    el('custom-prizes').hidden = template !== 'custom';
    el('overall-controls').hidden = ['monthly','winner'].includes(competition);
    el('monthly-controls').hidden = ['overall','winner'].includes(competition);
    el('allocation-control').hidden = competition !== 'both';
    el('monthly-percent-label').textContent = el('monthly-percent').value + '%';
    document.querySelectorAll('#participant-setup [data-field="moneyEligible"]').forEach(input => {
      input.disabled = mode !== 'both';
      if (mode !== 'both') input.checked = mode === 'money';
    });
    document.querySelectorAll('[data-fee]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fee === el('entry-fee').value)));
  }
  function options() {
    const competition = el('competition-choice').value;
    const rules = { playMode: mode, template, competition,
      monthlyPercent: Number(el('monthly-percent').value),
      forfeits: { overall: el('forfeit-overall').value.trim(), monthly: el('forfeit-monthly').value.trim() } };
    if (template === 'custom' && mode !== 'fun') {
      function ratio(kind) {
        const places = Number(el(kind + '-places').value);
        const value = el(kind + '-ratio').value.split(':').map(v => Number(v.trim()));
        if (!Number.isInteger(places) || places < 1 || value.length !== places || value.some(v => !Number.isInteger(v) || v < 1)) {
          throw new Error('Enter one positive whole-number ratio for each ' + kind + ' winning place.');
        }
        return value;
      }
      if (!['monthly','winner'].includes(competition)) rules.overallRatio = ratio('overall');
      if (!['overall','winner'].includes(competition)) rules.periodRatio = ratio('monthly');
    }
    return rules;
  }
  function fee() { return mode === 'fun' ? 0 : Number(el('entry-fee').value); }
  function onLeague(data) {
    supported = data.setupRulesVersion === 1;
    sync(); showStage(2, false);
    if (!supported) {
      el('playing-tip').textContent = 'The new setup is awaiting the planned backend update. You can browse the options, but creation is unavailable until that update is deployed.';
    }
  }
  function decoratePreview(config) {
    const notes = (config.recommendations || []).map(n => `<p class="setup-warning">${escapeHtml(n)}</p>`).join('');
    const overall = config.overall.payouts || [];
    const monthly = config.recurring.payoutsPerPeriod || [];
    const chart = (values) => values.length ? '<div class="ratio-bars" aria-hidden="true">' + values.map(v => `<span style="flex:${Number(v)}"></span>`).join('') + '</div>' : '';
    el('prize-result').insertAdjacentHTML('beforeend', chart(overall) + notes);
    if (template === 'default') {
      el('overall-places').value = Math.max(1, overall.length);
      el('monthly-places').value = Math.max(1, monthly.length);
      el('overall-ratio').value = (config.overall.ratio || [1]).join(':');
      el('monthly-ratio').value = (config.recurring.ratio || [1]).join(':');
      if (config.totalPool > 0 && config.recurring.totalPot > 0 && config.overall.pot > 0) {
        el('monthly-percent').value = Math.max(1, Math.min(99, Math.round(config.recurring.totalPot / config.totalPool * 100)));
      }
    }
  }
  function reviewDetails() {
    const rules = activePrizeConfig.setupRules || options();
    const names = (ParticipantUI.choices() || []).filter(m => m.moneyEligible).map(c => {
      const manager = activeLeague.managers.find(m => Number(m.managerId) === c.managerId);
      return manager ? manager.managerName + ' (' + manager.teamName + ')' : c.managerId;
    });
    return `<div class="setup-review-detail"><p><strong>${mode === 'fun' ? 'Playing for fun' : mode === 'both' ? 'Money + fun' : 'Playing for money'}</strong></p>
      ${names.length ? `<p>Cash entrants: ${escapeHtml(names.join(', '))}</p>` : '<p>Everyone plays for fun. No cash is collected or awarded.</p>'}
      <p>Overall prizes: ${activePrizeConfig.overall.payouts.map(money).join(' / ') || 'None'}<br>Monthly prizes per period: ${activePrizeConfig.recurring.payoutsPerPeriod.map(money).join(' / ') || 'None'}</p>
      <p>Overall last-place forfeit: ${escapeHtml(rules.forfeits.overall || 'None')}<br>Monthly last-place forfeit: ${escapeHtml(rules.forfeits.monthly || 'None')}</p>
      <p>Scoring: ${(ParticipantUI.choices() || []).filter(m => m.startMode === 'zero').map(m => {
        const manager = activeLeague.managers.find(v => Number(v.managerId) === m.managerId);
        return escapeHtml(manager?.teamName || m.managerId) + ' starts from zero in GW' + m.startGw;
      }).join('; ') || 'Available season history for everyone'}.</p>
      <p>Keep your private organiser code after creation. It allows new admissions; it does not unlock these prize rules.</p></div>`;
  }
  function renderTracker(data) {
    document.getElementById('forfeit-banner')?.remove();
    const forfeits = data.prizes?.setupRules?.forfeits;
    if (!forfeits || (!forfeits.overall && !forfeits.monthly)) return;
    const banner = document.createElement('aside'); banner.id = 'forfeit-banner'; banner.className = 'forfeit-banner';
    const parts = [];
    if (forfeits.overall) parts.push('Overall last place: ' + forfeits.overall);
    if (forfeits.monthly) parts.push('Each period’s last place: ' + forfeits.monthly);
    banner.textContent = parts.join(' • ');
    document.querySelector('.tracker-hero').appendChild(banner);
  }
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; sync(); changed(); }));
  document.querySelectorAll('[data-template]').forEach(b => b.addEventListener('click', () => { template = b.dataset.template; sync(); changed(); }));
  document.querySelectorAll('[data-fee]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.fee === 'custom') { el('entry-fee').focus(); el('entry-fee').select(); return; }
    el('entry-fee').value = b.dataset.fee; sync(); changed();
  }));
  ['competition-choice','monthly-percent','overall-ratio','monthly-ratio','forfeit-overall','forfeit-monthly'].forEach(id => el(id).addEventListener('input', () => { sync(); changed(); }));
  ['overall','monthly'].forEach(kind => el(kind + '-places').addEventListener('input', () => {
    const n = Number(el(kind + '-places').value);
    if (Number.isInteger(n) && n > 0 && n <= 50) el(kind + '-ratio').value = (n === 2 ? [3,1] : n === 3 ? [5,3,1] : Array.from({length:n}, (_,i) => n-i)).join(':');
    changed();
  }));
  el('playing-next').addEventListener('click', async () => {
    if (mode === 'fun') { await calculatePrizes(); if (activePrizeConfig) showStage(4); }
    else showStage(3);
  });
  el('prizes-next').addEventListener('click', () => { if (activePrizeConfig && !prizeCalculationPending) showStage(4); });
  el('prizes-back').addEventListener('click', () => showStage(2));
  el('review-back').addEventListener('click', () => { el('lock-confirm').checked = false; showStage(mode === 'fun' ? 2 : 3); });
  el('entry-fee').addEventListener('input', sync);
  return { options, fee, mode: () => mode, stage: () => stage, supported: () => supported,
    onLeague, decoratePreview, reviewDetails, renderTracker,
    reset() { mode = 'money'; template = 'default'; stage = 1; supported = false;
      document.querySelectorAll('#setup-view button, #setup-view input, #setup-view select').forEach(e => { e.disabled = false; });
      el('playing-panel').hidden = true; el('prize-panel').hidden = true; el('create-panel').hidden = true;
      el('forfeit-overall').value = ''; el('forfeit-monthly').value = ''; el('competition-choice').value = 'both'; el('lock-confirm').checked = false; sync(); },
    setBusy(value) { document.querySelectorAll('#setup-view button, #setup-view input, #setup-view select').forEach(e => { e.disabled = value; }); if (!value) sync(); }
  };
})();
