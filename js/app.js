/**
 * HAUS OF SNEAKER - Interactive E-Commerce & Continuous Video Engine
 * Blue & White Aesthetic Edition
 */

// --- APPLICATION STATE ---
const state = {
  currentCurrency: 'INR',
  currencyRates: {
    INR: { symbol: 'Rs. ', rate: 1, format: (val) => `Rs. ${val.toLocaleString('en-IN')}.00` },
    USD: { symbol: '$', rate: 0.012, format: (val) => `$${Math.round(val * 0.012)}` },
    EUR: { symbol: '€', rate: 0.011, format: (val) => `€${Math.round(val * 0.011)}` },
    GBP: { symbol: '£', rate: 0.0095, format: (val) => `£${Math.round(val * 0.0095)}` }
  },
  activeGenderFilter: 'all',
  sortBy: 'featured',
  cardImageIndices: {},
  heroSlideIndex: 0,
  heroAutoPlayTimer: null,
  cart: JSON.parse(localStorage.getItem('core_cart') || '[]'),
  wishlist: JSON.parse(localStorage.getItem('core_wishlist') || '[]'),
  appliedPromo: null,
  activeQuickViewProduct: null,
  activeReel: null
};

// Fallback image generator
function getSvgShoeFallback(name, color = '#0a0a0a') {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700" fill="%23f0f5ff"><rect width="600" height="700" fill="%23f0f5ff"/><g transform="translate(80, 220)"><path d="M40 180 C80 180, 110 170, 140 130 C170 90, 240 50, 310 60 C370 70, 420 120, 440 180 C410 200, 370 210, 320 210 C240 210, 150 205, 40 205 Z" fill="${encodeURIComponent(color)}" opacity="0.9"/><path d="M30 195 C120 195, 280 200, 450 195 C460 215, 440 240, 410 245 C320 250, 120 250, 20 235 C10 215, 20 195, 30 195 Z" fill="%23051336"/><text x="220" y="290" font-family="sans-serif" font-weight="900" font-size="22" fill="%230047ff" text-anchor="middle" letter-spacing="4">HAUS OF SNEAKER</text></g></svg>`;
}

function handleCardImageError(imgEl, productName, hexColor) {
  if (!imgEl) return;
  if (!imgEl.dataset.videoFallbackTried && imgEl.src && imgEl.src.includes('lh3.googleusercontent.com/d/')) {
    imgEl.dataset.videoFallbackTried = '1';
    const match = imgEl.src.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      fetch('/api/video?id=' + fileId, { method: 'GET', headers: { 'Range': 'bytes=0-100' } })
        .then(res => {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('video')) {
            markFileAsVideo(fileId);
            convertToVideoElement(imgEl, '/api/video?id=' + fileId, fileId);
          } else {
            imgEl.onerror = null;
            imgEl.src = getSvgShoeFallback(productName, hexColor);
          }
        })
        .catch(() => {
          imgEl.onerror = null;
          imgEl.src = getSvgShoeFallback(productName, hexColor);
        });
      return;
    }
  }
  imgEl.onerror = null;
  imgEl.src = getSvgShoeFallback(productName, hexColor);
}

// --- CURRENCY FORMATTER ---
function formatPrice(amountInInr) {
  const curr = state.currencyRates[state.currentCurrency];
  return curr.format(amountInInr);
}


// ==========================================
// GOOGLE DRIVE IMAGE URL RESOLVER
// Converts standard Drive share links into direct high-speed CDN images
// ==========================================
function isVideoSource(url) {
  if (!url) return false;
  const u = String(url).toLowerCase();
  // Direct video extensions
  if (u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov')) return true;
  // Known video delivery patterns
  if (u.includes('export=download') || u.includes('type=video') || u.includes('drive.usercontent.google.com/download')) return true;
  return false;
}

// Cache detected video IDs in memory & localStorage so they render as videos immediately on load
const DETECTED_VIDEOS_KEY = 'haus_detected_video_ids';
function getDetectedVideoIds() {
  try {
    const raw = localStorage.getItem(DETECTED_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function markFileAsVideo(fileId) {
  if (!fileId) return;
  try {
    const list = getDetectedVideoIds();
    if (!list.includes(fileId)) {
      list.push(fileId);
      localStorage.setItem(DETECTED_VIDEOS_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

function resolveGoogleDriveMedia(url, size = 'card') {
  if (!url) return { url: '', previewUrl: '', isVideo: false };
  url = String(url).trim();
  if (!url) return { url: '', previewUrl: '', isVideo: false };

  let fileId = '';
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    fileId = fileMatch[1];
  } else {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) fileId = idMatch[1];
  }

  // Known uploaded video drive IDs
  const knownVideoIds = [
    '1GNnLu0JEBlOcPSgIVy_chChWHBAz9Iqx', // Core Men Bold Lug Platform
    '1iNGmuuWBM-LXfAYLLgOst9M06FgarhsJ', // Core Women Sleek Retro Runner
    '1R_lQ237WqhM3A-fF8MEIzUtX7F2UKglJ', // Onitsuka tiger mexico 66 golf yellow video
    '169IQUruZsWR50os6OGsWrhSF57DyRdXp',
    '1l9Ro7s1CgBsELWlnRJPwePIh94P2YZTY',
    '1g7iPwpQcrgMBoQF-A2RVl08Hm9FIlibs',
    '1Z4onDQ9LqGnSqJSHZ0grdkVvIGoio2fH'
  ];

  // Map known Drive video IDs to local static assets if available (for 100% instant autoplay reliability)
  const localVideoOverrides = {
    '1R_lQ237WqhM3A-fF8MEIzUtX7F2UKglJ': 'assets/videos/onitsuka-mexico-66.mp4'
  };

  const detectedList = getDetectedVideoIds();
  const isExplicitVideo = isVideoSource(url) || (fileId && (knownVideoIds.includes(fileId) || detectedList.includes(fileId) || url.includes('video')));

  if (fileId) {
    if (localVideoOverrides[fileId]) {
      return {
        url: localVideoOverrides[fileId],
        previewUrl: localVideoOverrides[fileId],
        isVideo: true
      };
    }
    if (isExplicitVideo) {
      // Direct streamable URL via serverless/edge proxy to eliminate CORS/CORP issues completely
      const proxyUrl = '/api/video?id=' + fileId;
      const posterSize = (size === 'large' || size === 'full') ? '=w900' : '=w600';
      return {
        url: proxyUrl,
        posterUrl: 'https://lh3.googleusercontent.com/d/' + fileId + posterSize,
        previewUrl: 'https://drive.google.com/file/d/' + fileId + '/preview',
        isVideo: true
      };
    }
    // High-speed image CDN for images:
    // 'card' uses =w700 (crisp retina, 80% lighter payload, eliminates lag)
    // 'large' uses =w1200 (ultra high res for full modal)
    const imgSize = (size === 'large' || size === 'full') ? '=w1200' : '=w700';
    return {
      url: 'https://lh3.googleusercontent.com/d/' + fileId + imgSize,
      previewUrl: '',
      isVideo: false
    };
  }

  return {
    url: url,
    isVideo: isVideoSource(url)
  };
}

function resolveGoogleDriveImageUrl(url) {
  const media = resolveGoogleDriveMedia(url);
  return media.url;
}

// ==========================================
// SMART VIDEO PROBE — Detects Drive videos disguised as images
// After products render, tests each lh3 image to see if the
// original Drive file is actually a video. If yes, replaces
// the <img> with a native <video autoplay muted loop playsinline>.
// ==========================================
// Session cache for images confirmed as NOT videos, avoiding duplicate probing
const KNOWN_NOT_VIDEOS_KEY = 'haus_known_not_videos';
function getKnownNotVideoIds() {
  try {
    const raw = sessionStorage.getItem(KNOWN_NOT_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function markFileAsNotVideo(fileId) {
  if (!fileId) return;
  try {
    const list = getKnownNotVideoIds();
    if (!list.includes(fileId)) {
      list.push(fileId);
      sessionStorage.setItem(KNOWN_NOT_VIDEOS_KEY, JSON.stringify(list));
    }
  } catch (e) {}
}

let probeQueue = [];
let isProbingQueue = false;

function processNextProbe() {
  if (probeQueue.length === 0) {
    isProbingQueue = false;
    return;
  }
  isProbingQueue = true;
  const { img, fileId, proxyStreamUrl } = probeQueue.shift();

  if (!img.isConnected) {
    setTimeout(processNextProbe, 40);
    return;
  }

  fetch(proxyStreamUrl, { method: 'GET', headers: { 'Range': 'bytes=0-100' } })
    .then(res => {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('video')) {
        markFileAsVideo(fileId);
        convertToVideoElement(img, proxyStreamUrl, fileId);
      } else {
        markFileAsNotVideo(fileId);
      }
      setTimeout(processNextProbe, 80);
    })
    .catch(() => {
      setTimeout(processNextProbe, 80);
    });
}

function probeAndReplaceVideos() {
  const detected = getDetectedVideoIds();
  const notVideos = getKnownNotVideoIds();
  const imgs = document.querySelectorAll('img[data-drive-file-id]');

  imgs.forEach(img => {
    const fileId = img.dataset.driveFileId;
    if (!fileId || img.dataset.videoProbed) return;
    img.dataset.videoProbed = '1';

    // If already detected as video, convert immediately
    if (detected.includes(fileId)) {
      convertToVideoElement(img, '/api/video?id=' + fileId, fileId);
      return;
    }
    // If already confirmed as image in session, skip network probe
    if (notVideos.includes(fileId)) return;

    const proxyStreamUrl = '/api/video?id=' + fileId;
    probeQueue.push({ img, fileId, proxyStreamUrl });
  });

  if (!isProbingQueue && probeQueue.length > 0) {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => processNextProbe());
    } else {
      setTimeout(processNextProbe, 200);
    }
  }

  setupVideoIntersectionObserver();
}

function convertToVideoElement(img, videoUrl, fileId) {
  if (!img || !img.parentNode) return;
  const parent = img.parentNode;
  const isInQuickView = img.closest('#quick-view-content');

  const vid = document.createElement('video');
  vid.src = videoUrl;
  if (fileId) {
    vid.poster = 'https://lh3.googleusercontent.com/d/' + fileId + (isInQuickView ? '=w900' : '=w600');
  }
  vid.className = img.className + (isInQuickView ? ' cursor-pointer qv-video' : '');
  vid.muted = true;
  vid.loop = true;
  vid.playsInline = true;
  vid.setAttribute('playsinline', '');
  vid.setAttribute('preload', 'metadata');
  vid.style.border = '0';
  if (img.dataset.imgIdx) vid.setAttribute('data-img-idx', img.dataset.imgIdx);

  if (isInQuickView) {
    vid.autoplay = true;
    vid.onclick = () => { vid.paused ? vid.play() : vid.pause(); };
    parent.replaceChild(vid, img);
    if (!parent.querySelector('.qv-sound-toggle')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qv-sound-toggle absolute bottom-3 right-3 px-2.5 py-1 bg-black/75 backdrop-blur-md text-white text-xs border border-white/20 rounded-full hover:bg-black transition-all flex items-center gap-1 z-20 shadow-md';
      btn.innerHTML = '<span class="text-xs">🔇</span>';
      btn.title = 'Toggle Sound';
      btn.onclick = (e) => {
        e.stopPropagation();
        vid.muted = !vid.muted;
        btn.querySelector('span').textContent = vid.muted ? '🔇' : '🔊';
      };
      parent.appendChild(btn);
    }
  } else {
    parent.replaceChild(vid, img);
  }
  setupVideoIntersectionObserver();
  console.log('[VideoProbe] Auto-detected and replaced image with video for fileId:', fileId);
}

// Auto-pause off-screen videos to save mobile CPU/battery and eliminate scroll lag
let videoObserver = null;
function setupVideoIntersectionObserver() {
  if (typeof IntersectionObserver === 'undefined') return;
  if (!videoObserver) {
    videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const vid = entry.target;
        if (entry.isIntersecting) {
          // Play only if active slide or inside quick view
          if (!vid.classList.contains('card-slide-image') || vid.classList.contains('active-slide')) {
            vid.play().catch(() => {});
          }
        } else {
          vid.pause();
        }
      });
    }, { threshold: 0.2 });
  }

  document.querySelectorAll('video').forEach(v => {
    videoObserver.observe(v);
  });
}

// ==========================================
// GOOGLE SHEETS REAL-TIME SYNC ENGINE
// ==========================================
let GOOGLE_SHEET_ID = '1yeqnAebhSnCkT7oHs7f8uSpNLD0O_53g1qQP1wlb5XI';
let GOOGLE_SHEET_GID = '1369272150';

function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

function parseProductsFromCsv(csvText) {
  const rows = parseCSV(csvText.replace(/^\uFEFF/, ''));
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const getCol = (row, ...names) => {
    for (const name of names) {
      const idx = headers.indexOf(name.toLowerCase());
      if (idx !== -1 && row[idx] !== undefined) return row[idx].trim();
    }
    return '';
  };

  const products = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || !row[0]) continue;

    const id = getCol(row, 'id') || `shoe-${r}`;
    const name = getCol(row, 'name', 'title') || 'HAUS OF SNEAKER';
    const gender = (getCol(row, 'gender') || 'unisex').toLowerCase();
    const category = (getCol(row, 'category') || 'sneakers').toLowerCase();
    const price = parseFloat((getCol(row, 'price (inr)', 'price') || '0').replace(/[^0-9.]/g, '')) || 0;
    const originalPrice = parseFloat((getCol(row, 'original price', 'mrp') || '0').replace(/[^0-9.]/g, '')) || Math.round(price * 1.25);
    const rating = parseFloat(getCol(row, 'rating')) || 4.9;
    const reviewsCount = parseInt(getCol(row, 'reviews count', 'reviews')) || 50;
    const badge = getCol(row, 'badge') || 'BESTSELLER';
    const section = (getCol(row, 'section') || 'all').toLowerCase();
    
    // Parse sizes
    const rawSizes = getCol(row, 'sizes', 'sizes [row 1]', 'size');
    const sizes = rawSizes ? rawSizes.split(',').map(s => s.trim()).filter(Boolean) : ["UK 7", "UK 8", "UK 9", "UK 10"];
    
    // Parse colors
    const rawColors = getCol(row, 'colors');
    const colors = rawColors ? rawColors.split(',').map(c => {
      const cname = c.trim();
      return { name: cname, hex: '#111111' };
    }) : [{ name: 'Monochrome', hex: '#111111' }];

    // Parse images (resolving Google Drive links)
    const rawImages = getCol(row, 'images', 'image', 'product images', 'product image');
    let images = rawImages ? rawImages.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => resolveGoogleDriveMedia(s).url).filter(u => u && u.length > 5) : [];
    if (images.length === 0) {
      images = ['assets/products/core-fatlace-white.jpg'];
    }

    const description = getCol(row, 'description') || 'Architectural luxury footwear designed for performance and everyday style.';
    const rawDetails = getCol(row, 'details');
    const details = rawDetails ? rawDetails.split(/[|\n]+/).map(d => d.trim()).filter(Boolean) : ['Breathable upper', 'Cushioned sole'];

    products.push({
      id,
      name,
      gender,
      category,
      price,
      originalPrice,
      rating,
      reviewsCount,
      badge,
      section,
      sizes,
      colors,
      images,
      description,
      details
    });
  }
  return products;
}

