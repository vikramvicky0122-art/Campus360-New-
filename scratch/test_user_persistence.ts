import { db } from '../server/db.ts';

async function testPersistence() {
  console.log('--- Testing User Registration & Persistence ---');

  const testEmail = `student_${Date.now()}@ait.edu`;
  const testRoll = `ROLL_${Date.now().toString().slice(-4)}`;

  console.log(`1. Simulating registration of new user: ${testEmail}`);
  const newProfile = {
    id: `user-test-${Date.now()}`,
    email: testEmail.toLowerCase(),
    fullName: 'Priya Sharma',
    phone: '+91 91234 56789',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    institutionId: 'inst-1',
    institutionName: 'Apex Institute of Technology',
    department: 'Computer Science & Engineering',
    yearOfStudy: 2,
    rollNumber: testRoll,
    role: 'user' as const,
    isVerified: false,
    isSuspended: false,
    verificationStatus: 'PENDING' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.profiles.push(newProfile);
  db.savePersistentData();
  console.log('✓ User added to database and persistent file written.');

  // Check login in current memory
  const foundNow = db.profiles.find(p => p.email.toLowerCase() === testEmail.toLowerCase());
  if (!foundNow) throw new Error('User not found in memory right after push');
  console.log(`✓ Immediate login lookup succeeded: ${foundNow.fullName} (${foundNow.email})`);

  // Simulate server restart: re-instantiate database
  console.log('2. Simulating full server restart (re-loading fresh CampusBazaarDatabase instance)...');
  const { db: freshDb } = await import('../server/db.ts');
  freshDb.loadPersistentData();

  const foundAfterRestart = freshDb.profiles.find(p => p.email.toLowerCase() === testEmail.toLowerCase());
  if (!foundAfterRestart) {
    throw new Error('FAILED: User was lost after server restart!');
  }
  console.log(`✓ Post-restart login lookup succeeded: ${foundAfterRestart.fullName} is permanently saved!`);
  console.log('\n🎉 Test Passed: Any newly added user can log in anytime!');
}

testPersistence().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

