/* Paid setup: one open step, immutable reviewed rules, no writes until create. */
window.SetupUI = (() => {
  const el = id => document.getElementById(id);
  let stage = 1, plan = 'overall', startGw = 1, supported = false;
  function fee() { return Number(el('entry-fee').value); }
  function validFee() { return Number.isInteger(fee()) && fee() >= 5 && fee() <= 10000 && fee() % 5 === 0; }
  function periodCount() { return startGw <= 36 ? 10 - Math.floor((startGw - 1) / 4) : 1; }
  function minimumFee() { return Math.max(5, Math.ceil(periodCount() / Math.max(1,(activeLeague?.managerCount || 2)-1))*5); }
  function options() { return {model:'paid',version:2,competition:plan,startGw}; }
  function choices() { return (activeLeague?.managers || []).map(m => ({managerId:Number(m.managerId),moneyEligible:true,startMode:'zero',startGw})); }
  function show(value, scroll = true) {
    stage = value;
    document.querySelector('#setup-view .hero').hidden = value > 1;
    el('find-panel').hidden = value !== 1;
    el('fee-panel').hidden = value !== 2;
    el('prize-panel').hidden = value !== 3;
    el('create-panel').hidden = value !== 4 || !activePrizeConfig;
    summaries();
    if (value === 4) renderReview();
    if (scroll) el(value === 1 ? 'find-panel' : value === 2 ? 'fee-panel' : value === 3 ? 'prize-panel' : 'create-panel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function summaries() {
    const items = [];
    if (stage > 1 && activeLeague) items.push([1,'League',activeLeague.league.name + ' · ' + activeLeague.managerCount + ' entrants']);
    if (stage > 2) items.push([2,'Entry',money(fee()) + ' each · ' + money(fee()*activeLeague.managerCount) + ' pool']);
    if (stage > 3) items.push([3,'Prizes',plan === 'both' ? 'Manager of the Month + overall' : 'Overall winner']);
    el('setup-summaries').innerHTML = items.map(([step,title,value]) =>
      '<div class="setup-completed"><div><strong>'+title+'</strong><span>'+escapeHtml(value)+'</span></div><button type="button" class="text-button" data-change="'+step+'">Change '+title.toLowerCase()+'</button></div>').join('');
    el('setup-summaries').querySelectorAll('[data-change]').forEach(button => button.addEventListener('click',() => {
      el('lock-confirm').checked = false; show(Number(button.dataset.change));
    }));
  }
  function sync() {
    const n = activeLeague?.managerCount || 0, total = fee()*n, count = periodCount();
    document.querySelectorAll('[data-fee]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.fee === el('entry-fee').value)));
    document.querySelectorAll('[data-plan]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.plan === plan)));
    el('pool-summary').textContent = validFee() ? n+' entrants × '+money(fee())+' = '+money(total)+' prize pool' : 'Choose £5 or more, in £5 increments.';
    el('fee-next').disabled = !validFee() || !supported;
    el('start-summary').textContent = supported ? 'Everyone starts from zero in GW'+startGw+'. Earlier FPL points do not count.' : 'The simplified setup needs the planned backend update before creating a tracker.';
    el('overall-card').textContent = validFee() ? money(total)+' to the overall winner' : '';
    const monthly = Math.floor((total-fee())/count/5)*5;
    el('monthly-card').textContent = validFee() && fee() >= minimumFee() ? money(monthly)+' per period + '+money(total-monthly*count)+' overall' : 'Available from '+money(minimumFee())+' per entrant';
    el('unlock-monthly').hidden = fee() >= minimumFee();
    el('unlock-monthly').textContent = 'Use '+money(minimumFee())+' each and add monthly prizes';
    el('prizes-next').disabled = !activePrizeConfig || prizeCalculationPending;
  }
  function changed() {
    el('lock-confirm').checked = false;
    ParticipantUI.invalidatePreview();
    sync();
  }
  function decoratePreview(config) {
    startGw = config.setupRules.startGw;
    sync();
    const first = config.recurring.periods[0];
    el('prize-result').innerHTML =
      '<div class="setup-tip"><strong>Overall winner: '+money(config.overall.pot)+'</strong>'+
      (plan === 'both' ? '<p>'+config.recurring.periodCount+' awards of '+money(config.recurring.potPerPeriod)+' · one winner per period</p>' : '<p>The entire pool goes to the overall winner.</p>')+
      '<p>Everyone starts at zero in GW'+startGw+'.'+(plan === 'both' && first ? ' First award: '+escapeHtml(first.label)+'.' : '')+'</p></div>'+
      '<p class="section-copy">Prizes are allocated in £5 increments. Tied winners share the prize equally, which can produce smaller amounts and pennies.</p>';
  }
  function reviewDetails() {
    return '<div class="setup-review-detail"><p><strong>'+ (plan === 'both' ? 'Manager of the Month + overall' : 'Overall winner') +'</strong></p>'+
      '<p>Overall winner: '+money(activePrizeConfig.overall.pot)+'</p>'+
      (plan === 'both' ? '<p>'+activePrizeConfig.recurring.periodCount+' period awards of '+money(activePrizeConfig.recurring.potPerPeriod)+'. First award: '+escapeHtml(activePrizeConfig.recurring.periods[0].label)+'.</p>' : '')+
      '<p>All '+activeLeague.managerCount+' entrants start at zero in GW'+startGw+'. No earlier points are included.</p>'+
      '<p>After creation, save your private organiser code. Share only the viewer link.</p></div>';
  }
  document.querySelectorAll('[data-fee]').forEach(b => b.addEventListener('click',() => {
    if (b.dataset.fee === 'custom') { el('entry-fee').focus(); el('entry-fee').select(); return; }
    el('entry-fee').value = b.dataset.fee; changed();
  }));
  document.querySelectorAll('[data-plan]').forEach(b => b.addEventListener('click',() => {plan=b.dataset.plan; changed();}));
  el('unlock-monthly').addEventListener('click',() => {el('entry-fee').value=minimumFee();plan='both';changed();summaries();});
  el('entry-fee').addEventListener('input',() => {el('lock-confirm').checked=false;sync();});
  el('fee-next').addEventListener('click',() => {if(validFee() && supported) show(3);});
  el('prizes-next').addEventListener('click',() => {if(activePrizeConfig && !prizeCalculationPending) show(4);});
  el('review-back').addEventListener('click',() => {el('lock-confirm').checked=false;show(3);});
  return {options,fee,choices,mode:()=> 'money',stage:()=>stage,supported:()=>supported,
    onLeague(data) {supported=data.setupRulesVersion===2;startGw=Number(data.paidStartGw || 1);plan='overall';sync();show(2);},
    decoratePreview,reviewDetails,
    renderTracker(data) {document.getElementById('forfeit-banner')?.remove();},
    reset() {stage=1;plan='overall';startGw=1;supported=false;el('lock-confirm').checked=false;
      document.querySelector('#setup-view .hero').hidden=false;
      document.querySelectorAll('#setup-view button,#setup-view input').forEach(e=>{e.disabled=false;});
      el('setup-summaries').innerHTML='';el('find-panel').hidden=false;el('fee-panel').hidden=true;el('prize-panel').hidden=true;el('create-panel').hidden=true;},
    setBusy(value) {document.querySelectorAll('#setup-view button,#setup-view input').forEach(e=>{e.disabled=value;});if(!value)sync();}
  };
})();
