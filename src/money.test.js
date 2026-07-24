import assert from 'node:assert/strict';
import test from 'node:test';
import { formatChineseMoney } from './money.js';

test('formats Chinese RMB uppercase', () => {
  assert.equal(formatChineseMoney(1000), '壹仟元整');
  assert.equal(formatChineseMoney(10001.01), '壹万零壹元零壹分');
  assert.equal(formatChineseMoney(100000001.1), '壹亿零壹元壹角');
});
