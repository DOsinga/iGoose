import { html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { WidgetBase } from '/js/widget-base.js';

class XkcdWidget extends WidgetBase {
    static properties = {
        ...WidgetBase.properties,
        comic: { type: Object, state: true },
        lastUpdated: { type: String, state: true },
        loading: { type: Boolean, state: true }
    };

    constructor() {
        super();
        this.widgetType = 'xkcd';
        this.title = 'Random XKCD';
        this.comic = null;
        this.lastUpdated = '';
        this.loading = true;
        this.updateInterval = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this.fetchRandomComic();
        this.updateInterval = setInterval(() => this.fetchRandomComic(), 60000);
    }

    disconnectedCallback() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        super.disconnectedCallback();
    }

    async fetchRandomComic() {
        this.loading = true;
        try {
            // First get the latest comic number
            const latestResponse = await fetch('https://xkcd.com/info.0.json');
            const latestData = await latestResponse.json();
            const maxNum = latestData.num;

            // Generate a random comic number
            const randomNum = Math.floor(Math.random() * maxNum) + 1;

            // Fetch the random comic
            const response = await fetch(`https://xkcd.com/${randomNum}/info.0.json`);
            this.comic = await response.json();
            this.lastUpdated = new Date().toLocaleTimeString();
        } catch (error) {
            console.error('Error fetching XKCD comic:', error);
            this.comic = null;
        } finally {
            this.loading = false;
        }
    }

    static get styles() {
        return [
            super.styles,
            css`
                .xkcd-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px;
                    overflow: hidden;
                }
                
                .comic-title {
                    font-weight: bold;
                    font-size: 1.2rem;
                    margin-bottom: 10px;
                    text-align: center;
                }
                
                .comic-image {
                    max-width: 100%;
                    height: auto;
                    margin-bottom: 10px;
                }
                
                .comic-alt {
                    font-style: italic;
                    font-size: 0.9rem;
                    color: #555;
                    margin-bottom: 10px;
                    text-align: center;
                }
                
                .comic-info {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    font-size: 0.8rem;
                    color: #777;
                }
                
                .loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 200px;
                }
                
                .loading:after {
                    content: " ";
                    display: block;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 6px solid #ddd;
                    border-color: #ddd transparent #ddd transparent;
                    animation: loader 1.2s linear infinite;
                }
                
                @keyframes loader {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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
                        <button @click="${this.fetchRandomComic}" title="Refresh">🔄</button>
                        <button @click="${this._handleSettings}" title="Settings">⚙️</button>
                        <button @click="${this._handleClose}" title="Close">✖️</button>
                    </div>
                </div>
                <div class="widget-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    renderContent() {
        if (this.loading) {
            return html`<div class="loading"></div>`;
        }

        if (!this.comic) {
            return html`<div>Failed to load comic. <button @click="${this.fetchRandomComic}">Try again</button></div>`;
        }

        return html`
            <div class="xkcd-container">
                <div class="comic-title">#${this.comic.num}: ${this.comic.title}</div>
                <img class="comic-image" src="${this.comic.img}" alt="${this.comic.alt}" title="${this.comic.alt}">
                <div class="comic-alt">${this.comic.alt}</div>
                <div class="comic-info">
                    <span>Published: ${this.comic.day}/${this.comic.month}/${this.comic.year}</span>
                    <span>Last updated: ${this.lastUpdated}</span>
                </div>
            </div>
        `;
    }
}

customElements.define('xkcd-widget', XkcdWidget);