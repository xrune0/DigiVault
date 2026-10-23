// Shared code for every logged-in page (Home, Documents, Upload, Bookmarks, Trash):
// login check, sidebar + top bar, API helper, toast messages and small formatters.

// "Remember me" logins live in localStorage, the rest in sessionStorage
const store = localStorage.getItem("token") ? localStorage : sessionStorage;
const token = store.getItem("token");

// Not logged in? Go back to the login page
if (!token) {
    window.location.href = "index.html";
}

const userName = store.getItem("name") || "User";
const userEmail = store.getItem("email") || "";

// ===== Icons (inline SVG paths, 24x24) =====
const ICONS = {
    home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    upload: '<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    dots: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sparkle: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cloud: '<path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9"/><path d="M12 12v8"/><path d="M9 15l3-3 3 3"/>'
};

function icon(name, cls) {
    return '<svg class="i ' + (cls || "") + '" viewBox="0 0 24 24">' + ICONS[name] + "</svg>";
}

// ===== Build the sidebar and top bar =====
(function buildShell() {
    const sidebar = document.getElementById("sidebar");
    const page = sidebar.dataset.page;
    const links = [
        ["home", "dashboard.html", "home", "Home"],
        ["documents", "documents.html", "file", "Documents"],
        ["upload", "upload.html", "upload", "Upload"],
        ["bookmarks", "bookmarks.html", "bookmark", "Bookmarks"],
        ["trash", "trash.html", "trash", "Trash"]
    ];

    sidebar.innerHTML =
        '<a class="brand" href="dashboard.html"><span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>DigiVault</a>' +
        '<nav class="side-nav">' +
        links.map(function (l) {
            return '<a href="' + l[1] + '"' + (l[0] === page ? ' class="active"' : "") + ">" + icon(l[2]) + l[3] + "</a>";
        }).join("") +
        "</nav>" +
        '<div class="storage"><strong>Storage</strong><div class="meter" id="storageMeter"><span id="storageBar"></span></div><p id="storageText">—</p></div>';

    document.getElementById("topbar").innerHTML =
        '<form class="top-search" id="topSearch">' + icon("search") +
        '<input type="search" id="topSearchInput" placeholder="Search files..." aria-label="Search files"></form>' +
        '<div class="profile">' +
        '<button class="profile-btn" id="profileBtn" type="button"><span class="avatar" id="avatar"></span><span id="userName"></span>' + icon("chevron", "i-sm") + "</button>" +
        '<div class="profile-menu" id="profileMenu" hidden><strong id="menuName"></strong><small id="menuEmail"></small>' +
        '<button class="btn btn-ghost btn-sm" id="logoutBtn" type="button">Log out</button></div>' +
        "</div>";

    // User info (textContent, so names can't inject HTML)
    document.getElementById("avatar").textContent = userName.charAt(0).toUpperCase();
    document.getElementById("userName").textContent = userName;
    document.getElementById("menuName").textContent = userName;
    document.getElementById("menuEmail").textContent = userEmail;

    // Profile dropdown
    const menu = document.getElementById("profileMenu");
    document.getElementById("profileBtn").addEventListener("click", function (e) {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", function (e) {
        if (!menu.contains(e.target)) menu.hidden = true;
    });
    document.getElementById("logoutBtn").addEventListener("click", logout);

    // Top search: jump to the Documents page with the search filled in
    document.getElementById("topSearch").addEventListener("submit", function (e) {
        e.preventDefault();
        const q = document.getElementById("topSearchInput").value.trim();
        window.location.href = "documents.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    });

    // Toast element used by showMessage()
    if (!document.getElementById("toast")) {
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.id = "toast";
        document.body.appendChild(toast);
    }
})();

// ===== API helper: adds the JWT and handles expired logins =====
function authHeader() {
    return { "Authorization": "Bearer " + token };
}

async function api(url, options) {
    options = options || {};
    options.headers = Object.assign({}, options.headers, authHeader());
    const response = await fetch(url, options);
    // Expired or invalid token: the server answers 401/403
    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Session expired");
    }
    return response;
}

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "index.html";
}

// ===== Toast message (top-right) =====
let toastTimer;
function showMessage(text, type) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.className = "toast show " + (type || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.className = "toast " + (type || "");
    }, 3200);
}

// ===== Formatters =====
function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function getExtension(fileName) {
    return fileName.includes(".") ? fileName.split(".").pop().toLowerCase() : "file";
}

const IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
const DOC_EXT = ["pdf", "doc", "docx", "txt", "md", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"];

// Colored badge class for a file extension
function badgeClass(ext) {
    if (ext === "pdf") return "pdf";
    if (["doc", "docx", "rtf", "odt"].includes(ext)) return "doc";
    if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
    if (["ppt", "pptx"].includes(ext)) return "slide";
    if (IMAGE_EXT.includes(ext)) return "image";
    if (["zip", "rar", "7z"].includes(ext)) return "zip";
    if (["txt", "md"].includes(ext)) return "txt";
    return "";
}

function fileBadge(fileName) {
    const ext = getExtension(fileName);
    const badge = document.createElement("span");
    badge.className = "file-badge " + badgeClass(ext);
    badge.textContent = ext.toUpperCase().slice(0, 4);
    return badge;
}

// Small icon button helper
function iconButton(iconName, title, extraClass, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-btn " + (extraClass || "");
    button.title = title;
    button.innerHTML = icon(iconName);
    button.addEventListener("click", onClick);
    return button;
}

// ===== Storage meter in the sidebar =====
async function loadStorage() {
    try {
        const response = await api("/api/documents/storage");
        const s = await response.json();
        const percent = s.quota ? Math.min(100, (s.used / s.quota) * 100) : 0;
        document.getElementById("storageBar").style.width = Math.max(percent, s.used ? 2 : 0) + "%";
        document.getElementById("storageMeter").classList.toggle("warn", percent > 85);
        document.getElementById("storageText").textContent = formatSize(s.used) + " / " + formatSize(s.quota);
        return s;
    } catch (err) {
        return null;
    }
}

loadStorage();
