// PostHog Debugger - Popup Mode
// Uses shared-ui.js for rendering, chrome.tabs.query for active tab

(function() {
  'use strict';

  var UI = window.PostHogDebuggerUI;

  // State
  var events = [];
  var userData = null;
  var selectedEventId = null;
  var searchQuery = '';

  // DOM Elements
  var eventListEl = document.getElementById('eventList');
  var eventDetailEl = document.getElementById('eventDetail');
  var eventCountEl = document.getElementById('eventCount');
  var searchInput = document.getElementById('searchInput');
  var clearBtn = document.getElementById('clearBtn');
  var emptyStateEl = document.getElementById('emptyState');
  var userDataEl = document.getElementById('userData');
  var lastUpdateEl = document.getElementById('lastUpdate');
  var connectionStatusEl = document.getElementById('connectionStatus');

  // Setup shared UI
  UI.setupTabSwitching(document);
  UI.setupCopyToClipboard(function(msg) { UI.updateStatus(msg, lastUpdateEl); });

  // Get target tab ID from URL hash (set by background.js when opening window)
  // Format: popup.html#tabId=123
  function getTabIdFromHash() {
    var hash = window.location.hash;
    var match = hash.match(/tabId=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  function connect(tabId) {
    var port = chrome.runtime.connect({ name: 'posthog-debugger' });
    port.postMessage({ type: 'init', tabId: tabId });

    // Listen for messages from background
    port.onMessage.addListener(function(msg) {
      switch (msg.type) {
        case 'init-data':
          events = msg.events || [];
          userData = msg.userData || null;
          renderAll();
          UI.updateStatus('Loaded ' + events.length + ' events', lastUpdateEl);
          connectionStatusEl.className = 'status connected';
          connectionStatusEl.textContent = 'Connected';
          break;

        case 'new-event':
          events.push(msg.event);
          renderAll();
          UI.updateStatus('New event: ' + msg.event.eventName, lastUpdateEl);
          break;

        case 'user-update':
          userData = msg.userData;
          UI.renderUserData(userData, userDataEl);
          UI.updateStatus('User data updated', lastUpdateEl);
          break;

        case 'clear-all':
          events = [];
          selectedEventId = null;
          renderAll();
          UI.renderEventDetail(null, eventDetailEl);
          UI.updateStatus('Cleared by another consumer', lastUpdateEl);
          break;
      }
    });

    port.onDisconnect.addListener(function() {
      connectionStatusEl.className = 'status disconnected';
      connectionStatusEl.textContent = 'Disconnected';
    });

    // Search
    searchInput.addEventListener('input', function(e) {
      searchQuery = e.target.value.toLowerCase();
      renderAll();
    });

    // Clear events
    clearBtn.addEventListener('click', function() {
      events = [];
      selectedEventId = null;
      port.postMessage({ type: 'clear', tabId: tabId });
      renderAll();
      UI.renderEventDetail(null, eventDetailEl);
      UI.updateStatus('Cleared', lastUpdateEl);
    });
  }

  // Resolve tab ID: from hash (independent window) or query (fallback)
  var hashTabId = getTabIdFromHash();
  if (hashTabId) {
    connect(hashTabId);
  } else {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
      if (!tabs || tabs.length === 0) {
        UI.updateStatus('No active tab found', lastUpdateEl);
        connectionStatusEl.className = 'status disconnected';
        connectionStatusEl.textContent = 'No tab';
        return;
      }
      connect(tabs[0].id);
    });
  }

  function renderAll() {
    UI.renderEventList({
      events: events,
      searchQuery: searchQuery,
      selectedEventId: selectedEventId,
      eventListEl: eventListEl,
      emptyStateEl: emptyStateEl,
      eventCountEl: eventCountEl,
      onSelectEvent: function(event) {
        selectedEventId = event.id;
        UI.selectEvent(event, eventListEl, function(ev) {
          UI.renderEventDetail(ev, eventDetailEl);
        });
      }
    });
    UI.renderUserData(userData, userDataEl);
  }

  // Initial render
  renderAll();
})();
