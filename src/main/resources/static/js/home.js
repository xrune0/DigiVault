// Home page: greeting, rotating tips and the four stat cards
// Login check, sidebar, api(), formatSize() etc. come from common.js

// ===== Greeting based on the time of day =====
const hour = new Date().getHours();
const partOfDay = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
document.getElementById("greeting").textContent = partOfDay + ", " + userName.split(" ")[0] + "! ✨";

// ===== Rotating tips =====
const TIPS = [
    "\"Organised files make a calmer mind.\"",
    "\"Star important files to find them faster.\"",
    "\"Use the sparkle button to get an AI summary of any PDF or Word file.\""
];
let tipIndex = 0;

function showTip(i) {
    tipIndex = (i + TIPS.length) % TIPS.length;
    document.getElementById("tipText").textContent = TIPS[tipIndex];
    document.getElementById("tipCount").textContent = (tipIndex + 1) + "/" + TIPS.length;
}

document.getElementById("tipPrev").addEventListener("click", function () { showTip(tipIndex - 1); });
document.getElementById("tipNext").addEventListener("click", function () { showTip(tipIndex + 1); });
showTip(0);
setInterval(function () { showTip(tipIndex + 1); }, 8000);

// ===== Stats =====
async function loadStats() {
    try {
        const [docsResponse, bookmarksResponse, storage] = await Promise.all([
            api("/api/documents"),
            api("/api/bookmarks"),
            loadStorage()
        ]);
        const documents = await docsResponse.json();
        const bookmarks = await bookmarksResponse.json();

        const starred = documents.filter(function (d) { return d.starred; }).length
            + bookmarks.filter(function (b) { return b.starred; }).length;

        document.getElementById("statDocs").textContent = documents.length;
        document.getElementById("statStorage").textContent = storage ? formatSize(storage.used) : "—";
        document.getElementById("statStarred").textContent = starred;
        document.getElementById("statBookmarks").textContent = bookmarks.length;
    } catch (err) {
        showMessage("Could not load your stats", "error");
    }
}

loadStats();
