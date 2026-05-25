/* ══════════════════════════════════════════
   MedSim – app.js
   AI Medical Consultation Platform
   Powered by Grok AI (xAI)
   ══════════════════════════════════════════ */

/* ── GROK CONFIG ── */

/* ── SYSTEM PROMPT ── */
const SYSTEM_PROMPT = `You are MedSim, a highly knowledgeable and empathetic AI medical assistant.

Your role:
- Answer medical questions clearly, accurately, and in an educational way.
- Cover symptoms, diagnoses, conditions, medications, treatments, anatomy, physiology, and general health.
- Structure your responses logically — use bullet points or numbered lists when explaining multiple items.
- When discussing symptoms or conditions, mention: definition, common causes, symptoms, when to see a doctor.
- Always remind users that your answers are for educational purposes and professional medical advice should be sought for personal health concerns.
- Be warm, clear, and professional. Avoid excessive jargon — explain medical terms when you use them.
- Keep responses focused and informative — not too long, not too short. Aim for 150–300 words unless more detail is genuinely needed.
- Do NOT diagnose specific individuals. Provide general educational information only.`;

/* ── STATE ── */
let state = {
  screen:    'login',
  user:      null,
  messages:  [],       // {role: 'user'|'ai', text: ''}
  apiMsgs:   [],       // {role: 'user'|'assistant', content: ''}
  loading:   false,
  questions: [],       // just the user question strings
};

/* ══════════════════════════════════════════
   SCREEN MANAGEMENT
   ══════════════════════════════════════════ */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const el = document.getElementById('screen-' + name);
  el.classList.remove('hidden');
  el.classList.add('active');
  state.screen = name;
}

/* ══════════════════════════════════════════
   LOGIN
   ══════════════════════════════════════════ */
document.getElementById('btn-start').addEventListener('click', startSession);
document.getElementById('input-name').addEventListener('keydown',  e => { if (e.key === 'Enter') startSession(); });
document.getElementById('input-email').addEventListener('keydown', e => { if (e.key === 'Enter') startSession(); });

function showError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError() {
  document.getElementById('login-error').classList.add('hidden');
}

function startSession() {
  hideError();
  const name  = document.getElementById('input-name').value.trim();
  const email = document.getElementById('input-email').value.trim();
  if (!name)                        { showError('Please enter your name.');         return; }
  if (!email || !email.includes('@')){ showError('Please enter a valid email.');    return; }

  state.user      = { name, email };
  state.messages  = [];
  state.apiMsgs   = [{ role: 'system', content: SYSTEM_PROMPT }];
  state.questions = [];

  document.getElementById('messages').innerHTML = buildWelcomeCard();
  document.getElementById('msg-count').textContent = '0 questions asked';
  showScreen('chat');
}

function buildWelcomeCard() {
  return `
  <div class="welcome-card">
    <div class="welcome-icon">🩺</div>
    <h3>How can I help you today?</h3>
    <p>Ask any medical question — symptoms, conditions, medications, treatments, or general health advice.</p>
    <div class="suggestion-chips">
      <button class="chip" onclick="fillInput('What are the symptoms of appendicitis?')">Appendicitis symptoms</button>
      <button class="chip" onclick="fillInput('What causes chest pain?')">Chest pain causes</button>
      <button class="chip" onclick="fillInput('How is hypertension diagnosed?')">Hypertension diagnosis</button>
      <button class="chip" onclick="fillInput('What is type 2 diabetes?')">Diabetes type 2</button>
    </div>
  </div>`;
}

/* Fill input from suggestion chip */
function fillInput(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  input.focus();
  autoResize(input);
  // Remove welcome card
  const wc = document.querySelector('.welcome-card');
  if (wc) wc.remove();
}

/* ══════════════════════════════════════════
   CHAT
   ══════════════════════════════════════════ */
document.getElementById('btn-send').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
document.getElementById('chat-input').addEventListener('input', function () {
  autoResize(this);
});

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

