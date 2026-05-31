let QUESTIONS = [
  {
    "english": "I like apples.",
    "japanese": "私はりんごが好きです。",
    "words": {
      "i": "私",
      "like": "好き",
      "apples": "りんご"
    }
  },
  {
    "english": "She plays tennis every weekend.",
    "japanese": "彼女は毎週末テニスをします。",
    "words": {
      "she": "彼女",
      "plays": "する",
      "tennis": "テニス",
      "every": "毎",
      "weekend": "週末"
    }
  },
  {
    "english": "They study English at school.",
    "japanese": "彼らは学校で英語を勉強します。",
    "words": {
      "they": "彼ら",
      "study": "勉強する",
      "english": "英語",
      "at": "で",
      "school": "学校"
    }
  }];

let typed = "", score = 0, combo = 0, mistakes = 0, completedQ = 0, completedChars = 0;
let history = [], recentQ = [];
let mistakeFlashUntil = 0;
let startTime = Date.now();
let currentQ, started = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, dur, type = 'square') {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.start(); osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function playClear() {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(1800, audioCtx.currentTime + 0.10);
    gain.gain.setValueAtTime(0.10, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.10);
    osc.start(); osc.stop(audioCtx.currentTime + 0.12);
  } catch(e) {}
}

async function loadQuestions() {
  try {
    const res = await fetch('./questions.json');

    if (!res.ok) return;

    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      QUESTIONS = data;
    }
  } catch (e) {
    return;
  }

  currentQ = chooseQuestion();
  renderSentence();
}

function chooseQuestion() {
  let candidates = QUESTIONS.filter(q => !recentQ.includes(q));
  if (!candidates.length) candidates = QUESTIONS;

  const q = candidates[Math.floor(Math.random() * candidates.length)];
  recentQ.push(q);
  if (recentQ.length > 3) recentQ.shift();
  return q;
}

function renderSentence() {
  const target = currentQ.english;
  const pos = typed.length;
  const el = document.getElementById('sentence');
  const now = Date.now();

  let html = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i] === ' ' ? '&nbsp;' : target[i];

    if (i < pos) {
      html += `<span class="char-correct">${ch}</span>`;
    } else if (i === pos) {
      const flash = now < mistakeFlashUntil ? ' flash' : '';
      html += `<span class="char-current${flash}">${ch}</span>`;
    } else {
      html += `<span class="char-remaining">${ch}</span>`;
    }
  }

  el.innerHTML = html;
}

function updateStats() {
  const elapsed = Math.max((Date.now() - startTime) / 60000, 1/60);
  const wpm = Math.round((completedChars / 5) / elapsed);

  const acc = completedChars + mistakes > 0
    ? ((completedChars / (completedChars + mistakes)) * 100).toFixed(1)
    : '100.0';

  document.getElementById('s-score').textContent = score;
  document.getElementById('s-combo').textContent = combo;
  document.getElementById('s-wpm').textContent = wpm;
  document.getElementById('s-acc').textContent = acc + '%';
  document.getElementById('s-mis').textContent = mistakes;
  document.getElementById('s-q').textContent = completedQ;

  const badge = document.getElementById('combo-badge');
  if (combo >= 3) {
    badge.classList.add('show');
    document.getElementById('combo-big').textContent = combo;
  } else {
    badge.classList.remove('show');
  }
}

function updateLog() {
  if (!history.length) return;
  const item = history[0];

  document.getElementById('log-eng').textContent = item.english;
  document.getElementById('log-jp').textContent = item.japanese;

  const words = Object.entries(item.words || {})
    .map(([k,v]) => `${k} : ${v}`)
    .join('  /  ');

  document.getElementById('log-words').textContent = words;
}

function handleChar(char) {
  if (!started) return;

  const target = currentQ.english;
  if (typed.length >= target.length) return;

  let expected = target[typed.length];

  if (char === ' ' && expected !== ' ') return;

  if (expected === ' ' && char !== ' ') {
    typed += ' ';
    playTone(1500, 0.015);
    if (typed.length >= target.length) finishQuestion();
    return;
  }

  expected = target[typed.length];

  if (char === expected) {
    typed += char;
    playTone(1500, 0.015);

    if (typed === target) finishQuestion();
  } else {
    playTone(250, 0.04);
    combo = 0;
    mistakes++;
    mistakeFlashUntil = Date.now() + 250;
  }

  renderSentence();
  updateStats();
}

function finishQuestion() {
  playClear();

  score++;
  combo++;
  completedQ++;
  completedChars += currentQ.english.length;

  history.unshift(currentQ);
  if (history.length > 5) history.pop();

  typed = "";
  currentQ = chooseQuestion();

  renderSentence();
  updateStats();
  updateLog();
}

function startGame() {
  document.getElementById('click-to-start').style.display = 'none';
  document.getElementById('hidden-input').focus();

  started = true;
  startTime = Date.now();
}


document.getElementById('click-to-start').addEventListener('click', () => {
  audioCtx.resume();
  startGame();
});

document.addEventListener('keydown', (e) => {
  if (!started) return;

  const target = currentQ.english;
  if (typed.length >= target.length) return;

  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
  if (e.key === 'Escape') return;

  const expected = target[typed.length];

  if (e.key === ' ') {
    if (expected === ' ') {
      typed += ' ';
      playTone(1500, 0.015);
      renderSentence();
      updateStats();
      if (typed === target) finishQuestion();
    }
    return;
  }

  if (e.key.length !== 1) return;

  // ★ここが本体
  if (expected === ' ') {
    typed += ' ';
  }

  const nextExpected = target[typed.length];

  if (e.key === nextExpected) {
    typed += e.key;
    playTone(1500, 0.015);
    if (typed === target) finishQuestion();
  } else {
    playTone(250, 0.04);
    combo = 0;
    mistakes++;
    mistakeFlashUntil = Date.now() + 250;
  }

  renderSentence();
  updateStats();
});

document.getElementById('app').addEventListener('click', () => {
  if (started) document.getElementById('hidden-input').focus();
});

loadQuestions();