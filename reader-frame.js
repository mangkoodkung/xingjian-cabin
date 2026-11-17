function readerOutline(width, height, cut, step, inset = 0, joint = null) {
    const left = inset + .5;
    const right = width - left;
    const top = left;
    const bottom = height - top;
    const shoulder = top + step;
    const base = bottom - step;
    const topStart = Math.round(width * .19);
    const topEnd = Math.round(width * .38);
    const bottomStart = Math.round(width * .37);
    const bottomEnd = Math.round(width * .73);
    const from = joint === null ? shoulder + cut : joint - 13;
    const to = joint === null ? 'Z' : `V ${joint + 14}`;

    return `M ${left} ${from} V ${shoulder + cut}
        l ${cut} ${-cut} H ${topStart} l ${step} ${-step}
        H ${topEnd} l ${step} ${step} H ${right - cut} l ${cut} ${cut}
        V ${base - cut} l ${-cut} ${cut} H ${bottomEnd + step} l ${-step} ${step}
        H ${bottomStart} l ${-step} ${-step} H ${left + cut} l ${-cut} ${-cut} ${to}`;
}

function readoutTracks(width, height, cut, step) {
    const start = Math.round(width * .19);
    const topEnd = Math.round(width * .34);
    const upperRight = Math.round(width * .68);
    const bottomStart = Math.round(width * .40);
    const bottomEnd = Math.round(width * .70);
    return `M 2 ${cut + step - 5} l ${cut - 5} ${5 - cut}
        H ${start - 2} l ${step} ${-step} H ${topEnd}
        M ${upperRight} ${step - 2} h 23 l 6 -5 h 28
        M ${bottomStart} ${height + 3} H ${bottomEnd}
        M ${width - cut - 36} ${height - step + 4} h 24 l 10 -10`;
}

function drawConnector(parts, profile, joint) {
    const start = .5;
    const x = profile.offsetLeft + profile.offsetWidth - 2;
    const elbow = start + (x - start) * .55;
    const y = joint - 14;
    const d = `M ${start} ${joint} L ${elbow} ${y} H ${x}`;
    parts.link.setAttribute('d', d);
    parts.glow.setAttribute('d', d);
    parts.joint.setAttribute('transform', `translate(${start} ${joint})`);
    parts.tip.setAttribute('transform', `translate(${x} ${y})`);
}

