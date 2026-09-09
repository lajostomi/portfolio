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
- ~~Whether `.section-title`'s `line-height: 1` should become `normal` at <=600px~~ — **resolved by
  the 2026-09-05 audit: yes.** Chrome's `normal` for Plus Jakarta Sans at 56px is 71.2px, which is
  the frames' own 71px box, so the 48px above and 24px below (both box-to-box in the frames) and the
  glyph positions all come out right at once. See the audit block at the end of `style.css`.

## 9. Design audit, 2026-09-05

A pass back over all eight frames, node by node, measuring rather than eyeballing. Corrections are
appended as their own ` (max-width: 600px)` blocks at the end of each stylesheet, each naming
the rule it overrides. Seven of the eight pages now track their frame to within a few pixels end to
end. What the pass established, beyond the individual fixes:

- **Measure a Figma text node's ink, do not infer its size from its box height.** The frames are not
  consistent about text-box heights — a 24px heading and a 22px one both come back `height="28"`.
  Render the node with `get_screenshot`, scan the PNG for ink rows/columns, and compare that width
  against the same string measured in the browser. That is how the `.sub-heading` 22px (right), the
  24px section headings (right), MOME ULP's 30px H1 (wrong) and the body tracking (wrong) were all
  settled. Ratios land within ~1% when the size matches; Figma renders about 1% narrower than Chrome.
- **A Figma box gap is not a glyph gap**, and the two differ by the leading of both boxes. The SPIN
  hero read the frame's 4px box gap into a gap that was already ink-to-ink and lost 15.6px.
- **Tracking is per-node in these frames and has to be checked per node.** The body copy on the
  project pages carries none (`.media-row-text p`'s -0.02em was a desktop value, and it re-flowed
  most paragraphs a line short), the About bio genuinely does carry -0.02em, and one contact block
  on the landing frame carries some the other three do not.
- **`text-wrap: balance` fights the frame.** The frames wrap greedily; balance re-flowed the landing
  page's contact copy away from them.
- **The frames hand-break copy.** Project titles on the WORK grid always break after the colon;
  several body blocks and the About bio break by sentence. No column width reproduces these — the
  `.meta-line` idiom was extended (`.name-line`, `.copy-line`, `.run-on`) rather than fought.
- Section §7's trap was hit twice more, both times by a rule fitted to one page: the hero role
  column (156px, fine for Mercedes, wraps on Cozy Web) and `.project-section-lead` (14px, right for
  the Wireframes caption, wrong for the two real leads on the same page).

### Still open on MOME ULP (359:617) — updated 2026-09-07

