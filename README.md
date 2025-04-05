# LLM-Powered Widget System

A web-based widget dashboard where an LLM can dynamically create and modify widgets based on user requests.

## Features

- Dynamic widget creation through natural language requests
- Draggable dashboard interface
- Web Component-based widget architecture using Lit
- Chat interface for interacting with the LLM
- File-based storage system for widgets
- Python FastAPI backend with LLM integration

## Getting Started

### Prerequisites

- Python 3.12 or higher
- OpenAI API key for LLM integration

### Installation

1. Clone this repository
2. Install dependencies using uv (recommended):

```bash
# Install uv if you don't have it
pip install uv

# Create and activate virtual environment
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -r requirements.in
```

3. Or install with pip:

```bash
pip install -r requirements.in
```

4. Set your OpenAI API key:

```bash
export OPENAI_API_KEY=your_api_key_here
```

### Running the Application

1. Start the server:

```bash
uvicorn app:app --reload
```

2. Open your browser and navigate to `http://localhost:8000`

## Usage

1. The dashboard shows all your existing widgets
2. Use the chat panel on the right to request new widgets or manage existing ones
3. Try commands like:
   - "Create a clock widget"
   - "List my widgets"
   - "Create a weather widget for New York"

## Creating New Widgets

Widgets are created through the LLM based on your natural language description. Each widget:

1. Extends the WidgetBase class
2. Is implemented as a Web Component using Lit
3. Has its own directory in the `static/widgets` folder
4. Can be dragged and positioned on the dashboard

## Project Structure

```
project/
  ├── app.py              # Main FastAPI application
  ├── llm_handler.py      # LLM integration
  ├── requirements.in     # Python dependencies
  ├── static/             # Static assets
  │   ├── index.html      # Main dashboard page
  │   ├── css/            # CSS styles
  │   ├── js/             # JavaScript modules
  │   ├── chat/           # Chat interface
  │   └── widgets/        # Widget storage
  │       ├── registry.json # Widget registry
  │       └── [widget-id]/  # Individual widget folders
```

## License

This project is licensed under the MIT License