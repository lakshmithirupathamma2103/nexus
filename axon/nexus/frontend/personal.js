// ═══ PERSONALISE MODE ═════════════════════════════════════

const tools = [
    { id:'writing', icon:'✍️', name:'Writing Editor', desc:'AI-powered writing improvement', cat:'Writing' },
    { id:'prd', icon:'📋', name:'PRD → Prototype', desc:'Turn PRDs into prototype plans', cat:'Product' },
    { id:'slack', icon:'💬', name:'Slack Insights', desc:'Analyze team communication', cat:'Teams' },
    { id:'notes', icon:'📝', name:'Note Transformer', desc:'Transform raw notes into structured content', cat:'Notes' },
    { id:'brainstorm', icon:'🧠', name:'Brainstorm Gen', desc:'AI-powered idea generation', cat:'Ideas' },
    { id:'flashcards', icon:'🃏', name:'Flashcard Creator', desc:'Generate study flashcards', cat:'Learning' },
    { id:'code', icon:'🔄', name:'Code Converter', desc:'Convert code between languages', cat:'Dev' },
    { id:'pylingo', icon:'🐍', name:'PyLingo', desc:'Python code explainer & optimizer', cat:'Python' },
    { id:'qr', icon:'📱', name:'QR Generator', desc:'Generate QR codes instantly', cat:'Utility' },
    { id:'forest', icon:'🌲', name:'Forest Explorer', desc:'Focus timer with growing trees', cat:'Focus' },
    { id:'resume', icon:'👔', name:'Resume Builder', desc:'AI-powered resume creation', cat:'Career' },
    { id:'email', icon:'📧', name:'Email Composer', desc:'Compose professional emails', cat:'Writing' },
    { id:'social', icon:'📣', name:'Social Media Gen', desc:'Generate social media content', cat:'Social' },
    { id:'habit', icon:'✅', name:'Habit Tracker', desc:'Track daily habits with streaks', cat:'Wellness' },
    { id:'image_prompt', icon:'🎨', name:'Image Prompt Gen', desc:'Generate AI image prompts', cat:'Creative' },
    { id:'todo', icon:'📌', name:'AI To-Do Manager', desc:'Organize tasks with AI', cat:'Productivity' }
];

function initTools() {
    renderToolGrid();
}

function renderToolGrid() {
    const grid = document.getElementById('tool-grid');
    if (!grid) return;
    grid.innerHTML = tools.map(t => `<div class="tool-card" onclick="openTool('${t.id}')"><div class="icon">${t.icon}</div><div class="name">${t.name}</div><div class="desc">${t.desc}</div><span class="cat">${t.cat}</span></div>`).join('');
    grid.style.display = 'grid';
    document.getElementById('tool-panel-area').innerHTML = '';
}

function filterTools() {
    const q = document.getElementById('tool-search').value.toLowerCase();
    document.querySelectorAll('.tool-card').forEach((card, i) => {
        const t = tools[i];
        card.style.display = (t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q)) ? '' : 'none';
    });
}

function openTool(id) {
    document.getElementById('tool-grid').style.display = 'none';
    document.getElementById('tool-search').style.display = 'none';
    const area = document.getElementById('tool-panel-area');
    area.innerHTML = '<button class="back-btn" onclick="closeTool()">← Back to Tools</button>' + getToolPanel(id);
    if (id === 'qr') loadQRScript();
    if (id === 'forest') initForest();
    if (id === 'habit') initHabit();
}

function closeTool() {
    document.getElementById('tool-grid').style.display = 'grid';
    document.getElementById('tool-search').style.display = '';
    document.getElementById('tool-panel-area').innerHTML = '';
}