async function syncFromGoogleSheet() {
  // First try local CSV fallback if available
  try {
    const localRes = await fetch('/products_catalog.csv');
    if (localRes.ok) {
      const localCsv = await localRes.text();
      const localProducts = parseProductsFromCsv(localCsv);
      if (localProducts && localProducts.length > 0) {
        const localIds = new Set(localProducts.map(p => p.id));
      const remainingInitial = PRODUCTS_DATA.filter(p => !localIds.has(p.id));
      PRODUCTS_DATA.splice(0, PRODUCTS_DATA.length, ...localProducts, ...remainingInitial);
        renderProducts();
        if (typeof renderCategoryPageProducts === 'function' && typeof targetGender !== 'undefined') {
          renderCategoryPageProducts(targetGender);
        }
      }
    }
  } catch (e) {
    // continue to sheet
  }

  if (!GOOGLE_SHEET_ID) return;

  const csvUrl = 'https://docs.google.com/spreadsheets/d/' + GOOGLE_SHEET_ID + '/gviz/tq?tqx=out:csv&gid=' + (GOOGLE_SHEET_GID || '0');
  console.log('[CORE Sync] Fetching live catalog from Google Sheet:', GOOGLE_SHEET_ID);
  
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csvData = await res.text();
    const liveProducts = parseProductsFromCsv(csvData);
    
    if (liveProducts && liveProducts.length > 0) {
      // Update global catalog
      const liveIds = new Set(liveProducts.map(p => p.id));
      const remainingLocal = PRODUCTS_DATA.filter(p => !liveIds.has(p.id));
      PRODUCTS_DATA.splice(0, PRODUCTS_DATA.length, ...liveProducts, ...remainingLocal);
      renderProducts();
      if (typeof renderCategoryPageProducts === 'function' && typeof targetGender !== 'undefined') {
        renderCategoryPageProducts(targetGender);
      }
      console.log(`[CORE Sync] ✓ Live synced ${liveProducts.length} products from Google Sheet successfully!`);
      
      // Subtle notification indicator
      showSyncToast(`✓ Live synced ${liveProducts.length} products from Google Sheet`);
    }
  } catch (err) {
    console.warn('[CORE Sync] Unable to fetch Google Sheet, keeping local catalog:', err);
  }
}

function showSyncToast(msg) {
  let toast = document.getElementById('core-sync-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'core-sync-toast';
    toast.className = 'fixed bottom-4 left-4 z-50 px-4 py-2 bg-black/90 text-white border border-white/20 text-xs font-mono-code font-bold rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 translate-y-2';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-2');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 3500);
}

function setGoogleSheetId(id) {
  if (!id) {
    localStorage.removeItem('CORE_GOOGLE_SHEET_ID');
    GOOGLE_SHEET_ID = '';
    console.log('[CORE Sync] Google Sheet disconnected. Using default catalog.');
    showSyncToast('Google Sheet disconnected.');
    return;
  }
  const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const cleanId = match ? match[1] : id.trim();
  localStorage.setItem('CORE_GOOGLE_SHEET_ID', cleanId);
  GOOGLE_SHEET_ID = cleanId;
  syncFromGoogleSheet();
}
window.setGoogleSheetId = setGoogleSheetId;
window.syncFromGoogleSheet = syncFromGoogleSheet;

// --- DOM READY INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initInteractiveRevealSlider();
  initHeroSlider();
  initFilters();
  renderProducts();
  renderReels();
  initReelsAutoScroll();
  renderFaqs();
  updateCartBadge();
  setupEventListeners();
  setupCurrencySelector();
  setupTrackScrollListeners();
  checkGoogleSheetOnLoad();
});

