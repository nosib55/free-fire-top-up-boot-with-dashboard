// lib/automation/proxyManager.ts

export const proxyList = [
  // proxies can be added here in the format:
  // 'http://username:password@ip:port',
];

export function getRandomProxy() {
  if (proxyList.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * proxyList.length);
  return proxyList[randomIndex];
}
