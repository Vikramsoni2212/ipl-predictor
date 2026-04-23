# IPL 2026 Match Predictor

A React + Vite web app for predicting IPL match winners from team selection, venue, pitch, timing, toss, and toss decision.

## Run

```bash
npm install
npm run dev
```

## Deploy to Vercel

This project is ready for Vercel. Vercel should use:

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

### Option 1: Deploy from GitHub

1. Push this project to a GitHub repository.
2. Open [Vercel New Project](https://vercel.com/new).
3. Import the GitHub repository.
4. Keep the detected framework as `Vite`.
5. Confirm the build settings above.
6. Click `Deploy`.

After deployment, every push to the connected branch creates a new Vercel deployment.

### Option 2: Deploy with Vercel CLI

```bash
npm install
npm install -g vercel
vercel login
vercel
vercel --prod
```

Use the preview URL from `vercel`, then run `vercel --prod` when it looks good.

## Notes

- Logos are local files in `public/assets/logos/` and are referenced with `/assets/logos/filename.png`.
- The prediction baseline in `src/data/teams.js` uses IPL 2025 and IPL 2026 table data only. Refresh those constants as the IPL 2026 season changes.
- Baseline table references: [IPL 2025 table](https://www.espn.com/cricket/table/series/8048/season/2025/ipl), [IPL 2026 table](https://www.espn.com/cricket/table/series/586733/season/2026/indian-premier-league).
