import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

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

// --- Páginas de serviços x formulário de agendamento x números citados no texto -------------
const require = createRequire(import.meta.url);
const { SERVICES } = require('../src/js/main.js');
const page = (name) => readFileSync(path.join('src/pages', `${name}.html`), 'utf8');

/** Serviços dos botões "Agendar" de uma página: [{ area, service }]. */
function bookingButtons(html) {
  return [...html.matchAll(/data-area="([a-z]+)" data-service="([^"]+)"/g)].map((m) => ({ area: m[1], service: m[2] }));
}

test('todo botão "Agendar" das páginas aponta para um serviço que existe no formulário', () => {
  const missing = [];
  for (const file of readdirSync('src/pages')) {
    for (const { area, service } of bookingButtons(page(file.replace('.html', '')))) {
      if (!SERVICES[area]?.includes(service)) missing.push(`${file}: ${area} / ${service}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('cada serviço do formulário tem o seu card na página da área (e vice-versa)', () => {
  const cards = (name) => [...page(name).matchAll(/<article id="[^"]+"[\s\S]*?data-service="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cards('medicina'), SERVICES.medical);
  assert.deepEqual(cards('odontologia'), SERVICES.dental.filter((s) => !s.startsWith('Outro')));
  assert.deepEqual(cards('exames'), SERVICES.exams);
});

test('números citados no texto batem com os cards (especialidades e total de serviços)', () => {
  const medicina = page('medicina');
  const index = page('index');
  const especialidades = (medicina.slice(0, medicina.indexOf('id="terapias"')).match(/<article id=/g) || []).length;
  const citadas = [...(medicina + index).matchAll(/(\d+) especialidades/g)].map((m) => Number(m[1]));
  assert.ok(citadas.length >= 3, 'esperava o número de especialidades no texto');
  assert.deepEqual([...new Set(citadas)], [especialidades]);

  const lista = index.slice(index.indexOf('<section id="servicos"'), index.indexOf('</section>', index.indexOf('<section id="servicos"')));
  const servicos = (lista.match(/<li>/g) || []).length;
  const citados = [...index.matchAll(/(\d+) serviços de saúde/g)].map((m) => Number(m[1]));
  assert.ok(citados.length >= 2, 'esperava o total de serviços no texto');
  assert.deepEqual([...new Set(citados)], [servicos]);
});

// Decisão da clínica (Código de Ética Médica, arts. 68 e 69): a ótica aparece sem oferta ligada à consulta.
test('seção da ótica não oferece consulta grátis, desconto ou nome de médico', () => {
  const index = page('index');
  const start = index.indexOf('<section id="otica"');
  assert.ok(start > 0, 'seção #otica não encontrada');
  const otica = index.slice(start, index.indexOf('</section>', start));
  assert.doesNotMatch(otica, /gr[aá]tis|gratuit|de gra[cç]a|desconto|cortesia|\bDra?\.?\s/i);
});