// ==========================================
// INTERACTIVE ILLUSTRATION-TO-REALITY COMPARISON SLIDER
// Smooth mouse/touch drag and hover response without cropping
// ==========================================
function initInteractiveRevealSlider() {
  const container = document.getElementById('interactive-reveal-card');
  const clipBox = document.getElementById('illustration-clip-box');
  const splitLine = document.getElementById('slider-split-line');

  if (!container || !clipBox || !splitLine) return;

  let isDragging = false;

  function updateSplit(clientX) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));

    clipBox.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
    splitLine.style.left = `${percent}%`;
  }

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateSplit(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSplit(e.clientX);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Mobile Touch Support
  container.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      updateSplit(e.touches[0].clientX);
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      updateSplit(e.touches[0].clientX);
    }
  }, { passive: true });
}


function checkGoogleSheetOnLoad() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('sheet')) {
    setGoogleSheetId(params.get('sheet'));
  } else if (GOOGLE_SHEET_ID) {
    syncFromGoogleSheet();
  }
}

// --- HERO BANNER CROSSFADE SLIDER (HAUS OF SNEAKER) ---
function initHeroSlider() {
  const slide1 = document.getElementById('hero-slide-1');
  const slide2 = document.getElementById('hero-slide-2');
  const dot0 = document.getElementById('hero-dot-0');
  const dot1 = document.getElementById('hero-dot-1');
  const tagMain = document.getElementById('hero-tagline-main');
  const tagSub = document.getElementById('hero-tagline-sub');
  
  if (!slide1 || !slide2) return;

  const heroCaptions = [
    { sub: 'HAUS OF SNEAKER • 2026', main: 'ARCHITECTURAL COMMUTE.' },
    { sub: 'EDITORIAL CAMPAIGN • DROP 02', main: 'MODERN STREET LUXURY.' }
  ];

  window.setHeroSlide = (idx) => {
    state.heroSlideIndex = idx % 2;
    if (state.heroSlideIndex === 0) {
      slide1.style.opacity = '1';
      slide2.style.opacity = '0';
      if (dot0 && dot1) {
        dot0.className = 'w-8 h-1 bg-white transition-all duration-300';
        dot1.className = 'w-4 h-1 bg-white/30 hover:bg-white/60 transition-all duration-300';
      }
    } else {
      slide1.style.opacity = '0';
      slide2.style.opacity = '1';
      if (dot0 && dot1) {
        dot0.className = 'w-4 h-1 bg-white/30 hover:bg-white/60 transition-all duration-300';
        dot1.className = 'w-8 h-1 bg-white transition-all duration-300';
      }
    }

    if (tagMain && tagSub) {
      tagMain.style.opacity = '0';
      tagSub.style.opacity = '0';
      setTimeout(() => {
        tagSub.textContent = heroCaptions[state.heroSlideIndex].sub;
        tagMain.textContent = heroCaptions[state.heroSlideIndex].main;
        tagMain.style.opacity = '1';
        tagSub.style.opacity = '1';
      }, 300);
    }
  };

  // Auto-transition every 5.5 seconds smoothly
  const startHeroAutoPlay = () => {
    clearInterval(state.heroAutoPlayTimer);
    state.heroAutoPlayTimer = setInterval(() => {
      const nextIdx = (state.heroSlideIndex + 1) % 2;
      setHeroSlide(nextIdx);
    }, 5500);
  };

  const stopHeroAutoPlay = () => clearInterval(state.heroAutoPlayTimer);

  const heroSection = document.getElementById('hero-banner-section');
  if (heroSection) {
    heroSection.addEventListener('mouseenter', stopHeroAutoPlay);
    heroSection.addEventListener('mouseleave', startHeroAutoPlay);
  }

  startHeroAutoPlay();
}

// --- SECTION HORIZONTAL SLIDING ENGINE ---
function slideSection(trackId, direction) {
  const track = document.getElementById(trackId);
  if (!track) return;
  const cardWidth = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 24 : 340;
  const scrollAmount = cardWidth * 1.5;
  track.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}

function setupTrackScrollListeners() {
  const tracks = [
    { trackId: 'ua-quality-slider-track', barId: 'ua-quality-progress-bar' },
    { trackId: 'must-have-slider-track', barId: 'must-have-progress-bar' },
    { trackId: 'men-slider-track', barId: 'men-progress-bar' },
    { trackId: 'women-slider-track', barId: 'women-progress-bar' },
    { trackId: 'archive-slider-track', barId: 'archive-progress-bar' },
    { trackId: 'outdoor-slider-track', barId: 'outdoor-progress-bar' },
    { trackId: 'reels-slider-track', barId: 'reels-progress-bar' }
  ];

  tracks.forEach(({ trackId, barId }) => {
    const track = document.getElementById(trackId);
    const bar = document.getElementById(barId);
    if (!track || !bar) return;

    track.addEventListener('scroll', () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll > 0) {
        const progress = (track.scrollLeft / maxScroll) * 100;
        bar.style.transform = `translateX(${progress * 2.5}%)`;
      }
    });

    let isDown = false;
    let startX;
    let scrollLeft;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup', () => { isDown = false; });
    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.6;
      track.scrollLeft = scrollLeft - walk;
    });
  });
}

// --- FILTER & TAB NAVIGATION ---
function initFilters() {
  const genderTabs = document.querySelectorAll('.gender-tab');
  genderTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      genderTabs.forEach(t => {
        t.classList.remove('filter-tab-active', 'bg-white', 'text-black');
        t.classList.add('border-white/20', 'text-neutral-300');
      });
      tab.classList.add('filter-tab-active', 'bg-white', 'text-black');
      tab.classList.remove('border-white/20', 'text-neutral-300');
      state.activeGenderFilter = tab.dataset.gender;
      renderProducts();
      const scrollTargets = {
        clogs: 'clogs-section',
        slides: 'slides-section',
        'flip-flops': 'slides-section',
        men: 'ua-quality-section',
        women: 'ua-quality-section',
        unisex: 'all-collection-grid-section'
      };
      const tid = scrollTargets[tab.dataset.gender];
      if (tid) {
        const el = document.getElementById(tid);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
        }
      }
    });
  });

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });
  }
}

// --- PRODUCT GRID & SLIDERS RENDERING ---
function renderProducts() {
  const mustHaveTrack = document.getElementById('must-have-slider-track');
  const menTrack = document.getElementById('men-slider-track');
  const womenTrack = document.getElementById('women-slider-track');
  const slidesTrack = document.getElementById('slides-slider-track') || document.getElementById('archive-slider-track');
  const clogsTrack = document.getElementById('clogs-slider-track') || document.getElementById('outdoor-slider-track');
  const allProductsContainer = document.getElementById('all-products-grid');

  let filtered = [...PRODUCTS_DATA];

  // Gender & Category filter
  if (state.activeGenderFilter === 'clogs') {
    filtered = filtered.filter(p => (p.category === 'clogs' || p.id.startsWith('haus-clog-')) && !['core-slide-ergonomic', 'nomad-leather-mule'].includes(p.id));
  } else if (state.activeGenderFilter === 'slides' || state.activeGenderFilter === 'flip-flops') {
    filtered = filtered.filter(p => (p.category === 'slides' || p.category === 'flip flops' || p.id.startsWith('haus-slide-')) && !['core-slide-ergonomic', 'nomad-leather-mule'].includes(p.id));
  } else if (state.activeGenderFilter === 'men') {
    filtered = filtered.filter(p => (p.gender === 'men' || p.gender === 'unisex') && p.category !== 'clogs' && p.category !== 'slides' && p.category !== 'flip flops');
  } else if (state.activeGenderFilter === 'women') {
    filtered = filtered.filter(p => (p.gender === 'women' || p.gender === 'unisex') && p.category !== 'clogs' && p.category !== 'slides' && p.category !== 'flip flops');
  } else if (state.activeGenderFilter === 'unisex') {
    filtered = filtered.filter(p => p.gender === 'unisex');
  }

  // Sorting
  if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  // UA QUALITY SNEAKERS SLIDERS (MEN & WOMEN)
  const uaMenTrack = document.getElementById('ua-quality-men-slider-track');
  if (uaMenTrack) {
    const uaMenItems = PRODUCTS_DATA.filter(p => 
      (p.gender === 'men' || p.gender === 'unisex') &&
      p.category === 'sneakers' &&
      !p.id.startsWith('haus-slide-') && !p.id.startsWith('haus-clog-') &&
      (p.section === 'ua-quality' || p.section === 'must-have' || p.section === 'men-collection' || ['core-oldskool-canvas', 'core-air-stride-retro', 'core-men-retro-2', 'core-men-drift-1', 'core-shell-superstar-black'].includes(p.id))
    );
    uaMenTrack.innerHTML = uaMenItems.map(p => '<div class="slider-item" style="min-width: 250px; max-width: 290px; flex-shrink: 0;">' + createProductCardHtml(p) + '</div>').join('');
  }

  const uaWomenTrack = document.getElementById('ua-quality-women-slider-track');
  if (uaWomenTrack) {
    const uaWomenItems = PRODUCTS_DATA.filter(p => 
      (p.gender === 'women' || p.gender === 'unisex') &&
      p.category === 'sneakers' &&
      !p.id.startsWith('haus-slide-') && !p.id.startsWith('haus-clog-') &&
      (p.section === 'ua-quality' || p.section === 'must-have' || p.section === 'women-collection' || ['core-fatlace-superstar', 'aura-sculpted-platform', 'shadowline-high-top', 'core-women-platform-1', 'core-women-retro-2'].includes(p.id))
    );
    uaWomenTrack.innerHTML = uaWomenItems.map(p => '<div class="slider-item" style="min-width: 250px; max-width: 290px; flex-shrink: 0;">' + createProductCardHtml(p) + '</div>').join('');
  }

  // DEDICATED FLIP FLOPS & SLIDES SLIDER (EXCLUSIVELY THE 5 UPLOADED SLIDES/FLIP-FLOPS)
  if (slidesTrack) {
    const slidesItems = PRODUCTS_DATA.filter(p => 
      (p.id.startsWith('haus-slide-') || (p.category === 'slides' || p.category === 'flip flops')) &&
      !['core-slide-ergonomic', 'nomad-leather-mule'].includes(p.id)
    );
    slidesTrack.innerHTML = slidesItems.map(p => `
      <div class="slider-item">
        ${createProductCardHtml(p)}
      </div>
    `).join('');
  }

  // DEDICATED CLOGS & MULES SLIDER (EXCLUSIVELY THE 5 UPLOADED CLOGS)
  if (clogsTrack) {
    const clogsItems = PRODUCTS_DATA.filter(p => 
      (p.id.startsWith('haus-clog-') || p.category === 'clogs') &&
      !['core-slide-ergonomic', 'nomad-leather-mule'].includes(p.id)
    );
    clogsTrack.innerHTML = clogsItems.map(p => `
      <div class="slider-item">
        ${createProductCardHtml(p)}
      </div>
    `).join('');
  }

  // COMPLETE COLLECTION GRID (EXCLUDES CLOGS, SLIDES, AND FLIP FLOPS)
  if (allProductsContainer) {
    const mainGridItems = (state.activeGenderFilter === 'all')
      ? filtered.filter(p => p.category !== 'clogs' && p.category !== 'slides' && p.category !== 'flip flops' && !p.id.startsWith('haus-clog-') && !p.id.startsWith('haus-slide-'))
      : filtered;
    allProductsContainer.innerHTML = mainGridItems.map(p => createProductCardHtml(p)).join('');
  }

  bindCardInteractions();
  probeAndReplaceVideos();
}

