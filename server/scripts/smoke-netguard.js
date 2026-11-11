// Checks the SSRF guard without a database. Uses only IP literals and "localhost",
// so no internet access is needed.
import { isPrivateAddress, checkPublicHost, checkFetchTarget } from '../src/utils/netGuard.js';

let failed = 0;
function check(name, actual, expected) {
  const pass = actual === expected;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
}

const blocked = [
  '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
  '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1',
];
const open = ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'];

for (const ip of blocked) check(`blocks ${ip}`, isPrivateAddress(ip), true);
for (const ip of open) check(`allows ${ip}`, isPrivateAddress(ip), false);

check('localhost name is refused', (await checkPublicHost('localhost')).ok, false);
check('bracketed IPv6 loopback is refused', (await checkPublicHost('[::1]')).ok, false);
check('dev demo origin passes via the allowlist', (await checkFetchTarget('http://localhost:4000/menu.html')).ok, true);
check('other localhost port is refused', (await checkFetchTarget('http://localhost:5000/api/health')).ok, false);
check('metadata IP is refused', (await checkFetchTarget('http://169.254.169.254/latest/meta-data/')).ok, false);
check('non-http scheme is refused', (await checkFetchTarget('file:///etc/passwd')).ok, false);

console.log(failed ? `${failed} check(s) failed` : 'All net guard checks passed');
process.exit(failed ? 1 : 0);
