function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }
function setData(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function getData(k){ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }

if(!getData('products')){
    setData('products', [
        {id:1, title:'Farinha de Amêndoas (500g)', price:32.9, desc:'Farinha natural, sem glúten...', image:'images/produto1.jpg', category:'Farinha', promo:false},
        {id:2, title:'Castanha do Pará (200g)', price:18.5, desc:'Fonte de selênio...', image:'images/produto1.jpg', category:'Oleaginosas', promo:false},
        {id:3, title:'Granola Tradicional (1kg)', price:22.9, desc:'Mistura crocante...', image:'images/produto1.jpg', category:'Cereais', promo:true}
    ]);
}
if(!getData('users')) setData('users', [{name:'teste', email:'teste@gmail.com', password:'123', address:'teste', avatar:'images/team1.jpg'}]);
if(!getData('orders')) setData('orders', []);

function updateAuthLinks(){
    const user = getData('currentUser');
    $all('#authLink,#authLinkTop,#authLinkProd,#authLinkProfile').forEach(el=>{
        if(!el) return;
        if(user){
            el.textContent = user.name.split(' ')[0];
            el.href = 'profile.html';
        } else {
            el.textContent = 'Entrar';
            el.href = 'login.html';
        }
    });
}

function showToast(msg){
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=> t.classList.add('show'), 50);
    setTimeout(()=> {
        t.classList.remove('show');
        setTimeout(()=> t.remove(), 300);
    }, 2000);
}

function renderProductCards(list){
    const container = document.getElementById('productList');
    if(!container) return;
    container.innerHTML = '';
    list.forEach(p => {
        const el = document.createElement('div');
        el.className = 'product-card';
        el.innerHTML = ''
            + `<img src="${p.image}" alt="${p.title}">`
            + `<div class="title">${p.title}</div>`
            + `<div class="price">R$ ${p.price.toFixed(2)}</div>`
            + `<div style="margin-top:8px">`
            + `<button class="btn add-btn" data-id="${p.id}">Adicionar</button>`
            + ` <a href="product.html?id=${p.id}" class="small-muted">Detalhes</a>`
            + `</div>`;
        container.appendChild(el);
    });
    $all('.add-btn').forEach(b => b.addEventListener('click', e => {
        const id = parseInt(e.currentTarget.dataset.id);
        addToCart(id);
        showToast('Adicionado ao carrinho');
    }));
}

function initSearch(){
    const i = document.getElementById('searchInput') || document.getElementById('searchInputTop');
    if(!i) return;
    i.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        const prods = getData('products') || [];
        const filtered = prods.filter(p => {
            return p.title.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term));
        });
        renderProductCards(filtered);
    });
}

function renderProductDetail(){
    const out = document.getElementById('productDetail');
    if(!out) return;
    const params = new URLSearchParams(location.search);
    const id = parseInt(params.get('id') || '0', 10);
    const p = (getData('products') || []).find(x => x.id === id);
    if(!p){
        out.innerHTML = '<p>Produto não encontrado</p>';
        return;
    }
    out.innerHTML = ''
        + `<div class="produto-detalhe-card">`
        +     `<img src="${p.image}" alt="${p.title}" style="width:700px; height:400px; object-fit:cover; border-radius:25px;">`
        +     `<div class="info">`
        +         `<h2>${p.title}</h2>`
        +         `<p>${p.desc}</p>` 
        +         `<h3>R$ ${p.price.toFixed(2)}</h3>`
        +         `<div style="margin-top:12px"><button class="btn" id="addProductBtn">Adicionar ao carrinho</button></div>`
        +     `</div>`
        + `</div>`;
    const addBtn = document.getElementById('addProductBtn');
    if(addBtn) addBtn.addEventListener('click', ()=> { addToCart(p.id); showToast('Adicionado ao carrinho'); });
    renderReviewsSection(p.id);
}

