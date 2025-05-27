#!/usr/bin/env python3
"""
Convert markdown notes to separate HTML pages with navigation
Usage: python convert_notes.py
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path

def parse_markdown_file(file_path):
    """Parse a markdown file and extract metadata and content"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract title (first # heading)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else Path(file_path).stem.replace('-', ' ').title()
    
    # Extract tags (look for tags: line)
    tags_match = re.search(r'^tags:\s*(.+)$', content, re.MULTILINE)
    tags = []
    if tags_match:
        tags = [tag.strip() for tag in tags_match.group(1).split(',')]
    
    # Extract category (look for category: line)
    category_match = re.search(r'^category:\s*(.+)$', content, re.MULTILINE)
    category = category_match.group(1).strip() if category_match else "General"
    
    # Remove metadata lines from content
    content = re.sub(r'^(title|tags|category):\s*.+$', '', content, flags=re.MULTILINE)
    content = content.strip()
    
    # Convert markdown to HTML
    html_content = markdown_to_html(content)
    
    # Create preview (first paragraph or first 200 chars)
    preview = create_preview(content)
    
    return {
        'title': title,
        'category': category,
        'tags': tags,
        'content': html_content,
        'preview': preview,
        'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%B %d, %Y'),
        'filename': Path(file_path).stem
    }

