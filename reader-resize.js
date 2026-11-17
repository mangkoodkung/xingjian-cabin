const widthKey = 'xingjian-desktop-reader-width';

function readWidth() {
    try {
        const value = Number(localStorage.getItem(widthKey));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

function saveWidth(value) {
    try {
        if (value === null) localStorage.removeItem(widthKey);
        else localStorage.setItem(widthKey, String(value));
    } catch {
        // The current width still works without storage.
    }
}

export function mountReaderResize(shell, profile) {
    const compact = matchMedia('(max-width: 760px), (max-height: 500px) and (pointer: coarse)');
    const grip = document.createElement('div');
    grip.className = 'xingjian-resize-grip';
    grip.hidden = true;
    grip.tabIndex = 0;
    grip.title = 'ลากขอบซ้ายเพื่อปรับความกว้างกล่องแชต ดับเบิลคลิกเพื่อคืนค่า';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-label', 'ปรับความกว้างกล่องแชต');
    grip.setAttribute('aria-orientation', 'vertical');
    grip.setAttribute('aria-controls', shell.id);
    shell.append(grip);

    const storedWidth = readWidth();
    if (storedWidth !== null) shell.style.setProperty('--xingjian-user-width', storedWidth + 'px');
    let min = 0;
    let max = 0;
    let drag;

    function showWidth() {
        const { width } = shell.getBoundingClientRect();
        grip.setAttribute('aria-valuenow', String(Math.round(width)));
        return width;
    }

    function sync() {
        const enabled = !compact.matches && document.body.dataset.xingjianMode === 'reading';
        grip.hidden = !enabled;
        if (!enabled) {
            shell.dataset.xingjianProfile = 'inline';
            return;
        }
        shell.dataset.xingjianProfile = 'outside';
        const right = shell.getBoundingClientRect().right;
        const leftLimit = 24 - profile.offsetLeft;
        min = Math.round(Math.min(360, right - leftLimit));
        max = Math.round(Math.min(1180, Math.max(min, right - leftLimit)));
        shell.style.setProperty('--xingjian-resize-min', min + 'px');
        shell.style.setProperty('--xingjian-resize-max', max + 'px');
        grip.setAttribute('aria-valuemin', String(min));
        grip.setAttribute('aria-valuemax', String(max));
        showWidth();
    }

    function applyWidth(target) {
        const width = Math.round(Math.max(min, Math.min(max, target)));
        shell.style.setProperty('--xingjian-user-width', width + 'px');
        showWidth();
        return width;
    }

    grip.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary || grip.hidden) return;
        sync();
        const width = shell.getBoundingClientRect().width;
        drag = { pointer: event.pointerId, start: event.clientX, width, current: width };
        grip.setAttribute('data-dragging', '');
        grip.setPointerCapture(event.pointerId);
        grip.focus({ preventScroll: true });
        event.preventDefault();
    });

    grip.addEventListener('pointermove', event => {
        if (drag?.pointer !== event.pointerId) return;
        drag.current = applyWidth(drag.width + drag.start - event.clientX);
    });

    function finish(event) {
        if (drag?.pointer !== event.pointerId) return;
        if (drag.current !== drag.width) saveWidth(drag.current);
        drag = null;
        grip.removeAttribute('data-dragging');
    }
    grip.addEventListener('pointerup', finish);
    grip.addEventListener('pointercancel', finish);
    grip.addEventListener('lostpointercapture', finish);

    grip.addEventListener('dblclick', () => {
        shell.style.removeProperty('--xingjian-user-width');
        saveWidth(null);
        sync();
    });
    grip.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        sync();
        const current = shell.getBoundingClientRect().width;
        const step = event.shiftKey ? 60 : 18;
        const choices = { ArrowLeft: current + step, ArrowRight: current - step, Home: min, End: max };
        saveWidth(applyWidth(choices[event.key]));
    });

    compact.addEventListener('change', sync);
    // Also track width changes from the original reading tools.
    new ResizeObserver(() => {
        if (!grip.hidden) showWidth();
    }).observe(shell);
    window.addEventListener('resize', sync, { passive: true });
    return { sync };
}