// Generates Product Card HTML (MATCHING KARB SCREENSHOTS 2 & 3: 3-column edge-to-edge, thin white borders, SELECT OPTION dropdown, ADD TO CART)
function createProductCardHtml(product) {
  const currentImgIdx = state.cardImageIndices[product.id] || 0;
  const isWishlisted = state.wishlist.includes(product.id);

  // In-Card image stack — absolute positioning, opacity-based switching
  const numImages = product.images.length;
  const slidesHtml = product.images.map((rawUrl, idx) => {
    const media = resolveGoogleDriveMedia(rawUrl, 'card');
    const imgUrl = media.url;
    const isVid = media.isVideo;
    const cls = `card-slide-image${idx === currentImgIdx ? ' active-slide' : ''}${idx === 1 ? ' hover-slide' : ''}`;
    if (isVid) {
      return `
        <video 
          src="${imgUrl}" 
          ${media.posterUrl ? `poster="${media.posterUrl}"` : ''}
          class="${cls} object-cover w-full h-full pointer-events-none"
          data-img-idx="${idx}"
          autoplay muted loop playsinline
          preload="metadata"
          style="border:0;"
        ></video>
      `;
    }
    const driveMatch = imgUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const driveFileIdAttr = driveMatch ? `data-drive-file-id="${driveMatch[1]}"` : '';
    return `
      <img 
        src="${imgUrl}" 
        referrerpolicy="no-referrer"
        alt="${product.name} Angle ${idx + 1}" 
        class="${cls}" 
        data-img-idx="${idx}"
        ${driveFileIdAttr}
        loading="lazy" decoding="async"
        onerror="handleCardImageError(this, '${product.name.replace(/'/g, "\\'")}', '${product.colors[0]?.hex || '#0a0a0a'}')"
      />
    `;
  }).join('');
  // Sizing options options html for select
  const sizeOptionsHtml = product.sizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');

  return `
    <div class="shoe-card karb-product-card group relative bg-black text-white flex flex-col justify-between h-full border border-white/10" data-product-id="${product.id}">
      
      <!-- Edge-to-edge Media Viewport (Original CORE Shoe Ratio: 4/3.5) -->
      <div class="shoe-card-media relative w-full aspect-[4/3.5] overflow-hidden cursor-pointer" onclick="openQuickView('${product.id}')">
        
        <!-- Image Stack Track -->
        <div class="card-slides-track" id="card-track-${product.id}">
          ${slidesHtml}
        </div>

        ${product.images.length > 1 ? `
        <!-- Minimal In-Card Slide Arrows -->
        <button class="card-slide-arrow prev !bg-black/60 !text-white !border-white/20 hover:!bg-white hover:!text-black" onclick="slideCardImage('${product.id}', -1, event)" title="Previous photo">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button class="card-slide-arrow next !bg-black/60 !text-white !border-white/20 hover:!bg-white hover:!text-black" onclick="slideCardImage('${product.id}', 1, event)" title="Next photo">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
        ` : ''}

        <!-- Top Right Wishlist Icon -->
        <button class="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black text-white rounded-none border border-white/20 transition-all z-20" onclick="toggleWishlist('${product.id}', event)" title="Save to wishlist">
          <svg class="w-4 h-4 ${isWishlisted ? 'fill-white text-white' : 'currentColor'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <!-- KARB EXACT INFO ROW: Title on Left, Price on Right -->
      <div class="px-3 py-2.5 bg-black border-t border-white/10 flex items-center justify-between text-xs sm:text-sm font-condensed tracking-wider uppercase text-white font-bold cursor-pointer" onclick="openQuickView('${product.id}')">
        <span class="truncate pr-2">${product.name}</span>
        <span class="flex-shrink-0 text-white">${formatPrice(product.price)}</span>
      </div>

      <!-- KARB EXACT ACTION ROW: [SELECT OPTION ▼] | [PRICE] | [ADD TO CART] -->
      <div class="grid grid-cols-12 bg-black border-t border-white/10 text-[11px] sm:text-xs font-condensed tracking-wider font-bold uppercase text-white">
        <!-- Select size dropdown -->
        <div class="col-span-6 relative border-r border-white/10 flex items-center">
          <select id="card-size-${product.id}" class="w-full bg-black text-white py-2.5 pl-3 pr-6 text-[11px] sm:text-xs font-condensed uppercase tracking-wider cursor-pointer appearance-none focus:outline-none" onclick="event.stopPropagation()">
            ${sizeOptionsHtml}
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </div>
        </div>

        <!-- Add to cart button -->
        <button 
          onclick="event.stopPropagation(); const sz = document.getElementById('card-size-${product.id}')?.value || '${product.sizes[0]}'; addToCart('${product.id}', sz);" 
          class="col-span-6 py-2.5 px-2 bg-black hover:bg-white hover:text-black transition-colors text-center font-condensed tracking-wider uppercase font-bold flex items-center justify-center"
        >
          ADD TO CART
        </button>
      </div>

    </div>
  `;
}

// In-Card Image Sliding Function
function slideCardImage(productId, delta, event) {
  if (event) event.stopPropagation();
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;

  const totalImages = product.images.length;
  let currentIndex = state.cardImageIndices[productId] || 0;
  currentIndex = (currentIndex + delta + totalImages) % totalImages;
  state.cardImageIndices[productId] = currentIndex;

  updateCardSlideView(productId);
}

function updateCardSlideView(productId) {
  const currentIndex = state.cardImageIndices[productId] || 0;

  document.querySelectorAll(`.shoe-card[data-product-id="${productId}"]`).forEach(card => {
    // Update active image
    card.querySelectorAll('.card-slide-image').forEach((img, idx) => {
      img.classList.toggle('active-slide', idx === currentIndex);
      // The hover-slide is always index 1 (or next after active)
      const hoverIdx = currentIndex === 0 ? 1 : 0;
      img.classList.toggle('hover-slide', idx === hoverIdx && idx !== currentIndex);
    });
    // Update dots
    card.querySelectorAll('.card-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentIndex);
    });
  });
}

function bindCardInteractions() {
  // Hover: show second image via CSS (.shoe-card:hover .hover-slide { opacity: 1 })
  // This is handled purely by CSS — no JS needed for hover.
  // Arrow clicks and dot clicks update active-slide class:
  document.querySelectorAll('.card-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = dot.dataset.productId;
      const idx = parseInt(dot.dataset.idx, 10);
      state.cardImageIndices[pId] = idx;
      updateCardSlideView(pId);
    });
  });

  document.querySelectorAll('.shoe-card-media').forEach(media => {
    let touchStartX = 0;
    let touchEndX = 0;

    media.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    media.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const card = media.closest('.shoe-card');
      if (!card) return;
      const pId = card.dataset.productId;
      if (touchStartX - touchEndX > 40) {
        slideCardImage(pId, 1, e);
      } else if (touchEndX - touchStartX > 40) {
        slideCardImage(pId, -1, e);
      }
    }, { passive: true });
  });
}

