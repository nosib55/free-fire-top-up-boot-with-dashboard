// lib/automation/proxyHealthCheck.ts
// Native Node.js TCP connectivity check for proxy health validation.
// Avoids external HTTP libraries — uses raw net.Socket for CONNECT test.

import net from 'net';

/**
 * Attempts a TCP connection to the proxy host:port.
 * Returns latency in ms if successful, null if connection fails or times out.
 */
export async function checkProxyConnectivity(
  serverUrl: string,
  username?: string,
  password?: string
): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(serverUrl);
      const host = parsed.hostname;
      const port = parseInt(parsed.port, 10) || 8080;
      const start = Date.now();

      const socket = new net.Socket();
      socket.setTimeout(4000);

      socket.on('connect', () => {
        let authHeader = '';
        if (username && password) {
          const creds = Buffer.from(`${username}:${password}`).toString('base64');
          authHeader = `Proxy-Authorization: Basic ${creds}\r\n`;
        }
        const req = `CONNECT shop.garena.my:443 HTTP/1.1\r\nHost: shop.garena.my:443\r\n${authHeader}\r\n`;
        socket.write(req);
      });

      socket.on('data', (data) => {
        const resp = data.toString();
        socket.destroy();
        if (resp.startsWith('HTTP/1.1 200') || resp.startsWith('HTTP/1.0 200')) {
          const latency = Date.now() - start;
          resolve(latency);
        } else {
          // Proxy returned 407 Proxy Authentication Required, 403 Forbidden, 502, etc. (Expired/Dead)
          resolve(null);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });

      socket.connect(port, host);
    } catch {
      resolve(null);
    }
  });
}
