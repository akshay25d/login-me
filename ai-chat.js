/**
 * ==========================================================================
 * AI CHAT ASSISTANT ENGINE (ai-chat.js)
 * High-Speed Multi-Model AI: Local CSC Citizen Knowledge, ChatGPT & Gemini
 * ==========================================================================
 */

(function () {
    'use strict';

    // State Management
    const AIChat = {
        activeModel: localStorage.getItem('ai_chat_model') || 'local-csc',
        activeChatId: null,
        chats: [],
        isGenerating: false,
        isListening: false,
        recognition: null,
        speechSynthesisUtterance: null,
        theme: localStorage.getItem('ai_chat_theme') || 'white', // 'white' default
        apiKeys: {
            openai: localStorage.getItem('ai_key_openai') || '',
            gemini: localStorage.getItem('ai_key_gemini') || ''
        }
    };

    // --- Knowledge Base: Indian Citizen Services, CSC & Photo Guidelines ---
    const KNOWLEDGE_BASE = [
        {
            keywords: ['aadhaar', 'aadhar', 'adhar', 'uidai', 'biometric', 'pvc card', 'mobile link'],
            title: 'Aadhaar Services Guide (UIDAI)',
            response: `### 🆔 **Aadhaar Card Services & Guidelines**

Here is the complete step-by-step information for Aadhaar services:

1. **New Aadhaar Card (Free)**:
   - **Proof of Identity (POI)**: Passport, PAN Card, Voter ID, Ration Card, or Driving License.
   - **Proof of Address (POA)**: Electricity bill (within 3 months), Water bill, Bank Passbook with photo, or Voter ID.
   - **Proof of Date of Birth (DOB)**: Birth Certificate or 10th Class Marksheet.
   - *Process*: Physical presence with biometrics (fingerprints & iris) is required at the centre.

2. **Mobile Number & Email Linking / Update (₹50)**:
   - **No documents required!** Only applicant's physical biometric verification is needed.
   - Crucial for OTP-based verification for PAN, Income Tax, PF, and all DBT schemes.

3. **Address Update (₹50)**:
   - Can be updated online on *myAadhaar portal* with valid POA document or Head of Family (HOF) consent.

4. **Order Aadhaar PVC Card (₹50)**:
   - Weatherproof pocket-sized card delivered via Speed Post to registered address within 7-15 days.`
        },
        {
            keywords: ['pan card', 'pan', 'nsdl', 'uti', 'form 49a', 'instant pan', 'minor pan', 'epan'],
            title: 'PAN Card (Permanent Account Number) Guide',
            response: `### 💳 **PAN Card Application & Correction Guide**

1. **New PAN Card (Form 49A - Indian Citizen)**:
   - **Fee**: ₹107 (Physical card within India) / ₹1017 (Foreign dispatch).
   - **Required Documents**: Aadhaar Card is sufficient as single proof for Identity, Address, and Date of Birth!
   - **Photo & Signature**: 2 passport photos (3.5 × 2.5 cm) and signature inside the box with black ink.

2. **Instant e-PAN via Aadhaar (Free)**:
   - Issued in 10 minutes via Income Tax Portal if mobile is linked with Aadhaar. Digitally valid everywhere!

3. **Minor PAN Card (Below 18 years)**:
   - Parent/Guardian signs the application and provides their Aadhaar along with minor's birth certificate/Aadhaar.
   - No photo printed on minor card; valid for bank account opening.

4. **PAN Correction / Reprint (CSF Form)**:
   - Name change after marriage (requires Marriage Certificate or Gazette notification).
   - Father's name correction or Date of Birth mismatch fix.`
        },
        {
            keywords: ['voter', 'voter id', 'epic', 'election', 'form 6', 'nvsp', 'eci'],
            title: 'Voter ID Card Guide (Election Commission of India)',
            response: `### 🗳️ **Voter ID Card (EPIC) Services**

1. **New Voter Registration (Form 6)**:
   - Eligible if aged 18 or turning 18 on qualifying dates (Jan 1, Apr 1, Jul 1, Oct 1).
   - **Documents**: Passport size photo, Age proof (Aadhaar/10th Marksheet/Birth cert), Address proof (Aadhaar/Electricity bill/Ration card).

2. **Shifting / Correction / Duplicate EPIC (Form 8)**:
   - Used for changing address within or outside constituency, correcting name/photo/DOB, or replacing damaged cards.

3. **e-EPIC Digital Download**:
   - Registered voters can download official color PDF Voter Card instantly via *voters.eci.gov.in* using registered mobile OTP.`
        },
        {
            keywords: ['passport', 'visa', 'psk', 'tatkaal', 'passport photo'],
            title: 'Passport & Visa Photo/Document Guidelines',
            response: `### ✈️ **Passport Seva & Visa Guidelines**

1. **Passport Types & Fees**:
   - **Normal (36 pages)**: ₹1,500 (approx. 15-30 days including police verification).
   - **Tatkaal**: ₹3,500 (issued within 3-5 working days).

2. **Mandatory Documents**:
   - Aadhaar Card (with complete DOB).
   - 10th Class Passing Certificate (for Non-ECR status check).
   - Proof of Address (Bank Passbook with photo / Electricity Bill / Voter ID).
   - PAN Card (supporting identity).

3. **Photo Specifications for Passport & Visas**:
   - **Indian Passport**: 35 mm × 45 mm, pure white background, 75-80% face coverage, no glare on spectacles, neutral expression.
   - *Tip*: You can use our built-in **Photoshop Studio** or **Passport Photo Tool** in Quick Actions to format, background-change, and print in 1 click!`
        },
        {
            keywords: ['income certificate', 'caste certificate', 'domicile', 'niwas', 'ews', 'praman patra'],
            title: 'State Revenue Certificates Guide',
            response: `### 📜 **Income, Caste & Domicile Certificates**

1. **Income Certificate (Aaye Praman Patra)**:
   - **Validity**: 3 years in most states.
   - **Required Documents**: Aadhaar Card, Self-Declaration (Swaghoshan Patra), Salary slip or Patwari report, Ration card / Electricity bill.
   - **Uses**: Scholarship applications, EWS reservation, Ayushman Bharat, fee concession.

2. **Caste Certificate (Jati Praman Patra - SC/ST/OBC)**:
   - **Required**: Proof of caste lineage (Father/Grandfather's 1950/1985 revenue record or old caste cert), Aadhaar, Khatiyan/Land document.

3. **Domicile / Residence (Niwas Praman Patra)**:
   - Continuous residency proof (minimum 10-15 years), Aadhaar, Voter ID, Land registry or electricity bill.`
        },
        {
            keywords: ['pm kisan', 'pmkisan', 'kisan samman', 'samman nidhi', 'ekyc'],
            title: 'PM-Kisan Samman Nidhi Yojana',
            response: `### 🌾 **PM-Kisan Samman Nidhi Yojana**

- **Benefit**: ₹6,000 per year paid in 3 equal installments of ₹2,000 directly into farmers' Aadhaar-seeded bank accounts.
- **Mandatory Checks**:
  1. **Aadhaar e-KYC**: Must be completed via OTP or Biometric at CSC centre.
  2. **Land Seeding**: Land records (Khatoni/ROR) must be verified and marked 'Yes' on the portal.
  3. **Aadhaar Bank Seeding (NPCI Mapping)**: Bank account must have active DBT mapping with Aadhaar.`
        },
        {
            keywords: ['ayushman', 'pmjay', 'golden card', 'health card', '5 lakh'],
            title: 'Ayushman Bharat - PMJAY Health Card',
            response: `### 🏥 **Ayushman Bharat (PM-JAY) Golden Card**

- **Benefit**: Free cashless medical treatment up to **₹5,00,000 per family per year** at empaneled government and private hospitals across India.
- **Eligibility**: Families listed in SECC-2011 database, Ration Card (NFSA Priority/Antyodaya), or state welfare lists.
- **Senior Citizens**: All senior citizens aged **70+ years** are now covered under Ayushman Vaya Vandana Card irrespective of income!
- **Documents Required**: Aadhaar card + Active Ration Card / Family ID.`
        },
        {
            keywords: ['photo', 'photoshop', 'edit', 'background', 'signature', 'resize', 'kb'],
            title: 'Photo Editing, Background Change & Signature Sizing',
            response: `### 🎨 **Photo & Signature Editing in our Studio**

You can complete all photo and document resizing directly on this website:

1. **Open Photoshop Studio**: Click **"Photoshop Studio"** in the Quick Actions bar above.
2. **Passport Photo Ready**:
   - Use **ID / Passport** presets: Indian Passport (35×45mm) or Aadhaar (25×35mm).
   - Use the **Paint Bucket Tool (<kbd>G</kbd>)** to replace complex background with pure white or studio blue in 1 click!
   - Use the **Spot Healing Brush (<kbd>J</kbd>)** to clean blemishes or shadows.
3. **Exam Signature Sizing (10 KB - 20 KB)**:
   - Use our **Photo & Signature** tool or **PDF Tools** to compress resolution and file size for SSC, UPSC, Banking, and Railway forms without blurriness.`
        }
    ];

    // --- Core NLP Matcher & Local Intelligence ---
    function generateLocalAIResponse(userText) {
        const query = userText.toLowerCase().trim();

        // 1. Check greetings
        if (/^(hi|hello|hey|namaste|pranam|ram ram|kese ho|good morning|good evening|salaam)/i.test(query)) {
            return `### 🙏 **नमस्ते! Welcome to Akshay Santra CSC AI Assistant!**

Main aapki kaise sahayata kar sakta hoon? Aap mujhse Indian Government services, documents, schemes, ya online forms ke baare me pooch sakte hain:

- 🆔 **Aadhaar Card** (New Enrolment, Mobile Link, Address Update, PVC Card)
- 💳 **PAN Card** (New 49A, Instant e-PAN, Minor, Correction)
- 🗳️ **Voter ID & Passport** (Forms, Documents, Appointments)
- 📜 **Income / Caste / Domicile Certificates**
- 🌾 **PM-Kisan, Ayushman Card, E-Shram Schemes**
- 🎨 **Photo Editing & Signature Resizing**

*Aap apna prashn Hindi ya English me type kar sakte hain!*`;
        }

        // 2. Check knowledge base keyword matches
        let bestMatch = null;
        let highestScore = 0;

        KNOWLEDGE_BASE.forEach(entry => {
            let score = 0;
            entry.keywords.forEach(kw => {
                if (query.includes(kw)) score += 2;
            });
            if (score > highestScore) {
                highestScore = score;
                bestMatch = entry;
            }
        });

        if (bestMatch && highestScore >= 2) {
            return bestMatch.response;
        }

        // 3. Fallback comprehensive intelligent assistant answer
        return `### 🤖 **CSC Smart AI Assistant Response**

Aapke prashn: *"**${escapeHtml(userText)}**"* par hamare pass nimnlikhit jankari hai:

1. **Common Services Centre (CSC) Guidance**:
   - Kisi bhi government service (Aadhaar, PAN, Voter ID, Ration Card, State Certificates) ke liye **Aadhaar Card + Mobile OTP + Photo** mukhya dastavej hote hain.
   - Forms fill karne ke liye aap hamare **Quick Actions** section me jakar direct **"Online Form"**, **"Print"**, **"Photoshop Studio"**, ya **"PDF Tools"** use kar sakte hain.

2. **Official Help & Queries**:
   - Agar aapko kisi specific scheme ka status check karna hai ya form fill karwana hai, to aap centre par visit kar sakte hain ya apna exact service name type karein (e.g., *"Aadhaar me mobile number kaise link karein"*, *"PAN card form 49A documents"*).

💡 *Agar aap chahein to **ChatGPT** ya **Google Gemini** model select karke settings me apna API key daal sakte hain taaki aur zyada broad general queries ka live response mile!*`;
    }

    // --- API Handlers for Real Cloud AI Models ---
    async function fetchOpenAIResponse(messages, onChunk) {
        const apiKey = AIChat.apiKeys.openai;
        if (!apiKey) {
            throw new Error('OpenAI API key missing! Click the ⚙️ Settings button to add your API key, or switch to "Local Citizen AI" for 100% free offline responses.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an intelligent, polite AI assistant at Akshay Santra Common Services Centre (CSC) in India. You help citizens with government services, forms, schemes, documentation, and technical photo/PDF tools in English and Hindi (Hinglish). Provide clear, formatted markdown answers.'
                    },
                    ...messages
                ],
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `OpenAI API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        const token = parsed.choices?.[0]?.delta?.content || '';
                        fullText += token;
                        if (onChunk) onChunk(fullText);
                    } catch (e) { }
                }
            }
        }
        return fullText;
    }

    async function fetchGeminiResponse(userText) {
        const apiKey = AIChat.apiKeys.gemini;
        if (!apiKey) {
            throw new Error('Google Gemini API key missing! Click the ⚙️ Settings button to add your API key, or use "Local Citizen AI".');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are the AI Assistant at Akshay Santra Common Services Centre (CSC). Answer helpful Indian citizen queries accurately in Hindi and English with markdown formatting.\nUser Query: ${userText}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
        }

        const json = await response.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from Gemini.';
    }

    // --- Modal Open & Close ---
    window.openAiChatModal = function (initialPrompt) {
        const modal = document.getElementById('aiChatModal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Initialize chats if first time
        if (AIChat.chats.length === 0) {
            loadChatsFromStorage();
        }

        renderSidebar();
        renderActiveChat();

        if (initialPrompt) {
            const input = document.getElementById('ai-chat-input');
            if (input) {
                input.value = initialPrompt;
                handleSendMessage();
            }
        } else {
            setTimeout(() => {
                document.getElementById('ai-chat-input')?.focus();
            }, 100);
        }
    };

    window.closeAiChatModal = function () {
        const modal = document.getElementById('aiChatModal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.style.display = 'none';

        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    };

    // --- Chat Storage & Session Management ---
    function loadChatsFromStorage() {
        try {
            const stored = localStorage.getItem('ai_chat_sessions');
            if (stored) {
                AIChat.chats = JSON.parse(stored);
            }
        } catch (e) {
            AIChat.chats = [];
        }

        if (!AIChat.chats || AIChat.chats.length === 0) {
            createNewChat();
        } else {
            AIChat.activeChatId = AIChat.chats[0].id;
        }
    }

    function saveChatsToStorage() {
        try {
            localStorage.setItem('ai_chat_sessions', JSON.stringify(AIChat.chats.slice(0, 30)));
        } catch (e) { }
    }

    function createNewChat() {
        const newChat = {
            id: 'chat_' + Date.now(),
            title: 'New Conversation',
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: []
        };
        AIChat.chats.unshift(newChat);
        AIChat.activeChatId = newChat.id;
        saveChatsToStorage();
        renderSidebar();
        renderActiveChat();
    }

    function getActiveChat() {
        return AIChat.chats.find(c => c.id === AIChat.activeChatId) || AIChat.chats[0];
    }

    // --- UI Rendering ---
    function renderSidebar() {
        const list = document.getElementById('ai-chat-history-list');
        if (!list) return;

        if (AIChat.chats.length === 0) {
            list.innerHTML = '<div class="text-xs text-gray-400 p-3 text-center">No recent chats</div>';
            return;
        }

        list.innerHTML = AIChat.chats.map(c => {
            const isActive = c.id === AIChat.activeChatId;
            return `
                <div class="group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${isActive ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-50'}" onclick="aiSelectChat('${c.id}')">
                    <div class="flex items-center gap-2.5 truncate">
                        <i class="fa-regular fa-message ${isActive ? 'text-teal-600' : 'text-gray-400'} text-xs"></i>
                        <span class="truncate">${escapeHtml(c.title || 'Conversation')}</span>
                    </div>
                    <button type="button" onclick="aiDeleteChat('${c.id}', event)" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-600 p-1 transition" title="Delete Chat">
                        <i class="fa-solid fa-trash-can text-[11px]"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    function renderActiveChat() {
        const container = document.getElementById('ai-messages-container');
        const emptyState = document.getElementById('ai-chat-empty-state');
        const modelBadge = document.getElementById('ai-model-badge');
        if (!container) return;

        const chat = getActiveChat();
        if (!chat || chat.messages.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        if (modelBadge) {
            const labels = {
                'local-csc': '🤖 Local Citizen AI (Free)',
                'chatgpt-4o': '⚡ ChatGPT (GPT-4o)',
                'gemini-flash': '✨ Google Gemini 1.5'
            };
            modelBadge.textContent = labels[AIChat.activeModel] || 'AI Assistant';
        }

        container.innerHTML = chat.messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const parsedContent = formatMarkdown(m.content);

            return `
                <div class="flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in group">
                    ${!isUser ? `
                        <div class="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                        </div>
                    ` : ''}

                    <div class="max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}">
                        <div class="px-4 py-3 rounded-2xl ${isUser ? 'bg-teal-600 text-white rounded-br-none shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'} ai-markdown-content">
                            ${isUser ? escapeHtml(m.content).replace(/\n/g, '<br>') : parsedContent}
                        </div>

                        <!-- Action Bar for AI Message -->
                        ${!isUser ? `
                            <div class="flex items-center gap-2 mt-1.5 px-1 text-[11px] text-gray-400 opacity-80 group-hover:opacity-100 transition">
                                <button onclick="aiCopyMessageText(${idx})" class="hover:text-gray-700 flex items-center gap-1 transition" title="Copy text">
                                    <i class="fa-regular fa-copy"></i> Copy
                                </button>
                                <span>•</span>
                                <button onclick="aiSpeakMessage(${idx})" class="hover:text-teal-600 flex items-center gap-1 transition" title="Listen aloud">
                                    <i class="fa-solid fa-volume-high"></i> Listen
                                </button>
                            </div>
                        ` : ''}
                    </div>

                    ${isUser ? `
                        <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5 font-bold text-xs">
                            <i class="fa-solid fa-user"></i>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        scrollMessagesToBottom();
    }

    function scrollMessagesToBottom() {
        const container = document.getElementById('ai-messages-scroll-area');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // --- Message Sending Pipeline ---
    async function handleSendMessage() {
        const input = document.getElementById('ai-chat-input');
        if (!input || AIChat.isGenerating) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.style.height = 'auto';

        const chat = getActiveChat();
        if (!chat) return;

        // Auto name chat from first query
        if (chat.messages.length === 0) {
            chat.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
        }

        // Add user message
        chat.messages.push({
            role: 'user',
            content: text,
            timestamp: Date.now()
        });

        renderSidebar();
        renderActiveChat();

        // Add placeholder AI message
        const aiMessageIndex = chat.messages.length;
        chat.messages.push({
            role: 'assistant',
            content: '',
            timestamp: Date.now()
        });

        AIChat.isGenerating = true;
        updateSendButtonState(true);
        showTypingIndicator(true);

        try {
            if (AIChat.activeModel === 'chatgpt-4o') {
                // OpenAI streaming or direct
                const apiMessages = chat.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
                await fetchOpenAIResponse(apiMessages, (partialText) => {
                    chat.messages[aiMessageIndex].content = partialText;
                    renderActiveChat();
                });
            } else if (AIChat.activeModel === 'gemini-flash') {
                // Google Gemini
                const reply = await fetchGeminiResponse(text);
                chat.messages[aiMessageIndex].content = reply;
                renderActiveChat();
            } else {
                // High-Speed Local Citizen AI Engine (Free & Offline)
                await new Promise(r => setTimeout(r, 450)); // natural typing feel
                const reply = generateLocalAIResponse(text);
                chat.messages[aiMessageIndex].content = reply;
                renderActiveChat();
            }
        } catch (err) {
            chat.messages[aiMessageIndex].content = `⚠️ **Error**: ${err.message}\n\n*Tip: You can switch to "**Local Citizen AI**" in the top model menu for free, instant offline guidance without API keys.*`;
            renderActiveChat();
        } finally {
            AIChat.isGenerating = false;
            updateSendButtonState(false);
            showTypingIndicator(false);
            saveChatsToStorage();
        }
    }

    function showTypingIndicator(show) {
        const ind = document.getElementById('ai-typing-status');
        if (ind) ind.style.display = show ? 'flex' : 'none';
        if (show) scrollMessagesToBottom();
    }

    function updateSendButtonState(isBusy) {
        const btn = document.getElementById('ai-send-btn');
        if (btn) {
            btn.disabled = isBusy;
            btn.innerHTML = isBusy ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '<i class="fa-solid fa-arrow-up"></i>';
        }
    }

    // --- Voice & Speech Services ---
    function toggleVoiceRecognition() {
        const micBtn = document.getElementById('ai-mic-btn');
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRec) {
            alert('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }

        if (AIChat.isListening) {
            if (AIChat.recognition) AIChat.recognition.stop();
            AIChat.isListening = false;
            micBtn?.classList.remove('ai-mic-listening');
            return;
        }

        const rec = new SpeechRec();
        rec.lang = 'hi-IN'; // supports Hindi & English
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => {
            AIChat.isListening = true;
            micBtn?.classList.add('ai-mic-listening');
        };

        rec.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('ai-chat-input');
            if (input) {
                input.value = (input.value ? input.value + ' ' : '') + transcript;
                input.focus();
            }
        };

        rec.onerror = () => {
            AIChat.isListening = false;
            micBtn?.classList.remove('ai-mic-listening');
        };

        rec.onend = () => {
            AIChat.isListening = false;
            micBtn?.classList.remove('ai-mic-listening');
        };

        AIChat.recognition = rec;
        rec.start();
    }

    window.aiSpeakMessage = function (index) {
        const chat = getActiveChat();
        if (!chat || !chat.messages[index] || !window.speechSynthesis) return;

        const text = chat.messages[index].content.replace(/[#*`_\[\]]/g, '');
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    window.aiCopyMessageText = function (index) {
        const chat = getActiveChat();
        if (!chat || !chat.messages[index]) return;
        navigator.clipboard.writeText(chat.messages[index].content);
        alert('Message copied to clipboard!');
    };

    // --- Quick Prompts & Helpers ---
    window.aiUsePrompt = function (text) {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = text;
            handleSendMessage();
        }
    };

    window.aiSelectChat = function (id) {
        AIChat.activeChatId = id;
        renderSidebar();
        renderActiveChat();
    };

    window.aiDeleteChat = function (id, e) {
        if (e) e.stopPropagation();
        AIChat.chats = AIChat.chats.filter(c => c.id !== id);
        if (AIChat.activeChatId === id) {
            AIChat.activeChatId = AIChat.chats[0]?.id || null;
            if (!AIChat.activeChatId) createNewChat();
        }
        saveChatsToStorage();
        renderSidebar();
        renderActiveChat();
    };

    window.aiClearCurrentChat = function () {
        const chat = getActiveChat();
        if (chat) {
            chat.messages = [];
            saveChatsToStorage();
            renderActiveChat();
        }
    };

    window.aiDownloadChatTranscript = function () {
        const chat = getActiveChat();
        if (!chat || chat.messages.length === 0) {
            alert('No messages to download.');
            return;
        }

        let content = `# Akshay Santra CSC - AI Chat Transcript\n`;
        content += `Date: ${new Date().toLocaleString()}\n`;
        content += `Model: ${AIChat.activeModel}\n\n`;
        content += `----------------------------------------\n\n`;

        chat.messages.forEach(m => {
            const sender = m.role === 'user' ? 'CUSTOMER' : 'AI ASSISTANT';
            content += `[${sender}]:\n${m.content}\n\n`;
        });

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CSC-AI-Chat-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    window.aiSetModel = function (modelKey) {
        AIChat.activeModel = modelKey;
        localStorage.setItem('ai_chat_model', modelKey);
        renderActiveChat();
    };

    window.aiToggleTheme = function () {
        const modal = document.getElementById('aiChatModal');
        if (!modal) return;

        const isDark = modal.classList.toggle('theme-dark');
        AIChat.theme = isDark ? 'dark' : 'white';
        localStorage.setItem('ai_chat_theme', AIChat.theme);

        const btn = document.getElementById('ai-theme-toggle-btn');
        if (btn) {
            btn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
    };

    // --- Settings Drawer / Modal ---
    window.aiOpenSettingsModal = function () {
        const drawer = document.getElementById('ai-settings-drawer');
        if (drawer) {
            document.getElementById('ai-openai-key-input').value = AIChat.apiKeys.openai;
            document.getElementById('ai-gemini-key-input').value = AIChat.apiKeys.gemini;
            drawer.classList.remove('hidden');
        }
    };

    window.aiCloseSettingsModal = function () {
        document.getElementById('ai-settings-drawer')?.classList.add('hidden');
    };

    window.aiSaveSettings = function () {
        const openai = document.getElementById('ai-openai-key-input')?.value.trim() || '';
        const gemini = document.getElementById('ai-gemini-key-input')?.value.trim() || '';

        AIChat.apiKeys.openai = openai;
        AIChat.apiKeys.gemini = gemini;
        localStorage.setItem('ai_key_openai', openai);
        localStorage.setItem('ai_key_gemini', gemini);

        aiCloseSettingsModal();
        alert('AI settings saved successfully!');
    };

    // --- Markdown Formatting Parser ---
    function formatMarkdown(text) {
        if (!text) return '';

        // If marked.js is available on window, use it for rich GitHub-flavored markdown
        if (window.marked && typeof window.marked.parse === 'function') {
            try {
                return window.marked.parse(text);
            } catch (e) { }
        }

        // Lightweight fallback parser
        let html = escapeHtml(text);

        // Headings
        html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-base my-2 text-gray-900">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg my-2 text-gray-900">$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl my-3 text-gray-900">$1</h1>');

        // Bold & Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

        // Inline Code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-rose-600 font-mono text-xs">$1</code>');

        // Bullet points
        html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>');

        // Line breaks
        html = html.replace(/\n\n/g, '<p class="mb-2"></p>');
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }

    // --- Event Listeners Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        // Apply saved theme
        const modal = document.getElementById('aiChatModal');
        if (modal && AIChat.theme === 'dark') {
            modal.classList.add('theme-dark');
        }

        // Textarea auto-height & Enter to send
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
            });

            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            });
        }

        // Voice mic button
        document.getElementById('ai-mic-btn')?.addEventListener('click', toggleVoiceRecognition);

        // Send button
        document.getElementById('ai-send-btn')?.addEventListener('click', handleSendMessage);

        // New Chat button
        document.getElementById('ai-new-chat-btn')?.addEventListener('click', () => {
            createNewChat();
            document.getElementById('ai-chat-input')?.focus();
        });
    });

})();