// --- LOOKBOOK REELS SLIDER WITH CONTINUOUS AUTOPLAY & ZERO CLUTTER ---
function renderReels() {
  const reelsTrack = document.getElementById('reels-slider-track');
  if (!reelsTrack) return;

  reelsTrack.innerHTML = REELS_DATA.map(reel => `
    <div class="reel-video-card group" onclick="openReelModal('${reel.id}')">
      <!-- Clean HTML5 video element with continuous autoplay, muted, looping -->
      <video 
        src="${reel.video}" 
        poster="${reel.thumbnail}" 
        autoplay 
        playsinline 
        muted 
        loop 
        preload="auto"
        class="w-full h-full object-cover"
      ></video>

      <!-- Clean minimal overlay: NO "video reel" or "autoplay" badges! -->
      <div class="reel-clean-overlay">
        <div>
          <span class="text-[10px] font-mono-code font-bold tracking-widest uppercase text-neutral-400 block mb-1">${reel.subtitle}</span>
          <h4 class="font-display text-sm font-bold leading-tight text-white uppercase">${reel.title}</h4>
          <div class="mt-2 flex items-center justify-between text-[11px] pt-2 border-t border-white/20 text-white/90">
            <span class="font-medium">${reel.productName}</span>
            <span class="font-mono-code font-bold text-white bg-[#0a0a0a] px-2 py-0.5 rounded">${reel.productPrice}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}
// --- REELS / LOOKBOOK VIDEO SECTION AUTOSCROLL (RIGHT-BY-RIGHT) ---
function initReelsAutoScroll() {
  const track = document.getElementById('reels-slider-track');
  if (!track) return;

  let currentIdx = 0;
  let timer = null;

  function advance() {
    const cards = track.querySelectorAll('.reel-video-card');
    if (!cards || cards.length === 0) return;

    currentIdx = (currentIdx + 1) % cards.length;
    const targetCard = cards[currentIdx];
    const targetLeft = targetCard.offsetLeft - track.offsetLeft;

    track.scrollTo({
      left: targetLeft,
      behavior: 'smooth'
    });
  }

  function start() {
    stop();
    timer = setInterval(advance, 3200);
  }

  function stop() {
    if (timer) clearInterval(timer);
  }

  // Sync index when user manually swipes
  let scrollTimeout;
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const cards = track.querySelectorAll('.reel-video-card');
      if (!cards.length) return;
      let minDiff = Infinity;
      let closestIdx = 0;
      cards.forEach((card, idx) => {
        const diff = Math.abs((card.offsetLeft - track.offsetLeft) - track.scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      currentIdx = closestIdx;
    }, 120);
  }, { passive: true });

  track.addEventListener('touchstart', stop, { passive: true });
  track.addEventListener('touchend', () => {
    setTimeout(start, 4000);
  }, { passive: true });

  track.addEventListener('mouseenter', stop);
  track.addEventListener('mouseleave', start);

  start();
}


// --- FAQ ACCORDION ---
function renderFaqs() {
  const faqContainer = document.getElementById('faq-accordion');
  if (!faqContainer) return;

  faqContainer.innerHTML = FAQS_DATA.map((faq, idx) => `
    <div class="faq-item ${idx === 0 ? 'open' : ''}">
      <button class="faq-header" onclick="toggleFaq(this)">
        <span>${faq.question}</span>
        <svg class="faq-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
        </svg>
      </button>
      <div class="faq-content">
        <p class="text-neutral-600">${faq.answer}</p>
      </div>
    </div>
  `).join('');
}
// --- REELS / LOOKBOOK VIDEO SECTION AUTOSCROLL ---
function initReelsAutoScroll() {
  const track = document.getElementById('reels-slider-track');
  if (!track) return;

  let autoScrollTimer = null;

  function step() {
    if (!track) return;
    const card = track.firstElementChild;
    const scrollStep = card ? card.getBoundingClientRect().width + 16 : 250;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  }

  function start() {
    stop();
    autoScrollTimer = setInterval(step, 3800);
  }

  function stop() {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
  }

  track.addEventListener('mouseenter', stop);
  track.addEventListener('mouseleave', start);
  track.addEventListener('touchstart', stop, { passive: true });
  track.addEventListener('touchend', () => {
    setTimeout(start, 5000);
  }, { passive: true });

  start();
}


function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) {
    item.classList.add('open');
  }
}

// --- QUICK VIEW MODAL (EXACT REPLICATION OF KARB PRODUCT DETAIL SCREENSHOT 5) ---
function openQuickView(productId) {
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;

  state.activeQuickViewProduct = product;
  const modal = document.getElementById('quick-view-modal');
  const modalContent = document.getElementById('quick-view-content');
  if (!modal || !modalContent) return;

  let selectedSize = product.sizes[0];
  let selectedColor = product.colors[0]?.name || '';
  let activeImg = resolveGoogleDriveImageUrl(product.images[0]);

  modalContent.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 min-h-screen sm:min-h-0 bg-black text-white">
      
      <!-- LEFT SIDE (APPROX 67% WIDTH / 8 COLS): LARGE EDGE-TO-EDGE IMAGE GALLERY -->
      <div class="lg:col-span-8 p-0 bg-black border-b lg:border-b-0 lg:border-r border-white/10">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10">
          ${product.images.map((rawImg, i) => {
            const media = resolveGoogleDriveMedia(rawImg, 'large');
            const img = media.url;
            const isVid = media.isVideo;
            const driveMatch = img.match(/\/d\/([a-zA-Z0-9_-]+)/);
            const driveFileIdAttr = driveMatch ? `data-drive-file-id="${driveMatch[1]}"` : '';
            return `
            <div class="aspect-[4/5] bg-black overflow-hidden relative flex items-center justify-center qv-media-cell">
              ${isVid ? `
                <video 
                  src="${img}" 
                  ${media.posterUrl ? `poster="${media.posterUrl}"` : ''}
                  class="w-full h-full object-cover qv-video cursor-pointer" 
                  autoplay 
                  muted 
                  loop 
                  playsinline 
                  preload="auto" 
                  oncanplay="const l=this.parentNode.querySelector('.qv-vid-loading'); if(l) l.remove();"
                  onclick="this.paused ? this.play() : this.pause()"
                  style="border:0;"
                ></video>
                <span class="qv-vid-loading absolute bottom-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-wider border border-white/20 rounded-full z-20 pointer-events-none">Loading video...</span>
                <button type="button" onclick="event.stopPropagation(); const v=this.closest('.qv-media-cell').querySelector('video'); if(v){ v.muted=!v.muted; this.querySelector('span').textContent=v.muted?'🔇':'🔊'; }" class="qv-sound-toggle absolute bottom-3 right-3 px-2.5 py-1 bg-black/75 backdrop-blur-md text-white text-xs border border-white/20 rounded-full hover:bg-black transition-all flex items-center gap-1 z-20 shadow-md" title="Toggle Sound">
                  <span class="text-xs">🔇</span>
                </button>
              ` : `<img src="${img}" referrerpolicy="no-referrer" alt="${product.name} View ${i+1}" ${driveFileIdAttr} class="w-full h-full object-cover object-center" />`}
            </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- RIGHT SIDE (APPROX 33% WIDTH / 4 COLS): PRODUCT DETAILS & SIZING (KARB SCREENSHOT 5) -->
      <div class="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between bg-black text-white">
        <div>
          <!-- Title & Price -->
          <h1 class="font-condensed text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white mb-2 leading-tight">
            ${product.name}
          </h1>
          
          <div class="text-xl sm:text-2xl font-condensed font-bold text-white mb-6">
            ${formatPrice(product.price)}
          </div>

          <!-- Size Selection Bar -->
          <div class="mb-6">
            <div class="flex justify-between items-center mb-2.5">
              <label class="text-xs font-condensed uppercase tracking-widest text-neutral-300 font-bold">SELECT SIZE</label>
              <button onclick="openSizeGuide()" class="text-xs font-condensed uppercase tracking-widest text-neutral-300 underline hover:text-white">SIZE & FIT GUIDE</button>
            </div>
            
            <!-- Horizontal Grid with square corners and thin borders -->
            <div class="grid grid-cols-4 border border-white/20">
              ${product.sizes.map((sz, idx) => `
                <button 
                  class="qv-size-btn py-3 text-center text-xs font-condensed font-bold border-r last:border-r-0 border-white/20 transition-all ${idx === 0 ? 'bg-white text-black' : 'bg-black text-white hover:bg-neutral-800'}"
                  onclick="selectSize('${sz}', this)"
                >${sz.replace('UK ', '')}</button>
              `).join('')}
            </div>
          </div>

          <!-- Product Details Tabs / Accordion -->
          <div class="border-t border-white/10 pt-4 mb-6 space-y-3 text-xs font-condensed uppercase tracking-wider text-neutral-300">
            <div class="space-y-1">
              <span class="font-bold text-white block mb-1">FIT & DETAILS</span>
              <ul class="space-y-1 list-disc list-inside text-neutral-400 normal-case font-sans">
                <li>Refer size chart before order</li>
                <li>Architectural engineered construction</li>
                <li>Breathable premium upper and cushioned sole</li>
                <li>High-durability vulcanized rubber outsole</li>
              </ul>
            </div>
            
            <div class="pt-2 border-t border-white/10">
              <span class="font-bold text-white block mb-0.5">PRODUCT CARE</span>
              <p class="text-neutral-400 normal-case font-sans">Wipe clean with a damp cloth. Store in a cool dry place.</p>
            </div>

            <div class="pt-2 border-t border-white/10">
              <span class="font-bold text-white block mb-0.5">SHIPPING & RETURN</span>
              <p class="text-neutral-400 normal-case font-sans">Dispatched within 24–48 hours. 14-day exchange available.</p>
            </div>
          </div>

          <!-- Karbn Benefits Badges -->
          <div class="grid grid-cols-2 gap-2 text-[11px] font-condensed uppercase tracking-wider text-neutral-300 border-t border-white/10 pt-4 mb-8">
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> FREE SHIPPING INDIA-WIDE</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> 24-48 HOURS DISPATCH</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> SECURE PAYMENTS</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> EXCHANGE ONLY AT EXTRA COST</div>
          </div>
        </div>

        <!-- KARB BUTTONS: ADD TO CART (WHITE) & BUY IT NOW (BLACK W/ BORDER) -->
        <div class="space-y-2.5 pt-4 border-t border-white/10">
          <div class="grid grid-cols-2 gap-2">
            <button 
              id="qv-add-cart-btn"
              onclick="addToCart('${product.id}', selectedQuickViewSize, selectedQuickViewColor)" 
              class="w-full py-3.5 bg-white text-black hover:bg-neutral-200 font-condensed text-xs sm:text-sm font-bold uppercase tracking-widest transition-all text-center"
            >
              ADD TO CART
            </button>
            <button 
              onclick="buyNowWhatsApp('${product.id}', selectedQuickViewSize, selectedQuickViewColor)" 
              class="w-full py-3.5 bg-black text-white border border-white hover:bg-white hover:text-black font-condensed text-xs sm:text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
            >
              <span>⚡ BUY IT NOW</span>
            </button>
          </div>

          <button 
            onclick="buyNowWhatsApp('${product.id}', selectedQuickViewSize, selectedQuickViewColor)" 
            class="w-full py-3 bg-[#25D366] hover:bg-[#20ba59] text-white font-condensed text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12.004 0C5.372 0 0 5.373 0 12c0 2.115.548 4.103 1.512 5.836L.055 24l6.334-1.45A11.936 11.936 0 0012.004 24C18.628 24 24 18.627 24 12 24 5.373 18.628 0 12.004 0zm.015 21.84c-1.85 0-3.6-.502-5.12-1.373l-.367-.21-3.765.862.879-3.668-.23-.377a9.835 9.835 0 01-1.503-5.074c0-5.43 4.417-9.847 9.856-9.847 5.438 0 9.855 4.417 9.855 9.847 0 5.43-4.417 9.84-9.855 9.84zm5.405-7.378c-.296-.149-1.754-.866-2.026-.965-.272-.099-.47-.148-.668.149-.197.297-.767.965-.94 1.163-.173.198-.346.223-.643.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.297-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
            </svg>
            <span>ORDER VIA WHATSAPP</span>
          </button>
        </div>
      </div>

    </div>
  `;

  window.selectedQuickViewSize = selectedSize;
  window.selectedQuickViewColor = selectedColor;
  modal.classList.remove('hidden');
  probeAndReplaceVideos();
}

function selectSize(sizeStr, el) {
  window.selectedQuickViewSize = sizeStr;
  document.querySelectorAll('.qv-size-btn').forEach(b => {
    b.className = 'qv-size-btn py-3 text-center text-xs font-condensed font-bold border-r last:border-r-0 border-white/20 transition-all bg-black text-white hover:bg-neutral-800';
  });
  el.className = 'qv-size-btn py-3 text-center text-xs font-condensed font-bold border-r last:border-r-0 border-white/20 transition-all bg-white text-black';
}

function setQuickViewImage(imgUrl, el) {
  const mainImg = document.getElementById('qv-main-img');
  if (mainImg) mainImg.src = resolveGoogleDriveImageUrl(imgUrl);
  el.parentElement.querySelectorAll('div').forEach(d => d.className = 'aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all border-neutral-200 hover:border-[#0a0a0a]');
  el.className = 'aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all border-[#0a0a0a] shadow-md';
}

function selectSize(sizeStr, el) {
  window.selectedQuickViewSize = sizeStr;
  document.querySelectorAll('.qv-size-btn').forEach(b => {
    b.className = 'qv-size-btn py-2.5 rounded-xl border text-xs font-mono-code font-bold transition-all border-neutral-300 text-neutral-800 hover:border-[#0a0a0a]';
  });
  el.className = 'qv-size-btn py-2.5 rounded-xl border text-xs font-mono-code font-bold transition-all bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-md';
}

function selectColor(colorName, el) {
  window.selectedQuickViewColor = colorName;
  const label = document.getElementById('qv-selected-color');
  if (label) label.innerText = colorName;
  el.parentElement.querySelectorAll('button').forEach(b => b.className = 'w-8 h-8 rounded-full border-2 transition-all border-neutral-300 hover:border-[#0a0a0a]');
  el.className = 'w-8 h-8 rounded-full border-2 transition-all border-[#0a0a0a] scale-110 shadow-md';
}

function closeQuickView() {
  const modal = document.getElementById('quick-view-modal');
  if (modal) modal.classList.add('hidden');
}

// --- CART STATE MANAGEMENT ---
function addToCart(productId, size, color) {
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;

  const chosenSize = size || product.sizes[0];
  const chosenColor = color || product.colors[0]?.name || 'Standard';

  const existingIdx = state.cart.findIndex(item => item.id === productId && item.size === chosenSize && item.color === chosenColor);

  if (existingIdx > -1) {
    state.cart[existingIdx].quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      gender: product.gender,
      image: product.images[0],
      size: chosenSize,
      color: chosenColor,
      quantity: 1
    });
  }

  saveCart();
  updateCartBadge();
  closeQuickView();
  openCartDrawer();
  showToast(`Added ${product.name} (${chosenSize}) to Bag`);
}

function updateCartQty(idx, delta) {
  if (!state.cart[idx]) return;
  state.cart[idx].quantity += delta;
  if (state.cart[idx].quantity <= 0) {
    state.cart.splice(idx, 1);
  }
  saveCart();
  renderCartDrawerItems();
  updateCartBadge();
}

function removeCartItem(idx) {
  state.cart.splice(idx, 1);
  saveCart();
  renderCartDrawerItems();
  updateCartBadge();
  showToast('Item removed from Bag');
}

function saveCart() {
  localStorage.setItem('core_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count-badge').forEach(badge => {
    badge.innerText = totalCount;
    badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  });
}

// --- CART DRAWER UI ---
function openCartDrawer() {
  const backdrop = document.getElementById('cart-drawer-backdrop');
  const panel = document.getElementById('cart-drawer-panel');
  if (!backdrop || !panel) return;

  renderCartDrawerItems();
  backdrop.classList.add('active');
  panel.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const backdrop = document.getElementById('cart-drawer-backdrop');
  const panel = document.getElementById('cart-drawer-panel');
  if (backdrop) backdrop.classList.remove('active');
  if (panel) panel.classList.remove('active');
  document.body.style.overflow = '';
}

function renderCartDrawerItems() {
  const container = document.getElementById('cart-items-container');
  const summaryContainer = document.getElementById('cart-summary-container');
  const emptyState = document.getElementById('cart-empty-state');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (summaryContainer) summaryContainer.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (summaryContainer) summaryContainer.classList.remove('hidden');

  let subtotal = 0;

  container.innerHTML = state.cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    return `
      <div class="flex gap-4 py-4 border-b border-neutral-100">
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200">
          <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start">
              <h4 class="font-display text-sm font-bold uppercase text-neutral-900 leading-tight">${item.name}</h4>
              <button onclick="removeCartItem(${idx})" class="text-neutral-400 hover:text-[#0a0a0a] transition-colors" title="Remove">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div class="text-[11px] font-mono-code text-neutral-500 mt-1">
              <span>Size: ${item.size}</span> • <span>${item.color}</span>
            </div>
          </div>

          <div class="flex justify-between items-center mt-2">
            <div class="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white">
              <button onclick="updateCartQty(${idx}, -1)" class="px-2.5 py-1 text-xs hover:bg-neutral-100 text-[#0a0a0a] font-bold">-</button>
              <span class="px-2.5 text-xs font-mono-code font-bold">${item.quantity}</span>
              <button onclick="updateCartQty(${idx}, 1)" class="px-2.5 py-1 text-xs hover:bg-neutral-100 text-[#0a0a0a] font-bold">+</button>
            </div>
            <span class="font-mono-code font-bold text-sm text-[#0a0a0a]">${formatPrice(itemTotal)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const freeShippingThreshold = 2499;
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const shippingBar = document.getElementById('free-shipping-bar');
  const shippingText = document.getElementById('free-shipping-text');
  if (shippingBar && shippingText) {
    shippingBar.style.width = `${freeShippingProgress}%`;
    if (remainingForFreeShipping === 0) {
      shippingText.innerHTML = `🎉 <strong>Congratulations!</strong> You qualified for FREE Express Delivery!`;
      shippingBar.className = 'h-full bg-emerald-500 transition-all duration-500 rounded-full';
    } else {
      shippingText.innerHTML = `Add <strong>${formatPrice(remainingForFreeShipping)}</strong> more for <strong>FREE EXPRESS DELIVERY</strong>`;
      shippingBar.className = 'h-full bg-[#0a0a0a] transition-all duration-500 rounded-full';
    }
  }

  let discount = 0;
  if (state.appliedPromo === 'HAUS10') {
    discount = Math.round(subtotal * 0.10);
  }

  const shippingCost = subtotal >= freeShippingThreshold ? 0 : 250;
  const grandTotal = subtotal - discount + (subtotal > 0 ? shippingCost : 0);

  const subtotalElem = document.getElementById('cart-subtotal');
  const discountElem = document.getElementById('cart-discount');
  const discountRow = document.getElementById('cart-discount-row');
  const shippingElem = document.getElementById('cart-shipping');
  const totalElem = document.getElementById('cart-grand-total');

  if (subtotalElem) subtotalElem.innerText = formatPrice(subtotal);
  if (discountElem && discountRow) {
    if (discount > 0) {
      discountRow.classList.remove('hidden');
      discountElem.innerText = `-${formatPrice(discount)}`;
    } else {
      discountRow.classList.add('hidden');
    }
  }
  if (shippingElem) shippingElem.innerText = shippingCost === 0 ? 'FREE' : formatPrice(shippingCost);
  if (totalElem) totalElem.innerText = formatPrice(grandTotal);
}

function applyPromoCode() {
  const input = document.getElementById('promo-input');
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === 'HAUS10') {
    state.appliedPromo = 'HAUS10';
    showToast('Promo code "HAUS10" applied (10% OFF)');
    renderCartDrawerItems();
  } else {
    showToast('Invalid promo code. Try "HAUS10"');
  }
}

// --- WHATSAPP CHECKOUT DIRECT FLOW ---
const CORE_WHATSAPP_NUMBER = '918547023694';

function checkoutViaWhatsApp() {
  if (!state.cart || state.cart.length === 0) {
    showToast('Your bag is empty!');
    return;
  }

  let subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = state.appliedPromo === 'HAUS10' ? Math.round(subtotal * 0.10) : 0;
  let shipping = subtotal >= 2499 ? 0 : 250;
  let total = subtotal - discount + shipping;

  let msg = "*HAUS OF SNEAKERS | CART ORDER*\n";
  msg += "─────────────────────────\n\n";
  msg += "Hello Team, I would like to place an order for the following item(s):\n\n";
  state.cart.forEach((item, idx) => {
    msg += (idx + 1) + ". *" + item.name + "*\n";
    msg += "   • Size: " + (item.size || 'Standard') + "\n";
    if (item.color && item.color.toLowerCase() !== 'monochrome') {
      msg += "   • Color: " + item.color + "\n";
    }
    msg += "   • Quantity: " + item.quantity + "\n";
    msg += "   • Price: Rs. " + (item.price * item.quantity).toLocaleString('en-IN') + "\n\n";
  });
  msg += "─────────────────────────\n";
  msg += "🧾 *ORDER SUMMARY*\n";
  msg += "• Subtotal: Rs. " + subtotal.toLocaleString('en-IN') + "\n";
  if (discount > 0) msg += "• Discount (HAUS10): -Rs. " + discount.toLocaleString('en-IN') + "\n";
  msg += "• Shipping: " + (shipping === 0 ? 'FREE Express' : 'Rs. ' + shipping) + "\n";
  msg += "• *Total Amount: Rs. " + total.toLocaleString('en-IN') + "*\n";
  msg += "─────────────────────────\n\n";
  msg += "Please confirm my order and share delivery / payment details. Thank you!";

  const waUrl = "https://wa.me/" + CORE_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  window.open(waUrl, '_blank');
}

function buyNowWhatsApp(productId, size, color) {
  const product = PRODUCTS_DATA.find(p => p.id === productId);
  if (!product) return;
  const selSize = size || product.sizes[0] || 'Standard';
  const selColor = color || (product.colors && product.colors[0]?.name) || '';

  let msg = "Hi! 👋 I'm interested in this pair of sneakers.\n\n";
  msg += "*Product:* " + product.name + "\n";
  msg += "*Size:* " + selSize + "\n";
  if (selColor && selColor.toLowerCase() !== 'monochrome') {
    msg += "*Color:* " + selColor + "\n";
  }
  msg += "*Price:* ₹" + product.price.toLocaleString('en-IN') + "\n\n";
  msg += "Is this size available? Also, please let me know the dispatch timeline and payment options.\n\n";
  msg += "Thank you! 😊";

  const waUrl = "https://wa.me/" + CORE_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
  window.open(waUrl, '_blank');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkout-order-summary');
  if (!container) return;

  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  let subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discount = state.appliedPromo === 'HAUS10' ? Math.round(subtotal * 0.10) : 0;
  let shipping = subtotal >= 2499 ? 0 : 250;
  let total = subtotal - discount + shipping;

  container.innerHTML = `
    <div class="border-b border-neutral-200 pb-3 mb-3">
      <div class="text-xs font-mono-code font-bold uppercase text-[#0a0a0a] mb-2">Order Items (${totalCount})</div>
      <div class="max-h-40 overflow-y-auto space-y-2 pr-2">
        ${state.cart.map(item => `
          <div class="flex justify-between text-xs">
            <span class="text-neutral-700 font-medium">${item.name} (${item.size}) × ${item.quantity}</span>
            <span class="font-mono-code font-bold text-[#0a0a0a]">${formatPrice(item.price * item.quantity)}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="space-y-1.5 text-xs font-mono-code">
      <div class="flex justify-between text-neutral-600"><span>Subtotal:</span><span>${formatPrice(subtotal)}</span></div>
      ${discount > 0 ? `<div class="flex justify-between text-emerald-600 font-bold"><span>Promo Discount (HAUS10):</span><span>-${formatPrice(discount)}</span></div>` : ''}
      <div class="flex justify-between text-neutral-600"><span>Shipping:</span><span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
      <div class="flex justify-between text-base font-bold text-[#0a0a0a] border-t border-neutral-200 pt-2 mt-2">
        <span>Total Payable:</span><span>${formatPrice(total)}</span>
      </div>
    </div>
  `;
}

function processCheckoutOrder(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const address = form.address.value.trim();
  const city = form.city.value.trim();
  const payment = form.payment.value;

  if (!name || !phone || !address || !city) {
    alert('Please fill out all shipping details.');
    return;
  }

  const orderId = 'CORE-' + Math.floor(100000 + Math.random() * 900000);

  const modalContent = document.getElementById('checkout-modal-body');
  if (modalContent) {
    modalContent.innerHTML = `
      <div class="text-center py-10 px-4">
        <div class="w-16 h-16 bg-neutral-200 text-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 class="font-display text-2xl font-black uppercase text-neutral-900 mb-1">Order Confirmed!</h2>
        <p class="text-xs font-mono-code text-neutral-500 mb-6">Tracking Number: <strong class="text-[#0a0a0a]">${orderId}</strong></p>
        
        <div class="bg-neutral-100/50 border border-neutral-300 rounded-2xl p-5 text-left text-xs max-w-md mx-auto mb-6 space-y-2">
          <div class="flex justify-between"><strong>Recipient:</strong> <span>${name}</span></div>
          <div class="flex justify-between"><strong>Phone:</strong> <span>${phone}</span></div>
          <div class="flex justify-between"><strong>Delivery to:</strong> <span>${address}, ${city}</span></div>
          <div class="flex justify-between"><strong>Payment Mode:</strong> <span class="uppercase font-bold text-[#0a0a0a]">${payment}</span></div>
          <div class="flex justify-between border-t border-neutral-300 pt-2 font-bold text-neutral-900 text-sm">
            <span>Estimated Delivery:</span> <span>2 - 4 Business Days</span>
          </div>
        </div>

        <div class="flex gap-3 justify-center">
          <button onclick="window.print()" class="pill-btn pill-btn-outline text-xs">Print Receipt</button>
          <button onclick="finishCheckout()" class="pill-btn text-xs">Continue Shopping</button>
        </div>
      </div>
    `;
  }

  state.cart = [];
  saveCart();
  updateCartBadge();
  showToast(`Order #${orderId} placed successfully!`);
}

function finishCheckout() {
  closeCheckoutModal();
  location.reload();
}

// --- REELS MODAL WITH REAL MP4 VIDEO CONTROLS ---
function openReelModal(reelId) {
  const reel = REELS_DATA.find(r => r.id === reelId);
  if (!reel) return;

  state.activeReel = reel;
  const modal = document.getElementById('reel-modal');
  const container = document.getElementById('reel-modal-container');
  if (!modal || !container) return;

  container.innerHTML = `
    <div class="relative w-full max-w-sm aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-5 text-white border-2 border-[#0a0a0a]">
      
      <!-- Real MP4 Video Element -->
      <video 
        id="modal-reel-video"
        src="${reel.video}" 
        autoplay 
        loop 
        playsinline
        class="absolute inset-0 w-full h-full object-cover"
      ></video>
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none"></div>

      <!-- Top Story Progress Bar & Header -->
      <div class="relative z-10 space-y-3">
        <div class="w-full bg-white/30 h-1 rounded-full overflow-hidden">
          <div class="bg-[#0a0a0a] h-full animate-[marquee_5s_linear_infinite]" style="width: 70%"></div>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] animate-ping"></span>
            <span class="font-display font-bold text-xs uppercase tracking-widest text-white">CORE</span>
          </div>
          <div class="flex items-center gap-2">
            <!-- Sound toggle button -->
            <button onclick="toggleReelAudio(this)" class="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#0a0a0a] transition-colors" title="Toggle Sound">
              <svg id="reel-sound-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
            <button onclick="closeReelModal()" class="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-black transition-colors">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Reel Bottom Info & Shop Product Pill -->
      <div class="relative z-10 space-y-4">
        <div>
          <span class="text-[11px] font-mono-code font-bold tracking-widest uppercase text-neutral-400 block mb-1">${reel.subtitle}</span>
          <h3 class="font-display text-xl font-black uppercase text-white leading-tight">${reel.title}</h3>
          <p class="text-xs text-neutral-200 mt-2 leading-relaxed">${reel.description}</p>
        </div>

        <div class="bg-white/95 backdrop-blur-md text-neutral-900 p-3.5 rounded-2xl flex items-center justify-between shadow-xl border border-neutral-300">
          <div>
            <div class="text-xs font-display font-bold uppercase">${reel.productName}</div>
            <div class="text-xs font-mono-code font-bold text-[#0a0a0a]">${reel.productPrice}</div>
          </div>
          <button onclick="closeReelModal(); openQuickView('${reel.productLinked}')" class="pill-btn py-2 px-4 text-xs font-bold">
            Shop Pair
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
}

function toggleReelAudio(btn) {
  const vid = document.getElementById('modal-reel-video');
  if (!vid) return;
  vid.muted = !vid.muted;
  btn.classList.toggle('bg-[#0a0a0a]', !vid.muted);
}

function closeReelModal() {
  const modal = document.getElementById('reel-modal');
  const vid = document.getElementById('modal-reel-video');
  if (vid) vid.pause();
  if (modal) modal.classList.add('hidden');
}

// --- SEARCH DRAWER ---
function openSearchDrawer() {
  const drawer = document.getElementById('search-drawer');
  if (drawer) {
    drawer.classList.remove('hidden');
    document.getElementById('search-input')?.focus();
  }
}

function closeSearchDrawer() {
  const drawer = document.getElementById('search-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function handleSearch(query) {
  const container = document.getElementById('search-results');
  if (!container) return;

  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-neutral-400 font-mono-code text-xs uppercase">
        Type to search across Men's & Women's footwear
      </div>
    `;
    return;
  }

  const results = PRODUCTS_DATA.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.gender.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );

  if (results.length === 0) {
    container.innerHTML = `<div class="text-center py-10 text-neutral-500 font-mono-code text-xs">No silhouettes match "${query}". Try 'runner', 'boots', 'fat-lace' or 'women'.</div>`;
    return;
  }

  container.innerHTML = results.map(p => `
    <div class="flex items-center gap-4 p-3 hover:bg-neutral-100/60 rounded-xl cursor-pointer transition-colors" onclick="closeSearchDrawer(); openQuickView('${p.id}')">
      <img src="${p.images[0]}" alt="${p.name}" class="w-14 h-14 object-cover rounded-lg bg-neutral-100 border border-neutral-200" />
      <div class="flex-1">
        <h4 class="font-display text-sm font-bold uppercase text-neutral-900 leading-tight">${p.name}</h4>
        <span class="text-[11px] font-mono-code text-[#0a0a0a] uppercase font-bold">${p.gender} • ${p.category}</span>
      </div>
      <span class="font-mono-code font-bold text-sm text-[#0a0a0a]">${formatPrice(p.price)}</span>
    </div>
  `).join('');
}
// --- REELS / LOOKBOOK VIDEO SECTION AUTOSCROLL ---
function initReelsAutoScroll() {
  const track = document.getElementById('reels-slider-track');
  if (!track) return;

  let autoScrollTimer = null;

  function step() {
    if (!track) return;
    const card = track.firstElementChild;
    const scrollStep = card ? card.getBoundingClientRect().width + 16 : 250;
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  }

  function start() {
    stop();
    autoScrollTimer = setInterval(step, 3800);
  }

  function stop() {
    if (autoScrollTimer) clearInterval(autoScrollTimer);
  }

  track.addEventListener('mouseenter', stop);
  track.addEventListener('mouseleave', start);
  track.addEventListener('touchstart', stop, { passive: true });
  track.addEventListener('touchend', () => {
    setTimeout(start, 5000);
  }, { passive: true });

  start();
}


