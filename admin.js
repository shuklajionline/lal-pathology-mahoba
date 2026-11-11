import { firebaseConfig as c } from './firebase-config.js';

const V = '10.12.2';
const $ = id => document.getElementById(id);
const DEFAULT_TESTS = ['Blood Test', 'Thyroid Test – TSH, T3, T4 Profile', 'Complete Blood Count (CBC)', 'HbA1c Test', 'Blood Sugar Test',
  'Lipid Profile Test', 'Cholesterol Test', 'LFT (Liver Function Test)', 'KFT (Kidney Function Test)', 'SGPT (ALT) Test', 'SGOT (AST) Test',
  'Creatinine Test', 'Vitamin D Test', 'Vitamin B12 Test', 'Malaria Test', 'Typhoid Test', 'Home Sample Collection (Mahoba city)'];

function say(el, text, ok = true) {
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

if (!c || !c.apiKey || c.apiKey.startsWith('PASTE')) {
  $('setup').hidden = false;
} else {
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = initializeApp(c);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);

  $('login').addEventListener('submit', async e => {
    e.preventDefault();
    $('lerr').textContent = '';
    try {
      await A.signInWithEmailAndPassword(auth, $('em').value.trim(), $('pw').value);
      $('pw').value = '';
    } catch (err) {
      $('lerr').textContent = 'Login failed. Check email and password.';
    }
  });
  $('logout').addEventListener('click', () => A.signOut(auth));

  A.onAuthStateChanged(auth, user => {
    $('login').hidden = !!user;
    $('app').hidden = !user;
    $('logout').hidden = !user;
    if (user) loadAll();
  });

  document.querySelectorAll('.tabs button').forEach(b =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      ['t1', 't2', 't3'].forEach(t => ($(t).hidden = t !== b.dataset.t));
    })
  );

  // ---------- Settings
  const sref = F.doc(db, 'site', 'settings');
  async function loadSettings() {
    const s = await F.getDoc(sref);
    const d = s.exists() ? s.data() : {};
    $('offerActive').checked = !!d.offerActive;
    $('offerText').value = d.offerText || '';
    $('offerEnd').value = d.offerEnd || '';
    $('offerLink').value = d.offerLink || '';
    $('noticeActive').checked = !!d.noticeActive;
    $('noticeText').value = d.noticeText || '';
    $('hoursText').value = d.hoursText || '';
  }
  $('saveSettings').addEventListener('click', async () => {
    try {
      await F.setDoc(sref, {
        offerActive: $('offerActive').checked,
        offerText: $('offerText').value.trim(),
        offerEnd: $('offerEnd').value,
        offerLink: $('offerLink').value.trim(),
        noticeActive: $('noticeActive').checked,
        noticeText: $('noticeText').value.trim(),
        hoursText: $('hoursText').value.trim(),
        updatedAt: Date.now()
      });
      say($('smsg'), 'Saved. The website updates within a minute.');
    } catch (e) {
      say($('smsg'), 'Could not save. Are you allowed to edit? (' + e.code + ')', false);
    }
  });

  // ---------- Tests
  async function loadTests() {
    const snap = await F.getDocs(F.query(F.collection(db, 'tests'), F.orderBy('order')));
    const box = $('tests');
    box.textContent = '';
    snap.docs.forEach(d => box.appendChild(testRow(d.id, d.data())));
  }
  function testRow(id, t) {
    const r = document.createElement('div');
    r.className = 'row';
    const name = Object.assign(document.createElement('input'), { type: 'text', value: t.name || '', placeholder: 'Test name' });
    const price = Object.assign(document.createElement('input'), { type: 'text', value: t.price || '', placeholder: '₹ price' });
    const order = Object.assign(document.createElement('input'), { type: 'number', value: t.order ?? 100 });
    const act = Object.assign(document.createElement('input'), { type: 'checkbox', checked: t.active !== false, title: 'Show on website' });
    const save = Object.assign(document.createElement('button'), { className: 'btn sm', textContent: 'Save' });
    const del = Object.assign(document.createElement('button'), { className: 'btn o sm', textContent: 'Delete' });
    save.addEventListener('click', async () => {
      if (!name.value.trim()) return say($('tmsg'), 'Enter a test name.', false);
      try {
        const data = { name: name.value.trim(), price: price.value.trim(), order: Number(order.value) || 0, active: act.checked };
        if (r.dataset.id) await F.setDoc(F.doc(db, 'tests', r.dataset.id), data);
        else r.dataset.id = (await F.addDoc(F.collection(db, 'tests'), data)).id;
        say($('tmsg'), 'Saved "' + data.name + '".');
      } catch (e) { say($('tmsg'), 'Could not save (' + e.code + ')', false); }
    });
    del.addEventListener('click', async () => {
      if (!confirm('Delete this test?')) return;
      try {
        if (r.dataset.id) await F.deleteDoc(F.doc(db, 'tests', r.dataset.id));
        r.remove();
      } catch (e) { say($('tmsg'), 'Could not delete (' + e.code + ')', false); }
    });
    if (id) r.dataset.id = id;
    r.append(name, price, order, act, save, del);
    return r;
  }
  $('addTest').addEventListener('click', () => $('tests').appendChild(testRow(null, { order: 100 })));
  $('seedTests').addEventListener('click', async () => {
    if ($('tests').children.length && !confirm('This adds the default tests to the existing list. Continue?')) return;
    try {
      const batch = F.writeBatch(db);
      DEFAULT_TESTS.forEach((n, i) => batch.set(F.doc(F.collection(db, 'tests')), { name: n, price: '', order: (i + 1) * 10, active: true }));
      await batch.commit();
      say($('tmsg'), 'Default tests added. Now add prices.');
      loadTests();
    } catch (e) { say($('tmsg'), 'Could not add (' + e.code + ')', false); }
  });

  // ---------- Photos
  async function loadPhotos() {
    const snap = await F.getDocs(F.query(F.collection(db, 'photos'), F.orderBy('createdAt', 'desc')));
    const box = $('photos');
    box.textContent = '';
    snap.docs.forEach(d => {
      const p = d.data();
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = p.data;
      img.alt = p.caption || '';
      const cap = document.createElement('figcaption');
      cap.textContent = (p.caption || '') + ' ';
      const del = Object.assign(document.createElement('button'), { className: 'btn o sm', textContent: 'Delete' });
      del.addEventListener('click', async () => {
        if (!confirm('Delete this photo?')) return;
        await F.deleteDoc(F.doc(db, 'photos', d.id));
        fig.remove();
      });
      cap.appendChild(del);
      fig.append(img, cap);
      box.appendChild(fig);
    });
  }
  function shrink(file, max = 900, q = 0.72) {
    return new Promise((res, rej) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/jpeg', q));
      };
      img.onerror = () => rej(new Error('Not an image'));
      img.src = url;
    });
  }
  $('upload').addEventListener('click', async () => {
    const f = $('pfile').files[0];
    if (!f) return say($('pmsg'), 'Choose a photo first.', false);
    try {
      let data = await shrink(f);
      if (data.length > 700000) data = await shrink(f, 700, 0.6);
      if (data.length > 900000) return say($('pmsg'), 'Photo is too large. Try a smaller one.', false);
      await F.addDoc(F.collection(db, 'photos'), { data, caption: $('pcap').value.trim(), createdAt: Date.now() });
      $('pfile').value = '';
      $('pcap').value = '';
      say($('pmsg'), 'Photo uploaded.');
      loadPhotos();
    } catch (e) { say($('pmsg'), 'Upload failed (' + (e.code || e.message) + ')', false); }
  });

  function loadAll() { loadSettings(); loadTests(); loadPhotos(); }
}
