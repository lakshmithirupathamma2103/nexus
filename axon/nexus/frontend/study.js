// ═══ STUDY MODE ═══════════════════════════════════════════

async function loadStudyProfile() {
    if (!currentUser) return;
    try {
        const r = await fetch(API + '/api/study/profile?user_id=' + currentUser.user_id);
        const d = await r.json();
        if (d.exists) { studyProfile = d.profile; renderStudyDashboard(); }
        else { showStudyWizard(); }
    } catch (e) { showStudyWizard(); }
}

// ── WIZARD ────────────────────────────────────────────────
let wizardStep = 1;
let wizardData = { name: '', class: '', board: '', stream: '', subjects: [], goal: '', hours: 2, level: 'Beginner' };

function showStudyWizard() {
    document.getElementById('study-wizard').style.display = 'block';
    document.getElementById('study-dashboard').style.display = 'none';
    renderWizardStep();
}

function renderWizardStep() {
    const w = document.getElementById('study-wizard');
    let html = '<div class="wizard-overlay"><div class="wizard-card"><div class="wizard-progress">';
    for (let i = 1; i <= 5; i++) html += `<div class="step ${i < wizardStep ? 'done' : ''} ${i === wizardStep ? 'current done' : ''}"></div>`;
    html += `</div><p style="color:var(--text3);font-size:12px;margin-bottom:16px">Step ${wizardStep} of 5</p>`;

    if (wizardStep === 1) {
        html += `<h3>👋 Personal Info</h3>
        <input class="auth-input" id="wiz-name" placeholder="What's your name?" value="${wizardData.name}">
        <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block">Which class/grade?</label>
        <select class="auth-input" id="wiz-class">
        <option value="">Select...</option>
        ${['Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12','Undergraduate Year 1','Undergraduate Year 2','Undergraduate Year 3','Undergraduate Year 4','Postgraduate','Other'].map(c => `<option value="${c}" ${wizardData.class===c?'selected':''}>${c}</option>`).join('')}
        </select>`;
    } else if (wizardStep === 2) {
        const boards = ['CBSE','ICSE','State Board - AP/TS','State Board - MH','State Board - KA','State Board - TN','IB','IGCSE','University','Other'];
        html += `<h3>🏫 Education Board</h3><div class="option-grid">${boards.map(b => `<button class="option-btn ${wizardData.board===b?'selected':''}" onclick="wizardData.board='${b}';renderWizardStep()">${b}</button>`).join('')}</div>`;
    } else if (wizardStep === 3) {
        let streams = [];
        const cl = wizardData.class;
        if (cl === 'Class 11' || cl === 'Class 12') streams = ['Science (PCM)','Science (PCB)','Science (PCMB)','Commerce','Arts','Vocational'];
        else if (cl.startsWith('Undergraduate')) streams = ['Engineering','Medical','Commerce','Arts','Science','Law','Management','Other'];
        else { wizardData.stream = 'General'; wizardStep = 4; renderWizardStep(); return; }
        html += `<h3>📖 Stream / Branch</h3><div class="option-grid">${streams.map(s => `<button class="option-btn ${wizardData.stream===s?'selected':''}" onclick="wizardData.stream='${s}';renderWizardStep()">${s}</button>`).join('')}</div>`;
    } else if (wizardStep === 4) {
        const subjectMap = {
            'Science (PCM)': ['Mathematics','Physics','Chemistry','English','Computer Science','Physical Education'],
            'Science (PCB)': ['Biology','Physics','Chemistry','English','Biotechnology'],
            'Science (PCMB)': ['Mathematics','Biology','Physics','Chemistry','English'],
            'Commerce': ['Accountancy','Business Studies','Economics','English','Mathematics'],
            'Arts': ['History','Political Science','Geography','English','Hindi'],
            'Engineering': ['Mathematics','Physics','Chemistry','Engineering Mechanics','Programming','Electronics','Data Structures','Technical Drawing'],
            'General': ['Mathematics','Science','Social Studies','English','Hindi','Computer Science'],
        };
        const suggested = subjectMap[wizardData.stream] || subjectMap['General'];
        const selectedNames = wizardData.subjects.map(s => s.name);
        html += `<h3>📚 Subjects & Syllabus</h3><p style="font-size:13px;color:var(--text2);margin-bottom:12px">Select your subjects:</p>
        <div class="option-grid">${suggested.map(s => `<span class="subject-toggle ${selectedNames.includes(s)?'selected':''}" onclick="toggleWizSubject('${s}')">${s}</span>`).join('')}</div>`;
        if (wizardData.subjects.length > 0) {
            html += '<div style="margin-top:16px">';
            wizardData.subjects.forEach((s, i) => {
                html += `<div style="margin-bottom:12px"><label style="font-size:13px;color:var(--text2)">Chapters for ${s.name}:</label><textarea class="auth-input" rows="3" placeholder="Chapter 1: Sets&#10;Chapter 2: Relations..." onchange="wizardData.subjects[${i}].chapters=this.value.split('\\n').filter(c=>c.trim())" style="margin-top:4px">${(s.chapters||[]).join('\n')}</textarea></div>`;
            });
            html += '</div>';
        }
    } else if (wizardStep === 5) {
        const goals = ['JEE Main','JEE Advanced','NEET','UPSC','GATE','Board Exams','College Exams','Personal Learning','Other'];
        html += `<h3>🎯 Goals & Schedule</h3>
        <label style="font-size:13px;color:var(--text2);margin-bottom:6px;display:block">Goal:</label>
        <div class="option-grid">${goals.map(g => `<button class="option-btn ${wizardData.goal===g?'selected':''}" onclick="wizardData.goal='${g}';renderWizardStep()">${g}</button>`).join('')}</div>
        <label style="font-size:13px;color:var(--text2);margin:12px 0 6px;display:block">Hours per day:</label>
        <div class="option-grid">${[1,2,3,4,'5+'].map(h => `<button class="option-btn ${wizardData.hours==h?'selected':''}" onclick="wizardData.hours='${h}';renderWizardStep()">${h}h</button>`).join('')}</div>
        <label style="font-size:13px;color:var(--text2);margin:12px 0 6px;display:block">Level:</label>
        <div class="option-grid">${['Beginner','Intermediate','Advanced'].map(l => `<button class="option-btn ${wizardData.level===l?'selected':''}" onclick="wizardData.level='${l}';renderWizardStep()">${l}</button>`).join('')}</div>`;
    }

    html += '<div style="display:flex;justify-content:space-between;margin-top:24px">';
    if (wizardStep > 1) html += `<button class="action-btn" onclick="wizardStep--;renderWizardStep()">← Back</button>`;
    else html += '<div></div>';
    if (wizardStep < 5) html += `<button class="action-btn primary" onclick="nextWizStep()">Next →</button>`;
    else html += `<button class="action-btn primary" style="background:var(--amber);border-color:var(--amber)" onclick="finishWizard()">🚀 Set Up My Study Space</button>`;
    html += '</div></div></div>';
    w.innerHTML = html;
}

