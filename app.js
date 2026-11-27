const CDN = "https://" + "www.gstatic" + ".com/firebasejs/13.4.0/";
const { initializeApp } = await import(CDN + "firebase-app.js");
const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import(CDN + "firebase-auth.js");
const { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, query, orderBy } = await import(CDN + "firebase-firestore.js");

const firebaseConfig = {
    apiKey: "AIzaSyBTahFQZxeCKbIdKTvicObukMRDkbGXTGk",
    authDomain: "pjpro-a3727" + ".firebaseapp.com",
    projectId: "pjpro-a3727",
    storageBucket: "pjpro-a3727.firebasestorage.app",
    messagingSenderId: "706390086062",
    appId: "1:706390086062:web:37010cfce3f5ee52f7783f",
    measurementId: "G-LRP6EJFTFM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const productsCol = collection(db, "products");
const bannersCol = collection(db, "banners");
const settingsDoc = doc(db, "settings", "payment");

let products = [];
let banners = [];
let currentBannerIdx = 0;
let bannerTimer = null;
let currentCategory = 'All';
let isAdmin = false;
let currentCurrency = { code: 'TWD', rate: 1, symbol: 'NT$' };
let cart = [];
const ordersCol = collection(db, "orders");
let orders = [];
let paymentConfig = { url: "", note: "確認商品數量與總金額後，點擊前往付款並填寫收件資訊。" };
let currentPage = 1;
const itemsPerPage = 12;
onAuthStateChanged(auth, (user) => {
    isAdmin = !!user;
    const panel = document.getElementById('adminPanel');
    const authBtn = document.getElementById('authBtn');
    if (isAdmin) {
        panel.classList.remove('hidden');
        authBtn.textContent = '登出管理員';
        authBtn.classList.replace('bg-slate-800', 'bg-red-600');
    } else {
        panel.classList.add('hidden');
        authBtn.textContent = '管理員登入';
        authBtn.classList.replace('bg-red-600', 'bg-slate-800');
    }
    renderProducts();
});

onSnapshot(query(productsCol, orderBy("createdAt", "desc")), (snap) => {
    document.getElementById('loadingIndicator').classList.add('hidden');
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategories();
    renderProducts();
});

onSnapshot(query(bannersCol, orderBy("createdAt", "desc")), (snap) => {
    banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBanners();
    renderAdminBanners();
});
onSnapshot(settingsDoc, (snap) => {
    if (snap.exists()) {
        paymentConfig = snap.data();
        const urlIn = document.getElementById('paymentLinkInput');
        const noteIn = document.getElementById('paymentNoteInput');
        if (urlIn) urlIn.value = paymentConfig.url || "";
        if (noteIn) noteIn.value = paymentConfig.note || "";
        const payBtn = document.getElementById('directPayBtn');
        const payNote = document.getElementById('checkoutPayNote');
        if (payBtn && paymentConfig.url) payBtn.href = paymentConfig.url;
        if (payNote && paymentConfig.note) payNote.textContent = paymentConfig.note;
    }
});
onSnapshot(query(ordersCol, orderBy("createdAt", "desc")), (snap) => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAdminOrders();
});
window.handleAuthClick = () => isAdmin ? signOut(auth) : document.getElementById('loginModal').classList.remove('hidden');
window.closeLoginModal = () => document.getElementById('loginModal').classList.add('hidden');
window.submitLogin = async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('adminEmail').value, document.getElementById('adminPassword').value);
        closeLoginModal(); e.target.reset();
    } catch (err) { alert("登入失敗：" + err.message); }
};
function renderBanners() {
    const container = document.getElementById('bannerContainer');
    const dots = document.getElementById('bannerDots');
    const fallback = { tag: "PiJie TCG 2026", title: "寶可夢卡牌原箱與單卡批發", desc: "日版、繁中版、美版即時報價", image: "logo.png" };
    const list = banners.length > 0 ? banners : [fallback];
    const len = list.length;
    if (currentBannerIdx >= len) currentBannerIdx = 0;

    const prevIdx = (currentBannerIdx - 1 + len) % len;
    const nextIdx = (currentBannerIdx + 1) % len;

    const buildCard = (item, role, clickFn) => `
        <div ${clickFn ? `onclick="${clickFn}"` : ''} class="carousel-card ${role}">
            <img src="${item.image}" class="carousel-bg-blur">
            <img src="${item.image}" alt="${item.title}" class="carousel-main-img">
            <div class="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
            <div class="absolute bottom-4 left-5 right-5 z-20 text-white">
                <span class="inline-block bg-amber-500 text-slate-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded mb-1">${item.tag}</span>
                <h2 class="text-lg md:text-xl font-extrabold leading-snug">${item.title}</h2>
                <p class="text-slate-300 text-xs line-clamp-1">${item.desc}</p>
            </div>
        </div>`;

    container.innerHTML = `<div class="carousel-track">
        ${len > 1 ? buildCard(list[prevIdx], 'side', 'prevBanner()') : ''}
        ${buildCard(list[currentBannerIdx], 'center', '')}
        ${len > 1 ? buildCard(list[nextIdx], 'side', 'nextBanner()') : ''}
    </div>`;

    dots.innerHTML = list.map((_, i) => `<button onclick="goBanner(${i})" class="h-2 rounded-full transition ${i === currentBannerIdx ? 'bg-amber-400 w-6' : 'bg-white/60 w-2'}"></button>`).join('');
    clearInterval(bannerTimer);
    if (len > 1) bannerTimer = setInterval(() => window.nextBanner(), 5000);
}