export function mountReaderFrame(shell, form, profile) {
    const decoration = document.createElement('template');
    decoration.innerHTML = `
        <div class="xingjian-glass" aria-hidden="true">
            <svg class="xingjian-reader-outline" focusable="false">
                <defs>
                    <linearGradient id="xingjian-reading-tint" x2="72%" y2="100%">
                        <stop class="xingjian-tint-start"/>
                        <stop class="xingjian-tint-middle" offset=".53"/>
                        <stop class="xingjian-tint-end" offset="1"/>
                    </linearGradient>
                    <linearGradient id="xingjian-reading-edge" x2="92%" y2="100%">
                        <stop stop-color="#e1d1f5" stop-opacity=".8"/>
                        <stop offset=".46" stop-color="#aa95cc" stop-opacity=".4"/>
                        <stop offset="1" stop-color="#f0d5b8" stop-opacity=".68"/>
                    </linearGradient>
                </defs>
                <path class="xingjian-reading-tint" fill="url(#xingjian-reading-tint)"/>
                <path class="xingjian-reading-edge" stroke="url(#xingjian-reading-edge)"/>
                <path class="xingjian-reading-inset"/>
                <path class="xingjian-reading-tracks"/>
                <g class="xingjian-profile-link">
                    <path class="xingjian-link-glow" pathLength="1"/>
                    <path class="xingjian-link-path" pathLength="1"/>
                    <g class="xingjian-link-joint">
                        <circle r="8"/>
                        <circle r="4.7"/>
                        <circle r="2.1"/>
                    </g>
                    <g class="xingjian-link-tip">
                        <circle r="4"/>
                        <circle r="1.45"/>
                    </g>
                </g>
            </svg>
        </div>
    `;
    const glass = decoration.content.firstElementChild;
    shell.append(glass);
    const composer = form.querySelector('#send_form');
    composer.insertAdjacentHTML('afterbegin', `
        <svg class="xingjian-console-outline" aria-hidden="true" focusable="false">
            <path class="xingjian-console-tint"/>
            <path class="xingjian-console-edge"/>
        </svg>
    `);
    const consoleTint = composer.querySelector('.xingjian-console-tint');
    const consoleEdge = composer.querySelector('.xingjian-console-edge');
    const paths = {
        tint: glass.querySelector('.xingjian-reading-tint'),
        edge: glass.querySelector('.xingjian-reading-edge'),
        inset: glass.querySelector('.xingjian-reading-inset'),
        tracks: glass.querySelector('.xingjian-reading-tracks'),
        link: glass.querySelector('.xingjian-link-path'),
        glow: glass.querySelector('.xingjian-link-glow'),
        joint: glass.querySelector('.xingjian-link-joint'),
        tip: glass.querySelector('.xingjian-link-tip'),
    };
    let lastFrame;
    let lastConsole;

    function draw() {
        if (document.body.dataset.xingjianMode !== 'reading') return;
        const { clientWidth: width, clientHeight: height } = glass;
        if (!width || height < 62) return;
        const compact = width < 465;
        const joint = shell.dataset.xingjianProfile === 'outside' ? profile.offsetTop + 43 : null;
        const signature = [width, height, joint, joint === null ? 0 : profile.offsetLeft].join(':');
        if (lastFrame === signature) return;
        lastFrame = signature;

        const cut = compact ? 11 : 19;
        const step = compact ? 4 : 7;
        paths.tint.setAttribute('d', readerOutline(width, height, cut, step));
        paths.edge.setAttribute('d', readerOutline(width, height, cut, step, 0));
        paths.inset.setAttribute('d', readerOutline(width, height, cut - 2, step, 4));
        paths.tracks.setAttribute('d', readoutTracks(width, height, cut, step));
        if (joint !== null) drawConnector(paths, profile, joint);
    }

    function drawConsole() {
        const { clientWidth: width, clientHeight: height } = composer;
        if (!width || !height) return;
        const signature = width + ':' + height;
        if (lastConsole === signature) return;
        lastConsole = signature;
        const start = Math.round(width * .26);
        const end = Math.round(width * .73);
        const right = width - .5;
        const bottom = height - .5;
        const d = `M .5 14.5 l 10 -10 H ${start} l 4 -4 H ${end}
            l 4 4 H ${right - 15} l 15 15 V ${bottom - 10} l -10 10
            H 10.5 l -10 -10 Z`;
        consoleTint.setAttribute('d', d);
        consoleEdge.setAttribute('d', d);
    }

    const sizes = new ResizeObserver(draw);
    sizes.observe(glass);
    sizes.observe(profile);
    new MutationObserver(draw).observe(shell, {
        attributes: true, attributeFilter: ['data-xingjian-profile'],
    });
    // The glass ends above the native input, including any extra rows it adds.
    const composerSize = new ResizeObserver(() => {
        shell.style.setProperty('--xingjian-console-height', form.getBoundingClientRect().height + 'px');
        draw();
        drawConsole();
    });
    composerSize.observe(form, { box: 'border-box' });
    composerSize.observe(composer, { box: 'border-box' });

    let animations = [];
    function project(still) {
        animations.forEach(animation => animation.cancel());
        animations = [];
        draw();
        if (still || shell.dataset.xingjianProfile !== 'outside') return;
        animations = [
            paths.joint.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 130, easing: 'ease-out' }),
            ...[paths.link, paths.glow].map(path => path.animate(
                [{ strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }],
                { duration: 330, delay: 65, easing: 'ease-out', fill: 'backwards' },
            )),
            paths.tip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: 275, fill: 'backwards' }),
            profile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 310, delay: 295, fill: 'backwards' }),
        ];
    }

    return { draw, project };
}