function toggleWizSubject(name) {
    const idx = wizardData.subjects.findIndex(s => s.name === name);
    if (idx >= 0) wizardData.subjects.splice(idx, 1);
    else wizardData.subjects.push({ name, chapters: [] });
    renderWizardStep();
}

function nextWizStep() {
    if (wizardStep === 1) {
        wizardData.name = document.getElementById('wiz-name').value.trim();
        wizardData.class = document.getElementById('wiz-class').value;
        if (!wizardData.name || !wizardData.class) return showToast('Please fill all fields');
    }
    if (wizardStep === 2 && !wizardData.board) return showToast('Please select a board');
    if (wizardStep === 4 && wizardData.subjects.length === 0) return showToast('Select at least one subject');
    wizardStep++;
    renderWizardStep();
}

async function finishWizard() {
    if (!wizardData.goal) return showToast('Please select a goal');
    try {
        const body = { user_id: currentUser.user_id, ...wizardData };
        const r = await fetch(API + '/api/study/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (d.error) { showToast(d.error); return; }
        studyProfile = d.profile;
        document.getElementById('study-wizard').innerHTML = '';
        document.getElementById('study-wizard').style.display = 'none';
        renderStudyDashboard();
    } catch (e) { showToast('Setup failed'); }
}

// ── DASHBOARD ─────────────────────────────────────────────
function renderStudyDashboard() {
    document.getElementById('study-dashboard').style.display = 'block';
    document.getElementById('study-wizard').style.display = 'none';
    renderSubjectGrid();
    populateSubjectDropdowns();
}

function switchStudyTab(idx) {
    document.querySelectorAll('#study-tabs .tab-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
        if (i === idx) { b.style.borderColor = 'var(--amber)'; b.style.color = 'var(--amber)'; }
        else { b.style.borderColor = ''; b.style.color = ''; }
    });
    for (let i = 0; i < 5; i++) {
        const el = document.getElementById('study-tab-' + i);
        if (el) el.classList.toggle('active', i === idx);
    }
}

