// Server-rendered standalone pages: /services and /faq.
// Rendered as full HTML (not SPA / JS-injected) so Google crawls real, unique URLs.
// Visual aesthetic mirrors index.html exactly — shared nav, footer, fonts, colors, components.

// Booking URL — canonical source is the BOOKING_URL env var (set in Railway).
// Falls back to the current Acuity link so local/dev rendering still works.
const ACUITY = process.env.BOOKING_URL || 'https://undertoneskn.as.me/schedule/80fd8a11';
const PHONE = '3059650145';
const SMS = `sms:${PHONE}`;
const OG_IMAGE = 'https://res.cloudinary.com/dera3kj2v/image/upload/v1777428668/7_p4nlnv.jpg';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PROVIDER = {
  '@type': 'BeautySalon',
  name: 'Undertone SKN',
  image: OG_IMAGE,
  telephone: '+13059650145',
  url: 'https://www.undertoneskn.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '2915 Biscayne Blvd Suite 200-29',
    addressLocality: 'Miami',
    addressRegion: 'FL',
    postalCode: '33137',
    addressCountry: 'US'
  }
};

const AREA_SERVED = { '@type': 'Place', name: 'Edgewater, Miami, FL' };

// ===================== GTM (matches index.html) =====================
const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TTZ4VVK');</script>
<!-- End Google Tag Manager -->`;

const GTM_BODY = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TTZ4VVK" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Epilogue:wght@300;400;500&family=Syne+Mono&family=Syne:wght@400;500;600&display=swap" rel="stylesheet">`;

const FAVICON = `<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon_32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon_16.png">
<link rel="apple-touch-icon" sizes="128x128" href="/favicon_128.png">`;

// ===================== SHARED CSS (copied from index.html) =====================
const SHARED_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --cream-1: #F6F3EC; --cream-2: #ECE4DA; --taupe: #B9A590;
  --brown-dark: #574C3F; --brown-darkest: #36302A;
  --text-primary: #36302A; --text-secondary: #574C3F; --text-light: #B9A590;
}
html { scroll-behavior: smooth; }
body {
  background: var(--cream-1); color: var(--text-primary);
  font-family: 'Epilogue', sans-serif; font-size: 17px; line-height: 1.6; overflow-x: hidden;
}

/* NAV */
nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: var(--cream-1);
  border-bottom: 1px solid rgba(87,76,63,0.1); padding: 0 40px; height: 56px;
  display: flex; align-items: center; justify-content: space-between; }
.nav-logo { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 2px;
  text-transform: uppercase; color: var(--text-primary); text-decoration: none; }
.nav-links { display: flex; align-items: center; gap: 32px; list-style: none; }
.nav-links a { font-family: 'Epilogue', sans-serif; font-size: 13px; color: var(--text-primary);
  text-decoration: none; transition: color 0.2s; }
.nav-links a:hover { color: var(--taupe); }
.nav-links a.active { text-decoration: underline; text-underline-offset: 4px; }
.nav-cta { font-family: 'Syne Mono', monospace; font-size: 12px; color: var(--text-primary);
  text-decoration: none; letter-spacing: 1px; border-bottom: 1px solid var(--text-primary);
  padding-bottom: 2px; transition: color 0.2s, border-color 0.2s; }
.nav-cta:hover { color: var(--taupe); border-color: var(--taupe); }
.nav-mobile-toggle { display: none; background: none; border: none; cursor: pointer;
  flex-direction: column; gap: 5px; padding: 4px; }
.nav-mobile-toggle span { display: block; width: 22px; height: 1px; background: var(--text-primary); transition: all 0.3s; }
.mobile-menu { display: none; position: fixed; top: 56px; left: 0; right: 0; background: var(--cream-1);
  border-bottom: 1px solid rgba(87,76,63,0.1); padding: 24px 40px; z-index: 99; flex-direction: column; gap: 20px; }
.mobile-menu.open { display: flex; }
.mobile-menu a { font-family: 'Epilogue', sans-serif; font-size: 15px; color: var(--text-primary); text-decoration: none; }
@media (max-width: 768px) {
  nav { padding: 0 24px; }
  .nav-links { display: none; }
  .nav-mobile-toggle { display: flex; }
  .mobile-menu { padding: 24px; }
}

