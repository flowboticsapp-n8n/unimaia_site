/**
 * VittaIntegrada - Clínica Médica & Odontologia Avançada
 * Multi-page Engine, Navigation & Instant WhatsApp Booking
 */

document.addEventListener('DOMContentLoaded', () => {
  ensureGlobalWidgetsExist();

  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  highlightCurrentPage();
  initNavbarScroll();
  initMobileMenu();
  initBookingModal();
  initAllBookingForms();
  initPhoneMasks();
  initWhatsAppWidget();
  initFaqAccordion();
});

/* ==========================================================================
   0. ENSURE GLOBAL WIDGETS EXIST (MODAL & WHATSAPP) ON ALL PAGES
   ========================================================================== */
function ensureGlobalWidgetsExist() {
  if (!document.getElementById('booking-modal')) {
    const modalContainer = document.createElement('div');
    modalContainer.id = 'booking-modal';
    modalContainer.className = 'fixed inset-0 z-50 hidden flex items-center justify-center p-4 overflow-y-auto';
    modalContainer.innerHTML = `
      <div id="booking-modal-backdrop" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"></div>
      <div class="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <i data-lucide="calendar" class="w-4 h-4"></i>
            </div>
            <h3 class="text-base font-bold text-slate-900 font-heading">Agendar Consulta ou Exame</h3>
          </div>
          <button class="close-booking-modal p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="modal-booking-form" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Área de Atendimento
            </label>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <input type="radio" name="modal-service-category" id="mod-med" value="medical" class="hidden peer" checked>
                <label for="mod-med" class="block text-center py-2 px-1 text-xs font-bold rounded-lg border border-slate-200 peer-checked:border-brand-600 peer-checked:bg-teal-50 peer-checked:text-brand-700 cursor-pointer">
                  🩺 Médico
                </label>
              </div>
              <div>
                <input type="radio" name="modal-service-category" id="mod-dent" value="dental" class="hidden peer">
                <label for="mod-dent" class="block text-center py-2 px-1 text-xs font-bold rounded-lg border border-slate-200 peer-checked:border-brand-600 peer-checked:bg-teal-50 peer-checked:text-brand-700 cursor-pointer">
                  🦷 Odonto
                </label>
              </div>
              <div>
                <input type="radio" name="modal-service-category" id="mod-exam" value="exams" class="hidden peer">
                <label for="mod-exam" class="block text-center py-2 px-1 text-xs font-bold rounded-lg border border-slate-200 peer-checked:border-brand-600 peer-checked:bg-teal-50 peer-checked:text-brand-700 cursor-pointer">
                  🔬 Exames
                </label>
              </div>
            </div>
          </div>

          <div>
            <label for="modal-booking-specialty" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Especialidade / Tratamento
            </label>
            <select id="modal-booking-specialty" required class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:ring-2 focus:ring-brand-600 focus:outline-none">
            </select>
          </div>

          <div>
            <label for="modal-booking-doctor" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Profissional Preferencial (Opcional)
            </label>
            <input type="text" id="modal-booking-doctor" placeholder="Ex: Dr. Roberto ou Primeiro Disponível" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:ring-2 focus:ring-brand-600 focus:outline-none">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="modal-payment-type" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Atendimento
              </label>
              <select id="modal-payment-type" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
                <option value="particular">Particular</option>
                <option value="convenio">Convênio</option>
              </select>
            </div>
            <div id="modal-insurance-group" class="hidden">
              <label for="modal-insurance-name" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Nome do Plano
              </label>
              <input type="text" id="modal-insurance-name" placeholder="Ex: Bradesco, Amil..." class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="modal-booking-name" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Seu Nome
              </label>
              <input type="text" id="modal-booking-name" required placeholder="Nome completo" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
            </div>
            <div>
              <label for="modal-booking-phone" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                WhatsApp
              </label>
              <input type="tel" id="modal-booking-phone" required placeholder="(11) 99999-9999" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="modal-booking-date" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Data Desejada
              </label>
              <input type="date" id="modal-booking-date" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
            </div>
            <div>
              <label for="modal-booking-shift" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Turno
              </label>
              <select id="modal-booking-shift" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50">
                <option value="Manhã">Manhã (07h às 12h)</option>
                <option value="Tarde">Tarde (12h às 18h)</option>
                <option value="Noite">Noite (18h às 20h)</option>
                <option value="Sábado">Sábado (08h às 14h)</option>
              </select>
            </div>
          </div>

          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 mt-2">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            Enviar Solicitação via WhatsApp
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modalContainer);
  }

  if (!document.getElementById('whatsapp-toggle-btn')) {
    const waContainer = document.createElement('div');
    waContainer.className = 'fixed bottom-6 right-6 z-50 flex flex-col items-end';
    waContainer.innerHTML = `
      <div id="whatsapp-popup" class="hidden mb-3 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 max-w-xs text-left">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-2">
            <div class="relative">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" alt="Atendente" class="w-8 h-8 rounded-full object-cover">
              <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-800">Juliana | Recepção</div>
              <div class="text-[10px] text-emerald-600 font-semibold">Online agora</div>
            </div>
          </div>
          <button id="close-whatsapp-popup" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
        <p class="text-xs text-slate-600">Olá! Precisa de consulta médica ou dentista para hoje ou esta semana?</p>
        <a href="https://wa.me/5511999998888?text=Olá,%20gostaria%20de%20consultar%20horários%20disponíveis" target="_blank" class="mt-2.5 block w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold py-2 rounded-lg text-center transition">
          Iniciar conversa no WhatsApp
        </a>
      </div>

      <button id="whatsapp-toggle-btn" aria-label="Abrir WhatsApp" class="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center transition hover:scale-105 active:scale-95">
        <i data-lucide="message-circle" class="w-7 h-7"></i>
        <span class="notification-ping"></span>
      </button>
    `;
    document.body.appendChild(waContainer);
  }
}

/* ==========================================================================
   1. HIGHLIGHT CURRENT PAGE IN NAVBAR
   ========================================================================== */
function highlightCurrentPage() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const linkPath = href.split('/').pop().split('#')[0];
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.classList.add('text-brand-600', 'font-bold');
      if (link.classList.contains('nav-link')) {
        link.classList.add('border-b-2', 'border-brand-600', 'pb-1');
      }
    }
  });
}

/* ==========================================================================
   2. NAVBAR SCROLL EFFECT
   ========================================================================== */
function initNavbarScroll() {
  const navbar = document.getElementById('main-navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navbar.classList.add('shadow-md', 'bg-white/95', 'backdrop-blur-md');
      navbar.classList.remove('bg-white/80');
    } else {
      navbar.classList.remove('shadow-md', 'bg-white/95');
      navbar.classList.add('bg-white/80', 'backdrop-blur-md');
    }
  });
}

/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('close-mobile-menu');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-drawer-backdrop');

  if (!toggleBtn || !drawer) return;

  function openMenu() {
    drawer.classList.remove('translate-x-full');
    backdrop?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    drawer.classList.add('translate-x-full');
    backdrop?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (backdrop) backdrop.addEventListener('click', closeMenu);
}

/* ==========================================================================
   4. BOOKING DATA & DYNAMIC DROPDOWNS
   ========================================================================== */
const bookingServices = {
  medical: [
    { value: 'Cardiologia & Eletrocardiograma', label: 'Cardiologia & Eletrocardiograma' },
    { value: 'Pediatria & Puericultura', label: 'Pediatria & Puericultura' },
    { value: 'Ginecologia & Obstetrícia', label: 'Ginecologia & Obstetrícia' },
    { value: 'Dermatologia Clínica & Estética', label: 'Dermatologia Clínica & Estética' },
    { value: 'Ortopedia & Traumatologia', label: 'Ortopedia & Traumatologia' },
    { value: 'Clínica Médica Geral / Check-up', label: 'Clínica Médica Geral / Check-up' },
    { value: 'Endocrinologia & Metabologia', label: 'Endocrinologia & Metabologia' },
    { value: 'Otorrinolaringologia', label: 'Otorrinolaringologia' },
    { value: 'Psicologia & Psiquiatria', label: 'Psicologia & Psiquiatria' },
    { value: 'Nutrição Clínica', label: 'Nutrição Clínica' }
  ],
  dental: [
    { value: 'Avaliação Odontológica Geral / Check-up', label: 'Avaliação Odontológica Geral / Check-up' },
    { value: 'Ortodontia & Alinhadores Invisíveis', label: 'Ortodontia & Alinhadores Invisíveis' },
    { value: 'Implantodontia & Carga Imediata', label: 'Implantodontia & Carga Imediata' },
    { value: 'Estética Dental (Facetas, Lentes, Clareamento)', label: 'Estética Dental (Facetas & Clareamento)' },
    { value: 'Odontopediatria (Crianças e Bebês)', label: 'Odontopediatria' },
    { value: 'Endodontia Mecanizada (Canal em Sessão Única)', label: 'Endodontia Mecanizada (Canal)' },
    { value: 'Periodontia & Cuidados Gengivais', label: 'Periodontia (Tratamento Gengival)' },
    { value: 'Cirurgia Oral / Extração de Sisos', label: 'Cirurgia Oral / Sisos' },
    { value: 'Odontologia com Sedação Consciente (Gás)', label: 'Odontologia com Sedação Consciente' },
    { value: 'Bruxismo & Placa de Relaxamento (DTM)', label: 'Bruxismo & Tratamento de DTM' }
  ],
  exams: [
    { value: 'Raio-X Panorâmico Digital Odontológico', label: 'Raio-X Panorâmico Digital' },
    { value: 'Escaneamento Intraoral 3D', label: 'Escaneamento Intraoral 3D' },
    { value: 'Ultrassonografia Geral e Pélvica', label: 'Ultrassonografia Geral e Pélvica' },
    { value: 'Eletrocardiograma (ECG)', label: 'Eletrocardiograma (ECG)' },
    { value: 'Exames Laboratoriais (Sangue/Urina)', label: 'Exames Laboratoriais (Coleta Rápida)' }
  ]
};

function populateServiceSelect(selectElement, category = 'medical') {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Selecione a especialidade ou procedimento...</option>';

  const items = bookingServices[category] || bookingServices['medical'];
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    selectElement.appendChild(opt);
  });
}

/* ==========================================================================
   5. BOOKING MODAL & INTERACTION
   ========================================================================== */
function initBookingModal() {
  const modal = document.getElementById('booking-modal');
  const modalBackdrop = document.getElementById('booking-modal-backdrop');
  const closeBtns = document.querySelectorAll('.close-booking-modal');
  const openBtns = document.querySelectorAll('.open-booking-modal-btn');
  const doctorSelectBtns = document.querySelectorAll('.book-with-doctor-btn');

  function openModal(category = 'medical', specialty = null, doctor = null) {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Set category radio if present in modal
    const radio = modal.querySelector(`input[name="modal-service-category"][value="${category}"]`);
    if (radio) {
      radio.checked = true;
    }

    const select = document.getElementById('modal-booking-specialty');
    if (select) {
      populateServiceSelect(select, category);
      if (specialty) {
        setTimeout(() => { select.value = specialty; }, 50);
      }
    }

    const doctorInput = document.getElementById('modal-booking-doctor');
    if (doctorInput && doctor) {
      doctorInput.value = doctor;
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const area = btn.getAttribute('data-prefill-area') || 'medical';
      const spec = btn.getAttribute('data-prefill-spec') || null;
      openModal(area, spec);
    });
  });

  doctorSelectBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const area = btn.getAttribute('data-area') || 'medical';
      const spec = btn.getAttribute('data-specialty') || null;
      const doc = btn.getAttribute('data-doctor') || null;
      openModal(area, spec, doc);
    });
  });

  closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Watch radio changes inside modal
  const modalRadios = document.querySelectorAll('input[name="modal-service-category"]');
  modalRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      const select = document.getElementById('modal-booking-specialty');
      populateServiceSelect(select, e.target.value);
    });
  });
}

/* ==========================================================================
   6. ALL FORMS SUBMISSION ENGINE (WHATSAPP REDIRECTION)
   ========================================================================== */
function initAllBookingForms() {
  const clinicWhatsApp = '5511999998888';

  // 1. Direct Hero/Inline Quick Form
  const inlineForm = document.getElementById('quick-conversion-form');
  if (inlineForm) {
    const inlineSelect = document.getElementById('inline-specialty');
    const inlineRadios = document.querySelectorAll('input[name="inline-category"]');

    // Populate initial
    const initialCategory = document.querySelector('input[name="inline-category"]:checked')?.value || 'medical';
    populateServiceSelect(inlineSelect, initialCategory);

    inlineRadios.forEach(r => {
      r.addEventListener('change', (e) => {
        populateServiceSelect(inlineSelect, e.target.value);
      });
    });

    inlineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = document.querySelector('input[name="inline-category"]:checked')?.value || 'medical';
      const areaName = area === 'medical' ? 'Medicina' : (area === 'dental' ? 'Odontologia' : 'Exames');
      const spec = inlineSelect?.value || 'A definir com a equipe';
      const name = document.getElementById('inline-name')?.value || 'Paciente';
      const phone = document.getElementById('inline-phone')?.value || '';
      const payType = document.getElementById('inline-payment')?.value || 'Particular';

      const msg = 
        `*NOVO PRÉ-AGENDAMENTO RÁPIDO - VITTAINTEGRADA*\n\n` +
        `👤 *Paciente:* ${name}\n` +
        `📱 *WhatsApp:* ${phone}\n` +
        `🩺 *Área:* ${areaName}\n` +
        `🎯 *Especialidade / Tratamento:* ${spec}\n` +
        `💳 *Tipo de Atendimento:* ${payType}\n\n` +
        `_Enviado pelo formulário de conversão rápida do site._`;

      const url = `https://wa.me/${clinicWhatsApp}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    });
  }

  // 2. Modal Form
  const modalForm = document.getElementById('modal-booking-form');
  if (modalForm) {
    const paySelect = document.getElementById('modal-payment-type');
    const insGroup = document.getElementById('modal-insurance-group');
    if (paySelect && insGroup) {
      paySelect.addEventListener('change', () => {
        if (paySelect.value === 'convenio') insGroup.classList.remove('hidden');
        else insGroup.classList.add('hidden');
      });
    }

    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = document.querySelector('input[name="modal-service-category"]:checked')?.value || 'medical';
      const areaName = area === 'medical' ? 'Medicina' : (area === 'dental' ? 'Odontologia' : 'Exames');
      const spec = document.getElementById('modal-booking-specialty')?.value || 'A definir';
      const doc = document.getElementById('modal-booking-doctor')?.value || 'Primeiro disponível';
      const payType = document.getElementById('modal-payment-type')?.value;
      const insName = document.getElementById('modal-insurance-name')?.value || '';
      const payment = payType === 'convenio' ? `Convênio (${insName})` : 'Particular';

      const date = document.getElementById('modal-booking-date')?.value || 'O quanto antes';
      const shift = document.getElementById('modal-booking-shift')?.value || 'Qualquer horário';
      const name = document.getElementById('modal-booking-name')?.value || 'Paciente';
      const phone = document.getElementById('modal-booking-phone')?.value || '';

      const msg = 
        `*SOLICITAÇÃO DE AGENDAMENTO - VITTAINTEGRADA*\n\n` +
        `👤 *Nome:* ${name}\n` +
        `📱 *Contato:* ${phone}\n` +
        `🩺 *Área:* ${areaName}\n` +
        `🎯 *Especialidade:* ${spec}\n` +
        `👨‍⚕️ *Profissional:* ${doc}\n` +
        `💳 *Modalidade:* ${payment}\n` +
        `📅 *Preferência:* ${date} (${shift})\n\n` +
        `_Solicito confirmação de vaga com a recepção._`;

      const url = `https://wa.me/${clinicWhatsApp}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
      
      const modal = document.getElementById('booking-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }
}

/* ==========================================================================
   7. PHONE MASK
   ========================================================================== */
function initPhoneMasks() {
  const inputs = document.querySelectorAll('input[type="tel"]');
  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
      if (!x[2]) {
        e.target.value = x[1];
      } else {
        e.target.value = !x[3] ? `(${x[1]}) ${x[2]}` : `(${x[1]}) ${x[2]}-${x[3]}`;
      }
    });
  });
}

/* ==========================================================================
   8. WHATSAPP FLOATING WIDGET
   ========================================================================== */
function initWhatsAppWidget() {
  const btn = document.getElementById('whatsapp-toggle-btn');
  const popup = document.getElementById('whatsapp-popup');
  const close = document.getElementById('close-whatsapp-popup');

  if (!btn || !popup) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('hidden');
  });

  if (close) {
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.add('hidden');
    });
  }

  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && !btn.contains(e.target)) {
      popup.classList.add('hidden');
    }
  });
}

/* ==========================================================================
   9. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-button');
    const ans = item.querySelector('.faq-answer');
    const chev = item.querySelector('.faq-chevron');

    if (!btn || !ans) return;

    btn.addEventListener('click', () => {
      const isClosed = ans.classList.contains('hidden');

      // Close all others
      faqItems.forEach(other => {
        const otherAns = other.querySelector('.faq-answer');
        const otherChev = other.querySelector('.faq-chevron');
        if (otherAns && otherAns !== ans) {
          otherAns.classList.add('hidden');
          if (otherChev) otherChev.style.transform = 'rotate(0deg)';
        }
      });

      if (isClosed) {
        ans.classList.remove('hidden');
        if (chev) chev.style.transform = 'rotate(180deg)';
      } else {
        ans.classList.add('hidden');
        if (chev) chev.style.transform = 'rotate(0deg)';
      }
    });
  });
}