window.nextBanner = () => { const len = banners.length || 1; currentBannerIdx = (currentBannerIdx + 1) % len; renderBanners(); };
window.prevBanner = () => { const len = banners.length || 1; currentBannerIdx = (currentBannerIdx - 1 + len) % len; renderBanners(); };
window.goBanner = (i) => { currentBannerIdx = i; renderBanners(); };

window.changeCurrency = () => {
    const sel = document.getElementById('currencySelector');
    const opt = sel.options[sel.selectedIndex];
    currentCurrency = { code: opt.value, rate: parseFloat(opt.dataset.rate), symbol: opt.dataset.symbol };
    renderProducts(); renderCart();
};

window.handleFilterChange = () => { currentPage = 1; renderProducts(); };
window.selectCategory = (cat) => { currentCategory = cat; currentPage = 1; renderCategories(); renderProducts(); };

function renderCategories() {
    const cats = ['All', ...new Set(products.map(p => p.category))];
    document.getElementById('categoryTabs').innerHTML = cats.map(c => `<button onclick="selectCategory('${c}')" class="px-4 py-1.5 rounded-full text-xs font-semibold transition ${currentCategory === c ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${c === 'All' ? '全部卡牌' : c}</button>`).join('');
}

function renderAdminBanners() {
    const listEl = document.getElementById('adminBannerList');
    if (!listEl) return;
    listEl.innerHTML = banners.map(b => `<div class="bg-white p-2.5 rounded-lg border border-blue-200 flex items-center justify-between gap-2"><div class="flex items-center gap-2 overflow-hidden"><img src="${b.image}" class="w-12 h-8 object-cover rounded shrink-0"><div class="truncate"><div class="text-xs font-bold text-slate-800 truncate">${b.title}</div><div class="text-[10px] text-slate-400 truncate">${b.tag}</div></div></div><button onclick="deleteBanner('${b.id}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded shrink-0">刪除</button></div>`).join('');
}

