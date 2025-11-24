function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }
function setData(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function getData(k){ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }

// Helpers para comunicação com backend leve (Node/Express). Se o servidor não estiver
// disponível, o código faz fallback para armazenamento local (`localStorage`).
async function postReportToServer(report){
    try{
        const res = await fetch('/api/reports', {
            method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(report)
        });
        return res.ok;
    } catch(e){ return false; }
}

async function fetchReportsFromServer(adminEmail){
    try{
        const res = await fetch('/api/reports', { headers: { 'x-admin-email': adminEmail } });
        if(!res.ok) return null;
        return await res.json();
    } catch(e){ return null; }
}

async function deleteReportOnServer(reportId, adminEmail){
    try{
        const res = await fetch('/api/reports/' + encodeURIComponent(reportId), { method: 'DELETE', headers: { 'x-admin-email': adminEmail } });
        return res.ok;
    } catch(e){ return false; }
}

async function putReportsOnServer(reportsArray, adminEmail){
    try{
        const res = await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type':'application/json', 'x-admin-email': adminEmail }, body: JSON.stringify(reportsArray) });
        return res.ok;
    } catch(e){ return false; }
}

async function addAdminOnServer(emailToAdd, adminEmail){
    try{
        const res = await fetch('/api/admins', { method: 'POST', headers: { 'Content-Type':'application/json', 'x-admin-email': adminEmail }, body: JSON.stringify({ email: emailToAdd }) });
        return res.ok;
    } catch(e){ return false; }
}

if(!getData('products')){
    setData('products', [
        {id:1, title:'Farinha de Amêndoas (500g)', price:32.9, desc:'Farinha natural, sem glúten...', image:'images/produto1.jpg', category:'Farinha', promo:false},
        {id:2, title:'Castanha do Pará (200g)', price:18.5, desc:'Fonte de selênio...', image:'images/produto1.jpg', category:'Oleaginosas', promo:false},
        {id:3, title:'Granola Tradicional (1kg)', price:22.9, desc:'Mistura crocante...', image:'images/produto1.jpg', category:'Cereais', promo:true}
    ]);
}
if(!getData('users')) setData('users', [{name:'teste', email:'teste@gmail.com', address:'teste', createdAt: new Date().toISOString()}]);
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
    const user = getData('currentUser');
    const reports = getData('reports') || [];
    list.forEach((r, i) => {
        // check if current user already reported this specific review
        let alreadyReported = false;
        if(user){
            alreadyReported = reports.some(rep => rep.productId === pid && rep.reporter && rep.reporter.email === user.email && rep.review && rep.review.comment === r.comment && rep.review.name === r.name);
        }
        html += `<div style="margin-bottom:8px"><strong>${r.name}</strong> — ${r.rate}/5 ★<p>${r.comment}</p>`;
        if(user){
            if(alreadyReported) html += ` <button class="btn small secondary" disabled>Denunciado!</button>`;
            else html += ` <button class="btn small secondary report-btn" data-pid="${pid}" data-idx="${i}">Denunciar</button>`;
        } else {
            html += ` <span class="small-muted"><a href=\"login.html\">Login</a> para denunciar</span>`;
        }
        html += `</div>`;
    });

    if(!user){
        html += `<h4>Deixe sua avaliação: </h4><p>Faça <a href="login.html">login</a> para comentar.</p>`;
    } else {
        html += `<h4>Deixe sua avaliação: </h4>`
            + `<form id="reviewForm">`
            + `<input name="name" value="${user.name}" readonly hidden>`
            + `<h4>Nota: </h4>`
            + `<div id="starRating" class="star-rating" style="font-size:22px;line-height:1">` 
            + `  <span data-value="1">☆</span><span data-value="2">☆</span><span data-value="3">☆</span><span data-value="4">☆</span><span data-value="5">☆</span>`
            + `</div>`
            + `<input type="hidden" name="rate" value="5">`
            + `<textarea name="comment" placeholder="Comentário"></textarea>`
            + `<button class="btn" type="submit">Enviar</button>`
            + `</form>`;
    }
    box.innerHTML = html;
    const rf = document.getElementById('reviewForm');
    if(rf){
        rf.addEventListener('submit', e=>{
            e.preventDefault();
            const fd = new FormData(rf);
            const obj = { name: fd.get('name'), rate: fd.get('rate'), comment: fd.get('comment'), created: new Date().toISOString() };
            const reviews = getData('reviews') || {};
            reviews[pid] = reviews[pid] || [];
            reviews[pid].push(obj);
            setData('reviews', reviews);
            renderReviewsSection(pid);
            showToast('Avaliação enviada');
        });
    }

    // Inicializa controle de estrelas - transforma ☆ em ★ conforme seleção
    const starBox = document.getElementById('starRating');
    if(starBox){
        const hiddenRate = rf ? rf.querySelector('input[name="rate"]') : null;
        const stars = Array.from(starBox.querySelectorAll('span'));
        function paint(n){
            stars.forEach(s => {
                const val = Number(s.dataset.value);
                s.textContent = val <= n ? '★' : '☆';
            });
            if(hiddenRate) hiddenRate.value = String(n);
        }
        // default 5
        paint(5);
        stars.forEach(s => s.addEventListener('click', e => {
            const v = Number(e.currentTarget.dataset.value);
            paint(v);
        }));
    }

    // Attach report button handlers
    $all('.report-btn').forEach(b => b.addEventListener('click', e => {
        const btn = e.currentTarget;
        const rpid = btn.dataset.pid;
        const ridx = Number(btn.dataset.idx);
        reportReview(Number(rpid), ridx);
    }));
}

