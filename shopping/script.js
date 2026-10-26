/* =====================================================================
           GIVEN BEAUTY — SHOP (Phase 2 · Refinement)
           ---------------------------------------------------------------------
           Product facts and sample prices are kept in the HTML catalogue.
           `images.secondary` is null because no genuine alternate photography
           exists yet; the card crossfade activates when another view is added.
           ===================================================================== */

        const SAMPLE_EFT_DETAILS = Object.freeze({
            bank: 'To be confirmed (sample placeholder)',
            accountName: 'To be confirmed (sample placeholder)',
            accountNumber: 'To be confirmed (sample placeholder)',
            branchCode: 'To be confirmed (sample placeholder)'
        });
        const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const MAX_QUANTITY = 10;
        const SAMPLE_PRODUCTS = [...document.querySelector('#catalogue').content.querySelectorAll('article')].map(article => {
            const images = [...article.querySelectorAll('img')];
            const image = images[0];
            const data = article.dataset;
            const price = data.price === undefined || data.price === '' ? null : Number(data.price);
            return {
                id: data.id,
                slug: data.slug,
                name: data.name,
                category: data.category,
                collections: (data.collections || '').split(/\s+/).filter(Boolean),
                price: Number.isFinite(price) && price >= 0 ? price : null,
                comparePrice: data.comparePrice ? Number(data.comparePrice) : null,
                images: {
                    primary: image?.getAttribute('src') || '',
                    secondary: images[1]?.getAttribute('src') || null,
                    views: images.map(view => ({
                        src: view.getAttribute('src') || '',
                        alt: view.alt || '',
                        label: view.dataset.label || 'Sample view',
                        pos: view.dataset.pos || '50% 50%',
                        zoom: Number(view.dataset.zoom) || 1,
                        fit: view.dataset.fit || 'cover'
                    }))
                },
                imageAlt: image?.alt || '',
                imagePosition: image?.dataset.pos || '50% 50%',
                imageLabel: image?.dataset.label || 'Sample view',
                attributes: {
                    length: { value: data.lengthValue || '', label: data.lengthLabel || 'To be confirmed' },
                    colour: { value: data.colourValue || '', label: data.colourLabel || 'To be confirmed' },
                    texture: { value: data.textureValue || '', label: data.textureLabel || 'To be confirmed' },
                    material: data.material || 'To be confirmed'
                },
                availability: data.availability || 'To be confirmed',
                variants: null,
                description: article.querySelector('p')?.textContent.trim() || '',
                isNew: data.new === 'true'
            };
        }).filter(product => product.id && product.images.primary);

        // ---- State ----
        const state = {
            category: 'all',
            search: '',
            sort: 'featured',
            filters: { length: [], colour: [], texture: [] },
            pendingFilters: { length: [], colour: [], texture: [] },
            cart: loadCart(),
            currentProduct: null,
            modalQty: 1,
            lastFocused: null
        };

        // ---- Cart persistence ----
        function loadCart() {
            try {
                const raw = localStorage.getItem('gb_bag');
                if (!raw) return {};
                const parsed = JSON.parse(raw);
                const valid = {};
                const entries = Array.isArray(parsed)
                    ? parsed.map(item => [item.id, item.qty])
                    : Object.entries(parsed || {});
                entries.forEach(([id, qty]) => {
                    const product = SAMPLE_PRODUCTS.find(item => item.id === id);
                    if (product && product.price !== null && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QUANTITY) valid[id] = qty;
                });
                return valid;
            } catch (error) {
                console.error('Could not read the saved bag.', error);
                return {};
            }
        }
        function saveCart() {
            try { localStorage.setItem('gb_bag', JSON.stringify(state.cart)); }
            catch (error) {
                console.error('Could not save the bag.', error);
                showToast('Your bag could not be saved in this browser');
            }
        }
        function cartTotalQty() {
            return Object.values(state.cart).reduce((sum, quantity) => sum + quantity, 0);
        }
        function findProductById(id) { return SAMPLE_PRODUCTS.find(p => p.id === id); }
        function findProductBySlug(slug) { return SAMPLE_PRODUCTS.find(p => p.slug === slug); }

        // ---- Utils ----
        const fmtR = n => 'R ' + Math.round(n).toLocaleString('en-ZA').replace(/,/g, '\u00a0');
        const $ = sel => document.querySelector(sel);
        const $$ = sel => document.querySelectorAll(sel);
        const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);

        function debounce(fn, wait) {
            let t;
            return (...args) => {
                clearTimeout(t);
                t = setTimeout(() => fn(...args), wait);
            };
        }

        // ---- Filtering + sorting ----
        function getVisibleProducts() {
            let list = [...SAMPLE_PRODUCTS];

            if (state.category === 'new') {
                list = list.filter(p => p.collections.includes('new'));
            } else if (state.category === 'bestsellers') {
                list = list.filter(p => p.collections.includes('bestsellers'));
            } else if (state.category !== 'all') {
                list = list.filter(p => p.category === state.category);
            }

            if (state.search.trim()) {
                const q = state.search.trim().toLowerCase();
                list = list.filter(p =>
                    p.name.toLowerCase().includes(q) ||
                    p.attributes.colour.label.toLowerCase().includes(q) ||
                    p.attributes.texture.label.toLowerCase().includes(q) ||
                    p.attributes.length.label.toLowerCase().includes(q) ||
                    p.attributes.material.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q)
                );
            }

            ['length', 'colour', 'texture'].forEach(g => {
                const vals = state.filters[g];
                if (vals.length) list = list.filter(p => vals.includes(p.attributes[g].value));
            });

            switch (state.sort) {
                case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
                case 'price-desc': list.sort((a, b) => b.price - a.price); break;
                case 'newest':     list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
            }

            return list;
        }

        // ---- Category counts ----
        function updateCategoryCounts() {
            const counts = {
                all: SAMPLE_PRODUCTS.length,
                wigs: SAMPLE_PRODUCTS.filter(p => p.category === 'wigs').length,
                new: SAMPLE_PRODUCTS.filter(p => p.collections.includes('new')).length,
                bestsellers: SAMPLE_PRODUCTS.filter(p => p.collections.includes('bestsellers')).length
            };
            $$('[data-count-for]').forEach(el => {
                el.textContent = `(${counts[el.dataset.countFor]})`;
            });
        }

        // ---- Image error fallback ----
        function attachImageFallback(img) {
            img.addEventListener('error', function handleError() {
                const wrap = img.closest('.product-image-wrap, .cart-item-img, .product-modal-image');
                if (wrap) wrap.classList.add('is-placeholder');
                img.style.opacity = '0';
            }, { once: true });
        }

        // ---- Render product grid ----
        function renderGrid({ animate = true, dim = false } = {}) {
            const list = getVisibleProducts();
            const grid = $('#product-grid');
            const empty = $('#shop-empty');
            const count = $('#shop-count');

            count.textContent = `Showing ${list.length} of ${SAMPLE_PRODUCTS.length} piece${SAMPLE_PRODUCTS.length === 1 ? '' : 's'}`;

            if (!list.length) {
                grid.innerHTML = '';
                empty.classList.add('visible');
                // Contextual copy
                if (state.search.trim() && !hasActiveFilters()) {
                    $('#shop-empty-title').textContent = 'Nothing matches that search.';
                    $('#shop-empty-body').textContent = 'Try another word, or browse the full collection.';
                    $('#empty-clear-btn').textContent = 'Clear search';
                } else if (hasActiveFilters() && !state.search.trim()) {
                    $('#shop-empty-title').textContent = 'No products match these filters.';
                    $('#shop-empty-body').textContent = 'Try adjusting the filters, or clear them to see everything.';
                    $('#empty-clear-btn').textContent = 'Clear filters';
                } else {
                    $('#shop-empty-title').textContent = 'Nothing matches just yet.';
                    $('#shop-empty-body').textContent = 'Try adjusting your search or filters to see more of the collection.';
                    $('#empty-clear-btn').textContent = 'Clear search & filters';
                }
                return;
            }
            empty.classList.remove('visible');

            grid.innerHTML = list.map(p => {
                const saleTag = p.comparePrice ? '<span class="product-tag product-tag--sale">Sale</span>' : '';
                const newTag = p.isNew ? '<span class="product-tag product-tag--new">New</span>' : '';
                const compare = p.comparePrice
                    ? `<span class="product-price-compare">${fmtR(p.comparePrice)}</span>` : '';
                const price = p.price === null ? 'Price to be confirmed' : `Sample price: ${fmtR(p.price)}`;

                // Secondary image crossfade — only if a genuine alternate exists
                const secondaryImg = p.images.secondary
                    ? `<img class="product-image-secondary" src="${p.images.secondary}" alt="" aria-hidden="true" width="800" height="1000" loading="lazy" decoding="async">`
                    : '';

                return `
                    <article class="product-card" data-product-id="${p.id}" data-slug="${p.slug}">
                        <div class="product-image-wrap" data-open-product="${p.id}" role="button" tabindex="0" aria-label="View ${p.name} details">
                            ${saleTag}${newTag}
                            <img class="product-image-primary" src="${p.images.primary}" alt="${p.imageAlt}" width="800" height="1000" loading="lazy" decoding="async">
                            ${secondaryImg}
                            <button class="product-card-cta" data-quick-view="${p.id}" aria-label="View ${p.name}">
                                View details
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                        <div class="product-info">
                            <h3 class="product-name" data-open-product="${p.id}">${p.name}</h3>
                            <span class="product-meta">${p.attributes.length.label} · ${p.attributes.colour.label} · ${p.attributes.texture.label}</span>
                            <div class="product-price">
                                <span class="product-price-current">${price}</span>
                                ${compare}
                            </div>
                        </div>
                    </article>
                `;
                $('#product-modal-image').setAttribute('role', 'button');
                $('#product-modal-image').setAttribute('tabindex', '0');
                $('#product-modal-image').setAttribute('aria-label', `Open sample image viewer for ${p.name}`);
            }).join('');

            // Attach image fallbacks
            $$('#product-grid img').forEach(attachImageFallback);

            attachCardListeners();

            if (animate && !prefersReducedMotion()) {
                if (dim) {
                    grid.classList.add('is-transitioning');
                    requestAnimationFrame(() => {
                        grid.classList.remove('is-transitioning');
                    });
                }
                if (window.gsap) {
                    gsap.fromTo('.product-card',
                        { y: 24, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true }
                    );
                }
            }
        }

        function attachCardListeners() {
            // Full-card click / keyboard on the image wrapper and name
            $$('[data-open-product]').forEach(el => {
                if (el.dataset.bound) return;
                el.dataset.bound = '1';
                el.addEventListener('click', e => {
                    e.stopPropagation();
                    openProductModal(el.dataset.openProduct, el);
                });
                el.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProductModal(el.dataset.openProduct, el);
                    }
                });
            });
            // View details button (hover CTA)
            $$('[data-quick-view]').forEach(btn => {
                if (btn.dataset.bound) return;
                btn.dataset.bound = '1';
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    openProductModal(btn.dataset.quickView, btn);
                });
            });
        }

        // ---- Active filter chips ----
        function hasActiveFilters() {
            return ['length','colour','texture'].some(g => state.filters[g].length);
        }

        function renderActiveFilters() {
            const wrap = $('#active-filters');
            const chips = [];
            ['length', 'colour', 'texture'].forEach(group => {
                state.filters[group].forEach(val => {
                    const label = labelForFilter(group, val);
                    chips.push(`
                        <span class="active-chip">
                            ${label}
                            <button data-remove-filter="${group}" data-remove-value="${val}" aria-label="Remove ${label} filter">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </span>
                    `);
                });
            });
            const hasAny = chips.length > 0;
            wrap.innerHTML = chips.join('') + (hasAny ? `<button class="clear-all-btn" id="clear-all-chips">Clear all</button>` : '');

            $$('[data-remove-filter]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const g = btn.dataset.removeFilter;
                    const v = btn.dataset.removeValue;
                    state.filters[g] = state.filters[g].filter(x => x !== v);
                    state.pendingFilters[g] = [...state.filters[g]];
                    syncFilterChips();
                    renderActiveFilters();
                    renderGrid({ dim: true });
                });
            });
            const clearAll = $('#clear-all-chips');
            if (clearAll) clearAll.addEventListener('click', clearAllFilters);
        }

        function labelForFilter(group, val) {
            const map = {
                length: { short: 'Short', medium: 'Medium', long: 'Long' },
                colour: {
                    'jet-black': 'Jet Black', 'natural-black': 'Natural Black',
                    chocolate: 'Chocolate Brown', 'dark-brown': 'Dark Brown',
                    'honey-blonde': 'Honey Blonde', auburn: 'Auburn'
                },
                texture: { straight: 'Straight', wavy: 'Wavy', curly: 'Curly' }
            };
            return map[group]?.[val] || val;
        }

        function clearAllFilters() {
            state.filters = { length: [], colour: [], texture: [] };
            state.pendingFilters = { length: [], colour: [], texture: [] };
            syncFilterChips();
            renderActiveFilters();
            renderGrid({ dim: true });
        }

        function syncFilterChips() {
            $$('.filter-chips').forEach(group => {
                const g = group.dataset.filterGroup;
                group.querySelectorAll('.filter-chip').forEach(chip => {
                    const active = state.pendingFilters[g].includes(chip.dataset.value);
                    chip.classList.toggle('active', active);
                    chip.setAttribute('aria-pressed', String(active));
                });
            });
        }

        // ---- Category tabs ----
        $$('.shop-category').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('active')) return;
                $$('.shop-category').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                state.category = tab.dataset.category;
                renderGrid({ dim: true });
            });
        });

        // ---- Search (debounced) ----
        const searchInput = $('#shop-search');
        const searchClear = $('#search-clear');

        const debouncedSearch = debounce(value => {
            state.search = value;
            searchClear.classList.toggle('visible', value.length > 0);
            renderGrid({ dim: true });
        }, 220);

        searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            state.search = '';
            searchClear.classList.remove('visible');
            renderGrid({ dim: true });
            searchInput.focus();
        });

        $('#search-focus-btn').addEventListener('click', () => {
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => searchInput.focus(), prefersReducedMotion() ? 0 : 400);
        });

        // ---- Sort ----
        $('#shop-sort-select').addEventListener('change', e => {
            state.sort = e.target.value;
            renderGrid({ dim: true });
        });

        // ---- Focus trap helper ----
        function trapFocus(container) {
            const focusable = container.querySelectorAll(
                'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable.length) return () => {};
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            function handler(e) {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
            container.addEventListener('keydown', handler);
            return () => container.removeEventListener('keydown', handler);
        }
        let releaseFilterTrap = () => {};
        let releaseCartTrap = () => {};
        let releaseModalTrap = () => {};

        // ---- Filter drawer ----
        const filterDrawer = $('#filter-drawer');
        const filterBackdrop = $('#filter-backdrop');
        const filterBtn = $('#open-filter-btn');

        function openFilterDrawer() {
            state.lastFocused = document.activeElement;
            state.pendingFilters = {
                length: [...state.filters.length],
                colour: [...state.filters.colour],
                texture: [...state.filters.texture]
            };
            syncFilterChips();
            filterDrawer.classList.add('open');
            filterDrawer.setAttribute('aria-hidden', 'false');
            filterBackdrop.classList.add('open');
            filterBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            releaseFilterTrap = trapFocus(filterDrawer);
            setTimeout(() => $('#close-filter-btn').focus(), 100);
        }
        function closeFilterDrawer() {
            filterDrawer.classList.remove('open');
            filterDrawer.setAttribute('aria-hidden', 'true');
            filterBackdrop.classList.remove('open');
            filterBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            releaseFilterTrap();
            if (state.lastFocused) state.lastFocused.focus();
        }
        filterBtn.addEventListener('click', openFilterDrawer);
        $('#close-filter-btn').addEventListener('click', closeFilterDrawer);
        filterBackdrop.addEventListener('click', closeFilterDrawer);

        $$('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const group = chip.closest('.filter-chips').dataset.filterGroup;
                const val = chip.dataset.value;
                const arr = state.pendingFilters[group];
                const idx = arr.indexOf(val);
                if (idx >= 0) arr.splice(idx, 1);
                else arr.push(val);
                chip.classList.toggle('active');
                chip.setAttribute('aria-pressed', String(idx < 0));
            });
        });

        $('#apply-filters-btn').addEventListener('click', () => {
            state.filters = {
                length: [...state.pendingFilters.length],
                colour: [...state.pendingFilters.colour],
                texture: [...state.pendingFilters.texture]
            };
            renderActiveFilters();
            renderGrid({ dim: true });
            closeFilterDrawer();
        });
        $('#clear-filters-btn').addEventListener('click', () => {
            state.pendingFilters = { length: [], colour: [], texture: [] };
            syncFilterChips();
        });

        $('#empty-clear-btn').addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.remove('visible');
            state.search = '';
            clearAllFilters();
            if (state.category !== 'all') {
                $$('.shop-category').forEach(t => {
                    t.classList.toggle('active', t.dataset.category === 'all');
                    t.setAttribute('aria-selected', String(t.dataset.category === 'all'));
                });
                state.category = 'all';
                renderGrid({ dim: true });
            }
        });

        // ---- Cart ----
        function addToCart(id, qty) {
            const product = findProductById(id);
            if (!product || product.price === null) return;
            const current = state.cart[id] || 0;
            const next = Math.min(MAX_QUANTITY, current + Math.max(1, qty || 1));
            const added = next - current;
            state.cart[id] = next;
            saveCart();
            updateCartBadge();
            renderCart();
            showToast(added ? `${product.name} added to bag` : `${product.name} is already at the maximum quantity`);
            openCartDrawer();
        }

        function updateCartBadge() {
            const badge = $('#cart-badge');
            const qty = cartTotalQty();
            badge.textContent = qty;
            badge.classList.toggle('visible', qty > 0);
        }

        function renderCart() {
            const body = $('#cart-body');
            const summary = $('#cart-summary');

            if (!Object.keys(state.cart).length) {
                body.innerHTML = `
                    <div class="cart-empty">
                        <h3>Your bag is empty</h3>
                        <p>Add something beautiful to begin.</p>
                        <button id="cart-empty-continue">Continue exploring</button>
                    </div>
                `;
                summary.style.display = 'none';
                const cont = $('#cart-empty-continue');
                if (cont) cont.addEventListener('click', closeCartDrawer);
                return;
            }

            body.innerHTML = `
                <div class="cart-items">
                    ${Object.entries(state.cart).map(([id, qty]) => {
                        const p = findProductById(id);
                        if (!p) return '';
                        return `
                            <div class="cart-item">
                                <div class="cart-item-img">
                                    <img src="${p.images.primary}" alt="${p.imageAlt}" width="70" height="88" loading="lazy" style="object-position:${p.imagePosition}">
                                </div>
                                <div class="cart-item-info">
                                    <span class="cart-item-name">${p.name}</span>
                                    <span class="cart-item-meta">${p.attributes.material} · ${p.attributes.length.label}</span>
                                    <span class="cart-item-price">Sample price: ${fmtR(p.price)}</span>
                                    <div class="cart-item-qty">
                                        <button class="qty-btn" data-qty-dec="${p.id}" aria-label="Decrease quantity" ${qty <= 1 ? 'disabled' : ''}>−</button>
                                        <span class="qty-value">${qty}</span>
                                        <button class="qty-btn" data-qty-inc="${p.id}" aria-label="Increase quantity" ${qty >= MAX_QUANTITY ? 'disabled' : ''}>+</button>
                                    </div>
                                </div>
                                <div>
                                    <span class="cart-item-price">${fmtR(p.price * qty)}</span>
                                    <button class="cart-item-remove" data-remove-item="${p.id}">Remove</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            $$('#cart-body img').forEach(attachImageFallback);

            const subtotal = Object.entries(state.cart).reduce((sum, [id, qty]) => {
                const product = findProductById(id);
                return sum + (product && product.price !== null ? product.price * qty : 0);
            }, 0);
            $('#cart-subtotal').textContent = fmtR(subtotal);
            summary.style.display = 'block';

            $$('[data-qty-dec]').forEach(b => b.addEventListener('click', () => {
                const id = b.dataset.qtyDec;
                if (!state.cart[id] || state.cart[id] <= 1) return;
                state.cart[id] -= 1;
                saveCart(); updateCartBadge(); renderCart();
            }));
            $$('[data-qty-inc]').forEach(b => b.addEventListener('click', () => {
                const id = b.dataset.qtyInc;
                if (!state.cart[id] || state.cart[id] >= MAX_QUANTITY) return;
                state.cart[id] += 1;
                saveCart(); updateCartBadge(); renderCart();
            }));
            $$('[data-remove-item]').forEach(b => b.addEventListener('click', () => {
                delete state.cart[b.dataset.removeItem];
                saveCart(); updateCartBadge(); renderCart();
                showToast('Item removed');
            }));
        }

        // ---- Browser-only order request ----
        let orderSubmitting = false;
        let recentOrderMemory = null;

        function cartSubtotal() {
            return Object.entries(state.cart).reduce((total, [id, qty]) => {
                const product = findProductById(id);
                return total + (product && product.price !== null ? product.price * qty : 0);
            }, 0);
        }

        function renderOrderLines(container, editable) {
            container.innerHTML = Object.entries(state.cart).map(([id, qty]) => {
                const product = findProductById(id);
                if (!product || product.price === null) return '';
                return `<div class="cart-item">
                    <div class="cart-item-img"><img src="${safeText(product.images.primary)}" alt="${safeText(product.imageAlt)}" width="70" height="88" loading="lazy" style="object-position:${safeText(product.imagePosition)}"></div>
                    <div class="cart-item-info">
                        <span class="cart-item-name">${safeText(product.name)}</span>
                        <span class="cart-item-meta">${safeText(product.attributes.material)} · ${safeText(product.attributes.length.label)}</span>
                        <span class="cart-item-price">Sample price: ${fmtR(product.price)}</span>
                        ${editable ? `<div class="cart-item-qty">
                            <button class="qty-btn" data-checkout-dec="${safeText(id)}" aria-label="Decrease quantity" ${qty <= 1 ? 'disabled' : ''}>−</button>
                            <span class="qty-value">${qty}</span>
                            <button class="qty-btn" data-checkout-inc="${safeText(id)}" aria-label="Increase quantity" ${qty >= MAX_QUANTITY ? 'disabled' : ''}>+</button>
                        </div>` : `<span>Quantity: ${qty}</span>`}
                    </div>
                    <div><span class="cart-item-price">${fmtR(product.price * qty)}</span>
                    ${editable ? `<button class="cart-item-remove" data-checkout-remove="${safeText(id)}">Remove</button>` : ''}</div>
                </div>`;
            }).join('');
            container.querySelectorAll('img').forEach(attachImageFallback);
        }

        function renderCheckout() {
            const empty = Object.keys(state.cart).length === 0;
            const lines = $('#checkout-lines');
            lines.innerHTML = empty
                ? '<div class="cart-empty"><h2>Your bag is empty</h2><p>Add a sample product to make an order request.</p><a href="shopping-index.html#/shop">Browse the sample collection</a></div>'
                : '';
            $('#checkout-form').hidden = empty;
            if (!empty) renderOrderLines(lines, true);
            $('#checkout-subtotal').textContent = fmtR(cartSubtotal());
        }

        function createOrderReference(now) {
            const random = new Uint8Array(5);
            if (window.crypto?.getRandomValues) {
                window.crypto.getRandomValues(random);
            } else {
                random.forEach((_, index) => { random[index] = Math.floor(Math.random() * 256); });
            }
            const suffix = [...random].map(byte => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join('');
            return `GB-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${suffix}`;
        }

        function saveRecentOrder(order) {
            try {
                sessionStorage.setItem('gb_last', JSON.stringify(order));
                recentOrderMemory = order;
                return true;
            } catch (error) {
                console.error('Could not save the order request in this browser session.', error);
                recentOrderMemory = order;
                showToast('This browser cannot retain your order after this session.');
                return true;
            }
        }

        function readRecentOrder() {
            try {
                const order = JSON.parse(sessionStorage.getItem('gb_last') || 'null') || recentOrderMemory;
                return order && typeof order.reference === 'string' && Array.isArray(order.items) ? order : null;
            } catch (error) {
                console.error('Could not read the recent order request.', error);
                return recentOrderMemory;
            }
        }

        function renderThanks() {
            const order = readRecentOrder();
            const lines = $('#thanks-lines');
            if (!order) {
                $('#thanks-page h1').textContent = 'No recent order';
                $('#thanks-page > .container > p').textContent = 'There is no saved order request in this browser session.';
                $('#thanks-page').querySelectorAll('section, #thanks-lines, #thanks-reference, #copy-reference, #download-order-pdf, #print-order').forEach(element => {
                    element.hidden = true;
                });
                return;
            }
            $('#thanks-page h1').textContent = 'Order request received';
            $('#thanks-page > .container > p').textContent = 'This is an order request. It is confirmed once payment is received.';
            $('#thanks-page').querySelectorAll('section, #thanks-lines, #thanks-reference, #copy-reference, #download-order-pdf, #print-order').forEach(element => {
                element.hidden = false;
            });
            $('#thanks-reference').textContent = order.reference;
            $('#eft-reference').textContent = order.reference;
            $('#eft-bank').textContent = SAMPLE_EFT_DETAILS.bank;
            $('#eft-account-name').textContent = SAMPLE_EFT_DETAILS.accountName;
            $('#eft-account-number').textContent = SAMPLE_EFT_DETAILS.accountNumber;
            $('#eft-branch-code').textContent = SAMPLE_EFT_DETAILS.branchCode;
            $('#eft-amount').textContent = fmtR(order.subtotal);
            $('#thanks-subtotal').textContent = fmtR(order.subtotal);
            lines.innerHTML = order.items.map(item => `<div class="cart-item">
                <div class="cart-item-img"><img src="${safeText(item.imagePath)}" alt="${safeText(item.name)}" width="70" height="88" loading="lazy" style="object-position:${safeText(item.imagePosition)}"></div>
                <div class="cart-item-info"><span class="cart-item-name">${safeText(item.name)}</span><span class="cart-item-meta">${safeText(item.material)}</span><span>Quantity: ${item.quantity}</span><span class="cart-item-price">${fmtR(item.unitPrice * item.quantity)}</span></div>
            </div>`).join('');
            lines.querySelectorAll('img').forEach(attachImageFallback);
        }

        async function createPdfPhoto(item) {
            if (!/^https?:$/.test(window.location.protocol)) return null;
            return new Promise(resolve => {
                let settled = false;
                const finish = value => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeout);
                    resolve(value);
                };
                const image = new Image();
                const timeout = setTimeout(() => finish(null), 2500);
                image.crossOrigin = 'anonymous';
                image.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 120;
                        canvas.height = 160;
                        const context = canvas.getContext('2d');
                        if (!context) return finish(null);
                        const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
                        const sourceWidth = canvas.width / scale;
                        const sourceHeight = canvas.height / scale;
                        const [xValue, yValue] = (item.imagePosition || '50% 50%').split(/\s+/);
                        const xFocus = Number.parseFloat(xValue) / (xValue?.includes('%') ? 100 : 1);
                        const yFocus = Number.parseFloat(yValue) / (yValue?.includes('%') ? 100 : 1);
                        const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth,
                            (image.naturalWidth - sourceWidth) * (Number.isFinite(xFocus) ? xFocus : 0.5)));
                        const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight,
                            (image.naturalHeight - sourceHeight) * (Number.isFinite(yFocus) ? yFocus : 0.5)));
                        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
                        finish(canvas.toDataURL('image/jpeg', 0.82));
                    } catch {
                        finish(null);
                    }
                };
                image.onerror = () => finish(null);
                image.src = item.imagePath;
            });
        }

        async function downloadOrderPdf() {
            const order = readRecentOrder();
            const JsPDF = window.jspdf?.jsPDF;
            if (!order || !JsPDF) {
                window.print();
                return;
            }
            try {
                const pdf = new JsPDF({ unit: 'mm', format: 'a4' });
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let y = 18;
                const addTableHeading = () => {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Item', 46, y);
                    pdf.text('Qty', pageWidth - 57, y);
                    pdf.text('Line total', pageWidth - 15, y, { align: 'right' });
                    y += 5;
                    pdf.line(15, y, pageWidth - 15, y);
                    y += 5;
                    pdf.setFont('helvetica', 'normal');
                };
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(18);
                pdf.text('GIVEN BEAUTY', 15, y);
                y += 9;
                pdf.setFontSize(14);
                pdf.text('Order request', 15, y);
                y += 8;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.text(`Payment reference: ${order.reference}`, 15, y);
                y += 6;
                pdf.text(`Customer: ${order.customerName}`, 15, y);
                y += 6;
                pdf.text(`Date: ${new Date(order.timestamp).toLocaleString('en-ZA')}`, 15, y);
                y += 12;
                addTableHeading();
                for (const item of order.items) {
                    const nameLines = pdf.splitTextToSize(item.name, pageWidth - 115);
                    const materialLines = pdf.splitTextToSize(item.material, pageWidth - 115);
                    const rowHeight = Math.max(32, 8 + (nameLines.length + materialLines.length) * 4);
                    if (y + rowHeight > pageHeight - 58) {
                        pdf.addPage();
                        y = 18;
                        addTableHeading();
                    }
                    const photo = await createPdfPhoto(item);
                    if (photo) pdf.addImage(photo, 'JPEG', 15, y, 24, 30);
                    pdf.text(nameLines, 44, y + 4);
                    pdf.setFontSize(8);
                    pdf.text(materialLines, 44, y + 8 + nameLines.length * 4);
                    pdf.setFontSize(10);
                    pdf.text(String(item.quantity), pageWidth - 57, y + 7);
                    pdf.text(fmtR(item.unitPrice * item.quantity), pageWidth - 15, y + 7, { align: 'right' });
                    y += rowHeight;
                }
                if (y > pageHeight - 60) {
                    pdf.addPage();
                    y = 18;
                }
                pdf.line(15, y, pageWidth - 15, y);
                y += 8;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Subtotal: ${fmtR(order.subtotal)}`, pageWidth - 15, y, { align: 'right' });
                y += 12;
                pdf.setFontSize(12);
                pdf.text('SAMPLE EFT details — placeholders', 15, y);
                y += 7;
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                const eftLines = [
                    `Bank: ${SAMPLE_EFT_DETAILS.bank}`,
                    `Account name: ${SAMPLE_EFT_DETAILS.accountName}`,
                    `Account number: ${SAMPLE_EFT_DETAILS.accountNumber}`,
                    `Branch code: ${SAMPLE_EFT_DETAILS.branchCode}`,
                    `Reference: ${order.reference}`,
                    `Amount: ${fmtR(order.subtotal)}`
                ];
                eftLines.forEach(line => {
                    if (y > pageHeight - 28) {
                        pdf.addPage();
                        y = 18;
                    }
                    pdf.text(line, 15, y);
                    y += 5;
                });
                y += 3;
                pdf.setFont('helvetica', 'bold');
                const notice = 'This is an order request and is confirmed once payment is received. Delivery cost, stock hold time and confirmation email are to be confirmed.';
                const noticeLines = pdf.splitTextToSize(notice, pageWidth - 30);
                if (y + noticeLines.length * 5 > pageHeight - 12) {
                    pdf.addPage();
                    y = 18;
                }
                pdf.text(noticeLines, 15, y);
                pdf.save(`GivenBeauty-${order.reference}.pdf`);
            } catch (error) {
                console.error('Could not generate the order request PDF.', error);
                window.print();
            }
        }

        $('#copy-reference').addEventListener('click', () => {
            const reference = $('#thanks-reference').textContent;
            if (!navigator.clipboard?.writeText) {
                $('#copy-status').textContent = 'Copy is unavailable; select and copy the reference above.';
                return;
            }
            navigator.clipboard.writeText(reference).then(() => {
                $('#copy-status').textContent = 'Reference copied';
            }).catch(error => {
                console.error('Could not copy the payment reference.', error);
                $('#copy-status').textContent = 'Copy failed; select and copy the reference above.';
            });
        });
        $('#download-order-pdf').addEventListener('click', downloadOrderPdf);
        $('#print-order').addEventListener('click', () => window.print());

        function submitOrder(form) {
            if (orderSubmitting || !form.reportValidity()) return;
            const customerName = form.elements.name.value.trim();
            if (!customerName || !Object.keys(state.cart).length) return;
            orderSubmitting = true;
            $('#submit-order').disabled = true;
            const now = new Date();
            const order = {
                reference: createOrderReference(now),
                timestamp: now.toISOString(),
                customerName,
                items: Object.entries(state.cart).flatMap(([id, quantity]) => {
                    const product = findProductById(id);
                    if (!product || product.price === null) return [];
                    const view = product.images.views[0];
                    return [{
                        id: product.id,
                        name: product.name,
                        material: product.attributes.material,
                        imagePath: view.src,
                        imagePosition: view.pos,
                        unitPrice: product.price,
                        quantity
                    }];
                }),
                subtotal: cartSubtotal()
            };
            if (!order.items.length || !saveRecentOrder(order)) {
                orderSubmitting = false;
                $('#submit-order').disabled = false;
                return;
            }
            state.cart = {};
            saveCart();
            updateCartBadge();
            orderSubmitting = false;
            window.location.hash = '#/thanks';
        }

        $('#checkout-form').addEventListener('submit', event => {
            event.preventDefault();
            submitOrder(event.currentTarget);
        });
        $('#checkout-lines').addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const decrement = target.closest('[data-checkout-dec]');
            const increment = target.closest('[data-checkout-inc]');
            const remove = target.closest('[data-checkout-remove]');
            if (decrement && state.cart[decrement.dataset.checkoutDec] > 1) {
                state.cart[decrement.dataset.checkoutDec] -= 1;
            } else if (increment && state.cart[increment.dataset.checkoutInc] < MAX_QUANTITY) {
                state.cart[increment.dataset.checkoutInc] += 1;
            } else if (remove) {
                delete state.cart[remove.dataset.checkoutRemove];
                showToast('Item removed');
            } else {
                return;
            }
            saveCart();
            updateCartBadge();
            renderCheckout();
        });

        // ---- Cart drawer ----
        const cartDrawer = $('#cart-drawer');
        const cartBackdrop = $('#cart-backdrop');

        function openCartDrawer() {
            state.lastFocused = document.activeElement;
            renderCart();
            cartDrawer.classList.add('open');
            cartDrawer.setAttribute('aria-hidden', 'false');
            cartBackdrop.classList.add('open');
            document.body.style.overflow = 'hidden';
            releaseCartTrap = trapFocus(cartDrawer);
            setTimeout(() => $('#close-cart-btn').focus(), 100);
        }
        function closeCartDrawer() {
            cartDrawer.classList.remove('open');
            cartDrawer.setAttribute('aria-hidden', 'true');
            cartBackdrop.classList.remove('open');
            document.body.style.overflow = '';
            releaseCartTrap();
            if (state.lastFocused) state.lastFocused.focus();
        }
        $('#open-cart-btn').addEventListener('click', openCartDrawer);
        $('#close-cart-btn').addEventListener('click', closeCartDrawer);
        cartBackdrop.addEventListener('click', closeCartDrawer);

        // ---- Product modal + URL sync ----
        const productModal = $('#product-modal');

        function buildProductUrl(id) { return `#/p/${encodeURIComponent(id)}`; }
        function buildCleanUrl() { return '#/shop'; }

        function openProductModal(id, triggerEl, { updateUrl = true } = {}) {
            const p = findProductById(id);
            if (!p) return;
            state.currentProduct = p;
            state.modalQty = 1;
            state.lastFocused = triggerEl || document.activeElement;

            const img = $('#product-modal-img');
            img.src = p.images.primary;
            img.alt = p.imageAlt;
            img.style.objectPosition = p.imagePosition;
            img.classList.remove('img-error');

            $('#product-modal-label').textContent = p.category === 'wigs' ? 'Wig' : 'Collection';
            $('#product-modal-title').textContent = p.name;
            $('#product-modal-desc').textContent = p.description;
            $('#modal-qty').textContent = '1';
            $('#modal-add-to-bag').disabled = p.price === null;
            $('#modal-qty-dec').disabled = p.price === null;
            $('#modal-qty-inc').disabled = p.price === null;

            $('#product-modal-price').innerHTML = `
                <span>${p.price === null ? 'Price to be confirmed' : `Sample price: ${fmtR(p.price)}`}</span>
                ${p.comparePrice ? `<span class="compare">Sample ${fmtR(p.comparePrice)}</span>` : ''}
            `;

            $('#product-modal-attrs').innerHTML = `
                <div class="attr-item"><span class="attr-key">Length</span><span class="attr-val">${safeText(p.attributes.length.label)}</span></div>
                <div class="attr-item"><span class="attr-key">Colour</span><span class="attr-val">${safeText(p.attributes.colour.label)}</span></div>
                <div class="attr-item"><span class="attr-key">Texture</span><span class="attr-val">${safeText(p.attributes.texture.label)}</span></div>
                <div class="attr-item"><span class="attr-key">Material</span><span class="attr-val">${safeText(p.attributes.material)}</span></div>
                <div class="attr-item"><span class="attr-key">Availability</span><span class="attr-val">${safeText(p.availability)}</span></div>
            `;
            $('#product-thumbnails').innerHTML = p.images.views.map((view, index) => `
                <button type="button" data-product-view="${index}" aria-pressed="${index === 0}" aria-label="${safeText(view.label)}">
                    <img src="${safeText(view.src)}" alt="" width="48" height="60">
                </button>`).join('');
            $('#product-thumbnails').querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => setProductView(Number(button.dataset.productView)));
            });
            setProductView(0);

            productModal.classList.add('open');
            productModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            releaseModalTrap = trapFocus(productModal.querySelector('.product-modal-content'));
            setTimeout(() => $('#close-product-modal').focus(), 100);

            if (updateUrl) {
                history.pushState({ product: p.id }, '', buildProductUrl(p.id));
            }
        }

        function closeProductModal({ updateUrl = true } = {}) {
            if (!productModal.classList.contains('open')) return;
            productModal.classList.remove('open');
            productModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            releaseModalTrap();
            if (state.lastFocused) state.lastFocused.focus();
            state.currentProduct = null;
            if (updateUrl) {
                history.pushState({}, '', buildCleanUrl());
            }
        }

        let activeProductView = 0;
        function setProductView(index) {
            const product = state.currentProduct;
            if (!product?.images.views.length) return;
            activeProductView = (index + product.images.views.length) % product.images.views.length;
            const view = product.images.views[activeProductView];
            const image = $('#product-modal-img');
            image.src = view.src;
            image.alt = view.alt;
            image.style.objectPosition = view.pos;
            image.style.objectFit = view.fit;
            image.style.transform = `scale(${view.zoom})`;
            $('#product-thumbnails').querySelectorAll('[data-product-view]').forEach((button, buttonIndex) => {
                button.setAttribute('aria-pressed', String(buttonIndex === activeProductView));
            });
        }

        const lightbox = $('#image-lightbox');
        let lightboxOpener = null;
        function renderLightbox() {
            const product = state.currentProduct;
            if (!product) return;
            const view = product.images.views[activeProductView];
            $('#lightbox-image').src = view.src;
            $('#lightbox-image').alt = view.alt;
            $('#lightbox-image').style.objectPosition = view.pos;
            $('#lightbox-image').style.objectFit = view.fit;
            $('#lightbox-image').style.transform = `scale(${view.zoom})`;
            $('#lightbox-caption').textContent = `${view.label}, ${activeProductView + 1} of ${product.images.views.length}`;
            $('#lightbox-counter').textContent = `${activeProductView + 1} of ${product.images.views.length}`;
            $('#lightbox-thumbnails').innerHTML = product.images.views.map((item, index) => `
                <button type="button" data-lightbox-view="${index}" aria-current="${index === activeProductView}" aria-label="Show ${safeText(item.label)}">
                    <img src="${safeText(item.src)}" alt="" width="48" height="60">
                </button>`).join('');
        }
        function openLightbox(opener) {
            lightboxOpener = opener;
            renderLightbox();
            lightbox.classList.add('open');
            lightbox.showModal();
            $('#close-lightbox').focus();
        }
        function closeLightbox() {
            if (lightbox.open) lightbox.close();
            lightbox.classList.remove('open');
            if (lightboxOpener?.isConnected) lightboxOpener.focus();
            lightboxOpener = null;
        }
        $('#product-modal-image').addEventListener('click', event => openLightbox($('#product-modal-img')));
        $('#product-modal-image').addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openLightbox($('#product-modal-img'));
            }
        });
        $('#close-lightbox').addEventListener('click', closeLightbox);
        $('#lightbox-previous').addEventListener('click', () => {
            setProductView(activeProductView - 1);
            renderLightbox();
        });
        $('#lightbox-next').addEventListener('click', () => {
            setProductView(activeProductView + 1);
            renderLightbox();
        });
        $('#lightbox-thumbnails').addEventListener('click', event => {
            const button = event.target.closest('[data-lightbox-view]');
            if (!button) return;
            setProductView(Number(button.dataset.lightboxView));
            renderLightbox();
        });
        lightbox.addEventListener('click', event => {
            if (event.target === lightbox) closeLightbox();
        });
        lightbox.addEventListener('close', () => {
            lightbox.classList.remove('open');
            if (lightboxOpener?.isConnected) lightboxOpener.focus();
            lightboxOpener = null;
        });
        lightbox.addEventListener('keydown', event => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setProductView(activeProductView - 1);
                renderLightbox();
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setProductView(activeProductView + 1);
                renderLightbox();
            }
        });

        $('#close-product-modal').addEventListener('click', () => closeProductModal());
        productModal.addEventListener('click', e => {
            if (e.target === productModal) closeProductModal();
        });
        $('#modal-qty-dec').addEventListener('click', () => {
            state.modalQty = Math.max(1, state.modalQty - 1);
            $('#modal-qty').textContent = state.modalQty;
        });
        $('#modal-qty-inc').addEventListener('click', () => {
            state.modalQty = Math.min(MAX_QUANTITY, state.modalQty + 1);
            $('#modal-qty').textContent = state.modalQty;
        });
        $('#modal-add-to-bag').addEventListener('click', () => {
            if (!state.currentProduct || state.currentProduct.price === null) return;
            const id = state.currentProduct.id;
            closeProductModal();
            addToCart(id, state.modalQty);
        });

        // ---- Hash routes ----
        function setRouteSections(routeName) {
            const showingShop = routeName === 'shop' || routeName === 'product';
            $$('.shop-main > section').forEach(section => {
                if (['checkout-page', 'thanks-page', 'route-not-found'].includes(section.id)) return;
                section.hidden = !showingShop;
            });
            $('#checkout-page').hidden = routeName !== 'checkout';
            $('#thanks-page').hidden = routeName !== 'thanks';
            $('#route-not-found').hidden = routeName !== 'not-found';
        }

        function route() {
            const raw = window.location.hash || '#/shop';
            const segments = raw.startsWith('#/') ? raw.slice(2).split('/').filter(Boolean) : [];
            if (segments.length === 0) {
                window.location.replace('../story/story-index.html');
                return;
            }
            const routeName = segments[0];
            let heading;
            if (cartDrawer.classList.contains('open')) closeCartDrawer();
            if (routeName === 'shop' && segments.length === 1) {
                closeProductModal({ updateUrl: false });
                setRouteSections('shop');
                heading = $('.shop-intro-content h1');
                document.title = 'Shop sample collection | Given Beauty';
            } else if (routeName === 'checkout' && segments.length === 1) {
                closeProductModal({ updateUrl: false });
                setRouteSections('checkout');
                renderCheckout();
                heading = $('#checkout-page h1');
                document.title = 'Order request | Given Beauty';
            } else if (routeName === 'thanks' && segments.length === 1) {
                closeProductModal({ updateUrl: false });
                setRouteSections('thanks');
                renderThanks();
                heading = $('#thanks-page h1');
                document.title = 'Order request confirmation | Given Beauty';
            } else if (routeName === 'p' && segments.length === 2) {
                let id = '';
                try { id = decodeURIComponent(segments[1]); } catch { id = ''; }
                const product = findProductById(id);
                if (!product) {
                    closeProductModal({ updateUrl: false });
                    setRouteSections('not-found');
                    heading = $('#route-not-found h1');
                    heading.textContent = 'Product not found';
                    $('#route-not-found p').textContent = 'That product is not in the sample catalogue.';
                    document.title = 'Product not found | Given Beauty';
                } else {
                    setRouteSections('product');
                    if (state.currentProduct?.id !== product.id || !productModal.classList.contains('open')) {
                        openProductModal(product.id, null, { updateUrl: false });
                    }
                    heading = $('#product-modal-title');
                    document.title = `${product.name} | Given Beauty`;
                }
            } else {
                closeProductModal({ updateUrl: false });
                setRouteSections('not-found');
                heading = $('#route-not-found h1');
                $('#route-not-found h1').textContent = 'Page not found';
                $('#route-not-found p').textContent = 'That page is not in the sample shop.';
                document.title = 'Page not found | Given Beauty';
            }
            updateCartBadge();
            window.scrollTo(0, 0);
            if (heading) {
                heading.setAttribute('tabindex', '-1');
                heading.focus({ preventScroll: true });
            }
        }

        window.addEventListener('hashchange', route);
        window.addEventListener('popstate', route);

        // ---- Escape key ----
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (lightbox.open) {
                    closeLightbox();
                    return;
                }
                if (filterDrawer.classList.contains('open')) closeFilterDrawer();
                if (cartDrawer.classList.contains('open')) closeCartDrawer();
                if (productModal.classList.contains('open')) closeProductModal();
            }
        });

        // ---- Toast ----
        let toastTimer;
        function showToast(msg) {
            $('#toast-msg').textContent = msg;
            $('#toast').classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600);
        }

        // ---- Header scrolled state ----
        window.addEventListener('scroll', () => {
            $('#shop-header').classList.toggle('scrolled', window.scrollY > 50);
        }, { passive: true });

        // ---- Mobile menu ----
        const mobileMenu = $('#mobile-menu-overlay');
        $('#mobile-menu-btn').addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        $('#close-mobile-menu').addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });

        // ---- Initial render ----
        updateCartBadge();
        updateCategoryCounts();
        renderGrid({ animate: true });
        renderActiveFilters();
        renderCart();
        route();
