/* ═══════════════════════════════════════════════
   InterviewForge — app.js
   Features: Streaming responses, TTS, STT, Timer,
             Session management, Rich summary
════════════════════════════════════════════════ */

// ── Topic Data ────────────────────────────────────────────────────────────────
const TOPICS = {
    tech: [
        { value: "Software Engineering (Frontend)",         label: "Frontend Development" },
        { value: "Software Engineering (Backend)",          label: "Backend Development" },
        { value: "Full-Stack Software Engineering",         label: "Full-Stack Engineering" },
        { value: "Data Structures & Algorithms (DSA)",      label: "DSA / Coding Rounds" },
        { value: "System Design",                           label: "System Design" },
        { value: "Machine Learning & AI Engineering",       label: "ML / AI Engineer" },
        { value: "Data Science & Analytics",                label: "Data Science" },
        { value: "DevOps & Cloud Engineering",              label: "DevOps / Cloud (AWS/GCP)" },
        { value: "Cybersecurity & Ethical Hacking",         label: "Cybersecurity" },
        { value: "iOS / Android Mobile Development",        label: "Mobile Development" },
        { value: "Embedded Systems & IoT",                  label: "Embedded Systems" },
        { value: "Database Engineering (SQL & NoSQL)",      label: "Database Engineering" },
    ],
    govt: [
        { value: "UPSC Civil Services (IAS/IPS/IFS)",       label: "UPSC Civil Services" },
        { value: "UPSC CAPF / NDA / CDS",                   label: "UPSC Defence (NDA/CDS)" },
        { value: "RBI Grade B Officer",                      label: "RBI Grade B" },
        { value: "SEBI Grade A Officer",                     label: "SEBI Grade A" },
        { value: "SSC CGL / CHSL",                          label: "SSC CGL / CHSL" },
        { value: "State PSC (General)",                      label: "State PSC" },
        { value: "Indian Foreign Service (IFS) Diplomat",   label: "IFS Diplomat" },
        { value: "CAT / IIFT (MBA Admissions Interview)",    label: "CAT MBA Interview" },
    ],
    finance: [
        { value: "Investment Banking (IBD)",                 label: "Investment Banking" },
        { value: "Private Equity & Venture Capital",         label: "Private Equity / VC" },
        { value: "Equity Research Analyst",                  label: "Equity Research" },
        { value: "Chartered Accountancy (CA Final)",         label: "CA Final / Big4" },
        { value: "Consulting (McKinsey / BCG / Bain)",       label: "MBB Consulting" },
        { value: "Corporate Finance & CFO Track",            label: "Corporate Finance" },
        { value: "Fintech Product Management",               label: "Fintech PM" },
        { value: "Wealth Management / CFA",                  label: "Wealth Management / CFA" },
    ],
    medicine: [
        { value: "MBBS Medical Residency (PG Entrance)",    label: "MD/MS PG Entrance" },
        { value: "USMLE Step 1 / Step 2 CK",                label: "USMLE (US Medicine)" },
        { value: "Clinical Medicine Viva",                   label: "Clinical Viva" },
        { value: "Hospital Administration",                  label: "Hospital Administration" },
        { value: "Pharmaceutical Industry (Medical Affairs)",label: "Pharma / Medical Affairs" },
    ],
    law: [
        { value: "Judicial Services (Lower Court Judge)",   label: "Judicial Services" },
        { value: "Corporate Law (M&A / Transactional)",     label: "Corporate Law" },
        { value: "CLAT / Law School Admissions",            label: "CLAT / Law School" },
        { value: "Litigation & Trial Advocacy",             label: "Litigation" },
        { value: "International Law & Arbitration",         label: "International Law" },
    ],
    design: [
        { value: "Product / UX Design",                     label: "Product / UX Design" },
        { value: "Graphic & Brand Design",                  label: "Graphic / Brand Design" },
        { value: "Motion Design & Animation",               label: "Motion / Animation" },
        { value: "Architecture Portfolio Review",           label: "Architecture" },
        { value: "Game Design & Development",               label: "Game Design" },
    ],
    management: [
        { value: "Product Management (PM Roles)",           label: "Product Management" },
        { value: "MBA General Management",                   label: "MBA General Management" },
        { value: "Project Management (PMP / Agile)",        label: "Project Management (PMP)" },
        { value: "HR & People Management",                  label: "HR / People Management" },
        { value: "Supply Chain & Operations Management",    label: "Supply Chain / Ops" },
        { value: "Marketing & Brand Management",            label: "Marketing / Brand" },
    ],
    research: [
        { value: "PhD Admission Interview (Science/Tech)",  label: "PhD Admission (STEM)" },
        { value: "PhD Admission Interview (Humanities)",    label: "PhD Admission (Humanities)" },
        { value: "CSIR / UGC NET / GATE",                   label: "GATE / UGC NET" },
        { value: "Research Scientist (Industry Lab)",        label: "Research Scientist" },
        { value: "Postdoctoral Fellowship Interview",        label: "Postdoc Interview" },
    ],
};

