/* Batlee Housing Solution - admin panel (front-end only).
 * NOTE: with no server, the admin login only protects the screen inside this one browser.
 * Real protection for a live shop needs the PHP + MySQL version in /public_html.
 */
(function (w) {
  'use strict';
  var BHS = w.BHS, U = BHS.U, S = BHS.S, esc = U.esc, money = U.money;
  var views = {};
  BHS.forms = BHS.forms || {};
  BHS.actions = BHS.actions || {};
  var pending = [];            /* new product photos not saved yet (data URLs) */

  function d() { return S.data(); }
  function st(k, def) { return S.setting(k, def); }
  function badge(cls, text) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }
  function saveOrWarn() {
    if (S.save()) { return true; }
    BHS.flash('Your browser storage is full. Remove some products or use fewer/smaller photos.', 'err');
    return false;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- frame ---------- */
  function frame(title, active, inner) {
    var data = d();
    var newOrders = data.orders.filter(function (o) { return o.status === 'new'; }).length;
    var pendRev = data.reviews.filter(function (r) { return r.status === 'pending'; }).length;
    var unread = data.messages.filter(function (m) { return !m.read; }).length;
    var nav = [
      ['dashboard', 'Dashboard', '#/admin', 0], ['orders', 'Orders', '#/admin/orders', newOrders], ['products', 'Products', '#/admin/products', 0],
      ['categories', 'Categories', '#/admin/categories', 0], ['sales', 'Sales records', '#/admin/sales', 0], ['reviews', 'Reviews', '#/admin/reviews', pendRev],
      ['messages', 'Helpline messages', '#/admin/messages', unread], ['settings', 'Site & contact settings', '#/admin/settings', 0], ['account', 'My login & password', '#/admin/account', 0]
    ];
    return '<div class="admin-bar"><button class="icon-btn nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="admin-nav" data-act="nav-toggle"><span></span><span></span><span></span></button>' +
      '<a class="brand" href="#/admin"><img src="img/logo.jpg" alt="" width="40" height="38"><span class="brand-text"><strong>Admin Panel</strong><small>' + esc(st('site_name')) + '</small></span></a><span class="spacer"></span>' +
      '<a class="hlink" href="#/">View site</a><button class="hlink linklike" type="button" data-act="logout">Logout</button></div>' +
      '<div class="admin-shell"><nav class="admin-nav" id="admin-nav" aria-label="Admin">' +
      nav.map(function (n) { return '<a href="' + n[2] + '" class="' + (n[0] === active ? 'active' : '') + '">' + esc(n[1]) + (n[3] ? '<span class="nav-count">' + n[3] + '</span>' : '') + '</a>'; }).join('') +
      '</nav><main class="admin-main"><h1>' + esc(title) + '</h1>' + BHS.takeFlash() +
      '<div class="warn-bar">Front-end preview: everything here is saved only in this browser, so the admin panel works only on the device where orders were placed. A live shop needs the PHP + MySQL version.</div>' +
      inner + '</main></div>';
  }
  function table(head, rows, empty) {
    return '<div class="table-wrap"><table class="table"><thead><tr>' + head.map(function (h) { return '<th' + (h.num ? ' class="num"' : '') + '>' + esc(h.t || h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '" class="muted">' + esc(empty) + '</td></tr>') + '</tbody></table></div>';
  }
  function statusBadge(s) { return badge('st-' + s, U.statusLabel(s)); }
  function payBadge(s) { return badge('pay-' + s, cap(s)); }

  /* ---------- dashboard ---------- */
  views.dashboard = function () {
    var data = d(), u = S.currentUser(), todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    var live = data.orders.filter(function (o) { return o.status !== 'cancelled'; });
    var stats = [
      ['Orders today', data.orders.filter(function (o) { return new Date(o.created) >= todayStart; }).length],
      ['New orders', data.orders.filter(function (o) { return o.status === 'new'; }).length],
      ['Total sales', money(live.reduce(function (s, o) { return s + o.total; }, 0))],
      ['Products', data.products.length],
      ['Reviews to check', data.reviews.filter(function (r) { return r.status === 'pending'; }).length],
      ['Unread messages', data.messages.filter(function (m) { return !m.read; }).length]
    ];
    var low = data.products.filter(function (p) { return p.active && p.stock <= 5; }).sort(function (a, b) { return a.stock - b.stock; }).slice(0, 8);
    var recent = data.orders.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 8);
    var defaultPw = U.hashPw(u.salt, '12345') === u.hash;
    return { title: 'Dashboard', html: frame('Dashboard', 'dashboard',
      (defaultPw ? '<div class="warn-bar"><strong>Please change your password.</strong> You are still using the starting password. <a href="#/admin/account">Change it now &rarr;</a></div>' : '') +
      '<div class="stat-grid">' + stats.map(function (s) { return '<div class="stat"><small>' + esc(s[0]) + '</small><strong>' + esc(s[1]) + '</strong></div>'; }).join('') + '</div>' +
      '<h2>Recent orders</h2>' + table(['Order', 'Customer', 'Date', { t: 'Total', num: 1 }, 'Status', 'Payment'], recent.map(function (o) {
        return '<tr><td><a href="#/admin/order/' + o.id + '">' + esc(o.no) + '</a></td><td>' + esc(o.name) + '</td><td>' + esc(U.dateTime(o.created)) + '</td><td class="num">' + money(o.total) + '</td><td>' + statusBadge(o.status) + '</td><td>' + payBadge(o.payStatus) + '</td></tr>';
      }), 'No orders yet.') +
      (low.length ? '<h2 style="margin-top:24px">Low stock</h2>' + table(['Product', { t: 'In stock', num: 1 }], low.map(function (p) { return '<tr><td><a href="#/admin/product/' + p.id + '">' + esc(p.name) + '</a></td><td class="num">' + p.stock + '</td></tr>'; }), '') : '')) };
  };

  /* ---------- orders ---------- */
  var STATUSES = ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'], PAYS = ['pending', 'paid', 'failed', 'refunded'];
  views.orders = function (ctx) {
    var status = STATUSES.indexOf(ctx.q.status) >= 0 ? ctx.q.status : '', term = (ctx.q.q || '').trim().toLowerCase();
    var list = d().orders.filter(function (o) {
      return (!status || o.status === status) && (!term || (o.no + ' ' + o.name + ' ' + o.phone).toLowerCase().indexOf(term) >= 0);
    }).sort(function (a, b) { return b.id - a.id; });
    return { title: 'Orders', html: frame('Orders', 'orders',
      '<form class="toolbar" data-form="orders-filter"><label>Status <select name="status"><option value="">All</option>' + STATUSES.map(function (s) { return '<option value="' + s + '"' + (status === s ? ' selected' : '') + '>' + esc(U.statusLabel(s)) + '</option>'; }).join('') + '</select></label>' +
      '<label>Search <input type="search" name="q" value="' + esc(ctx.q.q || '') + '" placeholder="Order no, name or phone"></label><button class="btn btn-dark" type="submit">Filter</button></form>' +
      table(['Order', 'Customer', 'Date', { t: 'Total', num: 1 }, 'Payment', 'Status'], list.map(function (o) {
        return '<tr><td><a href="#/admin/order/' + o.id + '">' + esc(o.no) + '</a></td><td>' + esc(o.name) + '<br><small class="muted">' + esc(o.phone) + ' &middot; ' + esc(o.city) + '</small></td><td>' + esc(U.dateTime(o.created)) + '</td><td class="num">' + money(o.total) + '</td><td>' + esc(U.payLabel(o.method)) + '<br>' + payBadge(o.payStatus) + '</td><td>' + statusBadge(o.status) + '</td></tr>';
      }), 'No orders found.')) };
  };
  views.order = function (ctx) {
    var o = S.orderById(ctx.parts[2]);
    if (!o) { BHS.flash('Order not found.', 'err'); BHS.go('#/admin/orders'); return null; }
    var map = o.lat !== '' && o.lng !== '' && isFinite(Number(o.lat)) && isFinite(Number(o.lng)) ? '<a href="https://www.google.com/maps?q=' + encodeURIComponent(o.lat) + ',' + encodeURIComponent(o.lng) + '" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>' : 'Not shared';
    function kv(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'; }
    return { title: 'Order ' + o.no, html: frame('Order ' + o.no, 'orders',
      '<p><a href="#/admin/orders">&larr; All orders</a></p><div class="detail-grid"><section class="form-card"><h2>Customer &amp; delivery</h2><dl class="kv">' +
      kv('Name', esc(o.name)) + kv('Phone', '<a href="tel:' + esc(U.digits(o.phone)) + '">' + esc(o.phone) + '</a>') + kv('Email', esc(o.email || '-')) + kv('Address', U.nl2br(o.address)) +
      kv('Landmark', esc(o.landmark || '-')) + kv('City / State', esc(o.city) + ', ' + esc(o.state)) + kv('PIN code', esc(o.pincode)) + kv('Notes', esc(o.notes || '-')) + kv('GPS location', map) + kv('Placed', esc(U.dateTime(o.created))) +
      '</dl></section><section class="form-card"><h2>Payment &amp; status</h2><dl class="kv">' + kv('Method', esc(U.payLabel(o.method))) + kv('Reference', esc(o.payRef || '-')) +
      kv('Subtotal', money(o.subtotal)) + kv('Delivery', money(o.shipping)) + kv('Total', '<strong>' + money(o.total) + '</strong>') + '</dl>' +
      '<form data-form="order-status" data-id="' + o.id + '" style="margin-top:14px"><label>Order status <select name="status">' + STATUSES.map(function (s) { return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + esc(U.statusLabel(s)) + '</option>'; }).join('') + '</select></label>' +
      '<label>Payment status <select name="pay">' + PAYS.map(function (s) { return '<option value="' + s + '"' + (o.payStatus === s ? ' selected' : '') + '>' + esc(cap(s)) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn btn-gold" type="submit">Update order</button></form></section></div>' +
      '<h2>Items</h2>' + table(['Product', { t: 'Price', num: 1 }, { t: 'Qty', num: 1 }, { t: 'Line total', num: 1 }], o.items.map(function (it) {
        return '<tr><td>' + esc(it.name) + '</td><td class="num">' + money(it.price) + '</td><td class="num">' + it.qty + '</td><td class="num">' + money(it.total) + '</td></tr>';
      }), '')) };
  };
  BHS.forms['order-status'] = function (f) {
    var o = S.orderById(f.dataset.id), ns = f.elements.status.value, np = f.elements.pay.value;
    if (!o || STATUSES.indexOf(ns) < 0 || PAYS.indexOf(np) < 0) { return; }
    function restock(sign) {
      o.items.forEach(function (it) { var p = S.product(it.productId); if (p) { p.stock = Math.max(0, p.stock + sign * it.qty); } });
    }
    if (ns === 'cancelled' && o.status !== 'cancelled') { restock(1); }
    else if (o.status === 'cancelled' && ns !== 'cancelled') { restock(-1); }
    o.status = ns; o.payStatus = np;
    if (saveOrWarn()) { BHS.flash('Order updated.'); }
    BHS.rerender();
  };
  BHS.forms['orders-filter'] = function (f) {
    var p = []; if (f.elements.status.value) { p.push('status=' + encodeURIComponent(f.elements.status.value)); }
    if (f.elements.q.value.trim()) { p.push('q=' + encodeURIComponent(f.elements.q.value.trim())); }
    BHS.go('#/admin/orders' + (p.length ? '?' + p.join('&') : ''));
  };

  /* ---------- products ---------- */
  views.products = function (ctx) {
    var term = (ctx.q.q || '').trim().toLowerCase();
    var list = d().products.filter(function (p) { return !term || p.name.toLowerCase().indexOf(term) >= 0; }).sort(function (a, b) { return b.id - a.id; });
    return { title: 'Products', html: frame('Products', 'products',
      '<div class="toolbar"><a class="btn btn-gold" href="#/admin/product/new">+ Add product</a><form class="toolbar" data-form="product-search"><label class="sr-only" for="pq">Search</label><input id="pq" type="search" name="q" value="' + esc(ctx.q.q || '') + '" placeholder="Search products"><button class="btn btn-ghost" type="submit">Search</button></form></div>' +
      table(['', 'Product', 'Category', { t: 'Price', num: 1 }, { t: 'Stock', num: 1 }, 'Status', ''], list.map(function (p) {
        var src = U.safeImg((p.images || [])[0]), cat = S.category(p.cat);
        return '<tr><td>' + (src ? '<img class="thumb-sm" src="' + esc(src) + '" alt="" width="46" height="46">' : '<span class="thumb-sm ph">' + esc(p.name.charAt(0).toUpperCase()) + '</span>') + '</td>' +
          '<td><a href="#/admin/product/' + p.id + '">' + esc(p.name) + '</a></td><td>' + esc(cat ? cat.name : '-') + '</td><td class="num">' + money(p.price) + '</td><td class="num">' + p.stock + '</td>' +
          '<td>' + badge(p.active ? 'st-delivered' : 'st-cancelled', p.active ? 'Visible' : 'Hidden') + '</td>' +
          '<td><div class="inline-actions"><a class="btn btn-ghost btn-sm" href="#/admin/product/' + p.id + '">Edit</a>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="prod-toggle" data-id="' + p.id + '">' + (p.active ? 'Hide' : 'Show') + '</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-act="prod-delete" data-id="' + p.id + '" data-confirm="Delete this product permanently?">Delete</button></div></td></tr>';
      }), 'No products yet.')) };
  };
  BHS.forms['product-search'] = function (f) { var q = f.elements.q.value.trim(); BHS.go('#/admin/products' + (q ? '?q=' + encodeURIComponent(q) : '')); };
  BHS.actions['prod-toggle'] = function (el) { var p = S.product(el.dataset.id); if (p) { p.active = !p.active; if (saveOrWarn()) { BHS.flash('Visibility updated.'); } BHS.rerender(); } };
  BHS.actions['prod-delete'] = function (el) {
    var id = Number(el.dataset.id), data = d();
    var used = data.orders.some(function (o) { return o.items.some(function (it) { return it.productId === id; }); });
    if (used) { var p = S.product(id); if (p) { p.active = false; } BHS.flash('This product is in past orders, so it was hidden from the shop instead of deleted.'); }
    else { data.products = data.products.filter(function (p) { return p.id !== id; }); data.reviews = data.reviews.filter(function (r) { return r.productId !== id; }); BHS.flash('Product deleted.'); }
    saveOrWarn(); BHS.rerender();
  };

  views.product = function (ctx) {
    var isNew = ctx.parts[2] === 'new', id = Number(ctx.parts[2]), p = isNew ? null : S.product(id);
    if (!isNew && !p) { BHS.flash('Product not found.', 'err'); BHS.go('#/admin/products'); return null; }
    var state = BHS.formState('product');
    if (!state) { pending = []; }
    var cats = S.categories(), f = state ? state.vals : (p ? { name: p.name, cat: p.cat, desc: p.desc || '', price: p.price, mrp: p.mrp === null || p.mrp === undefined ? '' : p.mrp, stock: p.stock, active: p.active } : { name: '', cat: cats[0] ? cats[0].id : '', desc: '', price: '', mrp: '', stock: 10, active: true });
    var errs = state ? state.errs.list || [] : [];
    var existing = p ? (p.images || []) : [];
    var title = isNew ? 'Add product' : 'Edit product';
    return { title: title, html: frame(title, 'products', errs.map(function (m) { return '<div class="alert alert-err" role="alert">' + esc(m) + '</div>'; }).join('') +
      '<form class="form-card" style="max-width:760px" data-form="product" data-id="' + (isNew ? 0 : id) + '" novalidate>' +
      '<label>Product name * <input type="text" name="name" value="' + esc(f.name) + '" required maxlength="200"></label><div class="form-grid">' +
      '<label>Category * <select name="cat" required>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (Number(f.cat) === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>Stock quantity * <input type="number" name="stock" value="' + esc(f.stock) + '" min="0" step="1" required inputmode="numeric"></label>' +
      '<label>Selling price (₹) * <input type="number" name="price" value="' + esc(f.price) + '" min="0" step="0.01" required inputmode="decimal"></label>' +
      '<label>MRP / old price (₹) - optional <input type="number" name="mrp" value="' + esc(f.mrp) + '" min="0" step="0.01" inputmode="decimal"></label></div>' +
      '<label>Description <textarea name="desc" rows="5" maxlength="5000">' + esc(f.desc) + '</textarea></label>' +
      (existing.length ? '<p><strong>Current photos</strong> <span class="muted small">(tick to remove; the first photo is the main one)</span></p><div class="img-edit">' +
        existing.map(function (s, i) { var u = U.safeImg(s); return '<figure>' + (u ? '<img src="' + esc(u) + '" alt="" width="90" height="90">' : '') + '<label class="checkline"><input type="checkbox" name="remove_img" value="' + i + '"> Remove</label></figure>'; }).join('') + '</div>' : '') +
      '<label>Add photos (JPG, PNG or WEBP, up to 8 MB each)<input type="file" id="img-input" accept="image/jpeg,image/png,image/webp" multiple data-change="product-images"></label>' +
      '<div class="img-edit" id="pending-imgs">' + pendingHtml() + '</div>' +
      '<label class="checkline"><input type="checkbox" name="active" value="1"' + (f.active ? ' checked' : '') + '> Visible in the shop</label>' +
      '<div class="inline-actions" style="margin-top:14px"><button class="btn btn-gold" type="submit">Save product</button><a class="btn btn-ghost" href="#/admin/products">Cancel</a></div></form>') };
  };
  function pendingHtml() {
    return pending.map(function (s, i) { return '<figure><img src="' + esc(s) + '" alt="" width="90" height="90"><button class="linklike danger" type="button" data-act="pending-remove" data-i="' + i + '">Remove</button></figure>'; }).join('');
  }
  function refreshPending() { var el = document.getElementById('pending-imgs'); if (el) { el.innerHTML = pendingHtml(); } }
  BHS.actions['pending-remove'] = function (el) { pending.splice(Number(el.dataset.i), 1); refreshPending(); };
  /* Read a photo, shrink it and keep it as a small JPEG so browser storage is not used up. */
  BHS.addImages = function (files) {
    Array.prototype.forEach.call(files, function (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { BHS.toast('Only JPG, PNG or WEBP images are allowed.', true); return; }
      if (file.size > 8 * 1024 * 1024) { BHS.toast('That image is larger than 8 MB.', true); return; }
      var fr = new FileReader();
      fr.onerror = function () { BHS.toast('Could not read that image.', true); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { BHS.toast('Could not read that image.', true); };
        im.onload = function () {
          var sc = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height);
          pending.push(c.toDataURL('image/jpeg', 0.82)); refreshPending();
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };
  BHS.forms.product = function (f) {
    var id = Number(f.dataset.id), p = id ? S.product(id) : null, errs = [];
    var v = { name: f.elements.name.value.trim().slice(0, 200), cat: f.elements.cat.value, desc: f.elements.desc.value.trim().slice(0, 5000), price: f.elements.price.value.trim(), mrp: f.elements.mrp.value.trim(), stock: f.elements.stock.value.trim(), active: f.elements.active.checked };
    if (!v.name) { errs.push('Product name is required.'); }
    if (!S.category(v.cat)) { errs.push('Please choose a category.'); }
    if (v.price === '' || !isFinite(Number(v.price)) || Number(v.price) < 0 || Number(v.price) > 9999999) { errs.push('Enter a valid selling price.'); }
    if (v.mrp !== '' && (!isFinite(Number(v.mrp)) || Number(v.mrp) < 0 || Number(v.mrp) > 9999999)) { errs.push('Enter a valid MRP or leave it empty.'); }
    if (!/^[0-9]{1,7}$/.test(v.stock)) { errs.push('Stock must be a whole number.'); }
    if (errs.length) { BHS.setFormState('product', v, { list: errs }); BHS.rerender(); return; }
    var removed = {}; Array.prototype.forEach.call(f.querySelectorAll('input[name="remove_img"]:checked'), function (c) { removed[c.value] = true; });
    var kept = p ? (p.images || []).filter(function (s, i) { return !removed[i]; }) : [];
    var rec = p || { id: S.nextId('product') };
    rec.name = v.name; rec.cat = Number(v.cat); rec.desc = v.desc; rec.price = Math.round(Number(v.price) * 100) / 100;
    rec.mrp = v.mrp === '' ? null : Math.round(Number(v.mrp) * 100) / 100; rec.stock = parseInt(v.stock, 10); rec.active = v.active;
    rec.images = kept.concat(pending);
    if (!p) { d().products.push(rec); }
    if (!S.save()) {
      if (!p) { d().products.pop(); }
      BHS.setFormState('product', v, { list: ['Your browser storage is full. Remove some products or use fewer/smaller photos.'] }); BHS.rerender(); return;
    }
    pending = []; BHS.flash('Product saved.'); BHS.go('#/admin/products');
  };

  /* ---------- categories ---------- */
  views.categories = function () {
    var cats = S.categories();
    return { title: 'Categories', html: frame('Categories', 'categories',
      '<form class="form-card toolbar" style="max-width:520px" data-form="cat-add"><label style="flex:1;min-width:200px">New category <input type="text" name="name" required maxlength="100" style="width:100%"></label><button class="btn btn-gold" type="submit">Add</button></form>' +
      table(['Name', { t: 'Products', num: 1 }, ''], cats.map(function (c) {
        var n = d().products.filter(function (p) { return p.cat === c.id; }).length;
        return '<tr><td><form class="inline-actions" data-form="cat-rename" data-id="' + c.id + '"><input type="text" name="name" value="' + esc(c.name) + '" maxlength="100" style="margin:0;min-width:180px" aria-label="Category name"><button class="btn btn-ghost btn-sm" type="submit">Rename</button></form></td><td class="num">' + n +
          '</td><td><button class="btn btn-danger btn-sm" type="button" data-act="cat-delete" data-id="' + c.id + '" data-confirm="Delete this category?">Delete</button></td></tr>';
      }), 'No categories.')) };
  };
  function uniqueSlug(name, ownId) {
    var base = U.slug(name), slug = base, n = 2;
    while (d().categories.some(function (c) { return c.slug === slug && c.id !== ownId; })) { slug = base + '-' + (n++); }
    return slug;
  }
  BHS.forms['cat-add'] = function (f) {
    var name = f.elements.name.value.trim().slice(0, 100);
    if (!name) { BHS.flash('Please enter a category name.', 'err'); BHS.rerender(); return; }
    var max = d().categories.reduce(function (m, c) { return Math.max(m, c.sort); }, 0);
    d().categories.push({ id: S.nextId('category'), name: name, slug: uniqueSlug(name, 0), sort: max + 1 });
    if (saveOrWarn()) { BHS.flash('Category added.'); } BHS.rerender();
  };
  BHS.forms['cat-rename'] = function (f) {
    var c = S.category(f.dataset.id), name = f.elements.name.value.trim().slice(0, 100);
    if (!c || !name) { BHS.flash('Please enter a category name.', 'err'); BHS.rerender(); return; }
    c.name = name; c.slug = uniqueSlug(name, c.id);
    if (saveOrWarn()) { BHS.flash('Category renamed.'); } BHS.rerender();
  };
  BHS.actions['cat-delete'] = function (el) {
    var id = Number(el.dataset.id);
    if (d().products.some(function (p) { return p.cat === id; })) { BHS.flash('This category still has products. Move or delete them first.', 'err'); }
    else { d().categories = d().categories.filter(function (c) { return c.id !== id; }); saveOrWarn(); BHS.flash('Category deleted.'); }
    BHS.rerender();
  };

  /* ---------- sales ---------- */
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s + 'T00:00:00')); }
  function salesRange(ctx) {
    var to = validDate(ctx.q.to) ? ctx.q.to : U.ymd(), fromDef = new Date(); fromDef.setDate(fromDef.getDate() - 29);
    var from = validDate(ctx.q.from) ? ctx.q.from : U.ymd(fromDef);
    if (from > to) { var t = from; from = to; to = t; }
    var rows = d().orders.filter(function (o) { var day = U.ymd(new Date(o.created)); return o.status !== 'cancelled' && day >= from && day <= to; }).sort(function (a, b) { return b.id - a.id; });
    return { from: from, to: to, rows: rows };
  }
  views.sales = function (ctx) {
    var r = salesRange(ctx), rows = r.rows, revenue = 0, paid = 0, pend = 0, daily = {}, top = {};
    rows.forEach(function (o) {
      revenue += o.total; if (o.payStatus === 'paid') { paid += o.total; } else { pend += o.total; }
      var day = U.ymd(new Date(o.created)); daily[day] = daily[day] || { n: 0, t: 0 }; daily[day].n++; daily[day].t += o.total;
      o.items.forEach(function (it) { top[it.name] = top[it.name] || { q: 0, a: 0 }; top[it.name].q += it.qty; top[it.name].a += it.total; });
    });
    var days = Object.keys(daily).sort().reverse(), tops = Object.keys(top).sort(function (a, b) { return top[b].a - top[a].a; }).slice(0, 10);
    return { title: 'Sales records', html: frame('Sales records', 'sales',
      '<form class="toolbar" data-form="sales-filter"><label>From <input type="date" name="from" value="' + esc(r.from) + '"></label><label>To <input type="date" name="to" value="' + esc(r.to) + '"></label><button class="btn btn-dark" type="submit">Show</button>' +
      '<button class="btn btn-ghost" type="button" data-act="sales-csv" data-from="' + esc(r.from) + '" data-to="' + esc(r.to) + '">Download CSV</button></form>' +
      '<div class="stat-grid"><div class="stat"><small>Orders</small><strong>' + rows.length + '</strong></div><div class="stat"><small>Total sales</small><strong>' + money(revenue) + '</strong></div><div class="stat"><small>Paid</small><strong>' + money(paid) + '</strong></div><div class="stat"><small>Payment pending</small><strong>' + money(pend) + '</strong></div></div>' +
      '<div class="detail-grid"><section><h2>Day by day</h2>' + table(['Date', { t: 'Orders', num: 1 }, { t: 'Sales', num: 1 }], days.map(function (k) { return '<tr><td>' + esc(U.date(k + 'T00:00:00')) + '</td><td class="num">' + daily[k].n + '</td><td class="num">' + money(daily[k].t) + '</td></tr>'; }), 'No sales in this period.') + '</section>' +
      '<section><h2>Top products</h2>' + table(['Product', { t: 'Qty', num: 1 }, { t: 'Sales', num: 1 }], tops.map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="num">' + top[k].q + '</td><td class="num">' + money(top[k].a) + '</td></tr>'; }), 'Nothing sold yet.') + '</section></div>' +
      '<h2 style="margin-top:24px">All sales in this period</h2>' + table(['Order', 'Date', 'Customer', { t: 'Total', num: 1 }, 'Payment'], rows.map(function (o) { return '<tr><td>' + esc(o.no) + '</td><td>' + esc(U.date(o.created)) + '</td><td>' + esc(o.name) + '</td><td class="num">' + money(o.total) + '</td><td>' + payBadge(o.payStatus) + '</td></tr>'; }), 'No sales in this period.')) };
  };
  BHS.forms['sales-filter'] = function (f) { BHS.go('#/admin/sales?from=' + encodeURIComponent(f.elements.from.value) + '&to=' + encodeURIComponent(f.elements.to.value)); };
  BHS.actions['sales-csv'] = function (el) {
    var r = salesRange({ q: { from: el.dataset.from, to: el.dataset.to } });
    function cell(v) { v = String(v === null || v === undefined ? '' : v); if (/^[=+\-@\t\r]/.test(v)) { v = "'" + v; } return '"' + v.replace(/"/g, '""') + '"'; }
    var lines = [['Order', 'Date', 'Customer', 'Phone', 'City', 'Total', 'Payment method', 'Payment status', 'Order status'].map(cell).join(',')];
    r.rows.forEach(function (o) { lines.push([o.no, o.created, o.name, o.phone, o.city, o.total, U.payLabel(o.method), o.payStatus, o.status].map(cell).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sales-' + r.from + '-to-' + r.to + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  };

  /* ---------- reviews & messages ---------- */
  views.reviews = function () {
    var list = d().reviews.slice().sort(function (a, b) { return (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.id - a.id; });
    return { title: 'Reviews', html: frame('Reviews', 'reviews', table(['Product', 'Customer', 'Rating', 'Review', 'Status', ''], list.map(function (r) {
      var p = S.product(r.productId);
      return '<tr><td>' + esc(p ? p.name : '(deleted)') + '</td><td>' + esc(r.name) + '<br><small class="muted">' + esc(U.date(r.created)) + '</small></td><td><span class="stars">' + U.stars(r.rating) + '</span></td><td>' + (r.comment ? U.nl2br(r.comment) : '<span class="muted">(no comment)</span>') + '</td>' +
        '<td>' + badge('st-' + r.status, r.status === 'approved' ? 'Visible' : 'Waiting') + '</td><td><div class="inline-actions">' +
        (r.status === 'pending' ? '<button class="btn btn-gold btn-sm" type="button" data-act="rev-approve" data-id="' + r.id + '">Approve</button>' : '<button class="btn btn-ghost btn-sm" type="button" data-act="rev-hide" data-id="' + r.id + '">Hide</button>') +
        '<button class="btn btn-danger btn-sm" type="button" data-act="rev-delete" data-id="' + r.id + '" data-confirm="Delete this review?">Delete</button></div></td></tr>';
    }), 'No reviews yet.')) };
  };
  function review(id) { id = Number(id); return d().reviews.filter(function (r) { return r.id === id; })[0]; }
  BHS.actions['rev-approve'] = function (el) { var r = review(el.dataset.id); if (r) { r.status = 'approved'; saveOrWarn(); BHS.flash('Review approved and now visible on the product page.'); } BHS.rerender(); };
  BHS.actions['rev-hide'] = function (el) { var r = review(el.dataset.id); if (r) { r.status = 'pending'; saveOrWarn(); BHS.flash('Review hidden from the shop.'); } BHS.rerender(); };
  BHS.actions['rev-delete'] = function (el) { var id = Number(el.dataset.id); d().reviews = d().reviews.filter(function (r) { return r.id !== id; }); saveOrWarn(); BHS.flash('Review deleted.'); BHS.rerender(); };

  views.messages = function () {
    var list = d().messages.slice().sort(function (a, b) { return b.id - a.id; });
    return { title: 'Helpline messages', html: frame('Helpline messages', 'messages',
      '<div class="toolbar"><button class="btn btn-ghost" type="button" data-act="msg-allread">Mark all as read</button></div>' +
      table(['From', 'Message', 'Received', ''], list.map(function (m) {
        return '<tr class="' + (m.read ? '' : 'unread') + '"><td>' + esc(m.name) + '<br><a href="tel:' + esc(U.digits(m.phone)) + '">' + esc(m.phone) + '</a></td><td>' + U.nl2br(m.message) + '</td><td>' + esc(U.dateTime(m.created)) + '</td>' +
          '<td><div class="inline-actions"><button class="btn btn-ghost btn-sm" type="button" data-act="msg-toggle" data-id="' + m.id + '">' + (m.read ? 'Mark unread' : 'Mark read') + '</button>' +
          '<button class="btn btn-danger btn-sm" type="button" data-act="msg-delete" data-id="' + m.id + '" data-confirm="Delete this message?">Delete</button></div></td></tr>';
      }), 'No messages yet.')) };
  };
  function msg(id) { id = Number(id); return d().messages.filter(function (m) { return m.id === id; })[0]; }
  BHS.actions['msg-toggle'] = function (el) { var m = msg(el.dataset.id); if (m) { m.read = !m.read; saveOrWarn(); } BHS.rerender(); };
  BHS.actions['msg-delete'] = function (el) { var id = Number(el.dataset.id); d().messages = d().messages.filter(function (m) { return m.id !== id; }); saveOrWarn(); BHS.flash('Message deleted.'); BHS.rerender(); };
  BHS.actions['msg-allread'] = function () { d().messages.forEach(function (m) { m.read = true; }); saveOrWarn(); BHS.flash('All messages marked as read.'); BHS.rerender(); };

  /* ---------- settings ---------- */
  var FIELDS = [
    ['Shop', [['site_name', 'Shop name', 'text', 80, ''], ['tagline', 'Tagline (footer)', 'text', 200, ''], ['hero_title', 'Home page headline', 'text', 100, ''], ['hero_text', 'Home page intro text', 'textarea', 300, '']]],
    ['Contact details & helpline', [['phone', 'Helpline phone number', 'text', 25, 'Shown in the footer and the Helpline box.'], ['whatsapp', 'WhatsApp number (with country code)', 'text', 20, 'Example: 919876543210. Leave empty to hide the WhatsApp link.'],
      ['email', 'Contact email', 'text', 120, ''], ['address', 'Shop address', 'textarea', 300, ''], ['hours', 'Working hours', 'text', 120, ''], ['helpline_note', 'Message shown at the top of the Helpline box', 'textarea', 300, '']]],
    ['Delivery', [['shipping_charge', 'Delivery charge (₹)', 'number', 10, 'Use 0 for free delivery on every order.'], ['free_shipping_above', 'Free delivery above (₹)', 'number', 10, 'Use 0 to switch this off.']]],
    ['Payment options', [['upi_id', 'Your UPI ID (shown to customers who pick UPI)', 'text', 60, '']]]
  ];
  var TOGGLES = [['pay_cod', 'Cash on Delivery'], ['pay_upi', 'UPI'], ['pay_card', 'Credit / Debit Card'], ['pay_netbanking', 'Net Banking']];
  views.settings = function () {
    var html = '<form class="form-card" style="max-width:720px" data-form="settings">';
    FIELDS.forEach(function (g) {
      html += '<h2>' + esc(g[0]) + '</h2>';
      g[1].forEach(function (f) {
        html += '<label>' + esc(f[1]) + (f[2] === 'textarea' ? '<textarea name="' + f[0] + '" rows="2" maxlength="' + f[3] + '">' + esc(st(f[0])) + '</textarea>'
          : '<input type="' + (f[2] === 'number' ? 'number' : 'text') + '" name="' + f[0] + '" value="' + esc(st(f[0])) + '" maxlength="' + f[3] + '"' + (f[2] === 'number' ? ' min="0" step="0.01"' : '') + '>') + (f[4] ? '<span class="muted small">' + esc(f[4]) + '</span>' : '') + '</label>';
      });
      if (g[0] === 'Payment options') {
        html += '<p><strong>Show these options on the payment page</strong></p>' + TOGGLES.map(function (t) { return '<label class="checkline"><input type="checkbox" name="' + t[0] + '" value="1"' + (st(t[0], '1') === '1' ? ' checked' : '') + '> ' + esc(t[1]) + '</label>'; }).join('');
      }
      html += '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">';
    });
    html += '<button class="btn btn-gold" type="submit">Save settings</button></form>' +
      '<div class="form-card" style="max-width:720px"><h2>Reset demo data</h2><p class="muted">Deletes all products, orders, accounts and settings saved in this browser and restores the starting sample shop.</p>' +
      '<button class="btn btn-danger" type="button" data-act="reset-data" data-confirm="Reset everything in this browser to the starting sample shop?">Reset demo data</button></div>';
    return { title: 'Site & contact settings', html: frame('Site & contact settings', 'settings', html) };
  };
  BHS.forms.settings = function (f) {
    var errs = [], upd = {};
    FIELDS.forEach(function (g) {
      g[1].forEach(function (fl) {
        var key = fl[0], val = f.elements[key].value.trim().slice(0, fl[3]);
        if (fl[2] === 'number') { if (val === '') { val = '0'; } if (!isFinite(Number(val)) || Number(val) < 0) { errs.push(fl[1] + ' must be a number (0 or more).'); return; } }
        if (key === 'email' && val && !U.validEmail(val)) { errs.push('Please enter a valid contact email.'); return; }
        if (key === 'whatsapp') { val = val.replace(/[^0-9]/g, ''); }
        if (key === 'site_name' && !val) { errs.push('Shop name cannot be empty.'); return; }
        upd[key] = val;
      });
    });
    if (errs.length) { errs.forEach(function (m) { BHS.flash(m, 'err'); }); BHS.rerender(); return; }
    Object.keys(upd).forEach(function (k) { d().settings[k] = upd[k]; });
    TOGGLES.forEach(function (t) { d().settings[t[0]] = f.elements[t[0]].checked ? '1' : '0'; });
    if (saveOrWarn()) { BHS.flash('Settings saved.'); }
    BHS.rerender();
  };
  BHS.actions['reset-data'] = function () { S.reset(); BHS.flash('Demo data was reset.'); BHS.go('#/'); BHS.rerender(); };

  /* ---------- my login ---------- */
  views.account = function () {
    var u = S.currentUser();
    return { title: 'My login & password', html: frame('My login & password', 'account',
      '<form class="form-card" style="max-width:480px" data-form="admin-account"><p class="muted">Change the admin username and/or password. Leave the new password empty to keep the current one.</p>' +
      '<label>Username <input type="text" name="username" value="' + esc(u.username) + '" required maxlength="40" autocomplete="username" autocapitalize="none"></label>' +
      '<label>New password (min 8 characters) <input type="password" name="next" minlength="8" maxlength="200" autocomplete="new-password"></label>' +
      '<label>Confirm new password <input type="password" name="next2" minlength="8" maxlength="200" autocomplete="new-password"></label>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><label>Current password (required to save) <input type="password" name="current" required maxlength="200" autocomplete="current-password"></label>' +
      '<button class="btn btn-gold" type="submit">Save changes</button></form>') };
  };
  BHS.forms['admin-account'] = function (f) {
    var u = S.currentUser(), name = f.elements.username.value.trim(), nw = f.elements.next.value, nw2 = f.elements.next2.value, err = null;
    if (U.hashPw(u.salt, f.elements.current.value) !== u.hash) { err = 'Your current password is incorrect.'; }
    else if (!/^[A-Za-z0-9_.@-]{3,40}$/.test(name)) { err = 'Username must be 3-40 characters: letters, numbers and _ . @ - only.'; }
    else if (d().users.some(function (x) { return x.id !== u.id && x.username.toLowerCase() === name.toLowerCase(); })) { err = 'That username is already used by someone else.'; }
    else if (nw !== '' && nw.length < 8) { err = 'Password must be at least 8 characters.'; }
    else if (nw !== nw2) { err = 'The two new passwords do not match.'; }
    if (err) { BHS.flash(err, 'err'); BHS.rerender(); return; }
    u.username = name; if (nw !== '') { u.salt = U.salt(); u.hash = U.hashPw(u.salt, nw); }
    if (saveOrWarn()) { BHS.flash('Your login details were updated.'); }
    BHS.rerender();
  };

  BHS.admin = { views: views };
})(window);
