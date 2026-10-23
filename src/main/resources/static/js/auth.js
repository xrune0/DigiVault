// Handles login (index.html) and registration (register.html)

const API_URL = "/api/auth";

function showMessage(text, type) {
    const message = document.getElementById("message");
    message.textContent = text;
    message.className = "message " + type;
}

// Disable the button and show a loading text while the request runs
function setLoading(button, loading, text) {
    button.disabled = loading;
    button.textContent = text;
}

// "Remember me" keeps the login in localStorage (survives closing the browser);
// otherwise it goes in sessionStorage (cleared when the browser closes)
function saveAndRedirect(data, remember) {
    localStorage.clear();
    sessionStorage.clear();
    const store = remember ? localStorage : sessionStorage;
    store.setItem("token", data.token);
    store.setItem("name", data.name);
    store.setItem("email", data.email);
    window.location.href = "dashboard.html";
}

// If already logged in, skip the login/register page
if (localStorage.getItem("token") || sessionStorage.getItem("token")) {
    window.location.href = "dashboard.html";
}

// Show / hide password (eye button)
document.querySelectorAll(".eye").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(button.dataset.target);
        input.type = input.type === "password" ? "text" : "password";
        button.title = input.type === "password" ? "Show password" : "Hide password";
    });
});

// ===== Login =====
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const button = loginForm.querySelector("button[type=submit]");
        setLoading(button, true, "Signing in...");

        const body = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch(API_URL + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (response.ok) {
                showMessage("Login successful! Redirecting...", "success");
                saveAndRedirect(data, document.getElementById("remember").checked);
            } else {
                showMessage(data.message || "Login failed", "error");
            }
        } catch (err) {
            showMessage("Could not connect to server", "error");
        }
        setLoading(button, false, "Sign In →");
    });
}

// ===== Register =====
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const button = registerForm.querySelector("button[type=submit]");
        setLoading(button, true, "Creating account...");

        const body = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch(API_URL + "/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (response.ok) {
                showMessage("Account created! Redirecting...", "success");
                saveAndRedirect(data, true);
            } else {
                showMessage(data.message || "Registration failed", "error");
            }
        } catch (err) {
            showMessage("Could not connect to server", "error");
        }
        setLoading(button, false, "Create Account →");
    });
}
