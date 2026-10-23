// Trash page: restore documents or delete them forever
// Login check, sidebar, api(), icon(), formatSize() etc. come from common.js

const API_URL = "/api/documents";

async function loadTrash() {
    try {
        const response = await api(API_URL + "/trash");
        const documents = await response.json();
        renderTrash(documents);
    } catch (err) {
        showMessage("Could not load Trash", "error");
    }
}

function renderTrash(documents) {
    // Most recently deleted first
    documents.sort(function (a, b) { return new Date(b.deletedAt) - new Date(a.deletedAt); });

    const list = document.getElementById("trashList");
    list.innerHTML = "";

    const isEmpty = documents.length === 0;
    document.getElementById("trashTable").hidden = isEmpty;
    document.getElementById("emptyMessage").hidden = !isEmpty;
    document.getElementById("emptyBtn").hidden = isEmpty;

    documents.forEach(function (doc) {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        const nameWrap = document.createElement("div");
        nameWrap.className = "name-cell";
        const name = document.createElement("span");
        name.textContent = doc.fileName;
        name.title = doc.fileName;
        nameWrap.append(fileBadge(doc.fileName), name);
        nameCell.appendChild(nameWrap);

        const sizeCell = document.createElement("td");
        sizeCell.className = "num hide-sm";
        sizeCell.textContent = formatSize(doc.fileSize);

        const dateCell = document.createElement("td");
        dateCell.className = "num hide-sm";
        dateCell.textContent = formatDate(doc.deletedAt);

        const actionCell = document.createElement("td");
        actionCell.className = "actions";
        const restore = document.createElement("button");
        restore.type = "button";
        restore.className = "btn btn-ghost btn-sm";
        restore.innerHTML = icon("restore", "i-sm");
        restore.append("Restore");
        restore.addEventListener("click", function () { restoreDocument(doc); });
        const remove = iconButton("trash", "Delete forever", "danger", function () { deleteForever(doc); });
        actionCell.append(restore, remove);

        row.append(nameCell, sizeCell, dateCell, actionCell);
        list.appendChild(row);
    });
}

async function restoreDocument(doc) {
    try {
        const response = await api(API_URL + "/" + doc.id + "/restore", { method: "POST" });
        if (!response.ok) throw new Error();
        showMessage("\"" + doc.fileName + "\" restored", "success");
        loadTrash();
    } catch (err) {
        showMessage("Could not restore file", "error");
    }
}

async function deleteForever(doc) {
    if (!confirm("Delete \"" + doc.fileName + "\" forever? This cannot be undone.")) return;
    try {
        const response = await api(API_URL + "/" + doc.id + "/permanent", { method: "DELETE" });
        if (!response.ok) throw new Error();
        showMessage("File deleted forever", "success");
        loadTrash();
        loadStorage();
    } catch (err) {
        showMessage("Could not delete file", "error");
    }
}

document.getElementById("emptyBtn").addEventListener("click", async function () {
    if (!confirm("Delete every file in Trash forever? This cannot be undone.")) return;
    try {
        const response = await api(API_URL + "/trash", { method: "DELETE" });
        if (!response.ok) throw new Error();
        showMessage("Trash emptied", "success");
        loadTrash();
        loadStorage();
    } catch (err) {
        showMessage("Could not empty Trash", "error");
    }
});

loadTrash();
