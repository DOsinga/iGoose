/**
 * Chat Interface for LLM Widget System
 * Handles communication with the LLM for widget creation and management.
 */
export class ChatInterface {
    constructor(containerElement, widgetManager) {
        this.container = containerElement;
        this.widgetManager = widgetManager;
        this.messages = [];
        this.initializeUI();
    }
    
    initializeUI() {
        // Add header with minimize button
        const chatHeader = document.createElement('div');
        chatHeader.className = 'chat-header';
        
        const headerTitle = document.createElement('div');
        headerTitle.className = 'chat-header-title';
        headerTitle.textContent = 'Widget Assistant';
        
        const headerActions = document.createElement('div');
        headerActions.className = 'chat-header-actions';
        
        this.minimizeButton = document.createElement('button');
        this.minimizeButton.className = 'minimize-button';
        this.minimizeButton.innerHTML = '&#9660;'; // Down arrow when maximized
        this.minimizeButton.title = 'Minimize chat';
        
        headerActions.appendChild(this.minimizeButton);
        chatHeader.appendChild(headerTitle);
        chatHeader.appendChild(headerActions);
        
        // Create minimize behavior
        this.minimized = false;
        const toggleMinimize = () => {
            this.minimized = !this.minimized;
            this.container.classList.toggle('minimized', this.minimized);
            this.minimizeButton.innerHTML = this.minimized ? '&#9650;' : '&#9660;'; // Up arrow when minimized, Down arrow when maximized
            this.minimizeButton.title = this.minimized ? 'Expand chat' : 'Minimize chat';
            this.minimizeButton.classList.toggle('minimized', this.minimized);
        };
        
        chatHeader.addEventListener('click', (e) => {
            // Allow clicks on the header itself, but not on action buttons
            if (e.target === chatHeader || e.target === headerTitle) {
                toggleMinimize();
            }
        });
        
        this.minimizeButton.addEventListener('click', toggleMinimize);
        
        // Create chat container
        this.chatContainer = document.createElement('div');
        this.chatContainer.className = 'chat-container';
        
        // Create chat messages area
        this.messagesElement = document.createElement('div');
        this.messagesElement.className = 'chat-messages';
        this.chatContainer.appendChild(this.messagesElement);
        
        // Create input area
        const inputArea = document.createElement('div');
        inputArea.className = 'chat-input-area';
        
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'chat-input';
        this.inputElement.placeholder = 'Ask about widgets...';
        
        this.sendButton = document.createElement('button');
        this.sendButton.className = 'chat-send-button';
        this.sendButton.textContent = 'Send';
        
        inputArea.appendChild(this.inputElement);
        inputArea.appendChild(this.sendButton);
        this.chatContainer.appendChild(inputArea);
        
        // Add to container
        this.container.appendChild(chatHeader);
        this.container.appendChild(this.chatContainer);
        
        // Add event listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Create typing indicator (initially hidden) - We'll add it dynamically when needed
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'typing-indicator';
        this.typingIndicator.style.display = 'none';
        
        const typingDots = document.createElement('div');
        typingDots.className = 'typing-dots';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDots.appendChild(dot);
        }
        
        this.typingIndicator.appendChild(typingDots);
        
        // Add welcome message
        this.addMessage('system', 'Welcome to the Widget System! I can help you create and manage widgets. Try saying "Create a clock widget" or "List my widgets".');
    }
    
    addMessage(sender, text) {
        const message = { sender, text, timestamp: new Date() };
        this.messages.push(message);
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}-message`;
        
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.textContent = text;
        
        messageElement.appendChild(textElement);
        this.messagesElement.appendChild(messageElement);
        
        // Scroll to bottom
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        
        return message;
    }
    
    async sendMessage() {
        const text = this.inputElement.value.trim();
        if (!text) return;
        
        // Clear input
        this.inputElement.value = '';
        
        // Add user message
        this.addMessage('user', text);
        
        // Make sure chat is expanded when sending a message
        if (this.minimized) {
            this.minimized = false;
            this.container.classList.remove('minimized');
            this.minimizeButton.innerHTML = '&#9660;'; // Down arrow when maximized
            this.minimizeButton.title = 'Minimize chat';
            this.minimizeButton.classList.remove('minimized');
        }
        
        // Process the message
        await this.processMessage(text);
    }
    
    async processMessage(text) {
        try {
            // Add typing indicator to the end of the messages
            this.messagesElement.appendChild(this.typingIndicator);
            this.typingIndicator.style.display = 'flex';
            this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
            
            // Disable input while processing
            this.inputElement.disabled = true;
            this.sendButton.disabled = true;
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });
            
            // Hide and remove typing indicator
            this.typingIndicator.style.display = 'none';
            if (this.typingIndicator.parentNode) {
                this.typingIndicator.parentNode.removeChild(this.typingIndicator);
            }
            
            // Re-enable input
            this.inputElement.disabled = false;
            this.sendButton.disabled = false;
            this.inputElement.focus();
            
            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Display the LLM's reply
            this.addMessage('system', data.reply);
            
            // Handle any widgets that need to be reloaded
            if (data.reloadWidgets && data.reloadWidgets.length > 0) {
                // Notify the widget manager to reload these widgets
                const event = new CustomEvent('widgets-reload', {
                    bubbles: true,
                    composed: true,
                    detail: { widgetIds: data.reloadWidgets }
                });
                this.container.dispatchEvent(event);
            }
        } catch (error) {
            // Hide and remove typing indicator
            this.typingIndicator.style.display = 'none';
            if (this.typingIndicator.parentNode) {
                this.typingIndicator.parentNode.removeChild(this.typingIndicator);
            }
            
            // Re-enable input
            this.inputElement.disabled = false;
            this.sendButton.disabled = false;
            
            console.error('Error processing message:', error);
            this.addMessage('system', 'Sorry, I encountered an error. Please try again.');
        }
    }
    
    // No additional UI components needed - we're handling everything through direct LLM interaction
}