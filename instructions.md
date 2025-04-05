# LLM-Powered Widget System Design Document

## System Overview

We're creating a web-based widget system similar to iGoogle's gadgets, where an LLM can dynamically create and modify widgets based on user requests. The system will have a chat interface where users can request widget creation, modification, and management through natural language, with the LLM handling all code generation.

## Core Goals

1. Allow users to request widgets through natural language (e.g., "Create a clock widget")
2. Enable the LLM to generate and modify widget code on demand
3. Present widgets in a draggable dashboard interface
4. Provide a file-based storage system (no database required)
5. Ensure widgets can make API calls to external services
6. Enable widgets to be styled consistently yet independently

## Architecture Decisions

### 1. Web Components with Lit

We've chosen Web Components as the widget implementation technology because:
- They run natively in modern browsers without compilation
- They provide encapsulated styling through Shadow DOM
- They're framework-agnostic
- They're perfect for dynamic generation by an LLM

We're using Lit as a lightweight helper library to simplify Web Component creation while maintaining their native advantages.

### 2. File-Based Widget Storage

Each widget will be stored in its own directory:
```
widgets/
  ├── registry.json       # Global widget registry
  ├── clock/
  │   ├── manifest.json   # Widget metadata + position
  │   ├── widget.js       # Widget implementation
  │   └── assets/         # Widget-specific assets
  ├── weather/
  │   ├── manifest.json
  │   ├── widget.js
  │   └── assets/
```

The manifest.json should contain minimal information:

```json
{
  "id": "clock",
  "name": "Clock Widget",
  "description": "Displays current time and date",
  "version": "1.0.0",
  "position": {
    "x": 100, 
    "y": 200,
    "width": 300,
    "height": 200
  }
}
```

### 3. Python Backend with FastAPI

The backend will:
- Serve widget files
- Handle widget creation/modification/deletion
- Manage the widget registry
- Interface with the LLM to generate widget code

Required endpoints:
- GET /api/widgets - List all available widgets
- GET /api/widgets/{id} - Get specific widget details
- POST /api/widgets/{id}/position - Update widget position
- POST /api/llm/generate-widget - Generate a new widget using LLM
- PUT /api/widgets/{id} - Update an existing widget
- DELETE /api/widgets/{id} - Remove a widget

### 4. Inheritance-Based Widget Architecture

All widgets will inherit from a base WidgetBase class that provides:
- Draggable functionality
- Standard styling and layout
- Common widget methods and properties
- Position saving and loading

The WidgetBase class should handle:
- Position tracking (x, y, width, height)
- Dragging functionality
- Standard widget layout (header, content area)
- API for saving position to the server
- Utility methods for API calls

## Implementation Instructions

### 1. Project Structure Setup

Create the following directory structure:
```
project/
  ├── backend/
  │   ├── app.py           # FastAPI application
  │   ├── llm_handler.py   # LLM integration module
  │   └── requirements.txt
  ├── frontend/
  │   ├── index.html       # Main dashboard page
  │   ├── css/
  │   ├── js/
  │   │   ├── widget-base.js    # Base widget class
  │   │   └── widget-manager.js # Widget loading/management
  │   └── chat/            # Chat interface
  └── widgets/             # Widget storage directory
      └── registry.json    # Initial empty registry
```

### 2. Backend Implementation

Create a FastAPI application with the following capabilities:
- Static file serving for frontend assets and widget files
- JSON-based widget registration and management
- Position persistence for widgets
- Interface with an LLM via API to generate widget code
- Error handling for failed widget generation or loading

### 3. Frontend Implementation

Create the base widget class that:
- Extends LitElement from the Lit library
- Implements draggable functionality
- Provides standard widget styling
- Contains methods for API communication
- Handles position persistence

Implement a widget manager class that:
- Loads all widgets from the registry
- Creates widget instances in the DOM
- Handles communication with the backend
- Provides API for creating new widgets

Create a main dashboard page with:
- A container for widgets
- A chat interface for LLM interaction
- Basic styling for widgets and layout

### 4. LLM Integration

The LLM should be integrated with the following considerations:
- Provide the LLM with templates for widget creation
- Ensure the LLM understands the WidgetBase class API
- Validate generated code before saving and executing
- Allow the LLM to update existing widgets
- Provide feedback mechanisms for failed generation

### 5. Widget Examples

The system should support widgets such as:
- Clock widget (time display, configurable format)
- Weather widget (API integration with weather services)
- Todo list widget (local storage for tasks)
- GitHub issues widget (API integration with GitHub)
- News feed widget (RSS or API integration)
- Calculator widget (basic calculation functionality)

## Widget Development Guidelines

When creating new widgets, developers should:
1. Extend the WidgetBase class
2. Define widget-specific properties
3. Implement initialization and cleanup logic
4. Create the widget UI using Lit's template system
5. Register the custom element with a unique name
6. Utilize the base class methods for API calls and position