function renderSubjectGrid() {
    if (!studyProfile) return;
    const grid = document.getElementById('subject-grid');
    const emojis = ['📐','🔬','⚗️','📖','💻','🧬','📊','🌍','📝','🎨'];
    grid.innerHTML = studyProfile.subjects.map((s, i) => {
        const progress = studyProfile.progress?.[s.name] || {};
        const total = (s.chapters || []).length || 1;
        const done = Object.values(progress).filter(v => v).length;
        const pct = Math.round(done / total * 100);
        return `<div class="card" style="cursor:pointer" onclick="toggleSubjectExpand(${i})">
        <div style="font-size:28px;margin-bottom:8px">${emojis[i % emojis.length]}</div>
        <h4>${s.name}</h4>
        <p style="font-size:12px;color:var(--text3);margin:4px 0">Chapter ${done} of ${total} · ${pct}% complete</p>
        <div class="progress-bar"><div class="fill" style="width:${pct}%;background:var(--amber)"></div></div>
        <div id="subj-expand-${i}" style="display:none;margin-top:12px">${(s.chapters || []).map((c, ci) =>
            `<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0;cursor:pointer"><input type="checkbox" ${progress[c] ? 'checked' : ''} onchange="updateChapterProgress('${s.name}','${c.replace(/'/g,"\\'")}',this.checked)"> ${c}</label>`
        ).join('')}</div></div>`;
    }).join('');
}

function toggleSubjectExpand(i) {
    const el = document.getElementById('subj-expand-' + i);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function updateChapterProgress(subject, chapter, completed) {
    try {
        await fetch(API + '/api/study/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, subject, chapter, completed }) });
        if (!studyProfile.progress) studyProfile.progress = {};
        if (!studyProfile.progress[subject]) studyProfile.progress[subject] = {};
        studyProfile.progress[subject][chapter] = completed;
        renderSubjectGrid();
    } catch (e) { showToast('Failed to update'); }
}

function populateSubjectDropdowns() {
    if (!studyProfile) return;
    ['fc-subject', 'quiz-subject', 'notes-subject'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const first = sel.options[0].text;
        sel.innerHTML = `<option value="">${first}</option>` + studyProfile.subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    });
}

function updateFCTopics() {
    const subj = document.getElementById('fc-subject').value;
    const sel = document.getElementById('fc-topic');
    sel.innerHTML = '<option value="">Select Topic</option>';
    if (!subj || !studyProfile) return;
    const s = studyProfile.subjects.find(x => x.name === subj);
    if (s) s.chapters.forEach(c => { sel.innerHTML += `<option value="${c}">${c}</option>`; });
}

function updateQuizTopics() {
    const subj = document.getElementById('quiz-subject').value;
    const sel = document.getElementById('quiz-topic');
    sel.innerHTML = '<option value="">Select Topic</option>';
    if (!subj || !studyProfile) return;
    const s = studyProfile.subjects.find(x => x.name === subj);
    if (s) s.chapters.forEach(c => { sel.innerHTML += `<option value="${c}">${c}</option>`; });
}

function setFCCount(n) { fcState.count = n; document.querySelectorAll('#study-tab-1 .option-btn').forEach(b => b.classList.toggle('selected', b.textContent == n)); }
function setQuizCount(n) { quizState.count = n; document.querySelectorAll('#quiz-setup .option-btn').forEach((b,i) => { if(i<4) b.classList.toggle('selected', b.textContent==n); }); }
function setQuizDiff(d) { quizState.diff = d; document.querySelectorAll('#quiz-setup .option-btn').forEach((b,i) => { if(i>=4) b.classList.toggle('selected', b.textContent===d); }); }

// ── FLASHCARDS ────────────────────────────────────────────
async function generateFlashcards() {
    const subject = document.getElementById('fc-subject').value;
    const topic = document.getElementById('fc-topic').value;
    if (!subject || !topic) return showToast('Select subject and topic');
    document.getElementById('fc-loading').style.display = 'block';
    document.getElementById('fc-area').style.display = 'none';
    try {
        const r = await fetch(API + '/api/study/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, subject, topic, count: fcState.count }) });
        const d = await r.json();
        document.getElementById('fc-loading').style.display = 'none';
        if (d.error) { showToast(d.error); return; }
        fcState.cards = d.flashcards || [];
        fcState.current = 0;
        renderFlashcard();
    } catch (e) { document.getElementById('fc-loading').style.display = 'none'; showToast('Failed to generate'); }
}

function renderFlashcard() {
    if (!fcState.cards.length) return;
    const c = fcState.cards[fcState.current];
    const area = document.getElementById('fc-area');
    area.style.display = 'block';
    area.innerHTML = `<p style="text-align:center;color:var(--text3);margin-bottom:10px">Card ${fcState.current + 1} of ${fcState.cards.length}</p>
    <div class="flashcard" onclick="this.classList.toggle('flipped')"><div class="flashcard-inner">
    <div class="flashcard-front"><div><p style="color:var(--text3);font-size:12px;margin-bottom:8px">QUESTION</p><p style="font-size:16px">${c.question}</p></div></div>
    <div class="flashcard-back"><div><p style="color:var(--amber);font-size:12px;margin-bottom:8px">ANSWER</p><p style="font-size:16px">${c.answer}</p></div></div>
    </div></div>
    <div style="display:flex;justify-content:center;gap:8px;margin-top:16px">
    <button class="action-btn" style="border-color:var(--red);color:var(--red)" onclick="nextFC()">✗ Again</button>
    <button class="action-btn" style="border-color:var(--amber);color:var(--amber)" onclick="nextFC()">~ Hard</button>
    <button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="nextFC()">✓ Good</button>
    <button class="action-btn" style="border-color:var(--accent);color:var(--accent)" onclick="nextFC()">★ Easy</button></div>`;
}

function nextFC() { fcState.current = (fcState.current + 1) % fcState.cards.length; renderFlashcard(); }

// ── QUIZ ──────────────────────────────────────────────────
let quizTimer = null;
let quizTimeLeft = 60;

async function startQuiz() {
    const subject = document.getElementById('quiz-subject').value;
    const topic = document.getElementById('quiz-topic').value;
    if (!subject || !topic) return showToast('Select subject and topic');
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-loading').style.display = 'block';
    document.getElementById('quiz-results').style.display = 'none';
    try {
        const r = await fetch(API + '/api/study/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, subject, topic, count: quizState.count, difficulty: quizState.diff }) });
        const d = await r.json();
        document.getElementById('quiz-loading').style.display = 'none';
        if (d.error) { showToast(d.error); document.getElementById('quiz-setup').style.display = 'block'; return; }
        quizState.questions = d.questions || [];
        quizState.current = 0;
        quizState.answers = [];
        renderQuizQuestion();
    } catch (e) { document.getElementById('quiz-loading').style.display = 'none'; document.getElementById('quiz-setup').style.display = 'block'; showToast('Failed'); }
}

function renderQuizQuestion() {
    if (quizState.current >= quizState.questions.length) { showQuizResults(); return; }
    const q = quizState.questions[quizState.current];
    const total = quizState.questions.length;
    const area = document.getElementById('quiz-area');
    area.style.display = 'block';
    quizTimeLeft = 60;
    if (quizTimer) clearInterval(quizTimer);

    area.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <span style="color:var(--text2);font-size:14px">Question ${quizState.current + 1} of ${total}</span>
    <span class="quiz-timer" id="quiz-countdown">60s</span></div>
    <div class="progress-bar" style="margin-bottom:20px"><div class="fill" style="width:${(quizState.current / total) * 100}%;background:var(--amber)"></div></div>
    <h3 style="font-size:18px;margin-bottom:16px;line-height:1.5">${q.question}</h3>
    <div id="quiz-options">${q.options.map((o, i) => `<div class="quiz-option" data-idx="${i}" onclick="selectQuizAnswer(${i})">${o}</div>`).join('')}</div>
    <div id="quiz-explanation" style="display:none;margin-top:16px;padding:14px;background:var(--bg4);border-radius:10px;font-size:14px;color:var(--text2)"></div>
    <button class="action-btn primary" id="quiz-next-btn" style="display:none;margin-top:16px" onclick="quizState.current++;renderQuizQuestion()">Next →</button>`;

    quizTimer = setInterval(() => {
        quizTimeLeft--;
        const el = document.getElementById('quiz-countdown');
        if (el) el.textContent = quizTimeLeft + 's';
        if (quizTimeLeft <= 0) { clearInterval(quizTimer); selectQuizAnswer(-1); }
    }, 1000);
}

