import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function runPrivacyAudit() {
  const findings = [];
  const hotels = JSON.parse(readFileSync(join(root, 'data/hotel-bookings.json'), 'utf8')).items;
  if (hotels.some((stay) => stay.confirmationNumber || (stay.bookingNumber && stay.bookingNumber !== 'LOCAL_ONLY') || (stay.guestName && stay.guestName !== 'LOCAL_ONLY') || (stay.sourceFile && stay.sourceFile !== 'LOCAL_DOCUMENT') || (stay.sourcePath && stay.sourcePath !== 'LOCAL_ONLY')))
    findings.push({ location: 'data/hotel-bookings.json', category: 'private hotel voucher metadata' });

  const backupSource = readFileSync(join(root, 'features/app/useAppController.ts'), 'utf8');
  const backupBlock = backupSource.match(/const backup: BackupPayload = \{([\s\S]*?)\n  \};/)?.[1] ?? '';
  if (/privateLinks|documents|documentBlobs|location/i.test(backupBlock))
    findings.push({ location: 'features/app/useAppController.ts', category: 'private data in JSON backup' });

  for (const base of ['public', 'audit', 'dist']) {
    for (const path of walk(join(root, base))) {
      if (!/\.(?:js|json|html|txt|map)$/i.test(path)) continue;
      const content = readFileSync(path, 'utf8');
      if (/C:[\\/]Users[\\/]/i.test(content))
        findings.push({ location: relative(root, path).replaceAll('\\', '/'), category: 'local filesystem path' });
      if (/"(?:bookingNumber|guestName|sourcePath)"\s*:\s*"(?!LOCAL_ONLY"|LOCAL_DOCUMENT")[^"\s][^"]*"/i.test(content))
        findings.push({ location: relative(root, path).replaceAll('\\', '/'), category: 'private voucher value' });
    }
  }
  return findings;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = runPrivacyAudit();
  if (findings.length) {
    console.error(JSON.stringify({ status: 'failed', findings }, null, 2));
    process.exitCode = 1;
  } else console.log('Privacy audit passed: local documents, voucher identifiers, private links and location values are excluded from source artifacts and JSON backup.');
}