/* BUTTONS */
.btn-outline { display: inline-block; font-family: 'Syne Mono', monospace; font-size: 12px;
  letter-spacing: 1px; color: var(--text-primary); border: 1px solid var(--text-primary);
  padding: 14px 32px; text-decoration: none; transition: background 0.2s, color 0.2s; }
.btn-outline:hover { background: var(--text-primary); color: var(--cream-1); }

/* FOOTER */
footer { background: var(--brown-darkest); padding: 60px; }
.footer-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; max-width: 1080px; margin: 0 auto; align-items: center; }
.footer-brand h3 { font-family: 'Lato', sans-serif; font-size: 28px; font-weight: 300; color: var(--cream-1); margin-bottom: 16px; }
.footer-brand p { font-family: 'Epilogue', sans-serif; font-size: 13px; color: var(--taupe); line-height: 1.7; margin-bottom: 8px; }
.footer-brand .appt { font-family: 'Epilogue', sans-serif; font-size: 13px; font-weight: 500; font-style: italic; color: var(--cream-2); }
.footer-contact { text-align: right; }
.footer-cta { display: inline-block; font-family: 'Syne Mono', monospace; font-size: 13px; letter-spacing: 2px;
  color: var(--cream-1); text-decoration: none; border-bottom: 1px solid var(--taupe); padding-bottom: 4px; margin-bottom: 32px; }
.footer-address { font-family: 'Epilogue', sans-serif; font-size: 12px; color: var(--taupe); line-height: 1.8; }
.footer-address a { color: var(--taupe); text-decoration: none; }
.footer-bottom { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(185,165,144,0.15);
  display: flex; justify-content: space-between; align-items: center; max-width: 1080px; margin-left: auto; margin-right: auto; }
.footer-bottom p { font-family: 'Epilogue', sans-serif; font-size: 11px; color: rgba(185,165,144,0.4); }
.footer-links { display: flex; gap: 24px; }
.footer-links a { font-family: 'Epilogue', sans-serif; font-size: 11px; color: rgba(185,165,144,0.4); text-decoration: none; transition: color 0.2s; }
.footer-links a:hover { color: var(--taupe); }
@media (max-width: 768px) {
  footer { padding: 48px 24px; }
  .footer-layout { grid-template-columns: 1fr; }
  .footer-contact { text-align: left; }
  .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
}

