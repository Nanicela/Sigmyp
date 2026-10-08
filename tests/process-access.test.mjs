import test from 'node:test';
import assert from 'node:assert/strict';
import { DYD_COMPANY_ID, isDydCompany } from '../web/process-access.js';

test('reconoce únicamente el identificador registrado de la compañía DyD', () => {
  assert.equal(DYD_COMPANY_ID, '500123568');
  assert.equal(isDydCompany('500123568'), true);
  assert.equal(isDydCompany(' 500123568 '), true);
  assert.equal(isDydCompany('10326589'), false);
  assert.equal(isDydCompany('999000001'), false);
  assert.equal(isDydCompany(''), false);
});
