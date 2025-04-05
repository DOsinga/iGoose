/**
 * Widget Manager
 * Responsible for loading, creating, and managing widgets in the dashboard.
 */
export class WidgetManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.widgets = new Map();
        this.availableWidgetTypes = new Set();
        this.registry = { widgets: [] };
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for widget remove events
        this.container.addEventListener('widget-remove', (e) => {
            const widgetId = e.detail.widgetId;
            const widgetType = e.detail.widgetType;
            this.removeWidgetInstance(widgetId);
        });
        
        // Listen for widget reload events from chat
        document.addEventListener('widgets-reload', (e) => {
            const widgetIds = e.detail.widgetIds;
            if (widgetIds && widgetIds.length > 0) {
                // Reload the specified widgets
                widgetIds.forEach(id => this.reloadWidget(id));
            } else {
                // If no specific widgets, reload all
                this.loadAllWidgets();
            }
        });
    }
    
    // Method to reload a specific widget
    async reloadWidget(widgetId) {
        // Remove widget if it exists
        if (this.widgets.has(widgetId)) {
            const widget = this.widgets.get(widgetId);
            widget.remove();
            this.widgets.delete(widgetId);
        }
        
        try {
            // Get updated widget data
            const response = await fetch(`/api/widgets/${widgetId}`);
            if (!response.ok) {
                throw new Error(`Failed to load widget ${widgetId}: ${response.status}`);
            }
            
            const widgetData = await response.json();
            
            // Create the widget with updated data
            await this.createWidgetInstance(widgetData);
            return true;
        } catch (error) {
            console.error(`Error reloading widget ${widgetId}:`, error);
            return false;
        }
    }
    
    async loadAllWidgets() {
        try {
            // Load the registry
            const response = await fetch('/api/widgets');
            if (!response.ok) {
                throw new Error(`Failed to load widgets: ${response.status}`);
            }
            
            const data = await response.json();
            this.registry = data;
            
            // Clear existing widgets
            this.clearWidgets();
            
            // Load widget definitions
            await this.loadWidgetDefinitions();
            
            // Create widget instances from registry
            if (this.registry && this.registry.widgets) {
                for (const widgetInstance of this.registry.widgets) {
                    await this.createWidgetInstance(widgetInstance);
                }
            }
            
            return this.registry.widgets || [];
        } catch (error) {
            console.error('Error loading widgets:', error);
            return [];
        }
    }
    
    async loadWidgetDefinitions() {
        try {
            // Fetch available widget types
            const response = await fetch('/api/widget-types');
            if (!response.ok) {
                throw new Error(`Failed to load widget types: ${response.status}`);
            }
            
            const data = await response.json();
            const widgetTypes = data.widgetTypes || [];
            
            // Track available widget types
            this.availableWidgetTypes = new Set(widgetTypes.map(wt => wt.id));
            
            // Load each widget definition
            const loadPromises = widgetTypes.map(wt => this.loadWidgetDefinition(wt.id));
            await Promise.all(loadPromises);
            
            return widgetTypes;
        } catch (error) {
            console.error('Error loading widget definitions:', error);
            return [];
        }
    }
    
    async loadWidgetDefinition(widgetType) {
        try {
            // Create script element to load the widget
            const script = document.createElement('script');
            script.type = 'module';
            script.src = `/widgets/${widgetType}/widget.js`;
            document.head.appendChild(script);
            
            // Wait for the custom element to be defined
            const tagName = `${widgetType}-widget`;
            await this.waitForCustomElement(tagName);
            
            return true;
        } catch (error) {
            console.error(`Error loading widget definition ${widgetType}:`, error);
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
            
            // Observer for custom element definition
            const observer = new MutationObserver(() => {
                if (customElements.get(tagName)) {
                    clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve();
                }
            });
            
            // Observe document for changes
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            
            // Also check after a small delay
            setTimeout(() => {
                if (customElements.get(tagName)) {
                    clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve();
                }
            }, 500);
        });
    }
    
    async createWidgetInstance(widgetInstance) {
        // Check if widget is already created
        if (this.widgets.has(widgetInstance.id)) {
            console.warn(`Widget ${widgetInstance.id} already exists`);
            return null;
        }
        
        // Check if widget type is available
        if (!this.availableWidgetTypes.has(widgetInstance.type)) {
            console.error(`Widget type ${widgetInstance.type} is not available`);
            return null;
        }
        
        // Create the widget element
        const tagName = `${widgetInstance.type}-widget`;
        const widgetElement = document.createElement(tagName);
        
        // Set widget properties
        widgetElement.widgetId = widgetInstance.id;
        widgetElement.widgetType = widgetInstance.type;
        widgetElement.title = widgetInstance.name;
        widgetElement.position = widgetInstance.position || { 
            x: 100 + (Math.random() * 100), 
            y: 100 + (Math.random() * 100), 
            width: 300, 
            height: 200 
        };
        
        // Add to container and track
        this.container.appendChild(widgetElement);
        this.widgets.set(widgetInstance.id, widgetElement);
        
        return widgetElement;
    }
    
    async addWidgetInstance(widgetType) {
        // Generate a unique ID
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        const widgetId = `${widgetType}_${timestamp}_${randomNum}`;
        
        try {
            // Fetch widget details (manifest)
            const response = await fetch(`/api/widget-types/${widgetType}`);
            if (!response.ok) {
                throw new Error(`Failed to load widget type ${widgetType}: ${response.status}`);
            }
            
            const widgetTypeData = await response.json();
            
            // Create widget instance record
            const widgetInstance = {
                id: widgetId,
                type: widgetType,
                name: widgetTypeData.name,
                position: {
                    x: 100 + (Math.random() * 100),
                    y: 100 + (Math.random() * 100),
                    width: 300,
                    height: 200
                }
            };
            
            // Add to registry
            this.registry.widgets.push(widgetInstance);
            
            // Save to server
            const saveResponse = await fetch('/api/widgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    widget: widgetInstance
                })
            });
            
            if (!saveResponse.ok) {
                throw new Error(`Failed to save widget instance: ${saveResponse.status}`);
            }
            
            // Create widget instance in UI
            const widgetElement = await this.createWidgetInstance(widgetInstance);
            
            return { success: true, widget: widgetInstance };
        } catch (error) {
            console.error(`Error adding widget instance:`, error);
            return { success: false, error: error.message };
        }
    }
    
    removeWidgetInstance(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (widget) {
            // Remove from DOM
            widget.remove();
            
            // Remove from tracking
            this.widgets.delete(widgetId);
            
            // Remove from registry
            this.registry.widgets = this.registry.widgets.filter(w => w.id !== widgetId);
            
            // Update registry on server
            fetch('/api/widgets', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.registry)
            }).catch(error => {
                console.error(`Error updating registry:`, error);
            });
        }
    }
    
    clearWidgets() {
        // Remove all widgets from DOM
        this.widgets.forEach(widget => widget.remove());
        
        // Clear tracking map
        this.widgets.clear();
    }
    
    // Method to get all available widget types
    getAvailableWidgetTypes() {
        return Array.from(this.availableWidgetTypes);
    }
}