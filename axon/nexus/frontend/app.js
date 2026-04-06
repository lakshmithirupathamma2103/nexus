// ═══════════════════════════════════════════════════════════
// NEXUS AI PLATFORM — COMPLETE JAVASCRIPT
// ═══════════════════════════════════════════════════════════

const API = '';
let currentUser = null;
let sessionStats = { queries: 0, searches: 0, tokens: 0, docs: 0 };
let generalHistory = [];
let bizHistory = [];
let researchHistory = [];
let tutorHistory = [];
let studyProfile = null;
let quizState = { questions: [], current: 0, answers: [], count: 10, diff: 'Medium' };
let fcState = { cards: [], current: 0, count: 20 };
let forestState = { timer: null, remaining: 0, total: 0, trees: parseInt(localStorage.getItem('nexus-trees') || '0') };

// ── INIT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('nexus-user');
    if (saved) {
        currentUser = JSON.parse(saved);
        showPlatform();
    }
    initCompetitors();
    initTools();
});

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ── AUTH ───────────────────────────────────────────────────
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((el, i) => {
        el.classList.toggle('active', (tab === 'login' ? i === 0 : i === 1));
    });
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('auth-error').style.display = 'none';
}

async function doLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value;
    if (!id || !pw) return showAuthError('All fields required');
    document.getElementById('login-btn').disabled = true;
    try {
        const r = await fetch(API + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: id, password: pw }) });
        const d = await r.json();
        if (d.error) { showAuthError(d.error); return; }
        currentUser = { user_id: d.user_id, username: d.username };
        localStorage.setItem('nexus-user', JSON.stringify(currentUser));
        showPlatform();
    } catch (e) { showAuthError('Connection error'); }
    finally { document.getElementById('login-btn').disabled = false; }
}

async function doRegister() {
    const u = document.getElementById('reg-user').value.trim();
    const e = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-pw').value;
    const p2 = document.getElementById('reg-pw2').value;
    if (!u || !e || !p) return showAuthError('All fields required');
    if (p !== p2) return showAuthError('Passwords do not match');
    document.getElementById('reg-btn').disabled = true;
    try {
        const r = await fetch(API + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, email: e, password: p, confirm_password: p2 }) });
        const d = await r.json();
        if (d.error) { showAuthError(d.error); return; }
        currentUser = { user_id: d.user_id, username: d.username };
        localStorage.setItem('nexus-user', JSON.stringify(currentUser));
        showPlatform();
    } catch (err) { showAuthError('Connection error'); }
    finally { document.getElementById('reg-btn').disabled = false; }
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg; el.style.display = 'block';
}

function showPlatform() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('platform').style.display = 'block';
    document.getElementById('username-display').textContent = currentUser.username;
    loadStudyProfile();
}

function doLogout() {
    localStorage.removeItem('nexus-user');
    currentUser = null;
    document.getElementById('platform').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
}

// ── MODE SWITCHING ────────────────────────────────────────
function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + mode).classList.add('active');
    if (mode === 'study' && !studyProfile) loadStudyProfile();
}

// ── GENERAL CHAT ──────────────────────────────────────────
function handleChatKey(e, type) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (type === 'general') sendGeneralChat();
        else if (type === 'biz') sendBizChat();
        else if (type === 'research') sendResearchChat();
        else if (type === 'tutor') sendTutorChat();
    }
}

