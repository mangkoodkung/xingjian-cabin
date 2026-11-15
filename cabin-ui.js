import { mountWindowMotion } from './window-motion.js';

export const nativeMenus = [
    ['ai-config-button', 'settings', 'ตั้งค่าการสร้างข้อความ'],
    ['sys-settings-button', 'plug', 'การเชื่อมต่อ API'],
    ['advanced-formatting-button', 'text', 'การจัดรูปแบบขั้นสูง'],
    ['WI-SP-button', 'book', 'ข้อมูลโลก'],
    ['user-settings-button', 'settings', 'ตั้งค่าผู้ใช้'],
    ['backgrounds-button', 'window', 'พื้นหลัง'],
    ['extensions-settings-button', 'blocks', 'ส่วนขยาย'],
    ['persona-management-button', 'person', 'เพอร์โซนาของฉัน'],
    ['rightNavHolder', 'archive', 'จัดการตัวละคร'],
];

const routeNames = { galaxy: 'ล่องทางช้างเผือก', rings: 'ชมวงแหวนดาว', dawn: 'รุ่งอรุณวงโคจร' };
const preferenceKey = 'xingjian-cabin-display';

function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    if (tag === 'button') node.type = 'button';
    return node;
}

function icon(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const use = document.createElementNS(ns, 'use');
    svg.setAttribute('aria-hidden', 'true');
    use.setAttribute('href', '#i-' + name);
    svg.append(use);
    return svg;
}

function readPreferences() {
    try {
        const stored = JSON.parse(localStorage.getItem(preferenceKey));
        return stored && typeof stored === 'object' ? stored : {};
    } catch {
        return {};
    }
}

function mountWindowPan(cabin) {
    const surface = cabin.querySelector('.cabin-pan');
    const plate = cabin.querySelector('.scene-plate');
    const overflow = () => Math.max(0, plate.clientWidth - surface.clientWidth);
    let progress;
    let drag;

    function position(x) {
        const distance = overflow();
        if (!distance) return;
        progress = Math.min(1, Math.max(0, -x / distance));
        cabin.style.setProperty('--cabin-pan-left', -distance * progress + 'px');
    }

    surface.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || !overflow()) return;
        drag = { id: event.pointerId, start: event.clientX, left: plate.offsetLeft };
        surface.setPointerCapture(event.pointerId);
    });
    surface.addEventListener('pointermove', event => {
        if (drag?.id === event.pointerId) position(drag.left + event.clientX - drag.start);
    });
    surface.addEventListener('lostpointercapture', () => { drag = undefined; });
    surface.addEventListener('keydown', event => {
        if (!overflow() || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        position(plate.offsetLeft + (event.key === 'ArrowLeft' ? 64 : -64));
    });
    new ResizeObserver(() => {
        if (!surface.clientWidth || !overflow()) cabin.style.removeProperty('--cabin-pan-left');
        else if (progress !== undefined) position(-overflow() * progress);
    }).observe(surface);
}

