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
        this.container.appendChild(this.chatContainer);
        
        // Add event listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
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
        
        // Process the message
        await this.processMessage(text);
    }
    
    async processMessage(text) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to send message: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle different response types
            if (data.type === 'widget_list') {
                this.addMessage('system', data.message);
                this.displayWidgetList(data.widgets);
            } else if (data.type === 'intent' && data.intent === 'create_widget') {
                this.addMessage('system', data.message);
                this.promptWidgetCreation();
            } else {
                this.addMessage('system', data.message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            this.addMessage('system', 'Sorry, I encountered an error. Please try again.');
        }
    }
    
    displayWidgetList(widgets) {
        if (!widgets || widgets.length === 0) {
            this.addMessage('system', 'You don\'t have any widgets yet. Try creating one!');
            return;
        }
        
        // Create a list element
        const listElement = document.createElement('div');
        listElement.className = 'widget-list';
        
        widgets.forEach(widget => {
            const widgetItem = document.createElement('div');
            widgetItem.className = 'widget-list-item';
            widgetItem.innerHTML = `
                <strong>${widget.name}</strong>
                <span>${widget.description}</span>
            `;
            
            listElement.appendChild(widgetItem);
        });
        
        // Add to messages
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        messageElement.appendChild(listElement);
        this.messagesElement.appendChild(messageElement);
        
        // Scroll to bottom
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
    }
    
    promptWidgetCreation() {
        // Create form for widget creation
        const formElement = document.createElement('div');
        formElement.className = 'widget-creation-form';
        
        formElement.innerHTML = `
            <div class="form-group">
                <label for="widget-id">Widget ID (lowercase, no spaces):</label>
                <input type="text" id="widget-id" class="form-input" placeholder="e.g., clock">
            </div>
            <div class="form-group">
                <label for="widget-name">Widget Name:</label>
                <input type="text" id="widget-name" class="form-input" placeholder="e.g., Clock Widget">
            </div>
            <div class="form-group">
                <label for="widget-description">Description:</label>
                <textarea id="widget-description" class="form-textarea" placeholder="Describe what the widget should do..."></textarea>
            </div>
            <button class="create-widget-button">Create Widget</button>
        `;
        
        // Add to messages
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system-message';
        messageElement.appendChild(formElement);
        this.messagesElement.appendChild(messageElement);
        
        // Scroll to bottom
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;
        
        // Add event listener to the create button
        const createButton = formElement.querySelector('.create-widget-button');
        createButton.addEventListener('click', async () => {
            const widgetId = formElement.querySelector('#widget-id').value.trim();
            const widgetName = formElement.querySelector('#widget-name').value.trim();
            const widgetDescription = formElement.querySelector('#widget-description').value.trim();
            
            if (!widgetId || !widgetName || !widgetDescription) {
                this.addMessage('system', 'Please fill out all fields for the widget.');
                return;
            }
            
            // Disable form while creating
            createButton.disabled = true;
            createButton.textContent = 'Creating...';
            
            // Create the widget
            const result = await this.widgetManager.createNewWidget({
                id: widgetId,
                name: widgetName,
                description: widgetDescription
            });
            
            if (result.success) {
                this.addMessage('system', `Widget "${widgetName}" created successfully! It has been added to your dashboard.`);
                // Remove the form
                messageElement.remove();
            } else {
                this.addMessage('system', `Failed to create widget: ${result.error}`);
                // Re-enable form
                createButton.disabled = false;
                createButton.textContent = 'Create Widget';
            }
        });
    }
}