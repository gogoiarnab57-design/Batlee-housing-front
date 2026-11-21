/* Batlee Housing Solution - customer pages (front-end only). */
(function (w) {
  'use strict';
  var BHS = w.BHS, U = BHS.U, S = BHS.S, esc = U.esc, money = U.money;
  var views = {};

  function st(k, def) { return S.setting(k, def); }
  function img(p) { return U.safeImg((p.images || [])[0]); }
  function initial(name) { return esc(String(name || '?').charAt(0).toUpperCase()); }
  function err(errs, k) { return errs && errs[k] ? '<span class="field-err">' + esc(errs[k]) + '</span>' : ''; }
  function reviewsFor(pid) { return S.data().reviews.filter(function (r) { return r.productId === pid && r.status === 'approved'; }); }

  /* ---------- page frame ---------- */
  function layout(inner, ctx) {
    var u = S.currentUser(), count = S.cartCount(), name = st('site_name', 'Batlee Housing Solution');
    var cats = S.categories();
    var userHtml;
    if (u) {
      userHtml = (u.role === 'admin' ? '<a class="hlink" href="#/admin">Admin Panel</a>' : '<a class="hlink" href="#/account">Hi, ' + esc(u.name.split(' ')[0]) + '</a>') +
        '<button class="hlink linklike" type="button" data-act="logout">Logout</button>';
    } else {
      userHtml = '<a class="hlink" href="#/login">Login</a><a class="hlink hlink-strong" href="#/register">Sign up</a>';
    }
    var navCats = cats.map(function (c) { return '<a href="#/shop?cat=' + esc(c.slug) + '">' + esc(c.name) + '</a>'; }).join('');
    var footCats = cats.map(function (c) { return '<li><a href="#/shop?cat=' + esc(c.slug) + '">' + esc(c.name) + '</a></li>'; }).join('');
    var phone = st('phone'), email = st('email'), addr = st('address'), hours = st('hours'), wa = st('whatsapp').replace(/[^0-9]/g, '');
    var searchVal = ctx && ctx.parts[0] === 'shop' ? (ctx.q.q || '') : '';

    return '' +
      '<header class="site-header"><div class="wrap header-row">' +
        '<button class="icon-btn nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="main-nav" data-act="nav-toggle"><span></span><span></span><span></span></button>' +
        '<a class="brand" href="#/"><img src="img/logo.jpg" alt="BGA logo" width="52" height="49"><span class="brand-text"><strong>' + esc(name) + '</strong><small>Batlee Group of Associates</small></span></a>' +
        '<form class="search" data-form="search" role="search"><input type="search" name="q" placeholder="Search products..." value="' + esc(searchVal) + '" aria-label="Search products" maxlength="80"><button type="submit" aria-label="Search">Search</button></form>' +
        '<div class="header-actions">' + userHtml +
          '<a class="cart-link" href="#/cart" aria-label="Cart, ' + count + ' items"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 2v2h2l3.6 7.6-1.4 2.4A2 2 0 0 0 9 17h11v-2H9.4l1.1-2h7.4a2 2 0 0 0 1.7-1l3.6-6.5A1 1 0 0 0 22.3 4H6.2l-.9-2H3Z"/></svg><span class="cart-badge" id="cart-badge"' + (count ? '' : ' hidden') + '>' + count + '</span></a>' +
        '</div></div>' +
        '<nav id="main-nav" class="main-nav" aria-label="Categories"><div class="wrap nav-row"><a href="#/">Home</a><a href="#/shop">All Products</a>' + navCats + '</div></nav>' +
      '</header>' +
      '<main class="wrap main">' + BHS.takeFlash() + inner + '</main>' +
      '<footer class="site-footer"><div class="wrap footer-grid">' +
        '<div><div class="foot-brand"><img src="img/logo.jpg" alt="" width="44" height="42"><strong>' + esc(name) + '</strong></div><p class="muted-light">' + esc(st('tagline')) + '</p></div>' +
        '<div><h3>Shop</h3><ul class="plain">' + footCats + '</ul></div>' +
        '<div><h3>Contact us</h3><ul class="plain">' +
          (phone ? '<li>Phone: <a href="tel:' + esc(U.digits(phone)) + '">' + esc(phone) + '</a></li>' : '') +
          (email ? '<li>Email: <a href="mailto:' + esc(email) + '">' + esc(email) + '</a></li>' : '') +
          (addr ? '<li>' + U.nl2br(addr) + '</li>' : '') + (hours ? '<li>' + esc(hours) + '</li>' : '') +
        '</ul></div></div>' +
        '<div class="footer-bottom"><div class="wrap">&copy; ' + new Date().getFullYear() + ' ' + esc(name) + ' &middot; A Batlee Group of Associates company &middot; Front-end preview: orders and accounts are stored only in your own browser.</div></div>' +
      '</footer>' +
      '<div class="helpline" id="helpline"><button class="helpline-fab" id="helpline-open" type="button" aria-expanded="false" aria-controls="helpline-panel" data-act="helpline-toggle"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 1-2Z"/></svg><span>Helpline</span></button>' +
        '<section class="helpline-panel" id="helpline-panel" hidden aria-label="Helpline chat"><header><strong>How can we help?</strong><button type="button" class="icon-btn" aria-label="Close helpline" data-act="helpline-toggle">&times;</button></header>' +
        '<div class="helpline-body"><p class="muted">' + esc(st('helpline_note')) + '</p><ul class="plain helpline-contacts">' +
          (phone ? '<li>📞 <a href="tel:' + esc(U.digits(phone)) + '">' + esc(phone) + '</a></li>' : '') +
          (wa ? '<li>💬 <a href="https://wa.me/' + esc(wa) + '" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></li>' : '') +
          (email ? '<li>✉️ <a href="mailto:' + esc(email) + '">' + esc(email) + '</a></li>' : '') +
          (hours ? '<li>🕘 ' + esc(hours) + '</li>' : '') +
        '</ul><form data-form="helpline" autocomplete="off">' +
          '<label>Your name <input type="text" name="name" required maxlength="100"></label>' +
          '<label>Phone number <input type="tel" name="phone" required maxlength="20" inputmode="tel"></label>' +
          '<label>Message <textarea name="message" rows="3" required maxlength="1000"></textarea></label>' +
          '<button class="btn btn-gold btn-block" type="submit">Send message</button><p class="helpline-status" id="helpline-status" role="status"></p></form></div></section></div>';
  }

  /* ---------- product card ---------- */
  function card(p) {
    var src = img(p), mrp = p.mrp && Number(p.mrp) > Number(p.price) ? Number(p.mrp) : 0;
    var off = mrp ? Math.round((1 - p.price / mrp) * 100) : 0, out = p.stock <= 0, href = '#/product/' + p.id;
    var cat = S.category(p.cat);
    return '<article class="card"><a class="card-img" href="' + href + '">' +
      (src ? '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy" width="400" height="400">' : '<span class="img-ph" aria-hidden="true">' + initial(p.name) + '</span>') +
      (off > 0 && !out ? '<span class="tag tag-off">' + off + '% off</span>' : '') + (out ? '<span class="tag tag-out">Out of stock</span>' : '') + '</a>' +
      '<div class="card-body">' + (cat ? '<div class="card-cat">' + esc(cat.name) + '</div>' : '') +
      '<h3 class="card-title"><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
      '<div class="price-row"><span class="price">' + money(p.price) + '</span>' + (mrp ? '<span class="mrp">' + money(mrp) + '</span>' : '') + '</div>' +
      (out ? '<a class="btn btn-ghost btn-block" href="' + href + '">View details</a>' : '<button class="btn btn-dark btn-block" type="button" data-act="add" data-id="' + p.id + '">Add to cart</button>') +
      '</div></article>';
  }
  function activeProducts() { return S.data().products.filter(function (p) { return p.active; }); }

  /* ---------- home ---------- */
  views.home = function () {
    var cats = S.categories(), all = activeProducts();
    var tiles = cats.map(function (c) {
      var n = all.filter(function (p) { return p.cat === c.id; }).length;
      return '<a class="cat-tile" href="#/shop?cat=' + esc(c.slug) + '"><span class="cat-name">' + esc(c.name) + '</span><span class="cat-count">' + n + ' product' + (n === 1 ? '' : 's') + '</span></a>';
    }).join('');
    var latest = all.slice().sort(function (a, b) { return b.id - a.id; }).slice(0, 8);
    return { title: st('site_name'), html:
      '<section class="hero"><div class="hero-text"><p class="eyebrow">Batlee Housing Solution</p><h1>' + esc(st('hero_title', 'Everything your home needs')) + '</h1><p>' + esc(st('hero_text')) + '</p>' +
      '<div class="hero-cta"><a class="btn btn-gold" href="#/shop">Shop now</a>' + (S.currentUser() ? '' : '<a class="btn btn-outline-light" href="#/register">Create account</a>') + '</div></div>' +
      '<img class="hero-logo" src="img/logo.jpg" alt="Batlee Group of Associates logo" width="288" height="272"></section>' +
      '<section class="section"><h2 class="section-title">Shop by category</h2><div class="cat-grid">' + tiles + '</div></section>' +
      '<section class="section"><div class="section-head"><h2 class="section-title">New arrivals</h2><a href="#/shop">View all &rarr;</a></div>' +
      (latest.length ? '<div class="grid">' + latest.map(card).join('') + '</div>' : '<p class="muted">Products will appear here soon.</p>') + '</section>' +
      '<section class="section perks"><div><strong>Easy ordering</strong><span>Add to cart, enter your delivery details and place your order.</span></div>' +
      '<div><strong>Private details</strong><span>Your delivery details are visible only to the store admin.</span></div>' +
      '<div><strong>Helpline support</strong><span>Use the Helpline button to reach us any time.</span></div>' +
      '<div><strong>Four home categories</strong><span>Bathroom, kitchen, hardware and utilities together.</span></div></section>' };
  };

  /* ---------- shop list ---------- */
  function shopLink(ctx, over) {
    var q = { cat: ctx.q.cat || '', q: ctx.q.q || '', sort: ctx.q.sort || '', page: '' }, k;
    for (k in over) { if (Object.prototype.hasOwnProperty.call(over, k)) { q[k] = over[k]; } }
    var parts = [];
    for (k in q) { if (q[k] !== '' && q[k] !== null && q[k] !== undefined) { parts.push(k + '=' + encodeURIComponent(q[k])); } }
    return '#/shop' + (parts.length ? '?' + parts.join('&') : '');
  }
  views.shop = function (ctx) {
    var slug = ctx.q.cat || '', term = (ctx.q.q || '').trim().slice(0, 80), sort = ctx.q.sort || 'new';
    var page = Math.max(1, parseInt(ctx.q.page || '1', 10) || 1), per = 12;
    var cat = slug ? (S.categories().filter(function (c) { return c.slug === slug; })[0] || null) : null;
    var low = term.toLowerCase();
    var items = activeProducts().filter(function (p) {
      return (!cat || p.cat === cat.id) && (!low || (p.name + ' ' + (p.desc || '')).toLowerCase().indexOf(low) >= 0);
    });
    items.sort({
      low: function (a, b) { return a.price - b.price; }, high: function (a, b) { return b.price - a.price; },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    }[sort] || function (a, b) { return b.id - a.id; });
    var total = items.length, pages = Math.max(1, Math.ceil(total / per)); page = Math.min(page, pages);
    var slice = items.slice((page - 1) * per, page * per);
    var heading = cat ? cat.name : (term ? 'Search results' : 'All products');
    function opt(v, l) { return '<option value="' + v + '"' + (sort === v ? ' selected' : '') + '>' + l + '</option>'; }
    return { title: heading, html:
      '<div class="section-head"><div><h1 class="page-title">' + esc(heading) + '</h1><p class="muted">' + total + ' product' + (total === 1 ? '' : 's') + (term ? ' for &ldquo;' + esc(term) + '&rdquo;' : '') + '</p></div>' +
      '<div class="sort-form"><label>Sort by <select data-change="sort"' + (cat ? ' data-cat="' + esc(cat.slug) + '"' : '') + (term ? ' data-term="' + esc(term) + '"' : '') + '>' +
      opt('new', 'Newest') + opt('low', 'Price: low to high') + opt('high', 'Price: high to low') + opt('name', 'Name A-Z') + '</select></label></div></div>' +
      (slice.length ? '<div class="grid">' + slice.map(card).join('') + '</div>' +
        (pages > 1 ? '<nav class="pager" aria-label="Pages">' + (page > 1 ? '<a href="' + esc(shopLink(ctx, { page: page - 1 })) + '">&larr; Prev</a>' : '') + '<span>Page ' + page + ' of ' + pages + '</span>' + (page < pages ? '<a href="' + esc(shopLink(ctx, { page: page + 1 })) + '">Next &rarr;</a>' : '') + '</nav>' : '')
        : '<div class="empty"><p>No products found.</p><a class="btn btn-dark" href="#/shop">Browse all products</a></div>') };
  };

  /* ---------- product page ---------- */
  views.product = function (ctx) {
    var p = S.product(ctx.parts[1]);
    if (!p || !p.active) { return { title: 'Product not found', html: '<div class="empty"><h1>Product not found</h1><a class="btn btn-dark" href="#/shop">Back to shop</a></div>' }; }
    var cat = S.category(p.cat), imgs = (p.images || []).map(U.safeImg).filter(Boolean);
    var revs = reviewsFor(p.id).slice().sort(function (a, b) { return b.id - a.id; });
    var avg = revs.length ? revs.reduce(function (s, r) { return s + r.rating; }, 0) / revs.length : 0;
    var mrp = p.mrp && Number(p.mrp) > Number(p.price) ? Number(p.mrp) : 0, off = mrp ? Math.round((1 - p.price / mrp) * 100) : 0;
    var related = activeProducts().filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).sort(function (a, b) { return b.id - a.id; }).slice(0, 4);
    var u = S.currentUser(), mine = u && S.data().reviews.some(function (r) { return r.productId === p.id && r.userId === u.id; });

    var gallery = '<div class="gallery"><div class="gallery-main">' + (imgs.length ? '<img id="main-img" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '" width="600" height="600">' : '<span class="img-ph big" aria-hidden="true">' + initial(p.name) + '</span>') + '</div>' +
      (imgs.length > 1 ? '<div class="thumbs">' + imgs.map(function (s, i) { return '<button type="button" class="thumb' + (i === 0 ? ' active' : '') + '" data-act="thumb" data-src="' + esc(s) + '" aria-label="Photo ' + (i + 1) + '"><img src="' + esc(s) + '" alt="" width="80" height="80" loading="lazy"></button>'; }).join('') + '</div>' : '') + '</div>';

    var buy = p.stock > 0 ?
      '<form class="buy-form" data-form="buy" data-id="' + p.id + '"><label class="qty">Qty <input type="number" name="qty" value="1" min="1" max="' + Math.min(p.stock, S.cartMax) + '" inputmode="numeric"></label>' +
      '<button class="btn btn-dark" type="submit" name="mode" value="add">Add to cart</button><button class="btn btn-gold" type="submit" name="mode" value="buy">Buy now</button></form>' : '';

    var reviewForm = '';
    if (u && u.role !== 'admin') {
      reviewForm = mine ? '<p class="muted">You have already reviewed this product.</p>' :
        '<form class="form-card review-form" data-form="review" data-id="' + p.id + '"><h3>Write a review</h3><label>Rating <select name="rating" required><option value="">Choose...</option>' +
        [5, 4, 3, 2, 1].map(function (i) { return '<option value="' + i + '">' + i + ' - ' + U.stars(i) + '</option>'; }).join('') + '</select></label>' +
        '<label>Your review <textarea name="comment" rows="3" maxlength="1000"></textarea></label><button class="btn btn-dark" type="submit">Submit review</button></form>';
    } else if (!u) {
      reviewForm = '<p><a href="#/login">Log in</a> to write a review.</p>';
    }

    return { title: p.name, html:
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> / ' + (cat ? '<a href="#/shop?cat=' + esc(cat.slug) + '">' + esc(cat.name) + '</a> / ' : '') + '<span>' + esc(p.name) + '</span></nav>' +
      '<section class="product">' + gallery + '<div class="product-info"><h1>' + esc(p.name) + '</h1>' +
      (revs.length ? '<p class="rating"><span class="stars" aria-hidden="true">' + U.stars(avg) + '</span> ' + avg.toFixed(1) + ' (' + revs.length + ' review' + (revs.length === 1 ? '' : 's') + ')</p>' : '') +
      '<div class="price-row big"><span class="price">' + money(p.price) + '</span>' + (mrp ? '<span class="mrp">' + money(mrp) + '</span><span class="tag tag-off inline">' + off + '% off</span>' : '') + '</div>' +
      '<p class="stock ' + (p.stock > 0 ? 'in' : 'out') + '">' + (p.stock <= 0 ? 'Out of stock' : (p.stock <= 5 ? 'Only ' + p.stock + ' left' : 'In stock')) + '</p>' + buy +
      '<div class="desc"><h2>Description</h2><p>' + U.nl2br(p.desc || '') + '</p></div></div></section>' +
      '<section class="section" id="reviews"><h2 class="section-title">Customer reviews</h2>' +
      (revs.length ? revs.map(function (r) {
        return '<div class="review"><div><span class="stars" aria-hidden="true">' + U.stars(r.rating) + '</span> <strong>' + esc(r.name) + '</strong> <small class="muted">' + esc(U.date(r.created)) + '</small></div>' + (r.comment ? '<p>' + U.nl2br(r.comment) + '</p>' : '') + '</div>';
      }).join('') : '<p class="muted">No reviews yet.</p>') + reviewForm + '</section>' +
      (related.length ? '<section class="section"><h2 class="section-title">You may also like</h2><div class="grid">' + related.map(card).join('') + '</div></section>' : '') };
  };

  /* ---------- cart ---------- */
  function summaryBlock(cart) {
    return '<dl><dt>Subtotal</dt><dd>' + money(cart.subtotal) + '</dd><dt>Delivery</dt><dd>' + (cart.shipping > 0 ? money(cart.shipping) : 'Free') + '</dd><dt class="total">Total</dt><dd class="total">' + money(cart.total) + '</dd></dl>';
  }
  views.cart = function () {
    var cart = S.cartSummary();
    cart.problems.forEach(function (m) { BHS.flash(m, 'err'); });
    if (!cart.lines.length) { return { title: 'Your cart', html: '<h1 class="page-title">Your cart</h1><div class="empty"><p>Your cart is empty.</p><a class="btn btn-dark" href="#/shop">Continue shopping</a></div>' }; }
    var free = Number(st('free_shipping_above', '0')) || 0;
    return { title: 'Your cart', html: '<h1 class="page-title">Your cart</h1><div class="cart-layout"><div class="cart-lines">' +
      cart.lines.map(function (l) {
        var src = U.safeImg(l.image);
        return '<div class="cart-line"><a class="cart-thumb" href="#/product/' + l.id + '">' + (src ? '<img src="' + esc(src) + '" alt="" width="90" height="90">' : '<span class="img-ph" aria-hidden="true">' + initial(l.name) + '</span>') + '</a>' +
          '<div class="cart-info"><a class="cart-name" href="#/product/' + l.id + '">' + esc(l.name) + '</a><div class="muted">' + money(l.price) + ' each</div>' +
          '<div class="cart-controls"><div class="qty-form"><label class="sr-only" for="q' + l.id + '">Quantity</label><input id="q' + l.id + '" type="number" value="' + l.qty + '" min="0" max="' + Math.min(l.stock, S.cartMax) + '" inputmode="numeric">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-act="cart-update" data-id="' + l.id + '">Update</button></div>' +
          '<button class="linklike danger" type="button" data-act="cart-remove" data-id="' + l.id + '">Remove</button></div></div>' +
          '<div class="cart-line-total">' + money(l.line) + '</div></div>';
      }).join('') + '</div><aside class="summary"><h2>Order summary</h2>' + summaryBlock(cart) +
      (free > 0 && cart.subtotal < free ? '<p class="muted small">Add ' + money(free - cart.subtotal) + ' more for free delivery.</p>' : '') +
      '<a class="btn btn-gold btn-block" href="#/checkout">Proceed to checkout</a><a class="btn btn-ghost btn-block" href="#/shop">Continue shopping</a></aside></div>' };
  };

  /* ---------- checkout ---------- */
  views.checkout = function (ctx) {
    var cart = S.cartSummary();
    if (!cart.lines.length) { BHS.go('#/cart'); return null; }
    var u = S.currentUser(), saved = S.checkout() || {}, state = BHS.formState('checkout');
    var f = state ? state.vals : {
      name: saved.name || (u ? u.name : ''), phone: saved.phone || (u ? u.phone : ''), email: saved.email || (u ? u.email : ''),
      address: saved.address || '', landmark: saved.landmark || '', city: saved.city || '', state: saved.state || '', pincode: saved.pincode || '',
      notes: saved.notes || '', lat: saved.lat || '', lng: saved.lng || ''
    };
    var e = state ? state.errs : {};
    function inp(label, name, extra, cls) { return '<label' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '<input type="text" name="' + name + '" value="' + esc(f[name]) + '" ' + extra + '>' + err(e, name) + '</label>'; }
    return { title: 'Checkout', html: '<h1 class="page-title">Delivery details</h1><div class="cart-layout"><form class="form-card" data-form="checkout" novalidate><div class="form-grid">' +
      inp('Full name *', 'name', 'required maxlength="100" autocomplete="name"') +
      inp('Contact number *', 'phone', 'required maxlength="20" inputmode="tel" autocomplete="tel"') +
      inp('Email (optional)', 'email', 'maxlength="150" autocomplete="email"', 'span2') +
      '<label class="span2">Full address (house no., street, area) *<textarea name="address" rows="3" required maxlength="400" autocomplete="street-address">' + esc(f.address) + '</textarea>' + err(e, 'address') + '</label>' +
      inp('Landmark (optional)', 'landmark', 'maxlength="150"', 'span2') +
      inp('City *', 'city', 'required maxlength="80" autocomplete="address-level2"') + inp('State *', 'state', 'required maxlength="80" autocomplete="address-level1"') +
      inp('PIN code *', 'pincode', 'required maxlength="6" inputmode="numeric" autocomplete="postal-code"') +
      '<label class="span2">Delivery notes (optional)<textarea name="notes" rows="2" maxlength="500" placeholder="Preferred time, gate code, etc.">' + esc(f.notes) + '</textarea></label></div>' +
      '<div class="loc-box"><button class="btn btn-ghost" type="button" data-act="locate">📍 Share my current location (optional)</button><span class="muted small" id="loc-status">' + (f.lat !== '' ? 'Location attached.' : 'Helps our delivery team find you faster. Asked only when you tap the button.') + '</span>' +
      '<input type="hidden" name="lat" value="' + esc(f.lat) + '"><input type="hidden" name="lng" value="' + esc(f.lng) + '"></div>' +
      '<button class="btn btn-gold btn-block" type="submit">Continue to payment</button></form>' +
      '<aside class="summary"><h2>Your order</h2><ul class="plain mini-lines">' + cart.lines.map(function (l) { return '<li><span>' + esc(l.name) + ' &times; ' + l.qty + '</span><span>' + money(l.line) + '</span></li>'; }).join('') + '</ul>' +
      summaryBlock(cart) + '<a class="btn btn-ghost btn-block" href="#/cart">Edit cart</a></aside></div>' };
  };

  /* ---------- payment ---------- */
  views.payment = function () {
    var cart = S.cartSummary(), co = S.checkout();
    cart.problems.forEach(function (m) { BHS.flash(m, 'err'); });
    if (!cart.lines.length) { BHS.go('#/cart'); return null; }
    if (!co) { BHS.go('#/checkout'); return null; }
    var methods = [], desc = {
      cod: 'Pay in cash when your order is delivered.',
      upi: 'Pay by any UPI app' + (st('upi_id') ? ' to <b>' + esc(st('upi_id')) + '</b>' : '') + ', then enter the payment reference below.',
      card: 'Our team will contact you to complete the card payment securely.',
      netbanking: 'Our team will contact you to complete the net banking payment securely.'
    };
    ['cod', 'upi', 'card', 'netbanking'].forEach(function (m) { if (st('pay_' + m, '1') === '1') { methods.push(m); } });
    return { title: 'Payment', html: '<h1 class="page-title">Payment</h1>' +
      '<p class="secure-note">🔒 Your delivery details are private and only the store administrator can view them. We never ask for or store your card number or bank password on this site.</p>' +
      '<div class="cart-layout"><form class="form-card" data-form="payment" autocomplete="off" novalidate><h2>Choose a payment option</h2>' +
      (methods.length ? '<div class="pay-options">' + methods.map(function (m, i) {
        return '<label class="pay-opt"><input type="radio" name="method" value="' + m + '"' + (i === 0 ? ' checked' : '') + ' data-change="paymethod"><span><strong>' + esc(U.payLabel(m)) + '</strong><small>' + desc[m] + '</small></span></label>';
      }).join('') + '</div><label class="upi-ref" id="upi-ref" hidden>UPI transaction reference (optional)<input type="text" name="payment_ref" maxlength="60" placeholder="e.g. 4123 5678 9012"></label>' +
      '<button class="btn btn-gold btn-block" type="submit">Place order - ' + money(cart.total) + '</button>'
        : '<p class="alert alert-err">No payment options are enabled right now. Please call us to place your order.</p>') +
      '<p class="muted small">By placing the order you confirm your delivery details are correct. <a href="#/checkout">Edit details</a></p></form>' +
      '<aside class="summary"><h2>Deliver to</h2><p class="addr"><strong>' + esc(co.name) + '</strong><br>' + U.nl2br(co.address) + '<br>' + esc(co.city) + ', ' + esc(co.state) + ' - ' + esc(co.pincode) + '<br>Phone: ' + esc(co.phone) + '</p>' +
      '<h2>Order total</h2>' + summaryBlock(cart) + '</aside></div>' };
  };

  views.success = function () {
    var o = S.orderById(S.lastOrderId());
    if (!o) { BHS.go('#/'); return null; }
    return { title: 'Order placed', html: '<div class="success"><div class="tick" aria-hidden="true">✓</div><h1>Thank you, ' + esc(o.name.split(' ')[0]) + '!</h1>' +
      '<p>Your order <strong>' + esc(o.no) + '</strong> has been placed.</p><p class="muted">Payment: ' + esc(U.payLabel(o.method)) + ' &middot; Total: <strong>' + money(o.total) + '</strong></p>' +
      '<ul class="plain mini-lines">' + o.items.map(function (it) { return '<li><span>' + esc(it.name) + ' &times; ' + it.qty + '</span><span>' + money(it.total) + '</span></li>'; }).join('') + '</ul>' +
      '<p>We will contact you on <strong>' + esc(o.phone) + '</strong> to confirm delivery.</p>' +
      '<p><a class="btn btn-dark" href="#/shop">Continue shopping</a> ' + (S.currentUser() ? '<a class="btn btn-ghost" href="#/account">My orders</a>' : '') + '</p>' +
      '<p class="muted small">Front-end preview: this order is saved only in this browser. The shop owner sees it by logging in to the admin panel in the same browser.</p></div>' };
  };

  /* ---------- login / register / account ---------- */
  views.login = function (ctx) {
    if (S.currentUser()) { BHS.go(S.isAdmin() ? '#/admin' : '#/account'); return null; }
    var state = BHS.formState('login'), msg = state ? state.errs.form : '';
    return { title: 'Login', html: '<div class="auth-wrap"><form class="form-card auth-card" data-form="login" data-next="' + esc(ctx.q.next || '') + '"><h1>Login</h1><p class="muted">Customers and store admin can log in here.</p>' +
      (msg ? '<div class="alert alert-err" role="alert">' + esc(msg) + '</div>' : '') +
      '<label>Username <input type="text" name="username" value="' + esc(state ? state.vals.username : '') + '" required maxlength="60" autocomplete="username" autocapitalize="none"></label>' +
      '<label>Password <input type="password" name="password" required maxlength="200" autocomplete="current-password"></label>' +
      '<button class="btn btn-gold btn-block" type="submit">Login</button><p class="muted center">New customer? <a href="#/register">Create an account</a></p></form></div>' };
  };
  views.register = function () {
    if (S.currentUser()) { BHS.go('#/account'); return null; }
    var state = BHS.formState('register'), f = state ? state.vals : { name: '', username: '', phone: '', email: '' };
    var errs = state ? state.errs.list || [] : [];
    return { title: 'Create account', html: '<div class="auth-wrap"><form class="form-card auth-card" data-form="register" novalidate><h1>Create account</h1>' +
      errs.map(function (m) { return '<div class="alert alert-err" role="alert">' + esc(m) + '</div>'; }).join('') +
      '<label>Full name <input type="text" name="name" value="' + esc(f.name) + '" required maxlength="100" autocomplete="name"></label>' +
      '<label>Username <input type="text" name="username" value="' + esc(f.username) + '" required maxlength="40" autocomplete="username" autocapitalize="none"></label>' +
      '<label>Phone <input type="tel" name="phone" value="' + esc(f.phone) + '" required maxlength="20" inputmode="tel" autocomplete="tel"></label>' +
      '<label>Email (optional) <input type="email" name="email" value="' + esc(f.email) + '" maxlength="150" autocomplete="email"></label>' +
      '<label>Password (min 8 characters) <input type="password" name="password" required minlength="8" maxlength="200" autocomplete="new-password"></label>' +
      '<label>Confirm password <input type="password" name="password2" required minlength="8" maxlength="200" autocomplete="new-password"></label>' +
      '<button class="btn btn-gold btn-block" type="submit">Sign up</button><p class="muted center">Already registered? <a href="#/login">Login</a></p></form></div>' };
  };
  views.account = function (ctx) {
    var u = S.currentUser();
    if (!u) { BHS.go('#/login?next=account'); return null; }
    if (u.role === 'admin') { BHS.go('#/admin'); return null; }
    var orders = S.data().orders.filter(function (o) { return o.userId === u.id; }).sort(function (a, b) { return b.id - a.id; });
    var view = ctx.q.order ? orders.filter(function (o) { return o.id === Number(ctx.q.order); })[0] : null;
    var left;
    if (view) {
      left = '<div class="form-card"><h3>Order ' + esc(view.no) + '</h3><p class="muted">' + esc(U.dateTime(view.created)) + ' &middot; <span class="badge st-' + esc(view.status) + '">' + esc(U.statusLabel(view.status)) + '</span></p><ul class="plain mini-lines">' +
        view.items.map(function (it) { return '<li><span>' + esc(it.name) + ' &times; ' + it.qty + '</span><span>' + money(it.total) + '</span></li>'; }).join('') +
        '<li><span>Delivery</span><span>' + (view.shipping > 0 ? money(view.shipping) : 'Free') + '</span></li><li class="total"><span>Total</span><span>' + money(view.total) + '</span></li></ul>' +
        '<p class="muted">Payment: ' + esc(U.payLabel(view.method)) + ' (' + esc(view.payStatus.charAt(0).toUpperCase() + view.payStatus.slice(1)) + ')</p>' +
        '<p class="muted">Deliver to: ' + esc(view.address) + ', ' + esc(view.city) + ', ' + esc(view.state) + ' - ' + esc(view.pincode) + '</p><a href="#/account">&larr; All orders</a></div>';
    } else if (orders.length) {
      left = '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
        orders.map(function (o) { return '<tr><td><a href="#/account?order=' + o.id + '">' + esc(o.no) + '</a></td><td>' + esc(U.date(o.created)) + '</td><td>' + money(o.total) + '</td><td><span class="badge st-' + esc(o.status) + '">' + esc(U.statusLabel(o.status)) + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    } else { left = '<p class="muted">You have not placed any orders yet.</p>'; }
    return { title: 'My account', html: '<h1 class="page-title">My account</h1><div class="account-grid"><section><h2>My orders</h2>' + left + '</section><section>' +
      '<form class="form-card" data-form="profile"><h2>My details</h2><label>Name <input type="text" name="name" value="' + esc(u.name) + '" required maxlength="100"></label>' +
      '<label>Phone <input type="tel" name="phone" value="' + esc(u.phone) + '" required maxlength="20"></label><label>Email <input type="email" name="email" value="' + esc(u.email) + '" maxlength="150"></label><button class="btn btn-dark" type="submit">Save</button></form>' +
      '<form class="form-card" data-form="password"><h2>Change password</h2><label>Current password <input type="password" name="current" required autocomplete="current-password"></label>' +
      '<label>New password <input type="password" name="next" required minlength="8" autocomplete="new-password"></label><label>Confirm new password <input type="password" name="next2" required minlength="8" autocomplete="new-password"></label><button class="btn btn-dark" type="submit">Change password</button></form></section></div>' };
  };

  BHS.shop = { layout: layout, views: views };
})(window);
