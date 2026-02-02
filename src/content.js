// PostHog/Zetta Debugger - Content Script
// Loads external inject.js into page context to bypass CSP

(function() {
  'use strict';

  // Inject external script file (bypasses CSP)
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from page context
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'posthog-debugger-page') return;

    const { type, data } = event.data;
    switch (type) {
      case 'capture':
        chrome.runtime.sendMessage({
          type: 'posthog-event',
          data: data
        });
        break;

      case 'identify':
        chrome.runtime.sendMessage({
          type: 'posthog-identify',
          data: data
        });
        break;

      case 'setPersonProperties':
        chrome.runtime.sendMessage({
          type: 'posthog-user-properties',
          data: data
        });
        break;

      case 'reset':
        chrome.runtime.sendMessage({
          type: 'posthog-reset',
          data: data
        });
        break;

      case 'init-state':
        chrome.runtime.sendMessage({
          type: 'posthog-init-state',
          data: data
        });
        break;
    }
  });

})();