// ── State ─────────────────────────────────────────────────────────────────────
let selectedDifficulty = 'beginner';
let sessionId = null;
let timerInterval = null;
let timerSeconds = 0;
let voiceEnabled = true;
let currentUtterance = null;
let isRecording = false;
let recognition = null;
let isAISpeaking = false;

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const screens = {
    setup:     document.getElementById('setup-screen'),
    interview: document.getElementById('interview-screen'),
    summary:   document.getElementById('summary-screen'),
};

const categorySelect   = document.getElementById('category');
const topicSelect      = document.getElementById('topic');
const startBtn         = document.getElementById('start-btn');
const voiceToggle      = document.getElementById('voice-toggle');
const headerTopic      = document.getElementById('header-topic');
const headerDiff       = document.getElementById('header-diff');
const timerDisplay     = document.getElementById('timer');
const endBtn           = document.getElementById('end-btn');
const speakingBar      = document.getElementById('speaking-bar');
const stopSpeechBtn    = document.getElementById('stop-speech-btn');
const chatBox          = document.getElementById('chat-box');
const userInput        = document.getElementById('user-input');
const micBtn           = document.getElementById('mic-btn');
const sendBtn          = document.getElementById('send-btn');
const micStatus        = document.getElementById('mic-status');
const summaryContent   = document.getElementById('summary-content');
const summaryMeta      = document.getElementById('summary-meta');
const restartBtn       = document.getElementById('restart-btn');

// ── Setup Screen Logic ────────────────────────────────────────────────────────
function populateTopics() {
    const cat = categorySelect.value;
    topicSelect.innerHTML = '';
    topicSelect.disabled = !cat;
    startBtn.disabled = true;

    if (!cat) {
        topicSelect.innerHTML = '<option value="">— Choose Domain First —</option>';
        return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select Role / Exam —';
    topicSelect.appendChild(placeholder);

    (TOPICS[cat] || []).forEach(({ value, label }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        topicSelect.appendChild(opt);
    });
}

topicSelect.addEventListener('change', () => {
    startBtn.disabled = !topicSelect.value;
});

// Difficulty tabs
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDifficulty = btn.dataset.diff;
    });
});

voiceToggle.addEventListener('change', () => {
    voiceEnabled = voiceToggle.checked;
    if (!voiceEnabled) stopSpeech();
});

