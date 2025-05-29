// Dynamic tags system
function extractTagsWithCount() {
    const noteCards = document.querySelectorAll('.note-card');
    const tagCount = new Map();
    const categoryCount = new Map();
    
    noteCards.forEach(card => {
        // Count tags
        const tagsAttr = card.getAttribute('data-tags');
        if (tagsAttr) {
            const tags = tagsAttr.split(',').map(tag => tag.trim());
            tags.forEach(tag => {
                if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
            });
        }
        
        // Count categories
        const metaDiv = card.querySelector('.note-meta');
        if (metaDiv) {
            const metaText = metaDiv.textContent;
            const categoryMatch = metaText.split('•')[0].trim().toLowerCase();
            if (categoryMatch) {
                categoryCount.set(categoryMatch, (categoryCount.get(categoryMatch) || 0) + 1);
            }
        }
    });
    
    return { tagCount, categoryCount };
}

function getMostPopularTags(maxTags = 8) {
    const { tagCount, categoryCount } = extractTagsWithCount();
    
    // Sort by count (most popular first)
    const sortedTags = Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxTags)
        .map(([tag, count]) => tag);
    
    const sortedCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) // Limit categories too
        .map(([category, count]) => category);
    
    return {
        tags: sortedTags,
        categories: sortedCategories
    };
}

function generateLimitedTags() {
    const { tags, categories } = getMostPopularTags(6); // Show max 6 tags
    const filterContainer = document.querySelector('.filter-tags');
    
    if (!filterContainer) return;
    
    // Clear and add "All"
    filterContainer.innerHTML = '<button class="tag-btn active" data-tag="all">All</button>';
    
    // Add top categories
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.setAttribute('data-tag', category);
        btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        filterContainer.appendChild(btn);
    });
    
    // Add most popular tags
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.setAttribute('data-tag', tag);
        btn.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
        filterContainer.appendChild(btn);
    });
    
    addFilterEventListeners();
}

function generateCuratedTags() {
    const filterContainer = document.querySelector('.filter-tags');
    
    // Define which tags you want to show (curated list)
    const importantTags = [
        { tag: 'all', label: 'All' },
        { tag: 'security', label: 'Security' },
        { tag: 'devops', label: 'DevOps' },
        { tag: 'kubernetes', label: 'Kubernetes' },
        { tag: 'docker', label: 'Docker' },
        { tag: 'programming', label: 'Programming' },
        { tag: 'networking', label: 'Networking' }
    ];
    
    filterContainer.innerHTML = '';
    
    importantTags.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = index === 0 ? 'tag-btn active' : 'tag-btn';
        btn.setAttribute('data-tag', item.tag);
        btn.textContent = item.label;
        filterContainer.appendChild(btn);
    });
    
    addFilterEventListeners();
}

function addFilterEventListeners() {
    const tagButtons = document.querySelectorAll('.tag-btn');
    
    tagButtons.forEach(button => {
        button.addEventListener('click', function() {
            tagButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const selectedTag = this.getAttribute('data-tag');
            if (window.filterNotesByTag) {
                filterNotesByTag(selectedTag);
            }
        });
    });
}

// Initialize tags when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Option 1: Show most popular tags automatically
        // generateLimitedTags();
        
        // Option 2: Show only curated/important tags
        generateCuratedTags();
    }, 100);
});