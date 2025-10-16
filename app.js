document.addEventListener('DOMContentLoaded', () => {
    const dbName = 'JournalDB';
    const storeName = 'entries';
    let db;
    let currentFilter = { type: 'all', value: '' }; // type can be 'all', 'search', or 'tag'

    // UI Elements
    const entriesList = document.getElementById('entries-list');
    const searchInput = document.getElementById('search-input');
    const tagsList = document.getElementById('tags-list');
    const entryIdInput = document.getElementById('entry-id');
    const entryTitleInput = document.getElementById('entry-title');
    const entryContentInput = document.getElementById('entry-content');
    const entryTagsInput = document.getElementById('entry-tags');
    const newEntryBtn = document.getElementById('new-entry');
    const saveEntryBtn = document.getElementById('save-entry');
    const deleteEntryBtn = document.getElementById('delete-entry');
    const feedbackEl = document.getElementById('feedback');

    // --- Database Functions ---
    async function initDB() {
        db = await idb.openDB(dbName, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('tags', 'tags', { multiEntry: true });
                }
            },
        });
        console.log('Database initialized.');
        loadEntries();
        renderTagsList();
    }

    async function loadEntries() {
        if (!db) return;
        let allEntries = await db.getAll(storeName);
        let entriesToRender = allEntries;

        // Apply filters based on the current state
        if (currentFilter.type === 'search' && currentFilter.value) {
            const lowerCaseFilter = currentFilter.value.toLowerCase().trim();
            entriesToRender = allEntries.filter(entry =>
                entry.title.toLowerCase().includes(lowerCaseFilter) ||
                entry.content.toLowerCase().includes(lowerCaseFilter)
            );
        } else if (currentFilter.type === 'tag' && currentFilter.value) {
            const tagToFilter = currentFilter.value;
            entriesToRender = allEntries.filter(entry => entry.tags && entry.tags.includes(tagToFilter));
        }

        entriesToRender.sort((a, b) => b.timestamp - a.timestamp);
        renderEntriesList(entriesToRender);
    }

    async function loadEntry(id) {
        if (!db) return;
        const entry = await db.get(storeName, id);
        if (entry) {
            entryIdInput.value = entry.id;
            entryTitleInput.value = entry.title;
            entryContentInput.value = entry.content;
            entryTagsInput.value = entry.tags ? entry.tags.join(', ') : '';
            setActiveEntry(id);
        }
    }

    async function saveEntry() {
        const id = parseInt(entryIdInput.value, 10);
        const title = entryTitleInput.value.trim();
        const content = entryContentInput.value.trim();
        const tags = entryTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const timestamp = new Date().getTime();

        if (!title || !content) {
            showFeedback('Title and content cannot be empty.', 'error');
            return;
        }

        const entry = { title, content, timestamp, tags };

        if (id) {
            // Update existing entry
            await db.put(storeName, { ...entry, id });
            showFeedback('Entry updated successfully!');
        } else {
            // Create new entry
            const newId = await db.add(storeName, entry);
            entryIdInput.value = newId;
            showFeedback('Entry saved successfully!');
        }
        loadEntries();
        renderTagsList();
    }

    async function deleteEntry() {
        const id = parseInt(entryIdInput.value, 10);
        if (id) {
            await db.delete(storeName, id);
            clearEditor();
            loadEntries();
            renderTagsList();
            showFeedback('Entry deleted successfully.');
        }
    }

    // --- UI Functions ---
    function renderEntriesList(entries) {
        entriesList.innerHTML = '';
        if (entries.length === 0) {
            entriesList.innerHTML = '<li>No entries found.</li>';
            return;
        }
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.dataset.id = entry.id;
            li.textContent = `${entry.title} - ${formatTimestamp(entry.timestamp)}`;
            li.addEventListener('click', () => loadEntry(entry.id));
            entriesList.appendChild(li);
        });
    }

    async function renderTagsList() {
        if (!db) return;
        const allEntries = await db.getAll(storeName);
        const uniqueTags = [...new Set(allEntries.flatMap(entry => entry.tags || []))];

        tagsList.innerHTML = '';
        uniqueTags.sort().forEach(tag => {
            const li = document.createElement('li');
            li.textContent = tag;
            li.dataset.tag = tag;
            li.addEventListener('click', () => filterByTag(tag));
            tagsList.appendChild(li);
        });
    }

    function filterByTag(tag) {
        // If the current tag is already active, clear the filter
        if (currentFilter.type === 'tag' && currentFilter.value === tag) {
            currentFilter.type = 'all';
            currentFilter.value = '';
            setActiveTag(null);
        } else {
            currentFilter.type = 'tag';
            currentFilter.value = tag;
            searchInput.value = ''; // Clear search input
            setActiveTag(tag);
        }
        loadEntries();
    }

    function clearEditor() {
        entryIdInput.value = '';
        entryTitleInput.value = '';
        entryContentInput.value = '';
        entryTagsInput.value = '';
        setActiveEntry(null);
    }

    function setActiveEntry(id) {
        const items = entriesList.querySelectorAll('li');
        items.forEach(item => {
            if (item.dataset.id == id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    function setActiveTag(tag) {
        const items = tagsList.querySelectorAll('li');
        items.forEach(item => {
            if (item.dataset.tag === tag) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function showFeedback(message, type = 'success') {
        feedbackEl.textContent = message;
        feedbackEl.style.color = type === 'success' ? '#34c759' : '#ff3b30';
        setTimeout(() => {
            feedbackEl.textContent = '';
        }, 3000);
    }

    // --- Theme Switcher ---
    const themeToggle = document.getElementById('theme-toggle');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = 'Toggle Light Mode';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.textContent = 'Toggle Dark Mode';
        }
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- Event Listeners ---
    newEntryBtn.addEventListener('click', clearEditor);
    saveEntryBtn.addEventListener('click', saveEntry);
    deleteEntryBtn.addEventListener('click', deleteEntry);
    searchInput.addEventListener('input', () => {
        currentFilter.type = 'search';
        currentFilter.value = searchInput.value;
        setActiveTag(null); // Clear active tag when searching
        loadEntries();
    });

    // Initialize the application
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    initDB();
    renderTagsList();
});