# ScoreWire

## Add a story
Create a `.txt` file in `stories/`:

    title: Your headline
    slug: short-url-name        (the link: yoursite.com/short-url-name/)
    category: Tech              (one per story, shown in the menu)
    labels: apple, iphone       (drives "Related stories")
    keywords: iPhone 18, price  (SEO)
    image: https://...          (optional)
    date: 2026-10-05            (optional, defaults to file date)
    ---
    Body text. Blank line = new paragraph. Start a line with "## " for a subheading.

## Settings
Edit `config.json`: siteName, tagline, siteUrl (your real domain), lang ("en" or "ar").

## Deploy (free)
1. Put this folder in a GitHub repo.
2. Cloudflare Pages (or Netlify) -> connect the repo.
3. Build command: `node build.js`   Output directory: `dist`
4. Every new file you add to `stories/` on GitHub rebuilds the site automatically.

Preview locally: `node build.js`, then open `dist/index.html` (needs Node 16+).

## Ads
1. Add a real privacy policy, About and Contact page before applying to AdSense.
2. After approval, put your publisher ID in `adsenseClient` (like `ca-pub-123...`).
   This adds the AdSense script and an ads.txt file.
3. Create an ad unit in AdSense and put its number in `adSlot` for an in-article ad.

## Linking from videos
Links in YouTube Shorts descriptions are not clickable. Use channel links / bio,
and show the short URL (yoursite.com/slug) on screen.
