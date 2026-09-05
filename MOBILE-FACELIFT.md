# Mobile facelift — working brief

Branch: `feature/mobile-facelift-2026-09` (off `master`, not yet merged).

The site was built desktop-first and got a responsive pass; this project replaces that with
**purpose-designed mobile screens**. The designer draws each page as a 375px Figma frame, and we
implement that frame — not a shrunken desktop layout. Read this before touching anything below the
600px breakpoint. `README.md` remains the authoritative doc for everything else.

---

## 1. Status

| Page | Frame node | Done |
|---|---|---|
| Landing (`index.html`) | `338:83` | yes |
| Hachi (`projects/hachi-mobile-app.html`) | `341:236` | yes |
| Mercedes Aura (`projects/mercedes-aura.html`) | `347:564` | yes |
| Fall of Cozy Web (`projects/fall-of-cozy-web.html`) | `354:870` | yes |
| Under NDA (`projects/under-nda-banking.html`) | `355:1238` | yes |
| About (`about.html`) | `355:1360` | yes |
| Project TEVE (`projects/project-teve.html`) | `357:150` | yes |
| MOME ULP (`projects/mome-ulp.html`) | `359:617` | yes |

Figma file: `BYzOswHghAAaQSCUNqVSwp` ("Portfolio_website"). Frames are named `P-<page>`.

MOME ULP is the hard one: two hand-positioned collage canvases and several matrices, and the page
where `get_design_context` has hit output-size limits before (fetch sub-node ids instead of the whole
page — see `portfolio-figma-lessons` in the agent memory folder).

---

## 2. The mobile design system

Everything below is the frame's own numbers, not invented.

- **Frame** 375 x 812. **Gutter** 24px each side (this is what `--gutter` already pins to at
  `<=600px`). **Content column** 327px = `375 - 2 x 24`.
- **Grid** 4 columns / 16px gutters inside that column for card-like content; plain full-width for
  body copy.
- **Radii** 8px on photos and cards (desktop uses `--radius-lg`, 16px); 14px on phone-screen mockups.
- **Spacing** is an 8px scale. In practice the frames use: 8 (tight pairs, hero image to title),
  16 (default gap, grid gaps, card gaps), 24 (heading to its content, paragraph to paragraph),
  48 (between sections), 56 (rare).
- **Type**

  | Role | Size | Notes |
  |---|---|---|
  | Hero display (SPIN) | 56 | `clamp(56px, 12vw, 128px)` bottoms out here |
  | Section title (WORK / CONTACT / ABOUT) | 56 | `.section-title` |
  | Page H1 | 32 | `.hero-text h1` |
  | Section heading | 24 | `.project-section-title`, `.media-row-text h2`, `.grid-text h2` |
  | Subheading | 22 or 20 | `.sub-heading`, see hooks below |
  | Body | 16 | line-height 1.5 |
  | Meta / captions / labels | 14 | |

  Note `.section-title` is `line-height: 1` while Figma's text boxes are `leading-normal`, so a 56px
  title is a 56px box here against Figma's 70.6. Anything measured *below* such a title therefore
  sits ~14px higher than the frame's absolute y (~8px visually). This is consistent site-wide and
  deliberate; do not "fix" it on one page alone.

---

## 3. Where the CSS lives, and why order matters

Mobile work is **appended at the bottom of the relevant stylesheet** as its own commented
`@media (max-width: 600px)` block, one per frame. `assets/css/project.css` therefore has several
such blocks, and **that is intentional**: a later frame frequently needs to override a rule an
earlier frame's block set. Keep adding blocks at the end rather than merging them, and say in the
comment what earlier rule you are overriding.

- `assets/css/style.css` — landing page + everything shared (header, nav, WORK grid, CONTACT).
- `assets/css/project.css` — the six project pages. Also loaded by `about.html`.
- `assets/css/about.css` — About only.

**Markup is a last resort.** Six pages share this CSS; prefer a class or an inline custom property
over restructuring HTML, so desktop and the other pages stay untouched. Every page so far needed at
most one or two added classes.

### Breakpoints in play

| Width | Meaning |
|---|---|
| 1160 | pre-existing, one component |
| 900 | tablet tier — grids collapse, nav becomes the hamburger overlay |
| 767 | project pages only: the sticky header un-sticks (documented exception) |
| **600** | **the mobile frames** |
| 367 | below the design width: Hachi/Mercedes' 4-across research row pairs up |

---

## 4. Reusable hooks

Established while building the frames. Reach for these before inventing anything.

