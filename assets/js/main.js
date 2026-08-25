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

  /* ---------- Restore smooth scrolling after the initial hash jump ----------
     index.html's own inline <head> script turns scroll-behavior off before
     the browser's scroll-to-fragment-on-load runs, so a page loaded with a
     hash (CLOSE returning to #work-<slug>, a cross-page #contact link, ...)
     jumps straight there instead of animating down the full page height.
     That inline style wins over style.css's html{scroll-behavior:smooth}
     regardless of load order, so it has to be cleared again once that one
     jump is done, or every later in-page anchor click (WORK/CONTACT nav,
     footer pills) would lose its smooth animation too. `load` (not
     DOMContentLoaded) because the browser keeps re-scrolling to the
     fragment target as late-loading images/fonts shift the layout, right
     up to the load event; a no-op on any page that started without a
     hash, since the inline style was never set. */
  window.addEventListener('load', () => {
    document.documentElement.style.scrollBehavior = '';
  });

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

         - playing: shown just long enough to read the state change, then
           faded out after AUTO_HIDE_MS.
         - paused: shown, and no timer runs — nothing takes it away on its
           own, because a clip that is not running has a decision pending.
         - tapping inside the frame: toggles it, whatever the playback state.
           Tapping it on while playing restarts the countdown, so a summoned
           control does not linger.
         - tapping anywhere outside: dismisses it, the way tapping off a menu
           does — including on a paused clip. That can leave a paused clip
           with nothing on screen, which is fine: a tap on the frame brings
           it straight back, and every clip starts out showing its control.

       Note there is deliberately no hover reveal in the CSS. One used to be
       there and it quietly beat every tap-to-hide, since the pointer is over
       the frame by definition right after you tap it.

       Keyboard focus does still reveal it, and it is never removed from the
       DOM or made unfocusable while hidden — only faded and made
       click-through — so tabbing to it still works when it cannot be seen. */
    const AUTO_HIDE_MS = 1600;

    /* The supplied artwork, inlined. The design source of truth is
       assets/images/icons/video-play.svg and video-pause.svg — these strings
       are the inside of those two files and must be kept in step with them.

       Inlined rather than referenced as <img src>, because this file is
       shared by pages at two different depths (/index.html and
       /projects/*.html) and a relative icon path correct for one is broken
       on the other. Inline markup has no path to get wrong, and costs two
       fewer requests.

       Each icon draws its own rounded plate as well as its glyph, so the
       button underneath is a bare 32x32 box — see project.css. Colours are
       baked (#1A1818 plate, #EDE5E5 glyph) exactly as exported, rather than
       inheriting currentColor, so the control keeps its intended contrast
       over any frame of any clip. */
    const ICON_PLAY =
      '<path d="M0 6C0 2.68629 2.68629 0 6 0H26C29.3137 0 32 2.68629 32 6V26C32 29.3137 29.3137 32 26 32H6C2.68629 32 0 29.3137 0 26V6Z" fill="#1A1818"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M13.3373 9.86812C13.3453 9.87344 13.3533 9.87877 13.3613 9.88411L20.3938 14.5724C20.5973 14.7081 20.786 14.8338 20.9309 14.9507C21.0821 15.0726 21.2603 15.2418 21.3629 15.4892C21.4986 15.8162 21.4986 16.1837 21.3629 16.5107C21.2603 16.7581 21.0821 16.9272 20.9309 17.0492C20.786 17.166 20.5973 17.2918 20.3938 17.4274L13.3374 22.1317C13.0886 22.2975 12.865 22.4467 12.6752 22.5495C12.4853 22.6524 12.2246 22.77 11.9204 22.7519C11.5312 22.7286 11.1717 22.5362 10.9365 22.2253C10.7526 21.9822 10.7059 21.7001 10.6862 21.485C10.6665 21.2701 10.6665 21.0013 10.6665 20.7023L10.6665 11.3263C10.6665 11.3167 10.6665 11.3071 10.6665 11.2975C10.6665 10.9986 10.6665 10.7298 10.6862 10.5148C10.7059 10.2997 10.7526 10.0176 10.9365 9.77452C11.1717 9.4636 11.5312 9.2712 11.9204 9.24796C12.2246 9.2298 12.4853 9.34741 12.6752 9.45033C12.865 9.55317 13.0886 9.70229 13.3373 9.86812Z" fill="#EDE5E5"/>';
    const ICON_PAUSE =
      '<path d="M0 6C0 2.68629 2.68629 0 6 0H26C29.3137 0 32 2.68629 32 6V26C32 29.3137 29.3137 32 26 32H6C2.68629 32 0 29.3137 0 26V6Z" fill="#1A1818"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 9C13.1046 9 14 9.89543 14 11V21C14 22.1046 13.1046 23 12 23C10.8954 23 10 22.1046 10 21V11C10 9.89543 10.8954 9 12 9ZM20 9C21.1046 9 22 9.89543 22 11V21C22 22.1046 21.1046 23 20 23C18.8954 23 18 22.1046 18 21V11C18 9.89543 18.8954 9 20 9Z" fill="#EDE5E5"/>';

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
          '<svg class="video-play-icon" viewBox="0 0 32 32" aria-hidden="true" ' +
          'focusable="false">' + ICON_PLAY + '</svg>';

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
          button.querySelector('.video-play-icon').innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        };

        /* One retry, because the FIRST press on a clip reliably lost.
           preload="none" means there is no buffered data yet, so that first
           play() runs while the file is still being fetched — and Chrome's
           power-saving rule aborts a video-only play() in that window. The
           rejection is silent, so the press simply did nothing and only a
           second press worked, by which time enough had buffered. Worse, if
           the user pressed twice (as they would), the second press landed
           after the first had finally started and paused it again.

           Retrying once shortly after covers the buffering gap without
           giving up preload="none", which is what keeps 22MB of video off
           the initial page load. */
        const requestPlay = () => {
          const first = video.play();
          if (first && typeof first.catch === 'function') {
            first.catch(() => {
              setTimeout(() => {
                if (!video.paused) return;
                const retry = video.play();
                if (retry && typeof retry.catch === 'function') retry.catch(() => {});
              }, 250);
            });
          }
        };

        button.addEventListener('click', (event) => {
          event.stopPropagation();
          if (video.paused) requestPlay();
          else video.pause();
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

    /* Anywhere outside a clip dismisses whatever is showing, paused or not.
       Both handlers above stop propagation, so this only ever sees genuine
       outside taps. A paused clip can therefore end up with no control on
       screen — that is intended, since a tap on the frame brings it back,
       and every clip starts with its control showing. */
    if (autoVideos.length) {
      document.addEventListener('click', () => {
        controlled.forEach((c) => c.hide());
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
  /* ---------- CLOSE pill: carousel vs. WORK grid vs. the exact card ----------
     The header added to these pages also links to index.html#work, but
     it carries .nav-link, so it cannot be picked up by this
     .footer-pill--dark selector by accident.

     The pill normally returns to index.html#work (the WORK grid). Two
     origins override that:

     - Reached from a SPIN wheel card — by spinning, or by clicking a
       resting card directly — index.html's wheel-card hrefs carry a
       #from-spin fragment, and it should return to the carousel itself
       (plain index.html, the page's first section) rather than jump
       straight past it to WORK.
     - Reached from a WORK grid card directly, every card's own href
       carries #from-work, and CLOSE should land back on that exact card
       (id="work-<slug>", set alongside each card's existing data-slug in
       index.html) rather than the top of #work — on a page with more
       cards than fit one screen, jumping to the section top instead of
       back to where the user actually was reads as losing your place.
       The slug isn't passed along explicitly; it's read back off this
       very page's own filename (this page IS projects/<slug>.html), so
       there's exactly one place per project that has to stay in sync.

     A hash fragment is used instead of a ?query param specifically
     because it survives the local dev server's clean-URL redirect
     (foo.html -> foo): that redirect's Location header only rewrites the
     path, and a fragment is never sent to the server in the first place,
     so the browser reapplies it after following the redirect — a query
     string would otherwise get silently dropped. */
  const closeLink = document.querySelector('a.footer-pill--dark[href$="index.html#work"]');

  if (closeLink && window.location.hash === '#from-spin') {
    closeLink.href = closeLink.href.replace(/index\.html#work$/, 'index.html');
  } else if (closeLink && window.location.hash === '#from-work') {
    const slug = window.location.pathname.split('/').pop().replace(/\.html$/, '');
    closeLink.href = closeLink.href.replace(/index\.html#work$/, `index.html#work-${slug}`);
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
