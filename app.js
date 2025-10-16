document.addEventListener('DOMContentLoaded', () => {
    const dbName = 'JournalDB';
    const storeName = 'entries';
    let db;

    // UI Elements
    const entriesList = document.getElementById('entries-list');
    const searchInput = document.getElementById('search-input');
    const entryIdInput = document.getElementById('entry-id');
    const entryTitleInput = document.getElementById('entry-title');
    const entryContentInput = document.getElementById('entry-content');
    const newEntryBtn = document.getElementById('new-entry');
    const saveEntryBtn = document.getElementById('save-entry');
    const deleteEntryBtn = document.getElementById('delete-entry');
    const feedbackEl = document.getElementById('feedback');

    // --- Database Functions ---
    async function initDB() {
        db = await idb.openDB(dbName, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                }
            },
        });
        console.log('Database initialized.');
        loadEntries();
    }

    async function loadEntries(filter = '') {
        if (!db) return;
        let allEntries = await db.getAll(storeName);
        let entriesToRender = allEntries;

        const lowerCaseFilter = filter.toLowerCase().trim();
        if (lowerCaseFilter) {
            entriesToRender = allEntries.filter(entry =>
                entry.title.toLowerCase().includes(lowerCaseFilter) ||
                entry.content.toLowerCase().includes(lowerCaseFilter)
            );
        }

        entriesToRender.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent
        renderEntriesList(entriesToRender);
    }

    async function loadEntry(id) {
        if (!db) return;
        const entry = await db.get(storeName, id);
        if (entry) {
            entryIdInput.value = entry.id;
            entryTitleInput.value = entry.title;
            entryContentInput.value = entry.content;
            setActiveEntry(id);
        }
    }

    async function saveEntry() {
        const id = parseInt(entryIdInput.value, 10);
        const title = entryTitleInput.value.trim();
        const content = entryContentInput.value.trim();
        const timestamp = new Date().getTime();

        if (!title || !content) {
            showFeedback('Title and content cannot be empty.', 'error');
            return;
        }

        const entry = { title, content, timestamp };

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
    }

    async function deleteEntry() {
        const id = parseInt(entryIdInput.value, 10);
        if (id) {
            await db.delete(storeName, id);
            clearEditor();
            loadEntries();
            showFeedback('Entry deleted successfully.');
        }
    }

    // --- UI Functions ---
    function renderEntriesList(entries) {
        entriesList.innerHTML = '';
        if (entries.length === 0) {
            entriesList.innerHTML = '<li>No entries yet.</li>';
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

    function clearEditor() {
        entryIdInput.value = '';
        entryTitleInput.value = '';
        entryContentInput.value = '';
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

    // --- Event Listeners ---
    newEntryBtn.addEventListener('click', clearEditor);
    saveEntryBtn.addEventListener('click', saveEntry);
    deleteEntryBtn.addEventListener('click', deleteEntry);
    searchInput.addEventListener('input', () => {
        loadEntries(searchInput.value);
    });

    // Initialize the application
    initDB();
});