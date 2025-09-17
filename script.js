  // Theme management
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Check for saved theme preference or default to dark
    if (localStorage.getItem('theme') === 'light') {
        html.setAttribute('data-bs-theme', 'light');
        themeToggle.checked = false;
    } else {
        html.setAttribute('data-bs-theme', 'dark');
        themeToggle.checked = true;
        localStorage.setItem('theme', 'dark'); // Set dark as default if no preference exists
    }

    // Toggle theme
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            html.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            html.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Configuration
    const CONFIG = {
        SPREADSHEET_ID: '1EhTc8vUmwZZthssjqeGcS-AnHshOFL_gliFV3zFgdps',
        API_KEY: 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4',
        SHEET_NAME: 'keywords',
        DEFAULT_RESPONSE: "🙁 I'm not sure how to respond to that. Try asking something else or provide exact keyword looking for.",
        WELCOME_MESSAGE: "🙂 Hello! I'm IT Cell AI Chat bot. How can I help you today?",
        IGNORE_WORDS: ['a', 'an', 'the', 'this', 'that', 'is', 'was', 'were', 'are', 'am', 'i', 'you', 'he', 'she', 'it', 'we', 'they'],
        // Enhanced greeting responses with AI-style variations
        GREETINGS: {
            keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy', 'sup'],
            responses: [
                "👋 Hello there! How can I assist you with IT matters today?",
                "😊 Hi! Welcome to IT Cell Treasury. What can I do for you?",
                "🌟 Greetings! I'm here to help with your IT queries. What do you need assistance with?",
                "🤖 Hello! I'm your AI-powered IT assistant. How may I help you today?",
                "💻 Hi tech enthusiast! What brings you here today?",
                "🚀 Hey there! Ready to solve some IT challenges? What can I help you with?"
            ]
        },
        // AI response templates for different types of queries
        AI_RESPONSE_TEMPLATES: {
            greeting: [
                "👋 Hello! How can I assist with IT matters today?",
                "😊 Hi there! What IT issue can I help you solve?",
                "🌟 Greetings! Looking for IT support today?"
            ],
            question: [
                "🤔 Regarding your question about {topic}, here's what I can tell you:",
                "💡 For {topic}, the information I have is:",
                "🔍 Based on your query about {topic}, here's what you need to know:"
            ],
            problem: [
                "⚠️ For the issue you're experiencing with {topic}, try these steps:",
                "🔧 Let's troubleshoot your {topic} problem. Here's what you can do:",
                "🛠️ I can help with your {topic} issue. Here are some solutions:"
            ],
            thanks: [
                "😊 You're welcome! Happy to help with your IT needs.",
                "🌟 Glad I could assist! Let me know if you need anything else.",
                "👍 Anytime! Don't hesitate to reach out for more IT support."
            ]
        }
    };

    // Enhanced emoji mapping for different contexts
    const EMOJI_MAPPING = {
        greeting: ["👋", "😊", "🌟", "🤖", "💻", "🚀"],
        question: ["🤔", "💡", "🔍", "❓"],
        problem: ["⚠️", "🔧", "🛠️", "❗"],
        thanks: ["😊", "🌟", "👍", "🙏"],
        success: ["✅", "🎉", "✨", "✔️"],
        error: ["❌", "😖", "⚠️", "🔴"],
        info: ["ℹ️", "📋", "📝", "🔎"],
        list: ["📌", "🔸", "🔹", "•"]
    };

    // Track if we're waiting for a "yes" response
    let awaitingConfirmation = false;
    let lastSuggestedKeyword = null;
    let lastSuggestedResponse = null;
    let currentSuggestions = null;
    let conversationContext = [];

    // DOM elements
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Initialize chat
    document.addEventListener('DOMContentLoaded', () => {
        addMessage(CONFIG.WELCOME_MESSAGE, 'received');
        loadChatHistory();
    });

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

    // Message functions
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'sent');
        userInput.value = '';
        saveChatHistory();
        
        showTypingIndicator();
        
        setTimeout(() => {
            // Check if we're waiting for a "yes" response
            if (awaitingConfirmation && (message.toLowerCase() === 'yes' || message.toLowerCase() === 'y')) {
                hideTypingIndicator();
                if (lastSuggestedResponse) {
                    addMessage(lastSuggestedResponse, 'received');
                } else {
                    addMessage(CONFIG.DEFAULT_RESPONSE, 'received');
                }
                awaitingConfirmation = false;
                lastSuggestedKeyword = null;
                lastSuggestedResponse = null;
                saveChatHistory();
                return;
            }
            
            // Handle number selection for suggestions (1, 2, or 3)
            if (currentSuggestions && /^[1-3]$/.test(message.trim())) {
                const selectedIndex = parseInt(message.trim()) - 1;
                if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                    hideTypingIndicator();
                    const selectedKeyword = currentSuggestions[selectedIndex];
                    currentSuggestions = null;
                    
                    // Show typing indicator again while fetching the response
                    showTypingIndicator();
                    setTimeout(() => {
                        getBotResponse(selectedKeyword)
                            .then(response => {
                                hideTypingIndicator();
                                if (typeof response === 'string') {
                                    addMessage(response, 'received');
                                } else if (response.askForConfirmation) {
                                    addMessage(response.question, 'received');
                                    awaitingConfirmation = true;
                                    lastSuggestedKeyword = response.keyword;
                                    lastSuggestedResponse = response.response;
                                }
                                saveChatHistory();
                            });
                    }, 500);
                    return;
                }
            }
            
            // Reset confirmation state if user says anything other than "yes"
            if (awaitingConfirmation) {
                awaitingConfirmation = false;
                lastSuggestedKeyword = null;
                lastSuggestedResponse = null;
            }
            
            // Update conversation context
            conversationContext.push({ role: 'user', content: message });
            if (conversationContext.length > 10) {
                conversationContext = conversationContext.slice(-10);
            }
            
            // Enhanced greeting detection with AI-style analysis
            const messageAnalysis = analyzeMessage(message);
            
            if (messageAnalysis.isGreeting) {
                hideTypingIndicator();
                const aiEnhancedResponse = generateAIResponse('greeting', messageAnalysis);
                addMessage(aiEnhancedResponse, 'received');
                saveChatHistory();
                return;
            }
            
            if (messageAnalysis.isThanks) {
                hideTypingIndicator();
                const aiEnhancedResponse = generateAIResponse('thanks', messageAnalysis);
                addMessage(aiEnhancedResponse, 'received');
                saveChatHistory();
                return;
            }
            
            getBotResponse(message)
                .then(response => {
                    hideTypingIndicator();
                    if (typeof response === 'string') {
                        // Enhance the response with AI styling
                        const enhancedResponse = enhanceResponseWithAI(response, messageAnalysis);
                        addMessage(enhancedResponse, 'received');
                        currentSuggestions = null;
                    } else if (response.askForConfirmation) {
                        // Show the "Are you looking for..." message
                        addMessage(response.question, 'received');
                        awaitingConfirmation = true;
                        lastSuggestedKeyword = response.keyword;
                        lastSuggestedResponse = response.response;
                        currentSuggestions = null;
                    } else {
                        // Handle multiple responses (suggestions)
                        const enhancedMainResponse = enhanceResponseWithAI(response.mainResponse, messageAnalysis);
                        addMessage(enhancedMainResponse, 'received');
                        if (response.suggestions && response.suggestions.length > 0) {
                            currentSuggestions = response.suggestions;
                            let suggestionText = "🤔 Do you mean:\n\n";
                            suggestionText += response.suggestions.map((s, i) => `${EMOJI_MAPPING.list[i % EMOJI_MAPPING.list.length]} ${i+1}. ${s}`).join('\n');
                            suggestionText += "\n\n💡 Reply with the number (1, 2, or 3) to select an option.";
                            addMessage(suggestionText, 'received');
                        } else {
                            currentSuggestions = null;
                        }
                    }
                    saveChatHistory();
                })
                .catch(error => {
                    console.error('Error:', error);
                    hideTypingIndicator();
                    addMessage("😖 Sorry, I'm having trouble connecting to my database.", 'received');
                    saveChatHistory();
                });
        }, 1000);
    }

    // AI-enhanced message analysis
    function analyzeMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        return {
            isGreeting: CONFIG.GREETINGS.keywords.some(greeting => 
                lowerMessage.includes(greeting.toLowerCase())
            ),
            isThanks: /thanks|thank you|thx|appreciate|grateful/i.test(lowerMessage),
            isQuestion: /^what|^how|^why|^when|^where|^who|^which|^can you|^could you|^will you|^is there|^are there|\?$/i.test(lowerMessage),
            isProblem: /problem|issue|error|bug|fix|not working|broken|help|support|trouble/i.test(lowerMessage),
            keywords: extractKeywords(lowerMessage),
            originalMessage: message
        };
    }

    // Extract keywords from message
    function extractKeywords(message) {
        const words = message.split(/\s+/);
        return words.filter(word => 
            word.length > 2 && 
            !CONFIG.IGNORE_WORDS.includes(word.toLowerCase())
        );
    }

    // Generate AI-style response based on message type
    function generateAIResponse(type, analysis) {
        const templates = CONFIG.AI_RESPONSE_TEMPLATES[type] || CONFIG.AI_RESPONSE_TEMPLATES.greeting;
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        
        // Replace placeholders with actual content
        if (analysis.keywords.length > 0) {
            return randomTemplate.replace('{topic}', analysis.keywords[0]);
        }
        
        return randomTemplate;
    }

    // Enhance responses with AI styling (emojis, formatting)
    function enhanceResponseWithAI(response, analysis) {
        let enhancedResponse = response;
        
        // Add appropriate emoji based on content
        if (analysis.isQuestion) {
            enhancedResponse = `${EMOJI_MAPPING.question[Math.floor(Math.random() * EMOJI_MAPPING.question.length)]} ${enhancedResponse}`;
        } else if (analysis.isProblem) {
            enhancedResponse = `${EMOJI_MAPPING.problem[Math.floor(Math.random() * EMOJI_MAPPING.problem.length)]} ${enhancedResponse}`;
        } else {
            enhancedResponse = `${EMOJI_MAPPING.info[Math.floor(Math.random() * EMOJI_MAPPING.info.length)]} ${enhancedResponse}`;
        }
        
        // Format lists if detected in the response
        if (enhancedResponse.includes('1.') || enhancedResponse.includes('-')) {
            enhancedResponse = enhancedResponse.replace(/(\d+\.\s)/g, '<br>$1');
            enhancedResponse = enhancedResponse.replace(/(-\s)/g, '<br>$1');
        }
        
        // Add paragraph breaks for longer responses
        if (enhancedResponse.length > 120) {
            enhancedResponse = enhancedResponse.replace(/(\.\s)/g, '.<br><br>');
        }
        
        return enhancedResponse;
    }

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        
        // Convert URLs to clickable links and preserve basic formatting
        if (typeof text === 'string') {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const htmlText = text.replace(urlRegex, url => {
                return `<a href="${url}" target="_blank" style="color: #1fadff; text-decoration: underline;">${url}</a>`;
            }).replace(/\n/g, '<br>');
            
            bubble.innerHTML = htmlText;
        } else {
            bubble.textContent = text;
        }
        
        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.appendChild(bubble);
        messageDiv.appendChild(timeSpan);
        chatMessages.appendChild(messageDiv);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator && typingIndicator.remove();
    }

    // Google Sheets integration
    async function getBotResponse(userMessage) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${CONFIG.SHEET_NAME}?key=${CONFIG.API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (!data.values || data.values.length < 2) {
                return CONFIG.DEFAULT_RESPONSE;
            }
            
            const headers = data.values[0];
            const rows = data.values.slice(1);
            const lowerCaseMessage = userMessage.toLowerCase();
            const messageAnalysis = analyzeMessage(userMessage);
            
            // First try exact match in column A (keywords)
            for (const row of rows) {
                if (row[0] && lowerCaseMessage === row[0].toLowerCase()) {
                    return enhanceResponseWithAI(row[1] || CONFIG.DEFAULT_RESPONSE, messageAnalysis);
                }
            }
            
            // Then try exact match in column B (responses)
            for (const row of rows) {
                if (row[1] && lowerCaseMessage.includes(row[1].toLowerCase())) {
                    return {
                        askForConfirmation: true,
                        question: `🤔 Do you mean "${row[0]}"? (reply "yes" or "no")`,
                        keyword: row[0],
                        response: enhanceResponseWithAI(row[1] || CONFIG.DEFAULT_RESPONSE, messageAnalysis)
                    };
                }
            }
            
            // Then try partial match in column A (keywords)
            const matchedKeywords = [];
            for (const row of rows) {
                if (row[0]) {
                    const keywords = row[0].toLowerCase().split(/\s+/);
                    const found = keywords.some(keyword => 
                        keyword.length > 2 && // ignore short words
                        !CONFIG.IGNORE_WORDS.includes(keyword) && // ignore common words
                        lowerCaseMessage.includes(keyword)
                    );
                    
                    if (found) {
                        matchedKeywords.push(row);
                    }
                }
            }
            
            // Then try partial match in column B (responses)
            const matchedResponses = [];
            for (const row of rows) {
                if (row[1]) {
                    const responseWords = row[1].toLowerCase().split(/\s+/);
                    const found = responseWords.some(word => 
                        word.length > 2 && // ignore short words
                        !CONFIG.IGNORE_WORDS.includes(word) && // ignore common words
                        lowerCaseMessage.includes(word)
                    );
                    
                    if (found) {
                        matchedResponses.push(row);
                    }
                }
            }
            
            // Combine matches from both columns
            const allMatches = [...matchedKeywords, ...matchedResponses];
            
            if (allMatches.length === 1) {
                // If only one match found, ask for confirmation
                return {
                    askForConfirmation: true,
                    question: `🤔 Are you looking for "${allMatches[0][0]}"? (reply "yes" or "no")`,
                    keyword: allMatches[0][0],
                    response: enhanceResponseWithAI(allMatches[0][1] || CONFIG.DEFAULT_RESPONSE, messageAnalysis)
                };
            } else if (allMatches.length > 1) {
                // Return first match and suggestions
                return {
                    mainResponse: enhanceResponseWithAI(allMatches[0][1] || CONFIG.DEFAULT_RESPONSE, messageAnalysis),
                    suggestions: allMatches.slice(1, 4).map(row => row[0]) // Show up to 3 suggestions
                };
            }
            
            // If no matches found, try to find similar keywords
            const allKeywords = rows.map(row => row[0]).filter(Boolean);
            const similarKeywords = findSimilarKeywords(userMessage, allKeywords);
            
            if (similarKeywords.length > 0) {
                return {
                    mainResponse: CONFIG.DEFAULT_RESPONSE,
                    suggestions: similarKeywords.slice(0, 3) // Show up to 3 suggestions
                };
            }
            
            return CONFIG.DEFAULT_RESPONSE;
        } catch (error) {
            console.error('Error fetching from Google Sheets:', error);
            return "😖 Sorry, I'm having trouble connecting to my database.";
        }
    }

    // Simple keyword similarity function
    function findSimilarKeywords(input, keywords) {
        const inputWords = input.toLowerCase().split(/\s+/);
        return keywords.filter(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            return inputWords.some(word => 
                word.length > 2 && 
                !CONFIG.IGNORE_WORDS.includes(word) &&
                lowerKeyword.includes(word)
            );
        });
    }

    // Chat history functions
    function saveChatHistory() {
        const messages = Array.from(document.querySelectorAll('.message')).map(msg => ({
            text: msg.querySelector('.message-bubble').textContent,
            type: msg.classList.contains('sent') ? 'sent' : 'received',
            time: msg.querySelector('.message-time').textContent
        }));
        localStorage.setItem('whatsapp_chat_history', JSON.stringify(messages));
    }

    function loadChatHistory() {
        const savedMessages = JSON.parse(localStorage.getItem('whatsapp_chat_history'));
        if (savedMessages && savedMessages.length > 0) {
            // Clear the welcome message if loading history
            if (chatMessages.children.length === 1) {
                chatMessages.innerHTML = '';
            }
            
            savedMessages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', msg.type);
                
                const bubble = document.createElement('div');
                bubble.classList.add('message-bubble');
                bubble.textContent = msg.text;
                
                const timeSpan = document.createElement('span');
                timeSpan.classList.add('message-time');
                timeSpan.textContent = msg.time;
                
                messageDiv.appendChild(bubble);
                messageDiv.appendChild(timeSpan);
                chatMessages.appendChild(messageDiv);
            });
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/bot/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Show install prompt for PWA
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show install button (you can add this to your UI)
        showInstallPromotion();
    });

    function showInstallPromotion() {
        // You can add a button in your UI to trigger the install
        const installButton = document.createElement('button');
        installButton.textContent = 'Install App';
        installButton.style.position = 'fixed';
        installButton.style.top = '50px';
        installButton.style.right = '20px';
        installButton.style.zIndex = '1000';
        installButton.style.padding = '10px 15px';
        installButton.style.backgroundColor = '#1fadff';
        installButton.style.color = 'white';
        installButton.style.border = 'none';
        installButton.style.borderRadius = '5px';
        installButton.style.cursor = 'pointer';
        
        installButton.addEventListener('click', () => {
            // Hide the install button
            installButton.style.display = 'none';
            // Show the install prompt
            deferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        });
        
        document.body.appendChild(installButton);
        // Auto-hide after 10 seconds
        setTimeout(() => {
            installButton.style.display = 'none';
        }, 200000);
    }
