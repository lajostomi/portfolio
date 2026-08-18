/* =========================================================
   Lajos Tamás Jakab — Portfolio
   Landing page interactions: mobile nav + SPIN wheel
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- SPIN wheel ---------- */
  const spinTrigger = document.getElementById('spinTrigger');
  const wheel = document.getElementById('wheel');

  if (spinTrigger && wheel) {
    const cards = Array.from(wheel.querySelectorAll('.wheel-card'));

    // Capture each card's resting slot (position + rotation) so we can
    // shuffle images between slots instead of physically moving elements.
    const slots = cards.map((card) => ({
      x: card.style.getPropertyValue('--x'),
      y: card.style.getPropertyValue('--y'),
      rot: card.style.getPropertyValue('--rot'),
    }));

    let spinning = false;

    function shuffle(array) {
      const a = array.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    spinTrigger.addEventListener('click', () => {
      if (spinning) return;
      spinning = true;
      wheel.classList.add('is-spinning');

      const order = shuffle(cards);

      // A couple of quick shuffles to sell the "spin", then a final
      // settle where the randomly chosen project lands in the front slot.
      let step = 0;
      const totalSteps = 3;

      const runStep = () => {
        const arrangement = step === totalSteps - 1 ? order : shuffle(cards);
        arrangement.forEach((card, i) => {
          card.style.setProperty('--x', slots[i].x);
          card.style.setProperty('--y', slots[i].y);
          card.style.setProperty('--rot', slots[i].rot);
          card.classList.toggle('is-front', i === 4); // slot-5 is the front slot
        });

        step += 1;
        if (step < totalSteps) {
          setTimeout(runStep, 260);
        } else {
          setTimeout(() => {
            wheel.classList.remove('is-spinning');
            spinning = false;
            landOnFrontProject();
          }, 900);
        }
      };

      runStep();
    });

    function landOnFrontProject() {
      const front = wheel.querySelector('.wheel-card.is-front') || cards[4];
      const slug = front.dataset.slug;
      if (!slug) return;

      const match = document.querySelector('.project-card[data-slug="' + slug + '"]');
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        match.classList.remove('is-landed');
        // restart animation
        void match.offsetWidth;
        match.classList.add('is-landed');
      }
    }
  }
})();
