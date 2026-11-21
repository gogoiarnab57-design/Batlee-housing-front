/* Batlee Housing Solution - data layer (front-end only).
 * Everything is kept in the visitor's own browser (localStorage). There is no server and no database.
 */
(function (w) {
  'use strict';
  var BHS = w.BHS = w.BHS || {};
  var U = BHS.U = {};
  var S = BHS.S = {};

  var KEY = 'bhs_data_v1', CART_KEY = 'bhs_cart_v1';
  var SES_KEY = 'bhs_session_v1', CO_KEY = 'bhs_checkout_v1', LAST_KEY = 'bhs_lastorder_v1';
  var CART_MAX = 20;
  var memData = null, memCart = null, memSes = {};

  /* ---------- storage wrappers (fall back to memory if the browser blocks storage) ---------- */
  function lsGet(k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { w.localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function ssGet(k) { try { var v = w.sessionStorage.getItem(k); return v === null ? (memSes[k] || null) : v; } catch (e) { return memSes[k] || null; } }
  function ssSet(k, v) { memSes[k] = v; try { w.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function ssDel(k) { delete memSes[k]; try { w.sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

  /* ---------- small helpers ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  U.nl2br = function (s) { return U.esc(s).replace(/\r?\n/g, '<br>'); };
  U.money = function (n) {
    n = Math.round(Number(n || 0) * 100) / 100;
    var frac = Math.round(n * 100) % 100 !== 0;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: frac ? 2 : 0, maximumFractionDigits: 2 });
  };
  U.date = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  U.dateTime = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return U.date(iso) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };
  U.ymd = function (d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  U.stars = function (n) { n = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
  U.slug = function (s) { s = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); return s || 'item'; };
  /* Only local images or images the admin uploaded in this browser may be shown. */
  U.safeImg = function (src) {
    src = String(src || '');
    if (/^img\/[A-Za-z0-9_\-\/.]+$/.test(src) && src.indexOf('..') < 0) return src;
    if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(src)) return src;
    return '';
  };
  U.validPhone = function (p) { return /^\+?[0-9][0-9 \-]{6,18}$/.test(p); };
  U.validEmail = function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); };
  U.digits = function (s) { return String(s || '').replace(/[^0-9+]/g, ''); };

  /* SHA-256 (pure JS so it also works when the page is opened from a file) */
  var K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function rr(n, x) { return (x >>> n) | (x << (32 - n)); }
  U.sha256 = function (str) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var b = unescape(encodeURIComponent(String(str))), l = b.length, wd = [], i, j;
    for (i = 0; i < l; i++) { wd[i >> 2] = (wd[i >> 2] | 0) | (b.charCodeAt(i) << (24 - (i % 4) * 8)); }
    wd[l >> 2] = (wd[l >> 2] | 0) | (0x80 << (24 - (l % 4) * 8));
    wd[(((l + 8) >> 6) + 1) * 16 - 1] = l * 8;
    for (i = 0; i < wd.length; i += 16) {
      var a = H.slice(), W = [];
      for (j = 0; j < 64; j++) {
        if (j < 16) { W[j] = wd[i + j] | 0; }
        else {
          var s0 = rr(7, W[j - 15]) ^ rr(18, W[j - 15]) ^ (W[j - 15] >>> 3);
          var s1 = rr(17, W[j - 2]) ^ rr(19, W[j - 2]) ^ (W[j - 2] >>> 10);
          W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
        }
        var S1 = rr(6, a[4]) ^ rr(11, a[4]) ^ rr(25, a[4]);
        var ch = (a[4] & a[5]) ^ (~a[4] & a[6]);
        var t1 = (a[7] + S1 + ch + K256[j] + W[j]) | 0;
        var S0 = rr(2, a[0]) ^ rr(13, a[0]) ^ rr(22, a[0]);
        var mj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]);
        var t2 = (S0 + mj) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (j = 0; j < 8; j++) { H[j] = (H[j] + a[j]) | 0; }
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  };
  U.hashPw = function (salt, pw) { return U.sha256(salt + ':' + pw); };
  U.salt = function () {
    var a = '';
    try { var arr = new Uint8Array(8); w.crypto.getRandomValues(arr); for (var i = 0; i < arr.length; i++) { a += ('0' + arr[i].toString(16)).slice(-2); } }
    catch (e) { a = Math.random().toString(16).slice(2, 18); }
    return a;
  };

  /* ---------- starting data ---------- */
  function seed() {
    var salt = U.salt();
    function P(id, cat, name, price, mrp, stock, img, desc) {
      return { id: id, cat: cat, name: name, price: price, mrp: mrp, stock: stock, active: true, images: ['img/products/' + img + '.jpg'], desc: desc };
    }
    return {
      v: 1,
      seq: { product: 10, category: 5, order: 1, user: 2, review: 1, message: 1 },
      settings: {
        site_name: 'Batlee Housing Solution',
        tagline: 'Bathroom, kitchen, hardware and home utilities - everything for your home in one place.',
        hero_title: 'Everything your home needs',
        hero_text: 'Bathroom fittings, kitchen accessories, hardware and daily home utilities at honest prices.',
        phone: '+91 00000 00000', whatsapp: '', email: 'info@example.com',
        address: 'Your shop address here', hours: 'Mon - Sat, 10:00 AM - 7:00 PM',
        helpline_note: 'Need help choosing a product or tracking an order? Call us or leave a message and we will get back to you.',
        shipping_charge: '0', free_shipping_above: '0', upi_id: '',
        pay_cod: '1', pay_upi: '1', pay_card: '1', pay_netbanking: '1'
      },
      categories: [
        { id: 1, name: 'Bathroom Products', slug: 'bathroom-products', sort: 1 },
        { id: 2, name: 'Kitchen Accessories', slug: 'kitchen-accessories', sort: 2 },
        { id: 3, name: 'Hardware', slug: 'hardware', sort: 3 },
        { id: 4, name: 'Home Utilities', slug: 'home-utilities', sort: 4 }
      ],
      products: [
        P(1, 1, 'Premium Vanity Set with Mirror', 6999, 8999, 12, 'vanity', 'Wall-mounted vanity set with basin, mirror and storage cabinet. Sample product - replace it from the admin panel.'),
        P(2, 1, 'Chrome Rain Shower Head', 1199, 1599, 30, 'shower', 'Wide rain shower head with easy-clean nozzles and a chrome finish. Sample product.'),
        P(3, 1, 'Brass Basin Mixer Tap', 1850, 2300, 8, 'mixer', 'Single-lever basin mixer with a ceramic cartridge and brass body. Sample product.'),
        P(4, 2, 'Stainless Steel Drawer Organizer', 749, null, 25, 'organizer', 'Keeps cutlery and kitchen tools tidy. Sample product.'),
        P(5, 2, 'Wall-Mount Spice Rack', 599, 799, 20, 'rack', 'Two-tier rack with space for eight spice jars. Sample product.'),
        P(6, 3, 'Brass Cabinet Handle Set (6 pcs)', 449, 599, 40, 'handles', 'Antique brass handles with screws, fits most cabinets. Sample product.'),
        P(7, 3, 'Heavy Duty Door Hinges (pack of 4)', 299, null, 50, 'hinge', 'Strong steel hinges with mounting screws. Sample product.'),
        P(8, 4, 'Multipurpose Storage Box', 299, 399, 60, 'box', 'Stackable box with a lid for clothes, toys or tools. Sample product.'),
        P(9, 4, 'Foldable Laundry Basket', 499, null, 3, 'basket', 'Light, foldable basket with carry handles. Sample product.')
      ],
      users: [{ id: 1, username: '@admin', name: 'Administrator', email: '', phone: '', role: 'admin', salt: salt, hash: U.hashPw(salt, '12345'), created: new Date().toISOString() }],
      orders: [], reviews: [], messages: []
    };
  }

  function valid(d) {
    return d && d.v === 1 && d.settings && d.seq && Array.isArray(d.categories) && Array.isArray(d.products) &&
      Array.isArray(d.users) && Array.isArray(d.orders) && Array.isArray(d.reviews) && Array.isArray(d.messages);
  }
  S.data = function () {
    if (memData) { return memData; }
    var raw = lsGet(KEY);
    if (raw) { try { var d = JSON.parse(raw); if (valid(d)) { memData = d; } } catch (e) { /* reseed below */ } }
    if (!memData) { memData = seed(); S.save(); }
    return memData;
  };
  S.save = function () { return lsSet(KEY, JSON.stringify(memData)); };
  S.nextId = function (kind) { var d = S.data(); var n = d.seq[kind] || 1; d.seq[kind] = n + 1; return n; };
  S.reset = function () {
    lsDel(KEY); lsDel(CART_KEY); memData = null; memCart = null;
    ssDel(SES_KEY); ssDel(CO_KEY); ssDel(LAST_KEY);
  };

  /* ---------- lookups ---------- */
  S.product = function (id) { id = Number(id); var a = S.data().products; for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return a[i]; } } return null; };
  S.category = function (id) { id = Number(id); var a = S.data().categories; for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return a[i]; } } return null; };
  S.categories = function () { return S.data().categories.slice().sort(function (a, b) { return a.sort - b.sort; }); };
  S.setting = function (k, def) { var v = S.data().settings[k]; return (v === undefined || v === null || v === '') ? (def || '') : String(v); };
  S.userById = function (id) { id = Number(id); var a = S.data().users; for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return a[i]; } } return null; };
  S.userByName = function (name) {
    name = String(name).toLowerCase(); var a = S.data().users;
    for (var i = 0; i < a.length; i++) { if (a[i].username.toLowerCase() === name) { return a[i]; } }
    return null;
  };

  /* ---------- login session (cleared when the tab is closed) ---------- */
  S.currentUser = function () {
    var id = Number(ssGet(SES_KEY));
    return id ? S.userById(id) : null;
  };
  S.isAdmin = function () { var u = S.currentUser(); return !!u && u.role === 'admin'; };
  S.login = function (username, pw) {
    var u = S.userByName(username.trim());
    if (!u || U.hashPw(u.salt, pw) !== u.hash) { return null; }
    ssSet(SES_KEY, String(u.id));
    return u;
  };
  S.logout = function () { ssDel(SES_KEY); };
  S.register = function (f) {
    var d = S.data(), salt = U.salt();
    var u = { id: S.nextId('user'), username: f.username, name: f.name, email: f.email || '', phone: f.phone, role: 'customer', salt: salt, hash: U.hashPw(salt, f.password), created: new Date().toISOString() };
    d.users.push(u); S.save(); ssSet(SES_KEY, String(u.id));
    return u;
  };

  /* ---------- cart ---------- */
  function cartObj() {
    if (memCart) { return memCart; }
    memCart = {};
    var raw = lsGet(CART_KEY);
    if (raw) { try { var c = JSON.parse(raw); if (c && typeof c === 'object') { memCart = c; } } catch (e) { memCart = {}; } }
    return memCart;
  }
  function cartSave() { lsSet(CART_KEY, JSON.stringify(cartObj())); }
  S.cartQty = function (pid) { return Number(cartObj()[pid] || 0); };
  S.cartCount = function () { var c = cartObj(), n = 0; for (var k in c) { if (Object.prototype.hasOwnProperty.call(c, k)) { n += Number(c[k]) || 0; } } return n; };
  S.cartSet = function (pid, qty) {
    var c = cartObj(); qty = Math.max(0, Math.min(CART_MAX, parseInt(qty, 10) || 0));
    if (qty === 0) { delete c[pid]; } else { c[pid] = qty; }
    cartSave();
  };
  S.cartClear = function () { memCart = {}; cartSave(); };
  S.cartMax = CART_MAX;
  /* Prices always come from the product list, never from the cart itself. */
  S.cartSummary = function () {
    var c = cartObj(), lines = [], problems = [], subtotal = 0;
    Object.keys(c).forEach(function (k) {
      var pid = Number(k), p = S.product(pid), qty = Number(c[k]) || 0;
      if (!p || !p.active) { delete c[k]; problems.push('An item in your cart is no longer available and was removed.'); return; }
      if (p.stock <= 0) { delete c[k]; problems.push('"' + p.name + '" is out of stock and was removed from your cart.'); return; }
      if (qty > p.stock) { qty = p.stock; c[k] = qty; problems.push('Only ' + p.stock + ' of "' + p.name + '" available - quantity adjusted.'); }
      var price = Math.round(Number(p.price) * 100) / 100, line = Math.round(price * qty * 100) / 100;
      subtotal += line;
      lines.push({ id: pid, name: p.name, price: price, mrp: p.mrp, qty: qty, line: line, stock: p.stock, image: (p.images || [])[0] });
    });
    if (problems.length) { cartSave(); }
    subtotal = Math.round(subtotal * 100) / 100;
    var shipping = 0;
    if (lines.length) {
      var flat = Number(S.setting('shipping_charge', '0')) || 0, free = Number(S.setting('free_shipping_above', '0')) || 0;
      shipping = (free > 0 && subtotal >= free) ? 0 : flat;
    }
    return { lines: lines, subtotal: subtotal, shipping: shipping, total: Math.round((subtotal + shipping) * 100) / 100, problems: problems };
  };

  /* ---------- checkout state ---------- */
  S.checkout = function () { try { return JSON.parse(ssGet(CO_KEY) || 'null'); } catch (e) { return null; } };
  S.setCheckout = function (o) { ssSet(CO_KEY, JSON.stringify(o)); };
  S.clearCheckout = function () { ssDel(CO_KEY); };
  S.lastOrderId = function () { return Number(ssGet(LAST_KEY)) || 0; };

  S.placeOrder = function (co, method, ref) {
    var sum = S.cartSummary();
    if (!sum.lines.length) { return { ok: false, error: 'Your cart is empty.' }; }
    var d = S.data(), i;
    for (i = 0; i < sum.lines.length; i++) {
      var p = S.product(sum.lines[i].id);
      if (!p || p.stock < sum.lines[i].qty) { return { ok: false, error: 'Sorry, "' + sum.lines[i].name + '" just went out of stock. Please review your cart.' }; }
    }
    var now = new Date(), yy = String(now.getFullYear()).slice(2), mm = ('0' + (now.getMonth() + 1)).slice(-2), dd = ('0' + now.getDate()).slice(-2);
    var rnd = ''; for (i = 0; i < 5; i++) { rnd += '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 34)); }
    var u = S.currentUser();
    var order = {
      id: S.nextId('order'), no: 'BHS' + yy + mm + dd + rnd, userId: u ? u.id : null,
      name: co.name, phone: co.phone, email: co.email || '', address: co.address, landmark: co.landmark || '',
      city: co.city, state: co.state, pincode: co.pincode, notes: co.notes || '', lat: co.lat || '', lng: co.lng || '',
      items: sum.lines.map(function (l) { return { productId: l.id, name: l.name, price: l.price, qty: l.qty, total: l.line }; }),
      subtotal: sum.subtotal, shipping: sum.shipping, total: sum.total,
      method: method, payStatus: 'pending', payRef: ref || '', status: 'new', created: now.toISOString()
    };
    sum.lines.forEach(function (l) { S.product(l.id).stock -= l.qty; });
    d.orders.push(order);
    if (!S.save()) {
      d.orders.pop(); sum.lines.forEach(function (l) { S.product(l.id).stock += l.qty; });
      return { ok: false, error: 'Your browser storage is full, so the order could not be saved.' };
    }
    S.cartClear(); S.clearCheckout(); ssSet(LAST_KEY, String(order.id));
    return { ok: true, order: order };
  };
  S.orderById = function (id) { id = Number(id); var a = S.data().orders; for (var i = 0; i < a.length; i++) { if (a[i].id === id) { return a[i]; } } return null; };

  /* ---------- labels ---------- */
  U.statusLabel = function (s) { return { 'new': 'New', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }[s] || s; };
  U.payLabel = function (m) { return { cod: 'Cash on Delivery', upi: 'UPI', card: 'Credit / Debit Card', netbanking: 'Net Banking' }[m] || m; };
})(window);
