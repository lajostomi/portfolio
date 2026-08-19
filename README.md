# Lajos Tamás Jakab — Portfolio Website

Static HTML/CSS/JS portfolio, built page-by-page from Figma designs. No build step, no framework.

Figma file: https://www.figma.com/design/BYzOswHghAAaQSCUNqVSwp/Portfolio_website?node-id=45-81

## Structure

```
index.html                      Landing page (SPIN hero, WORK grid, CONTACT)
about.html                       About page — ✅ built

assets/css/style.css             Global tokens/reset + landing page styles
assets/css/project.css           Shared styles for ALL project case-study pages (4-col grid, text-block, etc.)
assets/css/about.css             About page's own styles — reuses project.css's grid-4/span-* classes
assets/js/main.js                Mobile nav + SPIN wheel + (loaded on project/about pages too, no-ops safely there)

assets/images/projects/          6 WORK-grid thumbnail images (landing page + SPIN wheel)
assets/images/icons/             arrow-down, arrow-up-right, mail, linkedin, instagram, close, eye,
                                  notification-message, file-download
assets/images/photos/            personal contact photo
assets/images/hachi/             Hachi project's own images (hero, galleries, wireframes, etc.)
assets/images/about/             About page's own images (profile + 4 photo grids)
assets/documents/                Drop the real resume PDF here as lajos-tamas-jakab-resume.pdf — the
                                  About page's DOWNLOAD RESUME button already points at this exact path

projects/hachi-mobile-app.html   ✅ built. Next project -> mercedes-aura.html
projects/mercedes-aura.html      ✅ built — full case study (research grid, magnifying-glass step row,
                                  transformation gallery, 3-up object cards, prototyping collage, live
                                  demo row). Next project -> fall-of-cozy-web.html, not built yet
projects/fall-of-cozy-web.html   ✅ built — full case study (framed concept diagram, story row with
                                  colored-border screen trio, 9-frame filmstrip, colored-border footer
                                  galleries, cropped setup photos). Next project -> mome-ulp.html, not
                                  built yet
projects/mome-ulp.html           ❌ not built yet
projects/under-nda-banking.html  ✅ built — minimal page (NDA'd project): hero + meta + footer only,
                                  no content sections. Next project -> project-teve.html
projects/project-teve.html       ✅ built — full case study (media rows, feature grid, non-verbal
                                  states, user journey, feedback bubbles). Next project -> loops back
                                  to hachi-mobile-app.html (last card in the WORK-grid cycle)
```

