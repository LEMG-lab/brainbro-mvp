# BrainBro Deployment Checklist

## Pre-Deploy

1. **Codefence guard**
   ```bash
   npm run check:codefences
   ```
   Must report: `No codefence leaks found.`

2. **Build**
   ```bash
   npm run build
   ```
   Must complete with `✓ built in X.XXs`. Warnings about chunk size are acceptable.

3. **Smoke Test**
   - Run `npm run dev` and open `/smoke`
   - Verify all engines load and pass
   - Click "Save Result" to store health snapshot

4. **Export Backup**
   - Go to Parent Dashboard → Data Management
   - Click "Export Encrypted Sync" to download backup JSON
   - Store in safe location

## Deploy to Netlify

1. Connect GitHub repo or drag `dist/` folder
2. Build command: `npm run build`
3. Publish directory: `dist`
4. No environment variables required (client-only)
5. Verify deploy preview works

## Deploy to Vercel

1. Import project from GitHub
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. No environment variables required

## Post-Deploy

1. Open deployed URL and navigate to `/smoke`
2. Run smoke test on production
3. Parent Dashboard → Release → Download Release Notes
4. Verify version stamp matches expected version
5. Test parent gate access

## Emergency Rollback

- Netlify: Revert to previous deploy in Deploys tab
- Vercel: Revert in Deployments tab
- Data is client-side localStorage, unaffected by deploys
