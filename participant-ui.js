/* Participant setup and private organiser controls. No credentials in share URLs. */
window.ParticipantUI = (() => {
  let setupChoices = null;
  let setupBusy = false;
  let adminToken = '';
  let tokenLeague = '';
  let adminVersion = 0;

  const esc = value => escapeHtml(value);
  function choiceFields(manager, choice, allowSelect) {
    const id = manager.managerId;
    return `<fieldset class="participant-entry" data-manager-id="${id}">
      <legend>${esc(manager.teamName)} <span>${esc(manager.managerName)}</span></legend>
      ${allowSelect ? `<label class="participant-check"><input type="checkbox" data-field="selected"> Admit this participant</label>` : ''}
      <label class="participant-check"><input type="checkbox" data-field="moneyEligible" ${choice.moneyEligible ? 'checked' : ''}> Plays for money</label>
      <details><summary>Scoring history</summary><label>Scoring history<select data-field="startMode">
        <option value="backfill" ${choice.startMode === 'backfill' ? 'selected' : ''}>Use available season history</option>
        <option value="zero" ${choice.startMode === 'zero' ? 'selected' : ''}>Start from zero at a gameweek</option>
      </select></label>
      <label data-start-label ${choice.startMode !== 'zero' ? 'hidden' : ''}>Start gameweek
        <input type="number" min="${Number(manager.teamStartGw) || 1}" max="38" step="1" data-field="startGw" value="${choice.startGw}">
      </label>
      <p class="section-copy">This FPL team started in GW${Number(manager.teamStartGw) || 1}. Choose a later week to start their Baruc score from zero.</p></details>
    </fieldset>`;
  }
  function readChoices(container, selectedOnly) {
    return [...container.querySelectorAll('[data-manager-id]')]
      .filter(row => !selectedOnly || row.querySelector('[data-field="selected"]').checked)
      .map(row => ({ managerId: Number(row.dataset.managerId),
        moneyEligible: row.querySelector('[data-field="moneyEligible"]').checked,
        startMode: row.querySelector('[data-field="startMode"]').value,
        startGw: Number(row.querySelector('[data-field="startGw"]').value) }));
  }
  function updateStartVisibility(container) {
    container.querySelectorAll('[data-manager-id]').forEach(row => {
      row.querySelector('[data-start-label]').hidden = row.querySelector('[data-field="startMode"]').value !== 'zero';
    });
  }
  function invalidatePreview() {
    prizeRequestVersion += 1;
    clearTimeout(prizeTimer);
    activePrizeConfig = null;
    prizeCalculationPending = true;
    createPanel.hidden = true;
    prizeResult.innerHTML = '';
    review.innerHTML = '';
    prizeTimer = setTimeout(calculatePrizes, 250);
  }
  function renderSetup(data) {
    setupChoices = null;
    if (!data.participantPolicyVersion) return;
    setupChoices = data.managers.map(m => ({ managerId: m.managerId, moneyEligible: true,
      startMode: 'backfill', startGw: Math.max(m.teamStartGw || 1, data.suggestedStartGw || 1) }));
    const panel = document.createElement('div');
    panel.id = 'participant-setup';
    panel.innerHTML = `<h3>Participant rules</h3><p class="section-copy">Everyone appears in standings. Only money entrants fund the pool and can win cash prizes.</p>` +
      data.managers.map((m, i) => choiceFields(m, setupChoices[i], false)).join('');
    document.getElementById('setup-managers').replaceChildren(panel);
    panel.addEventListener('input', () => {
      updateStartVisibility(panel);
      setupChoices = readChoices(panel, false);
      invalidatePreview();
    });
    setBusy(false);
  }
  function choices() {
    const panel = document.getElementById('participant-setup');
    return setupChoices && panel ? readChoices(panel, false).map(c => ({ ...c,
      moneyEligible: SetupUI.mode() === 'fun' ? false : SetupUI.mode() === 'money' ? true : c.moneyEligible })) : null;
  }
  function moneyCount() { const rows = choices(); return rows ? rows.filter(c => c.moneyEligible).length : undefined; }
  function valid() {
    return !setupChoices || setupChoices.every(c => c.startMode === 'backfill' ||
      (Number.isInteger(c.startGw) && c.startGw >= 1 && c.startGw <= 38));
  }
  function setBusy(value) {
    setupBusy = value;
    document.querySelectorAll('#participant-setup fieldset').forEach(fieldset => { fieldset.disabled = value; });
  }
  function rememberAccess(data) {
    if (data.adminToken) { adminToken = data.adminToken; tokenLeague = data.leagueKey; }
  }
  function reset() { setupChoices = null; setBusy(false); adminVersion += 1; }
  function prizePreview(prizes) {
    return `<div class="review-box"><p>${prizes.moneyManagerCount} money entrants · ${esc(money(prizes.totalPool))} total pool</p>
      <p>Overall prizes: ${prizes.overall.payouts.map(money).map(esc).join(' / ') || 'No cash prizes'}</p>
      <p>Each remaining period: ${prizes.recurring.payoutsPerPeriod.map(money).map(esc).join(' / ') || 'No cash prizes'}</p></div>`;
  }
  function renderTracker(data) {
    adminVersion += 1;
    let panel = document.getElementById('participant-admin');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'participant-admin'; panel.className = 'panel';
      document.getElementById('tracker-content').appendChild(panel);
    }
    panel.hidden = !data.participantPolicyVersion || data.season?.isCurrent === false;
    if (panel.hidden) return;
    const version = adminVersion;
    const key = data.leagueKey;
    if (key !== tokenLeague) { adminToken = ''; tokenLeague = key; }
    panel.innerHTML = `<details><summary>Organiser: admit participants</summary>
      <p class="section-copy">Use your private organiser code. The public tracker link cannot change participants.</p>
      <label>Organiser code<input id="organiser-code" type="password" autocomplete="off" spellcheck="false"></label>
      <button id="organiser-open" type="button">Find new participants</button>
      <p id="organiser-status" class="section-copy" role="status"></p><div id="organiser-candidates"></div></details>`;
    const input = panel.querySelector('#organiser-code');
    input.value = adminToken;
    if (adminToken) {
      panel.querySelector('details').open = true;
      let reminder = document.getElementById('organiser-save-reminder');
      if (!reminder) {
        reminder = document.createElement('p'); reminder.id = 'organiser-save-reminder'; reminder.className = 'setup-tip';
        reminder.innerHTML = 'Your tracker is locked. <a href="#participant-admin">Save your private organiser code</a> before closing this page. Share only the viewer link above.';
        document.querySelector('.share-box').after(reminder);
      }
      const note = document.createElement('p'); note.className = 'section-copy';
      note.textContent = 'Save this organiser code privately. It will not be included in your shared tracker link.';
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy organiser code';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(input.value); copy.textContent = 'Code copied'; }
        catch { input.type = 'text'; input.select(); copy.textContent = 'Select and copy the code'; }
      });
      input.parentElement.after(note, copy);
    }
    const status = panel.querySelector('#organiser-status');
    const container = panel.querySelector('#organiser-candidates');
    const button = panel.querySelector('#organiser-open');
    button.addEventListener('click', async () => {
      button.disabled = true; status.textContent = 'Checking FPL membership…'; container.innerHTML = '';
      adminToken = input.value.trim();
      try {
        const result = await apiPost({ action: 'getParticipantAdmin', leagueKey: key, adminToken });
        if (version !== adminVersion) return;
        if (!result.ok) throw new Error(result.message);
        if (!result.candidates.length) { status.textContent = 'No new FPL members to admit.'; return; }
        status.textContent = 'Choose the new participants and their entry rules.';
        container.innerHTML = result.candidates.map(m => choiceFields(m, { moneyEligible: false,
          startMode: 'backfill', startGw: Math.max(m.teamStartGw || 1, result.suggestedStartGw || 1) }, true)).join('') +
          '<button id="admission-preview" type="button">Review entry and prizes</button><div id="admission-review"></div>';
        let previewVersion = 0;
        const reviewEl = container.querySelector('#admission-review');
        container.addEventListener('input', () => { updateStartVisibility(container); previewVersion += 1; reviewEl.innerHTML = ''; });
        const previewButton = container.querySelector('#admission-preview');
        previewButton.addEventListener('click', async () => {
          const request = ++previewVersion;
          const participants = readChoices(container, true);
          reviewEl.innerHTML = ''; previewButton.disabled = true;
          try {
            const proposal = await apiPost({ action: 'previewParticipantAdmission', leagueKey: key,
              adminToken, revision: result.revision, participants });
            if (version !== adminVersion || request !== previewVersion) return;
            if (!proposal.ok) throw new Error(proposal.message);
            reviewEl.innerHTML = prizePreview(proposal.prizes) +
              `<p>${proposal.preservedPeriodCount} completed competitions keep their payouts. Additional entries: ${esc(money(proposal.additionalEntryTotal))}.</p><button type="button" id="admission-save">Admit selected participants</button>`;
            reviewEl.querySelector('#admission-save').addEventListener('click', async () => {
              if (request !== previewVersion) return;
              container.querySelectorAll('button,input,select').forEach(el => { el.disabled = true; });
              try {
                const saved = await apiPost({ action: 'addParticipants', leagueKey: key, adminToken,
                  revision: result.revision, participants, previewFingerprint: proposal.previewFingerprint });
                if (version !== adminVersion) return;
                if (!saved.ok) throw new Error(saved.message);
                await loadTrackerData(key);
              } catch (error) {
                status.textContent = error.message;
                container.querySelectorAll('button,input,select').forEach(el => { el.disabled = false; });
                reviewEl.innerHTML = ''; previewVersion += 1;
              }
            });
          } catch (error) { if (version === adminVersion && request === previewVersion) status.textContent = error.message; }
          finally { previewButton.disabled = false; }
        });
      } catch (error) { if (version === adminVersion) status.textContent = error.message; }
      finally { button.disabled = false; }
    });
  }
  return { renderSetup, choices, moneyCount, valid, setBusy, rememberAccess, reset, renderTracker, invalidatePreview };
})();
