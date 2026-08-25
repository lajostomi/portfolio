/* =========================================================
   Lajos Tamás Jakab — Portfolio
   Landing page interactions: mobile nav + SPIN wheel
   ========================================================= */

(function () {
  'use strict';

  /* One shared query for every animated thing on the page. The CSS side
     of reduced motion (the body fade, the .spin-arrow bob, smooth
     scrolling) lives in style.css; this covers the two features CSS
     cannot reach — the SPIN wheel, which is animated frame by frame in
     JS, and the Mercedes Aura videos, whose playback has to be gated
     rather than styled. Read live rather than cached as a boolean, so
     toggling the OS setting mid-session takes effect. */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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

    /* A real play control on every clip, because autoplay is not reliable
       and its failure is silent.

       Measured cause: Chrome rejects the play() above with "AbortError: the
       play() request was interrupted because video-only background media was
       paused to save power" — its power-saving rule for muted, audio-less
       video, which fires on battery and on unfocused tabs. The catch() there
       swallowed it, so all three clips sat on their posters looking like
       stills and nothing appeared in the console. Same on a phone in battery
       saver, which is where this was reported from.

       So autoplay stays as the nice-to-have and this becomes the guarantee:
       a press is a user gesture, which no autoplay or power policy blocks.
       Built here rather than in the markup so that with JS off the page
       keeps its current behaviour (poster only) instead of showing a button
       that cannot work.

       Visibility follows the familiar player convention rather than being
       tied to playback: the control shows itself when there is a decision to
       make and gets out of the way when there is not.

         - paused: shown, and it stays shown. A paused clip with no visible
           way to start it is a dead end.
         - playing: shown just long enough to read the state change, then
           faded out after AUTO_HIDE_MS.
         - tapping inside the frame: toggles it back on or off. Tapping on
           while playing restarts the auto-hide countdown, so it does not
           linger after being summoned.
         - tapping anywhere outside: dismisses it, same as tapping off a
           menu.

       Hover and keyboard focus also reveal it, and it is never removed from
       the DOM or made unfocusable while hidden — only faded and made
       click-through — so tabbing to it still works when it cannot be seen. */
    const AUTO_HIDE_MS = 1600;

    /* The two glyphs, in one place: these are placeholders and are meant to
       be swapped for supplied artwork. Keep the 24x24 viewBox (the CSS sizes
       the <svg>, not the path) and keep `fill="currentColor"` so the glyph
       keeps taking its colour from the button. */
    const ICON_PLAY = 'M8 5v14l11-7z';
    const ICON_PAUSE = 'M7 5h4v14H7zM13 5h4v14h-4z';

    const controlled = [];

    const buildControls = () => {
      autoVideos.forEach((video) => {
        const holder = video.parentElement;
        if (!holder || holder.querySelector('.video-play')) return;
        holder.classList.add('video-holder');

        const label = video.getAttribute('aria-label') || 'video';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'video-play';
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path class="video-play-icon" d="' + ICON_PLAY + '" fill="currentColor"/></svg>';

        let hideTimer = null;
        const clearHideTimer = () => {
          if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        };

        const show = () => {
          clearHideTimer();
          holder.classList.add('controls-visible');
          // Only a playing clip hides itself again; a paused one has to keep
          // offering the way to start it.
          if (!video.paused) hideTimer = setTimeout(hide, AUTO_HIDE_MS);
        };

        const hide = () => {
          clearHideTimer();
          holder.classList.remove('controls-visible');
        };

        const sync = () => {
          const playing = !video.paused;
          holder.classList.toggle('is-playing', playing);
          button.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + label);
          button.querySelector('.video-play-icon')
            .setAttribute('d', playing ? ICON_PAUSE : ICON_PLAY);
        };

        button.addEventListener('click', (event) => {
          event.stopPropagation();
          if (video.paused) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            video.pause();
          }
        });

        /* Inside the frame toggles the control rather than playback. Playback
           has its own button a few pixels away, and a frame-wide play/pause
           target makes it far too easy to stop a clip while trying to bring
           the controls back. */
        video.addEventListener('click', (event) => {
          event.stopPropagation();
          if (holder.classList.contains('controls-visible')) hide();
          else show();
        });

        // Reveal on the state change itself, so the icon flip is seen before
        // it fades; `show` schedules the countdown when it is playing.
        video.addEventListener('play', () => { sync(); show(); });
        video.addEventListener('pause', () => { sync(); show(); });
        button.addEventListener('focus', show);

        holder.appendChild(button);
        controlled.push({ holder: holder, hide: hide });
        sync();
        show();
      });
    };

    /* Anywhere outside a clip dismisses whatever is showing. Both handlers
       above stop propagation, so this only ever sees genuine outside taps. */
    if (autoVideos.length) {
      document.addEventListener('click', () => {
        controlled.forEach((c) => {
          // Leave a paused clip's control alone: hiding it would strand the
          // clip with no visible way to start.
          const video = c.holder.querySelector('video');
          if (video && video.paused) return;
          c.hide();
        });
      });
    }

    const apply = () => {
      if (reduceMotion.matches) stopAll();
      else startObserving();
    };

    buildControls();
    apply();
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', apply);
    else if (reduceMotion.addListener) reduceMotion.addListener(apply); // Safari < 14
  }

  /* ---------- Sticky project-footer height ----------
     .project-footer is position:sticky over the content, so .project-page
     needs bottom padding at least as tall as the footer or the pills sit
     on top of the last section. That padding used to be hand-tuned
     numbers (a clamp, plus a flat 180px below 600px) measured against a
     footer that happened to be 90px on one line and 147px on two.

     Those numbers do not survive an edit. Temporarily relabelling this
     pill during the header work made the group wider and pushed it to
     three lines on small phones (205px, overrunning the 180px padding by
     25px) and to two lines around 700px (147px against ~98px, a 50px
     overrun) — a caption change silently reintroducing the exact overlap
     bug the padding existed to prevent. The label is back to CLOSE, but
     the lesson stands and the measurement stays.

     Measuring the real height instead means the padding tracks whatever
     the footer actually does, at any width, after any future label or
     breakpoint change. Same approach as --header-height above, including
     the fonts.ready re-measure: the pills are text, so their wrap point
     moves once the webfont replaces the fallback. */
  const projectFooter = document.querySelector(".project-footer");

  if (projectFooter) {
    const updateFooterHeight = () => {
      document.documentElement.style.setProperty(
        "--footer-height",
        projectFooter.getBoundingClientRect().height + "px"
      );
    };

    updateFooterHeight();
    window.addEventListener("resize", updateFooterHeight);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateFooterHeight);
    }
  }
  /* ---------- CLOSE pill: carousel vs. WORK grid ----------
     The header added to these pages also links to index.html#work, but
     it carries .nav-link, so it cannot be picked up by this
     .footer-pill--dark selector by accident.

     The pill normally returns to index.html#work (the WORK grid), but if
     this page was reached from a SPIN wheel card — by spinning, or by
     clicking a resting card directly — index.html’s wheel-card hrefs
     carry a #from-spin fragment, and it should return to the carousel
     itself (plain index.html, which is the SPIN section since it is the
     page’s first section) rather than jump straight past it to WORK. A
     hash fragment is used instead of a ?query param specifically because
     it survives the local dev server’s clean-URL redirect (foo.html ->
     foo): that redirect’s Location header only rewrites the path, and a
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

      const targetIndex = Math.floor(Math.random() * cards.length);

      /* Reduced motion: no 3.2s sweep and no motion blur at all — jump
         straight to the state the wheel would have landed in. The whole
         point of the animation is the spinning sensation, which is
         exactly what someone asking for reduced motion is asking not to
         be shown, so degrading it (shorter, slower, less blur) would
         miss the point. The outcome is identical: the chosen card ends
         up in the front slot and land() announces it. */
      if (reduceMotion.matches) {
        currentRotation = signedAngle(-baseAngle[targetIndex]);
        applyFrame(currentRotation, 0);
        land(cards[targetIndex]);
        return;
      }

      spinning = true;
      spinTrigger.setAttribute('disabled', 'true');
      wheelContainer.classList.add('is-spinning');
      if (spinSubtitle) spinSubtitle.textContent = 'spinning…';

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

    /* SPIN is a slot machine: it opens the project it landed on rather
       than asking permission. The delay below exists purely so the result
       is readable before the page changes.

       History, so it isn't re-litigated: the first version navigated on a
       700ms timer, which is too fast to read a project name — the result
       flashed and was gone. That was replaced by requiring a keypress
       ("press Enter to open"), which fixed the speed but told touch users
       to press a key their device doesn't have, and put friction on the
       one interaction meant to feel effortless. This version keeps the
       automatic open and fixes the readability instead: the subtitle
       states what's happening in plain language, and OPEN_DELAY gives it
       time to be read.

       Known trade-off, accepted deliberately: there is no visible way to
       stop the pending navigation. Escape works but is undiscoverable, so
       it's a safety valve rather than a real affordance. */
    const OPEN_DELAY = 3000; // ms — time to read the result before opening
    let openTimer = null;

    function clearPendingOpen() {
      if (!openTimer) return;
      clearTimeout(openTimer);
      openTimer = null;
    }

    function land(frontCard) {
      const name = frontCard.dataset.name || frontCard.dataset.slug;
      if (spinSubtitle) spinSubtitle.textContent = 'opening ' + name + '…';

      // Not preventScroll: if the wheel is off-screen (the user spun,
      // then scrolled), bringing the landed card into view is the point.
      frontCard.focus();

      openTimer = setTimeout(function () {
        openTimer = null;
        window.location.href = frontCard.href;
      }, OPEN_DELAY);
    }

    spinTrigger.addEventListener('click', function () {
      // Spinning again during the delay means "not that one" — drop the
      // pending navigation or it fires mid-sweep and opens the old result.
      clearPendingOpen();
      spin();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !openTimer) return;
      clearPendingOpen();
      if (spinSubtitle) spinSubtitle.textContent = 'land on a\u00a0random project';
    });
  }
})();