function renderReviewsSection(pid){
    const box = document.getElementById('reviews');
    if(!box) return;
    const all = getData('reviews') || {};
    const list = all[pid] || [];
    let html = `<br></br>
    <h3>Avaliações:</h3>`;
    list.forEach(r => {
        html += `<div style="margin-bottom:8px"><strong>${r.name}</strong> — ${r.rate}/5<p>${r.comment}</p></div>`;
    });
    html += `<h4>Deixe sua avaliação: </h4>`
            + `<form id="reviewForm">`
            + `<input name="name" placeholder="Seu nome" required>`
            + `<h4>Nota: </h4>`
            + `<select name="rate"><option>5 ⭐</option><option>4 ⭐</option><option>3 ⭐</option><option>2 ⭐</option><option>1 ⭐</option></select>`
            + `<textarea name="comment" placeholder="Comentário"></textarea>`
            + `<button class="btn" type="submit">Enviar</button>`
            + `</form>`;
    box.innerHTML = html;
    const rf = document.getElementById('reviewForm');
    if(rf){
        rf.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(rf);
            const obj = { name: fd.get('name'), rate: fd.get('rate'), comment: fd.get('comment') };
            const reviews = getData('reviews') || {};
            reviews[pid] = reviews[pid] || [];
            reviews[pid].push(obj);
            setData('reviews', reviews);
            renderReviewsSection(pid);
            showToast('Avaliação enviada');
        });
    }
}

function getCart(){ return getData('cart') || []; }
function setCart(c){ setData('cart', c); updateCartUI(); }
function addToCart(id){
    const p = (getData('products') || []).find(x => x.id === id);
    if(!p) return;
    const cart = getCart();
    const it = cart.find(i => i.id === id);
    if(it) it.qty += 1;
    else cart.push({ id: p.id, title: p.title, price: p.price, image: p.image, qty: 1 });
    setCart(cart);
}
function removeFromCart(id){ const cart = getCart().filter(i => i.id !== id); setCart(cart); }
function changeQtyInCart(id, qty){
    let cart = getCart();
    const it = cart.find(i => i.id === id);
    if(!it) return;
    it.qty = qty;
    if(it.qty <= 0) cart = cart.filter(i => i.id !== id);
    setCart(cart);
}
function updateCartUI(){
    const cart = getCart();
    const count = cart.reduce((s,i) => s + i.qty, 0) || 0;
    $all('#cartCount,#cartCount2,#cartCount3,#cartCountP').forEach(el => { if(el) el.textContent = count; });
    const container = document.getElementById('cartItems');
    if(container){
        const html = cart.map(item => {
            return ''
                + `<div class="cart-item">`
                + `<div style="display:flex; gap:12px; align-items:center">`
                + `<img src="${item.image}" style="width:92px; height:92px; border-radius:8px; object-fit:cover">`
                + `<div><strong>${item.title}</strong><div class="small-muted">R$ ${item.price.toFixed(2)}</div></div>`
                + `</div>`
                + `<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">`
                + `<div><button onclick="changeQtyInCart(${item.id}, ${item.qty - 1})">-</button>`
                + `<span style="margin:0 8px">${item.qty}</span>`
                + `<button onclick="changeQtyInCart(${item.id}, ${item.qty + 1})">+</button></div>`
                + `<button onclick="removeFromCart(${item.id})" class="btn secondary">Remover</button>`
                + `</div>`
                + `</div>`;
        }).join('');
        container.innerHTML = html || '<p>Seu carrinho está vazio.</p>';
        const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
        const mini = document.getElementById('cartTotal'); if(mini) mini.textContent = total.toFixed(2);
        const miniCount = document.getElementById('miniCount'); if(miniCount) miniCount.textContent = count;
    }
}

function applyCoupon(code){
    const coupons = getData('coupons') || [];
    const c = coupons.find(x => x.code.toUpperCase() === code.toUpperCase());
    return c ? c.discount : null;
}

