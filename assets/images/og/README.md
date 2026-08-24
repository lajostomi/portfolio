# Social share images (og:image)

All eight pages point at a 1200x630 card in this folder. That is the size
LinkedIn and X render a large summary card at.

| File                        | Page                     |
|-----------------------------|--------------------------|
| `index.png`                 | index.html               |
| `about.png`                 | about.html               |
| `fall-of-cozy-web.jpg`      | projects/fall-of-cozy-web.html |
| `hachi-mobile-app.jpg`      | projects/hachi-mobile-app.html |
| `mercedes-aura.jpg`         | projects/mercedes-aura.html    |
| `mome-ulp.jpg`              | projects/mome-ulp.html         |
| `project-teve.jpg`          | projects/project-teve.html     |
| `under-nda-banking.jpg`     | projects/under-nda-banking.html|

## Why these are not the WebP heroes

The project cards were briefly pointed straight at each page's hero image,
which is WebP. LinkedIn does not support WebP for og:image — it would have
kept rendering bare links, which is the exact problem these tags exist to
fix. Each card is therefore rendered from the pre-WebP original into JPEG.
The pages themselves still serve WebP to browsers; only the share card
differs.

PNG for index/about (UI screenshots, crisp text), JPEG q88 for the project
cards (photographic — mercedes-aura alone went 830KB as PNG against 65KB
as JPEG).

## Regenerating

`*-source.png` are the original full-window screenshots behind index/about,
kept so those can be remade without re-shooting. Sources are ~1869x900
(2.07:1) against the card's 1.905:1, so everything is fitted rather than
cropped: scaled to fit inside 1200x630 and padded onto the site background
`#1a1818`. The bars are invisible because the pages are that colour, and
nothing gets clipped.

All output is flattened to remove the alpha channel — several scrapers
composite transparent PNGs onto white, which would put a white band across
a dark card.