function getStatusBadgeClass(s) {
    return { 'On Sale': 'badge-onsale', 'Low Stock': 'badge-lowstock', 'Sold Out': 'badge-soldout' }[s] || 'badge-preorder';
}
function renderProducts() {
    const grid = document.getElementById('productGrid');
    const pageBar = document.getElementById('paginationBar');
    const keyword = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter')?.value || 'All';

    const filtered = products.filter(p => {
        return (currentCategory === 'All' || p.category === currentCategory) &&
               (statusFilter === 'All' || p.status === statusFilter) &&
               (!keyword || p.name.toLowerCase().includes(keyword) || p.category.toLowerCase().includes(keyword));
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">目前尚無符合條件的卡牌商品。</div>`;
        if (pageBar) pageBar.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filtered.slice(start, start + itemsPerPage);

    grid.innerHTML = pageItems.map(product => {
        const stock = product.stock ?? 0;
        const isOut = stock <= 0 || product.status === 'Sold Out';
        const price = (product.priceTWD * currentCurrency.rate).toLocaleString(undefined, {
            minimumFractionDigits: currentCurrency.code === 'USD' ? 2 : 0,
            maximumFractionDigits: currentCurrency.code === 'USD' ? 2 : 0
        });
        const imgOverlay = isAdmin ? `<label class="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white cursor-pointer opacity-90 hover:opacity-100 transition"><span class="text-sm font-bold mb-1">📷 更換照片</span><input type="file" accept="image/*" class="hidden" onchange="updateImage('${product.id}', event)"></label>` : '';
        const titleHtml = isAdmin ? `<input type="text" value="${product.name}" onchange="updateField('${product.id}', 'name', this.value)" class="w-full font-bold text-slate-800 border-b border-amber-400 focus:outline-none mb-2 bg-amber-50/60 px-1 py-0.5 rounded">` : `<h3 class="font-bold text-slate-800 text-base mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">${product.name}</h3>`;

        const cardTop = `
        <div class="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
            <div class="relative aspect-square bg-slate-100 overflow-hidden">
                <img src="${product.image}" alt="${product.name}" onclick="openLightbox('${product.image}', '${product.name.replace(/'/g, "\\'")}')" class="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-500">
                <span class="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${getStatusBadgeClass(product.status)}">${product.status}</span>
                ${imgOverlay}
            </div>
            <div class="p-5 flex-1 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5">
                        <span>${product.category}</span>
                        <span class="px-2 py-0.5 rounded font-bold ${isOut ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}">庫存: ${stock}</span>
                    </div>
                    ${titleHtml}
                </div>`;

        const adminControls = `
            <div class="space-y-2">
                <div class="flex items-center justify-between text-xs"><span class="text-slate-500">基準價(TWD):</span><input type="number" value="${product.priceTWD}" onchange="updateField('${product.id}', 'priceTWD', Number(this.value))" class="w-24 text-right font-bold border border-amber-400 rounded px-1.5 py-0.5 bg-amber-50"></div>
                <div class="flex items-center justify-between text-xs"><span class="text-slate-500">庫存數量:</span><input type="number" min="0" value="${stock}" onchange="updateField('${product.id}', 'stock', Number(this.value))" class="w-24 text-right font-bold border border-amber-400 rounded px-1.5 py-0.5 bg-amber-50"></div>
                <div class="flex items-center justify-between text-xs"><span class="text-slate-500">狀態:</span><select onchange="updateField('${product.id}', 'status', this.value)" class="border border-amber-400 rounded px-1 py-0.5 bg-amber-50"><option value="On Sale" ${product.status === 'On Sale' ? 'selected' : ''}>On Sale</option><option value="Pre-order" ${product.status === 'Pre-order' ? 'selected' : ''}>Pre-order</option><option value="Low Stock" ${product.status === 'Low Stock' ? 'selected' : ''}>Low Stock</option><option value="Sold Out" ${product.status === 'Sold Out' ? 'selected' : ''}>Sold Out</option></select></div>
                <button onclick="deleteProduct('${product.id}')" class="w-full mt-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-1.5 rounded-lg transition">刪除商品</button>
            </div>`;

        const clientControls = `
            <div class="flex items-baseline justify-between mb-3.5"><span class="text-xs text-slate-400">批發單價</span><span class="text-xl font-extrabold text-slate-900">${currentCurrency.symbol} ${price}</span></div>
            <button ${isOut ? 'disabled' : `onclick="addToCart('${product.id}')"`} class="w-full ${isOut ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white'} text-xs font-bold py-2.5 rounded-lg transition shadow-sm">${isOut ? '已售完 (庫存 0)' : '+ 加入購物車'}</button>`;

        return `${cardTop}<div class="mt-4 pt-3.5 border-t border-slate-100">${isAdmin ? adminControls : clientControls}</div></div></div>`;
    }).join('');

    if (pageBar) {
        if (totalPages <= 1) { pageBar.innerHTML = ''; return; }
        let btns = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">‹ 上一頁</button>`;
        for (let i = 1; i <= totalPages; i++) {
            btns += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
        }
        btns += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">下一頁 ›</button>`;
        pageBar.innerHTML = btns;
    }
}

window.goPage = (p) => { currentPage = p; renderProducts(); document.getElementById('catalogSection').scrollIntoView({ behavior: 'smooth' }); };
function compressImage(file, maxSize = 400) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h && w > maxSize) { h *= maxSize / w; w = maxSize; }
                else if (h > maxSize) { w *= maxSize / h; h = maxSize; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

window.updateField = async (id, field, val) => {
    try { await updateDoc(doc(db, "products", id), { [field]: val }); }
    catch (e) { alert("更新失敗：" + e.message); }
};

window.updateImage = async (id, e) => {
    const file = e.target.files.item(0);
    if (file) await updateField(id, 'image', await compressImage(file, 400));
};

window.addProduct = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addBtn');
    btn.disabled = true; btn.textContent = "上傳中...";
    let img = "logo.png";
    const f = document.getElementById('newImage').files.item(0);
    if (f) img = await compressImage(f, 400);
    try {
        await addDoc(productsCol, {
            name: document.getElementById('newName').value,
            category: document.getElementById('newCategory').value,
            priceTWD: Number(document.getElementById('newPrice').value),
            stock: Number(document.getElementById('newStock').value),
            status: document.getElementById('newStatus').value,
            image: img,
            createdAt: serverTimestamp()
        });
        e.target.reset();
    } catch (err) { alert("上架失敗：" + err.message); }
    finally { btn.disabled = false; btn.textContent = "+ 雲端上架"; }
};

window.deleteProduct = async (id) => { if (confirm('確定刪除此卡牌商品？')) await deleteDoc(doc(db, "products", id)); };

window.addBanner = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addBannerBtn');
    btn.disabled = true; btn.textContent = "上傳中...";
    let img = "logo.png";
    const f = document.getElementById('bannerImage').files.item(0);
    if (f) img = await compressImage(f, 900);
    try {
        await addDoc(bannersCol, { tag: document.getElementById('bannerTag').value, title: document.getElementById('bannerTitle').value, desc: document.getElementById('bannerDesc').value, image: img, createdAt: serverTimestamp() });
        e.target.reset();
    } catch (err) { alert("新增輪播失敗：" + err.message); }
    finally { btn.disabled = false; btn.textContent = "+ 新增輪播"; }
};