function initAdmin(){
    const pf = document.getElementById('productForm');
    if(pf){
        pf.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(pf);
            const id = fd.get('id') || Date.now();
            const data = {
                id: Number(id),
                title: fd.get('title'),
                category: fd.get('category'),
                price: parseFloat(fd.get('price') || 0),
                image: fd.get('image') || 'images/produto1.jpg',
                desc: fd.get('description')
            };
            let products = getData('products') || [];
            const existing = products.find(p => p.id == id);
            if(existing) Object.assign(existing, data); else products.unshift(data);
            setData('products', products);
            renderAdminProducts();
            renderProductCards(products);
            pf.reset();
            showToast('Produto salvo');
            // BACKEND: Chamar API aqui para salvar o produto no servidor (Exemplo:)
            // fetch('/api/products', { method: 'POST', body: JSON.stringify(data) })
        });
    }

    const cf = document.getElementById('couponForm');
    if(cf){
        cf.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(cf);
            let coupons = getData('coupons') || [];
            coupons.push({ code: fd.get('code'), discount: parseFloat(fd.get('discount') || 0) });
            setData('coupons', coupons);
            renderAdminProducts();
            cf.reset();
            showToast('Cupom criado');
            // BACKEND: POST /api/coupons
        });
    }

    renderAdminProducts();
}

