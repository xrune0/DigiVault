// Upload page: pick one or more files, choose a category, upload (encrypted on the server),
// and optionally ask the AI to summarise each file afterwards.
// Login check, sidebar, api(), formatSize() etc. come from common.js

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file (same limit as the server)
const SUMMARY_EXT = ["pdf", "docx", "txt", "csv", "md"];

const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const fileList = document.getElementById("fileList");
const uploadBtn = document.getElementById("uploadBtn");

// Files waiting to be uploaded: { file, li, state }
let queue = [];

function addFiles(files) {
    Array.from(files).forEach(function (file) {
        const li = document.createElement("li");
        li.appendChild(fileBadge(file.name));

        const info = document.createElement("div");
        info.className = "info";
        const name = document.createElement("strong");
        name.textContent = file.name;
        const size = document.createElement("small");
        size.textContent = formatSize(file.size);
        info.append(name, size);

        const state = document.createElement("span");
        state.className = "state";

        const item = { file: file, li: li, state: state };
        const remove = iconButton("x", "Remove", "", function () {
            queue = queue.filter(function (q) { return q !== item; });
            li.remove();
        });

        // Too big? Mark it now so the user knows before uploading
        if (file.size > MAX_SIZE) {
            state.textContent = "Too large (max 10 MB)";
            state.className = "state err";
            item.skip = true;
        }

        li.append(info, state, remove);
        fileList.appendChild(li);
        queue.push(item);
    });
    fileInput.value = ""; // allow choosing the same file again
}

fileInput.addEventListener("change", function () { addFiles(fileInput.files); });

// Highlight the drop zone while dragging
fileInput.addEventListener("dragenter", function () { dropzone.classList.add("dragover"); });
fileInput.addEventListener("dragleave", function () { dropzone.classList.remove("dragover"); });
fileInput.addEventListener("drop", function () { dropzone.classList.remove("dragover"); });

function setState(item, text, cls) {
    item.state.textContent = text;
    item.state.className = "state " + cls;
}

// ===== Upload =====
document.getElementById("uploadForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const pending = queue.filter(function (q) { return !q.skip && !q.done; });
    if (pending.length === 0) {
        showMessage("Please choose at least one file (max 10 MB each)", "error");
        return;
    }

    const category = document.getElementById("categoryInput").value;
    const wantSummary = document.getElementById("aiToggle").checked;
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Encrypting & uploading...";

    let uploaded = 0, summarised = 0, aiError = null;

    // Upload one file at a time so each row can show its own status
    for (const item of pending) {
        setState(item, "Uploading...", "busy");
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("category", category);

        try {
            // Don't set Content-Type: the browser adds the multipart boundary itself
            const response = await api("/api/documents/upload", { method: "POST", body: formData });
            const data = await response.json().catch(function () { return {}; });
            if (!response.ok) {
                setState(item, data.message || "Upload failed", "err");
                continue;
            }
            uploaded++;
            item.done = true;
            setState(item, "Encrypted ✓", "ok");

            // Optional AI summary for supported file types
            if (wantSummary && SUMMARY_EXT.includes(getExtension(item.file.name)) && !aiError) {
                setState(item, "Summarising...", "busy");
                const r = await api("/api/documents/" + data.id + "/summarize", { method: "POST" });
                const s = await r.json().catch(function () { return {}; });
                if (r.ok) {
                    summarised++;
                    setState(item, "Encrypted ✓ · Summary ready", "ok");
                } else {
                    aiError = s.message || "AI summary failed";
                    setState(item, "Encrypted ✓ · no summary", "ok");
                }
            }
        } catch (err) {
            setState(item, "Upload failed", "err");
        }
    }

    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload & Secure →";
    loadStorage();

    if (aiError) {
        showMessage(aiError, "error");
    } else if (uploaded > 0) {
        showMessage(uploaded + (uploaded === 1 ? " file" : " files") + " encrypted and uploaded"
            + (summarised ? " · " + summarised + " summarised" : ""), "success");
    }
});
