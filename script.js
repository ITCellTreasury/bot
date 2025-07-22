// Configuration - Replace these with your actual values
    const CONFIG = {
        SPREADSHEET_ID: '1EhTc8vUmwZZthssjqeGcS-AnHshOFL_gliFV3zFgdps', // From your sheet URL
        API_KEY: 'AIzaSyBAuS3Brpsw5JOJnjNJii1UlFa7ClXf8d4',          // From Google Cloud Console
        SHEET_NAME: 'keywords',                  // Your sheet tab name
        DEFAULT_RESPONSE: "🙁 I'm not sure how to respond to that. Try asking something else.",
        WELCOME_MESSAGE: "🙂Hello! I'm IT Cell Chat bot. How can I help you today?",
        IGNORE_WORDS: ['a', 'an', 'the', 'this', 'that', 'is', 'was', 'were', 'are', 'am', 'i', 'you', 'he', 'she', 'it', 'we', 'they']
    };
    
    // Track if we're waiting for a "yes" response
    let awaitingConfirmation = false;
    let lastSuggestedKeyword = null;
    let lastSuggestedResponse = null;
    
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
            
            // Reset confirmation state if user says anything other than "yes"
            if (awaitingConfirmation) {
                awaitingConfirmation = false;
                lastSuggestedKeyword = null;
                lastSuggestedResponse = null;
            }
            
            getBotResponse(message)
                .then(response => {
                    hideTypingIndicator();
                    if (typeof response === 'string') {
                        addMessage(response, 'received');
                    } else if (response.askForConfirmation) {
                        // Show the "Are you looking for..." message
                        addMessage(response.question, 'received');
                        awaitingConfirmation = true;
                        lastSuggestedKeyword = response.keyword;
                        lastSuggestedResponse = response.response;
                    } else {
                        // Handle multiple responses (suggestions)
                        addMessage(response.mainResponse, 'received');
                        if (response.suggestions && response.suggestions.length > 0) {
                            let suggestionText = "Do you mean:\n";
                            suggestionText += response.suggestions.map((s, i) => `${i+1}. ${s}`).join('\n');
                            addMessage(suggestionText, 'received');
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
    
    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        
        // Convert URLs to clickable links
        if (typeof text === 'string') {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const htmlText = text.replace(urlRegex, url => {
                return `<a href="${url}" target="_blank" style="color: #1fadff; text-decoration: underline;">${url}</a>`;
            });
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
            
            // First try exact match
            for (const row of rows) {
                if (row[0] && lowerCaseMessage === row[0].toLowerCase()) {
                    return row[1] || CONFIG.DEFAULT_RESPONSE;
                }
            }
            
            // Then try partial match
            const matchedRows = [];
            for (const row of rows) {
                if (row[0]) {
                    const keywords = row[0].toLowerCase().split(/\s+/);
                    const found = keywords.some(keyword => 
                        keyword.length > 2 && // ignore short words
                        !CONFIG.IGNORE_WORDS.includes(keyword) && // ignore common words
                        lowerCaseMessage.includes(keyword)
                    );
                    
                    if (found) {
                        matchedRows.push(row);
                    }
                }
            }
            
            if (matchedRows.length === 1) {
                // If only one match found, ask for confirmation
                return {
                    askForConfirmation: true,
                    question: `Are you looking for "${matchedRows[0][0]}"? (reply "yes" or "no")`,
                    keyword: matchedRows[0][0],
                    response: matchedRows[0][1] || CONFIG.DEFAULT_RESPONSE
                };
            } else if (matchedRows.length > 1) {
                // Return first match and suggestions
                return {
                    mainResponse: matchedRows[0][1] || CONFIG.DEFAULT_RESPONSE,
                    suggestions: matchedRows.slice(1, 4).map(row => row[0]) // Show up to 3 suggestions
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
