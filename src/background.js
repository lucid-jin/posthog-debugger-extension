// PostHog/Zetta Debugger - Background Service Worker

const POSTHOG_ENDPOINTS = [
  'ingestion.zetta.so',
  'app.posthog.com',
  'us.posthog.com',
  'eu.posthog.com',
  'posthog.com'
];

// Store events per tab
const tabEvents = new Map();
const tabUserData = new Map();

// Connection to devtools panels and popups (multiple consumers per tab)
const devtoolsConnections = new Map(); // Map<tabId, Set<Port>>

// Broadcast message to all consumers for a given tab
function broadcastToTab(tabId, message) {
  const ports = devtoolsConnections.get(tabId);
  if (!ports) return;
  for (const port of ports) {
    try {
      port.postMessage(message);
    } catch (e) {
      ports.delete(port);
      if (ports.size === 0) {
        devtoolsConnections.delete(tabId);
      }
    }
  }
}

// Listen for connections from devtools panel or popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'posthog-debugger') return;

  port.onMessage.addListener((msg) => {
    if (msg.type === 'init') {
      // Register this port for the tab (supports multiple consumers)
      if (!devtoolsConnections.has(msg.tabId)) {
        devtoolsConnections.set(msg.tabId, new Set());
      }
      devtoolsConnections.get(msg.tabId).add(port);

      // Send existing events for this tab
      const events = tabEvents.get(msg.tabId) || [];
      const userData = tabUserData.get(msg.tabId) || null;

      port.postMessage({
        type: 'init-data',
        events,
        userData
      });
    }

    if (msg.type === 'clear') {
      tabEvents.set(msg.tabId, []);
      tabUserData.set(msg.tabId, null);

      // Notify other consumers that events were cleared
      const ports = devtoolsConnections.get(msg.tabId);
      if (ports) {
        for (const p of ports) {
          if (p !== port) {
            try {
              p.postMessage({ type: 'clear-all' });
            } catch (e) {
              ports.delete(p);
            }
          }
        }
        if (ports.size === 0) {
          devtoolsConnections.delete(msg.tabId);
        }
      }
    }
  });

  port.onDisconnect.addListener(() => {
    for (const [tabId, ports] of devtoolsConnections.entries()) {
      if (ports.has(port)) {
        ports.delete(port);
        if (ports.size === 0) {
          devtoolsConnections.delete(tabId);
        }
        break;
      }
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'posthog-event' && sender.tab) {
    const tabId = sender.tab.id;

    // Store event
    if (!tabEvents.has(tabId)) {
      tabEvents.set(tabId, []);
    }

    const eventData = {
      ...message.data,
      timestamp: message.data.timestamp || Date.now(),
      id: message.data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    tabEvents.get(tabId).push(eventData);

    // Keep only last 500 events
    const events = tabEvents.get(tabId);
    if (events.length > 500) {
      tabEvents.set(tabId, events.slice(-500));
    }

    // Forward to all consumers
    broadcastToTab(tabId, {
      type: 'new-event',
      event: eventData
    });
  }

  if (message.type === 'posthog-identify' && sender.tab) {
    const tabId = sender.tab.id;

    tabUserData.set(tabId, {
      ...message.data,
      timestamp: Date.now()
    });

    broadcastToTab(tabId, {
      type: 'user-update',
      userData: tabUserData.get(tabId)
    });
  }

  if (message.type === 'posthog-user-properties' && sender.tab) {
    const tabId = sender.tab.id;
    const existing = tabUserData.get(tabId) || {};

    tabUserData.set(tabId, {
      ...existing,
      distinctId: message.data.distinctId || existing.distinctId,
      properties: {
        ...(existing.properties || {}),
        ...(message.data.properties || {})
      },
      propertiesSetOnce: {
        ...(existing.propertiesSetOnce || {}),
        ...(message.data.propertiesSetOnce || {})
      },
      timestamp: Date.now()
    });

    broadcastToTab(tabId, {
      type: 'user-update',
      userData: tabUserData.get(tabId)
    });
  }

  return true;
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabEvents.delete(tabId);
  tabUserData.delete(tabId);
  devtoolsConnections.delete(tabId);
});

// Clean up on navigation
chrome.webNavigation?.onBeforeNavigate?.addListener((details) => {
  if (details.frameId === 0) {
    // Main frame navigation - optionally clear events
    // Uncomment if you want to clear on navigation:
    // tabEvents.set(details.tabId, []);
    // tabUserData.set(details.tabId, null);
  }
});

// Open independent window on toolbar icon click
chrome.action.onClicked.addListener(async (tab) => {
  const width = 800;
  const height = 600;

  // Pass the source tab ID via URL hash so popup.js can read it
  const popupUrl = chrome.runtime.getURL('src/popup.html') + '#tabId=' + tab.id;

  chrome.windows.create({
    url: popupUrl,
    type: 'normal',
    width: 900,
    height: 700,
    focused: true
  });
});
