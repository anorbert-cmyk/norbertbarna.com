# Norbert Barna - Portfolio Website

Self-hosted mirror of the portfolio site. Ready to deploy anywhere.

## 🚀 Quick Deploy

### Railway (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login & deploy
railway login
railway init
railway up
```

### Docker
```bash
docker build -t portfolio .
docker run -p 3000:3000 portfolio
```

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Local Development
```bash
npm install
npm start
# Open http://localhost:3000
```

## 📁 Structure
```
├── index.html          # Homepage
├── works.html          # Works page
├── work/               # Individual work pages
│   ├── sportsgambit.html
│   ├── raiffesen.html
│   ├── instructure.html
│   ├── bitpanda.html
│   └── benker.html
├── assets/             # All static assets
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── videos/
│   ├── fonts/
│   └── icons/
├── server.js           # Express server
├── package.json        # Node.js config
├── Dockerfile          # Docker config
├── railway.json        # Railway config
├── vercel.json         # Vercel config
└── netlify.toml        # Netlify config
```
