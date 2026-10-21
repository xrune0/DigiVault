// Handles upload, list, download and delete on dashboard.html

const API_URL = "/api/documents";
const token = localStorage.getItem("token");

// Not logged in? Go back to the login page
if (!token) {
    window.location.href = "index.html";
}

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

// ===== Update the three stat cards =====
function updateStats(documents) {
    const totalSize = documents.reduce(function (sum, doc) { return sum + doc.fileSize; }, 0);

    document.getElementById("statCount").textContent = documents.length;
    document.getElementById("statSize").textContent = formatSize(totalSize);
    document.getElementById("docBadge").textContent = documents.length + (documents.length === 1 ? " file" : " files");

    if (documents.length > 0) {
        const latest = documents.reduce(function (a, b) {
            return new Date(a.uploadedAt) > new Date(b.uploadedAt) ? a : b;
        });
        document.getElementById("statLast").textContent = formatDate(latest.uploadedAt);
    } else {
        document.getElementById("statLast").textContent = "—";
    }
}

// ===== List documents =====
async function loadDocuments() {
    const response = await fetch(API_URL, { headers: authHeader() });
    if (handleUnauthorized(response)) return;

    const documents = await response.json();
    // Newest first
    documents.sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });

    const list = document.getElementById("documentList");
    list.innerHTML = "";

    document.getElementById("emptyMessage").hidden = documents.length > 0;
    document.getElementById("tableWrap").hidden = documents.length === 0;
    updateStats(documents);

    documents.forEach(function (doc) {
        const row = document.createElement("tr");
        const ext = doc.fileName.includes(".") ? doc.fileName.split(".").pop().toLowerCase() : "file";

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

        const sizeCell = document.createElement("td");
        sizeCell.className = "muted";
        sizeCell.textContent = formatSize(doc.fileSize);

        const dateCell = document.createElement("td");
        dateCell.className = "muted";
        dateCell.textContent = formatDate(doc.uploadedAt);

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.className = "btn btn-small btn-download";
        downloadBtn.textContent = "⬇ Download";
        downloadBtn.onclick = function () { downloadDocument(doc.id, doc.fileName); };

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-small btn-delete";
        deleteBtn.textContent = "🗑 Delete";
        deleteBtn.onclick = function () { deleteDocument(doc.id); };

        actions.append(downloadBtn, deleteBtn);
        actionCell.appendChild(actions);

        row.append(nameCell, sizeCell, dateCell, actionCell);
        list.appendChild(row);
    });
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

    const uploadBtn = document.getElementById("uploadBtn");
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    try {
        // Don't set Content-Type here; the browser adds the multipart boundary itself
        const response = await fetch(API_URL + "/upload", {
            method: "POST",
            headers: authHeader(),
            body: formData
        });
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            showMessage("✅ File uploaded successfully", "success");
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
// A plain <a href> can't send the Authorization header, so fetch the file and save it as a blob
async function downloadDocument(id, fileName) {
    const response = await fetch(API_URL + "/download/" + id, { headers: authHeader() });
    if (handleUnauthorized(response)) return;

    if (!response.ok) {
        showMessage("Download failed", "error");
        return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
