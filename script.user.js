// ==UserScript==
// @name         CSFloat -> Clipboard (Smart Wear)
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Kopiuje nazwę itemu + CTRL+Click otwiera CSGOEmpire search (auto-fill)
// @author       Gemini
// @match        https://csfloat.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/regov124356/csfloat-empire-tools/main/script.user.js
// @updateURL    https://raw.githubusercontent.com/regov124356/csfloat-empire-tools/main/script.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "empire_rate";
    const EMPIRE_SEARCH_KEY = "empire_search";

    const WEARS = [
        "Factory New",
        "Minimal Wear",
        "Field-Tested",
        "Well-Worn",
        "Battle-Scarred"
    ];

    // ==========================================
    // LOGIKA KLIKANIA
    // ==========================================
    function setupItemClicker() {
        document.addEventListener('click', (e) => {
            const targetHeader = e.target.closest('mat-card > div > div:first-child');
            if (!targetHeader || !targetHeader.querySelector('app-item-name')) return;

            const nameEl = targetHeader.querySelector('.item-name');
            const subtextEl = targetHeader.querySelector('.subtext');

            if (!nameEl) return;

            let itemName = nameEl.innerText.trim();

            // usuń ★
            itemName = itemName.replace(/^★\s*/, '');

            let subtext = subtextEl ? subtextEl.innerText.trim() : "";
            let finalQuery = itemName;

            const foundWear = WEARS.find(wear => subtext.includes(wear));
            if (foundWear) {
                finalQuery += ` (${foundWear})`;
            }

            // ==========================================
            // CTRL + CLICK → Empire + auto search
            // ==========================================
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();

                // zapisujemy query do sessionStorage
                sessionStorage.setItem(EMPIRE_SEARCH_KEY, finalQuery);

                // otwieramy stronę (bez URL search, bo nie działa)
                window.open("https://csgoempire.com/withdrawals", "_blank");

                console.log("Empire auto-search queued:", finalQuery);
                return;
            }

            // ==========================================
            // NORMAL CLICK → COPY
            // ==========================================
            navigator.clipboard.writeText(finalQuery)
                .then(() => {
                    console.log("Skopiowano:", finalQuery);

                    const originalBg = targetHeader.style.background;
                    targetHeader.style.background = "rgba(76, 175, 80, 0.3)";

                    setTimeout(() => {
                        targetHeader.style.background = originalBg;
                    }, 300);
                })
                .catch(err => console.error("Clipboard error:", err));

        }, true);
    }

    // ==========================================
    // STYLE
    // ==========================================
    function injectStyles() {
        const style = document.createElement('style');

        style.innerHTML = `
            mat-card > div > div:first-child:has(app-item-name) {
                cursor: copy !important;
                transition: background 0.2s;
                border-radius: 4px;
            }

            mat-card > div > div:first-child:has(app-item-name):hover {
                background: rgba(255,255,255,0.07) !important;
            }
        `;

        document.head.appendChild(style);
    }

    // ==========================================
    // RATE UI
    // ==========================================
    function createInput() {
        if (document.getElementById("empire-rate-ui")) return;

        const container = document.createElement("div");
        container.id = "empire-rate-ui";
        container.style = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
            background: #111;
            padding: 8px 12px;
            border-radius: 8px;
            color: white;
            font-size: 12px;
            border: 1px solid #444;
        `;

        const input = document.createElement("input");
        input.type = "number";
        input.style = `
            width: 70px;
            background: #222;
            color: white;
            border: 1px solid #444;
            margin-left: 5px;
        `;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) input.value = saved;

        input.addEventListener("input", () => {
            localStorage.setItem(STORAGE_KEY, input.value);
            updatePrices();
        });

        container.appendChild(document.createTextNode("Rate: "));
        container.appendChild(input);

        document.body.appendChild(container);
    }

    // ==========================================
    // PRICE CONVERTER
    // ==========================================
    function updatePrices() {
        const rate = parseFloat(localStorage.getItem(STORAGE_KEY));
        if (!rate) return;

        document.querySelectorAll(".mat-column-price, .price").forEach(cell => {
            if (cell.dataset.converted) return;

            const text = cell.innerText
                .replace("$", "")
                .replace(/,/g, "")
                .trim();

            const price = parseFloat(text);
            if (isNaN(price)) return;

            const raw = price / (rate / 10);
            const withFee = raw * 1.05;

            const res = document.createElement("span");
            res.style = `
                margin-left: 6px;
                font-size: 11px;
                white-space: nowrap;
            `;

            res.innerHTML = `
                (<span style="color:#f44336">${raw.toFixed(2)}c</span>
                -
                <span style="color:#4caf50">${withFee.toFixed(2)}c</span>)
            `;

            cell.appendChild(res);
            cell.dataset.converted = "true";
        });
    }

    // ==========================================
    // INPUT CONVERTER (Empire page)
    // ==========================================
    function handleInputConversion() {
        const input = document.querySelector('input[placeholder="Search..."]');
        if (!input || input.dataset.attached === "true") return;

        input.dataset.attached = "true";

        const queued = sessionStorage.getItem(EMPIRE_SEARCH_KEY);
        if (!queued) return;

        input.focus();
        input.value = queued;

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        sessionStorage.removeItem(EMPIRE_SEARCH_KEY);

        console.log("Empire search filled:", queued);
    }

    // ==========================================
    // INIT
    // ==========================================
    function init() {
        injectStyles();
        createInput();
        setupItemClicker();

        setTimeout(updatePrices, 1000);
        setInterval(handleInputConversion, 500);

        new MutationObserver(() => updatePrices())
            .observe(document.body, {
                childList: true,
                subtree: true
            });
    }

    if (document.readyState === "complete") {
        init();
    } else {
        window.addEventListener("load", init);
    }
})();