function renderAdminProducts(){
    const list = document.getElementById('adminProducts');
    if(list){
        const products = getData('products') || [];
        list.innerHTML = products.map(p => {
            return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><strong>${p.title}</strong><div class="small-muted">R$ ${p.price.toFixed(2)}</div></div><div><button class="btn" onclick="editProduct(${p.id})">Editar</button> <button class="btn secondary" onclick="deleteProduct(${p.id})">Remover</button></div></div>`;
        }).join('');
    }

    const couponsBox = document.getElementById('adminCoupons');
    if(couponsBox){
        const cs = getData('coupons') || [];
        couponsBox.innerHTML = cs.map(c => `<div style="display:flex;justify-content:space-between;align-items:center"><div>${c.code} — ${c.discount}%</div><div><button class="btn secondary" onclick="removeCoupon('${c.code}')">Remover</button></div></div>`).join('');
    }

    const ordersBox = document.getElementById('adminOrders');
    if(ordersBox){
        const orders = getData('orders') || [];
        ordersBox.innerHTML = orders.map(o => `<div style="padding:10px; margin-bottom:6px"><strong>Pedido ${o.id}</strong><div class="small-muted">Total: R$ ${o.total.toFixed(2)}</div><div>Status: ${o.status}</div></div>`).join('') || '<p>Sem pedidos</p>';
    }
}

function editProduct(id){
    const p = (getData('products') || []).find(x => x.id == id);
    if(!p) return;
    const pf = document.getElementById('productForm');
    if(!pf) return;
    pf.id.value = p.id;
    pf.title.value = p.title || '';
    pf.category.value = p.category || '';
    pf.price.value = p.price || '';
    pf.image.value = p.image || '';
    pf.description.value = p.desc || '';
    window.scrollTo({ top:0, behavior:'smooth' });
}
function deleteProduct(id){
    let products = (getData('products') || []).filter(p => p.id != id);
    setData('products', products);
    renderAdminProducts();
    renderProductCards(products);
    showToast('Removido');
}
function removeCoupon(code){
    let coupons = (getData('coupons') || []).filter(c => c.code !== code);
    setData('coupons', coupons);
    renderAdminProducts();
    showToast('Cupom removido');
}

function initCheckout() {
    const addr = document.getElementById('addressForm');

    if (addr) {
        addr.addEventListener('submit', (e) => {
            e.preventDefault();

            const paymentBox = document.getElementById('paymentOptions');
            if (paymentBox) {
                paymentBox.style.display = 'block';
            }

            showToast('Endereço salvo (simulado)');
        });
    }

    const btnPix = document.getElementById('payPix');
    const btnCard = document.getElementById('payCard');
    const btnBoleto = document.getElementById('payBoleto');

    if (btnPix) btnPix.addEventListener('click', () => createOrder('paid'));
    if (btnCard) btnCard.addEventListener('click', () => createOrder('pending'));
    if (btnBoleto) btnBoleto.addEventListener('click', () => createOrder('pending'));
}


function createOrder(status){
    const cart = getCart();
    if(!cart.length){ alert('Carrinho vazio'); return; }
    const total = cart.reduce((s,i) => s + i.price * i.qty, 0);
    let orders = getData('orders') || [];
    const id = 'o' + Date.now();
    orders.push({ id, items: cart, total, status, created: new Date().toISOString() });
    setData('orders', orders);
    setData('cart', []);
    updateCartUI();
    renderAdminProducts();
    alert('Pedido criado!');
    // BACKEND: aqui enviaria o pedido ao servidor
    window.location.href = 'index.html';
}

function initAuth(){
    const reg = document.getElementById('registerForm');
    if(reg){
        reg.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(reg);
            const name = fd.get('name'), email = fd.get('email'), pass = fd.get('password'), addr = fd.get('address');
            let users = getData('users') || [];
            if(users.find(u => u.email === email)){ alert('Email já cadastrado'); return; }
            const newUser = { name, email, password: pass, address: addr, avatar: 'images/team1.jpg' };
            users.push(newUser);
            setData('users', users);
            // BACKEND: POST /api/register with newUser
            alert('Conta criada. Faça login.');
            window.location.href = 'login.html';
        });
    }

    const login = document.getElementById('loginForm');
    if(login){
        login.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(login);
            const email = fd.get('email'), pass = fd.get('password');
            const users = getData('users') || [];
            const user = users.find(u => u.email === email && u.password === pass);
            if(user){
                setData('currentUser', user); // BACKEND: POST /api/login -> get token/session
                showToast('Logado como ' + user.name);
                updateAuthLinks();
                window.location.href = 'index.html';
            } else {
                alert('Credenciais inválidas');
            }
        });
    }

    document.getElementById('logoutBtn')?.addEventListener('click', ()=>{
        setData('currentUser', null);
        updateAuthLinks();
        window.location.href = 'index.html';
    });

    document.getElementById('forgotLink')?.addEventListener('click', ()=>{
        const email = prompt('Informe seu email para recuperar (simulado)');
        if(email) alert('E-mail de recuperação enviado (simulado)');
    });

    updateAuthLinks();
}

function renderProfilePage(){
    const container = document.getElementById('profileContent');
    if(!container) return;
    const user = getData('currentUser');
    if(!user){
        container.innerHTML = '<p>Nenhum usuário logado.</p>';
        return;
    }
    container.innerHTML = `<p>Nome de usuário: <strong>${user.name}</strong></p><p>E-mail: <strong>${user.email}</strong></p><p>Endereço: <strong>${user.address || ''}</strong></p><div style="margin-top:12px"><button id="logoutBtn" class="btn">Sair da conta</button></div>`;
    document.getElementById('logoutBtn')?.addEventListener('click', ()=>{
        setData('currentUser', null);
        updateAuthLinks();
        window.location.href = 'index.html';
    });
}

function initContact(){
    const f = document.getElementById('contactForm');
    if(!f) return;
    f.addEventListener('submit', e=>{
        e.preventDefault();
        // BACKEND: POST contact/email to server here
        showToast('Mensagem enviada (simulado)');
        f.reset();
    });
}

document.addEventListener('DOMContentLoaded', function(){
    updateAuthLinks();
    initSearch();
    renderProductCards(getData('products') || []);
    updateCartUI();
    initAdmin();
    initAuth();
    initCheckout();
    renderProductDetail();
    renderProfilePage();
    initContact();

    $all('#year').forEach(function(el){
        el.textContent = (new Date()).getFullYear();
    });

    const applyBtn = document.getElementById('applyCoupon');
    if(applyBtn){
        applyBtn.addEventListener('click', function(){
            const codeEl = document.getElementById('couponInput');
            const code = codeEl ? codeEl.value : '';
            const disc = applyCoupon(code);
            if(disc == null) alert('Cupom inválido');
            else {
                const total = getCart().reduce(function(s,i){ return s + i.price * i.qty; }, 0);
                const newTotal = total * (1 - disc / 100);
                const cartTotalEl = document.getElementById('cartTotal');
                if(cartTotalEl) cartTotalEl.textContent = newTotal.toFixed(2);
                showToast('Cupom aplicado: ' + disc + '%');
            }
        });
    }
});
