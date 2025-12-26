/**
 * Whiz Discount Rules - Offer Popup Handler (debounced + cancellable requests)
 */
(function ($) {
    'use strict';

    let lastOfferHash = null;
    let checking = false;
    let timer = null;

    // ניהול ביטול בקשות מתבצעות
    let inflightXhr = null;
    let reqSeq = 0;          // מזהה ריצה עדכני
    let lastHandledSeq = 0;  // המזהה האחרון שטופל (למניעת מרוצים)

    // זוכרים הצעה שהודחקה (decline/סגירה) עד ליציאה מזכאות
    let suppressedOfferHash = sessionStorage.getItem('whizDR_suppressedHash') || null;

    // נעקוב גם אחרי שינוי בכמות הכוללת כדי לזהות יציאה מזכאות כשלא הספקנו למשוך מהשרת בזמן
    let lastCartCount = null;

    // --- debounce utility ---
    function debounce(fn, wait) {
        let t;
        return function () {
            const ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    // זמנים נוחים לשינוי
    const DELAY_NET_IDLE = 120;   // דיפולט לבדיקה אחרי אירועי רשת/איוונטים כלליים
    const DELAY_CLICK = 220;      // לחיצות +/– (בדיקה קצרה אחרי שמפסיקים ללחוץ)
    const DELAY_INPUT = 320;      // הקלדה ידנית בשדה כמות

    // הפקת hash יציב להצעה (מעדיף offer.hash אם קיים)
    function getOfferHash(offer) {
        if (!offer) return null;
        if (offer.hash) return String(offer.hash);
        return JSON.stringify({
            id: offer.id || null,
            message: offer.message || '',
            sku: offer.sku || null
        });
    }

    function setSuppressed(hash) {
        suppressedOfferHash = hash || null;
        if (suppressedOfferHash) {
            sessionStorage.setItem('whizDR_suppressedHash', suppressedOfferHash);
        } else {
            sessionStorage.removeItem('whizDR_suppressedHash');
        }
    }

    function hasModal() {
        return $('#whiz-offer-modal').length > 0;
    }

    // תזמון בדיקה – עם ביטול בקשה קיימת
    function scheduleCheck(delay = DELAY_NET_IDLE) {
        // אם יש בקשה שרצה – לבטל כדי שלא תחזיר תשובה שאינה רלוונטית
        if (inflightXhr && typeof inflightXhr.abort === 'function') {
            try { inflightXhr.abort(); } catch (e) { }
            inflightXhr = null;
        }
        // נבטל גם טיימר קודם
        if (timer) clearTimeout(timer);

        // שחרר "checking" כדי שהבדיקה החדשה לא תיחסם ע"י הפלג הקודם
        checking = false;

        timer = setTimeout(checkForOffer, delay);
    }

    // ---------- Core ----------
    function checkForOffer() {
        if (!hasModal()) {
            // המודאל נטען ב-wp_footer, לפעמים מגיע מילישניות אחרי ה-JS
            setTimeout(checkForOffer, 120);
            // אל תפסיק; תמשיך גם בלי מודאל כדי לאתחל state בצד שרת
        }
        if (checking) return;

        checking = true;
        const mySeq = ++reqSeq; // מזהה לריצה הזו

        // לוודא שאין בקשת עבר רצה
        if (inflightXhr && typeof inflightXhr.abort === 'function') {
            try { inflightXhr.abort(); } catch (e) { }
            inflightXhr = null;
        }

        inflightXhr = $.ajax({
            url: whizDR.apiBase + '/offer',
            type: 'GET',
            headers: { 'X-WP-Nonce': whizDR.nonce }
        })
            .done(function (response) {
                // *** חשוב: לא נפסיק לעבד תשובת "אין הצעה" גם אם זו לא האחרונה, כדי לאפס דחייה במקרה שפספסנו את חלון אי-הזכאות ***
                const offer = response && response.offer ? response.offer : null;

                // אין הצעה/לא דורש פופ-אפ => יציאה ממצב זכאות -> מאפסים הדחקה
                if (!offer || !offer.requiresPopup) {
                    lastOfferHash = null;
                    setSuppressed(null);
                    hideOfferModal();
                    return; // אין מה להמשיך
                }

                // יש הצעה
                // אם ההצעה הודחקה כבר — אל תפתח שוב, עד שנצא מזכאות (נאתחל ע"י clear למעלה כשאין הצעה)
                const oHash = getOfferHash(offer);
                if (suppressedOfferHash && oHash === suppressedOfferHash) {
                    return;
                }

                // אותה הצעה בדיוק שכבר פתחנו? לא לפתוח שוב
                if (oHash && oHash === lastOfferHash) return;

                lastOfferHash = oHash || null;
                showOfferModal(offer);
            })
            .fail(function (xhr) {
                // אם זה abort – מתעלמים בשקט
                if (xhr && xhr.statusText === 'abort') return;
            })
            .always(function () {
                // ננקה רק אם זו הבקשה האחרונה שביצענו
                if (mySeq >= lastHandledSeq) {
                    lastHandledSeq = mySeq;
                    checking = false;
                    inflightXhr = null;
                }
            });
    }

    function showOfferModal(offer) {
        const $modal = $('#whiz-offer-modal');
        if (!$modal.length) return;

        if (offer.message) {
            $('#whiz-offer-message').html(offer.message);
        }

        $modal.attr('aria-hidden', 'false').fadeIn(180);
        $('body').addClass('whiz-offer-modal-open').css('overflow', 'hidden');
        $('#whiz-offer-accept').focus();
    }

    function hideOfferModal() {
        const $modal = $('#whiz-offer-modal');
        if (!$modal.length) return;
        $modal.attr('aria-hidden', 'true').fadeOut(140);
        $('body').removeClass('whiz-offer-modal-open').css('overflow', '');
    }

    function acceptOffer() {
        const $accept = $('#whiz-offer-accept');
        const $decline = $('#whiz-offer-decline');

        $accept.prop('disabled', true).text('מוסיף...');
        $decline.prop('disabled', true);

        $.ajax({
            url: whizDR.apiBase + '/offer',
            type: 'POST',
            headers: { 'X-WP-Nonce': whizDR.nonce },
            data: { action: 'accept' }
        })
            .done(function (res) {
                if (res && (res.added === true || res.accepted === true)) {
                    hideOfferModal();
                    showNotice('המוצר נוסף לעגלה בהצלחה!', true);

                    // Woo classic
                    $(document.body).trigger('wc_fragment_refresh');
                    $(document.body).trigger('updated_wc_div');

                    // Woo Blocks
                    try {
                        if (window.wp && wp.data && wp.data.dispatch) {
                            const d = wp.data.dispatch('wc/store');
                            if (d && d.invalidateResolution) {
                                d.invalidateResolution('getCart');
                                d.invalidateResolution('getCartTotals');
                            }
                        }
                    } catch (e) { }

                    // Fallback: אם אין מיני-קארט/לא נראה שינוי—רענון מלא
                    setTimeout(function () {
                        try {
                            const mini = $('.widget_shopping_cart, .wc-block-mini-cart');
                            if (!mini.length) location.reload();
                        } catch (e) { location.reload(); }
                    }, 800);
                } else {
                    showNotice('לא ניתן היה להוסיף את ההצעה לעגלה.', false);
                }
            })
            .fail(function (xhr) {
                let msg = 'שגיאה בהוספת המוצר. נסה שוב.';
                if (xhr && xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showNotice(msg, false);
            })
            .always(function () {
                $accept.prop('disabled', false).text('הוסף לעגלה');
                $decline.prop('disabled', false);
            });
    }

    function declineOffer() {
        // סוגרים מיד, ולא מחכים לרשת
        const toSuppress = lastOfferHash;
        hideOfferModal();
        setSuppressed(toSuppress); // לא נקפוץ שוב עד שנזהה יציאה מזכאות
        lastOfferHash = null;

        // קריאה לשרת ברקע (fire-and-forget)
        $.ajax({
            url: whizDR.apiBase + '/offer',
            type: 'POST',
            headers: { 'X-WP-Nonce': whizDR.nonce },
            data: { action: 'decline' }
        });
    }

    function showNotice(message, success) {
        const cls = success ? 'woocommerce-message' : 'woocommerce-error';
        const $n = $(
            `<div class="${cls}" style="position:fixed;top:20px;right:20px;z-index:10000;background:${success ? '#27ae60' : '#e74c3c'};color:#fff;padding:15px;border-radius:5px;box-shadow:0 2px 10px rgba(0,0,0,.2);">${message}</div>`
        );
        $('body').append($n);
        setTimeout(() => $n.fadeOut(220, () => $n.remove()), success ? 2400 : 3400);
    }

    // ---------- WooCommerce Blocks: subscribe ל־store ----------
    function wireStoreSubscription() {
        try {
            if (!window.wp || !wp.data || !wp.data.select || !wp.data.subscribe) return;
            const STORE = 'wc/store';
            if (!wp.data.select(STORE) || !wp.data.select(STORE).getCart) return;

            let prevSig = null;
            wp.data.subscribe(function () {
                try {
                    const sel = wp.data.select(STORE);
                    const cart = sel.getCart && sel.getCart();
                    if (!cart) return;

                    // חתימת עגלה קצרה (מפתח:כמות)
                    const sig =
                        (cart.items || [])
                            .map((i) => `${i.key}:${i.quantity}`)
                            .sort()
                            .join('|') +
                        '::' +
                        (cart.totals ? cart.totals.total_items : '');

                    // מעקב אחרי כמות כוללת לצורך איפוס הדחייה כאשר יש הורדה בכמות (הסתברות גבוהה ליציאה מזכאות)
                    const currentCount = cart.totals ? cart.totals.total_items : null;
                    if (lastCartCount === null) lastCartCount = currentCount;

                    if (currentCount !== null && lastCartCount !== null) {
                        // אם יש דחייה פעילה והכמות ירדה – נניח שיצאנו מזכאות => ננקה דחייה.
                        if (suppressedOfferHash && currentCount < lastCartCount) {
                            setSuppressed(null);
                        }
                    }
                    lastCartCount = currentCount;

                    if (prevSig !== null && sig !== prevSig) {
                        scheduleCheck(DELAY_NET_IDLE);
                    }
                    prevSig = sig;
                } catch (e) { }
            });
        } catch (e) { }
    }

    // ---------- יירוט fetch (Blocks) ----------
    function patchFetch() {
        if (!window.fetch || window.__whizDR_fetchPatched) return;
        window.__whizDR_fetchPatched = true;

        const orig = window.fetch;
        window.fetch = function (input, init) {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const method = (init && init.method) || (input && input.method) || 'GET';
            const isStoreCart = url.indexOf('/wc/store/') !== -1 && url.indexOf('/cart') !== -1;
            const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(String(method).toUpperCase()) !== -1;

            return orig.apply(this, arguments).then((res) => {
                try {
                    if (isStoreCart && mutating) scheduleCheck(DELAY_NET_IDLE);
                } catch (e) { }
                return res;
            });
        };
    }

    // ---------- יירוט XHR (wc-ajax קלאסי ותוספים) ----------
    function patchXHR() {
        if (window.__whizDR_xhrPatched) return;
        window.__whizDR_xhrPatched = true;

        const XHR = window.XMLHttpRequest;
        const open = XHR.prototype.open;
        const send = XHR.prototype.send;

        XHR.prototype.open = function (method, url) {
            this.__whiz_url = url;
            this.__whiz_method = method;
            return open.apply(this, arguments);
        };
        XHR.prototype.send = function () {
            this.addEventListener('loadend', () => {
                try {
                    const url = this.__whiz_url || '';
                    const method = String(this.__whiz_method || 'GET').toUpperCase();
                    const isWcAjax = url.indexOf('wc-ajax=') !== -1;
                    const wcHits = [
                        'update_cart',
                        'apply_coupon',
                        'remove_coupon',
                        'remove_cart_item',
                        'restore_cart_item',
                        'get_refreshed_fragments',
                        'get_cart_totals',
                        'update_shipping_method'
                    ];
                    const isBlocks =
                        url.indexOf('/wc/store/') !== -1 &&
                        url.indexOf('/cart') !== -1 &&
                        ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) !== -1;

                    if (isBlocks || (isWcAjax && wcHits.some((h) => url.indexOf(h) !== -1))) {
                        scheduleCheck(DELAY_NET_IDLE);
                    }
                } catch (e) { }
            });
            return send.apply(this, arguments);
        };
    }

    // ---------- Event wiring ----------
    $(document).ready(function () {
        // טריגרים סטנדרטיים של WooCommerce (jQuery)
        $(document.body).on(
            'added_to_cart updated_wc_div updated_cart_totals wc_fragments_refreshed removed_from_cart',
            function () {
                scheduleCheck(DELAY_NET_IDLE);
            }
        );

        // לחיצות +/– → בדיקה אחרי שהמשתמש מפסיק ללחוץ (debounce ע"י התזמון)
        $(document).on(
            'click',
            '.quantity .plus, .quantity .minus, .wc-block-components-quantity-selector__button',
            function () { scheduleCheck(DELAY_CLICK); }
        );

        // הקלדה ידנית בשדה כמות → debounce קצר
        const qtyInputDebounced = debounce(function () {
            scheduleCheck(DELAY_INPUT);
        }, DELAY_INPUT);
        $(document).on('input change', '.quantity input.qty, input.qty', qtyInputDebounced);

        // “עדכן עגלה” (classic) – מאפס דחייה כי המשתמש אישר עדכון מפורש
        $(document).on('submit', 'form.woocommerce-cart-form', function () {
            sessionStorage.setItem('whizDR_needsCheck', '1');
            setSuppressed(null);
        });
        $(document).on('click', 'button[name="update_cart"], .woocommerce-cart-form a.remove', function () {
            sessionStorage.setItem('whizDR_needsCheck', '1');
            setSuppressed(null);
        });

        // תמיכה ב־Blocks/Fetch/XHR
        patchFetch();
        patchXHR();
        wireStoreSubscription();

        // אם הייתה שליחה/רענון מלא (classic) – בדיקה אחת אחרי הטעינה
        if (hasModal() && sessionStorage.getItem('whizDR_needsCheck') === '1') {
            sessionStorage.removeItem('whizDR_needsCheck');
            scheduleCheck(60);
        }
    });

    // מודאל – פעולות ונגישות
    $(document).on('click', '#whiz-offer-accept', acceptOffer);
    $(document).on('click', '#whiz-offer-decline', declineOffer);
    $(document).on('click', '#whiz-offer-modal', function (e) {
        if (e.target === this) declineOffer();
    });
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && $('#whiz-offer-modal').is(':visible')) {
            declineOffer();
        }
    });
})(jQuery);
