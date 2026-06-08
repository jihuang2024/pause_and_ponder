# GitHub Pages Setup Guide

## Your Site is Ready

The `/docs` folder contains your GitHub Pages project site.

### Structure

```
docs/
├── index.html          # Homepage
├── style.css          # Shared styles
└── pages/             # Individual pages
    ├── this-weeks-question.html
    ├── parent-notes.html
    ├── themes.html
    └── about.html
```

## How to Publish

1. **Commit and push to GitHub:**
   ```bash
   git add docs/
   git commit -m "Add GitHub Pages site"
   git push origin main
   ```

2. **Configure in GitHub (one-time setup):**
   - Go to your repo on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Build and deployment":
     - **Source**: Select `Deploy from a branch`
     - **Branch**: Select your default branch (e.g., `main`)
     - **Folder**: Select `/docs`
   - Click **Save**

3. **Your site will be live at:**
   ```
   https://your-username.github.io/pause_and_ponder/
   ```

## Next Steps

- Update `docs/pages/*.html` to add content
- Modify `docs/style.css` to customize the look
- Create new pages as needed
- Add navigation links in the pages

## Tips

- All pages reference `../style.css` for consistent styling
- Navigation links use relative paths (e.g., `../index.html`, `../pages/about.html`)
- The site is mobile-friendly (responsive design included)
- You can add more sections/pages by creating new `.html` files in `docs/pages/`
