import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  SERVICES,
  clean,
  formatPhone,
  isValidPhone,
  formatDate,
  buildBookingMessage,
  buildWhatsAppUrl,
} = require('../src/js/main.js');

test('lista de serviços bate com a arte da clínica (22 itens)', () => {
  const total = SERVICES.medical.length + SERVICES.exams.length + 1; // odontologia conta como 1
  assert.equal(total, 22);
});

test('formatPhone aplica a máscara brasileira', () => {
  assert.equal(formatPhone('87999952824'), '(87) 99995-2824');
  assert.equal(formatPhone('8737'), '(87) 37');
  assert.equal(formatPhone('87'), '87');
  assert.equal(formatPhone('(87) 99995-2824 extra 123'), '(87) 99995-2824');
});

test('isValidPhone aceita fixo e celular com DDD', () => {
  assert.equal(isValidPhone('(87) 3838-0000'), true);
  assert.equal(isValidPhone('(87) 99995-2824'), true);
  assert.equal(isValidPhone('99995-2824'), false);
});

test('clean remove quebras de linha e formatação do WhatsApp e limita o tamanho', () => {
  assert.equal(clean('Ana\n*Nome falso*: x'), 'Ana Nome falso : x');
  assert.equal(clean('a'.repeat(200)).length, 80);
  assert.equal(clean(undefined), '');
});

test('formatDate converte para DD/MM/AAAA e ignora valor inválido', () => {
  assert.equal(formatDate('2026-11-20'), '20/11/2026');
  assert.equal(formatDate('20/11/2026'), '');
});

test('buildBookingMessage monta a mensagem sem permitir injetar linhas', () => {
  const msg = buildBookingMessage({
    area: 'medical',
    service: 'Cardiologia',
    name: 'Maria\nÁrea: Falsa',
    phone: '87999952824',
    date: '2026-11-20',
    shift: 'Manhã',
  });
  assert.match(msg, /Nome: Maria Área: Falsa/);
  assert.match(msg, /WhatsApp: \(87\) 99995-2824/);
  assert.match(msg, /Especialidade\/serviço: Cardiologia/);
  assert.match(msg, /Preferência: 20\/11\/2026, Manhã/);
  assert.equal(msg.split('\n').filter((l) => l.startsWith('Área:')).length, 1);
});

test('buildWhatsAppUrl codifica o texto', () => {
  assert.equal(buildWhatsAppUrl('55 87 99995-2824', 'Olá & tchau'), 'https://wa.me/5587999952824?text=Ol%C3%A1%20%26%20tchau');
});