function selectQuizAnswer(idx) {
    if (quizTimer) clearInterval(quizTimer);
    const q = quizState.questions[quizState.current];
    const correctLetter = q.answer.trim()[0].toUpperCase();
    const correctIdx = correctLetter.charCodeAt(0) - 65;
    const opts = document.querySelectorAll('#quiz-options .quiz-option');
    opts.forEach((o, i) => {
        o.style.pointerEvents = 'none';
        if (i === correctIdx) o.classList.add('correct');
        if (i === idx && idx !== correctIdx) o.classList.add('wrong');
    });
    quizState.answers.push({ selected: idx, correct: correctIdx, isCorrect: idx === correctIdx });
    const expl = document.getElementById('quiz-explanation');
    if (q.explanation) { expl.textContent = q.explanation; expl.style.display = 'block'; }
    document.getElementById('quiz-next-btn').style.display = 'block';
}

function showQuizResults() {
    document.getElementById('quiz-area').style.display = 'none';
    const el = document.getElementById('quiz-results');
    const correct = quizState.answers.filter(a => a.isCorrect).length;
    const total = quizState.questions.length;
    const pct = Math.round(correct / total * 100);
    const badge = pct >= 80 ? '🏆 Excellent' : pct >= 60 ? '👍 Good' : '📚 Needs Practice';
    const badgeColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)';

    let html = `<div class="card" style="text-align:center;margin-bottom:20px"><h2 style="font-size:36px;color:${badgeColor}">${correct}/${total}</h2><p style="font-size:24px;margin:8px 0">${badge}</p><p style="color:var(--text3)">${pct}% accuracy</p></div>`;
    html += '<div class="card"><div class="card-title">Question Review</div><table style="width:100%;font-size:13px;border-collapse:collapse">';
    html += '<tr style="color:var(--text3)"><th style="text-align:left;padding:8px">Question</th><th>Your Answer</th><th>Correct</th><th>Result</th></tr>';
    quizState.questions.forEach((q, i) => {
        const a = quizState.answers[i];
        const letters = ['A', 'B', 'C', 'D'];
        html += `<tr style="border-top:1px solid var(--border)"><td style="padding:8px;max-width:300px">${q.question.substring(0, 60)}...</td><td style="text-align:center">${a.selected >= 0 ? letters[a.selected] : '—'}</td><td style="text-align:center">${letters[a.correct]}</td><td style="text-align:center">${a.isCorrect ? '<span style="color:var(--green)">✓</span>' : '<span style="color:var(--red)">✗</span>'}</td></tr>`;
    });
    html += '</table></div>';
    html += `<div style="display:flex;gap:8px;margin-top:16px"><button class="action-btn primary" onclick="quizState.current=0;quizState.answers=[];renderQuizQuestion()">Retry Quiz</button><button class="action-btn" onclick="document.getElementById('quiz-results').style.display='none';document.getElementById('quiz-setup').style.display='block'">New Quiz</button></div>`;
    el.innerHTML = html;
    el.style.display = 'block';
}

