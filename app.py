import os
import json
import shutil
from typing import Dict, List, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Body, Depends, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import openai

from llm_handler import LLMHandler

# Initialize FastAPI app
app = FastAPI(title="LLM Widget System")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set OpenAI API key
api_key = os.environ.get("OPENAI_API_KEY", "")

# Initialize the LLM handler with the API key
llm_handler = LLMHandler(api_key=api_key)

# Set OpenAI API key for direct usage
openai.api_key = api_key

# Define paths
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
WIDGETS_DIR = STATIC_DIR / "widgets"

# Ensure widget directory exists
WIDGETS_DIR.mkdir(exist_ok=True)

# Define registry path
REGISTRY_PATH = WIDGETS_DIR / "registry.json"

# Initialize registry if it doesn't exist
if not REGISTRY_PATH.exists():
    with open(REGISTRY_PATH, "w") as f:
        json.dump({
            "widgetTypes": [],
            "widgets": []
        }, f)

# Function to load the widget registry
def get_registry() -> Dict[str, List[Dict[str, Any]]]:
    """Load the widget registry from the JSON file."""
    with open(REGISTRY_PATH, "r") as f:
        return json.load(f)

# Function to save the widget registry
def save_registry(registry: Dict[str, List[Dict[str, Any]]]) -> None:
    """Save the widget registry to the JSON file."""
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)

