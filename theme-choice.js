import * as extensions from '../../../extensions.js';

const preference = 'tavern-scenic-theme';
const legacy = {
    'forest-tavern': { id: 'forest', label: 'หลินเจียน', order: 10 },
    'xingjian-cabin': { id: 'xingjian', label: 'ซิงเจียน', order: 20 },
};

export function availableThemes() {
    const themes = new Map();
    const installed = extensions.extensionNames ?? Object.keys(legacy);
    for (const name of installed) {
        if (!extensions.findExtension(name)?.enabled) continue;
        const manifest = extensions.getExtensionManifest?.(name);
        const key = name.replace(/^third-party\//, '');
        const previous = Object.hasOwn(legacy, key) ? legacy[key] : undefined;
        if (!manifest?.js && !previous) continue;
        const metadata = manifest?.scenic_theme;
        const id = metadata?.id ?? previous?.id;
        if (typeof id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(id) || themes.has(id)) continue;
        const label = metadata?.label || previous?.label || manifest?.display_name;
        if (typeof label !== 'string' || !label.trim()) continue;
        const order = metadata?.order ?? previous?.order;
        themes.set(id, { id, label, order: Number.isFinite(order) ? order : 100 });
    }
    return [...themes.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function activeTheme() {
    const themes = availableThemes();
    let selected;
    try {
        selected = localStorage.getItem(preference);
    } catch {
        // Use the default when browser storage is blocked.
    }
    return themes.find(theme => theme.id === selected)?.id ?? themes[0]?.id;
}

export function switchTheme(theme) {
    if (!availableThemes().some(entry => entry.id === theme)) return false;
    try {
        localStorage.setItem(preference, theme);
    } catch {
        return false;
    }
    location.reload();
    return true;
}
