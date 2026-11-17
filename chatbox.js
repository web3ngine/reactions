/* ==========================================================
   WebEngine Chat - Discord-Style Reactions
   File: js/chatbox.js (Version 2)
   ========================================================== */
(function () {
'use strict';

const API_URL = 'reactions.php';
const REFRESH_MS = 5000;

const ALL_EMOJIS = [
    // Smileys
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
    '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕',
    '🤢','🤮','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮',
    '😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓',
    '😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻',
    // Gestures
    '👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋',
    '🤚','🖐️','🖖','👋','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','👃',
    // Hearts & Symbols
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
    '💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐',
    // Animals
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
    '🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴',
    // Food
    '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥',
    '🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠',
    // Objects
    '🔥','💯','⭐','🌟','✨','⚡','☄️','💥','💫','💦','💨','🕳️','💣','💬','👁️‍🗨️','🗨️',
    '🗯️','💭','💤','🎉','🎊','🎈','🎁','🎀','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮',
    '🚀','✈️','🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜',
    '💻','🖥️','⌨️','🖱️','🖲️','💽','💾','💿','📀','📱','📲','☎️','📞','📟','📠','🔋',
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍'
];

let myKey = null;
let pickerEl = null;

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function getMyKey() {
    if (window.WE_CHAT_CONFIG) {
        if (window.WE_CHAT_CONFIG.CURRENT_USER_ID) return 'u:' + window.WE_CHAT_CONFIG.CURRENT_USER_ID;
        if (window.WE_CHAT_CONFIG.GUEST_NAME) return 'g:' + window.WE_CHAT_CONFIG.GUEST_NAME;
    }
    const profileLink = document.querySelector('.chat-user-meta a[href*="profile.php?id="]');
    if (profileLink) {
        const match = profileLink.href.match(/id=(\d+)/);
        if (match) return 'u:' + match[1];
    }
    const guestNote = document.querySelector('.chat-guest-note strong');
    if (guestNote) return 'g:' + guestNote.textContent.trim();
    return null;
}

function canReact() { return !!myKey; }

function injectCSS() {
    if (document.getElementById('we-rx-css')) return;
    const st = document.createElement('style');
    st.id = 'we-rx-css';
    st.textContent = `
    .we-rx-trigger {
        position: absolute; top: 8px; right: 46px;
        width: 28px; height: 28px; border-radius: 6px;
        border: 1px solid var(--border,#dee2e6);
        background: var(--bg-card,#fff);
        color: var(--text-muted,#6c757d);
        font-size: 1rem; cursor: pointer;
        display: none; align-items: center; justify-content: center;
        transition: all .15s ease; z-index: 999;
    }
    .chat-message:hover .we-rx-trigger { display: inline-flex; }
    .we-rx-trigger:hover { background:#5865f2; color:#fff; border-color:#5865f2; }
    [data-theme="dark"] .we-rx-trigger { background:#2a3345; border-color:#3a4560; color:#cbd5e1; }

    /* ПРОЗОРЕЦ С ЕМОДЖИТА - оправен scroll */
    .we-rx-picker {
        position: absolute; top: 42px; right: 8px; background: var(--bg-card,#fff);
        border: 1px solid var(--border,#dee2e6); border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,.20); padding: 8px; z-index: 1000;
        display: none; 
        grid-template-columns: repeat(8, 1fr); /* 8 колони */
        gap: 4px; 
        width: 320px; 
        max-height: 260px; /* Височина на прозореца */
        overflow-y: auto;  /* ТОВА ПРАВИ SCROLL-А */
    }
    /* Скролбар */
    .we-rx-picker::-webkit-scrollbar { width: 6px; }
    .we-rx-picker::-webkit-scrollbar-track { background: transparent; }
    .we-rx-picker::-webkit-scrollbar-thumb { background: rgba(88,101,242,.4); border-radius: 10px; }
    .we-rx-picker::-webkit-scrollbar-thumb:hover { background: rgba(88,101,242,.8); }

    .we-rx-picker.is-open { display: grid; }
    [data-theme="dark"] .we-rx-picker { background:#1e293b; border-color:#334155; }
    
    .we-rx-picker button { 
        width: 34px; height: 34px; border: none; background: transparent; 
        font-size: 1.25rem; border-radius: 6px; cursor: pointer; 
        display: flex; align-items: center; justify-content: center;
        transition: all .1s ease; 
    }
    .we-rx-picker button:hover { background: rgba(88,101,242,.15); transform: scale(1.15); }

    /* Реакции под съобщението */
    .we-rx-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; align-items: center; }
    .we-rx-badge {
        display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px;
        background: rgba(88,101,242,.10); border: 1px solid rgba(88,101,242,.30);
        font-size: .8rem; font-weight: 600; color: #5865f2; cursor: pointer; transition: all .15s ease;
    }
    .we-rx-badge:hover { background: rgba(88,101,242,.20); border-color:#5865f2; }
    .we-rx-badge.is-mine { background: rgba(88,101,242,.22); border-color:#5865f2; }
    .we-rx-badge .we-rx-em { font-size: .95rem; }
    .we-rx-badge .we-rx-cnt { font-size: .72rem; font-weight: 700; }
    [data-theme="dark"] .we-rx-badge { background:rgba(88,101,242,.15); border-color:rgba(88,101,242,.4); color:#8b94ff; }
    [data-theme="dark"] .we-rx-badge.is-mine { background:rgba(88,101,242,.3); border-color:#8b94ff; }
    `;
    document.head.appendChild(st);
}

function loadAll() {
    if (!canReact()) return;
    fetch(API_URL + '?action=list&t=' + Date.now())
        .then(r => r.json())
        .then(d => { if (d.success && d.reactions) renderAll(d.reactions); })
        .catch(() => {});
}

function renderAll(reactionsMap) {
    document.querySelectorAll('.chat-message[data-message-id]').forEach(msgEl => {
        const id = msgEl.dataset.messageId;
        renderRow(msgEl, reactionsMap[id] || []);
    });
}

function renderRow(msgEl, reactions) {
    const old = msgEl.querySelector('.we-rx-row');
    if (old) old.remove();
    if (!reactions || reactions.length === 0) return;

    const content = msgEl.querySelector('.chat-msg-content');
    if (!content) return;

    const row = document.createElement('div');
    row.className = 'we-rx-row';

    reactions.forEach(rx => {
        const badge = document.createElement('span');
        badge.className = 'we-rx-badge' + (rx.mine ? ' is-mine' : '');
        badge.innerHTML = `
            <span class="we-rx-em">${esc(rx.emoji)}</span>
            <span class="we-rx-cnt">${rx.count}</span>
            <span class="we-rx-tip">${esc(rx.users.join(', '))}</span>
        `;
        badge.addEventListener('click', (e) => { e.stopPropagation(); toggleReaction(msgEl.dataset.messageId, rx.emoji); });
        row.appendChild(badge);
    });

    content.appendChild(row);
}

function addTrigger(msgEl) {
    if (msgEl.querySelector('.we-rx-trigger')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'we-rx-trigger';
    btn.innerHTML = '😊';
    btn.title = 'Add reaction';
    btn.addEventListener('click', (e) => { e.stopPropagation(); openPicker(msgEl); });
    msgEl.appendChild(btn);
}

function openPicker(msgEl) {
    closePicker();
    const picker = document.createElement('div');
    picker.className = 'we-rx-picker is-open';
    
    ALL_EMOJIS.forEach(em => {
        const b = document.createElement('button'); 
        b.type = 'button'; 
        b.textContent = em;
        b.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggleReaction(msgEl.dataset.messageId, em); 
            closePicker(); 
        });
        picker.appendChild(b);
    });
    
    msgEl.appendChild(picker);
    pickerEl = picker;
    setTimeout(() => {
        const close = (ev) => { if (!picker.contains(ev.target)) { closePicker(); document.removeEventListener('mousedown', close); } };
        document.addEventListener('mousedown', close);
    }, 50);
}

function closePicker() { if (pickerEl) { pickerEl.remove(); pickerEl = null; } }

function toggleReaction(messageId, emoji) {
    if (!canReact()) return;
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=toggle&message_id=' + encodeURIComponent(messageId) + '&emoji=' + encodeURIComponent(emoji)
    }).then(() => loadAll()).catch(() => {});
}

function watchMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const attach = (msgEl) => { if (msgEl.dataset.messageId) { addTrigger(msgEl); } };
    container.querySelectorAll('.chat-message[data-message-id]').forEach(attach);
    const mo = new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType === 1) {
                if (n.matches && n.matches('.chat-message[data-message-id]')) attach(n);
                n.querySelectorAll && n.querySelectorAll('.chat-message[data-message-id]').forEach(attach);
            }
        }));
    });
    mo.observe(container, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', () => {
    myKey = getMyKey();
    if (!canReact()) {
        console.warn('[WebEngine Reactions] Cannot find user.');
        return;
    }
    injectCSS();
    watchMessages();
    loadAll();
    setInterval(loadAll, REFRESH_MS);
});

})();