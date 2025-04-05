/**
 * Widget Manager
 * Responsible for loading, creating, and managing widgets in the dashboard.
 */
export class WidgetManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.widgets = new Map();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for widget close events
        this.container.addEventListener('widget-close', (e) => {
            const widgetId = e.detail.widgetId;
            this.removeWidget(widgetId);
        });
        
        // Listen for widget settings events
        this.container.addEventListener('widget-settings', (e) => {
            const widgetId = e.detail.widgetId;
            console.log(`Settings requested for widget: ${widgetId}`);
            // In a full implementation, this would open a settings dialog
        });
    }
    
    async loadAllWidgets() {
        try {
            const response = await fetch('/api/widgets');
            if (!response.ok) {
                throw new Error(`Failed to load widgets: ${response.status}`);
            }
            
            const data = await response.json();
            const widgets = data.widgets || [];
            
            // Clear existing widgets
            this.clearWidgets();
            
            // Load each widget
            const loadPromises = widgets.map(widget => this.loadWidget(widget.id));
            await Promise.all(loadPromises);
            
            return widgets;
        } catch (error) {
            console.error('Error loading widgets:', error);
            return [];
        }
    }
    
    async loadWidget(widgetId) {
        try {
            // Fetch widget details
            const response = await fetch(`/api/widgets/${widgetId}`);
            if (!response.ok) {
                throw new Error(`Failed to load widget ${widgetId}: ${response.status}`);
            }
            
            const widgetData = await response.json();
            
            // Dynamically import the widget code
            try {
                // Create script element to load the widget
                const script = document.createElement('script');
                script.type = 'module';
                script.src = `/widgets/${widgetId}/widget.js`;
                document.head.appendChild(script);
                
                // Wait for the custom element to be defined
                const tagName = `${widgetId}-widget`;
                await this.waitForCustomElement(tagName);
                
                // Create and add the widget
                this.createWidget(widgetId, widgetData);
                
                return true;
            } catch (importError) {
                console.error(`Error importing widget ${widgetId}:`, importError);
                return false;
            }
        } catch (error) {
            console.error(`Error loading widget ${widgetId}:`, error);
            return false;
        }
    }
    
    waitForCustomElement(tagName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            // Check if already defined
            if (customElements.get(tagName)) {
                resolve();
                return;
            }
            
            // Set timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout waiting for custom element ${tagName}`));
            }, timeout);
            
            // Wait for definition
            window.addEventListener('DOMContentLoaded', () => {
                if (customElements.get(tagName)) {
                    clearTimeout(timeoutId);
                    resolve();
                }
            });
            
            // Also check after a small delay
            setTimeout(() => {
                if (customElements.get(tagName)) {
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 500);
        });
    }
    
    createWidget(widgetId, widgetData) {
        // Check if widget is already created
        if (this.widgets.has(widgetId)) {
            console.warn(`Widget ${widgetId} already exists`);
            return;
        }
        
        // Create the widget element
        const tagName = `${widgetId}-widget`;
        const widgetElement = document.createElement(tagName);
        
        // Set widget properties
        widgetElement.widgetId = widgetId;
        widgetElement.title = widgetData.name;
        widgetElement.position = widgetData.position || { x: 100, y: 100, width: 300, height: 200 };
        
        // Add to container and track
        this.container.appendChild(widgetElement);
        this.widgets.set(widgetId, widgetElement);
        
        return widgetElement;
    }
    
    removeWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            // Remove from DOM
            widget.remove();
            
            // Remove from tracking
            this.widgets.delete(widgetId);
            
            // Make API call to delete widget
            fetch(`/api/widgets/${widgetId}`, {
                method: 'DELETE'
            }).catch(error => {
                console.error(`Error deleting widget ${widgetId}:`, error);
            });
        }
    }
    
    clearWidgets() {
        // Remove all widgets from DOM
        this.widgets.forEach(widget => widget.remove());
        
        // Clear tracking map
        this.widgets.clear();
    }
    
    async createNewWidget(widgetData) {
        try {
            const response = await fetch('/api/llm/generate-widget', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(widgetData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to create widget: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Load the newly created widget
            await this.loadWidget(widgetData.id);
            
            return { success: true, widget: result.widget };
        } catch (error) {
            console.error('Error creating widget:', error);
            return { success: false, error: error.message };
        }
    }
}