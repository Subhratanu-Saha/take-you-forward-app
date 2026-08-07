const assert = require('assert');
const { normalizeLoyaltyTier } = require('../src/utils/loyalty');

assert.strictEqual(normalizeLoyaltyTier('BRONZE'), 'Bronze');
assert.strictEqual(normalizeLoyaltyTier('bronze'), 'Bronze');
assert.strictEqual(normalizeLoyaltyTier('Bronze'), 'Bronze');
assert.strictEqual(normalizeLoyaltyTier('SILVER'), 'Silver');
assert.strictEqual(normalizeLoyaltyTier('Gold'), 'Gold');
assert.strictEqual(normalizeLoyaltyTier(undefined), 'Bronze');
assert.strictEqual(normalizeLoyaltyTier('   '), 'Bronze');

console.log('Loyalty tier normalization regression checks passed.');
