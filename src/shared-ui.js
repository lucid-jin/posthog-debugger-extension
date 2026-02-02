// PostHog Debugger - Shared UI Module
// Used by both panel.js (DevTools) and popup.js (Popup)

(function() {
  'use strict';

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getEventIconClass(event) {
    const name = event.eventName?.toLowerCase() || '';
    if (name.includes('identify')) return 'identify';
    if (name.includes('reset')) return 'reset';
    return 'capture';
  }

  function renderJsonTree(obj, depth) {
    if (depth === undefined) depth = 0;
    if (obj === null) return '<span class="json-null">null</span>';
    if (obj === undefined) return '<span class="json-null">undefined</span>';

    var type = typeof obj;

    if (type === 'string') {
      return '<span class="json-string">"' + escapeHtml(obj) + '"</span>';
    }
    if (type === 'number') {
      return '<span class="json-number">' + obj + '</span>';
    }
    if (type === 'boolean') {
      return '<span class="json-boolean">' + obj + '</span>';
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '<span class="json-bracket">[]</span>';
      }
      var items = obj.map(function(item, i) {
        return '<div><span class="json-key">' + i + '</span>: ' + renderJsonTree(item, depth + 1) + '</div>';
      }).join('');
      return '<span class="json-expandable expanded"><span class="json-bracket">[</span></span>' +
        '<div class="json-children" style="display: block;">' + items + '</div>' +
        '<span class="json-bracket">]</span>';
    }

    if (type === 'object') {
      var keys = Object.keys(obj);
      if (keys.length === 0) {
        return '<span class="json-bracket">{}</span>';
      }
      var objItems = keys.map(function(key) {
        return '<div><span class="json-key">"' + escapeHtml(key) + '"</span>: ' + renderJsonTree(obj[key], depth + 1) + '</div>';
      }).join('');
      var expanded = depth < 2 ? 'expanded' : '';
      var displayStyle = depth < 2 ? 'display: block;' : '';
      return '<span class="json-expandable ' + expanded + '"><span class="json-bracket">{</span></span>' +
        '<div class="json-children" style="' + displayStyle + '">' + objItems + '</div>' +
        '<span class="json-bracket">}</span>';
    }

    return String(obj);
  }

  function renderEventList(ctx) {
    var events = ctx.events;
    var searchQuery = ctx.searchQuery;
    var selectedEventId = ctx.selectedEventId;
    var eventListEl = ctx.eventListEl;
    var emptyStateEl = ctx.emptyStateEl;
    var eventCountEl = ctx.eventCountEl;
    var onSelectEvent = ctx.onSelectEvent;

    var filteredEvents = events.filter(function(event) {
      if (!searchQuery) return true;
      var eventName = (event.eventName || '').toLowerCase();
      var props = JSON.stringify(event.properties || {}).toLowerCase();
      return eventName.includes(searchQuery) || props.includes(searchQuery);
    });

    eventCountEl.textContent = filteredEvents.length + ' event' + (filteredEvents.length !== 1 ? 's' : '');

    if (filteredEvents.length === 0) {
      emptyStateEl.style.display = 'flex';
      eventListEl.querySelectorAll('.event-item').forEach(function(el) { el.remove(); });
      return;
    }

    emptyStateEl.style.display = 'none';
    eventListEl.querySelectorAll('.event-item').forEach(function(el) { el.remove(); });

    var reversed = filteredEvents.slice().reverse();

    reversed.forEach(function(event) {
      var item = document.createElement('div');
      item.className = 'event-item' + (event.id === selectedEventId ? ' selected' : '');
      item.dataset.id = event.id;

      var iconClass = getEventIconClass(event);
      var time = formatTime(event.timestamp);
      var propCount = Object.keys(event.properties || {}).length;

      item.innerHTML =
        '<div class="event-icon ' + iconClass + '"></div>' +
        '<div class="event-info">' +
          '<div class="event-name">' + escapeHtml(event.eventName || 'Unknown Event') + '</div>' +
          '<div class="event-meta">' + propCount + ' properties</div>' +
        '</div>' +
        '<div class="event-time">' + time + '</div>';

      item.addEventListener('click', function() {
        onSelectEvent(event);
      });

      eventListEl.appendChild(item);
    });
  }

  function selectEvent(event, eventListEl, renderDetailFn) {
    eventListEl.querySelectorAll('.event-item').forEach(function(el) {
      el.classList.toggle('selected', el.dataset.id === event.id);
    });
    renderDetailFn(event);
  }

  function renderEventDetail(event, eventDetailEl) {
    if (!event) {
      eventDetailEl.innerHTML =
        '<div class="detail-placeholder">' +
          '<p>Select an event to view details</p>' +
        '</div>';
      return;
    }

    var html =
      '<div class="detail-section">' +
        '<div class="detail-section-header">' +
          'Event Info' +
          '<button class="copy-btn" onclick="copyToClipboard(' + escapeHtml(JSON.stringify(JSON.stringify(event))) + ')">Copy All</button>' +
        '</div>' +
        '<div class="detail-row">' +
          '<span class="detail-key">Event Name</span>' +
          '<span class="detail-value string">"' + escapeHtml(event.eventName || '') + '"</span>' +
        '</div>' +
        '<div class="detail-row">' +
          '<span class="detail-key">Timestamp</span>' +
          '<span class="detail-value number">' + new Date(event.timestamp).toLocaleString() + '</span>' +
        '</div>' +
        '<div class="detail-row">' +
          '<span class="detail-key">Distinct ID</span>' +
          '<span class="detail-value string">"' + escapeHtml(event.distinctId || 'N/A') + '"</span>' +
        '</div>' +
        '<div class="detail-row">' +
          '<span class="detail-key">Session ID</span>' +
          '<span class="detail-value string">"' + escapeHtml(event.sessionId || 'N/A') + '"</span>' +
        '</div>' +
        '<div class="detail-row">' +
          '<span class="detail-key">URL</span>' +
          '<span class="detail-value string">"' + escapeHtml(event.url || '') + '"</span>' +
        '</div>' +
      '</div>' +
      '<div class="detail-section">' +
        '<div class="detail-section-header">Properties</div>' +
        '<div class="json-tree">' +
          renderJsonTree(event.properties || {}) +
        '</div>' +
      '</div>';

    if (event.options) {
      html +=
        '<div class="detail-section">' +
          '<div class="detail-section-header">Options</div>' +
          '<div class="json-tree">' +
            renderJsonTree(event.options) +
          '</div>' +
        '</div>';
    }

    eventDetailEl.innerHTML = html;

    eventDetailEl.querySelectorAll('.json-expandable').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.target.classList.toggle('expanded');
      });
    });
  }

  function renderUserData(userData, userDataEl) {
    if (!userData || !userData.distinctId) {
      userDataEl.innerHTML =
        '<div class="empty-state">' +
          '<p>No user identified yet.</p>' +
          '<p class="hint">User data will appear after posthog.identify() is called.</p>' +
        '</div>';
      return;
    }

    var initial = (userData.distinctId || 'U').charAt(0).toUpperCase();
    var props = userData.properties || {};

    var html =
      '<div class="user-card">' +
        '<div class="user-card-header">' +
          '<div class="user-avatar">' + initial + '</div>' +
          '<div class="user-info">' +
            '<h3>' + escapeHtml(userData.distinctId) + '</h3>' +
            '<p>Identified at ' + new Date(userData.timestamp).toLocaleString() + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="detail-section">' +
          '<div class="detail-section-header">User Properties</div>' +
          '<div class="json-tree">' +
            renderJsonTree(props) +
          '</div>' +
        '</div>';

    if (userData.propertiesSetOnce && Object.keys(userData.propertiesSetOnce).length > 0) {
      html +=
        '<div class="detail-section">' +
          '<div class="detail-section-header">Properties Set Once</div>' +
          '<div class="json-tree">' +
            renderJsonTree(userData.propertiesSetOnce) +
          '</div>' +
        '</div>';
    }

    html += '</div>';
    userDataEl.innerHTML = html;

    userDataEl.querySelectorAll('.json-expandable').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.target.classList.toggle('expanded');
      });
    });
  }

  function updateStatus(message, lastUpdateEl) {
    lastUpdateEl.textContent = message;
  }

  function setupTabSwitching(doc) {
    var tabs = doc.querySelectorAll('.tab');
    var tabContents = doc.querySelectorAll('.tab-content');

    tabs.forEach(function(tab) {
      tab.addEventListener('click', function() {
        var targetTab = tab.dataset.tab;
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tabContents.forEach(function(tc) { tc.classList.remove('active'); });
        tab.classList.add('active');
        doc.getElementById(targetTab + 'Tab').classList.add('active');
      });
    });
  }

  function setupCopyToClipboard(updateStatusFn) {
    window.copyToClipboard = function(text) {
      navigator.clipboard.writeText(text).then(function() {
        updateStatusFn('Copied to clipboard');
      }).catch(function() {
        updateStatusFn('Failed to copy');
      });
    };
  }

  // Export
  window.PostHogDebuggerUI = {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    getEventIconClass: getEventIconClass,
    renderJsonTree: renderJsonTree,
    renderEventList: renderEventList,
    selectEvent: selectEvent,
    renderEventDetail: renderEventDetail,
    renderUserData: renderUserData,
    updateStatus: updateStatus,
    setupTabSwitching: setupTabSwitching,
    setupCopyToClipboard: setupCopyToClipboard
  };
})();
