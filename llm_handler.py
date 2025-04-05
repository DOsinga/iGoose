import os
import json
from typing import Dict, Any, Optional
from pathlib import Path
import openai

class LLMHandler:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the LLM handler with an API key."""
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if self.api_key:
            openai.api_key = self.api_key
        
        # Load the widget base class from the actual file
        self.widget_base_template = self._load_widget_base_template()
        
    def _load_widget_base_template(self) -> str:
        """Load the WidgetBase class definition from the actual JavaScript file."""
        try:
            base_dir = Path(__file__).parent
            widget_base_path = base_dir / "static" / "js" / "widget-base.js"
            
            if not widget_base_path.exists():
                print(f"Warning: Widget base class file not found at {widget_base_path}")
                return "// WidgetBase class file not found"
            
            with open(widget_base_path, "r") as f:
                content = f.read()
            
            # Extract just the class definition (without the import)
            # This is a simple extraction - for a more robust approach, consider using a JS parser
            if "export class WidgetBase" in content:
                class_def = content.split("export class WidgetBase")[1]
                class_def = "class WidgetBase" + class_def
                
                # Remove the last closing brace to get just the class content
                if class_def.endswith("}"):
                    class_def = class_def[:-1].strip()
                
                return class_def
            else:
                print("Warning: Could not find WidgetBase class definition in file")
                return "// WidgetBase class definition not found in file"
        except Exception as e:
            print(f"Error loading widget base template: {e}")
            return "// Error loading WidgetBase class definition"
    
    async def generate_widget(self, widget_request: Dict[str, Any]) -> Dict[str, Any]:
        """Generate widget code based on the user's request."""
        try:
            # Extract parameters from the request
            widget_id = widget_request.get("id")
            widget_name = widget_request.get("name")
            widget_description = widget_request.get("description")
            
            # Generate the widget implementation using LLM
            response = await self._call_llm(widget_id, widget_name, widget_description)
            
            # Parse the generated code and create necessary files
            widget_code = self._extract_widget_code(response)
            
            return {
                "id": widget_id,
                "name": widget_name,
                "description": widget_description,
                "code": widget_code,
                "success": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _call_llm(self, widget_id: str, widget_name: str, widget_description: str) -> str:
        """Call the OpenAI API to generate the widget code."""
        prompt = f"""
You are a web component expert tasked with creating a "{widget_name}" widget.
Description: {widget_description}

The widget should be a custom element that extends the WidgetBase class which provides common widget functionality.
Here's the WidgetBase class implementation you should extend:

{self.widget_base_template}

Please create a complete web component implementation for this widget with the following requirements:
1. It should extend WidgetBase and be named {widget_id.capitalize()}Widget
2. It should be registered as a custom element named "{widget_id}-widget"
3. It must start with this import: `import {{ html, css, LitElement }} from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';`
4. It must also import the WidgetBase: `import {{ WidgetBase }} from '/js/widget-base.js';`
5. If it needs to access external APIs, use the fetchData method from the base class
6. Implement any specific functionality needed for this widget type
7. Keep styling consistent with the base widget but add widget-specific styles if needed
8. Only include code for this specific widget, don't include the WidgetBase code
9. Make sure to handle component lifecycle properly (connectedCallback, disconnectedCallback if needed)
10. End the file with `customElements.define('{widget_id}-widget', {widget_id.capitalize()}Widget);`

Important tips:
- The WidgetBase already provides dragging, styling, and positioning functionality
- Override the static styles getter to extend the base styles (use super.styles in an array)
- Follow the pattern shown in the base class for handling events
- The base widget has a slot for content in the widget-content area
- Remember to bind event handlers if you add any

Return only the JavaScript code with no explanations or additional text.
"""
        # Create an OpenAI client with the new API format
        client = openai.AsyncOpenAI(api_key=self.api_key)
        
        response = await client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates clean, efficient web component code."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=2000
        )
        
        return response.choices[0].message.content.strip()
    
    def _extract_widget_code(self, response: str) -> str:
        """Extract the widget code from the LLM response."""
        # Remove any markdown code blocks if present
        code = response
        if "```javascript" in response or "```js" in response:
            code = response.split("```")[1]
            if code.startswith("javascript") or code.startswith("js"):
                code = code[code.find("\n")+1:]
        
        return code