A second pass took the page from 17338px to 16304 against the frame's 15188. Fixed and measured
this time: the Application screenshot's rule (4px -> the frame's 2), the findings clusters (three
clusters, not four, packed into the frame's own two columns), the synthesis rows (24px leading ->
the frame's 1.25, and the channel list dropped as the frame drops it), how-might-we folded back
into the synthesis section 16px below it, and the task list (16px between number and brief, 24
between tasks, one line break between the two sentences rather than two).

What that pass established, and which applies to every frame, not just this one:

- **Figma's auto leading is 1.25 here; Chrome's `normal` is 1.3125.** State the number. Every
  auto-leading node in this frame measures 1.25 — the 24px titles come back 60 for two lines, the
  16px how-might-we blocks 100/80/120/60.
- **Tracking is per-node on headings too**, not only on body copy: nodes 360:1198, 367:1892 and
  367:1929 carry -0.48px and the five other 24px headings carry none. Carried inline as
  `--h2-tracking`, the same idiom as `--sub-size`.
- **This frame's 330px column costs real lines at the site's 327.** Reality's copy is 5 lines here
  and 4 in the file, and the tasks heading would have been 3 against 2 without its tracking. Left
  alone, per the earlier decision to treat x=21/330 as frame slop — but it is not free.

The testing rebuild (2026-09-08) and the connector pass (2026-09-09/10) added these:

- **A `display: contents` wrapper is free above the breakpoint.** Two of the third participant’s
  note groups are a stack inside ONE cell of the frame’s grid, which a flat grid cannot express
  (a spanning neighbour resizes the rows it spans and the notes drift apart by the slack).
  `.collage-stack` gives them a cell; dissolved above 600px it leaves the absolutely
  positioned desktop canvas and the tablet `order` pairing untouched.
- **Inline `order` bites inside any flex container you add.** That stack was flex first, and the
  items’ inline `order` (there for the tablet fallback) re-sorted it against the frame. Block
  display makes `order` inert.
- **Check what the tablet block already set before assuming a mobile rule wins.**
  `.results-grid > p .task-tag` is (0,2,1) and beat the mobile `.results-grid .task-tag`
  at (0,2,0), so the tag stayed visible on four cards and made each a line taller. Same for
  the score cards’ 2px gap, their 12px radius, and the captions’ 20px margin.
- **The connectors go back on as an absolutely positioned layer, in the frame’s coordinates.**
  `.collage-connector` carries each vector’s box as four raw numbers (--ax/--ay/--aw/--ah)
  and the CSS divides them by the board’s 327px column into `cqw` — .collage-canvas has
  been an inline-size query container since the desktop board, so one divisor scales the whole
  layer. Exact at 375; below it the screens scale in step but the quote cards gain lines as their
  text rewraps, so the vertical anchoring drifts a little at 320 and 360.
- **Figma lies twice about a rotated vector**, and the placements have to be measured, not
  derived. Vector 19 (378:273) renders 88.5x346 portrait while its exported SVG is 346x88.5
  landscape, and `get_metadata` reports an x that is the transformed corner of the unrotated
  box rather than the visual one — 85px off. The other four connectors matched their node box to
  the decimal, which is the tell. Settled by scanning the frame's own 1:1 render in a canvas for
  the arrow's colour and taking the ink bounding box; all five are now verified that way against
  nodes 378:268 / 378:273 / 378:263 / 378:256 / 378:253. The rotation is baked into
  fp-connector-2.svg rather than applied in CSS, so `preserveAspectRatio="none"` still works.
- **The screens carry a per-node crop and the frame top-aligns nearly all of them.** The fill
  reads `h-[119.45%] top-[0.1%]` on almost every screenshot node, against a centred
  `object-fit: cover` on the page — ~48px off the top of each screen, which hid the app's own
  header and put the UI the connectors point at in the wrong place. That, not the arrow
  coordinates, was what still read as "off" after the arrows were verified. Two exceptions carry
  their value inline as `--crop`: node 378:155 at 19.9% and 378:162 centred.
- **Overlay the frame render to find this class of bug.** Drop the 1:1 PNG on the live element
  with `mix-blend-mode: difference` and screenshot: aligned things go black, offset things
  ghost twice. It found the crop in one pass after two rounds of per-number measuring had said
  everything matched.

Still off, by section:

| What | Built | Frame | Note |
|---|---|---|---|
| First / Second / Third participant | 1886 / 1075 / 1241 | 1889 / 1077 / 1222 | Rebuilt 2026-09-08. Each board is the frame’s own two-column composition, every cell placed explicitly by :nth-child so the tablet view’s inline `order` stops mattering. One screen is dropped on each of the first two boards (fp-image-5, sp-screenshot-1 — not drawn in the frame). Connectors added 2026-09-09, see below. The third’s +19 is one note wrapping a line longer than the file gets. |
| Navigation prioritization | 331 | 301 | Built. The matrix stays desktop-only (24 cells on two axes has no one-column form) and .priority-summary carries node 366:1598’s sentence in its place, .show-on-mobile. +30 is the heading taking 5 lines at 327 where the frame gets 4 at 330. |
| Information architecture | 1057 | 1073 | Built to the frame’s own column packing (nodes 366:1808 / 366:1809), DOM re-sorted with desktop’s row order restored by an `order` rule. NOT built: the frame’s second header block (366:1613), whose paragraph is 366:1591’s word for word and whose label is swapped with 366:1853’s — a duplication in the file. |
| Usability test results | 1539 | 1539 | Rebuilt 2026-09-08. Both grids regroup by task; the captions repeat over every task as the frame draws them (mobile-only duplicates), the losing side is a card with no fill, and the two grids sit 48px apart because they are two sections in the frame, not two blocks in one. |
| Wireframes | 463 | 478 | -15, in the intro. The R.I.T.E. flow is now exact (259 against 259) — it was the 44px icon rendering 53 with height:auto, and the legend and step labels at the desktop 20px rather than the frame’s 16. |
| Application and Reality | 786 | 762 | +24: Reality's copy is 5 lines at 327 and 4 at the frame's 330. The column question above. |
| Findings | 1580 | 1583 | Matches. |

### Waiting on the designer

Raised and not yet answered. None of these block anything; all were flagged rather than
guessed at.

1. **The frame's second IA header block (366:1613).** Its paragraph is 366:1591's word for
   word and its "information architecture" label is swapped with 366:1853's "navigation
   prioritization". Reads as a copy-paste left in the file, so the page keeps one header with
   the correct label. If it is deliberate, it is 270px + a 48px gap to add back.
2. **Two colour swatches deliberately not taken from the frame.** The score cards use
   #ff3333 and #16b364 where the frame has pure red and #0cca12 — changed in an earlier pass
   because pure red against this card's dark text measures 4.42:1, under the AA floor. Layout,
   spacing and type follow the frame strictly; these two were left. Easy to switch if wanted.
3. **Hand-broken note text on the participant boards.** The frame breaks "I'd like the home /
   page to be more personalized." where the page wraps after "the". Same line count and same
   box height, different break points. The `.copy-line` idiom already used for the scoring
   key would reproduce them.
4. **"Prototype (avarage)" / "Original (avarage)"** are spelled that way in the frame. The page
   keeps "average", and hides " application" at <=600 so the second caption reads "Original
   (average)" on one line as the frame draws it.
5. **The 330px column.** This frame sits at x=21 with a 330px column where every other frame,
   and the site, uses 24/327. Three paragraphs wrap a line longer here as a result. Still
   treated as frame slop; it accounts for most of what is left in the table above.

### Pre-existing, outside the frames

At 320px (below the design width) MOME ULP clips two things inside their own boxes: the
"Success: N" score labels overflow their 64px cells by 6px, and one `.step-item` paragraph in
Synthesis by 2px. Neither scrolls the page. Not touched.
