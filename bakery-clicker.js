(() => {
    'use strict';

    const saveKey = 'crumb-and-crown-save-v1';
    const accountSessionKey = 'crumb-and-crown-account-session-v1';
    const accountSavePrefix = 'crumb-and-crown-account-save-v1:';
    let activeSaveKey = saveKey;
    let activeAccount = null;
    let accountSaveTimer = null;
    const buildings = [
        { id: 'cursor', name: 'Cookie cursor', icon: '↗', baseCost: 15, cps: 0.1, description: 'A helpful little hand' },
        { id: 'grandma', name: 'Grandma', icon: '❀', baseCost: 100, cps: 1, description: 'Bakes with love' },
        { id: 'garden', name: 'Cookie garden', icon: '♧', baseCost: 1100, cps: 8, description: 'Freshly grown dough' },
        { id: 'bakery', name: 'Neighborhood bakery', icon: '⌂', baseCost: 12000, cps: 47, description: 'A rising local favorite' },
        { id: 'mine', name: 'Chocolate mine', icon: '◇', baseCost: 130000, cps: 260, description: 'The chips run deep' },
        { id: 'factory', name: 'Cookie factory', icon: '▦', baseCost: 1400000, cps: 1400, description: 'A very busy oven' },
        { id: 'bank', name: 'Dough bank', icon: '▤', baseCost: 20000000, cps: 7800, description: 'Interest in every crumb' },
        { id: 'temple', name: 'Cookie temple', icon: '⌂', baseCost: 330000000, cps: 44000, description: 'Blessed with butter' }
    ];
    const prestigeUpgrades = [
        { id: 'click', name: 'Golden whisk', icon: '✳', detail: 'Stronger clicks in every bakery.', cost: (level) => 1 + level * 2, max: 5 },
        { id: 'oven', name: 'Everwarm oven', icon: '♨', detail: 'More cookies from every helper.', cost: (level) => 2 + level * 3, max: 5 },
        { id: 'luck', name: 'Lucky spark', icon: '✦', detail: 'Better golden-cookie chances and prizes.', cost: (level) => 3 + level * 3, max: 5 }
    ];
    const cosmetics = [
        { id: 'classic', name: 'Classic chip', icon: '●', detail: 'The original oven-fresh look.', cost: 0, image: 'cookie.png' },
        { id: 'mint', name: 'Mint chip', icon: '❋', detail: 'A cool little color twist.', cost: 40, image: 'mint_chip_cookie.png' },
        { id: 'berry', name: 'Berry swirl', icon: '✿', detail: 'A rosy bakery favorite.', cost: 70, image: 'berry_swirl_cookie.png' },
        { id: 'midnight', name: 'Midnight cocoa', icon: '✦', detail: 'Dark chocolate, starry finish.', cost: 110, image: 'midnight_cocoa_cookie.png' },
        { id: 'honey', name: 'Honey sparkle', icon: '✧', detail: 'A golden, glossy glow.', cost: 160, image: 'honey_sparkle_cookie.png' }
    ];
    const memorySymbols = ['🍓', '🍋', '🍒', '🍊', '🍇', '🥝'];
    const achievements = [
        { id: 'first', title: 'First batch', detail: 'Bake your very first cookie.', reward: 10, test: (game) => game.lifetime >= 1 },
        { id: 'clicks-100', title: 'Busy hands', detail: 'Click the cookie 100 times.', reward: 100, test: (game) => game.clicks >= 100 },
        { id: 'grandma', title: 'Family recipe', detail: 'Hire your first grandma.', reward: 125, test: (game) => game.owned.grandma >= 1 },
        { id: 'thousand', title: 'A proper batch', detail: 'Bake 1,000 cookies this batch.', reward: 250, test: (game) => game.runBaked >= 1000 },
        { id: 'ten-buildings', title: 'Help wanted', detail: 'Own 10 bakery helpers.', reward: 500, test: (game) => totalOwned(game) >= 10 },
        { id: 'hundred-cps', title: 'The night shift', detail: 'Reach 100 cookies per second.', reward: 1000, test: (game) => getCps(game) >= 100 },
        { id: 'million', title: 'Cookie magnate', detail: 'Bake 1 million cookies this batch.', reward: 10000, test: (game) => game.runBaked >= 1000000 },
        { id: 'rebirth', title: 'Second chances', detail: 'Start your first new legacy.', reward: 2500, test: (game) => game.rebirths >= 1 },
        { id: 'rebirth', title: 'Second chances', detail: 'Reach 5th legacy.', reward: 250000, test: (game) => game.rebirths >= 5 },
        { id: 'combo', title: 'Quick fingers', detail: 'Build a 25-click streak.', reward: 500, test: (game) => game.bestCombo >= 25 },
                { id: 'combo', title: 'Quick fingers', detail: 'Build a 1000-click streak.', reward: 5000, test: (game) => game.bestCombo >= 1000 },
        { id: 'daily-streak', title: 'Regular customer', detail: 'Claim three daily treats in a row.', reward: 750, test: (game) => game.dailyStreak >= 3 },
        { id: 'arcade-first', title: 'A little play', detail: 'Finish your first mini game.', reward: 250, test: (game) => game.arcadeRuns >= 1 },
        { id: 'arcade-credits', title: 'Arcade regular', detail: 'Earn 100 credits from mini games.', reward: 750, test: (game) => game.totalCreditsEarned >= 100 }
    ];
    const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
    const $ = (selector) => document.querySelector(selector);
    let game = loadGame();
    let lastTick = Date.now();
    let lastSave = Date.now();
    let goldenTimer = 0;
    let goldenVisibleFor = 0;
    let toastTimer;
    let comboCount = 0;
    let lastClickAt = 0;
    let chipGameTimer = null;
    let chipTargetTimer = null;
    let chipGame = { active: false, score: 0, target: -1, combo: 0, endsAt: 0 };
    let memoryDeck = [];
    let memoryOpen = [];
    let memoryMatched = new Set();
    let memoryMoves = 0;
    let memoryLocked = false;

    function freshGame() {
        return { cookies: 0, runBaked: 0, lifetime: 0, clicks: 0, clickLevel: 0, owned: Object.fromEntries(buildings.map((item) => [item.id, 0])), goldenDough: 0, doughSpent: 0, prestigeUpgrades: { click: 0, oven: 0, luck: 0 }, rebirths: 0, medals: [], bakeryName: 'Crumb & Crown', logoMark: 'C', dailyClaim: '', dailyStreak: 0, bestCombo: 0, records: [], credits: 0, totalCreditsEarned: 0, arcadeRuns: 0, chipBest: 0, memoryBestMoves: 0, cosmeticsOwned: ['classic'], activeCosmetic: 'classic', cookieArt: '', savedAt: Date.now() };
    }

    function loadGame() {
        try {
            const saved = JSON.parse(localStorage.getItem(saveKey));
            if (!saved || typeof saved !== 'object') return freshGame();
            const base = freshGame();
            const loaded = { ...base, ...saved, owned: { ...base.owned, ...(saved.owned || {}) } };
            for (const key of ['cookies', 'runBaked', 'lifetime', 'clicks', 'clickLevel', 'goldenDough', 'doughSpent', 'rebirths', 'dailyStreak', 'bestCombo', 'credits', 'totalCreditsEarned', 'arcadeRuns', 'chipBest', 'memoryBestMoves']) {
                loaded[key] = Number.isFinite(Number(loaded[key])) && Number(loaded[key]) >= 0 ? Number(loaded[key]) : 0;
            }
            loaded.bakeryName = String(loaded.bakeryName || base.bakeryName).trim().slice(0, 24) || base.bakeryName;
            loaded.logoMark = String(loaded.logoMark || base.logoMark).trim().slice(0, 4) || base.logoMark;
            loaded.dailyClaim = /^\d{4}-\d{2}-\d{2}$/.test(loaded.dailyClaim) ? loaded.dailyClaim : '';
            loaded.prestigeUpgrades = { ...base.prestigeUpgrades, ...(saved.prestigeUpgrades || {}) };
            for (const upgrade of prestigeUpgrades) loaded.prestigeUpgrades[upgrade.id] = Math.min(upgrade.max, Math.max(0, Math.floor(Number(loaded.prestigeUpgrades[upgrade.id]) || 0)));
            loaded.cosmeticsOwned = ['classic', ...(Array.isArray(loaded.cosmeticsOwned) ? loaded.cosmeticsOwned.filter((id) => cosmetics.some((item) => item.id === id)) : [])];
            loaded.cosmeticsOwned = [...new Set(loaded.cosmeticsOwned)];
            loaded.activeCosmetic = cosmetics.some((item) => item.id === loaded.activeCosmetic) ? loaded.activeCosmetic : 'classic';
            loaded.cookieArt = typeof loaded.cookieArt === 'string' && loaded.cookieArt.length < 900000 && /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(loaded.cookieArt) ? loaded.cookieArt : '';
            if (loaded.cookieArt) loaded.activeCosmetic = 'uploaded';
            loaded.medals = Array.isArray(loaded.medals) ? loaded.medals.filter((id) => achievements.some((medal) => medal.id === id)) : [];
            loaded.records = Array.isArray(loaded.records) ? loaded.records.filter((record) => record && Number.isFinite(Number(record.baked)) && Number(record.baked) > 0).map((record) => ({ name: String(record.name || base.bakeryName).slice(0, 24), baked: Number(record.baked), dough: Math.max(0, Number(record.dough) || 0), completedAt: String(record.completedAt || '') })).slice(0, 10) : [];
            for (const item of buildings) loaded.owned[item.id] = Math.max(0, Math.floor(Number(loaded.owned[item.id]) || 0));
            return loaded;
        } catch {
            return freshGame();
        }
    }

    function saveGame() {
        game.savedAt = Date.now();
        try {
            localStorage.setItem(saveKey, JSON.stringify(game));
            $('#save-status').textContent = 'SAVED LOCALLY';
        } catch {
            $('#save-status').textContent = 'SAVE UNAVAILABLE';
        }
        lastSave = Date.now();
    }

    function getMultiplier(state = game) { return (1 + state.goldenDough * 0.25) * (1 + (state.prestigeUpgrades?.oven || 0) * 0.25); }
    function getCps(state = game) { return buildings.reduce((sum, item) => sum + (state.owned[item.id] || 0) * item.cps, 0) * getMultiplier(state); }
    function getClickPower() { return (1 + game.clickLevel * 1.5) * getMultiplier() * (1 + game.prestigeUpgrades.click * 0.5); }
    function availableDough() { return Math.max(0, game.goldenDough - game.doughSpent); }
    function todayKey() { return new Date().toISOString().slice(0, 10); }
    function nextDailyStreak() {
        if (!game.dailyClaim) return 1;
        const previousDay = new Date(`${game.dailyClaim}T00:00:00.000Z`).getTime();
        const currentDay = new Date(`${todayKey()}T00:00:00.000Z`).getTime();
        return currentDay - previousDay === 86400000 ? game.dailyStreak + 1 : 1;
    }
    function dailyReward() { return 100 * Math.min(7, nextDailyStreak()); }
    function totalOwned(state = game) { return buildings.reduce((sum, item) => sum + (state.owned[item.id] || 0), 0); }
    function costOf(item) { return Math.floor(item.baseCost * Math.pow(1.15, game.owned[item.id])); }
    function clickUpgradeCost() { return Math.floor(25 * Math.pow(1.8, game.clickLevel)); }
    function rebirthReward() { return Math.max(0, Math.floor(Math.sqrt(game.runBaked / 1000000)) - game.goldenDough); }

    function format(value) {
        if (!Number.isFinite(value)) return '0';
        if (value < 1000000) return numberFormat.format(value);
        const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
        const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(value) / 3));
        return `${numberFormat.format(value / Math.pow(1000, tier))}${suffixes[tier]}`;
    }

    function formatWhole(value) { return numberFormat.format(Math.floor(value)); }

    function toast(message) {
        $('#toast').textContent = message;
        $('#toast').classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2200);
    }

    function applyOfflineProgress() {
        const elapsed = Math.max(0, Math.min(8 * 60 * 60, (Date.now() - Number(game.savedAt || Date.now())) / 1000));
        const earned = getCps() * elapsed;
        if (earned >= 1) {
            game.cookies += earned;
            game.runBaked += earned;
            game.lifetime += earned;
            toast(`While you were away, the bakery made ${format(earned)} cookies.`);
            checkAchievements();
        }
    }

    function addCookies(amount) {
        game.cookies += amount;
        game.runBaked += amount;
        game.lifetime += amount;
        checkAchievements();
        updateHud();
    }

    function floatText(text, x, y) {
        const label = document.createElement('span');
        label.className = 'float-cookie';
        label.textContent = text;
        const rect = $('#cookie-button').getBoundingClientRect();
        label.style.left = `${x ?? rect.left + rect.width / 2}px`;
        label.style.top = `${y ?? rect.top + rect.height / 3}px`;
        document.body.append(label);
        label.addEventListener('animationend', () => label.remove(), { once: true });
    }

    function onCookieClick(event) {
        const now = Date.now();
        comboCount = now - lastClickAt <= 1500 ? comboCount + 1 : 1;
        lastClickAt = now;
        game.bestCombo = Math.max(game.bestCombo, comboCount);
        const comboMultiplier = 1 + Math.min(7, Math.floor(Math.max(0, comboCount - 1) / 5)) * 0.2;
        const critical = Math.random() < 0.035 + Math.min(0.1, comboCount * 0.001);
        const amount = getClickPower() * comboMultiplier * (critical ? 5 : 1);
        game.clicks += 1;
        addCookies(amount);
        const cookie = $('#cookie-button');
        cookie.classList.remove('pressed');
        requestAnimationFrame(() => cookie.classList.add('pressed'));
        setTimeout(() => cookie.classList.remove('pressed'), 130);
        cookie.classList.remove('click-burst');
        requestAnimationFrame(() => cookie.classList.add('click-burst'));
        setTimeout(() => cookie.classList.remove('click-burst'), 320);
        spawnClickRipple(event);
        $('#combo-meter').hidden = comboCount < 2;
        $('#combo-count').textContent = `STREAK ${comboCount}`;
        $('#combo-multiplier').textContent = `x${format(comboMultiplier)}`;
        cookie.classList.toggle('critical-hit', critical);
        if (critical) setTimeout(() => cookie.classList.remove('critical-hit'), 380);
        if (comboCount > 1 && comboCount % 5 === 0) spawnCrumbs();
        floatText(`${critical ? 'CRIT! ' : '+'}${critical ? `+${format(amount)}` : format(amount)}`, event.clientX || undefined, event.clientY || undefined);
    }

    function spawnCrumbs() {
        const stage = $('.cookie-stage');
        for (let index = 0; index < 7; index += 1) {
            const crumb = document.createElement('i');
            crumb.className = 'crumb-particle';
            const angle = Math.PI * 2 * index / 7;
            const distance = 45 + Math.random() * 60;
            crumb.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
            crumb.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
            stage.append(crumb);
            crumb.addEventListener('animationend', () => crumb.remove(), { once: true });
        }
    }

    function spawnClickRipple(event) {
        const cookie = $('#cookie-button');
        const bounds = cookie.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'click-ripple';
        ripple.style.left = `${event.clientX ? event.clientX - bounds.left : bounds.width / 2}px`;
        ripple.style.top = `${event.clientY ? event.clientY - bounds.top : bounds.height / 2}px`;
        cookie.append(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    function applyBranding() {
        $('#brand-display-name').textContent = game.bakeryName;
        $('#brand-seal').textContent = game.logoMark;
        $('#brand-preview-name').textContent = game.bakeryName;
        $('#brand-preview-seal').textContent = game.logoMark;
        $('#bakery-name-input').value = game.bakeryName;
        $('#bakery-logo-input').value = game.logoMark;
        document.title = `${game.bakeryName} — Idle Bakery`;
    }

    function updateBrandPreview() {
        $('#brand-preview-name').textContent = $('#bakery-name-input').value.trim().slice(0, 24) || 'Your bakery';
        $('#brand-preview-seal').textContent = $('#bakery-logo-input').value.trim().slice(0, 4) || '✳';
    }

    function saveBranding() {
        game.bakeryName = $('#bakery-name-input').value.trim().slice(0, 24) || 'Crumb & Crown';
        game.logoMark = $('#bakery-logo-input').value.trim().slice(0, 4) || 'C';
        applyBranding();
        $('#brand-dialog').close();
        saveGame();
        toast('Your bakery has a fresh new look.');
    }

    function applyCookieDesign() {
        const cookie = $('#cookie-button');
        cookie.classList.remove('skin-classic', 'skin-mint', 'skin-berry', 'skin-midnight', 'skin-honey', 'skin-uploaded');
        if (game.cookieArt) {
            cookie.classList.add('skin-uploaded');
            cookie.style.setProperty('--custom-cookie-art', `url("${game.cookieArt}")`);
            $('#reset-cookie-art').hidden = false;
            return;
        }
        cookie.style.removeProperty('--custom-cookie-art');
        $('#reset-cookie-art').hidden = true;
        cookie.classList.add(`skin-${game.activeCosmetic}`);
    }

    function loadCookieArtwork(file) {
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
            toast('Choose a PNG, JPG, or WebP under 8 MB.');
            $('#cookie-art-input').value = '';
            return;
        }
        const image = new Image();
        const imageUrl = URL.createObjectURL(file);
        image.onload = () => {
            const scale = Math.min(1, 480 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(imageUrl);
            const artwork = canvas.toDataURL('image/webp', 0.82);
            if (artwork.length > 850000) {
                toast('That design is still too large to save. Try a smaller image.');
                return;
            }
            game.cookieArt = artwork;
            game.activeCosmetic = 'uploaded';
            applyCookieDesign();
            updateCreditStore();
            saveGame();
            toast('Your cookie art is ready.');
        };
        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            toast('That image could not be opened.');
        };
        image.src = imageUrl;
        $('#cookie-art-input').value = '';
    }

    function makeCreditStore() {
        const list = $('#credit-store-list');
        list.replaceChildren();
        for (const item of cosmetics) {
            const row = document.createElement('div');
            row.className = 'credit-cosmetic';
            row.dataset.cosmetic = item.id;
            const swatch = document.createElement('span');
            swatch.className = `cosmetic-swatch swatch-${item.id}`;
            swatch.setAttribute('aria-hidden', 'true');
            swatch.textContent = item.icon;
            const copy = document.createElement('span');
            copy.className = 'cosmetic-copy';
            const name = document.createElement('strong');
            name.textContent = item.name;
            const detail = document.createElement('small');
            detail.textContent = item.detail;
            copy.append(name, detail);
            const buy = document.createElement('button');
            buy.className = 'cosmetic-buy';
            buy.type = 'button';
            buy.dataset.cosmeticBuy = item.id;
            row.append(swatch, copy, buy);
            list.append(row);
        }
        updateCreditStore();
    }

    function updateCreditStore() {
        if (!$('#credit-store-list')) return;
        $('#credit-count').textContent = formatWhole(game.credits);
        $('#wallet-credit-count').textContent = formatWhole(game.credits);
        $('#arcade-credit-count').textContent = formatWhole(game.credits);
        $('#arcade-earned-today').textContent = formatWhole(game.totalCreditsEarned);
        for (const item of cosmetics) {
            const button = $(`[data-cosmetic-buy="${item.id}"]`);
            const owned = game.cosmeticsOwned.includes(item.id);
            const equipped = game.activeCosmetic === item.id && !game.cookieArt;
            button.textContent = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `✦ ${item.cost}`;
            button.disabled = equipped || (!owned && game.credits < item.cost);
            button.setAttribute('aria-label', `${equipped ? 'Equipped' : owned ? 'Equip' : `Buy for ${item.cost} credits`}: ${item.name}`);
            button.title = item.name;
        }
        $('#reset-cookie-art').hidden = !game.cookieArt;
    }

    function buyOrEquipCosmetic(id) {
        const item = cosmetics.find((cosmetic) => cosmetic.id === id);
        if (!item) return;
        if (!game.cosmeticsOwned.includes(id)) {
            if (game.credits < item.cost) return;
            game.credits -= item.cost;
            game.cosmeticsOwned.push(id);
        }
        game.activeCosmetic = id;
        game.cookieArt = '';
        applyCookieDesign();
        updateCreditStore();
        saveGame();
        toast(`${item.name} is ready for the oven.`);
    }

    function grantCredits(amount) {
        const reward = Math.max(0, Math.floor(amount));
        if (!reward) return;
        game.credits += reward;
        game.totalCreditsEarned += reward;
        checkAchievements();
        updateCreditStore();
        saveGame();
    }

    function makeShop() {
        const list = $('#shop-list');
        list.replaceChildren();
        for (const item of buildings) {
            const row = document.createElement('div');
            row.className = 'shop-item';
            row.dataset.building = item.id;
            const art = document.createElement('span');
            art.className = 'shop-art';
            art.setAttribute('aria-hidden', 'true');
            art.textContent = item.icon;
            const copy = document.createElement('span');
            copy.className = 'shop-copy';
            const name = document.createElement('strong');
            name.className = 'shop-name';
            name.textContent = item.name;
            const detail = document.createElement('small');
            detail.className = 'shop-detail';
            detail.textContent = item.description;
            copy.append(name, detail);
            const buy = document.createElement('button');
            buy.className = 'shop-buy';
            buy.type = 'button';
            buy.dataset.buy = item.id;
            buy.setAttribute('aria-label', `Buy ${item.name}`);
            const cost = document.createElement('strong');
            cost.className = 'shop-cost';
            const owned = document.createElement('small');
            owned.className = 'shop-owned';
            buy.append(cost, owned);
            row.append(art, copy, buy);
            list.append(row);
        }
        updateShop();
    }

    function updateShop() {
        for (const item of buildings) {
            const row = $(`[data-building="${item.id}"]`);
            const cost = costOf(item);
            row.querySelector('.shop-cost').textContent = format(cost);
            row.querySelector('.shop-owned').textContent = `OWNED ${game.owned[item.id]}`;
            const button = row.querySelector('.shop-buy');
            button.disabled = game.cookies < cost;
            row.classList.toggle('unaffordable', button.disabled);
            button.title = `${item.name}: ${format(item.cps * getMultiplier())} cookies per second each`;
        }
        const recipeCost = clickUpgradeCost();
        $('#click-upgrade-cost').textContent = format(recipeCost);
        $('#click-upgrade-buy').disabled = game.cookies < recipeCost;
        $('#click-power-label').textContent = `Click power +${format(getClickPower())}`;
        $('#click-power-level').textContent = `Recipe level ${game.clickLevel}`;
    }

    function updateHud() {
        const cps = getCps();
        $('#cookie-count').textContent = format(game.cookies);
        $('#cookie-count').title = formatWhole(game.cookies);
        $('#cps-count').textContent = format(cps);
        $('#run-count').textContent = format(game.runBaked);
        $('#lifetime-count').textContent = format(game.lifetime);
        $('#footer-run-count').textContent = format(game.runBaked);
        $('#dough-count').textContent = formatWhole(game.goldenDough);
        $('#dough-bonus').textContent = formatWhole(game.goldenDough * 25);
        $('#available-dough').textContent = formatWhole(availableDough());
        $('#batch-number').textContent = String(game.rebirths + 1).padStart(2, '0');
        $('#bakery-day').textContent = String(game.rebirths + 1).padStart(2, '0');
        $('#shop-count').textContent = formatWhole(totalOwned());
        $('#medal-count').textContent = `${game.medals.length}/${achievements.length}`;
        $('#rebirth-hint').textContent = rebirthReward() > 0 ? `EARN ${formatWhole(rebirthReward())} GOLDEN DOUGH` : 'START A NEW LEGACY';
        const claimedToday = game.dailyClaim === todayKey();
        $('#daily-treat').disabled = claimedToday;
        $('#daily-treat-label').textContent = claimedToday ? 'TOMORROW, BAKER' : `DAILY CRUMB · DAY ${Math.min(7, nextDailyStreak())}`;
        $('#daily-treat-reward').textContent = claimedToday ? 'CLAIMED' : `+${format(dailyReward())}`;
        updateShop();
        updateLegacyShop();
        updateCreditStore();
        updateRebirthDialog();
    }

    function checkAchievements() {
        let earnedMedal = false;
        for (const medal of achievements) {
            if (!game.medals.includes(medal.id) && medal.test(game)) {
                game.medals.push(medal.id);
                game.cookies += medal.reward;
                game.runBaked += medal.reward;
                game.lifetime += medal.reward;
                toast(`Medal earned: ${medal.title} (+${format(medal.reward)} cookies)`);
                earnedMedal = true;
            }
        }
        if (earnedMedal) renderMedals();
    }

    function makeLegacyShop() {
        const list = $('#legacy-list');
        list.replaceChildren();
        for (const upgrade of prestigeUpgrades) {
            const row = document.createElement('div');
            row.className = 'legacy-item';
            row.dataset.prestige = upgrade.id;
            const icon = document.createElement('span');
            icon.className = 'legacy-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = upgrade.icon;
            const copy = document.createElement('span');
            copy.className = 'legacy-copy';
            const title = document.createElement('strong');
            title.className = 'legacy-name';
            title.textContent = upgrade.name;
            const detail = document.createElement('small');
            detail.textContent = upgrade.detail;
            copy.append(title, detail);
            const buy = document.createElement('button');
            buy.className = 'legacy-buy';
            buy.type = 'button';
            buy.dataset.prestigeBuy = upgrade.id;
            const price = document.createElement('strong');
            price.className = 'legacy-cost';
            const level = document.createElement('small');
            level.className = 'legacy-level';
            buy.append(price, level);
            row.append(icon, copy, buy);
            list.append(row);
        }
        updateLegacyShop();
    }

    function updateLegacyShop() {
        if (!$('#legacy-list')) return;
        for (const upgrade of prestigeUpgrades) {
            const row = $(`[data-prestige="${upgrade.id}"]`);
            const level = game.prestigeUpgrades[upgrade.id];
            const button = row.querySelector('.legacy-buy');
            const capped = level >= upgrade.max;
            const cost = upgrade.cost(level);
            row.querySelector('.legacy-cost').textContent = capped ? 'MAX' : `✦ ${cost}`;
            row.querySelector('.legacy-level').textContent = `LEVEL ${level}/${upgrade.max}`;
            button.disabled = capped || availableDough() < cost;
            row.classList.toggle('unaffordable', button.disabled && !capped);
            button.setAttribute('aria-label', capped ? `${upgrade.name} max level` : `Buy ${upgrade.name} for ${cost} Golden Dough`);
        }
    }

    function buyPrestigeUpgrade(id) {
        const upgrade = prestigeUpgrades.find((item) => item.id === id);
        if (!upgrade) return;
        const level = game.prestigeUpgrades[id];
        const cost = upgrade.cost(level);
        if (level >= upgrade.max || availableDough() < cost) return;
        game.doughSpent += cost;
        game.prestigeUpgrades[id] += 1;
        updateHud();
        saveGame();
        toast(`${upgrade.name} upgraded to level ${game.prestigeUpgrades[id]}.`);
    }

    function claimDailyTreat() {
        const today = todayKey();
        if (game.dailyClaim === today) return;
        game.dailyStreak = nextDailyStreak();
        game.dailyClaim = today;
        const reward = dailyReward();
        addCookies(reward);
        updateHud();
        saveGame();
        toast(`Daily crumb claimed: +${format(reward)} cookies. ${game.dailyStreak}-day streak!`);
    }

    function renderLeaderboard() {
        const list = $('#leaderboard-list');
        const entries = game.records.map((record) => ({ ...record, current: false }));
        if (game.runBaked > 0) entries.push({ name: game.bakeryName, baked: game.runBaked, dough: game.goldenDough, current: true, completedAt: '' });
        entries.sort((first, second) => second.baked - first.baked);
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('p');
            empty.className = 'leaderboard-empty';
            empty.textContent = 'Your first batch could make history.';
            list.append(empty);
            return;
        }
        entries.slice(0, 10).forEach((entry, index) => {
            const row = document.createElement('div');
            row.className = `leaderboard-row${entry.current ? ' current-record' : ''}${index === 0 ? ' top-record' : ''}`;
            const baker = document.createElement('span');
            baker.className = 'leaderboard-baker';
            const rank = document.createElement('strong');
            rank.textContent = String(index + 1).padStart(2, '0');
            const identity = document.createElement('span');
            identity.className = 'leaderboard-identity';
            const name = document.createElement('strong');
            name.textContent = entry.name;
            const note = document.createElement('small');
            note.textContent = entry.current ? 'IN PROGRESS' : entry.completedAt ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(entry.completedAt)) : 'FINISHED BATCH';
            identity.append(name, note);
            baker.append(rank, identity);
            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = format(entry.baked);
            row.append(baker, score);
            list.append(row);
        });
    }

    function renderMedals() {
        const list = $('#medal-list');
        list.replaceChildren();
        for (const medal of achievements) {
            const unlocked = game.medals.includes(medal.id);
            const row = document.createElement('div');
            row.className = `medal${unlocked ? '' : ' locked'}`;
            const icon = document.createElement('span');
            icon.className = 'medal-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = unlocked ? '✦' : '·';
            const copy = document.createElement('span');
            copy.className = 'medal-copy';
            const title = document.createElement('strong');
            title.textContent = medal.title;
            const detail = document.createElement('small');
            detail.textContent = medal.detail;
            copy.append(title, detail);
            const status = document.createElement('span');
            status.className = 'medal-status';
            status.textContent = unlocked ? 'EARNED' : `+${format(medal.reward)}`;
            row.append(icon, copy, status);
            list.append(row);
        }
    }

    function updateRebirthDialog() {
        const gain = rebirthReward();
        $('#rebirth-gain').textContent = formatWhole(gain);
        $('#dialog-bonus').textContent = `${formatWhole((game.goldenDough + gain) * 25)}%`;
        $('#confirm-rebirth').disabled = gain < 1;
    }

    function buyBuilding(id) {
        const item = buildings.find((entry) => entry.id === id);
        if (!item) return;
        const cost = costOf(item);
        if (game.cookies < cost) return;
        game.cookies -= cost;
        game.owned[id] += 1;
        checkAchievements();
        updateHud();
        saveGame();
    }

    function buyClickUpgrade() {
        const cost = clickUpgradeCost();
        if (game.cookies < cost) return;
        game.cookies -= cost;
        game.clickLevel += 1;
        updateHud();
        saveGame();
        toast('A better recipe! Your clicks are stronger.');
    }

    function openRebirth() {
        updateRebirthDialog();
        $('#rebirth-dialog').showModal();
    }

    function rebirth() {
        const gain = rebirthReward();
        if (gain < 1) return;
        if (game.runBaked > 0) {
            game.records.push({ name: game.bakeryName, baked: game.runBaked, dough: game.goldenDough + gain, completedAt: new Date().toISOString() });
            game.records.sort((first, second) => second.baked - first.baked);
            game.records = game.records.slice(0, 10);
        }
        game.goldenDough += gain;
        game.rebirths += 1;
        game.cookies = 0;
        game.runBaked = 0;
        game.clicks = 0;
        game.clickLevel = 0;
        game.owned = Object.fromEntries(buildings.map((item) => [item.id, 0]));
        comboCount = 0;
        lastClickAt = 0;
        $('#combo-meter').hidden = true;
        $('#golden-cookie').hidden = true;
        $('#rebirth-dialog').close();
        checkAchievements();
        renderMedals();
        renderLeaderboard();
        updateHud();
        saveGame();
        toast(`A new batch begins. Permanent production bonus: ${formatWhole(game.goldenDough * 25)}%.`);
    }

    function showGoldenCookie() {
        if (goldenVisibleFor > 0) return;
        goldenVisibleFor = 12 + game.prestigeUpgrades.luck * 2;
        $('#golden-cookie').hidden = false;
    }

    function collectGoldenCookie() {
        const reward = Math.max(25, getCps() * 60, game.cookies * 0.1) * (1 + game.prestigeUpgrades.luck * 0.5);
        addCookies(reward);
        $('#golden-cookie').hidden = true;
        goldenVisibleFor = 0;
        goldenTimer = 0;
        toast(`Lucky find! +${format(reward)} cookies.`);
    }

    function tick() {
        const now = Date.now();
        const elapsed = Math.min(2, Math.max(0, (now - lastTick) / 1000));
        lastTick = now;
        const production = getCps() * elapsed;
        if (production > 0) {
            game.cookies += production;
            game.runBaked += production;
            game.lifetime += production;
            checkAchievements();
        }
        goldenTimer += elapsed;
        const goldenWait = Math.max(16, 42 - game.prestigeUpgrades.luck * 4);
        if (goldenTimer > goldenWait && Math.random() < 0.025 + game.prestigeUpgrades.luck * 0.005) showGoldenCookie();
        if (goldenVisibleFor > 0) {
            goldenVisibleFor -= elapsed;
            if (goldenVisibleFor <= 0) $('#golden-cookie').hidden = true;
        }
        if (comboCount && now - lastClickAt > 1500) {
            comboCount = 0;
            $('#combo-meter').hidden = true;
        }
        updateHud();
        if (now - lastSave > 5000) saveGame();
    }

    function makeChipBoard() {
        const board = $('#chip-board');
        board.replaceChildren();
        for (let index = 0; index < 9; index += 1) {
            const spot = document.createElement('button');
            spot.className = 'chip-spot';
            spot.type = 'button';
            spot.dataset.chip = String(index);
            spot.setAttribute('aria-label', `Cookie spot ${index + 1}`);
            spot.disabled = true;
            board.append(spot);
        }
    }

    function moveChipTarget() {
        if (!chipGame.active) return;
        const spots = [...$('#chip-board').querySelectorAll('.chip-spot')];
        const previousTarget = chipGame.target;
        if (previousTarget >= 0) {
            spots[previousTarget].classList.remove('target');
            spots[previousTarget].setAttribute('aria-label', `Cookie spot ${previousTarget + 1}`);
        }
        let nextTarget = Math.floor(Math.random() * spots.length);
        if (spots.length > 1 && nextTarget === previousTarget) nextTarget = (nextTarget + 1) % spots.length;
        chipGame.target = nextTarget;
        spots[nextTarget].classList.add('target');
        spots[nextTarget].setAttribute('aria-label', `Chocolate chip, spot ${nextTarget + 1}`);
    }

    function startChipDash() {
        clearInterval(chipGameTimer);
        clearInterval(chipTargetTimer);
        chipGame = { active: true, score: 0, target: -1, combo: 0, endsAt: Date.now() + 30000 };
        $('#chip-score').textContent = '0';
        $('#chip-timer').textContent = '30';
        $('#chip-start').disabled = true;
        $('#chip-start').textContent = 'CATCH THOSE CHIPS';
        $('#chip-board').querySelectorAll('.chip-spot').forEach((spot) => { spot.disabled = false; });
        moveChipTarget();
        chipTargetTimer = setInterval(moveChipTarget, 700);
        chipGameTimer = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((chipGame.endsAt - Date.now()) / 1000));
            $('#chip-timer').textContent = String(remaining).padStart(2, '0');
            if (remaining <= 0) finishChipDash();
        }, 150);
    }

    function clickChip(event) {
        const spot = event.target.closest('[data-chip]');
        if (!chipGame.active || !spot) return;
        if (Number(spot.dataset.chip) === chipGame.target) {
            chipGame.score += 1;
            chipGame.combo += 1;
            spot.classList.remove('caught');
            requestAnimationFrame(() => spot.classList.add('caught'));
            moveChipTarget();
        } else {
            chipGame.combo = 0;
            spot.classList.remove('missed');
            requestAnimationFrame(() => spot.classList.add('missed'));
        }
        $('#chip-score').textContent = String(chipGame.score);
    }

    function finishChipDash() {
        if (!chipGame.active) return;
        chipGame.active = false;
        clearInterval(chipGameTimer);
        clearInterval(chipTargetTimer);
        $('#chip-timer').textContent = '00';
        $('#chip-board').querySelectorAll('.chip-spot').forEach((spot) => {
            spot.disabled = true;
            spot.classList.remove('target');
        });
        game.arcadeRuns += 1;
        game.chipBest = Math.max(game.chipBest, chipGame.score);
        checkAchievements();
        const reward = Math.floor(chipGame.score * 1.5 + Math.min(12, Math.floor(chipGame.combo / 4) * 2));
        $('#chip-best').textContent = String(game.chipBest);
        $('#chip-start').disabled = false;
        $('#chip-start').textContent = `PLAY AGAIN · EARN ${reward} CREDITS`;
        grantCredits(reward);
        updateHud();
        saveGame();
        toast(`Chip Dash complete: ${formatWhole(reward)} credits earned.`);
    }

    function setArcadeGame(gameId) {
        const chipActive = gameId === 'chip';
        $('#chip-dash-game').hidden = !chipActive;
        $('#memory-game').hidden = chipActive;
        $('#chip-dash-tab').classList.toggle('active', chipActive);
        $('#memory-tab').classList.toggle('active', !chipActive);
        $('#chip-dash-tab').setAttribute('aria-selected', String(chipActive));
        $('#memory-tab').setAttribute('aria-selected', String(!chipActive));
    }

    function shuffleMemoryDeck() {
        const deck = [...memorySymbols, ...memorySymbols].map((symbol, id) => ({ symbol, id }));
        for (let index = deck.length - 1; index > 0; index -= 1) {
            const other = Math.floor(Math.random() * (index + 1));
            [deck[index], deck[other]] = [deck[other], deck[index]];
        }
        return deck;
    }

    function startMemoryGame() {
        memoryDeck = shuffleMemoryDeck();
        memoryOpen = [];
        memoryMatched = new Set();
        memoryMoves = 0;
        memoryLocked = false;
        $('#memory-moves').textContent = '0';
        $('#memory-matched').textContent = '0/6';
        $('#memory-pairs').textContent = '6 PAIRS';
        $('#memory-start').textContent = 'SHUFFLE A NEW PUZZLE';
        const board = $('#memory-board');
        board.replaceChildren();
        memoryDeck.forEach((card, index) => {
            const button = document.createElement('button');
            button.className = 'memory-card';
            button.type = 'button';
            button.dataset.memory = String(index);
            button.textContent = '?';
            button.setAttribute('aria-label', `Face-down cookie ${index + 1}`);
            board.append(button);
        });
    }

    function flipMemoryCard(event) {
        const card = event.target.closest('[data-memory]');
        if (!card || memoryLocked) return;
        const index = Number(card.dataset.memory);
        if (memoryMatched.has(index) || memoryOpen.includes(index)) return;
        card.textContent = memoryDeck[index].symbol;
        card.classList.add('revealed');
        card.setAttribute('aria-label', memoryDeck[index].symbol);
        memoryOpen.push(index);
        if (memoryOpen.length < 2) return;
        memoryMoves += 1;
        $('#memory-moves').textContent = String(memoryMoves);
        const [first, second] = memoryOpen;
        if (memoryDeck[first].symbol === memoryDeck[second].symbol) {
            memoryMatched.add(first);
            memoryMatched.add(second);
            memoryOpen = [];
            $(`[data-memory="${first}"]`).classList.add('matched');
            $(`[data-memory="${second}"]`).classList.add('matched');
            $('#memory-matched').textContent = `${memoryMatched.size / 2}/6`;
            if (memoryMatched.size === memoryDeck.length) finishMemoryGame();
            return;
        }
        memoryLocked = true;
        setTimeout(() => {
            for (const openIndex of memoryOpen) {
                const openCard = $(`[data-memory="${openIndex}"]`);
                openCard.textContent = '?';
                openCard.classList.remove('revealed');
                openCard.setAttribute('aria-label', `Face-down cookie ${openIndex + 1}`);
            }
            memoryOpen = [];
            memoryLocked = false;
        }, 650);
    }

    function finishMemoryGame() {
        game.arcadeRuns += 1;
        game.memoryBestMoves = game.memoryBestMoves ? Math.min(game.memoryBestMoves, memoryMoves) : memoryMoves;
        const reward = Math.max(8, 30 - Math.max(0, memoryMoves - 6) * 2);
        $('#memory-pairs').textContent = `+${reward} CREDITS`;
        $('#memory-start').textContent = 'PLAY ANOTHER PUZZLE';
        grantCredits(reward);
        updateHud();
        saveGame();
        toast(`Cookie Memory complete in ${memoryMoves} moves: +${reward} credits.`);
    }

    function setPanel(activePanel) {
        const panels = [
            ['shop-tab', 'shop-panel'],
            ['achievements-tab', 'achievements-panel'],
            ['legacy-tab', 'legacy-panel'],
            ['leaderboard-tab', 'leaderboard-panel'],
            ['arcade-tab', 'arcade-panel']
        ];
        for (const [tabId, panelId] of panels) {
            const active = panelId === activePanel;
            $(`#${panelId}`).hidden = !active;
            $(`#${tabId}`).classList.toggle('active', active);
            $(`#${tabId}`).setAttribute('aria-selected', String(active));
        }
        if (activePanel === 'leaderboard-panel') renderLeaderboard();
    }

    function init() {
        applyOfflineProgress();
        applyBranding();
        applyCookieDesign();
        makeShop();
        makeLegacyShop();
        renderMedals();
        makeCreditStore();
        makeChipBoard();
        startMemoryGame();
        $('#chip-best').textContent = String(game.chipBest);
        updateHud();
        $('#cookie-button').addEventListener('click', onCookieClick);
        $('#shop-list').addEventListener('click', (event) => {
            const button = event.target.closest('[data-buy]');
            if (button && !button.disabled) buyBuilding(button.dataset.buy);
        });
        $('#click-upgrade-buy').addEventListener('click', buyClickUpgrade);
        $('#legacy-list').addEventListener('click', (event) => {
            const button = event.target.closest('[data-prestige-buy]');
            if (button && !button.disabled) buyPrestigeUpgrade(button.dataset.prestigeBuy);
        });
        $('#shop-tab').addEventListener('click', () => setPanel('shop-panel'));
        $('#achievements-tab').addEventListener('click', () => setPanel('achievements-panel'));
        $('#legacy-tab').addEventListener('click', () => setPanel('legacy-panel'));
        $('#leaderboard-tab').addEventListener('click', () => setPanel('leaderboard-panel'));
        $('#arcade-tab').addEventListener('click', () => setPanel('arcade-panel'));
        $('#chip-dash-tab').addEventListener('click', () => setArcadeGame('chip'));
        $('#memory-tab').addEventListener('click', () => setArcadeGame('memory'));
        $('#chip-start').addEventListener('click', startChipDash);
        $('#chip-board').addEventListener('click', clickChip);
        $('#memory-start').addEventListener('click', startMemoryGame);
        $('#memory-board').addEventListener('click', flipMemoryCard);
        $('#credit-wallet').addEventListener('click', () => $('#credits-dialog').showModal());
        $('#credits-close').addEventListener('click', () => $('#credits-dialog').close());
        $('#credits-dialog').addEventListener('click', (event) => {
            if (event.target === $('#credits-dialog')) $('#credits-dialog').close();
        });
        $('#credit-store-list').addEventListener('click', (event) => {
            const button = event.target.closest('[data-cosmetic-buy]');
            if (button && !button.disabled) buyOrEquipCosmetic(button.dataset.cosmeticBuy);
        });
        $('#upload-cookie-art').addEventListener('click', () => $('#cookie-art-input').click());
        $('#cookie-art-input').addEventListener('change', (event) => loadCookieArtwork(event.target.files[0]));
        $('#reset-cookie-art').addEventListener('click', () => {
            game.cookieArt = '';
            game.activeCosmetic = 'classic';
            applyCookieDesign();
            updateCreditStore();
            saveGame();
        });
        $('#daily-treat').addEventListener('click', claimDailyTreat);
        $('#rebirth-button').addEventListener('click', openRebirth);
        $('#confirm-rebirth').addEventListener('click', rebirth);
        $('#rebirth-close').addEventListener('click', () => $('#rebirth-dialog').close());
        $('#rebirth-dialog').addEventListener('click', (event) => {
            if (event.target === $('#rebirth-dialog')) $('#rebirth-dialog').close();
        });
        $('#brand-customize').addEventListener('click', () => $('#brand-dialog').showModal());
        $('#brand-close').addEventListener('click', () => $('#brand-dialog').close());
        $('#brand-dialog').addEventListener('click', (event) => {
            if (event.target === $('#brand-dialog')) $('#brand-dialog').close();
        });
        $('#bakery-name-input').addEventListener('input', updateBrandPreview);
        $('#bakery-logo-input').addEventListener('input', updateBrandPreview);
        $('#save-brand').addEventListener('click', saveBranding);
        $('#golden-cookie').addEventListener('click', collectGoldenCookie);
        window.addEventListener('pagehide', saveGame);
        window.addEventListener('beforeunload', saveGame);
        setInterval(tick, 250);
    }

    init();
})();