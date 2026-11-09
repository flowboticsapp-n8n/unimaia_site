import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Regra de negócio: a clínica não aceita convênios. Nenhum texto do site pode citar convênio.
test('nenhuma página ou parte do site menciona convênio', () => {
  const dirs = ['src/pages', 'src/partials', 'src/js'];
  const offenders = [];
  for (const dir of dirs) {
    for (const file of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, file), 'utf8');
      if (/conv[eê]nio/i.test(text)) offenders.push(path.join(dir, file));
    }
  }
  assert.deepEqual(offenders, []);
});