function addChatMsg(containerId, text, role, senderLabel) {
    const box = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    if (role === 'ai' && senderLabel) {
        div.innerHTML = `<div class="sender">${senderLabel}</div>${formatMd(text)}`;
    } else {
        div.textContent = text;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function showTyping(containerId) {
    const box = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = containerId + '-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function hideTyping(containerId) {
    const el = document.getElementById(containerId + '-typing');
    if (el) el.remove();
}

function formatMd(text) {
    return text
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="mono">$2</code></pre>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code class="mono" style="background:var(--bg4);padding:1px 4px;border-radius:3px">$1</code>')
        .replace(/\n/g, '<br>');
}

async function sendGeneralChat() {
    const input = document.getElementById('general-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    input.style.height = 'auto';
    addChatMsg('general-messages', msg, 'user');
    generalHistory.push({ role: 'user', content: msg });
    sessionStats.queries++;
    sessionStats.searches++;
    updateStats();
    showTyping('general-messages');
    document.getElementById('general-send').disabled = true;
    try {
        const r = await fetch(API + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: generalHistory, search: true, user_id: currentUser.user_id }) });
        const d = await r.json();
        hideTyping('general-messages');
        if (d.error) { showToast(d.error); return; }
        generalHistory.push({ role: 'assistant', content: d.reply });
        addChatMsg('general-messages', d.reply, 'ai', 'NEXUS · Gemini 2.5 Flash');
        sessionStats.tokens += d.reply.length;
        updateStats();
    } catch (e) { hideTyping('general-messages'); showToast('Something went wrong. Please try again.'); }
    finally { document.getElementById('general-send').disabled = false; }
}

async function uploadGeneralDoc(input) {
    if (!input.files[0]) return;
    const f = new FormData();
    f.append('file', input.files[0]);
    sessionStats.docs++;
    updateStats();
    addChatMsg('general-messages', `📎 Uploaded: ${input.files[0].name}`, 'user');
    showTyping('general-messages');
    try {
        const r = await fetch(API + '/api/upload-doc', { method: 'POST', body: f });
        const d = await r.json();
        hideTyping('general-messages');
        if (d.error) { showToast(d.error); return; }
        addChatMsg('general-messages', d.summary, 'ai', 'NEXUS · Document Analysis');
        generalHistory.push({ role: 'user', content: `[Uploaded: ${d.filename}]` });
        generalHistory.push({ role: 'assistant', content: d.summary });
    } catch (e) { hideTyping('general-messages'); showToast('Upload failed'); }
    input.value = '';
}

function updateStats() {
    document.getElementById('stat-queries').textContent = sessionStats.queries;
    document.getElementById('stat-searches').textContent = sessionStats.searches;
    document.getElementById('stat-tokens').textContent = sessionStats.tokens > 1000 ? (sessionStats.tokens / 1000).toFixed(1) + 'K' : sessionStats.tokens;
    document.getElementById('stat-docs').textContent = sessionStats.docs;
}