async function sendMessage() {
  const inputEl = document.getElementById('chat-input');
  const text    = inputEl.value.trim();
  if (!text || state.loading) return;

  // Remove welcome card on first message
  const wc = document.querySelector('.welcome-card');
  if (wc) wc.remove();

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setLoading(true);

  // Add user message to UI
  appendUserMsg(text);
  state.questions.push(text);
  state.messages.push({ role: 'user', text });
  state.apiMsgs.push({ role: 'user', content: text });

  // Update counter
  const count = state.questions.length;
  document.getElementById('msg-count').textContent =
    `${count} question${count !== 1 ? 's' : ''} asked`;

  // Show typing
  addTypingIndicator();

  try {
    const reply = await callGrok(state.apiMsgs);
    removeTypingIndicator();
    appendAIMsg(reply);
    state.messages.push({ role: 'ai', text: reply });
    state.apiMsgs.push({ role: 'assistant', content: reply });
  } catch (err) {
    removeTypingIndicator();
    console.error('Grok error:', err);
    appendSystemMsg('⚠ Connection error — ' + (err.message || 'please try again.'));
  }

  setLoading(false);
}

/* ── Message renderers ── */
function appendUserMsg(text) {
  const box = document.getElementById('messages');

  const label = document.createElement('div');
  label.className = 'msg-label user-label';
  label.textContent = 'You';
  box.appendChild(label);

  const div = document.createElement('div');
  div.className = 'msg user';
  div.textContent = text;
  box.appendChild(div);
  scrollBottom();
}

function appendAIMsg(text) {
  const box = document.getElementById('messages');

  const label = document.createElement('div');
  label.className = 'msg-label ai-label';
  label.textContent = 'MedSim AI';
  box.appendChild(label);

  const div = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = formatAIText(text);
  box.appendChild(div);
  scrollBottom();
}

function appendSystemMsg(text) {
  const box = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg system';
  div.textContent = text;
  box.appendChild(div);
  scrollBottom();
}

/* Convert plain text with **bold**, bullet lists to HTML */
function formatAIText(text) {
  let html = text
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Numbered list lines
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Bullet lines
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, match => `<ul>${match}</ul>`);

  // Paragraphs: split by double newline
  const parts = html.split(/\n{2,}/);
  return parts.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<ul>') || p.startsWith('<ol>')) return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

/* ── Typing indicator ── */
function addTypingIndicator() {
  const box = document.getElementById('messages');

  const label = document.createElement('div');
  label.className = 'msg-label ai-label';
  label.id = 'typing-label';
  label.textContent = 'MedSim AI';
  box.appendChild(label);

  const div = document.createElement('div');
  div.className = 'msg ai typing-indicator';
  div.id = 'typing-indicator';
  div.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  box.appendChild(div);
  scrollBottom();
}
function removeTypingIndicator() {
  document.getElementById('typing-indicator')?.remove();
  document.getElementById('typing-label')?.remove();
}

/* ── Helpers ── */
function scrollBottom() {
  const box = document.getElementById('messages');
  box.scrollTop = box.scrollHeight;
}
function setLoading(val) {
  state.loading = val;
  document.getElementById('btn-send').disabled  = val;
  document.getElementById('chat-input').disabled = val;
  document.getElementById('btn-end').disabled   = val;
}

/* ══════════════════════════════════════════
   END SESSION → SUMMARY
   ══════════════════════════════════════════ */
document.getElementById('btn-end').addEventListener('click', () => {
  if (state.questions.length < 1) {
    alert('Please ask at least one question before ending the session.');
    return;
  }
  if (!confirm('End this consultation and view your summary?')) return;
  endSession();
});

async function endSession() {
  setLoading(true);
  appendSystemMsg('Generating your consultation summary…');

  try {
    const keyPoints = await generateKeyPoints();
    const topics    = extractTopics();
    showSummary(keyPoints, topics);
  } catch (err) {
    console.error('Summary error:', err);
    // Fallback
    showSummary([
      '📌 Always consult a qualified healthcare professional for personal medical concerns.',
      '📌 The information provided is for educational purposes only.',
      '📌 Keep a record of your symptoms and questions to share with your doctor.',
    ], ['General Health']);
  }

  setLoading(false);
}

