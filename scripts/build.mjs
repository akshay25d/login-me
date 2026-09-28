import { cp, mkdir, rm } from 'node:fs/promises';

// Publish only web assets; never expose backups, rules, tests or local tooling.
const files = ['index.html', 'site.css', 'app.js', 'auth.js', 'info.js', 'accessibility.js',
  'photoshop-studio.js', 'photoshop-studio.css', 'ai-chat.js', 'ai-chat.css',
  'Akshay.jpeg', 'akshay1.jpg', 'ads.txt', 'robots.txt', 'sitemap.xml',
  'googleda53dba0979e17e2.html', 'assets'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, `dist/${file}`, { recursive: true });
