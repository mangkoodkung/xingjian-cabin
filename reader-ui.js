const preferenceKey = 'xingjian-reader-type';
const fonts = [
    ['system', 'ฟอนต์ระบบ'], ['round', 'LXGW 975 Yuan'], ['wenkai', 'LXGW WenKai'],
    ['sans', 'Source Han Sans'], ['serif', 'Source Han Serif'],
];
const defaults = { font: 'round', size: 17, leading: 1.85 };
const icons = {
    disconnect: '<path d="M11 5H5v14h6M8 12h13m-9-4-4 4 4 4"/>',
    font: '<path d="m2.5 17 5-11 5 11M4.2 13h6.5m9.8 4v-6h-2.7a3 3 0 1 0 0 6h2.7Z"/>',
    controls: '<path d="M3 8V5h5m8 0h5v3m0 8v3h-5m-8 0H3v-3"/><circle cx="7" cy="12" r=".75"/><circle cx="12" cy="12" r=".75"/><circle cx="17" cy="12" r=".75"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
};

export function readerKey(icon, label, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'xingjian-key ' + className;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[icon] + '</svg>';
    return button;
}

function readPrefs() {
    try {
        const stored = JSON.parse(localStorage.getItem(preferenceKey));
        return {
            font: fonts.some(([value]) => value === stored?.font) ? stored.font : defaults.font,
            size: Number.isFinite(stored?.size) ? Math.min(26, Math.max(14, stored.size)) : defaults.size,
            leading: Number.isFinite(stored?.leading) ? Math.min(2.4, Math.max(1.4, stored.leading)) : defaults.leading,
        };
    } catch { return { ...defaults }; }
}

