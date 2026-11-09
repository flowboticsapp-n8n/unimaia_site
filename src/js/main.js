/**
 * Unimaia - interações do site: menu do celular, cabeçalho, modal de agendamento
 * e formulários que montam a mensagem do WhatsApp.
 * Sem bibliotecas. O número do WhatsApp vem de <body data-whatsapp>, gerado no build.
 */
(function () {
  'use strict';

  // Lista oficial de serviços (arte de especialidades da Unimaia).
  const SERVICES = {
    medical: [
      'Clínica Geral',
      'Cardiologia',
      'Dermatologia',
      'Endocrinologia',
      'Gastroenterologia',
      'Geriatria',
      'Ginecologia',
      'Hepatologia',
      'Neurologia',
      'Nutrologia',
      'Obstetrícia',
      'Oftalmologia',
      'Ortopedia',
      'Pediatria',
      'Pneumologia',
      'Psiquiatria',
      'Psicologia',
      'Fisioterapia',
      'Quiropraxia',
    ],
    dental: ['Odontologia: avaliação', 'Odontologia: outro tratamento (explico no WhatsApp)'],
    exams: ['Exames laboratoriais', 'Ultrassom'],
  };

  const AREA_NAMES = { medical: 'Consulta', dental: 'Odontologia', exams: 'Exames' };

  /**
   * Limpa texto digitado antes de ir para a mensagem: tira quebras de linha e
   * caracteres de formatação do WhatsApp (* _ ~ `), e limita o tamanho.
   */
  function clean(value, max) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001f\u007f*_~`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 80);
  }

  /** Máscara (87) 99999-9999 a partir de qualquer texto. */
  function formatPhone(value) {
    const d = String(value).replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function isValidPhone(value) {
    const digits = String(value).replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  }

  /** Data AAAA-MM-DD do input date -> DD/MM/AAAA. */
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }

  function buildBookingMessage(data) {
    const lines = [
      '*Solicitação de agendamento - Unimaia*',
      '',
      'Nome: ' + clean(data.name),
      'WhatsApp: ' + formatPhone(data.phone),
      'Área: ' + (AREA_NAMES[data.area] || AREA_NAMES.medical),
      'Especialidade/serviço: ' + (clean(data.service) || 'A definir com a recepção'),
    ];
    const date = formatDate(data.date);
    if (date || data.shift) {
      lines.push('Preferência: ' + [date || 'o quanto antes', clean(data.shift)].filter(Boolean).join(', '));
    }
    lines.push('', 'Enviado pelo site.');
    return lines.join('\n');
  }

  function buildWhatsAppUrl(number, message) {
    return 'https://wa.me/' + String(number).replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
  }

  // Permite testar as funções acima no Node (tests/main.test.mjs) sem afetar o navegador.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SERVICES, clean, formatPhone, isValidPhone, formatDate, buildBookingMessage, buildWhatsAppUrl };
  }
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------ */

  function fillServiceSelect(select, area) {
    if (!select) return;
    const items = SERVICES[area] || SERVICES.medical;
    select.replaceChildren(new Option('Selecione...', ''));
    items.forEach(function (item) {
      select.appendChild(new Option(item, item));
    });
  }

  function todayIso() {
    const now = new Date();
    const tz = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tz).toISOString().slice(0, 10);
  }

  function initNavbarScroll() {
    const navbar = document.getElementById('main-navbar');
    if (!navbar) return;
    let scrolled = null;
    // passive: o navegador não espera o JS para rolar a tela.
    window.addEventListener(
      'scroll',
      function () {
        const now = window.scrollY > 30;
        if (now === scrolled) return; // só mexe no DOM quando o estado muda
        scrolled = now;
        navbar.classList.toggle('shadow-md', now);
      },
      { passive: true },
    );
  }

  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-mobile-menu');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (!toggleBtn || !drawer) return;

    function setOpen(open) {
      drawer.classList.toggle('translate-x-full', !open);
      drawer.classList.toggle('invisible', !open);
      drawer.setAttribute('aria-hidden', String(!open));
      toggleBtn.setAttribute('aria-expanded', String(open));
      if (backdrop) backdrop.classList.toggle('hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && closeBtn) closeBtn.focus();
      if (!open) toggleBtn.focus();
    }

    toggleBtn.addEventListener('click', function () { setOpen(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggleBtn.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
  }

  function initBookingModal(whatsapp) {
    const modal = document.getElementById('booking-modal');
    const form = document.getElementById('modal-booking-form');
    if (!modal || !form) return;

    const select = document.getElementById('modal-booking-specialty');
    const dateInput = document.getElementById('modal-booking-date');
    const errorBox = document.getElementById('modal-booking-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    let lastTrigger = null;

    function open(area, service, trigger) {
      lastTrigger = trigger || null;
      const radio = form.querySelector('input[name="modal-service-category"][value="' + area + '"]');
      if (radio) radio.checked = true;
      fillServiceSelect(select, area);
      if (service) select.value = service;
      if (dateInput) dateInput.min = todayIso();
      errorBox.classList.add('hidden');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
      document.getElementById('modal-booking-name').focus();
    }

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = '';
      if (lastTrigger) lastTrigger.focus();
    }

    // Botões "Agendar": data-area e data-service pré-selecionam o formulário.
    document.querySelectorAll('.open-booking-modal-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        open(btn.getAttribute('data-area') || 'medical', btn.getAttribute('data-service'), btn);
      });
    });

    modal.querySelectorAll('.close-booking-modal, #booking-modal-backdrop').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });

    // Some com o aviso de erro assim que a pessoa volta a digitar.
    form.addEventListener('input', function () { errorBox.classList.add('hidden'); });

    form.querySelectorAll('input[name="modal-service-category"]').forEach(function (radio) {
      radio.addEventListener('change', function () { fillServiceSelect(select, radio.value); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = clean(document.getElementById('modal-booking-name').value);
      const phone = document.getElementById('modal-booking-phone').value;

      let error = '';
      if (name.length < 2) error = 'Informe seu nome.';
      else if (!isValidPhone(phone)) error = 'Informe um WhatsApp com DDD, ex.: (87) 99999-9999.';
      if (error) {
        errorBox.textContent = error;
        errorBox.classList.remove('hidden');
        return;
      }
      errorBox.classList.add('hidden');

      const area = (form.querySelector('input[name="modal-service-category"]:checked') || {}).value || 'medical';
      const message = buildBookingMessage({
        area: area,
        service: select.value,
        name: name,
        phone: phone,
        date: dateInput ? dateInput.value : '',
        shift: document.getElementById('modal-booking-shift').value,
      });

      // Evita abrir duas conversas com clique duplo.
      submitBtn.disabled = true;
      setTimeout(function () { submitBtn.disabled = false; }, 3000);

      window.open(buildWhatsAppUrl(whatsapp, message), '_blank', 'noopener');
      close();
    });
  }

  function initPhoneMasks() {
    document.querySelectorAll('input[type="tel"]').forEach(function (input) {
      input.addEventListener('input', function () {
        input.value = formatPhone(input.value);
      });
    });
  }

  function init() {
    const whatsapp = document.body.getAttribute('data-whatsapp') || '';
    initNavbarScroll();
    initMobileMenu();
    initBookingModal(whatsapp);
    initPhoneMasks();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
