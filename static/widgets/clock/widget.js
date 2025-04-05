import { html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { WidgetBase } from '/js/widget-base.js';

class ClockWidget extends WidgetBase {
    static properties = {
        ...WidgetBase.properties,
        currentTime: { type: String, state: true },
        currentDate: { type: String, state: true },
        format24h: { type: Boolean }
    };
    
    constructor() {
        super();
        this.widgetType = 'clock';
        this.title = 'Clock Widget';
        this.currentTime = '';
        this.currentDate = '';
        this.format24h = false;
        this.timerInterval = null;
    }
    
    connectedCallback() {
        super.connectedCallback();
        this.updateTime();
        this.timerInterval = setInterval(() => this.updateTime(), 1000);
    }
    
    disconnectedCallback() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        super.disconnectedCallback();
    }
    
    updateTime() {
        const now = new Date();
        
        // Format time
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        
        let timeString;
        if (this.format24h) {
            timeString = `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
        } else {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // Convert 0 to 12
            timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
        }
        
        // Format date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = now.toLocaleDateString(undefined, options);
        
        this.currentTime = timeString;
        this.currentDate = dateString;
    }
    
    static get styles() {
        return [
            super.styles,
            css`
                .clock-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                }
                
                .time {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 10px;
                    font-family: monospace;
                }
                
                .date {
                    font-size: 1rem;
                    color: #666;
                }
                
                .format-toggle {
                    margin-top: 15px;
                    display: flex;
                    align-items: center;
                    font-size: 0.9rem;
                }
                
                .format-toggle input {
                    margin-right: 8px;
                }
            `
        ];
    }
    
    renderWidgetContent() {
        return html`
            <div class="clock-container">
                <div class="time">${this.currentTime}</div>
                <div class="date">${this.currentDate}</div>
                <label class="format-toggle">
                    <input type="checkbox" ?checked=${this.format24h} @change=${this._toggleFormat}>
                    24-hour format
                </label>
            </div>
        `;
    }
    
    _toggleFormat(e) {
        this.format24h = e.target.checked;
        this.updateTime();
    }
}

customElements.define('clock-widget', ClockWidget);