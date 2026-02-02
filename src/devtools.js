// Create DevTools panel
chrome.devtools.panels.create(
  'PostHog',
  '',  // No icon
  'src/panel.html',
  () => {}
);
