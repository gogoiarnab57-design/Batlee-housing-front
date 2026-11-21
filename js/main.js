/* Batlee Housing Solution - router, events and customer actions (front-end only). */
(function (w) {
  'use strict';
  var BHS = w.BHS, U = BHS.U, S = BHS.S, esc = U.esc, money = U.money;
  var doc = w.document, app = doc.getElementById('app');
  BHS.forms = BHS.forms || {};
  BHS.actions = BHS.actions || {};
  var A = BHS.actions, F = BHS.forms;

  /* ---------- flash messages (shown once on the next page draw) ---------- */
  var flashes = [];
  BHS.flash = function (msg, type) { flashes.push({ m: msg, t: type || 'ok' }); };
  BHS.takeFlash = function () {
    var out = flashes.map(function (f) { return '<div class="alert ' + (f.t === 'err' ? 'alert-err' : 'alert-ok') + '" role="status">' + esc(f.m) + '</div>'; }).join('');
    flashes = []; return out;
  };

  /* ---------- form state kept only until the visitor leaves the page ---------- */
  var formStates = {};
  BHS.setFormState = function (name, vals, errs) { formStates[name] = { vals: vals, errs: errs || {} }; };
  BHS.formState = function (name) { return formStates[name] || null; };

  /* ---------- pop-up message ---------- */
  var toastTimer;
  BHS.toast = function (msg, isErr) {
    var t = doc.getElementById('toast');
    if (!t) {
      t = doc.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status');
      t.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:90;max-width:90vw;padding:11px 18px;border-radius:10px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.3);color:#fff;';
      doc.body.appendChild(t);
    }
    t.style.background = isErr ? '#8f2314' : '#111214';
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  };

  /* ---------- routing ---------- */
  function dec(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { return s; } }
  function parse() {
    var h = (w.location.hash || '#/').replace(/^#/, ''), qs = '', i = h.indexOf('?');
    if (i >= 0) { qs = h.slice(i + 1); h = h.slice(0, i); }
    var q = {};
    qs.split('&').forEach(function (kv) { if (!kv) { return; } var j = kv.indexOf('='); q[dec(j < 0 ? kv : kv.slice(0, j))] = j < 0 ? '' : dec(kv.slice(j + 1)); });
    return { parts: h.split('/').filter(Boolean).map(dec), q: q };
  }
  BHS.go = function (hash) { if (w.location.hash === hash) { BHS.rerender(); } else { w.location.hash = hash; } };

  function draw() {
    var ctx = parse(), isAdminRoute = ctx.parts[0] === 'admin', out = null, view;
    try {
      if (isAdminRoute) {
        if (!S.isAdmin()) { BHS.flash('Please log in as admin to continue.', 'err'); BHS.go('#/login?next=admin'); return; }
        view = BHS.admin.views[ctx.parts[1] || 'dashboard'];
      } else {
        view = BHS.shop.views[ctx.parts[0] || 'home'];
      }
      out = view ? view(ctx) : { title: 'Page not found', html: '<div class="empty"><h1>Page not found</h1><a class="btn btn-dark" href="#/">Back to home</a></div>' };
      if (!out) { return; }
      doc.body.className = isAdminRoute && view ? 'admin-body' : '';
      app.innerHTML = (isAdminRoute && view) ? out.html : BHS.shop.layout(out.html, ctx);
      doc.title = out.title + (isAdminRoute ? ' | Admin' : ' | ' + S.setting('site_name', 'Batlee Housing Solution'));
      var m = doc.querySelector('input[name="method"]:checked'), upi = doc.getElementById('upi-ref');
      if (upi) { upi.hidden = !(m && m.value === 'upi'); }
    } catch (e) {
      if (w.console) { w.console.error(e); }
      doc.body.className = '';
      app.innerHTML = '<div class="wrap main"><div class="empty"><h1>Something went wrong</h1><p>Please refresh the page. If it keeps happening, open the admin panel and use "Reset demo data".</p><a class="btn btn-dark" href="#/">Back to home</a></div></div>';
    }
  }
  function route() { formStates = {}; draw(); w.scrollTo(0, 0); }
  BHS.rerender = function () { var y = w.pageYOffset; draw(); w.scrollTo(0, y); };

  /* ---------- events ---------- */
  doc.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) { return; }
    var fn = A[el.dataset.act];
    if (!fn) { return; }
    if (el.dataset.confirm && !w.confirm(el.dataset.confirm)) { return; }
    e.preventDefault(); fn(el, e);
  });
  doc.addEventListener('submit', function (e) {
    var f = e.target.closest ? e.target.closest('form[data-form]') : null;
    if (!f) { return; }
    e.preventDefault();
    var fn = F[f.dataset.form];
    if (fn) { fn(f, e); }
  });
  doc.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-change]') : null;
    if (!el) { return; }
    var kind = el.dataset.change;
    if (kind === 'sort') {
      var p = []; if (el.dataset.cat) { p.push('cat=' + encodeURIComponent(el.dataset.cat)); } if (el.dataset.term) { p.push('q=' + encodeURIComponent(el.dataset.term)); }
      if (el.value !== 'new') { p.push('sort=' + encodeURIComponent(el.value)); }
      BHS.go('#/shop' + (p.length ? '?' + p.join('&') : ''));
    } else if (kind === 'paymethod') {
      var m = doc.querySelector('input[name="method"]:checked'), upi = doc.getElementById('upi-ref');
      if (upi) { upi.hidden = !(m && m.value === 'upi'); }
    } else if (kind === 'product-images') {
      BHS.addImages(el.files); el.value = '';
    }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var pnl = doc.getElementById('helpline-panel'); if (pnl && !pnl.hidden) { A['helpline-toggle'](); } }
  });
  w.addEventListener('hashchange', route);

  /* ---------- small actions ---------- */
  function updateBadge() {
    var b = doc.getElementById('cart-badge'), n = S.cartCount();
    if (b) { b.textContent = n; b.hidden = n < 1; }
    var l = doc.querySelector('.cart-link'); if (l) { l.setAttribute('aria-label', 'Cart, ' + n + ' items'); }
  }
  A['nav-toggle'] = function (el) {
    var t = doc.getElementById(el.getAttribute('aria-controls')); if (!t) { return; }
    el.setAttribute('aria-expanded', t.classList.toggle('open') ? 'true' : 'false');
  };
  A.logout = function () { S.logout(); BHS.flash('You have been logged out.'); BHS.go('#/'); };
  A['helpline-toggle'] = function () {
    var p = doc.getElementById('helpline-panel'), b = doc.getElementById('helpline-open'); if (!p) { return; }
    p.hidden = !p.hidden; if (b) { b.setAttribute('aria-expanded', p.hidden ? 'false' : 'true'); }
  };
  A.thumb = function (el) {
    var m = doc.getElementById('main-img'); if (m) { m.src = el.dataset.src; }
    Array.prototype.forEach.call(doc.querySelectorAll('.thumb'), function (x) { x.classList.remove('active'); }); el.classList.add('active');
  };
  A.add = function (el) {
    var p = S.product(el.dataset.id);
    if (!p || !p.active || p.stock <= 0) { BHS.toast('Sorry, that product is not available.', true); return; }
    var want = S.cartQty(p.id) + 1, max = Math.min(p.stock, S.cartMax), note = '';
    if (want > max) { want = max; note = ' (maximum available quantity)'; }
    S.cartSet(p.id, want); updateBadge(); BHS.toast('"' + p.name + '" added to cart' + note + '.');
  };
  A['cart-update'] = function (el) { var i = doc.getElementById('q' + el.dataset.id); if (i) { S.cartSet(Number(el.dataset.id), i.value); BHS.rerender(); } };
  A['cart-remove'] = function (el) { S.cartSet(Number(el.dataset.id), 0); BHS.flash('Item removed.'); BHS.rerender(); };
  A.locate = function () {
    var st = doc.getElementById('loc-status'), form = doc.querySelector('form[data-form="checkout"]');
    if (!w.navigator.geolocation) { st.textContent = 'Location is not supported on this device.'; return; }
    st.textContent = 'Getting your location...';
    w.navigator.geolocation.getCurrentPosition(function (pos) {
      form.elements.lat.value = pos.coords.latitude.toFixed(7); form.elements.lng.value = pos.coords.longitude.toFixed(7); st.textContent = 'Location attached. Thank you!';
    }, function () { st.textContent = 'Could not get your location - you can skip this step.'; }, { enableHighAccuracy: true, timeout: 10000 });
  };

  /* ---------- customer forms ---------- */
  F.search = function (f) { var q = f.elements.q.value.trim().slice(0, 80); BHS.go('#/shop' + (q ? '?q=' + encodeURIComponent(q) : '')); };

  var chatTimes = [];
  F.helpline = function (f) {
    var st = doc.getElementById('helpline-status'), name = f.elements.name.value.trim().slice(0, 100), phone = f.elements.phone.value.trim(), message = f.elements.message.value.trim().slice(0, 1000);
    function say(t, ok) { st.textContent = t; st.className = 'helpline-status ' + (ok ? 'ok' : 'err'); }
    if (!name || !message || !U.validPhone(phone)) { say('Please enter your name, a valid phone number and a message.', false); return; }
    var now = Date.now(); chatTimes = chatTimes.filter(function (t) { return t > now - 3600000; });
    if (chatTimes.length >= 5) { say('You have sent several messages already. Please call us for urgent help.', false); return; }
    chatTimes.push(now);
    S.data().messages.push({ id: S.nextId('message'), name: name, phone: phone, message: message, read: false, created: new Date().toISOString() });
    if (!S.save()) { say('Could not save your message. Please call us instead.', false); return; }
    say('Thank you! Your message has been sent. We will contact you soon.', true); f.reset();
  };

  F.buy = function (f, e) {
    var p = S.product(f.dataset.id), mode = e && e.submitter ? e.submitter.value : 'add';
    if (!p || !p.active || p.stock <= 0) { BHS.toast('Sorry, that product is not available.', true); return; }
    var qty = Math.max(1, parseInt(f.elements.qty.value, 10) || 1), max = Math.min(p.stock, S.cartMax), want = Math.min(max, S.cartQty(p.id) + qty);
    S.cartSet(p.id, want); updateBadge();
    if (mode === 'buy') { BHS.go('#/cart'); } else { BHS.toast('"' + p.name + '" added to cart' + (S.cartQty(p.id) >= max ? ' (maximum available quantity)' : '') + '.'); }
  };

  F.review = function (f) {
    var u = S.currentUser(), p = S.product(f.dataset.id), rating = parseInt(f.elements.rating.value, 10);
    if (!u || u.role === 'admin' || !p) { return; }
    if (!(rating >= 1 && rating <= 5)) { BHS.flash('Please choose a rating from 1 to 5.', 'err'); BHS.rerender(); return; }
    if (S.data().reviews.some(function (r) { return r.productId === p.id && r.userId === u.id; })) { BHS.flash('You have already reviewed this product.', 'err'); BHS.rerender(); return; }
    S.data().reviews.push({ id: S.nextId('review'), productId: p.id, userId: u.id, name: u.name, rating: rating, comment: f.elements.comment.value.trim().slice(0, 1000), status: 'pending', created: new Date().toISOString() });
    S.save(); BHS.flash('Thank you! Your review will appear after our team approves it.'); BHS.rerender();
  };

  F.checkout = function (f) {
    var v = {}, errs = {};
    ['name', 'phone', 'email', 'address', 'landmark', 'city', 'state', 'pincode', 'notes', 'lat', 'lng'].forEach(function (k) { v[k] = f.elements[k].value.trim(); });
    v.name = v.name.slice(0, 100); v.address = v.address.slice(0, 400); v.landmark = v.landmark.slice(0, 150); v.city = v.city.slice(0, 80); v.state = v.state.slice(0, 80); v.notes = v.notes.slice(0, 500);
    if (!v.name) { errs.name = 'Please enter your full name.'; }
    if (!U.validPhone(v.phone)) { errs.phone = 'Please enter a valid contact number.'; }
    if (v.email && !U.validEmail(v.email)) { errs.email = 'Please enter a valid email address.'; }
    if (v.address.length < 6) { errs.address = 'Please enter your full delivery address.'; }
    if (!v.city) { errs.city = 'Please enter your city.'; }
    if (!v.state) { errs.state = 'Please enter your state.'; }
    if (!/^[0-9]{6}$/.test(v.pincode)) { errs.pincode = 'Please enter a 6-digit PIN code.'; }
    if (!(v.lat !== '' && isFinite(Number(v.lat)) && isFinite(Number(v.lng)) && Math.abs(Number(v.lat)) <= 90 && Math.abs(Number(v.lng)) <= 180)) { v.lat = ''; v.lng = ''; }
    if (Object.keys(errs).length) { BHS.setFormState('checkout', v, errs); BHS.rerender(); return; }
    S.setCheckout(v); BHS.go('#/payment');
  };

  F.payment = function (f) {
    var co = S.checkout(), r = f.elements.method, method = r && r.value ? r.value : '';
    var ref = f.elements.payment_ref ? f.elements.payment_ref.value.trim().slice(0, 60) : '';
    if (!co) { BHS.go('#/checkout'); return; }
    if (['cod', 'upi', 'card', 'netbanking'].indexOf(method) < 0 || S.setting('pay_' + method, '1') !== '1') { BHS.flash('Please choose a payment option.', 'err'); BHS.rerender(); return; }
    if (ref && !/^[A-Za-z0-9\-_.@ ]+$/.test(ref)) { BHS.flash('The payment reference may contain only letters, numbers and - _ . @', 'err'); BHS.rerender(); return; }
    var res = S.placeOrder(co, method, method === 'upi' ? ref : '');
    if (!res.ok) { BHS.flash(res.error, 'err'); BHS.go('#/cart'); return; }
    BHS.go('#/success');
  };

  var failed = [];
  F.login = function (f) {
    var uname = f.elements.username.value.trim().slice(0, 60), now = Date.now();
    failed = failed.filter(function (t) { return t > now - 900000; });
    if (failed.length >= 5) { BHS.setFormState('login', { username: uname }, { form: 'Too many failed attempts. Please wait 15 minutes and try again.' }); BHS.rerender(); return; }
    var u = S.login(uname, f.elements.password.value);
    if (!u) { failed.push(now); BHS.setFormState('login', { username: uname }, { form: 'Incorrect username or password.' }); BHS.rerender(); return; }
    failed = [];
    var next = f.dataset.next, ok = { account: '#/account', cart: '#/cart', checkout: '#/checkout' };
    BHS.go(u.role === 'admin' ? '#/admin' : (ok[next] || '#/account'));
  };

  F.register = function (f) {
    var v = { name: f.elements.name.value.trim(), username: f.elements.username.value.trim(), phone: f.elements.phone.value.trim(), email: f.elements.email.value.trim() };
    var pw = f.elements.password.value, pw2 = f.elements.password2.value, errs = [];
    if (!v.name || v.name.length > 100) { errs.push('Please enter your name.'); }
    if (!/^[A-Za-z0-9_.@-]{3,40}$/.test(v.username)) { errs.push('Username must be 3-40 characters: letters, numbers and _ . @ - only.'); }
    if (!U.validPhone(v.phone)) { errs.push('Please enter a valid phone number.'); }
    if (v.email && !U.validEmail(v.email)) { errs.push('Please enter a valid email address.'); }
    if (pw.length < 8) { errs.push('Password must be at least 8 characters.'); } else if (pw.length > 200) { errs.push('Password is too long.'); }
    if (pw !== pw2) { errs.push('The two passwords do not match.'); }
    if (!errs.length && S.userByName(v.username)) { errs.push('That username is already taken.'); }
    if (errs.length) { BHS.setFormState('register', v, { list: errs }); BHS.rerender(); return; }
    v.password = pw; S.register(v);
    BHS.flash('Welcome, ' + v.name + '! Your account is ready.'); BHS.go('#/');
  };

  F.profile = function (f) {
    var u = S.currentUser(), name = f.elements.name.value.trim().slice(0, 100), phone = f.elements.phone.value.trim(), email = f.elements.email.value.trim();
    if (!u) { return; }
    if (!name || !U.validPhone(phone) || (email && !U.validEmail(email))) { BHS.flash('Please check your name, phone number and email.', 'err'); }
    else { u.name = name; u.phone = phone; u.email = email; S.save(); BHS.flash('Profile updated.'); }
    BHS.rerender();
  };
  F.password = function (f) {
    var u = S.currentUser(), nw = f.elements.next.value, err = null;
    if (!u) { return; }
    if (U.hashPw(u.salt, f.elements.current.value) !== u.hash) { err = 'Your current password is incorrect.'; }
    else if (nw.length < 8) { err = 'Password must be at least 8 characters.'; }
    else if (nw !== f.elements.next2.value) { err = 'The new passwords do not match.'; }
    if (err) { BHS.flash(err, 'err'); } else { u.salt = U.salt(); u.hash = U.hashPw(u.salt, nw); S.save(); BHS.flash('Password changed.'); }
    BHS.rerender();
  };

  route();
})(window);