export function mountReaderControls(shell, head, actions) {
    const fontsKey = readerKey('font', 'ฟอนต์สำหรับอ่าน', 'xingjian-font-key');
    const toolsKey = readerKey('controls', 'ตัวเลือกการสื่อสาร', 'xingjian-tools-key');
    const profileKey = document.createElement('button');
    profileKey.type = 'button';
    profileKey.className = 'xingjian-key xingjian-profile-key';
    const profileLabel = document.createElement('span');
    profileKey.append(profileLabel);
    const panel = document.createElement('section');
    panel.className = 'xingjian-reader-panel';
    panel.id = 'xingjian-reader-panel';
    panel.hidden = true;
    const header = document.createElement('div');
    header.className = 'xingjian-panel-top';
    const title = document.createElement('strong');
    title.id = 'xingjian-reader-panel-title';
    const closeKey = readerKey('close', 'ซ่อนแผง', 'xingjian-panel-close');
    header.append(title, closeKey);
    const fontSheet = document.createElement('div');
    fontSheet.className = 'xingjian-font-sheet';
    const profileSheet = document.createElement('figure');
    profileSheet.className = 'xingjian-profile-sheet';
    const profileImage = document.createElement('img');
    profileImage.alt = '';
    profileImage.decoding = 'async';
    profileImage.draggable = false;
    profileSheet.append(profileImage);
    const toolSheet = document.createElement('div');
    toolSheet.className = 'xingjian-tool-sheet';
    const toolList = document.createElement('div');
    toolList.className = 'xingjian-tool-list';
    const cardTools = document.createElement('div');
    cardTools.className = 'xingjian-card-tools';
    toolSheet.append(toolList, cardTools);
    panel.setAttribute('aria-labelledby', title.id);
    panel.append(header, fontSheet, profileSheet, toolSheet);
    head.append(panel);

    let active = '';
    let prefs = readPrefs();
    let profileName = '';
    let profileSource = '';
    const titles = { font: 'ฟอนต์สำหรับอ่าน', tools: 'ตัวเลือกการสื่อสาร' };
    const triggers = { font: fontsKey, tools: toolsKey, profile: profileKey };
    for (const [key, trigger] of Object.entries(triggers)) {
        trigger.setAttribute('aria-controls', panel.id);
        trigger.setAttribute('aria-expanded', 'false');
        trigger.addEventListener('click', () => show(active === key ? '' : key));
    }
    function show(next, { restoreFocus = false } = {}) {
        const previous = active;
        active = next;
        panel.hidden = !next;
        fontSheet.hidden = next !== 'font';
        profileSheet.hidden = next !== 'profile';
        toolSheet.hidden = next !== 'tools';
        title.textContent = next === 'profile' ? profileName : titles[next] ?? '';
        if (next === 'profile' && profileImage.getAttribute('src') !== profileSource) profileImage.src = profileSource;
        for (const [key, trigger] of Object.entries(triggers)) trigger.setAttribute('aria-expanded', String(next === key));
        if (restoreFocus && previous) triggers[previous].focus({ preventScroll: true });
    }

    closeKey.addEventListener('click', () => show('', { restoreFocus: true }));
    document.addEventListener('pointerdown', event => {
        if (active && !event.composedPath().some(node => node === panel || node === triggers[active])) show('');
    });
    head.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !active) return;
        event.stopPropagation();
        show('', { restoreFocus: true });
    });

    function field(parent, label, input, output) {
        const row = document.createElement('label');
        row.className = 'xingjian-font-setting';
        const name = document.createElement('span');
        name.textContent = label;
        row.append(name, input);
        if (output) row.append(output);
        parent.append(row);
    }

    const select = document.createElement('select');
    select.id = 'xingjian-reader-font';
    for (const [id, label] of fonts) select.add(new Option(label, id));
    field(fontSheet, 'ฟอนต์', select);

    function range(key, label, min, max, step) {
        const input = document.createElement('input');
        input.id = 'xingjian-reader-' + key;
        input.type = 'range';
        Object.assign(input, { min, max, step });
        const output = document.createElement('output');
        output.htmlFor = input.id;
        field(fontSheet, label, input, output);
        input.addEventListener('input', () => {
            prefs[key] = input.valueAsNumber;
            apply(true);
        });
        return { input, output };
    }
    const size = range('size', 'ขนาดตัวอักษร', 14, 26, 1);
    const leading = range('leading', 'ระยะบรรทัด', 1.4, 2.4, .05);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'xingjian-key';
    reset.textContent = 'คืนค่าเริ่มต้น';
    fontSheet.append(reset);
    reset.addEventListener('click', () => {
        prefs = { ...defaults };
        apply(true);
    });
    select.addEventListener('change', () => {
        prefs.font = select.value;
        apply(true);
    });
    function apply(save) {
        shell.dataset.xingjianFont = prefs.font;
        shell.style.setProperty('--xingjian-reading-size', prefs.size + 'px');
        shell.style.setProperty('--xingjian-reading-leading', String(prefs.leading));
        select.value = prefs.font;
        size.input.value = prefs.size;
        size.output.value = prefs.size + ' px';
        leading.input.value = prefs.leading;
        leading.output.value = prefs.leading.toFixed(2);
        if (save) {
            try { localStorage.setItem(preferenceKey, JSON.stringify(prefs)); } catch { /* Tab only. */ }
        }
    }
    apply(false);

    const tools = new Map();
    for (const [key, label, activate, stayOpen = false] of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'xingjian-key xingjian-tool';
        button.textContent = label;
        button.dataset.xingjianTool = key;
        button.addEventListener('click', () => {
            if (!stayOpen) show('');
            activate(button);
        });
        toolList.append(button);
        tools.set(key, button);
    }
    return {
        keys: [fontsKey, toolsKey],
        profileKey,
        setProfile(name, image) {
            profileName = name;
            profileSource = image;
            profileLabel.textContent = name;
            profileKey.setAttribute('aria-label', 'ดูรูปโปรไฟล์ของ ' + name);
            if (active === 'profile') show('profile');
        },
        tools,
        close: () => show(''),
        dockCardTools() {
            const nav = shell.querySelector('.qinghe-reader-bar');
            if (nav && nav.parentElement !== cardTools) cardTools.append(nav);
        },
    };
}

// Only style ordinary rendered dialogue. Keep card-owned HTML, embeds and formatting intact.
const customMarkup = [
    'iframe', 'style', 'script', 'link', 'svg', 'canvas', 'form', 'button', 'input', 'label',
    'div', 'details', 'summary', 'dialog', 'audio', 'video', 'object', 'embed', 'font',
    '[id]', '[class]:not(span[class="text_segment"])', '[style]', '[data-type]', '[data-divine-theme]', '[data-divine-scope]',
].join(',');
export function watchTranscript(chat) {
    function mark(message) {
        if (message.parentElement !== chat) return;
        const text = message.querySelector(':scope > .mes_block > .mes_text');
        if (!text || text.querySelector(':scope > .edit_textarea')) return;
        const plain = !text.matches('.inline_media') && !text.querySelector(customMarkup) && Boolean(text.textContent.trim());
        message.toggleAttribute('data-xingjian-transcript', plain && message.getAttribute('is_system') !== 'true');
    }
    for (const message of chat.querySelectorAll(':scope > .mes')) mark(message);
    new MutationObserver(records => {
        const messages = new Set();
        for (const { target, addedNodes } of records) {
            const message = (target instanceof Element ? target : target.parentElement)?.closest('.mes');
            if (message) messages.add(message);
            if (target === chat) for (const node of addedNodes) if (node instanceof Element && node.matches('.mes')) messages.add(node);
        }
        for (const message of messages) mark(message);
    }).observe(chat, { childList: true, characterData: true, subtree: true });
}
