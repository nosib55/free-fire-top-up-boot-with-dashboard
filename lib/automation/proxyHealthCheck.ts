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
      socket.setTimeout(7000);

      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve(latency);
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
