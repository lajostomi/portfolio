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

  /* ---------- SPIN wheel ----------
     A flat wheel: 6 project cards sit 60deg apart around a circle/ellipse
     — six evenly spaced points already read as a hexagon composition
     without the cards needing to travel a hexagon's straight edges. The
     wheel's centre sits below the visible container, so only its top arc
     pokes through — one card dead-centre at the top (the "front" slot)
     with its two neighbours peeking in at the sides, matching the resting
     composition from the Figma design. Spinning rotates the whole wheel;
     cards sweep smoothly along that arc with a motion-blur that fades out
     as the wheel decelerates and settles on a randomly chosen project.
     Clicking the "SPIN" heading itself triggers it. */

  const spinTrigger = document.getElementById('spinTrigger');
  const wheel = document.getElementById('wheel');
  const wheelContainer = wheel ? wheel.closest('.wheel-container') : null;
  const wheelStage = wheel ? wheel.closest('.wheel-stage') : null;
  const spinSubtitle = document.getElementById('spinSubtitle');

  if (spinTrigger && wheel && wheelContainer) {
    const cards = Array.from(wheel.querySelectorAll('.wheel-card'));
    const baseAngle = cards.map((card) => Number(card.dataset.angle) || 0);

    // Card corner radius in the Figma design is a fixed 16px against a
    // 306px-wide card (~5.23%). A flat 16px doesn't scale down with the
    // card on small screens and starts looking like a pill instead of a
    // rounded rectangle, so recompute it from the stage's real rendered
    // width whenever it changes, keeping the same proportion at every size.
    //
    // The stage also gets a small top margin here: near the front slot a
    // rotated card's corners briefly swing above y=0 mid-spin (worst case
    // is ~4% of the stage's width, around a 10-15deg tilt), which the
    // container's top edge would otherwise clip.
    function updateWheelMetrics() {
      if (!wheelStage) return;
      const stageWidth = wheelStage.getBoundingClientRect().width;
      if (!stageWidth) return;
      const radius = stageWidth * 0.257 * (16 / 306);
      wheel.style.setProperty('--wheel-card-radius', radius.toFixed(2) + 'px');
      wheelStage.style.marginTop = (stageWidth * 0.045).toFixed(2) + 'px';
    }

    updateWheelMetrics();
    window.addEventListener('resize', updateWheelMetrics);

    // Apothem radii (centre-to-edge distance): six cards spaced 60deg
    // apart already reads as a hexagon by virtue of their count, so the
    // path each card actually travels stays a smooth circle/ellipse —
    // no polygon bulge, which was introducing a kink (and a visible
    // "jump") at every card's resting angle. The vertical radius is
    // pulled deeper than the original Figma coordinates so the arc reads
    // as a proper round curve (front card at the top, side neighbours
    // dipping well below it).
    const RX = 43; // horizontal radius, in % of the stage's width
    const RY = 95; // vertical radius, in % of the stage's height

    let currentRotation = 0; // accumulated wheel rotation, degrees
    let spinning = false;

    function toRad(deg) { return (deg * Math.PI) / 180; }

    function signedAngle(deg) {
      const a = ((deg % 360) + 360) % 360;
      return a > 180 ? a - 360 : a;
    }

    function applyFrame(rotation, blurPx) {
      cards.forEach((card, i) => {
        const angle = signedAngle(baseAngle[i] + rotation);
        const rad = toRad(angle);
        const x = 50 + RX * Math.sin(rad);
        const y = RY * (1 - Math.cos(rad));
        const opacity = Math.pow(Math.max(0, Math.cos(rad / 2)), 0.4);

        card.style.setProperty('--x', x.toFixed(2) + '%');
        card.style.setProperty('--y', y.toFixed(2) + '%');
        card.style.setProperty('--rot', angle.toFixed(2) + 'deg');
        card.style.setProperty('--op', opacity.toFixed(3));
        card.style.setProperty('--blur', blurPx.toFixed(2) + 'px');

        // Depth-order the cards by how close to "front" they are, so a
        // card sweeping past another always overlaps it correctly instead
        // of popping in front/behind due to fixed DOM order.
        card.style.zIndex = String(Math.round((Math.cos(rad) + 1) * 500));
      });
    }

    // Initial resting layout (equivalent to rotation = 0).
    applyFrame(currentRotation, 0);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeOutCubicDerivative(t) { return 3 * Math.pow(1 - t, 2); }

    function spin() {
      if (spinning) return;
      spinning = true;
      spinTrigger.setAttribute('disabled', 'true');
      wheelContainer.classList.add('is-spinning');
      if (spinSubtitle) spinSubtitle.textContent = 'spinning…';

      const targetIndex = Math.floor(Math.random() * cards.length);
      const extraSpins = 4 + Math.floor(Math.random() * 3); // 4–6 full turns
      const wrap = (((-baseAngle[targetIndex] - currentRotation) % 360) + 360) % 360;
      const startRotation = currentRotation;
      const deltaRotation = extraSpins * 360 + wrap;
      const targetRotation = startRotation + deltaRotation;

      const duration = 3200; // ms
      const maxBlur = 9; // px
      const start = performance.now();

      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(t);
        const rotation = startRotation + deltaRotation * eased;

        // Analytic angular speed from the easing derivative, used to
        // drive a motion-blur that's strongest mid-spin and fades to
        // zero as the wheel settles.
        const speed = (deltaRotation * easeOutCubicDerivative(t)) / (duration / 1000);
        const blurPx = Math.min(maxBlur, Math.abs(speed) / 260);

        applyFrame(rotation, t < 1 ? blurPx : 0);

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          currentRotation = signedAngle(targetRotation);
          spinning = false;
          spinTrigger.removeAttribute('disabled');
          wheelContainer.classList.remove('is-spinning');
          land(cards[targetIndex]);
        }
      }

      requestAnimationFrame(tick);
    }

    function land(frontCard) {
      const name = frontCard.dataset.name || frontCard.dataset.slug;
      if (spinSubtitle) spinSubtitle.textContent = 'landed on ' + name;

      // TODO: once each project has its own case-study page, navigate
      // straight there instead: window.location.href = frontCard.href;
    }

    spinTrigger.addEventListener('click', spin);
  }
})();
