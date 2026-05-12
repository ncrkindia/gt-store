import express from 'express';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';

import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const API_URL = process.env.API_BASE_URL || 'http://api-gateway:4003/api';
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || 'https://gts-api.slpro.in';
const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'https://gtstore.slpro.in';

// Backwards compatibility Proxy matching the original Nginx configuration
app.use('/api', createProxyMiddleware({
    target: 'http://api-gateway:4003',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api', // Preserve the path as configured in gateway mapping
    },
}));

const STATIC_PAGES = {
    '/about': { title: 'About Us', desc: 'Learn more about GT Store and our vision.' },
    '/contact': { title: 'Contact Us', desc: 'Get in touch with our customer support team.' },
    '/careers': { title: 'Careers', desc: 'Join the GT Store family and grow your career.' },
    '/press': { title: 'Press Room', desc: 'Latest news and press releases from GT Store.' },
    '/faq': { title: 'FAQ', desc: 'Find answers to frequently asked questions.' },
    '/shipping': { title: 'Shipping Policy', desc: 'Review our transparent shipping procedures.' },
    '/returns': { title: 'Return Policy', desc: 'Understand our seamless returns policy.' },
    '/terms': { title: 'Terms of Service', desc: 'Read our official terms of service guidelines.' },
    '/privacy': { title: 'Privacy Policy', desc: 'We value your privacy. Read our detailed policy.' },
    '/security': { title: 'Security', desc: 'Safe and secure shopping guarantee at GT Store.' },
};

const injectMeta = (indexHTML, { title, desc, img, pageUrl }) => {
    const fullTitle = `${title} | GT Store`;
    const headInjection = `
    <title>${fullTitle}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${fullTitle}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${fullTitle}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${img}" />
    `;
    
    let injected = indexHTML.replace(/<title>.*?<\/title>/, headInjection);
    if (injected === indexHTML) {
        injected = indexHTML.replace('<head>', `<head>${headInjection}`);
    }
    return injected;
};

const resolveImg = (img) => {
  if (!img) return `${PUBLIC_API_URL}/assets/logo.png`;
  if (img.startsWith('http')) return img;
  return `${PUBLIC_API_URL}${img.startsWith('/') ? '' : '/'}${img}`;
};

// Static Information Page SEO Optimization
app.get(['/about', '/careers', '/press', '/faq', '/shipping', '/returns', '/terms', '/privacy', '/security', '/contact'], (req, res) => {
    try {
        const indexHTML = fs.readFileSync(path.resolve(__dirname, './dist/index.html'), 'utf-8');
        const pageData = STATIC_PAGES[req.path] || { title: 'GT Store', desc: 'Experience premium shopping with GT Store.' };
        
        const responseHTML = injectMeta(indexHTML, {
            title: pageData.title,
            desc: pageData.desc,
            img: resolveImg(null), // Use standard logo
            pageUrl: `${PUBLIC_WEB_URL}${req.path}`
        });
        
        res.send(responseHTML);
    } catch (e) {
        res.sendFile(path.resolve(__dirname, './dist/index.html'));
    }
});

// Dynamic handler for Product Detail URLs
app.get('/p/:slug', async (req, res) => {
    const slug = req.params.slug;
    let indexHTML = '';
    try {
        indexHTML = fs.readFileSync(path.resolve(__dirname, './dist/index.html'), 'utf-8');
    } catch (e) {
        return res.status(500).send("Static index not found");
    }

    try {
        const response = await axios.get(`${API_URL}/products/slug/${slug}`, { timeout: 2000 });
        const product = response.data;

        if (product) {
            const responseHTML = injectMeta(indexHTML, {
                title: product.name,
                desc: product.description || 'Shop premium products at GT Store.',
                img: resolveImg(product.images?.[0]),
                pageUrl: `${PUBLIC_WEB_URL}/p/${slug}`
            });
            return res.send(responseHTML);
        }
    } catch (error) {
        console.error(`[SEO Injection Failed] Slug: ${slug} Err: ${error.message}`);
    }

    res.send(indexHTML);
});

// Handle standard static assets
app.use(express.static(path.resolve(__dirname, './dist')));

// SPA Fallback for all other frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`SEO-Hydration Server booting on port ${PORT}`);
    console.log(`Downstream API targeted at: ${API_URL}`);
});
