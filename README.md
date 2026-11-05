# Faris Erhan, Data Analyst

Source for my portfolio site: **https://fariserhan.github.io/**

It is a static site served by GitHub Pages from the `main` branch. There is no build step: what is in this repository is what gets published.

## Pages

- **Home** – [`index.html`](index.html): summary, selected work and contact details
- **CV** – [`cv.html`](cv.html), with a PDF copy in [`assets/cv/`](assets/cv/)
- **Case studies** in [`projects/`](projects/):
  1. [A research profile for UiTM’s Faculty of Chemical Engineering](projects/fkk-research-profile.html)
  2. [A research database and dashboard for UPM’s SPERC research centre](projects/sperc-research-database.html)
  3. [A publication benchmark for a UPM engineering department](projects/upm-department-benchmark.html)
  4. [Malaysian household income after inflation, by state](projects/malaysia-income.html)
  5. [Two data-driven research websites](projects/client-websites.html)
  6. [A bilingual learning game built from a UPM teaching module](projects/wastequest.html)
  7. [A university Solid Waste Management course, rebuilt from scratch](projects/swm-course.html)
  8. [A job application tracker with its own data warehouse](projects/job-tracker.html)
  9. [Modelling diabetes-linked deaths in Denmark (Warwick coursework)](projects/denmark-glm.html)
- `404.html`, `sitemap.xml` and `robots.txt` for GitHub Pages and search engines

## How it is built

Plain HTML, CSS and JavaScript, with no framework and no bundler.

- **Styles** – shared styles live in [`assets/css/edition.css`](assets/css/edition.css); each page adds its own stylesheet from the same folder. Fonts are self-hosted in [`assets/fonts/`](assets/fonts/).
- **Scripts** – small ES modules in [`assets/js/`](assets/js/). `edition.js` handles shared behaviour such as the light/dark toggle; `figures.js` draws the charts from JSON embedded in each page.
- **Screenshots** – each project has a folder under [`assets/img/shots/`](assets/img/shots/) with the images and a `shots.json` manifest (file, size, frame, caption and numbered notes). [`assets/js/exhibits.js`](assets/js/exhibits.js) reads the manifest named in an element’s `data-shots` attribute and builds the picture, contact sheet and viewer. The work gallery on the home page is driven the same way by `assets/img/shots/archive/items.json`.
- **Data** – the figures behind the charts are in [`data/`](data/) as JSON (and CSV for the Malaysia project).
- **Maps** – the Malaysia state maps are drawn by [`assets/js/malaysia-income.js`](assets/js/malaysia-income.js) from `data/malaysia/states.geojson`, with a small built-in Mercator projection (it replaced a 270&nbsp;KB copy of D3 and draws the same shapes), so nothing loads from a CDN.

To add screenshots to a page, drop the images into its `assets/img/shots/<project>/` folder and list them in that folder’s `shots.json`; no HTML changes are needed. Then run `python3 scripts/make_image_sizes.py` (needs Pillow) to make each picture’s 480&nbsp;px `thumb` and 960&nbsp;px `mid` copies and record them in the manifest: `exhibits.js` offers them through `srcset`, so phones and standard screens download a picture near the size it is shown, and the viewer still opens the full file. Pages work without the copies, just with heavier downloads.

## Preview locally

Any static server will do. From the repository root:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/. Opening the files directly (`file://`) will not work fully, because the screenshots and charts load JSON with `fetch`.

## Checks

[`.github/workflows/site-checks.yml`](.github/workflows/site-checks.yml) runs on every push and pull request, and can be started by hand from the Actions tab. It has three jobs:

| Job | What it checks | Run it locally |
| --- | --- | --- |
| Links, assets and JSON | Every local `href`, `src`, `srcset` and CSS `url()` points to a file in the repository; every `#fragment` link matches an `id` on its page; every `data-shots` folder has a `shots.json` whose files (and `thumb`/`mid` copies) exist; every JSON file and `ld+json` block parses. | `python3 scripts/check_site.py` (standard library only) |
| HTML validation | All pages pass the [Nu HTML Checker](https://validator.github.io/validator/). Warnings are allowed; errors fail the job. | `npx vnu-jar@26.10.12 --errors-only *.html projects/*.html` (uses Java if installed, otherwise downloads it) |
| Accessibility | [axe-core](https://github.com/dequelabs/axe-core) finds no violations on any page, at desktop width and at 390&nbsp;px, and no page throws a script error or requests a missing file. | `npm i --no-save playwright@1.63.0 axe-core@4.14.0 && npx playwright install chromium && node scripts/a11y.mjs` |

`scripts/a11y.mjs` starts its own `python3 -m http.server` on a free port; set `BASE_URL` to test a server that is already running.
