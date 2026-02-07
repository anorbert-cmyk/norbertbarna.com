# Norbert Barna Portfolio - Claude Code Guidelines

## Project Overview

Self-hosted Webflow export running on Express (Node 18) deployed to Railway.
Static portfolio site with HTML, CSS, JS, images, and videos.

## Architecture

- **Server**: Express.js (`server.js`) with compression and static file serving
- **Deployment**: Railway via Nixpacks (Dockerfile also available)
- **Pages**: 8 HTML files (index, works, 6 work detail pages)
- **CSS**: 4 Webflow-generated CSS files (1 shared + 3 page-specific)
- **JS**: jQuery 3.5.1, Webflow runtime (2 bundles), WebFont Loader
- **Fonts**: Google Fonts (Funnel Display, Inter) loaded via webfont.js

## File Structure

```
index.html            - Home page
works.html            - Works listing
work/*.html           - Individual project pages (benker, bitpanda, instructure, onrobot, raiffesen, sportsgambit)
assets/css/           - Webflow CSS (shared + page-specific)
assets/js/            - jQuery, Webflow JS, WebFont Loader
assets/images/        - All images (SVG, PNG, JPG)
assets/videos/        - Background videos (MP4, WebM)
assets/icons/         - Favicon and webclip
server.js             - Express server
```

## Agentic Team Strategy for Complex Tasks

When tackling multi-faceted issues (e.g., CSS breakage, deployment problems, full-stack debugging), use **specialized subagent teams of 4+ agents** running in parallel. Each agent focuses on one diagnostic or fix domain.

### When to Use Subagent Teams (min 4 agents)

Use parallel subagent teams for:
- **Deployment/hosting issues** (CSS missing, assets 404, layout broken)
- **Cross-cutting bugs** affecting multiple files or systems
- **Performance audits** (server config + asset optimization + caching + CDN)
- **Migration tasks** (Webflow re-export, platform migration)
- **Security audits** (headers, SRI, CORS, dependencies)

### Recommended Team Compositions

**Deployment Debugging Team (4 agents):**
1. **SRI/Integrity Agent** - Verify all SRI hashes match actual file content
2. **Asset Reference Agent** - Audit all HTML files for broken CSS/JS/image paths
3. **Server Config Agent** - Test MIME types, headers, CORS, compression
4. **CSS Content Agent** - Check CSS files for external dependencies, @imports, url() refs

**Full-Stack Audit Team (4 agents):**
1. **HTML Structure Agent** - Validate HTML, check meta tags, OG images
2. **CSS/Style Agent** - Verify all styles load, check responsive breakpoints
3. **JS/Interaction Agent** - Test Webflow animations, navigation, video playback
4. **Performance Agent** - Check asset sizes, compression, caching headers

### When NOT to Use Teams

Use single-agent or direct tool calls for:
- Single-file edits
- Simple text/content changes
- Adding/removing a page
- Quick config tweaks

## Known Issues and Fixes

### SRI Integrity Hash Mismatch (RESOLVED 2026-02-07)
**Problem**: Page-specific CSS files were modified after export but HTML still contained original Webflow SRI hashes. Browsers rejected the CSS entirely.
**Fix**: Removed `integrity` and `crossorigin="anonymous"` attributes from all local resource `<link>` and `<script>` tags. SRI is unnecessary for self-hosted same-origin assets.
**Prevention**: Do NOT add SRI integrity attributes to self-hosted resources. If CSS files are ever re-exported or edited, SRI hashes must be recomputed or removed.

## Important Rules

- **Never add SRI integrity attributes** to self-hosted CSS/JS files
- **Keep `crossorigin="anonymous"`** only on `<link rel="preconnect" href="https://fonts.gstatic.com"/>`
- **Asset paths**: Root pages use `assets/...`, work/ pages use `../assets/...`
- **CSS mapping**: Each page type has its own CSS file + shared CSS:
  - index.html -> `...279e-13ee6e6a9.css`
  - works.html -> `...27a5-acb15adb8.css`
  - work/*.html -> `...27a4-603c31720.css`
  - All pages -> `shared.8948b5576.css`