window.deleteBanner = async (id) => { if (confirm('確定刪除此則輪播消息？')) await deleteDoc(doc(db, "banners", id)); };

window.savePaymentLink = async (e) => {
    e.preventDefault();
    try {
        await setDoc(settingsDoc, {
            url: document.getElementById('paymentLinkInput').value.trim(),
            note: document.getElementById('paymentNoteInput').value.trim()
        });
        alert("付款連結設定已儲存！");
    } catch (err) { alert("儲存失敗：" + err.message); }
};

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    if (!p || (p.stock ?? 0) <= 0) return;
    const exist = cart.find(x => x.id === id);
    if (exist) {
        if (exist.qty >= p.stock) return alert(`「${p.name}」目前最高庫存僅剩 ${p.stock} 件！`);
        exist.qty++;
    } else {
        cart.push({ id: p.id, name: p.name, priceTWD: p.priceTWD, qty: 1 });
    }
    renderCart();
};

window.changeCartQty = (id, delta) => {
    const idx = cart.findIndex(x => x.id === id);
    if (idx === -1) return;
    const p = products.find(x => x.id === id);
    const maxStock = p ? (p.stock ?? 0) : 99;
    const nextQty = cart[idx].qty + delta;
    if (nextQty <= 0) cart.splice(idx, 1);
    else if (nextQty > maxStock) return alert(`庫存不足，最多可購買 ${maxStock} 件`);
    else cart[idx].qty = nextQty;
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const totalEl = document.getElementById('cartTotalDisplay');
    const floatBtn = document.getElementById('floatingCartBtn');
    const badge = document.getElementById('cartCountBadge');
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    if (badge) badge.textContent = totalQty;
    if (floatBtn) floatBtn.classList.toggle('hidden', totalQty === 0);

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-sm bg-slate-900/60 rounded-xl border border-slate-700/80">購物車目前是空的，請在上方商品列表點擊「+ 加入購物車」</div>`;
        totalEl.textContent = `${currentCurrency.symbol} 0`;
        return;
    }

    let totalTWD = 0;
    container.innerHTML = cart.map(item => {
        totalTWD += item.priceTWD * item.qty;
        const unitPrice = (item.priceTWD * currentCurrency.rate).toLocaleString(undefined, { maximumFractionDigits: currentCurrency.code === 'USD' ? 2 : 0 });
        return `<div class="flex items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700">
            <div class="flex-1 min-w-0">
                <div class="font-bold text-sm text-white truncate">${item.name}</div>
                <div class="text-xs text-amber-400 mt-0.5">${currentCurrency.symbol} ${unitPrice} / 件</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <button type="button" onclick="changeCartQty('${item.id}', -1)" class="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">-</button>
                <span class="w-7 text-center text-sm font-bold">${item.qty}</span>
                <button type="button" onclick="changeCartQty('${item.id}', 1)" class="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold">+</button>
            </div>
        </div>`;
    }).join('');

    const totalConverted = (totalTWD * currentCurrency.rate).toLocaleString(undefined, { maximumFractionDigits: currentCurrency.code === 'USD' ? 2 : 0 });
    totalEl.textContent = `${currentCurrency.symbol} ${totalConverted}`;
}

