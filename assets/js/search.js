// Search and filter functionality
function filterNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const activeTagBtn = document.querySelector('.tag-btn.active');
    const activeTag = activeTagBtn ? activeTagBtn.dataset.tag : 'all';
    const noteCards = document.querySelectorAll('.note-card');
    
    noteCards.forEach(card => {
        const content = card.textContent.toLowerCase();
        const tags = card.dataset.tags || '';
        const metaDiv = card.querySelector('.note-meta');
        const category = metaDiv ? metaDiv.textContent.split('•')[0].trim().toLowerCase() : '';
        
        const matchesSearch = content.includes(searchTerm);
        const matchesTag = activeTag === 'all' || 
                          tags.includes(activeTag) || 
                          category === activeTag;
        
        if (matchesSearch && matchesTag) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filter notes by tag only
function filterNotesByTag(selectedTag) {
    const noteCards = document.querySelectorAll('.note-card');
    
    noteCards.forEach(card => {
        if (selectedTag === 'all') {
            card.style.display = 'block';
        } else {
            const cardTags = card.getAttribute('data-tags') || '';
            const cardMeta = card.querySelector('.note-meta');
            const cardCategory = cardMeta ? cardMeta.textContent.split('•')[0].trim().toLowerCase() : '';
            
            if (cardTags.includes(selectedTag) || cardCategory === selectedTag) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// Initialize search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterNotes);
    }
});