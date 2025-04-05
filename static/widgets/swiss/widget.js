import { html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { WidgetBase } from '/js/widget-base.js';

class SwissClockWidget extends WidgetBase {
    static properties = {
        ...WidgetBase.properties,
        hours: { type: Number, state: true },
        minutes: { type: Number, state: true },
        seconds: { type: Number, state: true }
    };

    constructor() {
        super();
        this.widgetType = 'swiss-clock';
        this.title = 'Swiss Railway Clock';
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
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
        this.hours = now.getHours() % 12;
        this.minutes = now.getMinutes();
        this.seconds = now.getSeconds();
    }

    static get styles() {
        return [
            super.styles,
            css`
                .clock-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    padding: 10px;
                }
                
                .clock-face {
                    position: relative;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background-color: white;
                    border: 8px solid #161616;
                }
                
                .clock-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 12px;
                    height: 12px;
                    margin: -6px 0 0 -6px;
                    background-color: #161616;
                    border-radius: 50%;
                    z-index: 4;
                }
                
                .marker {
                    position: absolute;
                    width: 8px;
                    height: 2px;
                    background-color: #161616;
                    top: 50%;
                    left: 50%;
                    margin-top: -1px;
                    transform-origin: left center;
                }
                
                .marker.hour {
                    width: 12px;
                    height: 4px;
                    margin-top: -2px;
                }
                
                .hand {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform-origin: left center;
                }
                
                .hand.hour-hand {
                    width: 60px;
                    height: 6px;
                    margin-top: -3px;
                    background-color: #161616;
                    border-radius: 3px;
                    z-index: 1;
                }
                
                .hand.minute-hand {
                    width: 80px;
                    height: 6px;
                    margin-top: -3px;
                    background-color: #161616;
                    border-radius: 3px;
                    z-index: 2;
                }
                
                .hand.second-hand {
                    width: 90px;
                    height: 2px;
                    margin-top: -1px;
                    background-color: #ec0000;
                    z-index: 3;
                }
                
                .second-hand-counterweight {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: #ec0000;
                    top: 50%;
                    left: 50%;
                    margin: -10px 0 0 -10px;
                    z-index: 2;
                }
            `
        ];
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
                    ${this.renderClock()}
                </div>
            </div>
        `;
    }

    renderClock() {
        // Calculate hand angles
        const hourAngle = (this.hours * 30) + (this.minutes * 0.5);
        const minuteAngle = this.minutes * 6;
        const secondAngle = this.seconds * 6;

        return html`
            <div class="clock-container">
                <div class="clock-face">
                    ${this.renderMarkers()}
                    
                    <div class="hand hour-hand" 
                         style="transform: rotate(${hourAngle}deg)"></div>
                    
                    <div class="hand minute-hand" 
                         style="transform: rotate(${minuteAngle}deg)"></div>
                    
                    <div class="hand second-hand" 
                         style="transform: rotate(${secondAngle}deg)"></div>
                    
                    <div class="second-hand-counterweight"></div>
                    <div class="clock-center"></div>
                </div>
            </div>
        `;
    }

    renderMarkers() {
        const markers = [];

        // Create 60 minute markers
        for (let i = 0; i < 60; i++) {
            const isHour = i % 5 === 0;
            const angle = i * 6;

            markers.push(html`
                <div class="marker ${isHour ? 'hour' : ''}" 
                     style="transform: rotate(${angle}deg) translateX(90px)"></div>
            `);
        }

        return markers;
    }

    // Add Swiss Railway special effect - second hand stops for 1.5 seconds at the top
    _startSwissEffect() {
        // This would require a more complex animation approach
        // Typically implemented with CSS animations or requestAnimationFrame
        // For a simple approximation, we could modify the updateTime method
    }
}

customElements.define('swiss-clock-widget', SwissClockWidget);