window.checkPayLink = (e) => {
    if (!paymentConfig.url) {
        e.preventDefault();
        alert("管理員尚未設定線上付款連結，請先點擊左側「確認送出訂單並扣庫存」，或聯繫官方客服！");
    }
};

window.submitOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("購物車是空的，請先加入商品！");
    try {
        for (const item of cart) {
            const p = products.find(x => x.id === item.id);
            if (p) {
                const newStock = Math.max(0, (p.stock ?? 0) - item.qty);
                await updateDoc(doc(db, "products", p.id), {
                    stock: newStock,
                    status: newStock === 0 ? "Sold Out" : p.status
                });
            }
        }
        await addDoc(collection(db, "orders"), {
            buyerName: document.getElementById('buyerName').value,
            buyerPhone: document.getElementById('buyerPhone').value,
            buyerAddress: document.getElementById('buyerAddress').value,
            items: cart,
            createdAt: serverTimestamp()
        });
        alert("訂單已成功送出並完成庫存保留！接著可點擊綠色「前往線上付款」按鈕完成結帳。");
        cart = []; renderCart(); e.target.reset();
        if (paymentConfig.url) window.open(paymentConfig.url, '_blank');
    } catch (err) { alert("送出訂單失敗：" + err.message); }
};

window.seedDefaultData = async () => {
    if (!confirm('確定匯入 3 筆寶可夢卡牌範例？')) return;
    const samples = [
        { name: "日版 寶可夢 151 強化擴充包 (原箱12盒)", category: "原箱/盒裝", priceTWD: 38500, stock: 5, status: "On Sale", image: "logo.png", createdAt: serverTimestamp() },
        { name: "繁中版 奇幻光輝 擴充包 (單盒)", category: "原箱/盒裝", priceTWD: 1850, stock: 20, status: "Low Stock", image: "logo.png", createdAt: serverTimestamp() },
        { name: "PSA 10 噴火龍 ex SAR 特別藝術版", category: "鑑定卡", priceTWD: 12800, stock: 1, status: "Pre-order", image: "logo.png", createdAt: serverTimestamp() }
    ];
    for (const item of samples) await addDoc(productsCol, item);
};