def create_preview(markdown_text):
    """Create a clean preview from markdown content"""
    text = markdown_text
    
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]+`', '', text)
    
    # Remove headers
    text = re.sub(r'^#+\s+.*$', '', text, flags=re.MULTILINE)
    
    # Remove markdown formatting
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'^[-*+]\s+', '', text, flags=re.MULTILINE)
    
    # Clean whitespace
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Take first sentence or 150 chars
    sentences = text.split('.')
    if sentences and len(sentences[0]) > 30:
        preview = sentences[0].strip() + '.'
        if len(preview) > 150:
            preview = preview[:147] + '...'
    else:
        preview = text[:150] + '...' if len(text) > 150 else text
    
    return preview if preview else "Click to read more..."

def markdown_to_html(markdown_text):
    """Convert basic markdown to HTML"""
    html = markdown_text
    
    # Headers
    html = re.sub(r'^### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    
    # Bold and italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code>\2</code></pre>', html, flags=re.DOTALL)
    html = re.sub(r'`(.+?)`', r'<code>\1</code>', html)
    
    # Lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'(<li>.*</li>)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    html = re.sub(r'</ul>\s*<ul>', '', html)
    
    # Paragraphs
    paragraphs = html.split('\n\n')
    html_paragraphs = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<'):
            p = f'<p>{p}</p>'
        if p:
            html_paragraphs.append(p)
    
    return '\n'.join(html_paragraphs)

def generate_note_page_html(note_data):
    """Generate a complete HTML page for a note"""
    tags_html = ''.join([f'<span class="tag">{tag}</span>' for tag in note_data['tags']])
    
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{note_data['title']} - Alex Susanu</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Georgia', serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 30px rgba(0,0,0,0.1);
        }}
        
        .header {{
            background: linear-gradient(135deg, #4a90e2, #357abd);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .back-nav {{
            background: #f8f9ff;
            padding: 15px 30px;
            border-bottom: 2px solid #e8f0ff;
        }}
        
        .back-btn {{
            background: #4a90e2;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s ease;
        }}
        
        .back-btn:hover {{
            background: #357abd;
        }}
        
        .content {{
            padding: 40px 30px;
        }}
        
        .note-meta {{
            color: #666;
            font-style: italic;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e8f0ff;
        }}
        
        .note-tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 30px;
        }}
        
        .tag {{
            background: #e8f0ff;
            color: #4a90e2;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: bold;
        }}
        
        .note-content h2 {{
            color: #4a90e2;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e8f0ff;
            padding-bottom: 8px;
        }}
        
        .note-content h3 {{
            color: #4a90e2;
            margin-top: 25px;
            margin-bottom: 12px;
        }}
        
        .note-content h4 {{
            color: #333;
            margin-top: 20px;
            margin-bottom: 10px;
        }}
        
        .note-content p {{
            margin-bottom: 15px;
            text-align: justify;
        }}
        
        .note-content ul {{
            margin: 15px 0;
            padding-left: 25px;
        }}
        
        .note-content li {{
            margin-bottom: 8px;
        }}
        
        .note-content pre {{
            background: #f8f9ff;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border-left: 4px solid #4a90e2;
        }}
        
        .note-content code {{
            background: #f8f9ff;
            padding: 3px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }}
        
        .note-content pre code {{
            background: none;
            padding: 0;
        }}
        
        .footer {{
            background: #f8f9ff;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            border-top: 2px solid #e8f0ff;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{note_data['title']}</h1>
        </div>
        
        <div class="back-nav">
            <a href="../index.html" class="back-btn">← Back to Knowledge Base</a>
        </div>
        
        <div class="content">
            <div class="note-meta">
                {note_data['category']} • Updated {note_data['modified']}
            </div>
            
            <div class="note-tags">
                {tags_html}
            </div>
            
            <div class="note-content">
                {note_data['content']}
            </div>
        </div>
        
        <div class="footer">
            <p><a href="../index.html">← Back to Alex Susanu's Knowledge Base</a></p>
        </div>
    </div>
</body>
</html>'''

def generate_note_card_html(note_data):
    """Generate HTML for a note card that links to separate page"""
    tags_data = ','.join(note_data['tags']).lower()
    tags_html = ''.join([f'<span class="tag">{tag}</span>' for tag in note_data['tags']])
    
    return f'''
    <div class="note-card" data-tags="{tags_data}" onclick="window.location.href='notes/{note_data['filename']}.html'">
        <h3>{note_data['title']}</h3>
        <div class="note-meta">{note_data['category']} • {note_data['modified']}</div>
        <div class="note-preview">
            <p>{note_data['preview']}</p>
        </div>
        <div class="note-tags">
            {tags_html}
        </div>
    </div>'''

def update_index_html(notes_html):
    """Update index.html with new note cards"""
    with open('index.html', 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Find the notes container
    start_marker = '<div class="notes-grid" id="notesContainer">'
    
    start_index = html_content.find(start_marker)
    if start_index == -1:
        print("Error: Could not find notes-grid container in index.html")
        return False
    
    # Find the end of the notes section
    search_start = start_index + len(start_marker)
    
    patterns_to_try = [
        '</div>\n                \n                <!-- Note Full View Modal -->',
        '</div>\n                \n                <div class="note-modal"',
        '</div>\n            </div>\n        \n        <div class="footer">',
        '</div>\n            </div>',
    ]
    
    end_index = -1
    end_marker = ""
    
    for pattern in patterns_to_try:
        end_index = html_content.find(pattern, search_start)
        if end_index != -1:
            end_marker = pattern
            break
    
    if end_index == -1:
        remaining_html = html_content[search_start:]
        footer_match = remaining_html.find('<div class="footer">')
        modal_match = remaining_html.find('<!-- Note Full View Modal -->')
        
        if modal_match != -1:
            end_index = search_start + modal_match
            temp_html = html_content[:end_index]
            last_div = temp_html.rfind('</div>')
            if last_div != -1:
                end_index = last_div
            end_marker = '</div>'
        elif footer_match != -1:
            end_index = search_start + footer_match
            temp_html = html_content[:end_index]
            content_close = temp_html.rfind('</div>\n        </div>')
            if content_close != -1:
                end_index = content_close
            end_marker = '</div>'
        else:
            print("Error: Could not find end of notes section")
            return False
    
    print(f"Found notes container from position {start_index} to {end_index}")
    
    new_content = (
        html_content[:start_index + len(start_marker)] +
        '\n' + notes_html + '\n                ' +
        html_content[end_index:]
    )
    
    # Backup original
    with open('index.html.backup', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # Write new content
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    """Main function to process all markdown files"""
    notes_dir = Path('notes')
    notes_output_dir = Path('notes')
    
    if not notes_dir.exists():
        print("Creating 'notes' directory...")
        notes_dir.mkdir()
        print("Add your .md files to the 'notes' directory and run again!")
        return
    
    # Find all markdown files recursively
    markdown_files = list(notes_dir.rglob('*.md'))
    
    if not markdown_files:
        print("No .md files found in 'notes' directory or subdirectories!")
        print("Add some markdown files and try again.")
        return
    
    print(f"Found {len(markdown_files)} markdown files...")
    
    all_notes = []
    for md_file in markdown_files:
        print(f"Processing {md_file}...")
        note_data = parse_markdown_file(md_file)
        
        # Create relative path for subfolder structure
        relative_path = md_file.relative_to(notes_dir)
        subfolder = relative_path.parent if relative_path.parent != Path('.') else None
        
        # Update filename to include subfolder path
        if subfolder:
            note_data['filename'] = str(relative_path.with_suffix('')).replace('/', '-').replace('\\', '-')
            note_data['category'] = f"{note_data['category']} ({subfolder})"
        
        all_notes.append(note_data)
        
        # Generate separate HTML page for this note
        note_html = generate_note_page_html(note_data)
        output_file = notes_output_dir / f"{note_data['filename']}.html"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(note_html)
        
        print(f"  → Created {output_file}")
    
    # Generate HTML for note cards on main page
    notes_cards_html = ''.join([generate_note_card_html(note) for note in all_notes])
    
    # Update index.html
    if update_index_html(notes_cards_html):
        print(f"✅ Successfully created {len(all_notes)} separate note pages!")
        print(f"✅ Updated index.html with note cards")
        print("📝 Original index.html backed up as index.html.backup")
        
        # Show folder structure
        print("\n📁 Processed files from:")
        folders = set()
        for md_file in markdown_files:
            folder = md_file.parent.relative_to(notes_dir)
            if folder != Path('.'):
                folders.add(str(folder))
        
        if folders:
            for folder in sorted(folders):
                print(f"  - notes/{folder}/")
        else:
            print("  - notes/ (root)")
            
    else:
        print("❌ Failed to update index.html")

if __name__ == "__main__":
    main()