| Hook | Where | Does |
|---|---|---|
| `.hide-on-mobile` | project.css | Content the frame drops. `display: none` at `<=600px` only. |
| `.para-break` | project.css | On a `<span>` around a second sentence: becomes its own paragraph (24px above) at `<=600px`, stays inline above. |
| `.meta-line` | project.css | On a `<span>` around each line of the hero's consultant/team columns: the frames break those by hand, one name per line. Blocks at `<=600px`, inline above. |
| `.sub-heading` + `--sub-size` | project.css | A heading subordinate to the one before it. Defaults to 22px; carry a different value inline (`style="--sub-size:20px"`). |
| `--label-tracking` | project.css | Inline negative tracking on a research-method label whose single word is wider than its 70px track. |
| `.method-row` | project.css | On the `.grid-4` holding `.method-item`s, so it stays 4-across at `<=600px` where `.grid-4` otherwise collapses. |
| `.grid-img--tall-on-mobile` | about.css | A photo that spans two columns on desktop and two rows in the frame. |
| `.section-interleaved` | project.css | A section whose frame interleaves copy and photographs. Flattens its wrappers with `display: contents` and places every piece on one grid. |
| `.journey-grid` | project.css | Marks a gallery whose cells are not square, where the page's others are. |
| `--detail-aspect`, `--border-color` | project.css | Pre-existing; per-instance phone-screen ratio and border colour. |

The pattern to copy: **a class marks the role, an inline custom property carries the per-instance
value.** It keeps the value beside the content it belongs to and inert at every other width.

---

## 5. Content differences between frame and page — standing rule

The designer edits copy while redesigning. Diff the frame's text against the page's text as a
**routine build step**; do not wait to spot it by eye.

- **Missing from the frame** → a deliberate mobile-only trim. Hide it (`.hide-on-mobile`) and
  **leave desktop intact**. Do not delete markup.
- **Different wording** → a typo the frame corrects. Fix it in the shared markup so **desktop gets
  it too**.
- **Different order** → neither of the above. The decision so far has been to apply it to both
  views, but ask.
- **Different layout** (a photo that is wide on desktop and tall in the frame, a row that is 3-up in
  one frame and 2-up in another) → just implement the frame; that is the job.

Judgement still applies: one frame dropped the article from "less as **a** potential liability",
which is a regression rather than a correction, so only the full stop was taken. Flag rather than
ship something worse.

---

## 6. Verifying

**Measure, do not eyeball.** The user reports bugs with numbers and expects the same back.

- Drive the preview with the Browser tools; `getBoundingClientRect` / `getComputedStyle` through
  `javascript_tool`. Screenshots in this environment are flaky and time out — do not rely on them.
- Check **320, 360, 375 and 1090px** every time. 360 is one of the commonest real Android widths and
  has caught genuine overflow twice. 1090 is the user's own review width and proves desktop is
  untouched.
- Two checks worth automating into every pass:
  - `document.documentElement.scrollWidth === clientWidth` (no horizontal scroll)
  - every element where `scrollWidth > clientWidth`, **excluding** those with `overflow: hidden`
    (the `.crop-img` containers overflow deliberately)
- Beware two measurement artifacts: an element with `display: contents` reports a zero rect, so
  counting "items per row" by comparing tops misreports; and the preview pane throttles rendering,
  so a CSS transition mid-flight can report a stale computed value — reload before trusting one.

---

## 7. The trap this project keeps hitting

**Do not generalise a rule from one page's frame.** Twice a rule written from a single example was
wrong on the next frame:

- `.media-row-text h2` was set to 20px from Mercedes' subheading; Cozy Web draws the same markup at
  24px as a full section heading.
- `.step-item--sm` was made a label-*beside*-image row for Mercedes; Cozy Web uses the same class
  for a caption *above* a tall screen.

When a frame needs a shared component to behave differently, scope the rule to the context it was
written for (`.grid-4 > .step-item--sm`), or key it off what the element actually contains
(`.detail-images:has(> :nth-child(4))` for a four-screen row), rather than the bare class.

Also worth knowing: `flex-basis` sizes the **main** axis, so `flex: 1 1 0` on something nested in a
column parent sizes its *height* and collapses it against its own aspect-ratio. This has bitten the
project four times. Use `width`.

---

## 8. Open questions

- `.sub-heading` is mobile-only. Desktop still renders those headings at the full 32px; no desktop
  frame states a size for them.
- Whether `.section-title`'s `line-height: 1` should become `normal` at `<=600px` to match the
  frames' absolute positions site-wide (see §2).