export function mountCabin(root, actions) {
    const $ = id => root.getElementById(id);
    const cabin = $('cabin');
    const windowMotion = mountWindowMotion(cabin);
    mountWindowPan(cabin);
    const carousel = $('carousel');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const prefs = readPreferences();
    const dialogs = [...root.querySelectorAll('dialog')];
    const navigation = [...root.querySelectorAll('[data-page-button]')];
    const cabinControls = [...root.querySelectorAll('.sill-controls, .wall-controls, .cabin-pan')];
    const routeButtons = [...root.querySelectorAll('[data-route-option]')];
    let catalog = [];
    let recent = [];
    let cards = [];
    let activeIndex = 0;
    let side = 1;
    let page = 'home';
    let beforeScenic = 'home';
    let beforeLibrary = 'home';
    let archiveRole;
    let archiveRequest = 0;
    let busy = false;
    let drag;
    let suppressClickUntil = 0;
    let scanTimer;
    let toastTimer;

    function savePreferences() {
        try {
            localStorage.setItem(preferenceKey, JSON.stringify(prefs));
        } catch {
            // The display preferences can also work for this tab only.
        }
    }

    function toast(message) {
        $('toast').textContent = message;
        $('toast').hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3400);
    }

    const ambience = document.createElement('audio');
    ambience.src = new URL('./assets/space-ambience.m4a', import.meta.url).href;
    ambience.preload = 'none';
    ambience.loop = true;
    cabin.append(ambience);
    const ambientToggle = $('ambient-toggle');
    const ambientVolume = $('ambient-volume');
    let ambientRequested = false;
    let audioContext;
    let audioGain;

    function setAmbientVolume(value) {
        const level = value / 100;
        if (audioGain) audioGain.gain.setTargetAtTime(level, audioContext.currentTime, .055);
        else ambience.volume = level;
        $('ambient-level').value = value + '%';
    }

    function reflectAmbientState() {
        ambientToggle.setAttribute('aria-pressed', String(!ambience.paused));
    }

    for (const event of ['play', 'pause', 'ended', 'error']) {
        ambience.addEventListener(event, reflectAmbientState);
    }
    function prepareAudio() {
        const Audio = window.AudioContext ?? window.webkitAudioContext;
        if (!Audio || audioContext) return;
        try {
            audioContext = new Audio();
            const gain = audioContext.createGain();
            gain.gain.value = Number(ambientVolume.value) / 100;
            gain.connect(audioContext.destination);
            audioContext.createMediaElementSource(ambience).connect(gain);
            ambience.volume = 1;
            audioGain = gain;
        } catch {
            audioContext?.close().catch(() => {});
            audioContext = undefined;
        }
    }

    async function syncAmbience() {
        if (!ambientRequested || page === 'reading') {
            ambience.pause();
            return;
        }
        try {
            if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
            await ambience.play();
        } catch (error) {
            if (error.name !== 'AbortError' && ambientRequested && page !== 'reading') {
                ambientRequested = false;
                toast('เล่นไวท์นอยส์ไม่สำเร็จ ลองกดอีกครั้ง');
            }
        }
    }
    ambientToggle.addEventListener('click', () => {
        ambientRequested = !ambientRequested;
        if (ambientRequested) prepareAudio();
        void syncAmbience();
    });
    ambientVolume.value = Number.isFinite(prefs.ambientVolume) ? prefs.ambientVolume : 32;
    setAmbientVolume(Number(ambientVolume.value));
    ambientVolume.addEventListener('input', () => setAmbientVolume(Number(ambientVolume.value)));
    ambientVolume.addEventListener('change', () => {
        prefs.ambientVolume = Number(ambientVolume.value);
        savePreferences();
    });

    function showDialog(dialog) {
        actions.closeDrawer();
        if (!dialog.open) dialog.showModal();
    }

    root.querySelectorAll('[data-dialog]').forEach(control => {
        control.addEventListener('click', () => showDialog($(control.dataset.dialog)));
    });
    for (const dialog of dialogs) {
        dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
        let pointerStartedOutside = false;
        const outside = event => {
            const rect = dialog.getBoundingClientRect();
            return event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom;
        };
        dialog.addEventListener('pointerdown', event => {
            pointerStartedOutside = event.target === dialog && outside(event);
        });
        dialog.addEventListener('click', event => {
            if (pointerStartedOutside && event.target === dialog && outside(event)) dialog.close();
            pointerStartedOutside = false;
        });
    }

    function setRoute(route) {
        cabin.dataset.route = route;
        windowMotion.setRoute(route);
        $('route-label').textContent = routeNames[route];
        routeButtons.forEach(control => {
            control.setAttribute('aria-pressed', String(control.dataset.routeOption === route));
        });
    }
    routeButtons.forEach(control => control.addEventListener('click', () => {
        prefs.route = control.dataset.routeOption;
        setRoute(prefs.route);
        savePreferences();
        $('routes').close();
    }));
    const startRoute = $('cabin-start-route');
    startRoute.value = Object.hasOwn(routeNames, prefs.startRoute) ? prefs.startRoute : '';
    startRoute.addEventListener('change', () => {
        prefs.startRoute = startRoute.value;
        savePreferences();
    });

    function setStill(value) {
        root.host.dataset.still = String(value);
        cabin.dataset.still = String(value);
        windowMotion.setStill(value);
        $('still-mode').setAttribute('aria-checked', String(value));
        if (value) resetScan();
    }

    function setBrightness(value) {
        cabin.style.setProperty('--window-light', String(value / 100));
        $('brightness-value').value = value + '%';
    }
    $('still-mode').addEventListener('click', () => {
        prefs.still = cabin.dataset.still !== 'true';
        setStill(prefs.still);
        savePreferences();
    });
    motion.addEventListener('change', event => {
        if (typeof prefs.still !== 'boolean') setStill(event.matches);
    });
    $('brightness').addEventListener('input', event => setBrightness(Number(event.target.value)));
    $('brightness').addEventListener('change', event => {
        prefs.brightness = Number(event.target.value);
        savePreferences();
    });

    for (const [id, glyph, label] of nativeMenus) {
        const control = element('button', 'cabin-key');
        control.append(icon(glyph), element('span', '', label));
        control.addEventListener('click', () => {
            $('terminal').close();
            if (!actions.openDrawer(id, label)) toast('ไม่พบแผง「' + label + '」');
        });
        $('terminal-keys').append(control);
    }
    $('import-role').addEventListener('click', actions.importRole);

    function setPage(next) {
        const previous = page;
        if (next === 'library' && (previous === 'home' || previous === 'scenic')) beforeLibrary = previous;
        if (next !== 'home') resetScan();
        finishDrag();
        for (const dialog of dialogs) if (dialog.open) dialog.close();
        page = next;
        cabin.dataset.page = next;
        $('home').hidden = next !== 'home';
        $('library').hidden = next !== 'library';
        const reading = next === 'reading';
        for (const control of cabinControls) {
            control.hidden = reading;
            control.inert = reading;
        }
        if (reading !== (previous === 'reading')) void syncAmbience();
        for (const control of navigation) {
            if (control.dataset.pageButton === next || (next === 'reading' && control.dataset.pageButton === 'home')) {
                control.setAttribute('aria-current', 'page');
            } else {
                control.removeAttribute('aria-current');
            }
        }
        $('scenic').setAttribute('aria-pressed', String(next === 'scenic'));
        $('scenic').querySelector('span').textContent = next === 'scenic' ? 'กลับไปสื่อสาร' : 'ชมวิว';
        actions.pageChanged(next, previous);
        if (next === 'home') requestAnimationFrame(() => layoutCards());
    }

    function closeLibrary() {
        setPage(beforeLibrary);
        root.querySelector('[data-page-button="library"]')?.focus({ preventScroll: true });
    }
    $('close-library').addEventListener('click', closeLibrary);
    navigation.forEach(control => control.addEventListener('click', () => {
        if (page === 'library' && control.dataset.pageButton === 'library') closeLibrary();
        else setPage(control.dataset.pageButton);
    }));
    function toggleScenic() {
        if (page === 'scenic') setPage(beforeScenic);
        else {
            beforeScenic = page;
            setPage('scenic');
        }
    }
    $('scenic').addEventListener('click', toggleScenic);
    root.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || dialogs.some(dialog => dialog.open) ||
            document.querySelector('[data-xingjian-panel].openDrawer')) return;
        if (page === 'scenic') toggleScenic();
        else if (page === 'library') closeLibrary();
    });

    function roleOffset(index) {
        const count = recent.length;
        const forward = (index - activeIndex + count) % count;
        if (count === 2 && forward === 1) return side;
        return forward > count / 2 ? forward - count : forward;
    }

    function layoutCards(distance = 0) {
        if (page !== 'home' || !cards.length) return;
        const width = cards[activeIndex].offsetWidth;
        cards.forEach((card, index) => {
            const offset = roleOffset(index);
            const relative = offset + distance;
            const depth = Math.min(2, Math.abs(relative));
            const x = Math.sin(Math.max(-1.8, Math.min(1.8, relative)) * .88) * width * 1.12;
            card.dataset.center = String(index === activeIndex);
            card.style.transform = `translate3d(${x}px,${depth * 10}px,${-depth * 104}px) rotateY(${-relative * 29}deg) scale(${1 - depth * .055})`;
            card.style.opacity = depth > 1.76 ? '0' : String(1 - depth * .43);
            card.style.zIndex = String(10 - Math.round(depth * 3));
            card.tabIndex = index === activeIndex ? 0 : -1;
            card.setAttribute('aria-hidden', String(Math.abs(offset) > 1));
            card.setAttribute('aria-label', index === activeIndex ? 'เปิด ' + recent[index].name : 'สลับไปที่ ' + recent[index].name);
        });
    }

    function resetScan() {
        clearTimeout(scanTimer);
        cards.forEach(card => card.classList.remove('scanning'));
    }

    function showSelection(scan = false) {
        const role = recent[activeIndex];
        $('active-role').textContent = role?.name ?? '';
        $('role-position').textContent = role ? (activeIndex + 1) + ' / ' + recent.length : '';
        $('carousel-empty').hidden = !!role;
        $('previous').disabled = recent.length < 2;
        $('next').disabled = recent.length < 2;
        $('continue-chat').disabled = !role;
        $('choose-session').disabled = !role;
        $('continue-chat').querySelector('span').textContent = role?.hasChat ? 'เล่าเรื่องต่อ' : 'เริ่มเรื่อง';
        resetScan();
        if (role && scan && cabin.dataset.still !== 'true' && page === 'home') {
            const card = cards[activeIndex];
            scanTimer = setTimeout(() => card.classList.add('scanning'), 220);
        }
    }

    function selectRole(index, direction = Math.sign(roleOffset(index))) {
        if (index === activeIndex) return;
        side = direction < 0 ? 1 : -1;
        const restoreFocus = cards[activeIndex] === root.activeElement;
        activeIndex = index;
        layoutCards();
        showSelection(true);
        if (restoreFocus) cards[activeIndex].focus({ preventScroll: true });
    }

    function stepRole(direction) {
        if (recent.length > 1) selectRole((activeIndex + direction + recent.length) % recent.length, direction);
    }

    function putCover(container, role, lazy = false) {
        const image = element('img');
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        if (lazy) image.loading = 'lazy';
        image.addEventListener('error', () => {
            container.classList.add('cover-unavailable');
            image.replaceWith(icon('orbit'));
        }, { once: true });
        image.src = role.image;
        container.append(image);
    }

    function holoCard(role, index) {
        const control = element('button', 'holo-card');
        control.dataset.index = index;
        const cover = element('span', 'cover');
        putCover(cover, role);
        const scan = element('span', 'scan');
        scan.setAttribute('aria-hidden', 'true');
        scan.addEventListener('animationend', event => {
            if (event.animationName === 'cover-scan-reveal') control.classList.remove('scanning');
        });
        cover.append(scan);
        control.append(cover);
        control.addEventListener('click', () => {
            if (performance.now() < suppressClickUntil) return;
            if (index === activeIndex) activate(role.id);
            else selectRole(index);
        });
        return control;
    }

    function finishDrag() {
        clearTimeout(drag?.timer);
        drag = null;
        delete carousel.dataset.dragging;
    }

    carousel.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary || !recent.length) return;
        const card = event.target.closest('.holo-card');
        drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, axis: null, held: false };
        if (card && Number(card.dataset.index) === activeIndex && event.pointerType !== 'mouse') {
            drag.timer = setTimeout(() => {
                if (!drag || drag.axis) return;
                drag.held = true;
                suppressClickUntil = performance.now() + 750;
                openSessions(recent[activeIndex].id);
            }, 520);
        }
        (card || carousel).setPointerCapture(event.pointerId);
    });
    carousel.addEventListener('pointermove', event => {
        if (!drag || drag.pointer !== event.pointerId || drag.held) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 7) {
            drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            clearTimeout(drag.timer);
        }
        if (drag.axis === 'x' && recent.length > 1) {
            carousel.dataset.dragging = 'true';
            layoutCards(Math.max(-.9, Math.min(.9, dx / cards[activeIndex].offsetWidth)));
        }
    });

    function finishPointer(event, cancelled = false) {
        if (!drag || drag.pointer !== event.pointerId) return;
        const { x, axis, held } = drag;
        finishDrag();
        if (axis || held || cancelled) suppressClickUntil = performance.now() + 430;
        const dx = event.clientX - x;
        if (!cancelled && !held && axis === 'x' && Math.abs(dx) > 30) stepRole(dx < 0 ? 1 : -1);
        else layoutCards();
    }
    carousel.addEventListener('pointerup', event => finishPointer(event));
    carousel.addEventListener('pointercancel', event => finishPointer(event, true));
    carousel.addEventListener('lostpointercapture', event => finishPointer(event, true));
    carousel.addEventListener('contextmenu', event => {
        if (event.pointerType === 'touch') event.preventDefault();
    });
    carousel.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        stepRole(event.key === 'ArrowLeft' ? -1 : 1);
    });
    $('previous').addEventListener('click', () => stepRole(-1));
    $('next').addEventListener('click', () => stepRole(1));
    $('continue-chat').addEventListener('click', () => activate(recent[activeIndex].id));
    $('choose-session').addEventListener('click', () => openSessions(recent[activeIndex].id));
    new ResizeObserver(() => layoutCards()).observe(carousel);

    function renderLibrary() {
        const query = $('search').value.trim().toLocaleLowerCase();
        const matches = catalog.filter(role => role.name.toLocaleLowerCase().includes(query));
        const list = matches.map(role => {
            const entry = element('article', 'archive-card');
            const cover = element('button', 'archive-cover');
            const info = element('div', 'archive-info');
            const sessions = element('button', 'holo-key', 'บันทึก');
            putCover(cover, role, true);
            cover.setAttribute('aria-label', 'เปิด ' + role.name);
            sessions.setAttribute('aria-label', 'บันทึกของ ' + role.name);
            cover.addEventListener('click', () => activate(role.id));
            sessions.addEventListener('click', () => openSessions(role.id));
            info.append(element('h2', '', role.name), sessions);
            entry.append(cover, info);
            return entry;
        });
        $('archive-grid').replaceChildren(...list);
        $('empty-search').hidden = !!matches.length;
        $('empty-search').textContent = catalog.length ? 'ไม่พบตัวละครที่ตรงกัน' : 'คลังตัวละครยังว่างอยู่ ลองนำเข้าการ์ดตัวละครก่อน';
        $('role-count').textContent = matches.length + (query ? ' ผลการค้นหา' : ' ตัวละคร');
    }
    $('search').addEventListener('input', () => {
        renderLibrary();
        $('archive-scroll').scrollTop = 0;
    });

    function setRoles(items) {
        const selected = recent[activeIndex]?.id;
        catalog = items;
        recent = catalog.slice(0, 7);
        activeIndex = Math.max(0, recent.findIndex(role => role.id === selected));
        finishDrag();
        cards = recent.map(holoCard);
        $('cards').replaceChildren(...cards);
        showSelection(recent[activeIndex]?.id !== selected);
        layoutCards();
        renderLibrary();
    }

    async function activate(id, file = null, create = false) {
        if (busy) return;
        busy = true;
        $('continue-chat').setAttribute('aria-busy', 'true');
        const origin = page;
        try {
            if ($('sessions').open) $('sessions').close();
            await actions.openRole(id, { file, create, origin });
        } catch (error) {
            toast(error?.message || 'เปิดการสื่อสารไม่สำเร็จ ลองอีกครั้ง');
        } finally {
            busy = false;
            $('continue-chat').removeAttribute('aria-busy');
        }
    }

    async function openSessions(id) {
        if (busy) return;
        const role = catalog.find(item => item.id === id);
        if (!role) return;
        const request = ++archiveRequest;
        archiveRole = id;
        $('session-role').textContent = role.name;
        $('session-list').replaceChildren(element('p', 'session-empty', 'กำลังโหลดบันทึก…'));
        $('new-session').disabled = true;
        showDialog($('sessions'));
        try {
            const entries = await actions.readSessions(id);
            if (request !== archiveRequest || !$('sessions').open) return;
            const list = entries.map(entry => {
                const control = element('button', 'session-item');
                const copy = element('span');
                copy.append(element('strong', '', entry.file + (entry.current ? ' · เปิดล่าสุด' : '')));
                copy.append(element('small', '', entry.detail));
                control.append(copy, icon('right'));
                control.addEventListener('click', () => activate(id, entry.file));
                return control;
            });
            $('session-list').replaceChildren(...(list.length ? list : [element('p', 'session-empty', 'ยังไม่มีบันทึก')]));
            $('new-session').disabled = false;
        } catch {
            if (request === archiveRequest && $('sessions').open) {
                $('session-list').replaceChildren(element('p', 'session-empty', 'โหลดบันทึกไม่สำเร็จ ลองเปิดใหม่อีกครั้ง'));
            }
        }
    }
    $('new-session').addEventListener('click', () => activate(archiveRole, null, true));

    const initialRoute = Object.hasOwn(routeNames, prefs.route) ? prefs.route : 'galaxy';
    setRoute(startRoute.value || initialRoute);
    setStill(typeof prefs.still === 'boolean' ? prefs.still : motion.matches);
    $('brightness').value = prefs.brightness ?? 86;
    setBrightness(Number($('brightness').value));
    return { setPage, setRoles, openSessions, toast, get page() { return page; } };
}
