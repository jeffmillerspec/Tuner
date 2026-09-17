import net from 'net';

const PORT = Number(process.env.PORT || 1420);
const MAX_MS = Number(process.env.WAIT_MS || 35000);
const INTERVAL = 500;

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    s.setTimeout(800);
    s.on('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => resolve(false));
  });
}

const start = Date.now();
while (Date.now() - start < MAX_MS) {
  if (await portOpen(PORT)) {
    console.log(JSON.stringify({ port1420Open: true, waitedMs: Date.now() - start, timestamp: new Date().toISOString() }));
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, INTERVAL));
}
console.log(JSON.stringify({ port1420Open: false, waitedMs: Date.now() - start, timestamp: new Date().toISOString() }));
process.exit(1);