function getToolPanel(id) {
    const panels = {
        writing: `<div class="card"><div class="card-title">✍️ Writing Editor</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
            <button class="action-btn" onclick="writingAction('improve')">✨ AI Improve</button>
            <button class="action-btn" onclick="writingAction('tone_professional')">🎯 Professional</button>
            <button class="action-btn" onclick="writingAction('tone_friendly')">😊 Friendly</button>
            <button class="action-btn" onclick="writingAction('shorten')">📏 Shorten</button>
            <button class="action-btn" onclick="writingAction('grammar')">🔍 Grammar</button></div>
            <textarea class="auth-input" id="writing-input" rows="8" placeholder="Write or paste your text here..." style="resize:vertical"></textarea>
            <div class="card" id="writing-output" style="margin-top:12px;display:none"></div></div>`,

        prd: `<div class="card"><div class="card-title">📋 PRD → Prototype</div>
            <textarea class="auth-input" id="prd-input" rows="8" placeholder="Paste your PRD description..." style="resize:vertical"></textarea>
            <button class="action-btn primary" style="margin-top:8px" onclick="prdAction()">Generate Prototype Plan</button>
            <div class="card" id="prd-output" style="margin-top:12px;display:none"></div></div>`,

        brainstorm: `<div class="card"><div class="card-title">🧠 Brainstorm Generator</div>
            <input class="auth-input" id="bs-topic" placeholder="Enter a topic to brainstorm...">
            <button class="action-btn primary" style="margin-top:8px" onclick="brainstormAction()">Generate Ideas</button>
            <div id="bs-output" style="margin-top:16px;display:none"></div></div>`,

        flashcards: `<div class="card"><div class="card-title">🃏 Flashcard Creator</div>
            <input class="auth-input" id="pfc-topic" placeholder="Enter a topic...">
            <div style="display:flex;gap:8px;margin:8px 0"><button class="option-btn selected" onclick="setPFCCount(10)">10</button><button class="option-btn" onclick="setPFCCount(20)">20</button><button class="option-btn" onclick="setPFCCount(30)">30</button></div>
            <button class="action-btn primary" onclick="personalFlashcards()">Generate</button>
            <div id="pfc-area" style="margin-top:16px;display:none"></div></div>`,

        code: `<div class="card"><div class="card-title">🔄 Code Converter</div>
            <div class="grid-2" style="margin-bottom:12px"><div><label style="font-size:13px;color:var(--text2)">From:</label><select class="auth-input" id="code-from">${getLangOptions()}</select></div>
            <div><label style="font-size:13px;color:var(--text2)">To:</label><select class="auth-input" id="code-to">${getLangOptions()}</select></div></div>
            <div class="grid-2"><textarea class="auth-input mono" id="code-input" rows="10" placeholder="Paste code here..." style="resize:vertical;font-size:13px"></textarea>
            <textarea class="auth-input mono" id="code-output" rows="10" readonly placeholder="Converted code..." style="resize:vertical;font-size:13px;background:var(--bg4)"></textarea></div>
            <button class="action-btn primary" style="margin-top:8px" onclick="convertCode()">Convert →</button></div>`,

        qr: `<div class="card"><div class="card-title">📱 QR Generator</div>
            <input class="auth-input" id="qr-url" placeholder="Enter URL or text...">
            <div style="display:flex;gap:12px;margin:8px 0;align-items:center"><label style="font-size:13px;color:var(--text2)">Color:</label><input type="color" id="qr-color" value="#3b82f6" style="border:none;background:none;cursor:pointer">
            <label style="font-size:13px;color:var(--text2)">Error Correction:</label><select class="auth-input" id="qr-ec" style="width:auto"><option>L</option><option>M</option><option selected>Q</option><option>H</option></select></div>
            <button class="action-btn primary" onclick="generateQR()">Generate QR Code</button>
            <div id="qr-display" style="display:flex;justify-content:center;margin-top:16px"></div></div>`,

        forest: `<div class="card" style="text-align:center"><div class="card-title" style="justify-content:center">🌲 Forest Explorer</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px"><button class="option-btn selected" onclick="setForestTime(25)">25 min</button><button class="option-btn" onclick="setForestTime(50)">50 min</button><button class="option-btn" onclick="setForestTime(90)">90 min</button></div>
            <div class="forest-tree" id="forest-tree">🌱</div>
            <div class="forest-timer" id="forest-display">25:00</div>
            <div style="display:flex;gap:8px;justify-content:center"><button class="action-btn primary" id="forest-start" onclick="toggleForest()">Start</button><button class="action-btn" onclick="resetForest()">Reset</button></div>
            <p style="margin-top:16px;color:var(--text3);font-size:13px">🌳 Trees planted: <strong id="forest-count">${forestState.trees}</strong></p></div>`,

        email: `<div class="card"><div class="card-title">📧 Email Composer</div>
            <textarea class="auth-input" id="email-context" rows="4" placeholder="What's the email about?" style="resize:vertical"></textarea>
            <div style="display:flex;gap:8px;margin:8px 0"><button class="option-btn selected" onclick="setEmailTone(this,'Professional')">Professional</button><button class="option-btn" onclick="setEmailTone(this,'Friendly')">Friendly</button><button class="option-btn" onclick="setEmailTone(this,'Assertive')">Assertive</button><button class="option-btn" onclick="setEmailTone(this,'Apologetic')">Apologetic</button></div>
            <button class="action-btn primary" onclick="composeEmail()">Compose Email</button>
            <div class="card" id="email-output" style="margin-top:12px;display:none"></div></div>`,

        notes: `<div class="card"><div class="card-title">📝 Note Transformer</div>
            <textarea class="auth-input" id="pnotes-input" rows="8" placeholder="Paste raw notes..." style="resize:vertical"></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="action-btn primary" onclick="personalNotes('transform')">✨ Transform</button><button class="action-btn" onclick="personalNotes('summary')">📌 Summary</button><button class="action-btn" onclick="personalNotes('formulas')">🧪 Formulas</button><button class="action-btn" onclick="personalNotes('questions')">❓ Questions</button></div>
            <div class="card" id="pnotes-output" style="margin-top:12px;display:none"></div></div>`,

        resume: `<div class="card"><div class="card-title">👔 Resume Builder</div>
            <textarea class="auth-input" id="resume-input" rows="8" placeholder="Enter your details: name, experience, education, skills..." style="resize:vertical"></textarea>
            <button class="action-btn primary" style="margin-top:8px" onclick="buildResume()">Build Resume</button>
            <div class="card" id="resume-output" style="margin-top:12px;display:none"></div></div>`,

        social: `<div class="card"><div class="card-title">📣 Social Media Gen</div>
            <textarea class="auth-input" id="social-input" rows="4" placeholder="What do you want to post about?" style="resize:vertical"></textarea>
            <div style="display:flex;gap:8px;margin:8px 0"><button class="option-btn selected" onclick="setSocialPlatform(this,'Twitter')">Twitter</button><button class="option-btn" onclick="setSocialPlatform(this,'LinkedIn')">LinkedIn</button><button class="option-btn" onclick="setSocialPlatform(this,'Instagram')">Instagram</button></div>
            <button class="action-btn primary" onclick="genSocial()">Generate Content</button>
            <div class="card" id="social-output" style="margin-top:12px;display:none"></div></div>`,

        image_prompt: `<div class="card"><div class="card-title">🎨 Image Prompt Gen</div>
            <textarea class="auth-input" id="imgp-input" rows="4" placeholder="Describe your concept..." style="resize:vertical"></textarea>
            <button class="action-btn primary" style="margin-top:8px" onclick="genImagePrompts()">Generate Prompts</button>
            <div class="card" id="imgp-output" style="margin-top:12px;display:none"></div></div>`,

        todo: `<div class="card"><div class="card-title">📌 AI To-Do Manager</div>
            <textarea class="auth-input" id="todo-input" rows="6" placeholder="List your tasks or describe a complex task..." style="resize:vertical"></textarea>
            <div style="display:flex;gap:8px;margin-top:8px"><button class="action-btn primary" onclick="todoAction('organize')">📋 Organize</button><button class="action-btn" onclick="todoAction('breakdown')">🔨 Break Down</button><button class="action-btn" onclick="todoAction('schedule')">📅 Schedule</button></div>
            <div class="card" id="todo-output" style="margin-top:12px;display:none"></div></div>`,

        pylingo: `<div class="card"><div class="card-title">🐍 PyLingo</div>
            <textarea class="auth-input mono" id="py-input" rows="10" placeholder="Paste Python code..." style="resize:vertical;font-size:13px"></textarea>
            <div style="display:flex;gap:8px;margin-top:8px"><button class="action-btn primary" onclick="pyAction('explain')">💡 Explain</button><button class="action-btn" onclick="pyAction('optimize')">⚡ Optimize</button><button class="action-btn" onclick="pyAction('debug')">🐛 Debug</button><button class="action-btn" onclick="pyAction('document')">📝 Document</button></div>
            <div class="card" id="py-output" style="margin-top:12px;display:none"></div></div>`,

        slack: `<div class="card"><div class="card-title">💬 Slack Insights</div>
            <textarea class="auth-input" id="slack-input" rows="8" placeholder="Paste Slack conversation or messages..." style="resize:vertical"></textarea>
            <button class="action-btn primary" style="margin-top:8px" onclick="slackAction()">Analyze Conversation</button>
            <div class="card" id="slack-output" style="margin-top:12px;display:none"></div></div>`,

        habit: `<div class="card" style="text-align:center"><div class="card-title" style="justify-content:center">✅ Habit Tracker</div><div id="habit-area"></div></div>`
    };
    return panels[id] || '<div class="card"><p>Tool coming soon</p></div>';
}

