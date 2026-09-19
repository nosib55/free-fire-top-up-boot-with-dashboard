// lib/automation/stealthPatches.ts
// Advanced anti-fingerprint patches for DataDome & modern WAF bypass.
// Inject via page.evaluateOnNewDocument(STEALTH_SCRIPT) before any navigation.

export const STEALTH_SCRIPT = `(function () {
  'use strict';

  // ─── 1. Remove webdriver flag ─────────────────────────────────────────────
  try {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
    });
  } catch {}

  // ─── 2. Fake chrome runtime object (CDP leak fix) ─────────────────────────
  try {
    if (!window.chrome) {
      const chrome = {
        app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
        runtime: {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', GC_PRESSURE: 'gc_pressure', OS_UPDATE: 'os_update' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
          RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
          id: undefined,
          connect: function() {},
          sendMessage: function() {},
        },
        csi: function() {},
        loadTimes: function() { return { commitLoadTime: Date.now() / 1000 - Math.random() * 5, connectionInfo: 'h2', finishDocumentLoadTime: 0, finishLoadTime: 0, firstPaintAfterLoadTime: 0, firstPaintTime: 0, navigationType: 'Other', npnNegotiatedProtocol: 'h3', requestTime: Date.now() / 1000 - Math.random() * 3, startLoadTime: Date.now() / 1000 - Math.random() * 4, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true }; },
      };
      Object.defineProperty(window, 'chrome', { value: chrome, writable: false, enumerable: true, configurable: false });
    }
  } catch {}

  // ─── 3. Permissions API spoof (CDP permissions probe fix) ─────────────────
  try {
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission, onchange: null, addEventListener: ()=>{}, removeEventListener: ()=>{}, dispatchEvent: ()=>false });
      }
      return originalQuery.call(this, parameters);
    };
  } catch {}

  // ─── 4. Navigator plugins spoof ───────────────────────────────────────────
  try {
    const fakePlugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format', suffixes: 'pdf', mimeTypes: [{type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format'}] },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', suffixes: 'pdf', mimeTypes: [{type: 'application/pdf', suffixes: 'pdf', description: ''}] },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '', suffixes: '', mimeTypes: [{type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable'}, {type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable'}] },
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const list = Object.create(PluginArray.prototype);
        fakePlugins.forEach((p, i) => { list[i] = p; });
        list.length = fakePlugins.length;
        list.item = (i) => list[i];
        list.namedItem = (name) => fakePlugins.find(p => p.name === name) || null;
        list.refresh = () => {};
        return list;
      },
      configurable: true,
    });
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const list = Object.create(MimeTypeArray.prototype);
        list.length = 4;
        list.item = (i) => list[i];
        list.namedItem = (name) => null;
        return list;
      },
      configurable: true,
    });
  } catch {}

  // ─── 5. Navigator hardware, platform, languages ───────────────────────────
  try {
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'bn'], configurable: true });
    Object.defineProperty(navigator, 'language', { get: () => 'en-US', configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0, configurable: true });
  } catch {}

  // ─── 6. WebGL fingerprint masking ─────────────────────────────────────────
  try {
    const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) return 'Intel Inc.';
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameterOrig.call(this, parameter);
    };
    const getParameterOrig2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameterOrig2.call(this, parameter);
    };
  } catch {}

  // ─── 7. Canvas fingerprint noise ──────────────────────────────────────────
  try {
    const toDataURLOrig = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
      const ctx = this.getContext('2d');
      if (ctx) {
        // Add imperceptible noise to break hash-based fingerprinting
        const imgData = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
        const noise = (Math.random() * 2) - 1;
        if (imgData.data.length > 0) {
          imgData.data[0] = Math.max(0, Math.min(255, imgData.data[0] + noise));
        }
        ctx.putImageData(imgData, 0, 0);
      }
      return toDataURLOrig.call(this, type, quality);
    };
  } catch {}

  // ─── 8. AudioContext fingerprint ──────────────────────────────────────────
  try {
    const origCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const osc = origCreateOscillator.call(this);
      const origConnect = osc.connect.bind(osc);
      osc.connect = function(dest, ...args) {
        // Add micro jitter to frequency to break audio fingerprinting
        osc.frequency.value = osc.frequency.value + (Math.random() * 0.0001);
        return origConnect(dest, ...args);
      };
      return osc;
    };
  } catch {}

  // ─── 9. Window dimensions consistency ─────────────────────────────────────
  try {
    Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth, configurable: true });
    Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 85, configurable: true });
  } catch {}

  // ─── 10. Media devices (no real devices leak) ─────────────────────────────
  try {
    Object.defineProperty(navigator, 'mediaDevices', {
      get: () => ({
        enumerateDevices: () => Promise.resolve([
          { deviceId: '', groupId: '', kind: 'audioinput', label: '' },
          { deviceId: '', groupId: '', kind: 'videoinput', label: '' },
          { deviceId: '', groupId: '', kind: 'audiooutput', label: '' },
        ]),
        getUserMedia: () => Promise.reject(new DOMException('Permission denied')),
      }),
      configurable: true,
    });
  } catch {}

})();`;

/**
 * Chrome 133 compatible User-Agent
 * Keep in sync with CAPSOLVER_SUPPORTED_UA in captchaSolver.ts
 */
export const STEALTH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

/**
 * Chrome 133 compatible sec-ch-ua headers for DataDome
 */
export const STEALTH_CH_UA_HEADERS = {
  'sec-ch-ua': '"Google Chrome";v="133", "Chromium";v="133", "Not?A_Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'accept-language': 'en-US,en;q=0.9,bn;q=0.8',
};
