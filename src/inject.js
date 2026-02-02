// PostHog/Zetta Debugger - Network Intercept with LZ decompression
(function() {
  'use strict';

  const POSTHOG_ENDPOINTS = [
    'ingestion.zetta.so',
    'app.posthog.com',
    'us.posthog.com',
    'eu.posthog.com'
  ];

  // LZ-String decompression (from lz-string library)
  const LZString = (function() {
    const keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    const baseReverseDic = {};

    function getBaseValue(alphabet, character) {
      if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (let i = 0; i < alphabet.length; i++) {
          baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
      }
      return baseReverseDic[alphabet][character];
    }

    function _decompress(length, resetValue, getNextValue) {
      const dictionary = [];
      let enlargeIn = 4;
      let dictSize = 4;
      let numBits = 3;
      let entry = "";
      const result = [];
      let w;
      let bits = 0;
      let maxpower = Math.pow(2, 2);
      let power = 1;
      let c;
      let data = { val: getNextValue(0), position: resetValue, index: 1 };

      for (let i = 0; i < 3; i++) {
        dictionary[i] = i;
      }

      while (power != maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      const next = bits;
      switch (next) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power != maxpower) {
            const resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = String.fromCharCode(bits);
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power != maxpower) {
            const resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = String.fromCharCode(bits);
          break;
        case 2:
          return "";
      }
      dictionary[3] = c;
      w = c;
      result.push(c);

      while (true) {
        if (data.index > length) {
          return "";
        }

        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
          const resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch (c = bits) {
          case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
              const resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = String.fromCharCode(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
              const resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = String.fromCharCode(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 2:
            return result.join('');
        }

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }

        if (dictionary[c]) {
          entry = dictionary[c];
        } else {
          if (c === dictSize) {
            entry = w + w.charAt(0);
          } else {
            return null;
          }
        }
        result.push(entry);

        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }

        w = entry;
      }
    }

    return {
      decompressFromBase64: function(input) {
        if (input == null) return "";
        if (input == "") return null;
        return _decompress(input.length, 32, function(index) {
          return getBaseValue(keyStrBase64, input.charAt(index));
        });
      }
    };
  })();

  function isPostHogRequest(url) {
    return POSTHOG_ENDPOINTS.some(endpoint => url.includes(endpoint));
  }

  function sendToExtension(type, data) {
    window.postMessage({
      source: 'posthog-debugger-page',
      type: type,
      data: data
    }, '*');
  }

  async function parsePostHogData(url, body) {
    try {
      let parsed;
      let bodyStr = body;

      // Handle Blob (gzip compression)
      if (body instanceof Blob) {
        try {
          const arrayBuffer = await body.arrayBuffer();

          // Decompress using browser's DecompressionStream API
          if (url.includes('compression=gzip')) {
            try {
              const ds = new DecompressionStream('gzip');
              const decompressedStream = new Response(arrayBuffer).body.pipeThrough(ds);
              const decompressed = await new Response(decompressedStream).arrayBuffer();
              bodyStr = new TextDecoder().decode(decompressed);
            } catch (e) {
              bodyStr = new TextDecoder().decode(arrayBuffer);
            }
          } else {
            bodyStr = new TextDecoder().decode(arrayBuffer);
          }
        } catch (e) {
          return { blobError: e.message };
        }
      }

      // Convert to string if needed
      if (typeof bodyStr !== 'string') {
        try {
          bodyStr = new TextDecoder().decode(bodyStr);
        } catch {
          bodyStr = String(bodyStr);
        }
      }

      // Check if URL has compression parameter
      const hasLZCompression = url.includes('compression=lz64');
      const hasGzipCompression = url.includes('compression=gzip');

      // Try JSON first (no compression)
      try {
        parsed = JSON.parse(bodyStr);
        return parsed;
      } catch {
        // Not plain JSON
      }

      // Try LZ decompression
      if (hasLZCompression || !hasGzipCompression) {
        try {
          const decompressed = LZString.decompressFromBase64(bodyStr);
          if (decompressed) {
            parsed = JSON.parse(decompressed);
            return parsed;
          }
        } catch (e) {
          // LZ decompression failed
        }
      }

      // Try base64 decode
      try {
        const decoded = atob(bodyStr);
        parsed = JSON.parse(decoded);
        return parsed;
      } catch {
        // Not base64
      }

      // Return raw if all else fails
      return { raw: bodyStr.substring(0, 500), compressed: true };
    } catch (e) {
      return { parseError: e.message };
    }
  }

  function sendPersonProperties(item) {
    if (item.$set || item.$set_once) {
      sendToExtension('setPersonProperties', {
        distinctId: item.$distinct_id || item.distinct_id || item.properties?.$distinct_id,
        properties: item.$set || {},
        propertiesSetOnce: item.$set_once || {}
      });
    }
  }

  function extractEvents(data, url) {
    const events = [];
    const pageUrl = window.location.href;

    if (!data || data.raw || data.parseError || data.blob || data.blobError) {
      return events;
    }

    // Handle batch endpoint
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.event) {
          const evt = {
            eventName: item.event,
            properties: item.properties || {},
            distinctId: item.properties?.$distinct_id || item.distinct_id,
            timestamp: item.timestamp || Date.now(),
            url: pageUrl,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          events.push(evt);
        }
        sendPersonProperties(item);
      });
    }
    // Handle single event
    else if (data?.event) {
      events.push({
        eventName: data.event,
        properties: data.properties || {},
        distinctId: data.properties?.$distinct_id || data.distinct_id,
        timestamp: data.timestamp || Date.now(),
        url: pageUrl
      });
      sendPersonProperties(data);
    }
    // Handle identify
    else if (data?.$set || url.includes('/identify') || url.includes('/engage')) {
      sendToExtension('identify', {
        distinctId: data.$distinct_id || data.distinct_id,
        properties: data.$set || {},
        propertiesSetOnce: data.$set_once || {},
        url: pageUrl
      });
    }
    // Handle batch with multiple events
    else if (data?.batch) {
      data.batch.forEach(item => {
        if (item.event) {
          events.push({
            eventName: item.event,
            properties: item.properties || {},
            distinctId: item.properties?.$distinct_id || item.distinct_id,
            timestamp: item.timestamp || Date.now(),
            url: pageUrl
          });
        }
        sendPersonProperties(item);
      });
    }

    return events;
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';

    if (isPostHogRequest(url)) {
      try {
        let body = init?.body;
        if (body) {
          const parsed = await parsePostHogData(url, body);
          const events = extractEvents(parsed, url);

          events.forEach(event => {
            sendToExtension('capture', event);
          });
        }
      } catch (e) {
        // Parse error - silently ignore
      }
    }

    return originalFetch.apply(this, arguments);
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._posthogUrl = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._posthogUrl && isPostHogRequest(this._posthogUrl)) {
      if (body) {
        // Parse async but don't block send
        (async () => {
          try {
            const parsed = await parsePostHogData(this._posthogUrl, body);
            const events = extractEvents(parsed, this._posthogUrl);

            events.forEach(event => {
              sendToExtension('capture', event);
            });
          } catch (e) {
            // Parse error - silently ignore
          }
        })();
      }
    }

    return originalXHRSend.apply(this, arguments);
  };

  // Intercept sendBeacon
  const originalSendBeacon = navigator.sendBeacon;
  if (originalSendBeacon) {
    navigator.sendBeacon = function(url, data) {
      if (isPostHogRequest(url)) {
        if (data) {
          // Parse async but don't block sendBeacon
          (async () => {
            try {
              const parsed = await parsePostHogData(url, data);
              const events = extractEvents(parsed, url);

              events.forEach(event => {
                sendToExtension('capture', event);
              });
            } catch (e) {
              // Parse error - silently ignore
            }
          })();
        }
      }

      return originalSendBeacon.apply(this, arguments);
    };
  }
})();