function getLangOptions() {
    return ['Python','JavaScript','TypeScript','Java','C++','C#','Go','Rust','Ruby','PHP','Swift','Kotlin','Dart','R','SQL','Bash','Perl','Scala','Haskell','Lua'].map(l => `<option>${l}</option>`).join('');
}

// ── TOOL ACTIONS ──────────────────────────────────────────
let emailTone = 'Professional';
let socialPlatform = 'Twitter';
let pfcCount = 10;

function setEmailTone(btn, t) { emailTone = t; btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('selected', b === btn)); }
function setSocialPlatform(btn, p) { socialPlatform = p; btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('selected', b === btn)); }
function setPFCCount(n) { pfcCount = n; document.querySelectorAll('#tool-panel-area .option-btn').forEach(b => { if(['10','20','30'].includes(b.textContent)) b.classList.toggle('selected', b.textContent==n); }); }

async function toolAPI(tool, body, outputId) {
    const out = document.getElementById(outputId);
    out.innerHTML = '<div class="spinner"></div>';
    out.style.display = 'block';
    try {
        const r = await fetch(API + '/api/personal/tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool, ...body }) });
        const d = await r.json();
        if (d.error) { out.innerHTML = `<p style="color:var(--red)">${d.error}</p>`; return d; }
        return d;
    } catch (e) { out.innerHTML = '<p style="color:var(--red)">Request failed</p>'; return null; }
}

async function writingAction(action) {
    const text = document.getElementById('writing-input').value.trim();
    if (!text) return showToast('Enter some text first');
    const d = await toolAPI('writing', { action, text }, 'writing-output');
    if (d?.result) document.getElementById('writing-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function prdAction() {
    const text = document.getElementById('prd-input').value.trim();
    if (!text) return showToast('Enter your PRD');
    const d = await toolAPI('prd', { text }, 'prd-output');
    if (d?.result) document.getElementById('prd-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function brainstormAction() {
    const topic = document.getElementById('bs-topic').value.trim();
    if (!topic) return showToast('Enter a topic');
    const out = document.getElementById('bs-output');
    out.innerHTML = '<div class="spinner"></div>';
    out.style.display = 'block';
    try {
        const r = await fetch(API + '/api/personal/tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'brainstorm', topic }) });
        const d = await r.json();
        out.innerHTML = `<div class="grid-3">
        <div class="card" style="border-color:rgba(59,130,246,0.2)"><div class="card-title" style="color:var(--accent)">💡 Core Ideas</div>${(d.core_ideas||[]).map(i=>`<p style="font-size:13px;margin-bottom:6px">• ${i}</p>`).join('')}</div>
        <div class="card" style="border-color:rgba(16,185,129,0.2)"><div class="card-title" style="color:var(--green)">🔗 Connections</div>${(d.connections||[]).map(i=>`<p style="font-size:13px;margin-bottom:6px">• ${i}</p>`).join('')}</div>
        <div class="card" style="border-color:rgba(236,72,153,0.2)"><div class="card-title" style="color:var(--pink)">🚀 Wild Ideas</div>${(d.wild_ideas||[]).map(i=>`<p style="font-size:13px;margin-bottom:6px">• ${i}</p>`).join('')}</div></div>`;
    } catch (e) { out.innerHTML = '<p style="color:var(--red)">Failed</p>'; }
}

async function personalFlashcards() {
    const topic = document.getElementById('pfc-topic').value.trim();
    if (!topic) return showToast('Enter a topic');
    const out = document.getElementById('pfc-area');
    out.innerHTML = '<div class="spinner"></div>';
    out.style.display = 'block';
    try {
        const r = await fetch(API + '/api/personal/tool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'flashcards', topic, count: pfcCount }) });
        const d = await r.json();
        const cards = d.flashcards || [];
        let idx = 0;
        function show() {
            const c = cards[idx];
            out.innerHTML = `<p style="text-align:center;color:var(--text3)">Card ${idx+1} of ${cards.length}</p>
            <div class="flashcard" onclick="this.classList.toggle('flipped')"><div class="flashcard-inner">
            <div class="flashcard-front"><div><p style="color:var(--text3);font-size:12px;margin-bottom:8px">QUESTION</p><p>${c.question}</p></div></div>
            <div class="flashcard-back"><div><p style="color:var(--pink);font-size:12px;margin-bottom:8px">ANSWER</p><p>${c.answer}</p></div></div></div></div>
            <div style="display:flex;justify-content:center;gap:8px"><button class="action-btn" onclick="idx=${(idx-1+cards.length)%cards.length};(${show.toString()})()">← Prev</button><button class="action-btn" onclick="idx=${(idx+1)%cards.length};(${show.toString()})()">Next →</button></div>`;
        }
        window._pfcCards = cards;
        window._pfcIdx = 0;
        renderPFCard();
    } catch (e) { out.innerHTML = '<p style="color:var(--red)">Failed</p>'; }
}

function renderPFCard() {
    if (!window._pfcCards?.length) return;
    const c = window._pfcCards[window._pfcIdx];
    const out = document.getElementById('pfc-area');
    out.innerHTML = `<p style="text-align:center;color:var(--text3)">Card ${window._pfcIdx+1} of ${window._pfcCards.length}</p>
    <div class="flashcard" onclick="this.classList.toggle('flipped')"><div class="flashcard-inner">
    <div class="flashcard-front"><div><p style="color:var(--text3);font-size:12px;margin-bottom:8px">QUESTION</p><p>${c.question}</p></div></div>
    <div class="flashcard-back"><div><p style="color:var(--pink);font-size:12px;margin-bottom:8px">ANSWER</p><p>${c.answer}</p></div></div></div></div>
    <div style="display:flex;justify-content:center;gap:8px"><button class="action-btn" onclick="window._pfcIdx=(window._pfcIdx-1+window._pfcCards.length)%window._pfcCards.length;renderPFCard()">← Prev</button><button class="action-btn" onclick="window._pfcIdx=(window._pfcIdx+1)%window._pfcCards.length;renderPFCard()">Next →</button></div>`;
}

async function convertCode() {
    const code = document.getElementById('code-input').value.trim();
    if (!code) return showToast('Paste code first');
    const from_lang = document.getElementById('code-from').value;
    const to_lang = document.getElementById('code-to').value;
    document.getElementById('code-output').value = 'Converting...';
    const d = await toolAPI('code', { from_lang, to_lang, code }, 'code-output');
    if (d?.result) document.getElementById('code-output').value = d.result;
}

async function composeEmail() {
    const context = document.getElementById('email-context').value.trim();
    if (!context) return showToast('Enter email context');
    const d = await toolAPI('email', { context, tone: emailTone }, 'email-output');
    if (d?.result) document.getElementById('email-output').innerHTML = `<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${d.result}</div>`;
}

async function personalNotes(action) {
    const text = document.getElementById('pnotes-input').value.trim();
    if (!text) return showToast('Paste notes first');
    const d = await toolAPI('notes', { text, action }, 'pnotes-output');
    if (d?.result) document.getElementById('pnotes-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function buildResume() {
    const text = document.getElementById('resume-input').value.trim();
    if (!text) return showToast('Enter your details');
    const d = await toolAPI('resume', { text }, 'resume-output');
    if (d?.result) document.getElementById('resume-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function genSocial() {
    const text = document.getElementById('social-input').value.trim();
    if (!text) return showToast('Enter content topic');
    const d = await toolAPI('social', { text, platform: socialPlatform }, 'social-output');
    if (d?.result) document.getElementById('social-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function genImagePrompts() {
    const text = document.getElementById('imgp-input').value.trim();
    if (!text) return showToast('Describe your concept');
    const d = await toolAPI('image_prompt', { text }, 'imgp-output');
    if (d?.result) document.getElementById('imgp-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function todoAction(action) {
    const text = document.getElementById('todo-input').value.trim();
    if (!text) return showToast('Enter your tasks');
    const d = await toolAPI('todo', { text, action }, 'todo-output');
    if (d?.result) document.getElementById('todo-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function pyAction(action) {
    const text = document.getElementById('py-input').value.trim();
    if (!text) return showToast('Paste Python code');
    const d = await toolAPI('pylingo', { text, action }, 'py-output');
    if (d?.result) document.getElementById('py-output').innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
}

async function slackAction() {
    const text = document.getElementById('slack-input').value.trim();
    if (!text) return showToast('Paste conversation');
    const out = document.getElementById('slack-output');
    out.innerHTML = '<div class="spinner"></div>';
    out.style.display = 'block';
    try {
        const r = await fetch(API + '/api/personal/tool', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tool:'writing', action:'improve', text:'Analyze this Slack conversation and provide key insights, action items, and sentiment analysis:\n\n' + text}) });
        const d = await r.json();
        out.innerHTML = `<div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
    } catch(e) { out.innerHTML = '<p style="color:var(--red)">Failed</p>'; }
}

// ── QR GENERATOR ──────────────────────────────────────────
function loadQRScript() {
    if (window.QRCode) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    document.head.appendChild(s);
}

function generateQR() {
    const url = document.getElementById('qr-url').value.trim();
    if (!url) return showToast('Enter URL or text');
    const color = document.getElementById('qr-color').value;
    const display = document.getElementById('qr-display');
    display.innerHTML = '';
    if (window.QRCode) {
        new QRCode(display, { text: url, width: 200, height: 200, colorDark: color, colorLight: '#0d1120', correctLevel: QRCode.CorrectLevel.Q });
    } else {
        display.innerHTML = '<p style="color:var(--text3)">Loading QR library...</p>';
        setTimeout(() => generateQR(), 1000);
    }
}

// ── FOREST TIMER ──────────────────────────────────────────
let forestTime = 25;

function setForestTime(m) {
    forestTime = m;
    resetForest();
    document.querySelectorAll('#tool-panel-area .option-btn').forEach(b => { if(['25 min','50 min','90 min'].includes(b.textContent)) b.classList.toggle('selected', b.textContent === m+' min'); });
}

function initForest() {
    forestState.remaining = forestTime * 60;
    forestState.total = forestTime * 60;
    updateForestDisplay();
}

function toggleForest() {
    const btn = document.getElementById('forest-start');
    if (forestState.timer) {
        clearInterval(forestState.timer);
        forestState.timer = null;
        btn.textContent = 'Resume';
    } else {
        btn.textContent = 'Pause';
        forestState.timer = setInterval(() => {
            forestState.remaining--;
            updateForestDisplay();
            if (forestState.remaining <= 0) {
                clearInterval(forestState.timer);
                forestState.timer = null;
                forestState.trees++;
                localStorage.setItem('nexus-trees', forestState.trees);
                const fc = document.getElementById('forest-count');
                if (fc) fc.textContent = forestState.trees;
                showToast('🌳 Tree planted! Great focus session.', 'success');
                btn.textContent = 'Start';
                resetForest();
            }
        }, 1000);
    }
}

function resetForest() {
    if (forestState.timer) { clearInterval(forestState.timer); forestState.timer = null; }
    forestState.remaining = forestTime * 60;
    forestState.total = forestTime * 60;
    updateForestDisplay();
    const btn = document.getElementById('forest-start');
    if (btn) btn.textContent = 'Start';
}

function updateForestDisplay() {
    const m = Math.floor(forestState.remaining / 60);
    const s = forestState.remaining % 60;
    const el = document.getElementById('forest-display');
    if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const pct = 1 - (forestState.remaining / forestState.total);
    const tree = document.getElementById('forest-tree');
    if (tree) tree.textContent = pct < 0.25 ? '🌱' : pct < 0.5 ? '🌿' : pct < 0.75 ? '🌳' : '🌲';
}

// ── HABIT TRACKER ─────────────────────────────────────────
function initHabit() {
    const habits = JSON.parse(localStorage.getItem('nexus-habits') || '[]');
    const area = document.getElementById('habit-area');
    let html = `<div style="margin-bottom:12px"><input class="auth-input" id="habit-new" placeholder="New habit..." style="display:inline-block;width:60%"><button class="action-btn primary" style="margin-left:8px" onclick="addHabit()">Add</button></div>`;
    if (habits.length === 0) html += '<p style="color:var(--text3)">No habits yet. Add one above!</p>';
    habits.forEach((h, i) => {
        const today = new Date().toDateString();
        const done = h.dates?.includes(today);
        const streak = calcStreak(h.dates || []);
        html += `<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg4);border-radius:8px;margin-bottom:8px;text-align:left">
        <button style="width:32px;height:32px;border-radius:8px;border:2px solid ${done?'var(--green)':'var(--border)'};background:${done?'rgba(16,185,129,0.2)':'transparent'};color:var(--green);cursor:pointer;font-size:16px" onclick="toggleHabitDay(${i})">${done?'✓':''}</button>
        <div style="flex:1"><strong>${h.name}</strong><br><span style="font-size:12px;color:var(--text3)">🔥 ${streak} day streak</span></div>
        <button style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px" onclick="removeHabit(${i})">×</button></div>`;
    });
    area.innerHTML = html;
}

function addHabit() {
    const input = document.getElementById('habit-new');
    const name = input.value.trim();
    if (!name) return;
    const habits = JSON.parse(localStorage.getItem('nexus-habits') || '[]');
    habits.push({ name, dates: [] });
    localStorage.setItem('nexus-habits', JSON.stringify(habits));
    initHabit();
}

function toggleHabitDay(idx) {
    const habits = JSON.parse(localStorage.getItem('nexus-habits') || '[]');
    const today = new Date().toDateString();
    if (!habits[idx].dates) habits[idx].dates = [];
    const i = habits[idx].dates.indexOf(today);
    if (i >= 0) habits[idx].dates.splice(i, 1);
    else habits[idx].dates.push(today);
    localStorage.setItem('nexus-habits', JSON.stringify(habits));
    initHabit();
}

function removeHabit(idx) {
    const habits = JSON.parse(localStorage.getItem('nexus-habits') || '[]');
    habits.splice(idx, 1);
    localStorage.setItem('nexus-habits', JSON.stringify(habits));
    initHabit();
}

function calcStreak(dates) {
    if (!dates.length) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
        if (dates.includes(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
        else break;
    }
    return streak;
}
