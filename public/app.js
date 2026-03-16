const micBtn = document.getElementById('mic-btn');
const micPulse = document.getElementById('mic-pulse');
const chatbox = document.getElementById('chatbox');
const modeToggle = document.getElementById('mode-toggle');
const currentModeSpan = document.getElementById('current-mode');
const statusIndicator = document.getElementById('status-indicator');

let isRecording = false;
let currentMode = 'memory'; // 'memory' or 'chat'
let recognition = null;

// Audio context fix for iOS TTS
let synth = window.speechSynthesis;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('mic-active');
        statusIndicator.classList.replace('bg-red-500', 'bg-green-500');
        statusIndicator.classList.replace('shadow-[0_0_8px_rgba(239,68,68,0.8)]', 'shadow-[0_0_8px_rgba(34,197,94,0.8)]');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        addMessage(transcript, 'user');
        handleBackendRequest(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        addMessage('Error capturing audio. Try again.', 'bot');
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('mic-active');
        statusIndicator.classList.replace('bg-green-500', 'bg-red-500');
        statusIndicator.classList.replace('shadow-[0_0_8px_rgba(34,197,94,0.8)]', 'shadow-[0_0_8px_rgba(239,68,68,0.8)]');
    };
} else {
    addMessage('Speech recognition is not supported in this browser.', 'bot');
    micBtn.disabled = true;
}

// UI Event Listeners
modeToggle.addEventListener('click', () => {
    if (currentMode === 'memory') {
        currentMode = 'chat';
        currentModeSpan.textContent = 'Ask Question';
        currentModeSpan.classList.replace('text-blue-400', 'text-purple-400');
    } else {
        currentMode = 'memory';
        currentModeSpan.textContent = 'Store Memory';
        currentModeSpan.classList.replace('text-purple-400', 'text-blue-400');
    }
});

micBtn.addEventListener('mousedown', startRecording);
micBtn.addEventListener('mouseup', stopRecording);
micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); }, { passive: false });
micBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopRecording(); });

function startRecording() {
    if (recognition && !isRecording) {
        try { recognition.start(); } catch(e) {}
    }
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

// Messaging UI & API
function addMessage(text, sender) {
    const el = document.createElement('div');
    el.className = sender === 'user' 
        ? 'user-msg bg-blue-600 p-3 rounded-2xl rounded-tr-none w-max max-w-[85%] self-end ml-auto shadow-sm text-sm'
        : 'bot-msg bg-gray-800 p-3 rounded-2xl rounded-tl-none w-max max-w-[85%] shadow-sm text-sm';
    
    el.textContent = text;
    chatbox.appendChild(el);
    chatbox.scrollTop = chatbox.scrollHeight;
}

function speakText(text) {
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1;
    utterance.rate = 1.05;
    utterance.pitch = 1;
    synth.speak(utterance);
}

async function handleBackendRequest(text) {
    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    const typingEl = document.createElement('div');
    typingEl.id = typingId;
    typingEl.className = 'bot-msg bg-gray-800 p-3 rounded-2xl rounded-tl-none w-max shadow-sm flex gap-1 items-center';
    typingEl.innerHTML = `<div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                          <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                          <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>`;
    chatbox.appendChild(typingEl);
    chatbox.scrollTop = chatbox.scrollHeight;

    try {
        const url = currentMode === 'memory' ? '/api/memory' : '/api/chat';
        const body = currentMode === 'memory' ? { text } : { query: text };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        document.getElementById(typingId).remove();

        if (response.ok) {
            let reply = '';
            if (currentMode === 'memory') {
                reply = "Got it, I've stored that memory.";
            } else {
                reply = data.answer;
            }
            addMessage(reply, 'bot');
            speakText(reply);
        } else {
            addMessage("Server Error: " + (data.error || "Unknown"), 'bot');
        }
    } catch (error) {
        document.getElementById(typingId)?.remove();
        addMessage("Network error.", 'bot');
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.error('SW Error', err));
    });
}
