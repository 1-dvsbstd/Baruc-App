(function () {
  const originalRenderSavedTracker =
    window.renderSavedTracker;

  if (typeof originalRenderSavedTracker !== 'function') {
    return;
  }

  window.renderSavedTracker = function (data) {
    originalRenderSavedTracker(data);

    const season =
      data && data.season
        ? data.season
        : null;

    if (!season || !season.label) {
      return;
    }

    const subtitle =
      document.getElementById('tracker-subtitle');

    if (
      subtitle &&
      !subtitle.textContent.startsWith(season.label)
    ) {
      subtitle.textContent =
        `${season.label} · ${subtitle.textContent}`;
    }

    if (season.isCurrent === false) {
      const badge =
        document.getElementById('tracker-status-badge');

      if (badge) {
        badge.className = 'status-badge active';
        badge.textContent = 'Archive';
      }
    }
  };
})();
