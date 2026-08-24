# Social share images (og:image)

The six project pages use their own hero image, which already exists — those
cards work today.

`index.html` and `about.html` are wired to the two files below, which are NOT
yet present. Add them with these exact names and the cards start working:

| File        | Page         | Should show                                    |
|-------------|--------------|------------------------------------------------|
| `index.png` | index.html   | preview screenshot of the landing hero section |
| `about.png` | about.html   | preview screenshot of the about intro section  |

Target 1200x630 (the size LinkedIn and X render at). Minimum useful is
600x315; anything smaller gets downgraded to a small square card.

Take these from a real browser window at 1200px wide — they could not be
captured from the build environment, whose preview pane only paints ~780px
and returns screenshots to the console rather than to disk.