// ── AI TUTOR ──────────────────────────────────────────────
async function sendTutorChat() {
    const input = document.getElementById('tutor-input');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    addChatMsg('tutor-messages', msg, 'user');
    tutorHistory.push({ role: 'user', content: msg });
    showTyping('tutor-messages');
    try {
        const r = await fetch(API + '/api/study/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: tutorHistory, user_id: currentUser.user_id }) });
        const d = await r.json();
        hideTyping('tutor-messages');
        tutorHistory.push({ role: 'assistant', content: d.reply });
        addChatMsg('tutor-messages', d.reply, 'ai', 'NEXUS · Study Tutor');
    } catch (e) { hideTyping('tutor-messages'); showToast('Something went wrong'); }
}

// ── SMART NOTES ───────────────────────────────────────────
async function processNotes(action) {
    const text = document.getElementById('notes-input').value.trim();
    const subject = document.getElementById('notes-subject')?.value || '';
    if (!text) return showToast('Paste your notes first');
    const output = document.getElementById('notes-output');
    output.innerHTML = '<div class="card-title">Processing...</div><div class="spinner"></div>';
    try {
        const r = await fetch(API + '/api/study/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id, text, action, subject }) });
        const d = await r.json();
        if (d.error) { showToast(d.error); return; }
        output.innerHTML = `<div class="card-title">📝 ${action.charAt(0).toUpperCase() + action.slice(1)} Result</div><div style="font-size:14px;line-height:1.7">${formatMd(d.result)}</div>`;
    } catch (e) { output.innerHTML = '<div class="card-title">Error</div><p style="color:var(--red)">Failed to process notes</p>'; }
}

// ── STUDY PLAN ────────────────────────────────────────────
async function generateStudyPlan() {
    const el = document.getElementById('study-plan-content');
    el.innerHTML = '<div class="spinner"></div>';
    try {
        const r = await fetch(API + '/api/study/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.user_id }) });
        const d = await r.json();
        if (d.error) { showToast(d.error); return; }
        let html = '';
        (d.tasks || []).forEach(t => {
            const pColor = t.priority === 'High' ? 'var(--red)' : t.priority === 'Medium' ? 'var(--amber)' : 'var(--green)';
            html += `<div style="padding:10px;background:var(--bg4);border-radius:8px;margin-bottom:8px;font-size:13px"><div style="display:flex;justify-content:space-between"><strong>${t.subject}: ${t.topic}</strong><span style="color:${pColor};font-size:11px">${t.priority}</span></div><span style="color:var(--text3)">${t.duration} · ${t.type}</span></div>`;
        });
        if (d.weak_areas) {
            document.getElementById('weak-areas-content').innerHTML = (d.weak_areas || []).map(w =>
                `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>${w.subject}: ${w.topic}</span><span style="color:var(--red)">${w.score}%</span></div><div class="progress-bar"><div class="fill" style="width:${w.score}%;background:var(--red)"></div></div></div>`
            ).join('');
        }
        el.innerHTML = html || '<p style="color:var(--text3);font-size:13px">No tasks generated</p>';
    } catch (e) { el.innerHTML = '<p style="color:var(--red);font-size:13px">Failed to generate plan</p>'; }
}
