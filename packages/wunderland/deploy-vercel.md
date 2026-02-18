# Deploy to Vercel (Free)

## Prerequisites
1. Create account at https://vercel.com (free)
2. Install Vercel CLI: `npm i -g vercel`

## Steps

1. **Build the app**:
```bash
npm run build
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Set Environment Variables** in Vercel Dashboard:
- Go to your project settings
- Add all variables from .env:
  - `OPENAI_API_KEY`
  - `PASSWORD`
  - `PORT=3000`
  - etc.

5. **Redeploy**:
```bash
vercel --prod
```

## Alternative: Deploy to Render.com (Also Free)

1. Push code to GitHub
2. Go to https://render.com
3. New > Web Service
4. Connect GitHub repo
5. Settings:
   - Build: `npm run build`
   - Start: `cd backend && npm start`
6. Add environment variables
7. Deploy!

## Why Not GitHub Pages?

GitHub Pages is for **static sites only**:
- ✅ Can host: HTML, CSS, JS, images
- ❌ Cannot run: Node.js, Python, databases
- ❌ Cannot hide: API keys (exposed in frontend)
- ❌ Cannot handle: Authentication, sessions

Your app needs a **backend server** for:
- OpenAI API calls (with hidden keys)
- Authentication (password check)
- Session management
- Cost tracking
- Speech processing

## Free Hosting Comparison

| Service | Free Tier | Pros | Cons |
|---------|-----------|------|------|
| **Vercel** | Generous | Fast, easy deploy | Serverless (some limits) |
| **Render** | 750 hrs/month | Full Node.js | Sleeps after 15 min |
| **Railway** | $5 credit | Full featured | Credit runs out |
| **Fly.io** | 3 small VMs | Very flexible | More complex |
| **Heroku** | None anymore | Was great | No free tier |
| **GitHub Pages** | Unlimited | Free forever | **Static only - won't work!** |

## Recommended: Vercel or Render
Both are free and will actually run your full application!