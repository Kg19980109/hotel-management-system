const { execSync } = require('child_process');

const testSuites = [
  { name: 'Core: RLS & Multitenancy', file: 'scripts/test_rls.js' },
  { name: 'Phase 5: Room Management', file: 'scripts/test_rooms.js' },
  { name: 'Phase 6 & 7: Bookings Engine', file: 'scripts/test_bookings.js' },
  { name: 'Phase 8: Front Desk & Stays', file: 'scripts/test_front_desk.js' },
  { name: 'Phase 9: Guests CRM', file: 'scripts/test_guests.js' },
  { name: 'Phase 10: Housekeeping Management', file: 'scripts/test_housekeeping.js' },
  { name: 'Phase 11: Maintenance Management', file: 'scripts/test_maintenance.js' },
  { name: 'Phase 12: Restaurant POS Management', file: 'scripts/test_restaurant_pos.js' },
  { name: 'Phase 13: Kitchen Display System (KDS)', file: 'scripts/test_kds.js' },
  { name: 'Phase 14: Guest QR Portal', file: 'scripts/test_guest_portal.js' },
  { name: 'Phase 15A: QR Food Ordering', file: 'scripts/test_guest_ordering.js' },
  { name: 'Phase 15B: Guest Service Requests', file: 'scripts/test_guest_services.js' },
  { name: 'Phase 16: Billing, Payments & Folios', file: 'scripts/test_billing.js' },
  { name: 'Phase 17: Inventory & Supplier Management', file: 'scripts/test_inventory.js' },
  { name: 'Phase 18: Staff, Attendance & Expenses', file: 'scripts/test_staff.js' },
  { name: 'Phase 19: Reports & Analytics', file: 'scripts/test_reports.js' },
  { name: 'Phase 20: AI Business Buddy', file: 'scripts/test_ai_business_buddy.js' },
  { name: 'Phase 21: Notifications & Online Booking', file: 'scripts/test_notifications_booking.js' },
  { name: 'Phase 22: Production Hardening & Security Audit', file: 'scripts/test_production_hardening.js' },
  { name: 'Phase 23: QR Request Dispatch, Alerting & Buzzer', file: 'scripts/test_qr_dispatch_alerting.js' },
  { name: 'Dashboard Analytics & KPIs', file: 'scripts/test_dashboard.js' },
];

console.log('===========================================================');
console.log('STAYHUB FULL REGRESSION TEST RUNNER (ALL SUITES)');
console.log('===========================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of testSuites) {
  process.stdout.write(`Running ${suite.name} (${suite.file})... `);
  try {
    const output = execSync(`node ${suite.file}`, { encoding: 'utf8', stdio: 'pipe' });
    
    // Parse test counts from output
    const match = output.match(/(\d+)\s+PASSED(?:,\s*(\d+)\s+FAILED)?/i);
    let passed = 0;
    let failed = 0;
    if (match) {
      passed = parseInt(match[1], 10) || 0;
      failed = parseInt(match[2], 10) || 0;
    } else {
      passed = 1; // Completed with 0 exit code
    }

    totalPassed += passed;
    totalFailed += failed;
    results.push({ name: suite.name, status: failed === 0 ? 'PASSED' : 'FAILED', passed, failed });
    console.log(`✓ ${passed} passed, ${failed} failed`);
  } catch (err) {
    console.log(`✗ FAILED`);
    const output = err.stdout ? err.stdout.toString() : err.message;
    console.error(output);
    totalFailed++;
    results.push({ name: suite.name, status: 'FAILED', error: err.message });
  }
}

console.log('\n===========================================================');
console.log('TEST SUMMARY MATRIX');
console.log('===========================================================');
results.forEach(r => {
  console.log(`- ${r.name.padEnd(45)}: ${r.status === 'PASSED' ? '✓ ' + r.passed + ' passed' : '✗ FAILED'}`);
});
console.log('===========================================================');
console.log(`GRAND TOTAL: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('===========================================================');

if (totalFailed > 0) {
  process.exit(1);
}
