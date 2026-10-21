// Handles upload, list, search, preview, AI summary, download and delete on dashboard.html

const API_URL = "/api/documents";
const token = localStorage.getItem("token");

// Not logged in? Go back to the login page
if (!token) {
    window.location.href = "index.html";
}

// All documents from the server; search and filter work on this list
let allDocuments = [];

const CATEGORY_ICONS = {
    ID: "🪪", Education: "🎓", Medical: "🩺", Finance: "💰", Work: "💼", Other: "📁"
};

// ===== Show user info in the navbar =====
const userName = localStorage.getItem("name") || "User";
document.getElementById("userName").textContent = userName;
document.getElementById("userEmail").textContent = localStorage.getItem("email") || "";
document.getElementById("avatar").textContent = userName.charAt(0).toUpperCase();
document.getElementById("greeting").textContent = "Welcome back, " + userName.split(" ")[0] + " 👋";

// Every request to /api/documents must carry the JWT
function authHeader() {
    return { "Authorization": "Bearer " + token };
}

// Small pop-up message in the bottom-right corner
let toastTimer;
function showMessage(text, type) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.className = "toast show " + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.className = "toast " + type;
    }, 3000);
}

// If the token is expired or invalid, the server returns 401/403
function handleUnauthorized(response) {
    if (response.status === 401 || response.status === 403) {
        logout();
        return true;
    }
    return false;
}

function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function getExtension(fileName) {
    return fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "file";
}

// Pick a badge color based on the file extension
function getBadgeClass(ext) {
    if (ext === "pdf") return "pdf";
    if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
    if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
    if (["ppt", "pptx"].includes(ext)) return "slide";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["zip", "rar", "7z"].includes(ext)) return "zip";
    return "";
}

// Create a small icon button for the actions column
function makeButton(icon, title, className, onClick) {
    const button = document.createElement("button");
    button.className = "btn btn-icon " + className;
    button.textContent = icon;
    button.title = title;
    button.onclick = onClick;
    return button;
}

// ===== Update the three stat cards =====
function updateStats(documents) {
    const totalSize = documents.reduce(function (sum, doc) { return sum + doc.fileSize; }, 0);

    document.getElementById("statCount").textContent = documents.length;
    document.getElementById("statSize").textContent = formatSize(totalSize);
    document.getElementById("docBadge").textContent = documents.length + (documents.length === 1 ? " file" : " files");

    if (documents.length > 0) {
        // List is sorted newest first, so the first one is the latest upload
        document.getElementById("statLast").textContent = formatDate(documents[0].uploadedAt);
    } else {
        document.getElementById("statLast").textContent = "—";
    }
}

// ===== Load documents from the server =====
async function loadDocuments() {
    const response = await fetch(API_URL, { headers: authHeader() });
    if (handleUnauthorized(response)) return;

    allDocuments = await response.json();
    // Newest first
    allDocuments.sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });

    updateStats(allDocuments);
    renderDocuments();
}

// ===== Show the documents that match the search box and category filter =====
function renderDocuments() {
    const search = document.getElementById("searchInput").value.trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;

    const documents = allDocuments.filter(function (doc) {
        const docCategory = doc.category || "Other";
        const matchesSearch = doc.fileName.toLowerCase().includes(search);
        const matchesCategory = category === "All" || docCategory === category;
        return matchesSearch && matchesCategory;
    });

    const list = document.getElementById("documentList");
    list.innerHTML = "";

    // Empty state: different text for "no files at all" vs "nothing matches the search"
    const isEmpty = documents.length === 0;
    document.getElementById("emptyMessage").hidden = !isEmpty;
    document.getElementById("tableWrap").hidden = isEmpty;
    if (allDocuments.length === 0) {
        document.getElementById("emptyTitle").textContent = "No documents yet";
        document.getElementById("emptyText").textContent = "Upload your first file to get started.";
    } else {
        document.getElementById("emptyTitle").textContent = "No matching documents";
        document.getElementById("emptyText").textContent = "Try a different search or category.";
    }

    documents.forEach(function (doc) {
        const row = document.createElement("tr");
        const ext = getExtension(doc.fileName);
        const docCategory = doc.category || "Other";

        // File name with colored badge (textContent so file names can't inject HTML)
        const nameCell = document.createElement("td");
        const fileCell = document.createElement("div");
        fileCell.className = "file-cell";

        const badge = document.createElement("div");
        badge.className = "file-badge " + getBadgeClass(ext);
        badge.textContent = ext.toUpperCase().slice(0, 4);

        const name = document.createElement("span");
        name.className = "file-name";
        name.textContent = doc.fileName;
        name.title = doc.fileName;

        fileCell.append(badge, name);
        nameCell.appendChild(fileCell);

        const categoryCell = document.createElement("td");
        const tag = document.createElement("span");
        tag.className = "category-tag";
        tag.textContent = (CATEGORY_ICONS[docCategory] || "📁") + " " + docCategory;
        categoryCell.appendChild(tag);

        const sizeCell = document.createElement("td");
        sizeCell.className = "muted";
        sizeCell.textContent = formatSize(doc.fileSize);

        const dateCell = document.createElement("td");
        dateCell.className = "muted";
        dateCell.textContent = formatDate(doc.uploadedAt);

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "actions";
        actions.append(
            makeButton("👁", "Preview", "btn-preview", function () { previewDocument(doc); }),
            makeButton("✨", "AI Summary", "btn-ai", function () { summarizeDocument(doc); }),
            makeButton("⬇", "Download", "btn-download", function () { downloadDocument(doc.id, doc.fileName); }),
            makeButton("🗑", "Delete", "btn-delete", function () { deleteDocument(doc.id); })
        );
        actionCell.appendChild(actions);

        row.append(nameCell, categoryCell, sizeCell, dateCell, actionCell);
        list.appendChild(row);
    });
}