function reportReview(pid, idx){
    const user = getData('currentUser');
    if(!user){ showToast('Faça login para denunciar este comentário'); return; }
    const reviews = getData('reviews') || {};
    const list = reviews[pid] || [];
    const rev = list[idx];
    if(!rev) { showToast('Comentário não encontrado'); return; }
    const reports = getData('reports') || [];
    // prevenir denúncias duplicadas do mesmo usuário para o mesmo comentário
    const already = reports.find(rep => rep.productId === pid && rep.reporter && rep.reporter.email === user.email && rep.review && rep.review.comment === rev.comment && rep.review.name === rev.name);
    if(already){ showToast('Você já denunciou este comentário'); return; }
    const report = {
        id: 'r' + Date.now(),
        productId: pid,
        reviewIndex: idx,
        review: rev,
        reporter: { name: user.name, email: user.email },
        reportedAt: new Date().toISOString(),
        resolved: false
    };
    // sempre adicionar o report ao localStorage para garantir que possa ser deletado/resolvido depois
    reports.push(report);
    setData('reports', reports);
    // tenta também enviar ao servidor; não importa se falhar (já está em localStorage)
    postReportToServer(report).then(ok => {
        if(ok){
            showToast('Comentário denunciado e enviado ao servidor. Obrigado — o Admin irá avaliar.');
        } else {
            showToast('Comentário denunciado (salvo localmente). Obrigado — o Admin irá avaliar.');
        }
        // atualizar UI
        renderReviewsSection(pid);
    });
}