// ── BUSINESS MODE ─────────────────────────────────────────
function switchBizTab(idx) {
    document.querySelectorAll('#page-business .tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
    for (let i = 0; i < 5; i++) document.getElementById('biz-tab-' + i).classList.toggle('active', i === idx);
    if (idx === 1) loadBizDocDefaults();
}

async function loadBizDocDefaults() {
    const results = document.getElementById('biz-doc-results');
    if (results.innerHTML) return;
    try {
        const r = await fetch(API + '/api/business/analyse-doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const d = await r.json();
        renderBizDocResults(d);
    } catch (e) {}
}

async function uploadBizDoc(input) {
    if (!input.files[0]) return;
    const f = new FormData();
    f.append('file', input.files[0]);
    document.getElementById('biz-doc-loading').style.display = 'block';
    document.getElementById('biz-doc-results').style.display = 'none';
    try {
        const r = await fetch(API + '/api/business/analyse-doc', { method: 'POST', body: f });
        const d = await r.json();
        document.getElementById('biz-doc-loading').style.display = 'none';
        if (d.error) { showToast(d.error); return; }
        renderBizDocResults(d);
    } catch (e) { document.getElementById('biz-doc-loading').style.display = 'none'; showToast('Analysis failed'); }
    input.value = '';
}

function renderBizDocResults(d) {
    const el = document.getElementById('biz-doc-results');
    let html = '<div class="layout-row"><div class="layout-main">';
    html += '<h3 style="margin:16px 0 12px">Risk Factors</h3>';
    (d.risks || []).forEach(r => {
        const sev = r.severity.toLowerCase();
        const color = sev === 'high' ? 'var(--red)' : sev === 'medium' ? 'var(--amber)' : 'var(--green)';
        html += `<div class="risk-card ${sev}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><strong>${r.title}</strong><span class="severity-badge" style="background:${color}20;color:${color}">${r.severity}</span></div><p style="font-size:13px;color:var(--text2);margin-bottom:8px">${r.description}</p><div class="risk-score-bar"><div class="fill" style="width:${r.score * 10}%;background:${color}"></div></div></div>`;
    });
    html += '<h3 style="margin:16px 0 12px">Pros & Opportunities</h3>';
    (d.pros || []).forEach(p => { html += `<div class="card" style="border-color:rgba(16,185,129,0.2);margin-bottom:8px;padding:12px"><span style="color:var(--green)">✓</span> ${p}</div>`; });
    html += '<h3 style="margin:16px 0 12px">Concerns</h3>';
    (d.concerns || []).forEach(c => { html += `<div class="card" style="border-color:rgba(239,68,68,0.2);margin-bottom:8px;padding:12px"><span style="color:var(--red)">⚠</span> ${c}</div>`; });
    html += '<h3 style="margin:16px 0 12px">AI Recommendations</h3>';
    (d.recommendations || []).forEach((r, i) => { html += `<div class="card" style="margin-bottom:8px;padding:12px"><span style="color:var(--accent);font-weight:600">${i + 1}.</span> ${r}</div>`; });
    html += '</div><div class="layout-sidebar">';
    const s = d.strategy || { pmf: 50, gtm: 50, team: 50, finance: 50, innovation: 50 };
    html += '<div class="card"><div class="card-title">Strategy Scores</div>';
    [['Product-Market Fit', s.pmf], ['Go-to-Market', s.gtm], ['Team Efficiency', s.team], ['Financial Health', s.finance], ['Innovation Index', s.innovation]].forEach(([l, v]) => {
        html += `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${l}</span><span style="color:var(--green)">${v}%</span></div><div class="progress-bar"><div class="fill" style="width:${v}%;background:var(--green)"></div></div></div>`;
    });
    html += '</div></div></div>';
    el.innerHTML = html;
    el.style.display = 'block';
}

async function analyseIdea() {
    const idea = document.getElementById('idea-input').value.trim();
    if (!idea) return showToast('Please describe your idea');
    document.getElementById('idea-loading').style.display = 'block';
    document.getElementById('idea-results').style.display = 'none';
    document.getElementById('idea-sidebar').style.display = 'none';
    try {
        const r = await fetch(API + '/api/business/idea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea }) });
        const d = await r.json();
        document.getElementById('idea-loading').style.display = 'none';
        if (d.error) { showToast(d.error); return; }
        let html = '<div class="grid-2" style="margin-bottom:16px"><div class="card" style="text-align:center"><div class="kpi-label">Viability Score</div><div class="kpi-value" style="color:var(--green)">' + (d.viability || 0) + '/10</div></div><div class="card" style="text-align:center"><div class="kpi-label">Market Potential (TAM)</div><div class="kpi-value" style="color:var(--accent)">' + (d.tam || 'N/A') + '</div></div></div>';
        html += '<div class="grid-3">';
        html += '<div class="card" style="border-color:rgba(16,185,129,0.2)"><div class="card-title" style="color:var(--green)">💪 Strengths</div>' + (d.strengths || []).map(s => `<p style="font-size:13px;margin-bottom:6px;color:var(--text2)">• ${s}</p>`).join('') + '</div>';
        html += '<div class="card" style="border-color:rgba(245,158,11,0.2)"><div class="card-title" style="color:var(--amber)">⚡ Challenges</div>' + (d.challenges || []).map(s => `<p style="font-size:13px;margin-bottom:6px;color:var(--text2)">• ${s}</p>`).join('') + '</div>';
        html += '<div class="card" style="border-color:rgba(139,92,246,0.2)"><div class="card-title" style="color:var(--purple)">✨ Differentiation</div>' + (d.differentiation || []).map(s => `<p style="font-size:13px;margin-bottom:6px;color:var(--text2)">• ${s}</p>`).join('') + '</div>';
        html += '</div>';
        document.getElementById('idea-results').innerHTML = html;
        document.getElementById('idea-results').style.display = 'block';
        let sidebar = '<div class="card-title">📊 Market Metrics</div><table style="width:100%;font-size:13px;border-collapse:collapse">';
        [['TAM', d.tam], ['SAM', d.sam], ['SOM', d.som], ['Growth', d.growth_rate], ['Competitors', d.competitor_count]].forEach(([k, v]) => {
            sidebar += `<tr><td style="padding:6px 0;color:var(--text3)">${k}</td><td style="padding:6px 0;text-align:right;font-weight:500">${v || 'N/A'}</td></tr>`;
        });
        sidebar += '</table><div class="card-title" style="margin-top:16px">📋 Next Steps</div>';
        (d.next_steps || []).forEach((s, i) => { sidebar += `<p style="font-size:13px;margin-bottom:8px"><span style="color:var(--accent);font-weight:600">${i + 1}.</span> ${s}</p>`; });
        document.getElementById('idea-sidebar').innerHTML = sidebar;
        document.getElementById('idea-sidebar').style.display = 'block';
    } catch (e) { document.getElementById('idea-loading').style.display = 'none'; showToast('Analysis failed'); }
}

async function sendBizChat() {
    const input = document.getElementById('biz-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addChatMsg('biz-messages', msg, 'user');
    bizHistory.push({ role: 'user', content: msg });
    showTyping('biz-messages');
    try {
        const r = await fetch(API + '/api/business/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: bizHistory, search: true }) });
        const d = await r.json();
        hideTyping('biz-messages');
        if (d.error) { showToast(d.error); return; }
        bizHistory.push({ role: 'assistant', content: d.reply });
        addChatMsg('biz-messages', d.reply, 'ai', 'NEXUS · Business Analyst');
    } catch (e) { hideTyping('biz-messages'); showToast('Something went wrong'); }
}

// ── COMPETITORS ───────────────────────────────────────────
const defaultComps = [
    { name: 'Perplexity AI', letter: 'P', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', description: 'AI-powered search engine with real-time answers.', market_share: 45, ai_quality: 82, ux_score: 88, strengths: ['Search Quality', 'UX Design'], weaknesses: ['Limited API', 'Pricing'], threat_level: 'High' },
    { name: 'Google Gemini', letter: 'G', gradient: 'linear-gradient(135deg,#ef4444,#f59e0b)', description: 'Google\'s multimodal AI model ecosystem.', market_share: 78, ai_quality: 92, ux_score: 75, strengths: ['Model Quality', 'Scale'], weaknesses: ['Privacy Concerns', 'Slow Updates'], threat_level: 'Critical' },
    { name: 'You.com', letter: 'Y', gradient: 'linear-gradient(135deg,#10b981,#14b8a6)', description: 'AI search engine with customizable experience.', market_share: 15, ai_quality: 68, ux_score: 72, strengths: ['Customization', 'Privacy'], weaknesses: ['Small Userbase', 'Limited Features'], threat_level: 'Medium' },
    { name: 'Nexus (You)', letter: 'N', gradient: 'linear-gradient(135deg,#3b82f6,#10b981)', description: 'Your AI platform — full stack intelligence.', market_share: 5, ai_quality: 85, ux_score: 90, strengths: ['Full Platform', 'Innovation'], weaknesses: ['New Entrant', 'Scale'], threat_level: 'Your Position' }
];
let competitors = [...defaultComps];

function initCompetitors() {
    renderCompetitors();
}

function renderCompetitors() {
    const grid = document.getElementById('comp-grid');
    if (!grid) return;
    grid.innerHTML = competitors.map(c => {
        const tc = c.threat_level.toLowerCase();
        const threatClass = tc === 'critical' || tc === 'high' ? 'high' : tc === 'medium' ? 'medium' : 'low';
        return `<div class="comp-card"><div class="comp-logo" style="background:${c.gradient}">${c.letter || c.name[0]}</div><span class="comp-threat ${threatClass}">${c.threat_level}</span><h4 style="margin:6px 0 4px">${c.name}</h4><p style="font-size:13px;color:var(--text2);margin-bottom:12px">${c.description}</p>` +
            [['Market Share', c.market_share], ['AI Quality', c.ai_quality], ['UX Score', c.ux_score]].map(([l, v]) =>
                `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--text3)">${l}</span><span>${v}%</span></div><div class="progress-bar"><div class="fill" style="width:${v}%;background:var(--accent)"></div></div></div>`
            ).join('') +
            `<div class="tag-pills">${(c.strengths || []).map(s => `<span class="tag-pill strength">${s}</span>`).join('')}${(c.weaknesses || []).map(w => `<span class="tag-pill weakness">${w}</span>`).join('')}</div></div>`;
    }).join('');
}

function showCompModal() { document.getElementById('comp-modal').style.display = 'flex'; }

async function addCompetitor() {
    const name = document.getElementById('comp-name-input').value.trim();
    if (!name) return;
    document.getElementById('comp-modal').style.display = 'none';
    showToast('Analysing ' + name + '...', 'success');
    try {
        const r = await fetch(API + '/api/business/competitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        const d = await r.json();
        if (d.error) { showToast(d.error); return; }
        d.letter = d.name[0];
        d.gradient = `linear-gradient(135deg,hsl(${Math.random() * 360},70%,50%),hsl(${Math.random() * 360},70%,50%))`;
        competitors.push(d);
        renderCompetitors();
    } catch (e) { showToast('Failed to analyse competitor'); }
    document.getElementById('comp-name-input').value = '';
}

// ── RESEARCH MODE ─────────────────────────────────────────
async function doDeepSearch() {
    const q = document.getElementById('research-query').value.trim();
    if (!q) return;
    researchHistory.push({ role: 'user', content: q });
    addChatMsg('research-messages', q, 'user');
    document.getElementById('research-query').value = '';
    showTyping('research-messages');
    try {
        const r = await fetch(API + '/api/research/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: researchHistory, search: true }) });
        const d = await r.json();
        hideTyping('research-messages');
        researchHistory.push({ role: 'assistant', content: d.reply });
        addChatMsg('research-messages', d.reply, 'ai', 'NEXUS · Research Assistant');
    } catch (e) { hideTyping('research-messages'); showToast('Search failed'); }
}

async function sendResearchChat() {
    const input = document.getElementById('research-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    researchHistory.push({ role: 'user', content: msg });
    addChatMsg('research-messages', msg, 'user');
    showTyping('research-messages');
    try {
        const r = await fetch(API + '/api/research/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: researchHistory, search: false }) });
        const d = await r.json();
        hideTyping('research-messages');
        researchHistory.push({ role: 'assistant', content: d.reply });
        addChatMsg('research-messages', d.reply, 'ai', 'NEXUS · Research Assistant');
    } catch (e) { hideTyping('research-messages'); showToast('Something went wrong'); }
}

function addResearchTool(prefix) {
    const input = document.getElementById('research-query');
    input.value = prefix + ' ';
    input.focus();
}

async function uploadResearchPaper(input) {
    if (!input.files[0]) return;
    const f = new FormData();
    f.append('file', input.files[0]);
    addChatMsg('research-messages', `📄 Uploaded: ${input.files[0].name}`, 'user');
    showTyping('research-messages');
    try {
        const r = await fetch(API + '/api/upload-doc', { method: 'POST', body: f });
        const d = await r.json();
        hideTyping('research-messages');
        if (d.error) { showToast(d.error); return; }
        researchHistory.push({ role: 'user', content: `[Paper: ${d.filename}] ${d.summary}` });
        researchHistory.push({ role: 'assistant', content: d.summary });
        addChatMsg('research-messages', d.summary, 'ai', 'NEXUS · Paper Analysis');
    } catch (e) { hideTyping('research-messages'); showToast('Upload failed'); }
    input.value = '';
}

function importDOI() {
    const doi = prompt('Enter DOI:');
    if (doi) {
        const input = document.getElementById('research-query');
        input.value = `Find and analyze the paper with DOI: ${doi}`;
        doDeepSearch();
    }
}

function litMap() {
    const q = document.getElementById('research-query').value.trim();
    if (!q) { showToast('Enter a research topic first'); return; }
    document.getElementById('research-query').value = `Create a literature map and citation network for: ${q}`;
    doDeepSearch();
}
