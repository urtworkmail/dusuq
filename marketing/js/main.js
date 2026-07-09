// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }

  // Announcement bar dismiss (persisted)
  const announce = document.querySelector('.announce');
  const announceClose = document.querySelector('.announce-close');
  if (announce) {
    if (localStorage.getItem('dc_announce_dismissed') === '1') announce.classList.add('hidden');
    if (announceClose) {
      announceClose.addEventListener('click', () => {
        announce.classList.add('hidden');
        localStorage.setItem('dc_announce_dismissed', '1');
      });
    }
  }

  // Docs: mobile sidebar toggle
  const docsToggle = document.querySelector('.docs-toggle');
  const docsSidebar = document.querySelector('.docs-sidebar');
  if (docsToggle && docsSidebar) {
    docsToggle.addEventListener('click', () => docsSidebar.classList.toggle('open'));
  }

  // Docs: scrollspy — highlight active sidebar link + toc link as sections pass
  const docsSections = document.querySelectorAll('.docs-section[id]');
  if (docsSections.length) {
    const sideLinks = document.querySelectorAll('.docs-nav-group a');
    const tocLinks = document.querySelectorAll('.docs-toc a');
    const setActive = (id) => {
      sideLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
      tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    };
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
      }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
      docsSections.forEach(s => spy.observe(s));
    }
    // Close mobile sidebar after a doc link is tapped
    sideLinks.forEach(a => a.addEventListener('click', () => docsSidebar && docsSidebar.classList.remove('open')));
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // Contact form — placeholder only for now (no external API wired up yet)
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = document.getElementById('form-success');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.textContent = 'Send Message';
        if (success) success.classList.add('show');
      }, 700);
    });
  }
});