// --- WISHLIST MANAGEMENT ---
function toggleWishlist(productId, event) {
  if (event) event.stopPropagation();
  const idx = state.wishlist.indexOf(productId);
  if (idx > -1) {
    state.wishlist.splice(idx, 1);
    showToast('Removed from wishlist');
  } else {
    state.wishlist.push(productId);
    showToast('Saved to wishlist');
  }
  localStorage.setItem('core_wishlist', JSON.stringify(state.wishlist));
  renderProducts();
}

// --- CURRENCY SELECTOR ---
function setupCurrencySelector() {
  const select = document.getElementById('currency-selector');
  if (select) {
    select.value = state.currentCurrency;
    select.addEventListener('change', (e) => {
      state.currentCurrency = e.target.value;
      renderProducts();
      renderCartDrawerItems();
      showToast(`Switched currency to ${state.currentCurrency}`);
    });
  }
}

// --- SIZE GUIDE MODAL ---
function openSizeGuide() {
  const modal = document.getElementById('size-guide-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeSizeGuide() {
  const modal = document.getElementById('size-guide-modal');
  if (modal) modal.classList.add('hidden');
}

// --- TOAST ENGINE ---
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="text-white">✦</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// --- EVENT LISTENERS SETUP ---
// Global mobile navigation close helper
window.closeMobileNav = function() {
  const mobileNav = document.getElementById('mobile-nav-panel');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const closeMenuIcon = document.getElementById('close-menu-icon');
  if (mobileNav) mobileNav.classList.add('hidden');
  if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
  if (closeMenuIcon) closeMenuIcon.classList.add('hidden');
};

function setupEventListeners() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav-panel');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const closeMenuIcon = document.getElementById('close-menu-icon');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = mobileNav.classList.contains('hidden');
      if (isClosed) {
        mobileNav.classList.remove('hidden');
        if (hamburgerIcon) hamburgerIcon.classList.add('hidden');
        if (closeMenuIcon) closeMenuIcon.classList.remove('hidden');
      } else {
        mobileNav.classList.add('hidden');
        if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
        if (closeMenuIcon) closeMenuIcon.classList.add('hidden');
      }
    });

    document.addEventListener('click', (e) => {
      if (mobileNav && !mobileNav.classList.contains('hidden')) {
        if (!mobileNav.contains(e.target) && !menuBtn.contains(e.target)) {
          closeMobileNav();
        }
      }
    });
  }

  // Active navigation highlight on scroll
  const navSections = [
    { id: 'hero-banner-section', link: 'a[href="#hero-banner-section"]' },
    { id: 'gender-filter-section', link: 'a[href="#gender-filter-section"]' },
    { id: 'site-footer', link: 'a[href="#site-footer"]' },
    { id: 'faq-section', link: 'a[href="#faq-section"]' }
  ];

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 140;
    navSections.forEach(({ id, link }) => {
      const el = document.getElementById(id);
      const navLinks = document.querySelectorAll(link);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach(a => {
            const ind = a.querySelector('.nav-indicator');
            if (ind) ind.style.width = '100%';
            a.classList.add('text-white');
          });
        } else {
          navLinks.forEach(a => {
            const ind = a.querySelector('.nav-indicator');
            if (ind) ind.style.width = '0';
            a.classList.remove('text-white');
          });
        }
      }
    });
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickView();
      closeCartDrawer();
      closeSearchDrawer();
      closeReelModal();
      closeCheckoutModal();
      closeSizeGuide();
    }
  });
}



