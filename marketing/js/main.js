// API base for the marketing site's public endpoints (contact form, support tickets).
// The marketing site (dusuq.com) and the app/API (erp.dusuq.com) are different origins,
// so this must point at the app host. Override via window.DUSUQ_API_BASE if needed.
const DUSUQ_API_BASE = window.DUSUQ_API_BASE || 'https://erp.dusuq.com';

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

  // Contact form — saves the inquiry to the database via the public contact API.
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const success = document.getElementById('form-success');
      const error = document.getElementById('form-error');
      const btn = form.querySelector('button[type="submit"]');
      success && success.classList.remove('show');
      error && error.classList.remove('show');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      const fd = new FormData(form);
      const payload = {
        name: fd.get('name'),
        email: fd.get('email'),
        farm_name: fd.get('farm') || '',
        herd_size: fd.get('size') || '',
        message: fd.get('message'),
      };

      try {
        const res = await fetch(`${DUSUQ_API_BASE}/api/public/contact/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data.message?.[0] || data.email?.[0] || data.detail
            || (res.status === 429 ? 'Too many submissions — please try again later.' : 'Something went wrong. Please try again.');
          throw new Error(detail);
        }
        form.reset();
        if (success) success.classList.add('show');
      } catch (err) {
        if (error) {
          error.textContent = `⚠ ${err.message || 'Could not send your message. Please try again.'}`;
          error.classList.add('show');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }

  // Support ticket form — creates a public ticket via the support ticket API.
  const ticketForm = document.getElementById('ticket-form');
  if (ticketForm) {
    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const success = document.getElementById('ticket-success');
      const error = document.getElementById('ticket-error');
      const btn = ticketForm.querySelector('button[type="submit"]');
      success && success.classList.remove('show');
      error && error.classList.remove('show');
      btn.disabled = true;
      btn.textContent = 'Submitting…';

      const fd = new FormData(ticketForm);
      const payload = {
        organization_name: fd.get('organization_name'),
        account_username: fd.get('account_username'),
        email: fd.get('email'),
        subject: fd.get('subject'),
        description: fd.get('description'),
      };

      try {
        const res = await fetch(`${DUSUQ_API_BASE}/api/public/tickets/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail = data.description?.[0] || data.email?.[0] || data.detail
            || (res.status === 429 ? 'Too many submissions — please try again later.' : 'Something went wrong. Please try again.');
          throw new Error(detail);
        }
        ticketForm.reset();
        if (success) {
          success.textContent = `✓ Ticket ${data.ticket_number} submitted — save this reference to check its status.`;
          success.classList.add('show');
        }
      } catch (err) {
        if (error) {
          error.textContent = `⚠ ${err.message || 'Could not submit your ticket. Please try again.'}`;
          error.classList.add('show');
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Ticket';
      }
    });
  }

  // Ticket status lookup — checks a ticket's status by reference number.
  const lookupForm = document.getElementById('ticket-lookup-form');
  if (lookupForm) {
    lookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = document.getElementById('ticket-lookup-result');
      const fd = new FormData(lookupForm);
      const ticketNumber = (fd.get('ticket_number') || '').trim();
      if (!result) return;
      result.classList.remove('show');
      try {
        const res = await fetch(`${DUSUQ_API_BASE}/api/public/tickets/${encodeURIComponent(ticketNumber)}/`);
        if (!res.ok) throw new Error('No ticket found with that reference number.');
        const data = await res.json();
        result.innerHTML = `<strong>${data.ticket_number}</strong> — ${data.subject}<br>
          <span class="text-mono" style="font-size:12px;">Status: ${data.status_display || data.status}</span>`;
        result.classList.add('show');
      } catch (err) {
        result.innerHTML = `⚠ ${err.message}`;
        result.classList.add('show');
      }
    });
  }
});
