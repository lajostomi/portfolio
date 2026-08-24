# Favicon

Wired on all 8 pages. Paths are relative (`assets/favicon/...` from the
root, `../assets/favicon/...` from `projects/`) so they survive being
deployed to a subpath as well as to a domain root.

| File                   | Size          | Used for                     |
|------------------------|---------------|------------------------------|
| `favicon.svg`          | vector        | modern browsers (preferred)  |
| `favicon.ico`          | 16 + 32 + 48  | older browsers, bookmarks    |
| `apple-touch-icon.png` | 180x180       | iOS home-screen shortcut     |

## Why there is a dark plate behind the mark

The supplied artwork was cream `#EDE5E5` strokes on full transparency —
87.5% of the apple-touch PNG and 82.9% of the ICO were fully transparent
pixels. That looks right on a dark tab bar and is nearly invisible on a
light one, which is the default on most machines.

All three now sit on the site's own `#1A1818`, so the icon reads the same
way the site does in either OS theme. The original transparent files are
kept alongside as `*-transparent.*` and are not referenced by any page.

`favicon.svg` and `favicon.ico` use a rounded-square plate whose corners
stay transparent, so they pick up whatever colour the tab bar is.
`apple-touch-icon.png` is a full opaque square with no rounding of its
own: iOS applies its own mask, and rounding it here would cut the corners
twice.

## Regenerating

`favicon.svg` is the master. The ICO is a PNG-in-ICO container (Vista+,
supported by every browser that also supports the WebP this site already
serves) built at 16/32/48 from that SVG; the apple-touch PNG is the same
SVG with `rx="0"`, flattened onto `#1A1818` at 180x180.