window.openLightbox = (src, title) => {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightboxTitle').textContent = title;
    document.getElementById('imageLightbox').classList.remove('hidden');
};
window.closeLightbox = () => document.getElementById('imageLightbox').classList.add('hidden');
function renderAdminOrders() {
    const listEl = document.getElementById('adminOrderList');
    const badge = document.getElementById('orderCountBadge');
    if (!listEl) return;
    if (badge) badge.textContent = `${orders.length} 筆訂單`;

    if (orders.length === 0) {
        listEl.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm bg-white rounded-lg border border-purple-200">目前尚無客戶訂單</div>`;
        return;
    }

    listEl.innerHTML = orders.map(o => {
        const timeStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString('zh-TW') : '剛剛';
        const totalTWD = (o.items || []).reduce((sum, i) => sum + (i.priceTWD * i.qty), 0);
        const itemsHtml = (o.items || []).map(i => `<span class="inline-block bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded mr-1 mb-1">${i.name} × <b>${i.qty}</b></span>`).join('');
        const isDone = o.orderStatus === '已出貨';

        return `<div class="bg-white p-4 rounded-xl border ${isDone ? 'border-slate-200 opacity-75' : 'border-purple-300'} flex flex-col md:flex-row justify-between gap-3">
            <div class="space-y-1 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-extrabold px-2 py-0.5 rounded ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${o.orderStatus || '待處理 / 核帳中'}</span>
                    <span class="font-bold text-slate-900 text-sm">${o.buyerName}</span>
                    <span class="text-xs text-slate-500">📞 ${o.buyerPhone}</span>
                    <span class="text-[11px] text-slate-400">${timeStr}</span>
                </div>
                <div class="text-xs text-slate-600">📍 收件地址：${o.buyerAddress}</div>
                <div class="pt-1">${itemsHtml}</div>
            </div>
            <div class="flex md:flex-col justify-between items-end gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <div class="text-base font-extrabold text-purple-900">NT$ ${totalTWD.toLocaleString()}</div>
                <div class="flex gap-1.5">
                    <button onclick="toggleOrderStatus('${o.id}', '${isDone ? '待處理 / 核帳中' : '已出貨'}')" class="text-xs px-2.5 py-1 rounded font-bold ${isDone ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-500'}">${isDone ? '改回待處理' : '✓ 標記已出貨'}</button>
                    <button onclick="deleteOrder('${o.id}')" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2.5 py-1 rounded font-bold">刪除</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

window.toggleOrderStatus = async (id, nextStatus) => {
    try { await updateDoc(doc(db, "orders", id), { orderStatus: nextStatus }); }
    catch (e) { alert("狀態更新失敗：" + e.message); }
};

window.deleteOrder = async (id) => {
    if (confirm("確定刪除此筆客戶訂單紀錄？（注意：刪除訂單不會自動加回商品庫存）")) {
        await deleteDoc(doc(db, "orders", id));
    }
};





