import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

/**
 * WidgetContainer - Base class for all widget containers.
 * Provides common functionality like dragging, positioning, and standard layout.
 */
export class WidgetContainer extends LitElement {
    static properties = {
        widgetId: { type: String },
        widgetType: { type: String },
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
        this.updatePosition();
    }
    
    updatePosition() {
        // Apply position
        this.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
        this.style.width = `${this.position.width}px`;
        this.style.height = `${this.position.height}px`;
    }
    
    setupDragging() {
        this._handleDragStart = this._handleDragStart.bind(this);
        this._handleDragMove = this._handleDragMove.bind(this);
        this._handleDragEnd = this._handleDragEnd.bind(this);
        
        // Find the header element and add the event listener to it
        this.updateComplete.then(() => {
            const header = this.shadowRoot.querySelector('.widget-header');
            if (header) {
                header.addEventListener('mousedown', this._handleDragStart);
            }
        });
    }
    
    _handleDragStart(e) {
        this.dragging = true;
        
        // Get initial positions
        const rect = this.getBoundingClientRect();
        
        // Calculate offset from the mouse position to the element's top-left corner
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store current position to avoid jumps
        this.initialPosition = {
            x: this.position.x,
            y: this.position.y
        };
        
        // Use this starting point for the drag calculation
        this.startPoint = {
            x: e.clientX,
            y: e.clientY
        };
        
        document.addEventListener('mousemove', this._handleDragMove);
        document.addEventListener('mouseup', this._handleDragEnd);
        e.preventDefault();
    }
    
    _handleDragMove(e) {
        if (this.dragging) {
            // Calculate movement delta from the starting point
            const deltaX = e.clientX - this.startPoint.x;
            const deltaY = e.clientY - this.startPoint.y;
            
            // Apply delta to the initial position
            const newX = this.initialPosition.x + deltaX;
            const newY = this.initialPosition.y + deltaY;
            
            // Update position object
            this.position = {
                ...this.position,
                x: newX,
                y: newY
            };
            
            // Apply transform
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
                        <button @click="${this._handleClose}" title="Remove">✖️</button>
                    </div>
                </div>
                <div class="widget-content">
                    ${this.renderWidgetContent()}
                </div>
            </div>
        `;
    }
    
    renderWidgetContent() {
        return html`<slot></slot>`;
    }
    
    _handleClose() {
        const event = new CustomEvent('widget-remove', {
            bubbles: true,
            composed: true,
            detail: { widgetId: this.widgetId, widgetType: this.widgetType }
        });
        this.dispatchEvent(event);
    }
}

/**
 * WidgetBase - Base class for actual widget implementations.
 * Widgets should extend this class and override renderWidgetContent.
 */
export class WidgetBase extends WidgetContainer {
    constructor() {
        super();
    }
    
    // Widget implementations should override this
    renderWidgetContent() {
        return html`
            <div>Widget content goes here</div>
        `;
    }
}