# Function to get a specific widget from the registry
def get_widget_from_registry(widget_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific widget from the registry by ID."""
    registry = get_registry()
    for widget in registry.get("widgets", []):
        if widget.get("id") == widget_id:
            return widget
    return None

# Mount static files
app.mount("/js", StaticFiles(directory=STATIC_DIR / "js"), name="js")
app.mount("/css", StaticFiles(directory=STATIC_DIR / "css"), name="css")
app.mount("/chat", StaticFiles(directory=STATIC_DIR / "chat"), name="chat")
app.mount("/widgets", StaticFiles(directory=WIDGETS_DIR), name="widgets")

# Root endpoint - serve the main HTML page
@app.get("/")
async def read_root():
    return FileResponse(STATIC_DIR / "index.html")

# API endpoints
@app.get("/api/widgets")
async def list_widgets():
    """Get the registry of widget instances."""
    registry = get_registry()
    return registry

@app.post("/api/widgets")
async def add_widget_instance(request: Dict[str, Any] = Body(...)):
    """Add a new widget instance to the registry."""
    widget = request.get("widget")
    if not widget or "id" not in widget or "type" not in widget:
        raise HTTPException(
            status_code=400,
            detail="Required fields missing: widget with id and type are required"
        )
    
    # Update registry
    registry = get_registry()
    registry["widgets"].append(widget)
    save_registry(registry)
    
    return {"success": True, "widget": widget}

@app.put("/api/widgets")
async def update_registry(request: Dict[str, Any] = Body(...)):
    """Update the entire widget registry."""
    if "widgets" not in request:
        raise HTTPException(
            status_code=400,
            detail="Required field missing: widgets"
        )
    
    # Save the new registry
    save_registry(request)
    
    return {"success": True}

@app.get("/api/widgets/{widget_id}")
async def get_widget_instance(widget_id: str):
    """Get details about a specific widget instance."""
    widget = get_widget_from_registry(widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail=f"Widget instance {widget_id} not found")
    
    return widget

@app.post("/api/widgets/{widget_id}/position")
async def update_widget_position(widget_id: str, position: Dict[str, Any] = Body(...)):
    """Update the position of a widget."""
    widget = get_widget_from_registry(widget_id)
    if not widget:
        raise HTTPException(status_code=404, detail=f"Widget {widget_id} not found")
    
    # Update position in the registry
    registry = get_registry()
    for widget_in_registry in registry["widgets"]:
        if widget_in_registry["id"] == widget_id:
            widget_in_registry["position"] = position
            break
    
    # Save the updated registry
    save_registry(registry)
    
    return {"success": True, "message": f"Position updated for widget {widget_id}"}

@app.get("/api/widget-types")
async def list_widget_types():
    """Get all available widget types."""
    registry = get_registry()
    
    # Scan the widgets directory for additional types
    widget_types = registry.get("widgetTypes", [])
    widget_type_ids = {wt["id"] for wt in widget_types}
    
    # Look for widget directories and add them if not in registry
    for item in WIDGETS_DIR.iterdir():
        if item.is_dir() and item.name not in widget_type_ids:
            manifest_path = item.joinpath("manifest.json")
            if manifest_path.exists():
                try:
                    with open(manifest_path, "r") as f:
                        manifest = json.load(f)
                    
                    if "id" in manifest and "name" in manifest:
                        widget_types.append({
                            "id": manifest["id"],
                            "name": manifest["name"],
                            "description": manifest.get("description", "")
                        })
                except Exception as e:
                    print(f"Error loading manifest for {item.name}: {e}")
    
    return {"widgetTypes": widget_types}

@app.get("/api/widget-types/{widget_type}")
async def get_widget_type(widget_type: str):
    """Get details about a specific widget type."""
    registry = get_registry()
    
    # Find in registry first
    for widget_type_data in registry.get("widgetTypes", []):
        if widget_type_data.get("id") == widget_type:
            return widget_type_data
    
    # If not in registry, try to load manifest
    widget_dir = WIDGETS_DIR / widget_type
    manifest_path = widget_dir / "manifest.json"
    
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        return manifest
    
    raise HTTPException(status_code=404, detail=f"Widget type {widget_type} not found")

@app.post("/api/llm/generate-widget")
async def generate_widget(request: Dict[str, Any] = Body(...)):
    """Generate a new widget using LLM."""
    if "id" not in request or "name" not in request or "description" not in request:
        raise HTTPException(
            status_code=400,
            detail="Required fields missing: id, name, and description are required"
        )
    
    widget_id = request["id"]
    
    # Check if widget type already exists
    registry = get_registry()
    for widget_type in registry.get("widgetTypes", []):
        if widget_type["id"] == widget_id:
            raise HTTPException(
                status_code=400,
                detail=f"Widget type '{widget_id}' already exists"
            )
    
    # Generate the widget code
    result = await llm_handler.generate_widget(request)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Create widget directory
    widget_dir = WIDGETS_DIR / widget_id
    widget_dir.mkdir(exist_ok=True)
    
    # Create assets directory
    assets_dir = widget_dir / "assets"
    assets_dir.mkdir(exist_ok=True)
    
    # Create the widget.js file
    widget_js_path = widget_dir / "widget.js"
    with open(widget_js_path, "w") as f:
        f.write(result["code"])
    
    # Create the manifest.json file
    manifest = {
        "id": widget_id,
        "name": request["name"],
        "description": request["description"],
        "version": "1.0.0",
        "icon": "🔌"  # Default icon
    }
    
    manifest_path = widget_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    
    # Add to registry widget types
    registry["widgetTypes"].append({
        "id": widget_id,
        "name": request["name"],
        "description": request["description"]
    })
    save_registry(registry)
    
    return {
        "success": True,
        "widget": manifest,
        "message": f"Widget '{request['name']}' created successfully"
    }

@app.delete("/api/widgets/{widget_id}")
async def delete_widget(widget_id: str):
    """Remove a widget instance from the registry."""
    registry = get_registry()
    original_count = len(registry["widgets"])
    
    # Filter out the widget with matching ID
    registry["widgets"] = [w for w in registry["widgets"] if w.get("id") != widget_id]
    
    if len(registry["widgets"]) == original_count:
        raise HTTPException(status_code=404, detail=f"Widget {widget_id} not found")
    
    # Save the updated registry
    save_registry(registry)
    
    return {"success": True, "message": f"Widget {widget_id} removed from registry"}

@app.post("/api/chat")
async def chat_with_llm(request: Dict[str, Any] = Body(...)):
    """Chat with the LLM for widget management."""
    message = request.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="No message provided")
    
    try:
        # Get the current system state
        registry = get_registry()
        widget_instances = registry.get("widgets", [])
        widget_types = registry.get("widgetTypes", [])
        
        # Create context for the LLM
        context = f"""
Current system state:
- Available widget types: {', '.join([wt['id'] for wt in widget_types]) if widget_types else 'None'}
- Active widget instances: {len(widget_instances)}
"""
        
        # Call the OpenAI API directly with the new client format (1.0.0+)
        client = openai.AsyncOpenAI(api_key=openai.api_key)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"""You are a helpful assistant managing a widget dashboard. 
You help users create, customize, and manage widgets.

{context}

Your responses should be helpful, concise and informative."""},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=300
        )
        
        # Extract the response message
        reply = response.choices[0].message.content.strip()
        
        # For now, just return the LLM response with no widgets to reload
        return {
            "reply": reply,
            "reloadWidgets": []
        }
    except Exception as e:
        print(f"Error communicating with LLM: {e}")
        return {
            "reply": "I apologize, but I'm having trouble processing your request right now. Please try again later.",
            "reloadWidgets": []
        }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)