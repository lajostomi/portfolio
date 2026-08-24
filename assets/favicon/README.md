# Favicon — drop your files here

The `<link>` tags are already wired on all 8 pages. Add files with these
exact names and they will start working with no code change:

| File                  | Size          | Used for                          |
|-----------------------|---------------|-----------------------------------|
| `favicon.svg`         | vector        | modern browsers (preferred)       |
| `favicon.ico`         | 32x32 + 16x16 | older browsers, bookmarks         |
| `apple-touch-icon.png`| 180x180       | iOS home-screen shortcut          |

Paths are relative (`assets/favicon/...` from the root, `../assets/favicon/...`
from `projects/`), so they survive being deployed to a subpath as well as to a
domain root.

Until the files exist the pages simply have no favicon — nothing breaks.
