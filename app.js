// app.js
document.addEventListener('DOMContentLoaded', () => {
    const conversationEl = document.getElementById('conversation');
    const aiForm = document.getElementById('ai-form');
    const userPromptEl = document.getElementById('user-prompt');
    const submitBtn = document.getElementById('submit-btn');
    const clearBtn = document.getElementById('clear-btn');
    const statusEl = document.getElementById('status');

    // Function to add a message to the conversation
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = `<i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>`;

        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = text;

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(textDiv);
        conversationEl.appendChild(messageDiv);

        // Scroll to the new message
        conversationEl.scrollTop = conversationEl.scrollHeight;
    }

    // Function to update status
    function setStatus(text, isError = false) {
        statusEl.textContent = text;
        statusEl.style.color = isError ? '#dc2626' : '';
    }

    // Function to show loading state
    function showLoading(show) {
        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            statusEl.innerHTML = '<div class="loading"><span></span><span></span><span></span></div> Sending request to AI...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            setStatus('');
        }
    }

    // Handle form submission
    aiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = userPromptEl.value.trim();
        if (!prompt) return;

        // Add user message to UI
        addMessage(prompt, true);
        userPromptEl.value = '';
        showLoading(true);

        try {
            // Call our Netlify Function
            const response = await fetch('/.netlify/functions/ask-openrouter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            // Add AI response to UI
            addMessage(data.reply);

        } catch (error) {
            console.error('Error:', error);
            setStatus(`Error: ${error.message}`, true);
            addMessage("Sorry, I couldn't process your request. Please try again.");
        } finally {
            showLoading(false);
        }
    });

    // Clear chat
    clearBtn.addEventListener('click', () => {
        // Keep only the first AI welcome message
        const welcomeMessage = conversationEl.querySelector('.ai-message');
        conversationEl.innerHTML = '';
        if (welcomeMessage) {
            conversationEl.appendChild(welcomeMessage);
        }
        setStatus('Chat cleared.');
    });

    // Auto-resize textarea
    userPromptEl.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Focus the textarea on load
    userPromptEl.focus();
});