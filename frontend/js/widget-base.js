import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

/**
 * Base class for all widgets in the system.
 * Provides common functionality like dragging, positioning, and standard layout.
 */
export class WidgetBase extends LitElement {
    static properties = {
        widgetId: { type: String },
        title: { type: String },
        position: { type: Object },
        dragging: { type: Boolean, state: true }
    };
    
    constructor() {
        super();
        this.dragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.position = { x: 0, y: 0, width: 300, height: 200 };
    }
    
    connectedCallback() {
        super.connectedCallback();
        this.setupDragging();
        
        // Apply initial position
        this.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
        this.style.width = `${this.position.width}px`;
        this.style.height = `${this.position.height}px`;
    }
    
    setupDragging() {
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragMove = this._handleDragMove.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
        this.addEventListener('mousedown', this._handleDragStart);
    }
    
    _handleDragStart(e) {
        // Only allow dragging from the header
        if (e.target.closest('.widget-header')) {
            this.dragging = true;
            const rect = this.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            document.addEventListener('mousemove', this._handleDragMove);
            document.addEventListener('mouseup', this._handleDragEnd);
            e.preventDefault();
        }
    }
    
    _handleDragMove(e) {
        if (this.dragging) {
            const newX = e.clientX - this.dragOffset.x;
            const newY = e.clientY - this.dragOffset.y;
            
            this.position = {
                ...this.position,
                x: newX,
                y: newY
            };
            
            this.style.transform = `translate(${newX}px, ${newY}px)`;
        }
    }
    
    _handleDragEnd() {
        if (this.dragging) {
            this.dragging = false;
            document.removeEventListener('mousemove', this._handleDragMove);
            document.removeEventListener('mouseup', this._handleDragEnd);
            
            this.savePosition();
        }
    }
    
    async savePosition() {
        try {
            const response = await fetch(`/api/widgets/${this.widgetId}/position`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.position)
            });
            
            if (!response.ok) {
                console.error('Failed to save widget position');
            }
        } catch (error) {
            console.error('Error saving widget position:', error);
        }
    }
    
    async fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }
    
    static get styles() {
        return css`
            :host {
                display: block;
                position: absolute;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                transition: box-shadow 0.3s ease;
            }
            
            :host(:hover) {
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }
            
            .widget-container {
                display: flex;
                flex-direction: column;
                height: 100%;
            }
            
            .widget-header {
                display: flex;
                align-items: center;
                padding: 10px 15px;
                background: #f5f5f5;
                border-bottom: 1px solid #eee;
                cursor: move;
                user-select: none;
            }
            
            .widget-title {
                flex: 1;
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #333;
            }
            
            .widget-content {
                flex: 1;
                padding: 15px;
                overflow: auto;
            }
            
            .widget-actions {
                display: flex;
                gap: 5px;
            }
            
            button {
                background: none;
                border: none;
                cursor: pointer;
                color: #555;
                padding: 5px;
                border-radius: 4px;
            }
            
            button:hover {
                background: #eee;
            }
        `;
    }
    
    render() {
        return html`
            <div class="widget-container">
                <div class="widget-header">
                    <h3 class="widget-title">${this.title}</h3>
                    <div class="widget-actions">
                        <button @click="${this._handleSettings}" title="Settings">⚙️</button>
                        <button @click="${this._handleClose}" title="Close">✖️</button>
                    </div>
                </div>
                <div class="widget-content">
                    <slot></slot>
                </div>
            </div>
        `;
    }
    
    _handleSettings() {
        // This should be implemented by child widgets if needed
        console.log('Settings clicked for', this.widgetId);
        const event = new CustomEvent('widget-settings', {
            bubbles: true,
            composed: true,
            detail: { widgetId: this.widgetId }
        });
        this.dispatchEvent(event);
    }
    
    _handleClose() {
        const event = new CustomEvent('widget-close', {
            bubbles: true,
            composed: true,
            detail: { widgetId: this.widgetId }
        });
        this.dispatchEvent(event);
    }
}