Links to not-yet-built project pages already exist site-wide (WORK grid thumbnails, SPIN wheel landing,
Hachi's "NEXT PROJECT" pill) and will 404 until each page is built — that's expected at this stage, not a bug.

## Progress

- [x] Landing page — SPIN hero, WORK grid (6 projects), CONTACT section, responsive nav
- [x] Hachi Mobile App project page
- [x] About page — profile intro + 4 photo grids + DOWNLOAD RESUME button (needs the actual PDF dropped
      into assets/documents/ before it'll download anything real)
- [x] Under NDA: Beyond Banking Product project page — minimal (hero + meta + footer only)
- [x] Project TEVE project page — introduces 3 new reusable patterns in project.css: `.media-row`
      (274px text column + image, used 3x), `.crop-img` (explicit Figma inset-% crops for source photos
      that aren't simple center-crops), `.feature-row`/`.step-item`/`.footer-detail-row`/`.feedback-row`
      for the page's other one-off layouts
- [x] Mercedes Aura project page — reused `.media-row`/`.crop-img`/`.step-item` from TEVE, added
      `.gallery-wash` (light-only overlay variant of `.gallery-tinted`), `.grid-3`/`.object-card` (3-up
      pinecone cards), `.tall-image`/`.stacked-pair` (prototyping collage), `.livedemo-row`. Several
      source photos were real phone photos with EXIF orientation tags that PowerShell's System.Drawing
      doesn't auto-rotate — see the Environment gotchas section below before batch-converting photos
      again.
- [x] The Fall of Cozy Web project page — reused `.media-row`/`.crop-img`/`.detail-images`/`.step-item`
      from earlier pages, added `.media-row-image--framed` (white-backed, object-fit:contain, for a
      diagram that must stay fully visible rather than cropped) and `.filmstrip` (9 narrow gameplay
      frames in a row). `.detail-image` got a `--detail-aspect` custom property (was hardcoded to
      Hachi's 274/608) and a real bug fix: it was sized via `flex-basis` through the `flex` shorthand,
      which only means "width" in a row-direction flex parent — nesting it inside `.step-item` (column
      direction, for this page's label-above-image layout) silently sized its *height* instead,
      collapsing the aspect-ratio to a square. Fixed with a plain `width` property instead (axis-
      independent) — verified both this page's 274×580 usage and Hachi's original 274×608 row usage
      still measure correctly.
- [ ] 1 remaining project page: MOME ULP

## Landing page notes

**SPIN wheel** (`#wheel` in index.html, logic in main.js): 6 project cards sit 60° apart on a
circle/ellipse (NOT a hexagon path — six cards spaced 60° apart already reads as hexagonal by
placement alone; an earlier version literally bulged the path into hexagon edges and that produced
a visible "jump" at each card's resting angle — reverted to smooth circular motion, kept the hexagonal
*arrangement*). Clicking the **"SPIN" heading itself** (not the arrow, which is decorative) triggers a
spin: eases through several full rotations, motion-blur peaks mid-spin, settles on a random project,
subtitle goes "land on a random project" → "spinning…" → "landed on {Project}", then after a 700ms
pause it navigates to that project's page. The wheel's outer container bleeds edge-to-edge (via a
`calc(100% + 2*gutter)` trick, NOT `100vw` — `100vw` doesn't account for scrollbar width and silently
miscenters the whole component) purely to give rotated card corners clipping-safe room; the actual
1191×517 design composition lives in an inner `.wheel-stage` that's centered within that bleed.

**WORK grid**: arrow-up-right link icon on each card is hidden by default, fades in on hover/focus only.

**CONTACT tiles**: icons are fixed at a flat 64px height (not stretched to fill the tile — that was an
earlier bug from a padding `clamp()` that never actually reached its intended value).

## Project-page design system (apply to every future project page — this is a standing rule)

All shared in `assets/css/project.css`. Read that file's own comments before changing anything — they
explain the *why* behind several non-obvious decisions, most of which came from real bugs a user caught:

- **4-column grid**: `.grid-4` (`display:grid; grid-template-columns:repeat(4,1fr); gap:32px`) with
  `.span-1` / `.span-2` on children. Problem/Solution, both photo galleries, and the research-method row
  all share this ONE grid system — do not build them as independent flexbox rows with different
  `flex-basis` values. That was a real bug: different rows reflowed to different column counts at the
  same viewport width, breaking alignment between rows that should line up.
- **Text spacing**: every paragraph-to-paragraph and heading-to-paragraph gap is **exactly 32px**,
  achieved via `.text-block` (gap:32, max-width:580px) and `.section-intro` (wraps a heading + its lead
  text, gap:32) — never rely on the browser's default `<p>` margin, which doesn't collapse inside a flex
  container and produces inconsistent spacing. `style.css` has a global `p{margin:0}` reset specifically
  for this reason.
- **Text width caps at exactly 580px** (not 581) — matches Figma's own column width exactly.
  `.project-container`'s `max-width` is `calc(1194px + 2*var(--gutter))`, NOT a flat `1194px` — the
  gutter needs to sit outside the 1194px design width so the grid-4 columns actually reach their true
  274px/580px size at normal desktop widths (verified exact at 1440px), instead of being measurably
  narrower than the flat-580px text elsewhere on the page.
- **`.project-section`** cancels the global `section{padding-inline:gutter}` rule from style.css
  (`padding-inline:0`) — without that override every section on a project page double-pads.
- **Sticky footer**: `.project-footer` (CLOSE / CONTACT / NEXT PROJECT pills) is `position:sticky;
  bottom:0`, deliberately has **no background bar** — the pills float on their own over whatever content
  is scrolled beneath them, by explicit user request. Hover = lift 3px + brighten. CLOSE →
  `../index.html#work`, CONTACT → `../index.html#contact`, NEXT PROJECT → the next project's page
  (hardcoded href per page, cycles through the 6 in WORK-grid order).
- **Bordered detail-image rows** (user groups / matchmaking / dog-friendly / features): 274×608, 32px
  radius, 4px border in a per-image `--border-color` custom property. When Figma groups a subset of
  images tighter than the rest (e.g. Hachi's Matt+Dolly pair), nest that subset in its own
  `.detail-image-pair` flex item rather than trying to fake asymmetric gaps with `justify-content` alone.

## Hard-won Figma workflow lessons (read before building the next project page)

1. **Trust `get_metadata`, not the nested layout code from `get_design_context`**, for absolute
   positions. The Hachi page's insights diamond and wireframe collage were both first built from a
   misleading reading of `get_design_context`'s "col-1/row-1 grid-trick" nesting and were measurably
   wrong (icon/text order reversed, several sketch positions off) — re-deriving everything from
   `get_metadata`'s actual x/y/width/height fixed it. Metadata is the source of truth for layout; treat
   `get_design_context`'s code as a rough content/structure guide only.
2. **`get_screenshot` on a node can come back fully opaque**, filled with the frame's background color
   instead of a transparent margin around a rotated/irregular shape. This bit the wireframe collage: the
   PNGs were solid `rgb(26,24,24)` rectangles (matching our page bg, so invisible against the page — but
   opaque, so overlapping sketches blotted each other out). Fix was chroma-keying that exact color to
   alpha-0 via a PowerShell `System.Drawing` script (no Python available in this environment). Check a
   corner pixel's alpha before trusting a screenshot export is transparent.
3. **A node's raw exported PNG asset may be the full, uncropped, unrotated source file**, not the final
   cropped/rotated visual — this happened with the wireframe images (each downloaded PNG was actually a
   whole scanned page containing 2-3 sketches, sideways). If `get_design_context`'s crop-transform
   percentages look like nonsense (huge/negative numbers), don't try to reverse-engineer them — call
   `get_screenshot` on that specific child node instead and use the rendered PNG directly.
4. Verify a node's own layer name / description against its neighbors before assuming download order
   matches visual order — always eyeball the actual downloaded image file (Read it) rather than writing
   alt text from assumption.

## Environment gotchas

- The Browser preview pane's screenshot tool visually squishes/miscaptures rendering above roughly
  1000px viewport width (a tool limitation) even though the page's actual layout is correct at that
  size — verify wide-viewport layout with `getBoundingClientRect()` via `javascript_exec`, not by
  eyeballing a screenshot, whenever testing >900px widths.
- `.claude/launch.json` runs `npx serve .` with `"autoPort": true` (no hardcoded `-l` port flag) so the
  harness can assign a free port if 5173 is taken.
- Full-bleed/edge-to-edge CSS tricks must use a percentage of the parent (e.g.
  `calc(100% + 2*var(--gutter))` / `margin-inline:calc(-1*var(--gutter))`), never `100vw` — `100vw`
  ignores scrollbar width and silently miscenters the element.
- When batch-resizing/re-encoding Figma photo exports with PowerShell's `System.Drawing`
  (`[System.Drawing.Image]::FromFile`), check for an EXIF orientation tag (property id `274`) and apply
  the matching `RotateFlip` **before** resizing — `System.Drawing` loads the raw pixel buffer as-is and
  does *not* auto-rotate it the way browsers/Figma do, so real phone photos with that tag silently come
  out sideways once re-saved (this happened to 6 of Mercedes Aura's research/prototyping photos — caught
  by eyeballing the downloaded files with Read, not by the geometry checks, since crop-img percentages
  stay numerically valid either way). 3D-rendered images (no camera EXIF) are unaffected. Deleting the
  raw PNGs before checking for this loses the fix option — re-download from the original Figma asset URL
  (still valid for ~7 days) if it's already too late.

## User's working style (for continuity)

Meticulous about pixel-exact fidelity to the Figma file — expects claims to be verified against Figma
metadata/screenshots, not eyeballed. Sends before/after screenshots comparing the live site to Figma
when something's off, and wants the actual root cause fixed (and generalized as a standing rule for
future pages), not just the one visible symptom patched. Wants every change previewed and confirmed
working before moving on. Git commits should be made after each meaningful change with a clear message
explaining root cause, not just what changed.

## Running locally

```bash
npx serve .
```

Or use the Claude Code Browser pane's `preview_start` with the `portfolio-static` launch config.