/* FLOATING TEXT ME */
.floating-cta { position: fixed; bottom: 28px; right: 28px; z-index: 999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.floating-btn { display: flex; align-items: center; gap: 10px; background: var(--brown-darkest); border: 1px solid var(--taupe);
  padding: 12px 20px; text-decoration: none; transition: background 0.2s, transform 0.2s; box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
.floating-btn:hover { background: var(--brown-dark); transform: translateY(-2px); }
.floating-btn span { font-family: 'Syne Mono', monospace; font-size: 11px; letter-spacing: 2px; color: var(--cream-1); text-transform: uppercase; }
.floating-btn .float-icon { font-size: 14px; }
@media (max-width: 768px) { .floating-cta { bottom: 20px; right: 16px; } .floating-btn { padding: 10px 16px; } }

/* BACK TO TOP */
.back-to-top { position: fixed; bottom: 90px; right: 28px; z-index: 998; width: 40px; height: 40px;
  background: var(--cream-2); border: 1px solid var(--taupe); display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0; transform: translateY(10px); transition: opacity 0.3s, transform 0.3s; font-size: 16px; color: var(--text-primary); }
.back-to-top.visible { opacity: 1; transform: translateY(0); }
.back-to-top:hover { background: var(--taupe); color: var(--cream-1); }
@media (max-width: 768px) { .back-to-top { bottom: 76px; right: 16px; } }

/* COOKIE BANNER */
.cookie-banner { position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: var(--brown-darkest);
  border-top: 1px solid rgba(185,165,144,0.2); padding: 16px 40px; display: flex; align-items: center; justify-content: space-between;
  gap: 24px; transform: translateY(100%); transition: transform 0.4s ease; }
.cookie-banner.visible { transform: translateY(0); }
.cookie-text { font-family: 'Epilogue', sans-serif; font-size: 12px; color: var(--taupe); line-height: 1.6; max-width: 600px; }
.cookie-text a { color: var(--cream-2); text-decoration: underline; }
.cookie-buttons { display: flex; gap: 12px; flex-shrink: 0; }
.cookie-accept { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 2px; color: var(--cream-1);
  background: var(--brown-dark); border: 1px solid var(--taupe); padding: 10px 20px; cursor: pointer; text-transform: uppercase; transition: background 0.2s; }
.cookie-accept:hover { background: var(--taupe); }
.cookie-decline { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 2px; color: var(--taupe);
  background: transparent; border: none; padding: 10px; cursor: pointer; text-transform: uppercase; }
@media (max-width: 768px) {
  .cookie-banner { flex-direction: column; align-items: flex-start; padding: 20px 24px; }
  .cookie-buttons { width: 100%; }
  .cookie-accept { flex: 1; text-align: center; }
}
`;

// ===================== SHARED CHROME (markup) =====================
function navHTML(active) {
  const cls = (p) => active === p ? ' class="active"' : '';
  return `<nav>
  <a href="/" class="nav-logo">UNDERTONE SKN</a>
  <ul class="nav-links">
    <li><a href="/">Home</a></li>
    <li><a href="/services"${cls('services')}>Services</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/#about-section">About</a></li>
    <li><a href="/faq"${cls('faq')}>FAQs</a></li>
    <li><a href="${SMS}" class="nav-cta">TEXT ME</a></li>
  </ul>
  <button class="nav-mobile-toggle" onclick="toggleMobileMenu()" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<div class="mobile-menu" id="mobileMenu">
  <a href="/">Home</a>
  <a href="/services">Services</a>
  <a href="/blog">Blog</a>
  <a href="/faq">FAQs</a>
  <a href="${SMS}">TEXT ME</a>
</div>`;
}

const FOOTER_HTML = `<footer>
  <div class="footer-layout">
    <div class="footer-brand">
      <h3>Undertone Skn</h3>
      <p>Serving clients seeking jaw tension release, facial sculpting, and nervous system regulation in Edgewater Miami.</p>
      <p class="appt">By appointment only.</p>
    </div>
    <div class="footer-contact">
      <a href="${SMS}" class="footer-cta">TEXT ME</a>
      <div class="footer-address">
        <p>2915 Biscayne Blvd Suite 200-29</p>
        <p>Edgewater Miami, FL 33137</p>
        <p><a href="tel:${PHONE}">305-965-0145</a></p>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2025 Undertone SKN. All rights reserved.</p>
    <div class="footer-links">
      <a href="/terms">Terms of Service</a>
      <a href="/privacy">Privacy Policy</a>
    </div>
  </div>
</footer>`;

const FLOATING_HTML = `<button class="back-to-top" id="backToTop" onclick="window.scrollTo({top:0,behavior:'smooth'})" aria-label="Back to top">&uarr;</button>

<div class="cookie-banner" id="cookieBanner">
  <p class="cookie-text">We use cookies to analyze site traffic and improve your experience. By continuing to use this site you agree to our use of cookies. <a href="/privacy">Privacy Policy</a></p>
  <div class="cookie-buttons">
    <button class="cookie-accept" onclick="acceptCookies()">Accept</button>
    <button class="cookie-decline" onclick="declineCookies()">Decline</button>
  </div>
</div>

<div class="floating-cta">
  <a href="${SMS}" class="floating-btn">
    <span class="float-icon">&#128172;</span>
    <span>Text Me</span>
  </a>
</div>`;

const SHARED_JS = `
function toggleMobileMenu() { document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMobileMenu() { document.getElementById('mobileMenu').classList.remove('open'); }
function toggleFaq(btn) { btn.parentElement.classList.toggle('open'); }

var backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', function() {
  if (window.scrollY > 400) { backToTop.classList.add('visible'); }
  else { backToTop.classList.remove('visible'); }
});

function showCookieBanner() {
  if (!localStorage.getItem('cookieConsent')) {
    setTimeout(function() { document.getElementById('cookieBanner').classList.add('visible'); }, 2000);
  }
}
function acceptCookies() { localStorage.setItem('cookieConsent', 'accepted'); document.getElementById('cookieBanner').classList.remove('visible'); }
function declineCookies() { localStorage.setItem('cookieConsent', 'declined'); document.getElementById('cookieBanner').classList.remove('visible'); }
showCookieBanner();

document.querySelectorAll('img').forEach(function(img) {
  if (!img.hasAttribute('loading')) { img.setAttribute('loading', 'lazy'); }
});
`;

// ===================== SERVICES DATA =====================
const SERVICES = [
  // TEMPORARILY HIDDEN - Unclench service paused from public menu. Re-enable when ready.
  // (Commenting out this entry removes both the service card AND its JSON-LD schema,
  //  since both are generated from the SERVICES array below.)
  /*
  {
    num: '01', theme: 'light', name: 'Unclench', price: '185', duration: '1 hour',
    serviceType: 'Jaw Tension Release',
    schemaDesc: 'Focused jaw and facial tension release in Edgewater Miami. Works the jaw, face, and the holding patterns that keep the face tight, heavy, and locked. No skincare — pure, intentional release of where stress physically lives.',
    desc: [
      'Pure tension release. This session works the jaw, face, and the holding patterns that make your face feel tight, heavy, and locked. No skincare. No fluff. Just focused, intentional work on where stress physically lives.',
      'If you clench, grind, carry your stress in your face, or feel like your jaw never fully relaxes — this is where you start. It is the foundation every other session builds on.'
    ],
    whoFor: [
      'First-timers who want to understand what their face has been holding',
      'Chronic clenchers and grinders, day or night',
      'High-stress lifestyles where tension settles in the jaw and temples',
      'Anyone whose jaw never seems to fully let go'
    ],
    whatChanges: [
      'Jaw mobility and facial openness return',
      'Reduced tension through the jaw, temples, and head',
      'A noticeable nervous-system downshift',
      'That feeling of relief that finally lands'
    ]
  },
  */
  {
    num: '02', theme: 'light', name: 'Facial Alchemy | Deep Reset', price: '235', duration: '1 hour 20 minutes',
    serviceType: 'Facial Tension Release & Skin Treatment',
    schemaDesc: 'Extended jaw and facial tension release plus skin work in Edgewater Miami. Adds barrier restoration, circulation activation, and fluid-movement support for clients whose skin is showing the stress alongside the tension.',
    desc: [
      'Everything in the Unclench — plus skin. This extended session adds barrier restoration, circulation activation, and fluid-movement support for clients whose skin is showing the stress too. Dullness, puffiness, sensitivity, heaviness — addressed alongside the tension work.',
      'The extra twenty minutes is where the skin catches up to the nervous system.'
    ],
    whoFor: [
      'Burnout states where the whole face feels depleted',
      'Skin that looks tired alongside a face that feels tense',
      'Anyone whose muscle and skin both need to reset in one visit',
      'Clients ready to go a layer deeper than the Unclench'
    ],
    whatChanges: [
      'Tension release plus a visibly calmer, brighter complexion',
      'Reduced puffiness and restored fluid movement',
      'A supported, more resilient skin barrier',
      'A regulated nervous system — and skin that finally catches up'
    ]
  },
  {
    num: '03', theme: 'dark', name: 'Contour + Define | Sculpt Method', price: '245', duration: '1 hour 30 minutes',
    serviceType: 'Facial Sculpting',
    schemaDesc: 'A precision facial sculpting session in Edgewater Miami designed to enhance facial structure, lift definition, and improve visible contour through fascia release and circulation activation.',
    desc: [
      'A precision sculpting session designed to enhance facial structure, lift definition, and improve visible contour.',
      'Built on fascia release and circulation activation to support muscle tone and structural clarity — lift shows up as a natural outcome of releasing what was holding the face down.'
    ],
    whoFor: [
      'Facial sculpting maintenance between corrective work',
      'Event prep when you want definition at its best',
      'Anyone whose primary goal is lift, contour, and structure',
      'Clients who already know the release work and want to build on it'
    ],
    whatChanges: [
      'Enhanced contour and sharper definition',
      'Improved muscle tone and structural clarity',
      'Restored circulation and a visible facial lift',
      'Structure that returns as the system downshifts'
    ]
  },
  {
    num: '04', theme: 'mid', name: 'Monthly | Barrier + Circulation', price: '235', duration: '1 hour 30 minutes',
    serviceType: 'Skin Barrier & Circulation Treatment',
    schemaDesc: 'A monthly maintenance treatment in Edgewater Miami supporting barrier repair, skin resilience, circulation, and lymphatic detoxification to keep skin calm, balanced, and performing between advanced sessions.',
    desc: [
      'Supports barrier repair, skin resilience, circulation, and lymphatic detoxification.',
      'Helps reinforce the skin barrier, improve facial puffiness, and maintain long-term skin function — keeping skin calm, balanced, and performing optimally between advanced or corrective sessions.'
    ],
    whoFor: [
      'Redness, dryness, dullness, and congestion',
      'Reactive or easily-overwhelmed skin',
      'Anyone maintaining results between deeper sessions',
      'Clients who want a consistent monthly reset'
    ],
    whatChanges: [
      'A stronger, more resilient skin barrier',
      'Reduced puffiness and improved circulation',
      'Calmer, more balanced skin',
      'Long-term skin function maintained month to month'
    ]
  }
];

// ===================== SERVICES PAGE CSS =====================
const SERVICES_CSS = `
.services-hero { background: var(--brown-darkest); padding: 100px 60px 80px; margin-top: 56px; position: relative; overflow: hidden; }
.services-hero::after { content: 'THE WORK'; position: absolute; right: -20px; bottom: -40px; font-family: 'Lato', sans-serif;
  font-size: 160px; font-weight: 700; color: rgba(185,165,144,0.05); letter-spacing: 8px; pointer-events: none; white-space: nowrap; }
.services-hero .services-eyebrow { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 4px; color: var(--taupe); text-transform: uppercase; margin-bottom: 16px; }
.services-hero h1 { font-family: 'Lato', sans-serif; font-size: clamp(40px, 7vw, 88px); font-weight: 300; color: var(--cream-1); letter-spacing: 6px; margin-bottom: 20px; line-height: 1.05; }
.services-hero p { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--taupe); max-width: 480px; line-height: 1.8; }

