// ==UserScript==
// @name         CSFloat -> Clipboard (Smart Wear)
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Kopiuje nazwę itemu + CTRL+Click otwiera CSGOEmpire search (auto-fill)
// @author       Gemini
// @match        https://csfloat.com/*
// @match        https://csgoempire.com/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/regov124356/csfloat-empire-tools/main/script.user.js
// @updateURL    https://raw.githubusercontent.com/regov124356/csfloat-empire-tools/main/script.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = "empire_rate";
    const WEARS = [
        "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"
    ];

    // ==========================================
    // LOGIKA DLA CSFLOAT.COM
    // ==========================================
    function initCSFloat() {
        injectStyles();
        createInput();
        setupItemClicker();

        setTimeout(updatePrices, 1000);
        new MutationObserver(() => updatePrices()).observe(document.body, { childList: true, subtree: true });
    }

    function setupItemClicker() {
        document.addEventListener('click', (e) => {
            const targetHeader = e.target.closest('mat-card > div > div:first-child');
            if (!targetHeader || !targetHeader.querySelector('app-item-name')) return;

            const nameEl = targetHeader.querySelector('.item-name');
            const subtextEl = targetHeader.querySelector('.subtext');
            if (!nameEl) return;

            let itemName = nameEl.innerText.trim().replace(/^★\s*/, '');
            let subtext = subtextEl ? subtextEl.innerText.trim() : "";
            let finalQuery = itemName;

            const foundWear = WEARS.find(wear => subtext.includes(wear));
            if (foundWear) finalQuery += ` (${foundWear})`;

            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                // Przekazujemy query w hash'u URL (obejście braku wspólnego sessionStorage)
                const empireUrl = `https://csgoempire.com/withdraw/steam/market#search=${encodeURIComponent(finalQuery)}`;
                window.open(empireUrl, "_blank");
                return;
            }

            navigator.clipboard.writeText(finalQuery).then(() => {
                const originalBg = targetHeader.style.background;
                targetHeader.style.background = "rgba(76, 175, 80, 0.3)";
                setTimeout(() => { targetHeader.style.background = originalBg; }, 300);
            });
        }, true);
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            mat-card > div > div:first-child:has(app-item-name) { cursor: copy !important; transition: background 0.2s; border-radius: 4px; }
            mat-card > div > div:first-child:has(app-item-name):hover { background: rgba(255,255,255,0.07) !important; }
        `;
        document.head.appendChild(style);
    }

    function createInput() {
        if (document.getElementById("empire-rate-ui")) return;
        const container = document.createElement("div");
        container.id = "empire-rate-ui";
        container.style = `position: fixed; top: 10px; left: 10px; z-index: 9999; background: #111; padding: 8px 12px; border-radius: 8px; color: white; font-size: 12px; border: 1px solid #444;`;
        const input = document.createElement("input");
        input.type = "number";
        input.style = `width: 70px; background: #222; color: white; border: 1px solid #444; margin-left: 5px;`;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) input.value = saved;
        input.addEventListener("input", () => { localStorage.setItem(STORAGE_KEY, input.value); updatePrices(); });
        container.appendChild(document.createTextNode("Rate: "));
        container.appendChild(input);
        document.body.appendChild(container);
    }

    function updatePrices() {
        const rate = parseFloat(localStorage.getItem(STORAGE_KEY));
        if (!rate) return;
        document.querySelectorAll(".mat-column-price, .price").forEach(cell => {
            if (cell.dataset.converted) return;
            const text = cell.innerText.replace("$", "").replace(/,/g, "").trim();
            const price = parseFloat(text);
            if (isNaN(price)) return;
            const raw = price / (rate / 10);
            const withFee = raw * 1.05;
            const res = document.createElement("span");
            res.style = `margin-left: 6px; font-size: 11px; white-space: nowrap;`;
            res.innerHTML = `(<span style="color:#f44336">${raw.toFixed(2)}c</span> - <span style="color:#4caf50">${withFee.toFixed(2)}c</span>)`;
            cell.appendChild(res);
            cell.dataset.converted = "true";
        });
    }

    // ==========================================
    // LOGIKA DLA CSGOEMPIRE.COM (Auto-fill)
    // ==========================================
    function handleEmpireSearch() {
        if (!window.location.hash.includes('#search=')) return;

        const query = decodeURIComponent(window.location.hash.split('#search=')[1]);
        if (!query) return;

        const searchInterval = setInterval(() => {
            const input = document.querySelector('input[placeholder*="Search"], input[type="text"]');

            if (input) {
                clearInterval(searchInterval);
                input.focus();
                input.value = query;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                window.location.hash = ""; // Czyścimy URL po wpisaniu
            }
        }, 500);

        setTimeout(() => clearInterval(searchInterval), 10000); // Stop po 10s jeśli nie znajdzie
    }

    // ==========================================
    // INIT
    // ==========================================
    if (window.location.hostname.includes("csfloat.com")) {
        if (document.readyState === "complete") initCSFloat();
        else window.addEventListener("load", initCSFloat);
    } else if (window.location.hostname.includes("csgoempire.com")) {
        handleEmpireSearch();
    }
})();
