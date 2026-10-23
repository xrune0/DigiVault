// Bookmarks page: list, search, filters, star, add / edit (pop-up form) and delete
// Login check, sidebar, api(), icon(), formatDate() etc. come from common.js

const API_URL = "/api/bookmarks";

// All bookmarks from the server; search and filters work on this list
let allBookmarks = [];

// When editing, this holds the id of the bookmark being changed (null = adding a new one)
let editingId = null;

// Brand colors and short labels for the site icon; unknown sites use grey and their first letter
const SITE_STYLE = {
    "YouTube": ["#ff0000", "▶"], "Google": ["#4285f4", "G"], "GitHub": ["#24292f", "GH"], "Wikipedia": ["#636466", "W"],
    "Amazon": ["#ff9900", "a"], "Flipkart": ["#2874f0", "F"], "Myntra": ["#ff3f6c", "M"], "Instagram": ["#e1306c", "IG"],
    "Facebook": ["#1877f2", "f"], "LinkedIn": ["#0a66c2", "in"], "Reddit": ["#ff4500", "R"], "X": ["#000000", "X"],
    "Stack Overflow": ["#f48024", "SO"], "Medium": ["#000000", "M"], "Netflix": ["#e50914", "N"], "Spotify": ["#1db954", "S"],
    "ChatGPT": ["#10a37f", "AI"], "Udemy": ["#a435f0", "U"], "Coursera": ["#0056d2", "C"], "GeeksforGeeks": ["#2f8d46", "G"]
};

const form = document.getElementById("bookmarkForm");
const bookmarkModal = document.getElementById("bookmarkModal");
const urlInput = document.getElementById("urlInput");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const categoryInput = document.getElementById("categoryInput");
const saveBtn = document.getElementById("saveBtn");

// ===== Load =====
async function loadBookmarks() {
    try {
        const response = await api(API_URL);
        allBookmarks = await response.json();
        fillSiteFilter();
        renderBookmarks();
    } catch (err) {
        showMessage("Could not load bookmarks", "error");
    }
}

// Fill the "All sites" dropdown with the sites the user has actually saved
function fillSiteFilter() {
    const siteFilter = document.getElementById("siteFilter");
    const current = siteFilter.value;
    const sites = [...new Set(allBookmarks.map(function (b) { return b.site; }))].sort();
    siteFilter.innerHTML = "";
    siteFilter.appendChild(new Option("All sites", "All"));
    sites.forEach(function (site) { siteFilter.appendChild(new Option(site, site)); });
    siteFilter.value = sites.includes(current) ? current : "All";
}

// ===== Render =====
function renderBookmarks() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;
    const site = document.getElementById("siteFilter").value;

    // Starred first, then newest
    const bookmarks = allBookmarks.filter(function (b) {
        const text = (b.title + " " + b.url + " " + (b.description || "")).toLowerCase();
        return text.includes(search)
            && (category === "All" || b.category === category)
            && (site === "All" || b.site === site);
    }).sort(function (a, b) {
        return (b.starred - a.starred) || (new Date(b.createdAt) - new Date(a.createdAt));
    });

    const list = document.getElementById("bookmarkList");
    list.innerHTML = "";

    const isEmpty = bookmarks.length === 0;
    document.getElementById("emptyMessage").hidden = !isEmpty;
    list.hidden = isEmpty;
    document.getElementById("emptyTitle").textContent = allBookmarks.length === 0 ? "No bookmarks yet" : "No matching bookmarks";
    document.getElementById("emptyText").textContent = allBookmarks.length === 0
        ? "Click \"Add Link\" to save your first bookmark."
        : "Try a different search or filter.";

    bookmarks.forEach(function (b) { list.appendChild(createCard(b)); });
}