.services-section-light { background: var(--cream-1); padding: 80px 60px; }
.services-section-dark { background: var(--brown-darkest); padding: 80px 60px; }
.services-section-mid { background: var(--cream-2); padding: 80px 60px; }
.services-inner { max-width: 880px; margin: 0 auto; }

.services-category-header { display: flex; align-items: center; gap: 24px; margin-bottom: 48px; }
.services-category-header::after { content: ''; flex: 1; height: 1px; background: rgba(185,165,144,0.3); }
.services-category-label { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 4px; color: var(--taupe); text-transform: uppercase; white-space: nowrap; }

.service-card { border-left: 2px solid var(--taupe); padding: 32px 32px 32px 36px; margin-bottom: 24px; background: var(--cream-2); transition: border-color 0.3s, transform 0.2s; position: relative; }
.service-card:hover { border-color: var(--brown-dark); transform: translateX(4px); }
.service-card-dark { border-left: 2px solid rgba(185,165,144,0.3); padding: 40px 40px 40px 44px; margin-bottom: 24px; background: rgba(255,255,255,0.04); transition: border-color 0.3s, transform 0.2s; }
.service-card-dark:hover { border-color: var(--taupe); transform: translateX(4px); }

.service-number { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 3px; color: var(--taupe); margin-bottom: 16px; opacity: 0.6; }
.service-title { font-family: 'Lato', sans-serif; font-size: 24px; font-weight: 300; color: var(--text-primary); margin-bottom: 4px; letter-spacing: 1px; }
.service-title-dark { color: var(--cream-1); }
.service-price-row { display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(185,165,144,0.2); }
.service-price { font-family: 'Lato', sans-serif; font-size: 40px; font-weight: 300; color: var(--text-primary); line-height: 1; }
.service-price-dark { color: var(--cream-1); }
.service-meta { font-family: 'Syne Mono', monospace; font-size: 11px; letter-spacing: 1px; color: var(--text-light); }
.service-desc p { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--text-secondary); line-height: 1.9; margin-bottom: 12px; }
.service-desc-dark p { color: var(--taupe); }