document.getElementById("searchInput").addEventListener("input", renderDocuments);
document.getElementById("categoryFilter").addEventListener("change", renderDocuments);

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
// Click outside the white box or press Escape to close
modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

// Fetch the decrypted file from the server (needs the JWT, so a plain link won't work)
async function fetchFile(id) {
    const response = await fetch(API_URL + "/download/" + id, { headers: authHeader() });
    if (handleUnauthorized(response)) return null;
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
    const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
    const isText = ["txt", "csv", "md", "json", "log"].includes(ext);

    openModal("👁 " + doc.fileName);

    if (!isPdf && !isImage && !isText) {
        showModalText("Preview isn't available for ." + ext + " files. Use the ⬇ Download button instead.");
        return;
    }

    showLoading("Decrypting and loading preview...");
    try {
        const blob = await fetchFile(doc.id);
        if (!blob) return;
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
    openModal("✨ AI Summary · " + doc.fileName);

    // Already summarized before? Show it instantly
    if (doc.summary) {
        showSummary(doc.summary, true);
        return;
    }

    showLoading("AI is reading your document... this can take a few seconds");
    try {
        const response = await fetch(API_URL + "/" + doc.id + "/summarize", {
            method: "POST",
            headers: authHeader()
        });
        if (handleUnauthorized(response)) return;

        const data = await response.json();
        if (response.ok) {
            doc.summary = data.summary; // remember it so reopening is instant
            showSummary(data.summary, false);
        } else {
            showModalText("⚠️ " + (data.message || "Could not create summary"));
        }
    } catch (err) {
        showModalText("⚠️ Could not connect to server");
    }
}

// ===== Drop zone: show the chosen file name and highlight while dragging =====
const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const selectedFile = document.getElementById("selectedFile");

fileInput.addEventListener("change", function () {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        selectedFile.textContent = "📎 " + file.name + " (" + formatSize(file.size) + ")";
        selectedFile.hidden = false;
    } else {
        selectedFile.hidden = true;
    }
});

fileInput.addEventListener("dragenter", function () { dropzone.classList.add("dragover"); });
fileInput.addEventListener("dragleave", function () { dropzone.classList.remove("dragover"); });
fileInput.addEventListener("drop", function () { dropzone.classList.remove("dragover"); });

// ===== Upload =====
document.getElementById("uploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    if (fileInput.files.length === 0) {
        showMessage("Please choose a file", "error");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("category", document.getElementById("categoryInput").value);

    const uploadBtn = document.getElementById("uploadBtn");
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Encrypting & uploading...";

    try {
        // Don't set Content-Type here; the browser adds the multipart boundary itself
        const response = await fetch(API_URL + "/upload", {
            method: "POST",
            headers: authHeader(),
            body: formData
        });
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            showMessage("✅ File encrypted and uploaded", "success");
            fileInput.value = "";
            selectedFile.hidden = true;
            loadDocuments();
        } else {
            const data = await response.json().catch(function () { return {}; });
            showMessage(data.message || "Upload failed (max size is 10 MB)", "error");
        }
    } catch (err) {
        showMessage("Upload failed", "error");
    }

    uploadBtn.disabled = false;
    uploadBtn.textContent = "⬆ Upload File";
});

// ===== Download =====
async function downloadDocument(id, fileName) {
    try {
        const blob = await fetchFile(id);
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        showMessage(err.message, "error");
    }
}

// ===== Delete =====
async function deleteDocument(id) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    const response = await fetch(API_URL + "/" + id, {
        method: "DELETE",
        headers: authHeader()
    });
    if (handleUnauthorized(response)) return;

    if (response.ok) {
        showMessage("🗑 Document deleted", "success");
        loadDocuments();
    } else {
        showMessage("Delete failed", "error");
    }
}

document.getElementById("logoutBtn").addEventListener("click", logout);

loadDocuments();