// ── Screen Transitions ────────────────────────────────────────────────────────
function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
        el.classList.toggle('active', key === name);
        el.style.display = key === name ? 'flex' : 'none';
    });
    // Reset active class for css
    Object.values(screens).forEach(el => el.classList.remove('active'));
    screens[name].classList.add('active');
    screens[name].style.display = 'flex';
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    timerSeconds = 0;
    timerInterval = setInterval(() => {
        timerSeconds++;
        const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const s = String(timerSeconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${m}:${s}`;
    }, 1000);
}
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;

    // Strip markdown asterisks and excessive symbols for cleaner speech
    const clean = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,3}\s/g, '')
        .replace(/Evaluation:/g, 'Evaluation.')
        .replace(/\n+/g, ' ')
        .trim();

    stopSpeech();

    currentUtterance = new SpeechSynthesisUtterance(clean);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // Pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('Google US English') ||
        v.name.includes('Daniel') ||
        (v.lang === 'en-GB' && v.name.includes('Male'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) currentUtterance.voice = preferred;

    currentUtterance.onstart = () => {
        isAISpeaking = true;
        speakingBar.classList.add('active');
    };
    currentUtterance.onend = currentUtterance.onerror = () => {
        isAISpeaking = false;
        speakingBar.classList.remove('active');
    };

    window.speechSynthesis.speak(currentUtterance);
}

function stopSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        isAISpeaking = false;
        speakingBar.classList.remove('active');
    }
}

stopSpeechBtn.addEventListener('click', stopSpeech);

// ── STT ───────────────────────────────────────────────────────────────────────
function initSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        micBtn.title = 'Speech recognition not supported in this browser';
        micBtn.style.opacity = '0.4';
        micBtn.style.cursor = 'not-allowed';
        return;
    }

    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        micStatus.textContent = '● Listening… speak your answer';
        stopSpeech(); // pause AI if speaking
    };

    recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            event.results[i].isFinal ? final += t : interim += t;
        }
        userInput.value = final || interim;
        autoResize(userInput);
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micStatus.textContent = '';
    };

    recognition.onerror = (e) => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micStatus.textContent = e.error === 'not-allowed' ? '⚠ Mic access denied' : '';
    };
}

micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (isRecording) {
        recognition.stop();
    } else {
        try { recognition.start(); } catch(e) { /* already started */ }
    }
});

// ── Chat helpers ──────────────────────────────────────────────────────────────
function appendMessage(role, text, streaming = false) {
    const msg = document.createElement('div');
    msg.classList.add('message', role);

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = role === 'interviewer' ? 'AI' : 'You';

    const body = document.createElement('div');
    body.classList.add('message-body');

    const label = document.createElement('div');
    label.classList.add('message-label');
    label.textContent = role === 'interviewer' ? 'Interviewer' : 'You';

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    if (streaming) {
        // Add blinking cursor
        const cursor = document.createElement('span');
        cursor.classList.add('cursor');
        bubble.appendChild(cursor);
        bubble._cursor = cursor;
    } else {
        bubble.innerHTML = formatText(text);
    }

    body.appendChild(label);
    body.appendChild(bubble);
    msg.appendChild(avatar);
    msg.appendChild(body);
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    return bubble;
}

function formatText(text) {
    // Bold **text**
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Evaluation block
    html = html.replace(/(Evaluation:)([\s\S]*?)(?=\n\n|\n[A-Z]|$)/g, (_, label, body) => {
        return `<div class="evaluation-block"><strong>${label}</strong>${body.trim()}</div>`;
    });
    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');
    return html;
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
userInput.addEventListener('input', () => autoResize(userInput));
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

// ── Start Interview ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
    const topic = topicSelect.value;
    if (!topic) return;

    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    headerTopic.textContent = topicSelect.options[topicSelect.selectedIndex].text;
    headerDiff.textContent = `${capitalize(selectedDifficulty)} · Live`;

    showScreen('interview');
    startTimer();

    const loadingBubble = appendMessage('interviewer', '', true);
    loadingBubble.innerHTML = '<span style="color:var(--text-dim);font-size:0.85rem;">Initialising interview environment…</span><span class="cursor"></span>';

    try {
        const res = await fetch('/api/start-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, difficulty: selectedDifficulty, sessionId })
        });
        const data = await res.json();

        // Replace loading message
        loadingBubble.innerHTML = formatText(data.reply);
        chatBox.scrollTop = chatBox.scrollHeight;

        speak(data.reply);
    } catch {
        loadingBubble.innerHTML = '<span style="color:var(--red);">⚠ Failed to connect. Check your server and API key.</span>';
    }
});

// ── Send Answer ───────────────────────────────────────────────────────────────
sendBtn.addEventListener('click', handleSend);

async function handleSend() {
    const text = userInput.value.trim();
    if (!text || sendBtn.disabled) return;

    stopSpeech();
    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';

    sendBtn.disabled = true;
    micBtn.disabled = true;

    const streamBubble = appendMessage('interviewer', '', true);
    let fullText = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, sessionId })
        });

        if (!res.ok) throw new Error('Server error');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const json = JSON.parse(line.slice(6));
                    if (json.chunk) {
                        fullText += json.chunk;
                        // Remove cursor, update html, re-add cursor
                        streamBubble.innerHTML = formatText(fullText);
                        const cursor = document.createElement('span');
                        cursor.classList.add('cursor');
                        streamBubble.appendChild(cursor);
                        chatBox.scrollTop = chatBox.scrollHeight;
                    }
                    if (json.done || json.error) {
                        // Remove cursor
                        streamBubble.innerHTML = formatText(fullText);
                        chatBox.scrollTop = chatBox.scrollHeight;
                        speak(fullText);
                    }
                } catch { /* skip malformed */ }
            }
        }
    } catch {
        streamBubble.innerHTML = '<span style="color:var(--red);">⚠ Network error. Try again.</span>';
    } finally {
        sendBtn.disabled = false;
        micBtn.disabled = false;
        userInput.focus();
    }
}

// ── End Interview ─────────────────────────────────────────────────────────────
endBtn.addEventListener('click', async () => {
    if (!confirm('End the interview and get your performance report?')) return;

    stopSpeech();
    stopTimer();
    sendBtn.disabled = true;

    const elapsed = timerSeconds;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    summaryMeta.textContent = `Duration: ${mins}m ${secs}s · ${topicSelect.options[topicSelect.selectedIndex]?.text || 'Interview'}`;

    summaryContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    showScreen('summary');

    try {
        const res = await fetch('/api/end-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        const data = await res.json();
        renderSummary(data.summary);
    } catch {
        summaryContent.innerHTML = '<p style="color:var(--red);">⚠ Could not generate report. Please try again.</p>';
    }
});

function renderSummary(text) {
    // Convert markdown-ish text to styled HTML
    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^#{1,3}\s(.+)$/gm, '<h3>$1</h3>')
        .replace(/^\d+\.\s\*\*(.*?)\*\*:?/gm, '<div class="section"><div class="section-title">$1</div>')
        .replace(/^[-•]\s(.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)
        .replace(/(\d+\/10)/g, '<span class="score-badge">$1</span>')
        .replace(/\n\n/g, '</div><div class="section">')
        .replace(/\n/g, '<br>');

    summaryContent.innerHTML = `<div class="section">${html}</div>`;
}

// ── Restart ───────────────────────────────────────────────────────────────────
restartBtn.addEventListener('click', () => {
    chatBox.innerHTML = '';
    sessionId = null;
    timerSeconds = 0;
    timerDisplay.textContent = '00:00';
    sendBtn.disabled = false;
    micBtn.disabled = false;
    topicSelect.value = '';
    categorySelect.value = '';
    topicSelect.disabled = true;
    startBtn.disabled = true;
    populateTopics();
    showScreen('setup');
});

// ── Util ──────────────────────────────────────────────────────────────────────
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Init ──────────────────────────────────────────────────────────────────────
(function init() {
    showScreen('setup');
    initSpeechRecognition();

    // Voices may load async in some browsers
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {};
    }
})();