function deleteReportedComment(reportId){
    // Em vez de excluir o relatório, marcamos como removido e registramos quem removeu.
    let reports = getData('reports') || [];
    const r = reports.find(x => x.id === reportId);
    if(!r) { showToast('Relatório não encontrado'); return; }

    // remover o comentário associado da lista de reviews (se existir)
    const reviews = getData('reviews') || {};
    if(Array.isArray(reviews[r.productId])){
        const existing = reviews[r.productId];
        const foundIndex = existing.findIndex(x => x.comment === r.review.comment && x.name === r.review.name && x.created === r.review.created);
        const removeIndex = foundIndex >= 0 ? foundIndex : r.reviewIndex;
        if(typeof removeIndex === 'number' && existing[removeIndex]){
            existing.splice(removeIndex, 1);
            reviews[r.productId] = existing;
            setData('reviews', reviews);
        }
    }

    // marca o relatório como removido (mantendo histórico)
    r.removed = true;
    r.removedAt = new Date().toISOString();
    const currentUser = getData('currentUser');
    r.removedBy = currentUser ? currentUser.email : 'local';
    setData('reports', reports);

    // tenta sincronizar alteração no servidor (substitui a lista completa)
    if(currentUser){
        putReportsOnServer(reports, currentUser.email).then(ok => {
            if(ok){
                showToast('Comentário marcado como removido (servidor).');
            } else {
                showToast('Comentário marcado como removido (local).');
            }
            renderAdminProducts();
        });
    } else {
        renderAdminProducts();
        showToast('Comentário marcado como removido (local).');
    }
}

function resolveReport(reportId){
    const reports = getData('reports') || [];
    const r = reports.find(x => x.id === reportId);
    if(!r){ showToast('Relatório não encontrado'); return; }
    r.resolved = !r.resolved;
    setData('reports', reports);

    // tenta enviar alteração para o servidor (substitui a lista completa)
    const currentUser = getData('currentUser');
    if(currentUser){
        putReportsOnServer(reports, currentUser.email).then(ok => {
            if(ok) showToast('Relatório atualizado no servidor');
            else showToast('Relatório marcado localmente');
            renderAdminProducts();
        });
    } else {
        renderAdminProducts();
        showToast('Relatório marcado como resolvido');
    }
}

