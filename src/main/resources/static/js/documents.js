// "Your Files" page: list, tabs, search, filter, sort, star, preview, AI summary, download, move to Trash
// Login check, sidebar, api(), icon(), formatSize() etc. come from common.js

const API_URL = "/api/documents";

// All active documents from the server; tabs, search and filters work on this list
let allDocuments = [];
let currentTab = "all";

// Pre-fill the search box when coming from the top search bar (documents.html?q=...)
const params = new URLSearchParams(window.location.search);
if (params.get("q")) {
    document.getElementById("searchInput").value = params.get("q");
    document.getElementById("topSearchInput").value = params.get("q");
}

// ===== Load =====
async function loadDocuments() {
    try {
        const response = await api(API_URL);
        allDocuments = await response.json();
        renderDocuments();
    } catch (err) {
        showMessage("Could not load your files", "error");
    }
}

// Which tab a file belongs to
function matchesTab(doc) {
    const ext = getExtension(doc.fileName);
    if (currentTab === "documents") return DOC_EXT.includes(ext);
    if (currentTab === "images") return IMAGE_EXT.includes(ext);
    if (currentTab === "others") return !DOC_EXT.includes(ext) && !IMAGE_EXT.includes(ext);
    if (currentTab === "starred") return doc.starred;
    return true;
}

function sortDocuments(list) {
    const sort = document.getElementById("sortSelect").value;
    return list.sort(function (a, b) {
        if (sort === "oldest") return new Date(a.uploadedAt) - new Date(b.uploadedAt);
        if (sort === "name") return a.fileName.localeCompare(b.fileName);
        if (sort === "size") return b.fileSize - a.fileSize;
        return new Date(b.uploadedAt) - new Date(a.uploadedAt); // newest first
    });
}

// ===== Render the table =====
function renderDocuments() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const documents = sortDocuments(allDocuments.filter(function (doc) {
        return matchesTab(doc)
            && doc.fileName.toLowerCase().includes(search)
            && (category === "All" || (doc.category || "Other") === category);
    }));

    document.getElementById("fileCount").textContent =
        allDocuments.length + (allDocuments.length === 1 ? " file" : " files") + " in your vault";

    const list = document.getElementById("documentList");
    list.innerHTML = "";

    const isEmpty = documents.length === 0;
    document.getElementById("fileTable").hidden = isEmpty;
    document.getElementById("emptyMessage").hidden = !isEmpty;
    document.getElementById("emptyTitle").textContent = allDocuments.length === 0 ? "No files yet" : "No matching files";
    document.getElementById("emptyText").textContent = allDocuments.length === 0
        ? "Upload your first file to get started."
        : "Try a different tab, search or category.";

    documents.forEach(function (doc) {
        const row = document.createElement("tr");

        // Name with colored badge (textContent so file names can't inject HTML)
        const nameCell = document.createElement("td");
        const nameWrap = document.createElement("div");
        nameWrap.className = "name-cell";
        const name = document.createElement("span");
        name.textContent = doc.fileName;
        name.title = doc.fileName;
        nameWrap.append(fileBadge(doc.fileName), name);
        nameCell.appendChild(nameWrap);

        const categoryCell = document.createElement("td");
        categoryCell.className = "hide-sm";
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = doc.category || "Other";
        categoryCell.appendChild(pill);

        const sizeCell = document.createElement("td");
        sizeCell.className = "num hide-md";
        sizeCell.textContent = formatSize(doc.fileSize);

        const dateCell = document.createElement("td");
        dateCell.className = "num hide-sm";
        dateCell.textContent = formatDate(doc.uploadedAt);

        const actionCell = document.createElement("td");
        actionCell.className = "actions";
        const star = iconButton("star", doc.starred ? "Unstar" : "Star", "star-btn" + (doc.starred ? " on" : ""), function () { toggleStar(doc); });
        const more = iconButton("dots", "More actions", "", function (e) { openRowMenu(e.currentTarget, doc); });
        actionCell.append(star, more);

        row.append(nameCell, categoryCell, sizeCell, dateCell, actionCell);
        list.appendChild(row);
    });
}

document.getElementById("searchInput").addEventListener("input", renderDocuments);
document.getElementById("categoryFilter").addEventListener("change", renderDocuments);
document.getElementById("sortSelect").addEventListener("change", renderDocuments);

document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        currentTab = tab.dataset.tab;
        renderDocuments();
    });
});

// ===== Star =====
async function toggleStar(doc) {
    try {
        const response = await api(API_URL + "/" + doc.id + "/star", { method: "PUT" });
        if (!response.ok) throw new Error();
        doc.starred = (await response.json()).starred;
        renderDocuments();
    } catch (err) {
        showMessage("Could not update star", "error");
    }
}

// ===== Row "more" menu =====
let openMenu = null;

function closeRowMenu() {
    if (openMenu) {
        openMenu.remove();
        openMenu = null;
    }
}

