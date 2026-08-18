# Lajos Tamás Jakab — Portfolio Website

Static HTML/CSS/JS portfolio, built page-by-page from Figma designs.

Figma file: https://www.figma.com/design/BYzOswHghAAaQSCUNqVSwp/Portfolio_website

## Structure

```
index.html               Landing page (SPIN hero, WORK grid, CONTACT)
assets/css/style.css      Global styles
assets/js/main.js         Mobile nav + SPIN wheel interaction
assets/images/            Real assets exported from Figma
  projects/                6 project preview images
  icons/                    arrow, mail, linkedin, instagram icons
  photos/                   personal photo
projects/                 Individual case-study pages (added as their Figma designs arrive)
about.html                 About page (added once its Figma design arrives)
```

## Progress

- [x] Landing page — SPIN hero, WORK grid (6 projects), CONTACT section, responsive nav
- [ ] About page
- [ ] Project case study pages (6): Hachi Mobile App, Mercedes Aura, The Fall of Cozy Web,
      MOME ULP, Under NDA: Beyond Banking, Project TEVE

## Running locally

No build step — open `index.html` directly, or serve the folder statically:

```bash
npx serve .
```