// Envia um registro de login ao servidor (fallback se o servidor não responder)
async function postLoginToServer(user){
    try{
        const res = await fetch('/api/logins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
        return res.ok;
    } catch(e){
        console.warn('Falha ao enviar login ao servidor');
        return false;
    }
}

// Envia um registro de exclusão ao servidor
async function postDeletionToServer(record){
    try{
        const res = await fetch('/api/deletions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) });
        return res.ok;
    } catch(e){
        console.warn('Falha ao enviar exclusão ao servidor');
        return false;
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

async function initAdmin(){
    // Restrict access to admin page to specific users.
    // Tenta autorizar acesso consultando a lista de admins do servidor (se disponível).
    // Se o servidor não responder, cai para o `localStorage` (chave 'admins').
    const currentUser = getData('currentUser');
    const isAdminPage = location.pathname.endsWith('admin.html') || location.pathname.endsWith('admin');
    async function checkAdminAccess(){
        const localAdmins = getData('admins') || ['teste@gmail.com'];
        if(!isAdminPage) return true;
        if(!currentUser){
            window.location.href = 'login.html';
            return false;
        }
        // primeiro confere localStorage (para permitir promoções locais sem servidor)
        if(localAdmins.includes(currentUser.email)) return true;
        // tenta buscar a lista do servidor; só se a resposta for OK sincroniza local
        try{
            const res = await fetch('/api/admins', { headers: { 'x-admin-email': currentUser.email } });
            if(res.ok){
                const serverAdmins = await res.json();
                // sincroniza localStorage com o servidor (apenas se servidor autorizou)
                setData('admins', serverAdmins);
                if(serverAdmins.includes(currentUser.email)) return true;
                alert('Acesso negado: sua conta não é administradora.');
                window.location.href = 'index.html';
                return false;
            } else {
                // servidor respondeu, mas sem ok (ex: 403) — não sobrescrever localAdmins
                // permitir fallback para localAdmins já checados (aqui não incluía o usuário)
                alert('Acesso negado: esta área é restrita a administradores.');
                window.location.href = 'index.html';
                return false;
            }
        } catch(e){
            // servidor indisponível; já checamos localAdmins antes — negar acesso
            alert('Acesso negado: esta área é restrita a administradores (servidor indisponível).');
            window.location.href = 'index.html';
            return false;
        }
    }
    // se for página admin, verifica antes de continuar
    if(isAdminPage){
        // note: checkAdminAccess pode redirecionar se não autorizado
        const ok = await checkAdminAccess();
        if(!ok) return; // não autorizado => abortar inicialização do painel
        // expõe o conteúdo administrativo somente após autorização
        const adminApp = document.getElementById('adminApp');
        if(adminApp) adminApp.style.display = 'block';
    }

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
    // Inicializa busca de usuários para promoção a admin (se houver campo na página)
    const searchInput = document.getElementById('adminSearchInput');
    if(searchInput){
        searchInput.addEventListener('input', e => {
            const term = e.target.value.trim().toLowerCase();
            renderAdminUserSearch(term);
        });
        renderAdminUserSearch('');
    }
}

// Alterna exibição do bloco 'more' criado nas listas (Ver mais / Ver menos)
function toggleMore(moreId, btnId){
    const more = document.getElementById(moreId);
    const btn = document.getElementById(btnId);
    if(!more || !btn) return;
    if(more.style.display === 'none' || more.style.display === ''){
        more.style.display = 'block';
        btn.textContent = 'Ver menos';
    } else {
        more.style.display = 'none';
        btn.textContent = 'Ver mais';
    }
}

// Renderiza resultados da busca de usuários (apenas primeiros 3 + ver mais)
function renderAdminUserSearch(term){
    const resultsBox = document.getElementById('adminSearchResults');
    if(!resultsBox) return;
    const users = getData('users') || [];
    const admins = getData('admins') || [];
    const filtered = users.filter(u => !term || (u.name && u.name.toLowerCase().includes(term)));
    if(filtered.length === 0){ resultsBox.innerHTML = '<p>Nenhum usuário encontrado</p>'; return; }
    const items = filtered.map(u => {
        const created = u.createdAt ? new Date(u.createdAt).toLocaleString() : '—';
        const isAdmin = admins.includes(u.email);
            // se já for admin, exibe botão para remover; caso contrário, botão Promover
            const action = isAdmin
                ? `<div><span class="small-muted">Admin</span> <button class="btn secondary" onclick="removeAdmin('${u.email}')">Remover</button></div>`
                : `<button class="btn" onclick="promoteUser('${u.email}')">Promover a Admin</button>`;
            return `<div style="padding:8px;border-bottom:1px solid rgba(0,0,0,0.04);display:flex;justify-content:space-between;align-items:center"><div><strong>${u.name}</strong><div class=\"small-muted\">${u.email} • Cadastrado: ${created}</div></div><div>${action}</div></div>`;
    });
    const first = items.slice(0,3).join('');
    const rest = items.slice(3).join('');
    resultsBox.innerHTML = first + (rest ? `<div id="users-more" style="display:none">${rest}</div><div style="text-align:center;margin-top:8px"><button class="btn" id="users-toggle" onclick="toggleMore('users-more','users-toggle')">Ver mais</button></div>` : '');
}

// Promove usuário a admin: primeiro adiciona localmente, depois tenta sincronizar no servidor
function promoteUser(email){
    const currentUser = getData('currentUser');
    if(!currentUser){ alert('Faça login como Admin para promover usuários'); return; }
    // sempre adicionar localmente primeiro (permite funcionar offline)
    const admins = getData('admins') || [];
    if(!admins.includes(email)){
        admins.push(email);
        setData('admins', admins);
        showToast('Usuário promovido a Admin localmente');
    } else {
        showToast('Usuário já é admin');
    }
    // tentar sincronizar com o servidor (se falhar, já está em localStorage)
    addAdminOnServer(email, currentUser.email).then(ok => {
        if(ok){
            console.info('Promoção sincronizada com o servidor');
            // busca lista atual do servidor e mescla com o local (não sobrescrever)
            fetch('/api/admins', { headers: { 'x-admin-email': currentUser.email } }).then(r=>{
                if(r.ok) return r.json();
                return null;
            }).then(arr=>{
                if(Array.isArray(arr)){
                    const local = getData('admins') || [];
                    const merged = Array.from(new Set([...(local||[]), ...arr.filter(a=>typeof a==='string' && a.includes('@'))]));
                    setData('admins', merged);
                }
            }).catch(()=>{});
        } else {
            console.warn('Falha ao sincronizar promoção com o servidor (mas foi salva localmente)');
        }
    });
    renderAdminUserSearch(document.getElementById('adminSearchInput')?.value || '');
}

// Remove admin localmente e tenta remover no servidor
function removeAdmin(email){
    const currentUser = getData('currentUser');
    if(!currentUser){ alert('Faça login como Admin para remover administradores'); return; }
    let admins = getData('admins') || [];
    if(!admins.includes(email)){ showToast('Usuário não é admin'); return; }
    admins = admins.filter(a => a !== email);
    setData('admins', admins);
    showToast('Admin removido localmente');
    // tenta remover no servidor
    fetch('/api/admins/' + encodeURIComponent(email), { method: 'DELETE', headers: { 'x-admin-email': currentUser.email } })
        .then(r => { if(r.ok) showToast('Admin removido no servidor'); else console.warn('Falha ao remover admin no servidor'); })
        .catch(e => console.warn('Erro ao chamar DELETE /api/admins', e));
    renderAdminUserSearch(document.getElementById('adminSearchInput')?.value || '');
}

// Função utilitária exposta para facilitar adicionar o usuário atual como admin via console
window.addCurrentUserAsAdmin = function(){
    const u = getData('currentUser');
    if(!u){ console.warn('Nenhum usuário logado'); return; }
    const admins = getData('admins') || [];
    if(admins.includes(u.email)){ console.info('Usuário já é admin'); return; }
    admins.push(u.email);
    setData('admins', admins);
    // tenta também promover no servidor (se houver)
    addAdminOnServer(u.email, u.email).then(ok => {
        if(ok) console.info('Usuário promovido no servidor');
        else console.info('Usuário promovido localmente');
    });
    console.info('Adicionado aos admins localmente: ' + u.email);
}

// Renderiza a área administrativa (produtos, cupons, pedidos, denúncias)
// Observação: esta função agora é assíncrona para permitir buscar denúncias
// do servidor quando o usuário atual for administrador.
async function renderAdminProducts(){
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
            const orders = (getData('orders') || []).slice().sort((a,b)=> new Date(b.created) - new Date(a.created));
            if(orders.length === 0){ ordersBox.innerHTML = '<p>Sem pedidos</p>'; }
            else {
                // mostrar apenas 3 e esconder o restante em um bloco .more
                const items = orders.map(o => `<div style="padding:10px; margin-bottom:6px"><strong>Pedido ${o.id}</strong><div class="small-muted">Total: R$ ${o.total.toFixed(2)}</div><div>Status: ${o.status}</div></div>`);
                const first = items.slice(0,3).join('');
                const rest = items.slice(3).join('');
                ordersBox.innerHTML = first + (rest ? `<div id="orders-more" style="display:none">${rest}</div><div style="text-align:center;margin-top:8px"><button class="btn" id="orders-toggle" onclick="toggleMore('orders-more','orders-toggle')">Ver mais</button></div>` : '');
            }
    }

    const reportsBox = document.getElementById('adminReports');
    if(reportsBox){
        // Prioridade: se o usuário atual for admin, tentar obter denúncias do servidor
        // Caso contrário, usar o armazenamento local como fallback.
        let reports = getData('reports') || [];
        const currentUser = getData('currentUser');
        const localAdmins = getData('admins') || [];
        if(currentUser && localAdmins.includes(currentUser.email)){
            try{
                // tenta buscar do servidor; se retornar array, usa-o
                const serverReports = await fetchReportsFromServer(currentUser.email);
                if(Array.isArray(serverReports)){
                    reports = serverReports;
                }
            } catch(e){
                // falha ao buscar do servidor -> mantemos o fallback local
                console.warn('Falha ao obter denúncias do servidor, usando localStorage');
            }
        }

        if(!reports || reports.length === 0){
            reportsBox.innerHTML = '<p>Sem denúncias</p>';
        } else {
            // ordenar do mais recente para o mais antigo
            reports = reports.slice().sort((a,b) => new Date(b.reportedAt) - new Date(a.reportedAt));
            const items = reports.map(r => {
                // estilo por estado: removido = cinza, resolvido = verde, não resolvido = vermelho
                let borderColor = '#ddd';
                if(r.removed) borderColor = '#9e9e9e';
                else borderColor = r.resolved ? '#2e7d32' : '#c62828';
                const removedLabel = r.removed ? ' (Removido)' : '';
                const btnRemove = r.removed ? `<button class=\"btn secondary\" disabled>Removido!</button>` : `<button class=\"btn secondary\" onclick=\"deleteReportedComment('${r.id}')\">Remover comentário</button>`;
                const btnResolve = r.removed ? `<button class=\"btn\" disabled>Removido</button>` : `<button class=\"btn\" onclick=\"resolveReport('${r.id}')\">${r.resolved ? 'Marcar não resolvido' : 'Marcar resolvido'}</button>`;
                return `<div style=\"padding:10px; border:1px solid rgba(0,0,0,0.04); margin-bottom:8px; border-left:6px solid ${borderColor}; background:${r.removed ? '#fafafa' : 'white'}\">` 
                    + `<div style=\"display:flex;justify-content:space-between;align-items:center\">` 
                    + `<div><strong>Produto ID ${r.productId}${removedLabel}</strong> <div class=\\"small-muted\\">Denunciado por: ${r.reporter.name}${r.reporter.email ? ' ('+r.reporter.email+')' : ''}${r.removed ? ' • Removido por: ' + (r.removedBy || '-') + ' em ' + new Date(r.removedAt).toLocaleString() : ''}</div></div>` 
                    + `<div class=\\"small-muted\\">${new Date(r.reportedAt).toLocaleString()}</div>` 
                    + `</div>`
                    + `<div style=\"margin-top:8px\"><em>Comentário:</em> <div>${r.review.comment}</div></div>`
                    + `<div style=\"margin-top:8px;display:flex;gap:8px\">` 
                    + btnRemove
                    + btnResolve
                    + `</div>`
                    + `</div>`;
            });
            const first = items.slice(0,3).join('');
            const rest = items.slice(3).join('');
            reportsBox.innerHTML = first + (rest ? `<div id="reports-more" style="display:none">${rest}</div><div style="text-align:center;margin-top:8px"><button class="btn" id="reports-toggle" onclick="toggleMore('reports-more','reports-toggle')">Ver mais</button></div>` : '');
        }
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
        reg.addEventListener('submit', async e=>{
            e.preventDefault();
            const fd = new FormData(reg);
            const name = fd.get('name'), email = fd.get('email'), pass = fd.get('password'), addr = fd.get('address');
            // endereço obrigatório
            if(!addr || !addr.trim()){ alert('Endereço é obrigatório'); return; }
            let users = getData('users') || [];
            if(users.find(u => u.email === email)){ alert('Email já cadastrado'); return; }
            const newUser = { name, email, password: pass, address: addr, createdAt: new Date().toISOString() };
            // Tentar registrar no servidor (hash da senha será feito no servidor).
            try{
                const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
                if(res.ok){
                    const data = await res.json();
                    const profile = data.user || { name: newUser.name, email: newUser.email, address: newUser.address, createdAt: newUser.createdAt };
                    // salvar apenas o perfil localmente (NÃO guardar senha)
                    users.push(profile);
                    setData('users', users);
                    // registrar em 'logins' local (apenas metadata) e tentar enviar ao servidor
                    const logins = getData('logins') || [];
                    logins.push({ name: profile.name, email: profile.email, address: profile.address, createdAt: profile.createdAt });
                    setData('logins', logins);
                    postLoginToServer({ name: profile.name, email: profile.email, address: profile.address, createdAt: profile.createdAt }).then(ok => { if(ok) console.info('Login registrado no servidor'); });
                    alert('Conta criada com sucesso. Faça login.');
                    window.location.href = 'login.html';
                    return;
                } else if(res.status === 409){
                    alert('Email já cadastrado (servidor)');
                    return;
                } else {
                    alert('Falha ao registrar no servidor. Tente novamente mais tarde.');
                    return;
                }
            } catch(e){
                alert('Servidor indisponível. Não é seguro salvar senhas localmente. Tente novamente quando o servidor estiver disponível.');
                return;
            }
        });
    }

    const login = document.getElementById('loginForm');
    if(login){
        login.addEventListener('submit', async e=>{
            e.preventDefault();
            const fd = new FormData(login);
            const email = fd.get('email'), pass = fd.get('password');
            // tentar autenticar no servidor
            try{
                const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password: pass }) });
                if(res.ok){
                    const data = await res.json();
                    const profile = data.user;
                    if(profile){
                        // salvar currentUser sem senha
                        setData('currentUser', profile);
                        showToast('Logado como ' + profile.name);
                        updateAuthLinks();
                        window.location.href = 'index.html';
                        return;
                    }
                } else {
                    // se servidor respondeu inválido, tentar fallback local
                    if(res.status === 401){
                        alert('Credenciais inválidas');
                        return;
                    }
                }
            } catch(e){
                // servidor indisponível -> tentar fallback local (apenas se houver senha armazenada localmente)
                console.warn('Servidor indisponível, tentando login local');
                const users = getData('users') || [];
                const user = users.find(u => u.email === email && u.password === pass);
                if(user){
                    setData('currentUser', Object.assign({}, user, { password: undefined }));
                    showToast('Logado localmente como ' + user.name);
                    updateAuthLinks();
                    window.location.href = 'index.html';
                    return;
                } else {
                    alert('Servidor indisponível e credenciais locais não encontradas.');
                    return;
                }
            }
            alert('Falha ao efetuar login.');
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
    // Formulário editável para nome e endereço
    container.innerHTML = `
        <form id="profileEditForm">
            <div><label>Nome</label><input type="text" name="name" id="profileName" value="${user.name || ''}" required></div>
            <div><label>E-mail</label><input type="email" name="email" value="${user.email || ''}" disabled></div>
            <div><label>Endereço</label><input type="text" name="address" id="profileAddress" value="${user.address || ''}" required></div>
            <div style="margin-top:12px"><button class="btn" type="submit">Salvar alterações</button>
            <button type="button" id="logoutBtnProfile" class="btn" style="margin-left:8px">Sair da conta</button>
            <button type="button" id="deleteAccountBtn" class="btn secondary">Excluir conta</button></div>
        </form>
    `;

    const form = document.getElementById('profileEditForm');
    form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const name = document.getElementById('profileName').value.trim();
        const address = document.getElementById('profileAddress').value.trim();
        if(!address){ alert('Endereço é obrigatório'); return; }
        // atualizar usuário em localStorage
        const users = getData('users') || [];
        const idx = users.findIndex(u => u.email === user.email);
        if(idx >= 0){
            users[idx].name = name;
            users[idx].address = address;
            setData('users', users);
        }
        const updated = Object.assign({}, user, { name, address });
        setData('currentUser', updated);
        showToast('Perfil atualizado');
        updateAuthLinks();
        renderProfilePage();
        // tenta atualizar também no servidor
        fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
            .then(r => { if(r.ok) console.info('Usuário atualizado no servidor'); else console.warn('Falha ao atualizar usuário no servidor'); })
            .catch(e => console.warn('Erro ao atualizar usuário no servidor', e));
    });

    document.getElementById('deleteAccountBtn')?.addEventListener('click', ()=>{
        if(!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;
        // remover usuário das listas locais
        let users = getData('users') || [];
        users = users.filter(u => u.email !== user.email);
        setData('users', users);
        // registrar exclusão local
        const deletions = getData('deletions') || [];
        const rec = { name: user.name, email: user.email, address: user.address, deletedAt: new Date().toISOString() };
        deletions.push(rec);
        setData('deletions', deletions);
        // tentar enviar ao servidor
        postDeletionToServer(rec).then(ok => {
            if(ok) console.info('Exclusão registrada no servidor');
            else console.info('Exclusão registrada localmente');
        });
        // tenta também remover do arquivo de usuários no servidor
        fetch('/api/users/' + encodeURIComponent(user.email), { method: 'DELETE' })
            .then(r => { if(r.ok) console.info('Usuário removido no servidor'); else console.warn('Falha ao remover usuário no servidor'); })
            .catch(e => console.warn('Erro ao remover usuário no servidor', e));
        // efetuar logout e redirecionar
        setData('currentUser', null);
        updateAuthLinks();
        showToast('Conta excluída');
        window.location.href = 'index.html';
    });
    // Botão de logout específico da página de perfil
    document.getElementById('logoutBtnProfile')?.addEventListener('click', ()=>{
        setData('currentUser', null);
        updateAuthLinks();
        window.location.href = 'index.html';
    });
}

function initContact(){
    const f = document.getElementById('contactForm');
    if(!f) return;
    f.addEventListener('submit', async e=>{
        e.preventDefault();
        const fd = new FormData(f);
        const payload = { name: fd.get('name') || '', email: fd.get('email') || '', message: fd.get('message') || '' };
        // validação simples
        if(!payload.name || !payload.email || !payload.message){ alert('Preencha nome, e-mail e mensagem.'); return; }
        try{
            const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
            if(res.ok){
                showToast('Mensagem enviada. Obrigado!');
                f.reset();
                return;
            }
        } catch(err){
            console.warn('Erro ao chamar /api/contact', err);
        }
        alert('Falha ao enviar a mensagem. Tente novamente mais tarde.');
    });
}

// Inicializa filtros da página de loja (shop.html)
function initShopFilters(){
    const catEl = document.getElementById('filterCategory');
    const priceEl = document.getElementById('filterPrice');
    const sortEl = document.getElementById('sortBy');
    if(!catEl && !priceEl && !sortEl) return;
    const products = getData('products') || [];
    // popular categorias
    const cats = Array.from(new Set(products.map(p=>p.category).filter(Boolean)));
    if(catEl){
        // limpa exceto a opcao Todas
        catEl.innerHTML = '<option value="">Todas</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    }

    function applyFilters(){
        let out = products.slice();
        const selCat = catEl ? catEl.value : '';
        const maxPrice = priceEl ? Number(priceEl.value) : Infinity;
        const sortBy = sortEl ? sortEl.value : 'relevance';
        if(selCat){ out = out.filter(p => p.category === selCat); }
        out = out.filter(p => (typeof p.price === 'number' ? p.price : Number(p.price || 0)) <= maxPrice);
        if(sortBy === 'price_asc') out.sort((a,b)=> (a.price||0) - (b.price||0));
        else if(sortBy === 'price_desc') out.sort((a,b)=> (b.price||0) - (a.price||0));
        renderProductCards(out);
    }

    if(catEl) catEl.addEventListener('change', applyFilters);
    if(priceEl) priceEl.addEventListener('input', applyFilters);
    if(sortEl) sortEl.addEventListener('change', applyFilters);
    // apply initially
    applyFilters();
}

document.addEventListener('DOMContentLoaded', function(){
    updateAuthLinks();
    initSearch();
    renderProductCards(getData('products') || []);
    initShopFilters();
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