function openRowMenu(button, doc) {
    closeRowMenu();
    const menu = document.createElement("div");
    menu.className = "row-menu";

    const items = [
        ["eye", "Preview", "", function () { previewDocument(doc); }],
        ["sparkle", "AI summary", "ai", function () { summarizeDocument(doc); }],
        ["download", "Download", "", function () { downloadDocument(doc); }],
        ["trash", "Move to Trash", "danger", function () { moveToTrash(doc); }]
    ];
    items.forEach(function (item) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = item[2];
        b.innerHTML = icon(item[0], "i-sm");
        b.append(item[1]);
        b.addEventListener("click", function () { closeRowMenu(); item[3](); });
        menu.appendChild(b);
    });

    document.body.appendChild(menu);
    // Position under the button, kept inside the window
    const r = button.getBoundingClientRect();
    const left = Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 10);
    const fitsBelow = r.bottom + menu.offsetHeight + 8 < window.innerHeight;
    menu.style.left = (left + window.scrollX) + "px";
    menu.style.top = ((fitsBelow ? r.bottom + 6 : r.top - menu.offsetHeight - 6) + window.scrollY) + "px";
    openMenu = menu;
}

document.addEventListener("click", function (e) {
    if (openMenu && !openMenu.contains(e.target) && !e.target.closest(".actions")) closeRowMenu();
});
window.addEventListener("resize", closeRowMenu);

// ===== Modal (pop-up) helpers =====
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
let previewUrl = null;

function openModal(title) {
    document.getElementById("modalTitle").textContent = title;
    modalBody.innerHTML = "";
    modal.hidden = false;
}

function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
    // Free the memory used by the previewed file
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }
}

function showLoading(text) {
    modalBody.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "loading";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    const label = document.createElement("p");
    label.textContent = text;
    loading.append(spinner, label);
    modalBody.appendChild(loading);
}

function showModalText(text) {
    modalBody.innerHTML = "";
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = text;
    modalBody.appendChild(p);
}

document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); closeRowMenu(); }
});

// Fetch the decrypted file from the server (needs the JWT, so a plain link won't work)
async function fetchFile(id) {
    const response = await api(API_URL + "/download/" + id);
    if (!response.ok) {
        const data = await response.json().catch(function () { return {}; });
        throw new Error(data.message || "Could not load file");
    }
    return response.blob();
}

// ===== Preview =====
async function previewDocument(doc) {
    const ext = getExtension(doc.fileName);
    const isPdf = ext === "pdf";
    const isImage = IMAGE_EXT.includes(ext);
    const isText = ["txt", "csv", "md", "json", "log"].includes(ext);

    openModal(doc.fileName);

    if (!isPdf && !isImage && !isText) {
        showModalText("Preview isn't available for ." + ext + " files. Use Download instead.");
        return;
    }

    showLoading("Decrypting and loading preview...");
    try {
        const blob = await fetchFile(doc.id);
        modalBody.innerHTML = "";

        if (isText) {
            const pre = document.createElement("pre");
            pre.textContent = await blob.text();
            modalBody.appendChild(pre);
            return;
        }

        previewUrl = URL.createObjectURL(blob);
        const element = document.createElement(isPdf ? "iframe" : "img");
        element.src = previewUrl;
        if (isImage) element.alt = doc.fileName;
        modalBody.appendChild(element);
    } catch (err) {
        showModalText(err.message);
    }
}

// ===== AI Summary =====
function showSummary(summary, cached) {
    modalBody.innerHTML = "";
    const box = document.createElement("div");
    box.className = "summary-text";
    box.textContent = summary;

    const note = document.createElement("p");
    note.className = "summary-note";
    note.textContent = cached
        ? "Saved summary · generated by AI, may contain mistakes."
        : "Generated by AI (ChatGPT) · may contain mistakes.";

    modalBody.append(box, note);
}

async function summarizeDocument(doc) {
    openModal("AI Summary · " + doc.fileName);

    // Already summarized before? Show it instantly
    if (doc.summary) {
        showSummary(doc.summary, true);
        return;
    }

    showLoading("AI is reading your document... this can take a few seconds");
    try {
        const response = await api(API_URL + "/" + doc.id + "/summarize", { method: "POST" });
        const data = await response.json();
        if (response.ok) {
            doc.summary = data.summary; // remember it so reopening is instant
            showSummary(data.summary, false);
        } else {
            showModalText(data.message || "Could not create summary");
        }
    } catch (err) {
        showModalText("Could not connect to server");
    }
}

// ===== Download =====
async function downloadDocument(doc) {
    try {
        const blob = await fetchFile(doc.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        showMessage(err.message, "error");
    }
}

// ===== Move to Trash (can be restored from the Trash page) =====
async function moveToTrash(doc) {
    try {
        const response = await api(API_URL + "/" + doc.id, { method: "DELETE" });
        if (!response.ok) throw new Error();
        allDocuments = allDocuments.filter(function (d) { return d.id !== doc.id; });
        renderDocuments();
        showMessage("Moved to Trash", "success");
    } catch (err) {
        showMessage("Could not move to Trash", "error");
    }
}

loadDocuments();
