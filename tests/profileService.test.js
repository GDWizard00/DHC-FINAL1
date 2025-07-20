import assert from 'assert';
import { ProfileService } from '../src/services/ProfileService.js';
import { DatabaseManager } from '../src/database/DatabaseManager.js';

await DatabaseManager.initialize();

const TEST_USER = 'test-user-123';

// Clean up any existing test user
await DatabaseManager.collections?.players?.deleteOne?.({ discordId: TEST_USER });

console.log('Running ProfileService tests');

// Test creation
const profile = await ProfileService.createProfile(TEST_USER, { password: 'pass123', email: 'test@example.com' });
assert.equal(profile.email, 'test@example.com');
assert.ok(profile.verifyPassword('pass123'));

// Test duplicate creation should throw
let duplicateError = null;
try {
  await ProfileService.createProfile(TEST_USER, { password: 'another', email: '' });
} catch (e) {
  duplicateError = e;
}
assert.ok(duplicateError);

// Test update
const updated = await ProfileService.updateProfile(TEST_USER, { email: 'new@example.com' });
assert.equal(updated.email, 'new@example.com');

// Test wallet add/remove
await ProfileService.addWallet(TEST_USER, '0x000000000000000000000000000000000000dead');
const afterAdd = await ProfileService.getProfile(TEST_USER);
assert.equal(afterAdd.wallets.length, 1);
await ProfileService.removeWallet(TEST_USER, '0x000000000000000000000000000000000000dead');
const afterRemove = await ProfileService.getProfile(TEST_USER);
assert.equal(afterRemove.wallets.length, 0);

console.log('✅ All ProfileService tests passed'); 