// --- BRAND CLICK HANDLER ---
function handleBrandClick(brand) {
  console.log('Brand clicked:', brand);
  // TODO: implement brand filtering
  showToast(`Brand ${brand} clicked (filter not implemented)`);
}


// ==============================================================================
// CATEGORY SELECTION & DYNAMIC FILTERING ENGINE (HAUS OF SNEAKER)
// ==============================================================================
window.selectCategory = function(gender) {
  state.activeGenderFilter = gender;
  
  // Highlight active gender tab in gender filter section
  const genderTabs = document.querySelectorAll('.gender-tab');
  genderTabs.forEach(t => {
    t.classList.remove('filter-tab-active', 'bg-white', 'text-black');
    t.classList.add('bg-black', 'text-neutral-400');
    if (t.dataset.gender === gender) {
      t.classList.add('filter-tab-active', 'bg-white', 'text-black');
      t.classList.remove('bg-black', 'text-neutral-400');
    }
  });

  // Update Category Section UI
  const displaySection = document.getElementById('category-products-display');
  const titleEl = document.getElementById('category-results-title');
  const countEl = document.getElementById('category-results-count');
  const gridEl = document.getElementById('category-products-grid');
  const switchMen = document.getElementById('cat-switch-men');
  const switchWomen = document.getElementById('cat-switch-women');
  const cardMen = document.getElementById('card-shop-men');
  const cardWomen = document.getElementById('card-shop-women');

  if (displaySection && titleEl && gridEl) {
    displaySection.classList.remove('hidden');

    if (gender === 'men') {
      if (cardMen) cardMen.classList.add('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');
      if (cardWomen) cardWomen.classList.remove('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');
      
      titleEl.textContent = "MEN'S SNEAKERS COLLECTION";
      if (switchMen) {
        switchMen.className = 'px-5 py-2 text-xs font-condensed font-bold uppercase tracking-wider border border-white bg-white text-black transition-all';
      }
      if (switchWomen) {
        switchWomen.className = 'px-5 py-2 text-xs font-condensed font-bold uppercase tracking-wider border border-white/20 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white transition-all';
      }
    } else {
      if (cardWomen) cardWomen.classList.add('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');
      if (cardMen) cardMen.classList.remove('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');

      titleEl.textContent = "WOMEN'S SNEAKERS COLLECTION";
      if (switchWomen) {
        switchWomen.className = 'px-5 py-2 text-xs font-condensed font-bold uppercase tracking-wider border border-white bg-white text-black transition-all';
      }
      if (switchMen) {
        switchMen.className = 'px-5 py-2 text-xs font-condensed font-bold uppercase tracking-wider border border-white/20 bg-neutral-900 text-neutral-300 hover:border-white hover:text-white transition-all';
      }
    }

    // Filter products
    const filtered = PRODUCTS_DATA.filter(p => p.gender === gender || p.gender === 'unisex');
    if (countEl) countEl.textContent = "SHOWING " + filtered.length + " ARCHITECTURAL SILHOUETTES";
    
    gridEl.innerHTML = filtered.map(p => createProductCardHtml(p)).join('');
    bindCardInteractions();

    const sectionEl = document.getElementById('shop-by-category-section');
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Also re-render main product grid
  renderProducts();
};

window.resetCategoryView = function() {
  const displaySection = document.getElementById('category-products-display');
  const cardMen = document.getElementById('card-shop-men');
  const cardWomen = document.getElementById('card-shop-women');

  if (displaySection) displaySection.classList.add('hidden');
  if (cardMen) cardMen.classList.remove('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');
  if (cardWomen) cardWomen.classList.remove('ring-2', 'ring-white', 'ring-offset-4', 'ring-offset-black', 'rounded-2xl');

  state.activeGenderFilter = 'all';
  const genderTabs = document.querySelectorAll('.gender-tab');
  genderTabs.forEach(t => {
    t.classList.remove('filter-tab-active', 'bg-white', 'text-black');
    t.classList.add('bg-black', 'text-neutral-400');
    if (t.dataset.gender === 'all') {
      t.classList.add('filter-tab-active', 'bg-white', 'text-black');
      t.classList.remove('bg-black', 'text-neutral-400');
    }
  });

  renderProducts();
}


