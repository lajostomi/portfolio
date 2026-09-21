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
     hash (CLOSE returning to #return-<slug>, a cross-page #contact link, ...)
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

  /* The CLOSE / NEXT PROJECT footer, used by the scroll-direction auto-hide
     below. (This block used to also measure the footer's height into
     --footer-height for .project-page's bottom padding; that padding is now
     the site-wide --page-end instead, so the measurement had no consumer.) */
  const projectFooter = document.querySelector(".project-footer");

  /* ---------- Auto-hide the sticky bars by scroll direction ----------
     Both persistent bars — the header at the top, the CLOSE / NEXT PROJECT
     pills at the bottom — slide away while the reader is moving down the
     page and come back the moment they scroll up. On a project page the two
     together hold a fifth of a desktop viewport and a third of a phone's,
     permanently, over content that is mostly full-bleed imagery; getting
     them out of the way while someone is reading forward is the point, and
     scrolling up is a reliable signal that they want navigation again.

     The bars are moved with a class (CSS owns the transform and the
     easing), so this stays a state machine and nothing here touches style.

     Deliberate rules, each one earning its place:

       - A 6px dead zone. Trackpad and touch scrolling produce constant
         1-2px direction reversals; without a threshold the bars flicker
         on and off around every one of them.
       - Always visible in the top zone. Above one header height there is
         no content hidden behind the header anyway, and a page that opens
         with its own navigation missing looks broken.
       - Always visible at the end of the document. The footer is a real
         sticky footer: at the bottom of the scroll it unsticks and becomes
         the last thing on the page. Hiding it there would hide actual page
         content, not an overlay.
       - Keyboard focus wins over scroll. Tabbing into a hidden bar (its
         links stay in the tab order) brings it back, and a bar holding
         keyboard focus is not parked while the reader scrolls, so a focus
         ring never ends up off-screen. It has to be KEYBOARD focus
         specifically: clicking a link leaves it focused too, and on a
         plain activeElement test that one click would pin its bar open
         for the rest of the session.
       - The open mobile nav pins the header. The overlay lives inside the
         header; sliding its container away mid-menu would take the menu
         with it.
       - A bar that is not stuck to a viewport edge is left alone entirely
         (isHidable below).
       - Reduced motion opts out entirely (see style.css for the matching
         CSS guard) — see the note there for why disabling beats snapping.

     Reads are batched into a rAF callback so a fast scroll does layout
     work once per frame rather than once per event. */
  const autoHideBars = [siteHeader, projectFooter].filter(Boolean);

  if (autoHideBars.length) {
    const DEAD_ZONE = 6;
    /* How close to the document's end counts as "at the bottom". Roughly a
       pill's height: enough that the last scroll tick before the true end
       does not flash the footer away and straight back. */
    const BOTTOM_ZONE = 64;

    let lastY = window.scrollY;
    let ticking = false;

    /* Scrolls the reader did not make are not a direction. Arriving on a
       page the browser (or main.js, returning to a WORK card) positions it
       mid-page, and that jump used to read as "scrolling down" and slide
       the header away a moment after the page appeared. Until the reader
       has touched, scrolled or pressed something — or the page has been
       settled for a moment after load, for anyone driving the scrollbar,
       which reports no input event to the page — a scroll only moves the
       baseline. */
    let settled = false;
    const settle = () => { settled = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
      window.addEventListener(type, settle, { passive: true, once: true }));
    const settleAfterLoad = () => setTimeout(settle, 400);
    if (document.readyState === 'complete') settleAfterLoad();
    else window.addEventListener('load', settleAfterLoad, { once: true });

    const isHidable = (bar) => {
      /* Only a bar pinned to a viewport edge may be translated. Anything
         still in the flow scrolls away by itself, and moving it would drag
         real page content around — which is the 404 page's footer, where
         this markup is reused without project.css's sticky positioning. */
      const position = window.getComputedStyle(bar).position;
      return position === 'sticky' || position === 'fixed';
    };

    /* Which input device put focus where it is. This is the same question
       :focus-visible answers, tracked by hand instead: the pseudo-class is
       a heuristic the browser will not let script observe reliably, and
       this rule needs a definite answer. Set by the keys that move focus
       or scroll (Tab, the arrows, Page/Home/End, Space), cleared by any
       pointer press — a click is the case that must NOT count as keyboard
       focus. Listening on the capture phase so it is already up to date by
       the time the focusin and scroll handlers below read it. */
    let keyboardNavigating = false;
    const NAV_KEYS = /^(Tab|Arrow|Page|Home|End| )/;

    document.addEventListener('keydown', (event) => {
      if (NAV_KEYS.test(event.key)) keyboardNavigating = true;
    }, true);

    document.addEventListener('pointerdown', () => {
      keyboardNavigating = false;
    }, true);

    const hasKeyboardFocus = (bar) =>
      keyboardNavigating && bar.contains(document.activeElement);

    const setHidden = (bar, hidden) => {
      bar.classList.toggle('is-hidden', hidden);
    };

    const showAll = () => autoHideBars.forEach((bar) => setHidden(bar, false));

    const update = () => {
      ticking = false;

      const y = Math.max(0, window.scrollY);
      if (!settled) { lastY = y; return; }
      const delta = y - lastY;

      if (Math.abs(delta) < DEAD_ZONE) return;
      lastY = y;

      if (reduceMotion.matches || (navMenu && navMenu.classList.contains('is-open'))) {
        showAll();
        return;
      }

      const scrollingDown = delta > 0;
      const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = maxScroll - y <= BOTTOM_ZONE;

      autoHideBars.forEach((bar) => {
        if (!isHidable(bar)) {
          setHidden(bar, false);
          return;
        }

        /* The bar holding keyboard focus stays put whichever way the page
           is moving — including the case where the scroll was *caused* by
           focusing it. */
        if (hasKeyboardFocus(bar)) {
          setHidden(bar, false);
          return;
        }

        if (bar === projectFooter && atBottom) {
          setHidden(bar, false);
          return;
        }

        if (bar === siteHeader && y <= headerHeight) {
          setHidden(bar, false);
          return;
        }

        setHidden(bar, scrollingDown);
      });
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    /* Focus moving into a parked bar (Tab from the page body reaches the
       footer pills, Shift+Tab reaches the header links) brings it back
       immediately rather than at the next scroll tick. */
    document.addEventListener('focusin', (event) => {
      /* Any focusin, not just a keyboard one: focus landing inside a bar
         is always a reason to show it, and on a mouse click the bar was
         visible anyway, so this costs nothing. Only the *holding* rule
         above has to distinguish the two. */
      autoHideBars.forEach((bar) => {
        if (bar.contains(event.target)) setHidden(bar, false);
      });
    });

    /* The mobile nav overlay is a fixed, viewport-filling element INSIDE
       the header, so while it is open the header must be both shown and
       free of any transform — see .site-header.is-nav-open in style.css for
       what goes wrong otherwise and why the class exists.

       Driven off a MutationObserver rather than off the toggle button's
       click, because the button is only one of the ways .is-open changes:
       every link in the menu closes it too, and anything added later would
       have to remember to call this. Watching the class itself cannot fall
       out of step. */
    if (navMenu && siteHeader && window.MutationObserver) {
      const syncNavOpen = () => {
        const open = navMenu.classList.contains('is-open');
        siteHeader.classList.toggle('is-nav-open', open);
        if (open) showAll();
      };

      new MutationObserver(syncNavOpen).observe(navMenu, {
        attributes: true,
        attributeFilter: ['class']
      });

      syncNavOpen();
    }

    /* A resize can turn a sticky bar static (or back), which would strand a
       translated element. Cheapest correct answer: show everything and let
       the next scroll re-decide. */
    window.addEventListener('resize', showAll);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', showAll);
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
    closeLink.href = closeLink.href.replace(/index\.html#work$/, `index.html#return-${slug}`);
  }

  /* CLOSE as "back", when back IS the landing page. Following the link
     above scrolls #work-<slug> to the top of the screen — the card is in
     view, but not where the user left it, so the page visibly jumps. When
     the history entry right behind this one is index.html, going back
     instead returns to the exact scroll position (usually straight from
     the back/forward cache), and the page transition still shrinks the
     hero into the card, since the card is where it was. The href stays
     the fallback: opened from a shared link, a new tab, or after NEXT
     PROJECT, "back" would not be the landing page, and the link is used.
     Needs the Navigation API to see the previous entry; without it (older
     Safari/Firefox) the link is used as before. Modified clicks (new tab)
     are left alone. */
  if (closeLink && window.navigation && navigation.currentEntry) {
    const pageOf = (url) => url.pathname.replace(/(index)?(\.html)?$/, '');

    closeLink.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const previous = navigation.entries()[navigation.currentEntry.index - 1];
      if (!previous || !previous.url) return;
      const prevUrl = new URL(previous.url);
      const home = new URL(closeLink.href);
      if (prevUrl.origin !== home.origin || pageOf(prevUrl) !== pageOf(home)) return;
      event.preventDefault();
      navigation.back();
    });
  }

  /* ---------- Returning to a WORK card lands exactly where you left ----------
     Two ways back, and the page positions the card itself on both.

     1. History (CLOSE uses navigation.back() where the Navigation API
        exists — iOS 26.2+, Chrome — and the browser's own Back button).
        This used to be left to the browser's scroll restoration, and on an
        iPhone that is what jumped: the restore can land AFTER the page has
        first appeared, and then it is animated, because html has
        scroll-behavior: smooth — the page visibly scrolled down from the
        top to the card (logged: scrollY 0 at first paint, then 2, 9, 24 ...
        414). iOS also has no scroll anchoring at all, so anything above the
        card that settles late (the webfont swapping in) shifts it on screen,
        where Chrome silently compensates. So tapping a WORK card switches
        the browser's restoration off for this page (scrollRestoration
        'manual') and remembers where the card was; coming back through
        history, main.js — render-blocking, so before the first frame —
        puts it there instantly and then pins it (below). Leaving the page
        any other way hands restoration back to the browser.

     2. CLOSE's link, where there is no Navigation API. That link used to
     be index.html#work-<slug>, and a fragment makes the browser put the card
     at the top of the screen: 81px down on a phone, when it had been at
     321px. The whole page visibly jumped 240px, and the hero shrank into a
     card that then moved.

     So the link carries #return-<slug>, which matches no element and makes
     the browser scroll nowhere, and this places the card itself: at the
     same distance from the top of the screen as when it was tapped
     (remembered below), or — opened from a shared link, with nothing
     remembered — just under the header, as #work-<slug> did. It runs while
     main.js is still render-blocking, so the first frame, and the snapshot
     the page transition shrinks the hero into, already has the card in
     place. The address bar is then set back to #work-<slug>, so what gets
     bookmarked or shared is the real anchor — but only once the page has
     loaded. Until then the browser is still retrying the navigation's
     fragment scroll against the document's CURRENT fragment, so renaming
     it any earlier made the browser scroll to #work-<slug> itself and put
     the card back at the top, undoing all of this. */
  const RETURN_KEY = 'workReturn';
  const workCards = document.querySelectorAll('a.project-card[id^="work-"]');
  let leavingViaCard = false;

  workCards.forEach((card) => {
    card.addEventListener('click', () => {
      leavingViaCard = true;
      try {
        history.scrollRestoration = 'manual';
        sessionStorage.setItem(RETURN_KEY, JSON.stringify({
          slug: card.id.slice('work-'.length),
          top: card.getBoundingClientRect().top,
        }));
      } catch (e) { /* the fallback below still lands on the card */ }
    });
  });

  if (workCards.length) {
    // Left some other way (ABOUT, CONTACT, an outside link): the next return
    // is the browser's to restore, and what was remembered no longer applies.
    window.addEventListener('pagehide', () => {
      if (leavingViaCard) return;
      try {
        history.scrollRestoration = 'auto';
        sessionStorage.removeItem(RETURN_KEY);
      } catch (e) { /* nothing to undo */ }
    });
    /* Restored from the back/forward cache — which is how an iPhone comes
       back (measured on iOS 26.6: persisted=true). No script re-runs, and
       with scrollRestoration 'manual' WebKit brings the page back at the
       TOP (scrollY 0, the tapped card 1303px down), so the card has to be
       placed here too. pageshow fires before the restored page's first
       frame, so this lands before anything is seen. */
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      leavingViaCard = false;
      let saved = null;
      try { saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null'); } catch (e) { /* none */ }
      const card = saved && document.getElementById('work-' + saved.slug);
      if (card) holdCard(card, saved.top);
    });
  }

  let remembered = null;
  try { remembered = JSON.parse(sessionStorage.getItem(RETURN_KEY) || 'null'); } catch (e) { /* none */ }
  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const cameBack = navEntry && navEntry.type === 'back_forward';
  const returning = /^#return-([\w-]+)$/.exec(window.location.hash);
  const headerBottom = siteHeader ? siteHeader.getBoundingClientRect().height : 0;

  let returnSlug = null;
  let wanted = null;
  if (returning) {
    returnSlug = returning[1];
    wanted = remembered && remembered.slug === returnSlug
      ? remembered.top
      : headerBottom + 24; // #work-<slug>'s own scroll-margin-top, style.css
  } else if (cameBack && remembered) {
    returnSlug = remembered.slug;
    wanted = remembered.top;
  }
  const returnCard = returnSlug && document.getElementById('work-' + returnSlug);

  const pageLoaded = () => (document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', resolve, { once: true })));

  /* Put the card `wanted` px from the top of the screen and hold it there.

     Held until the reader touches, scrolls or presses something, or the
     page has gone quiet: load and fonts done, then 20 painted frames in a
     row that needed no correction (capped at ~3s so it can never trap
     anyone). Frames, not milliseconds: a correction can only happen in a
     frame, and a slow phone may not paint for a while.

     While held it undoes two kinds of movement nobody asked for:
     - layout changes above the card (the webfont swapping in). iOS has no
       scroll anchoring, so these moved the card on screen; a
       ResizeObserver runs after layout and before paint, so the correction
       lands in the same frame and is never seen.
     - scrolls the page itself didn't make — measured on iOS 26.6, right
       after a back/forward-cache restore at the top the browser
       smooth-scrolled the page 58px with no script involved: <main>, which
       starts 58px down under the header, held focus when the page was left,
       and WebKit scrolled it into view. With the card placed first there is
       nothing left to scroll into view (round 2 on the phone: no such
       scroll), but a scroll listener, which also runs before paint, stays
       as the guard.
     behavior 'instant' throughout: it overrides html's scroll-behavior:
     smooth, and interrupts any smooth scroll already under way. */
  function holdCard(card, wanted) {
    // Never above the header, never pushed off the bottom of the screen.
    const top = Math.min(Math.max(wanted, headerBottom), window.innerHeight - 48);
    let corrected = false;
    const place = () => {
      const off = card.getBoundingClientRect().top - top;
      if (Math.abs(off) >= 1) {
        corrected = true;
        window.scrollTo({ top: window.scrollY + off, behavior: 'instant' });
      }
    };
    place();

    let held = true;
    const ro = window.ResizeObserver ? new ResizeObserver(() => { if (held) place(); }) : null;
    if (ro) ro.observe(document.body);
    const onScroll = () => { if (held) place(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    const release = () => {
      if (!held) return;
      held = false;
      if (ro) ro.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
      window.addEventListener(type, release, { passive: true, once: true }));

    Promise.all([pageLoaded(), document.fonts ? document.fonts.ready : null]).then(() => {
      if (!held) return;
      place();
      let quiet = 0;
      let frames = 0;
      (function frame() {
        if (!held) return;
        quiet = corrected ? 0 : quiet + 1;
        corrected = false;
        if (quiet >= 20 || ++frames >= 180) release();
        else requestAnimationFrame(frame);
      })();
    });
  }

  if (returnCard) {
    holdCard(returnCard, wanted);
    if (returning) {
      const renameHash = () => history.replaceState(history.state, '', '#' + returnCard.id);
      pageLoaded().then(() => setTimeout(renameHash, 0));
    }
  }

  /* ---------- Card <-> hero page transition ----------
     See microinteractions.css for the whole picture. Only one element per
     page may carry the shared name, `project-hero`, or the browser skips the
     transition; project pages name .hero-image statically, index.html names
     a card here, on demand.

     All of this relies on main.js being render-blocking (see the <script>
     tag in each page's <head>): nothing paints before this file has run, so
     `pagereveal` cannot fire before its listener exists, and the frame the
     transition animates into already has the wheel laid out and the page
     scrolled to its #fragment. Before that, the animation played into a
     half-built page that then jumped into place. */
  const HERO_NAME = 'project-hero';
  const RADIUS_KEY = 'vtRadiusFrom';
  const slugOf = (url) => url.pathname.split('/').pop().replace(/\.html$/, '');

  /* What morphs is the <img> inside a rounded frame (.hero-image,
     .project-image, .wheel-card), never the frame itself. A snapshot of the
     frame would bake its rounded corners into a bitmap that then gets
     stretched: the hero's 16px corners shrank to ~8px on the way into a
     card, and the card's real corners snapped back in on the last frame.
     The img snapshot is square; microinteractions.css rounds the moving
     box instead and animates its radius from the old frame's to the new
     one's, both measured here (they differ by breakpoint, and the wheel
     computes its own). The old page hands its value over in sessionStorage,
     the only channel the two documents share. */
  function frameRadius(frame) {
    return getComputedStyle(frame).borderTopLeftRadius;
  }

  function name(frame) {
    const img = frame.querySelector('img');
    if (!img) return null;
    img.style.viewTransitionName = HERO_NAME;
    return img;
  }

  function clearHeroNames() {
    document.querySelectorAll('.wheel-card img, .project-image img').forEach((img) => {
      img.style.viewTransitionName = '';
      img.style.transition = '';
      img.style.transform = '';
    });
  }

  function handOverRadius(frame) {
    try { sessionStorage.setItem(RADIUS_KEY, frameRadius(frame)); } catch (e) { /* falls back to the new radius */ }
  }

  function takeOverRadius(frame) {
    let from = null;
    try { from = sessionStorage.getItem(RADIUS_KEY); sessionStorage.removeItem(RADIUS_KEY); } catch (e) { /* ignore */ }
    const to = frameRadius(frame);
    const root = document.documentElement.style;
    root.setProperty('--vt-radius-from', from || to);
    root.setProperty('--vt-radius-to', to);
  }

  // index.html only: which frame stands for a given project URL. Arriving,
  // a wheel card only counts while it sits in the front slot — elsewhere
  // it may be rotated half out of the stage's clip, and the morph would
  // draw it unclipped. (The wheel remembers the last project opened from
  // it, see WHEEL_KEY, so coming back from a SPIN project it IS in front.)
  // Leaving, the clicked card is on screen wherever it sits.
  function cardFor(url, requireFront) {
    if (!document.querySelector('.project-grid')) return null;
    const slug = slugOf(url);
    if (url.hash === '#from-spin') {
      const card = document.querySelector(`.wheel-card[data-slug="${slug}"]`);
      const inFront = card && Math.abs(parseFloat(card.style.getPropertyValue('--rot')) || 0) < 0.5;
      if (card && (inFront || !requireFront)) return card;
    }
    return document.querySelector(`#work-${slug} .project-image`);
  }

  // Leaving: name what should morph, just before the browser snapshots.
  window.addEventListener('pageswap', (event) => {
    if (!event.viewTransition || !event.activation || !event.activation.entry) return;
    const target = new URL(event.activation.entry.url);

    const hero = document.querySelector('.hero-image');
    if (hero) {
      // Scrolled out of view, the hero would fly in from above the
      // viewport; unnamed, the destination simply fades in instead.
      const img = hero.querySelector('img');
      const visible = hero.getBoundingClientRect().bottom > 0;
      if (img) img.style.viewTransitionName = visible ? '' : 'none';
      if (visible) handOverRadius(hero);
      return;
    }

    clearHeroNames();
    if (!/\/projects\//.test(target.pathname)) return;
    const card = cardFor(target, false);
    const img = card && name(card);
    if (!img) return;
    // A WORK card's image sits scaled to 1.04 under the hovering pointer;
    // captured like that it would start the morph 4% larger than its frame.
    img.style.transition = 'none';
    img.style.transform = 'none';
    handOverRadius(card);
  });

  // Arriving: on index.html, name the card the project shrinks back into.
  window.addEventListener('pagereveal', (event) => {
    const transition = event.viewTransition;
    if (!transition) return;

    /* body's page-enter fade (style.css) must not run on a page that
       arrives through a transition: the transition already cross-fades it,
       and keying the opt-out on :active-view-transition instead made the
       fade start from zero the moment the transition ended — a visible
       pulse right after every morph. A class, set once, stays put. */
    document.documentElement.classList.add('vt-arrived');

    const hero = document.querySelector('.hero-image');
    if (hero) { takeOverRadius(hero); return; }

    clearHeroNames();
    const activation = window.navigation && navigation.activation;
    const from = activation && activation.from && activation.from.url;
    if (!from) return;
    const fromUrl = new URL(from);
    if (!/\/projects\//.test(fromUrl.pathname)) return;

    const card = cardFor(fromUrl, true);
    const img = card && name(card);
    if (!img) return;
    takeOverRadius(card);
    transition.finished.finally(() => { img.style.viewTransitionName = ''; });
  });

  /* ---------- Load project pages before they are opened ----------
     A transition can only morph into what the next page has ready on its
     first frame; a hero image still downloading shows up as an empty box
     that pops in after the animation. Speculation rules have Chrome/Edge
     prerender a page — images, fonts, scripts and all — while the pointer
     rests on a link (or presses it, on touch), so by the click it is
     complete and the transition runs into the finished page. SPIN adds an
     immediate rule for its result during OPEN_DELAY (see land()).
     Unsupported browsers ignore all of this and load pages as usual. */
  const canSpeculate = HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules');

  function addSpeculationRules(rules) {
    if (!canSpeculate) return null;
    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify(rules);
    document.head.appendChild(script);
    return script;
  }

  addSpeculationRules({
    prerender: [{
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: '/*.pdf' } },
          { not: { selector_matches: 'a[href^="#"]' } },
        ],
      },
      eagerness: 'moderate',
    }],
  });

  /* iOS Safari only applies :active on touch when some touch listener
     exists; without one, the press states in microinteractions.css never
     show on an iPhone. An empty passive listener is the standard switch. */
  document.addEventListener('touchstart', () => {}, { passive: true });

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

  /* Pause the hero's endless animations (SPIN's breathing, the arrow's bob)
     while the hero is scrolled out of view — see .is-offscreen in
     microinteractions.css. Without IntersectionObserver they simply keep
     running, as before. */
  const spinSection = spinTrigger && spinTrigger.closest('.spin-section');
  if (spinSection && window.IntersectionObserver) {
    new IntersectionObserver(([entry]) => {
      spinSection.classList.toggle('is-offscreen', !entry.isIntersecting);
    }).observe(spinSection);
  }

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

    // Watch the stage itself rather than the window. The stage's width is
    // no longer a function of the window's width alone: style.css shrinks
    // the whole SPIN hero to fit the window's HEIGHT, measured below the
    // header, and --header-height is rewritten once the webfont lands —
    // which resizes the stage without any resize event, and left the radius
    // and headroom computed against the pre-font width. A ResizeObserver
    // catches every cause at once. The resize listener stays as the
    // fallback for browsers without one.
    if (window.ResizeObserver && wheelStage) {
      new ResizeObserver(updateWheelMetrics).observe(wheelStage);
    } else {
      window.addEventListener('resize', updateWheelMetrics);
    }

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

    /* The wheel remembers the last project opened from it (by spinning or
       by clicking a card), for the rest of the browser session. Coming back
       then finds that project still in the front slot, which is what lets
       the page transition shrink its hero back into the card — a wheel
       reset to Hachi on every return had nothing to land in. */
    const WHEEL_KEY = 'wheelRotation';

    function rememberRotation(rotation) {
      try { sessionStorage.setItem(WHEEL_KEY, String(rotation)); } catch (e) { /* storage blocked: wheel just resets */ }
    }

    function recalledRotation() {
      try { return Number(sessionStorage.getItem(WHEEL_KEY)) || 0; } catch (e) { return 0; }
    }

    let currentRotation = recalledRotation(); // accumulated wheel rotation, degrees
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

    // Initial resting layout: rotation 0, or wherever the wheel was left.
    applyFrame(currentRotation, 0);

    // Clicking a resting card directly counts as opening it from the wheel.
    cards.forEach((card, i) => {
      card.addEventListener('click', () => rememberRotation(signedAngle(-baseAngle[i])));
    });

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
    let openPrerender = null;

    // The arrow under SPIN turns into a loading icon while the landed
    // project is opening (style.css, .is-opening).
    const spinInfo = spinTrigger.closest('.spin-info');

    function clearPendingOpen() {
      // Before the early return below: after the timer has fired (so
      // openTimer is null) this still runs on a back/forward-cache restore,
      // and the page must not come back showing the loader.
      if (spinInfo) spinInfo.classList.remove('is-opening');
      // Dropping the rule also discards the prerendered page.
      if (openPrerender) { openPrerender.remove(); openPrerender = null; }
      if (!openTimer) return;
      clearTimeout(openTimer);
      openTimer = null;
    }

    function land(frontCard) {
      const name = frontCard.dataset.name || frontCard.dataset.slug;
      if (spinSubtitle) spinSubtitle.textContent = 'opening ' + name + '…';
      if (spinInfo) spinInfo.classList.add('is-opening');
      rememberRotation(currentRotation);

      // OPEN_DELAY is 3s of guaranteed idle time before a known navigation:
      // spend it loading the page, so the morph lands in a finished page.
      openPrerender = addSpeculationRules({
        prerender: [{ urls: [frontCard.href], eagerness: 'immediate' }],
      });

      // Not preventScroll: if the wheel is off-screen (the user spun,
      // then scrolled), bringing the landed card into view is the point.
      frontCard.focus();

      openTimer = setTimeout(function () {
        openTimer = null;
        window.location.href = frontCard.href;
      }, OPEN_DELAY);
    }

    /* Back/forward cache: CLOSE now goes *back* to this page when it can
       (see the CLOSE note above), and the browser restores it exactly as it
       was left — mid-"opening <project>…", with the timer long since fired.
       Put the subtitle back to its idle label so it doesn't announce a
       navigation that already happened. The wheel itself stays where it
       landed, which is the point: the hero shrinks back into that card. */
    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      clearPendingOpen();
      if (spinSubtitle && !spinning) spinSubtitle.textContent = 'land on a random project';
      restartBreathing();
    });

    /* SPIN (and its subtitle) breathe to invite a press, and stop the
       moment one comes — see .spin-rested in microinteractions.css.

       Per page view, remembering nothing: every fresh load invites again,
       and the press ends it for that view only. It used to be stored in
       sessionStorage, so one press anywhere silenced the invitation for
       the rest of the browser session (and the class was on before the
       first paint, so later loads never breathed at all). The invitation
       is cheap and the press is what earns the quiet, so it is now the
       press alone that does it. */
    const root = document.documentElement;
    const breathers = [spinTrigger, spinSubtitle].filter(Boolean);
    const spinArrow = document.querySelector('.spin-arrow');

    function stopBreathing() {
      if (root.classList.contains('spin-rested')) return;
      // Pin each element at its current mid-breath size, drop the loop,
      // commit that (reading computed style forces the style pass), then
      // release the pin: the CSS transition eases from the pinned size to
      // rest instead of the loop's removal snapping it there.
      breathers.forEach((el) => { el.style.transform = getComputedStyle(el).transform; });
      root.classList.add('spin-rested');
      breathers.forEach((el) => getComputedStyle(el).transform);
      breathers.forEach((el) => { el.style.transform = ''; });
    }

    /* A page restored from the back/forward cache (CLOSE returning from a
       project, and how iPhones come back) never reloads, so it would still
       be wearing the .spin-rested from before it left, next to a subtitle
       that has just been reset to its idle invitation. Breathe again — and
       restart the arrow's bob in the same style pass, since SPIN, the
       subtitle and the arrow are only in step because they started
       together (see microinteractions.css); restarting one alone would
       leave it drifting against the other two for good. */
    function restartBreathing() {
      if (!root.classList.contains('spin-rested')) return;
      root.classList.remove('spin-rested');
      const all = breathers.concat(spinArrow ? [spinArrow] : []);
      all.forEach((el) => { el.style.animation = 'none'; });
      all.forEach((el) => getComputedStyle(el).animationName); // commit the stop
      all.forEach((el) => { el.style.animation = ''; });
    }

    spinTrigger.addEventListener('click', stopBreathing);

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
