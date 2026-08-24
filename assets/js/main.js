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

  /* ---------- Sticky header height ----------
     .site-header is position:sticky, and #work/#contact use
     scroll-margin-top: var(--header-height) so an anchor jump (from the
     nav, or a cross-page index.html#work/#contact link) lands with the
     section title clear of the header instead of tucked underneath it.
     The header's real height shifts with the logo/gutter clamp() sizes
     across breakpoints, so it's measured rather than hardcoded. */
  const siteHeader = document.querySelector('.site-header');

  if (siteHeader) {
    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--header-height',
        siteHeader.getBoundingClientRect().height + 'px'
      );
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    /* Measuring once at parse time reads the header while it is still
       laid out in the fallback font. Plus Jakarta Sans arrives from
       Google Fonts afterwards, the logo's line box grows, and the header
       settles ~11px taller than the number already written to
       --header-height (measured: variable 72px, real height 83px). That
       stale value feeds #work/#contact's scroll-margin-top, so every
       anchor jump landed 11px high and the intended 24px of air under
       the sticky header became 13px. Re-measure once the webfonts are
       actually in. Guarded because document.fonts is unavailable in a
       few older browsers, where the initial measurement stands. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateHeaderHeight);
    }
  }

  /* ---------- Looping background videos (.auto-video) ----------
     Mercedes Aura carries three silent looping clips totalling ~22 MB.
     They used to be plain `autoplay loop muted playsinline` with no
     preload hint, so all 22 MB was fetched on page load.

     `preload="none"` alone does NOT fix that: an `autoplay` attribute
     outranks it, and the browser fetches anyway to satisfy autoplay.
     Measured on this page — preload="none" with autoplay still issued
     range requests for all three MP4s at load. So autoplay is gone from
     the markup and playback is driven from here instead: nothing is
     fetched until a clip is actually scrolled near, and the poster (now
     WebP) holds the frame until then.

     prefers-reduced-motion is honoured as a hard gate rather than a
     pause-after-the-fact: when it is set nothing is ever observed, so
     the videos neither play NOR download, and the poster is what the
     user sees. The query is also watched live, so toggling the OS
     setting mid-session pauses what is already running (and lets
     playback resume if it is turned back off).

     No-JS fallback: the poster still renders, so the section reads as a
     still image rather than breaking. */
  const autoVideos = Array.from(document.querySelectorAll('video.auto-video'));

  if (autoVideos.length) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer = null;

    const stopAll = () => {
      if (observer) { observer.disconnect(); observer = null; }
      autoVideos.forEach((v) => {
        v.pause();
        // Only reset a clip that actually has data. load() resets
        // readyState to HAVE_NOTHING, which is what makes the poster
        // render again instead of freezing on whatever frame was up when
        // reduced-motion switched on. But calling it on an untouched
        // video is not free: measured, load() on a preload="none"
        // element still kicks off a fetch and leaves readyState at
        // HAVE_ENOUGH_DATA, so the browser then paints the first frame
        // rather than the poster — the exact opposite of what the
        // reduced-motion path is for. Guarding on readyState keeps the
        // common case (reduced motion set before load) at zero requests.
        if (v.readyState > 0) v.load();
      });
    };

    const startObserving = () => {
      if (observer || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) {
            // play() rejects on some browsers/policies; ignore, the
            // poster simply stays put.
            const p = v.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            v.pause();
          }
        });
      }, { rootMargin: '200px 0px' });
      autoVideos.forEach((v) => observer.observe(v));
    };

    const apply = () => {
      if (reduceMotion.matches) stopAll();
      else startObserving();
    };

    apply();
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', apply);
    else if (reduceMotion.addListener) reduceMotion.addListener(apply); // Safari < 14
  }

  /* ---------- CLOSE button: back to carousel vs. WORK grid ----------
     A project page's CLOSE pill normally returns to index.html#work (the
     WORK grid), but if this page was reached by landing on a SPIN wheel
     card — either by spinning and auto-navigating, or clicking a resting
     card directly — index.html's wheel-card hrefs carry a #from-spin
     fragment, and CLOSE should instead return to the carousel itself
     (plain index.html, which is the SPIN section since it's the page's
     first section) rather than jump straight past it to WORK. A hash
     fragment is used instead of a ?query param specifically because it
     survives the local dev server's clean-URL redirect (foo.html ->
     foo): that redirect's Location header only rewrites the path, and a
     fragment is never sent to the server in the first place, so the
     browser reapplies it after following the redirect — a query string
     would otherwise get silently dropped. */
  const closeLink = document.querySelector('a.footer-pill--dark[href$="index.html#work"]');

  if (closeLink && window.location.hash === '#from-spin') {
    closeLink.href = closeLink.href.replace(/index\.html#work$/, 'index.html');
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
    // container's top edge would otherwise clip. That headroom sits inside
    // wheel-container (so it stays available for the swing to clip against
    // instead of the section's flex gap), but it also pushes the resting
    // card down visually, widening the SPIN-arrow-to-card gap past the
    // section's own 32px gap. Pull wheel-container up by the same amount
    // so the resting card lands exactly 32px below the arrow while the
    // headroom itself — still inside the container's clip box — is
    // untouched for mid-spin use.
    function updateWheelMetrics() {
      if (!wheelStage || !wheelContainer) return;
      const stageWidth = wheelStage.getBoundingClientRect().width;
      if (!stageWidth) return;
      const radius = stageWidth * 0.257 * (16 / 306);
      const headroom = stageWidth * 0.045;
      wheel.style.setProperty('--wheel-card-radius', radius.toFixed(2) + 'px');
      wheelStage.style.marginTop = headroom.toFixed(2) + 'px';
      wheelContainer.style.marginTop = (-headroom).toFixed(2) + 'px';
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

      // Give the "landed on …" text a beat to register before leaving
      // the page for the chosen project's case study.
      if (frontCard.href) {
        window.setTimeout(() => {
          window.location.href = frontCard.href;
        }, 700);
      }
    }

    spinTrigger.addEventListener('click', spin);
  }
})();
