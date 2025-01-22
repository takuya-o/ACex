import { describe, it  } from 'mocha'
import assert from 'node:assert'

// eslint-disable-next-line vitest/require-hook -- とりあえず
describe('Array', () => {
  describe('#indexOf()', () => {
    it('should return -1 when the value is not present', () => {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});
