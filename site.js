// Public side: loads offers, notices, tests/prices and photos managed from admin.html.
// Safe by design: if Firebase is not configured or fails, the static page stays exactly as it is.
import { firebaseConfig as c } from './firebase-config.js';

const V = '10.12.2';

(async () => {
  if (!c || !c.apiKey || c.apiKey.startsWith('PASTE')) return;
  try {
    const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
    const db = fs.getFirestore(initializeApp(c));

    // ---- Settings: offer bar, notice bar, hours text
    const snap = await fs.getDoc(fs.doc(db, 'site', 'settings'));
    if (snap.exists()) {
      const s = snap.data();
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      const live = (on, end) => on && (!end || today <= end);

      const offer = document.getElementById('offerBar');
      if (offer && live(s.offerActive, s.offerEnd) && s.offerText) {
        offer.textContent = '';
        const t = document.createElement('span');
        t.textContent = '🎉 ' + s.offerText;
        offer.appendChild(t);
        if (s.offerLink && /^(https:\/\/|tel:)/.test(s.offerLink)) {
          const a = document.createElement('a');
          a.href = s.offerLink;
          a.rel = 'noopener';
          a.textContent = ' Book now →';
          offer.appendChild(a);
        }
        offer.hidden = false;
      }
      const notice = document.getElementById('noticeBar');
      if (notice && s.noticeActive && s.noticeText) {
        notice.textContent = '📢 ' + s.noticeText;
        notice.hidden = false;
      }
      if (s.hoursText) document.querySelectorAll('.js-hours').forEach(e => (e.textContent = s.hoursText));
    }

    // ---- Tests with prices (services page)
    const grid = document.getElementById('testGrid');
    if (grid) {
      const ts = await fs.getDocs(fs.query(fs.collection(db, 'tests'), fs.orderBy('order')));
      const tests = ts.docs.map(d => d.data()).filter(t => t.active !== false && t.name);
      if (tests.length) {
        grid.textContent = '';
        tests.forEach(t => {
          const card = document.createElement('div');
          card.className = 'card';
          const h = document.createElement('h3');
          h.textContent = t.name;
          card.appendChild(h);
          if (t.price) {
            const p = document.createElement('p');
            p.className = 'price';
            p.textContent = t.price;
            card.appendChild(p);
          }
          grid.appendChild(card);
        });
      }
    }

    // ---- Photo gallery (home page)
    const gal = document.getElementById('galleryGrid');
    if (gal) {
      const ps = await fs.getDocs(fs.query(fs.collection(db, 'photos'), fs.orderBy('createdAt', 'desc'), fs.limit(12)));
      const photos = ps.docs.map(d => d.data()).filter(p => typeof p.data === 'string' && p.data.startsWith('data:image/'));
      if (photos.length) {
        photos.forEach(p => {
          const fig = document.createElement('figure');
          const img = document.createElement('img');
          img.src = p.data;
          img.alt = p.caption || 'Shree Lal Pathology Lab Mahoba';
          img.loading = 'lazy';
          fig.appendChild(img);
          if (p.caption) {
            const cap = document.createElement('figcaption');
            cap.textContent = p.caption;
            fig.appendChild(cap);
          }
          gal.appendChild(fig);
        });
        document.getElementById('gallery').hidden = false;
      }
    }
  } catch (e) {
    console.warn('Dynamic content unavailable', e);
  }
})();