async function generateKeyPoints() {
  const transcript = state.messages
    .map(m => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.text}`)
    .join('\n\n');

  const prompt = `Based on this medical consultation transcript, extract 3–5 key medical points that were discussed. 
Return ONLY a JSON array of strings — no markdown, no extra text, no code fences.
Each string should be a concise, useful takeaway point starting with an appropriate emoji (💊 🩺 ⚠ 📌 💡 🔍).

Transcript:
${transcript}

Return format: ["point 1", "point 2", "point 3"]`;

  const raw = await callGrok([
    { role: 'system', content: 'You extract key medical points from consultation transcripts. Return only valid JSON arrays.' },
    { role: 'user',   content: prompt }
  ], 400);

  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function extractTopics() {
  // Simple keyword extraction from questions
  const medKeywords = [
    'chest pain','headache','fever','diabetes','hypertension','cancer','heart',
    'lung','liver','kidney','brain','blood','infection','virus','bacteria',
    'surgery','medication','drug','symptom','diagnosis','treatment','appendicitis',
    'fatigue','pain','nausea','vomiting','diarrhea','cough','shortness of breath',
    'anxiety','depression','sleep','nutrition','vaccine','allergy','asthma',
    'stroke','pneumonia','covid','flu','migraine','arthritis','fracture',
  ];
  const found = new Set();
  const allText = state.questions.join(' ').toLowerCase();
  medKeywords.forEach(kw => {
    if (allText.includes(kw)) found.add(kw.replace(/\b\w/g, c => c.toUpperCase()));
  });
  return [...found].slice(0, 8);
}

function showSummary(keyPoints, topics) {
  const count = state.questions.length;
  document.getElementById('feedback-subtitle').textContent =
    `${count} question${count !== 1 ? 's' : ''} asked · ${new Date().toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'})}`;

  // Questions list
  const qList = document.getElementById('questions-list');
  qList.innerHTML = '';
  state.questions.forEach((q, i) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    item.innerHTML = `<div class="q-num">${i + 1}</div><span>${q}</span>`;
    qList.appendChild(item);
  });

  // Key points
  const kpList = document.getElementById('keypoints-list');
  kpList.innerHTML = '';
  keyPoints.forEach(kp => {
    const item = document.createElement('div');
    item.className = 'keypoint-item';
    // Separate leading emoji if present
    const emojiMatch = kp.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u);
    if (emojiMatch) {
      item.innerHTML = `<span class="kp-icon">${emojiMatch[0].trim()}</span><span>${kp.replace(emojiMatch[0], '').trim()}</span>`;
    } else {
      item.innerHTML = `<span class="kp-icon">💡</span><span>${kp}</span>`;
    }
    kpList.appendChild(item);
  });

  // Topics
  const topicsWrap = document.getElementById('topics-wrap');
  if (topics.length > 0) {
    topicsWrap.innerHTML = `
      <div class="topics-title">Topics Covered</div>
      <div class="topics-pills">
        ${topics.map(t => `<span class="topic-pill">${t}</span>`).join('')}
      </div>`;
  } else {
    topicsWrap.innerHTML = '';
  }

  showScreen('feedback');
}

/* ── Restart ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  state = {
    screen:    'login',
    user:      null,
    messages:  [],
    apiMsgs:   [],
    loading:   false,
    questions: [],
  };
  document.getElementById('input-name').value  = '';
  document.getElementById('input-email').value = '';
  hideError();
  showScreen('login');
});

/* ══════════════════════════════════════════
   GROQ API  (OpenAI-compatible format)
   ══════════════════════════════════════════ */
async function callGrok(messages, maxTokens = 500) {
  const response = await fetch(GROK_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model:       GROK_MODEL,
      messages:    messages,
      max_tokens:  maxTokens,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* ── Hide error on input focus ── */
document.getElementById('input-name').addEventListener('focus',  hideError);
document.getElementById('input-email').addEventListener('focus', hideError);