/* Deep content blocks (Who it's for / What changes) */
.service-details { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(185,165,144,0.2); }
.service-detail-label { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--taupe); margin-bottom: 14px; }
.service-detail ul { list-style: none; }
.service-detail li { font-family: 'Epilogue', sans-serif; font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 10px; padding-left: 18px; position: relative; }
.service-detail li::before { content: '\\2014'; position: absolute; left: 0; color: var(--taupe); }
.service-card-dark .service-detail li { color: var(--taupe); }
.service-card-dark .service-details { border-top-color: rgba(185,165,144,0.15); }

.service-book-btn { display: inline-block; font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 3px; color: var(--cream-1);
  background: var(--brown-darkest); padding: 14px 32px; text-decoration: none; margin-top: 28px; text-transform: uppercase; transition: background 0.2s, letter-spacing 0.2s; }
.service-book-btn:hover { background: var(--brown-dark); letter-spacing: 4px; }
.service-book-btn-light { background: transparent; color: var(--cream-1); border: 1px solid rgba(185,165,144,0.4); }
.service-book-btn-light:hover { background: rgba(185,165,144,0.1); border-color: var(--taupe); }

.services-bottom-cta { position: relative; padding: 100px 60px; text-align: center; overflow: hidden; background: var(--cream-1); border-top: 1px solid rgba(185,165,144,0.3); }
.services-bottom-cta p { font-family: 'Lato', sans-serif; font-size: clamp(24px, 4vw, 44px); font-weight: 300; color: var(--text-primary); margin-bottom: 16px; letter-spacing: 1px; }
.services-bottom-cta .cta-sub { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--text-secondary); margin-bottom: 36px; }
.services-bottom-cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }

@media (max-width: 768px) {
  .services-hero { padding: 80px 24px 60px; }
  .services-hero::after { font-size: 80px; }
  .services-section-light, .services-section-dark, .services-section-mid { padding: 48px 24px; }
  .service-card, .service-card-dark { padding: 24px 20px 24px 24px; }
  .service-number { display: none; }
  .service-price { font-size: 28px; }
  .service-price-row { margin-bottom: 16px; padding-bottom: 14px; }
  .service-desc p { font-size: 13px; line-height: 1.7; }
  .service-details { grid-template-columns: 1fr; gap: 24px; }
  .service-book-btn { display: block; text-align: center; padding: 14px; }
  .services-bottom-cta { padding: 60px 24px; }
}
`;

function serviceCardHTML(s) {
  const dark = s.theme === 'dark';
  const cardCls = dark ? 'service-card-dark' : 'service-card';
  const titleCls = dark ? 'service-title service-title-dark' : 'service-title';
  const priceCls = dark ? 'service-price service-price-dark' : 'service-price';
  const descCls = dark ? 'service-desc service-desc-dark' : 'service-desc';
  const btnCls = dark ? 'service-book-btn service-book-btn-light' : 'service-book-btn';
  const li = (arr) => arr.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  return `    <div class="${cardCls}">
      <p class="service-number">${s.num}</p>
      <h2 class="${titleCls}">${escapeHtml(s.name)}</h2>
      <div class="service-price-row">
        <p class="${priceCls}">$${s.price}</p>
        <p class="service-meta">${escapeHtml(s.duration)}</p>
      </div>
      <div class="${descCls}">
        ${s.desc.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n        ')}
      </div>
      <div class="service-details">
        <div class="service-detail">
          <p class="service-detail-label">Who it's for</p>
          <ul>${li(s.whoFor)}</ul>
        </div>
        <div class="service-detail">
          <p class="service-detail-label">What changes</p>
          <ul>${li(s.whatChanges)}</ul>
        </div>
      </div>
      <a href="${ACUITY}" target="_blank" rel="noopener" class="${btnCls}">Book This Session</a>
    </div>`;
}

function serviceSchema(s) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    serviceType: s.serviceType,
    description: s.schemaDesc,
    provider: PROVIDER,
    areaServed: AREA_SERVED,
    url: 'https://www.undertoneskn.com/services',
    offers: {
      '@type': 'Offer',
      price: s.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: ACUITY
    }
  };
}

function renderServicesHTML() {
  const title = 'Facial Sculpting, Jaw Tension Release & Skin Services | Undertone SKN Edgewater Miami';
  const desc = "Explore Undertone SKN's facial sculpting, jaw tension release, and skin services in Edgewater Miami — Facial Alchemy, the Sculpt Method, and monthly barrier + circulation. By appointment only.";
  const canonical = 'https://www.undertoneskn.com/services';

  const release = SERVICES.filter((s) => s.theme === 'light');
  const sculpt = SERVICES.filter((s) => s.theme === 'dark');
  const skin = SERVICES.filter((s) => s.theme === 'mid');

  const schemaScripts = SERVICES
    .map((s) => `<script type="application/ld+json">${JSON.stringify(serviceSchema(s))}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${GTM_HEAD}
<title>${title}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="keywords" content="facial sculpting Edgewater Miami, jaw tension release Miami, facial alchemy Miami, sculpt method, skin barrier facial Miami, nervous system facial">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Undertone SKN">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${OG_IMAGE}">
${FAVICON}
${schemaScripts}
${FONTS}
<style>${SHARED_CSS}${SERVICES_CSS}</style>
</head>
<body>
${GTM_BODY}
${navHTML('services')}

<div class="services-hero">
  <p class="services-eyebrow">Undertone SKN &middot; Edgewater Miami</p>
  <h1>THE WORK</h1>
  <p>Every session is designed around one principle &mdash; release what the face is holding, restore what it has been missing. Jaw tension release, facial sculpting, and skin work, by appointment only in Edgewater Miami.</p>
</div>

<div class="services-section-light">
  <div class="services-inner">
    <div class="services-category-header"><p class="services-category-label">Release</p></div>
${release.map(serviceCardHTML).join('\n')}
  </div>
</div>

<div class="services-section-dark">
  <div class="services-inner">
    <div class="services-category-header"><p class="services-category-label">Sculpt</p></div>
${sculpt.map(serviceCardHTML).join('\n')}
  </div>
</div>

<div class="services-section-mid">
  <div class="services-inner">
    <div class="services-category-header"><p class="services-category-label">Skin</p></div>
${skin.map(serviceCardHTML).join('\n')}
  </div>
</div>

<div class="services-bottom-cta">
  <div class="services-inner">
    <p>Not sure which session is right for you?</p>
    <p class="cta-sub">Text Zinthia and she will point you to the right starting place.</p>
    <div class="services-bottom-cta-actions">
      <a href="${SMS}" class="btn-outline">Text Zinthia</a>
      <a href="${ACUITY}" target="_blank" rel="noopener" class="btn-outline">Book Online</a>
    </div>
  </div>
</div>

${FOOTER_HTML}
${FLOATING_HTML}
<script>${SHARED_JS}</script>
</body>
</html>`;
}

// ===================== FAQ DATA (from index.html) =====================
const FAQS = [
  { q: "What services do you offer?", a: "Sessions focus on jaw tension release, facial sculpting, and nervous system regulation through hands-on fascia release work. Every session is tailored to what your face and nervous system needs that day." },
  { q: "How often should I come in?", a: "We recommend once a month for maintenance, but many clients come more frequently when working through chronic tension. During your first session Zinthia will recommend a personalized cadence." },
  { q: "What types of products do you use in your sessions?", a: "Only high-quality skincare products free from harmful chemicals, safe for all skin types. Products are carefully selected to support the work being done in session." },
  { q: "How long do the sessions take?", a: "Sessions typically last 60–90 minutes depending on the service. Zinthia will advise on timing when you book." },
  { q: "Will the sessions be painful?", a: "Fascia release work involves intentional pressure — some clients describe it as intense but deeply relieving. Zinthia adjusts throughout based on your feedback and comfort." },
  { q: "How soon can I expect to see results?", a: "Many clients feel results immediately — jaw mobility, reduced pressure, a sense of calm. Structural and visible changes build over multiple sessions." },
  { q: "Can I wear makeup after a session?", a: "We recommend avoiding makeup for at least 24 hours after any session to allow your skin to fully benefit from the work." },
  { q: "How much do your services cost?", a: "Pricing varies by service. Please reach out via text or the booking link for current rates and packages." },
  { q: "How do I book an appointment?", a: "Book online through our booking link or text us at 305-965-0145. By appointment only." },
  { q: "What happens during a consultation?", a: "Zinthia evaluates your face, jaw, and facial tension patterns, discusses your history and goals, and recommends a session plan. This is your opportunity to ask everything." },
  { q: "Do you offer services for men?", a: "Absolutely. Jaw tension and nervous system overload don't discriminate. Sessions are tailored to every individual." },
  { q: "What if I need to cancel my appointment?", a: "Please give at least 24 hours notice to avoid fees. We understand things come up — just reach out as soon as you know." },
  { q: "Are your services safe during pregnancy?", a: "We recommend consulting your doctor before booking during pregnancy. Pregnancy-safe options may be available — reach out to discuss." },
  { q: "How can I maintain my results at home?", a: "Zinthia will provide personalized at-home recommendations after your session — exercises, tools, and habits that support the work done in studio." },
  { q: "How often should I come in for a follow-up?", a: "Follow-up cadence depends on your needs and goals. Zinthia will recommend a schedule that works for you." },
  { q: "What if I have specific skin concerns or allergies?", a: "Let us know before your session. We work with what your skin needs — no pressure, no products that don't serve you." },
  { q: "Do you work with people experiencing jaw tension or chronic facial holding?", a: "Yes. Many people who come to Undertone SKN carry chronic jaw tightness, facial holding patterns, stress-related facial pressure, and nervous system overload. This work is designed to support the face and nervous system — not replace medical care. We always recommend working alongside your healthcare provider." }
];

// ===================== FAQ PAGE CSS =====================
const FAQ_CSS = `
.faq-hero { background: var(--brown-darkest); padding: 100px 60px 60px; margin-top: 56px; position: relative; overflow: hidden; }
.faq-hero .faq-eyebrow { font-family: 'Syne Mono', monospace; font-size: 10px; letter-spacing: 4px; color: var(--taupe); text-transform: uppercase; margin-bottom: 16px; }
.faq-hero h1 { font-family: 'Lato', sans-serif; font-size: clamp(40px, 6vw, 72px); font-weight: 300; color: var(--cream-1); letter-spacing: 4px; line-height: 1; margin-bottom: 16px; }
.faq-hero p { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--taupe); max-width: 460px; line-height: 1.8; }
.faq-body { background: var(--cream-1); padding: 60px; }
.faq-list { max-width: 760px; margin: 0 auto; border-top: 1px solid rgba(87,76,63,0.2); }
.faq-item { border-bottom: 1px solid rgba(87,76,63,0.2); }
.faq-trigger { width: 100%; background: none; border: none; cursor: pointer; padding: 24px 0; display: flex; align-items: center; justify-content: space-between; text-align: left; gap: 16px; }
.faq-trigger span { font-family: 'Lato', sans-serif; font-size: 16px; font-weight: 400; color: var(--text-primary); line-height: 1.4; }
.faq-icon { font-size: 20px; color: var(--text-secondary); transition: transform 0.3s; flex-shrink: 0; }
.faq-item.open .faq-icon { transform: rotate(180deg); }
.faq-answer { display: none; padding: 0 0 24px; }
.faq-item.open .faq-answer { display: block; }
.faq-answer p { font-family: 'Epilogue', sans-serif; font-size: 14px; color: var(--text-secondary); line-height: 1.8; }
.faq-cta { max-width: 760px; margin: 48px auto 0; text-align: center; }
.faq-cta p { font-family: 'Lato', sans-serif; font-size: 22px; font-weight: 300; color: var(--text-primary); margin-bottom: 24px; }
.faq-cta-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
@media (max-width: 768px) {
  .faq-hero { padding: 80px 24px 48px; }
  .faq-body { padding: 48px 24px; }
}
`;

function renderFaqHTML() {
  const title = 'Frequently Asked Questions | Undertone SKN Miami';
  const desc = 'Answers to common questions about jaw tension release, facial sculpting, and nervous system regulation sessions at Undertone SKN in Edgewater Miami — booking, pricing, what to expect, pregnancy, aftercare, and more.';
  const canonical = 'https://www.undertoneskn.com/faq';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  const faqItems = FAQS.map((f) => `      <div class="faq-item">
        <button class="faq-trigger" onclick="toggleFaq(this)">
          <span>${escapeHtml(f.q)}</span>
          <span class="faq-icon">&#8744;</span>
        </button>
        <div class="faq-answer">
          <p>${escapeHtml(f.a)}</p>
        </div>
      </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${GTM_HEAD}
<title>${title}</title>
<meta name="description" content="${escapeHtml(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="Undertone SKN">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(desc)}">
<meta name="twitter:image" content="${OG_IMAGE}">
${FAVICON}
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
${FONTS}
<style>${SHARED_CSS}${FAQ_CSS}</style>
</head>
<body>
${GTM_BODY}
${navHTML('faq')}

<div class="faq-hero">
  <p class="faq-eyebrow">Undertone SKN &middot; Edgewater Miami</p>
  <h1>FAQ</h1>
  <p>Everything you might want to know before your first session &mdash; what to expect, how to book, and how the work feels.</p>
</div>

<div class="faq-body">
  <div class="faq-list">
${faqItems}
  </div>
  <div class="faq-cta">
    <p>Still have a question?</p>
    <div class="faq-cta-actions">
      <a href="${SMS}" class="btn-outline">Text Me</a>
      <a href="${ACUITY}" target="_blank" rel="noopener" class="btn-outline">Book a Session</a>
    </div>
  </div>
</div>

${FOOTER_HTML}
${FLOATING_HTML}
<script>${SHARED_JS}</script>
</body>
</html>`;
}

module.exports = { renderServicesHTML, renderFaqHTML };