// Build one bookmark card (textContent everywhere so saved text can't inject HTML)
function createCard(b) {
    const card = document.createElement("article");
    card.className = "card bookmark-card";

    // Top row: site icon, category pill, star
    const top = document.createElement("div");
    top.className = "bookmark-top";
    const style = SITE_STYLE[b.site] || ["#8a8494", b.site.charAt(0).toUpperCase()];
    const siteIcon = document.createElement("span");
    siteIcon.className = "site-icon";
    siteIcon.style.background = style[0];
    siteIcon.textContent = style[1];
    siteIcon.title = b.site;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = b.category;
    const star = iconButton("star", b.starred ? "Unstar" : "Star", "star-btn" + (b.starred ? " on" : ""), function () { toggleStar(b); });
    top.append(siteIcon, pill, star);

    // Title link opens in a new tab (only for http/https links)
    const title = document.createElement("a");
    title.className = "bookmark-title";
    title.textContent = b.title;
    if (/^https?:\/\//i.test(b.url)) {
        title.href = b.url;
        title.target = "_blank";
        title.rel = "noopener noreferrer";
    }

    const url = document.createElement("p");
    url.className = "bookmark-url";
    url.textContent = b.url;
    url.title = b.url;

    card.append(top, title, url);

    if (b.description) {
        const description = document.createElement("p");
        description.className = "bookmark-description";
        description.textContent = b.description;
        card.appendChild(description);
    }

    // Footer: date + edit / delete
    const footer = document.createElement("div");
    footer.className = "bookmark-footer";
    const date = document.createElement("span");
    date.textContent = formatDate(b.createdAt);
    const actions = document.createElement("div");
    actions.append(
        iconButton("edit", "Edit", "", function () { openForm(b); }),
        iconButton("trash", "Delete", "danger", function () { deleteBookmark(b.id); })
    );
    footer.append(date, actions);
    card.appendChild(footer);

    return card;
}

document.getElementById("searchInput").addEventListener("input", renderBookmarks);
document.getElementById("categoryFilter").addEventListener("change", renderBookmarks);
document.getElementById("siteFilter").addEventListener("change", renderBookmarks);

// ===== Star =====
async function toggleStar(b) {
    try {
        const response = await api(API_URL + "/" + b.id + "/star", { method: "PUT" });
        if (!response.ok) throw new Error();
        b.starred = (await response.json()).starred;
        renderBookmarks();
    } catch (err) {
        showMessage("Could not update star", "error");
    }
}

// ===== Add / edit pop-up =====
function openForm(b) {
    editingId = b ? b.id : null;
    form.reset();
    categoryInput.value = "Other";
    if (b) {
        urlInput.value = b.url;
        titleInput.value = b.title === b.url ? "" : b.title;
        descriptionInput.value = b.description || "";
        categoryInput.value = b.category;
    }
    document.getElementById("formTitle").textContent = b ? "Edit Link" : "Add Link";
    saveBtn.textContent = b ? "Update Link" : "Save Link";
    bookmarkModal.hidden = false;
    urlInput.focus();
}

function closeForm() {
    bookmarkModal.hidden = true;
    editingId = null;
}

document.getElementById("addBtn").addEventListener("click", function () { openForm(null); });
document.getElementById("closeModalBtn").addEventListener("click", closeForm);
document.getElementById("cancelBtn").addEventListener("click", closeForm);
bookmarkModal.addEventListener("click", function (e) { if (e.target === bookmarkModal) closeForm(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeForm(); });

// ===== Save (add new or update existing) =====
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const body = {
        url: urlInput.value,
        title: titleInput.value,
        description: descriptionInput.value,
        category: categoryInput.value
    };
    const isEdit = editingId !== null;
    saveBtn.disabled = true;

    try {
        const response = await api(isEdit ? API_URL + "/" + editingId : API_URL, {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(isEdit ? "Bookmark updated" : "Saved · tagged as " + data.site, "success");
            closeForm();
            loadBookmarks();
        } else {
            showMessage(data.message || "Could not save bookmark", "error");
        }
    } catch (err) {
        showMessage("Could not connect to server", "error");
    }
    saveBtn.disabled = false;
});

// ===== Delete =====
async function deleteBookmark(id) {
    if (!confirm("Delete this bookmark?")) return;
    try {
        const response = await api(API_URL + "/" + id, { method: "DELETE" });
        if (!response.ok) throw new Error();
        showMessage("Bookmark deleted", "success");
        loadBookmarks();
    } catch (err) {
        showMessage("Delete failed", "error");
    }
}

loadBookmarks();
