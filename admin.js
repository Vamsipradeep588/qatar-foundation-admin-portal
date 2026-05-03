

// ================= API =================
const API_BASE = "http://127.0.0.1:5000/api";
// ================= STATE =================
const captchas = {
    login: "",
    signup: "",
    forgot: ""
};

// ================= HELPERS =================
function $(id) {
    return document.getElementById(id);
}

function showToast(msg) {
    const toast = $("toast");
    const toastMsg = $("toastMsg");

    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearErrors() {
    document.querySelectorAll(".error-msg")
        .forEach(el => el.classList.remove("show"));

    document.querySelectorAll("input")
        .forEach(el => el.classList.remove("error"));
}

function showError(id, msg = null) {
    const el = $(id);
    if (!el) return;

    const span = el.querySelector("span");

    if (msg && span) span.textContent = msg;

    el.classList.add("show");
}

// ================= CAPTCHA =================
function generateCaptcha(type) {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    let code = "";

    for (let i = 0; i < 5; i++) {
        code += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );
    }

    captchas[type] = code;

    const el = $(type + "CaptchaText");
    if (el) el.textContent = code;
}

// ================= PAGE =================
function showPage(pageId) {
    document.querySelectorAll(".form-page")
        .forEach(page => page.classList.remove("active"));

    const page = $(pageId);
    if (page) page.classList.add("active");

    clearErrors();
}

function showDashboard(name = "Admin") {
    const auth = $("authWrapper");
    const dash = $("dashboardWrapper");

    if (auth) auth.style.display = "none";

    if (dash) {
        dash.style.display = "flex";
        dash.classList.add("active");
    }

    document.body.style.alignItems = "stretch";

    const dashName = $("dashName");
    const dashAvatar = $("dashAvatar");

    if (dashName) dashName.textContent = name;

    if (dashAvatar) {
        const initials = name
            .split(" ")
            .map(x => x[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();

        dashAvatar.textContent = initials;
    }

    showToast("Welcome " + name);

    if (typeof loadOpportunities === "function") {
        loadOpportunities();
    }
}

// ================= PASSWORD =================
function togglePass(id) {
    const input = $(id);
    if (!input) return;

    input.type =
        input.type === "password"
            ? "text"
            : "password";
}

function checkStrength(password) {
    const bars = [
        $("str1"),
        $("str2"),
        $("str3"),
        $("str4")
    ];

    const label = $("strengthLabel");

    bars.forEach(bar => {
        if (bar) {
            bar.className = "strength-bar";
        }
    });

    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const classes = [
        "",
        "weak",
        "medium",
        "strong",
        "very-strong"
    ];

    for (let i = 0; i < score; i++) {
        if (bars[i]) {
            bars[i].classList.add(classes[score]);
        }
    }

    const labels = [
        "",
        "Weak",
        "Medium",
        "Strong",
        "Very Strong"
    ];

    if (label) {
        label.textContent = labels[score];
    }
}

// ================= SESSION =================
async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/me`, {
            credentials: "include"
        });

        if (!res.ok) return;

        const data = await res.json();
        showDashboard(data.admin.name);

    } catch (err) {
        console.log("No session");
    }
}

// ================= LOGIN =================
$("loginForm")?.addEventListener(
    "submit",
    async function(e) {
        e.preventDefault();
        clearErrors();

        const email = $("loginEmail").value.trim();
        const password = $("loginPassword").value;
        const captcha = $("loginCaptchaInput").value.trim();
        const remember =
            document.querySelector(
                '#loginForm input[type="checkbox"]'
            )?.checked || false;

        if (!isValidEmail(email)) {
            showError("loginEmailErr");
            return;
        }

        if (!password) {
            showError("loginPasswordErr");
            return;
        }

        if (captcha !== captchas.login) {
            showError("loginCaptchaErr");
            generateCaptcha("login");
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE}/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        email,
                        password,
                        remember
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Login failed");
                generateCaptcha("login");
                return;
            }

            showToast("Login successful");

            setTimeout(() => {
                showDashboard(data.admin.name);
            }, 500);

        } catch (err) {
            showToast("Server connection failed");
        }
    }
);

// ================= SIGNUP =================
$("signupForm")?.addEventListener(
    "submit",
    async function(e) {
        e.preventDefault();
        clearErrors();

        const full_name = $("signupName").value.trim();
        const email = $("signupEmail").value.trim();
        const password = $("signupPassword").value;
        const confirm_password =
            $("signupConfirmPassword").value;
        const captcha =
            $("signupCaptchaInput").value.trim();

        if (!full_name) {
            showError("signupNameErr");
            return;
        }

        if (!isValidEmail(email)) {
            showError("signupEmailErr");
            return;
        }

        if (password.length < 8) {
            showError(
                "signupPasswordErr",
                "Password must be at least 8 characters"
            );
            return;
        }

        if (password !== confirm_password) {
            showError("signupConfirmPasswordErr");
            return;
        }

        if (captcha !== captchas.signup) {
            showError("signupCaptchaErr");
            generateCaptcha("signup");
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE}/signup`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        full_name,
                        email,
                        password,
                        confirm_password
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Signup failed");
                generateCaptcha("signup");
                return;
            }

            showToast("Signup successful");

            setTimeout(() => {
                showPage("loginPage");
            }, 700);

        } catch {
            showToast("Server connection failed");
        }
    }
);

// ================= FORGOT =================
$("forgotForm")?.addEventListener(
    "submit",
    async function(e) {
        e.preventDefault();
        clearErrors();

        const email = $("forgotEmail").value.trim();
        const captcha =
            $("forgotCaptchaInput").value.trim();

        if (!isValidEmail(email)) {
            showError("forgotEmailErr");
            return;
        }

        if (captcha !== captchas.forgot) {
            showError("forgotCaptchaErr");
            generateCaptcha("forgot");
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE}/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({ email })
                }
            );

            const data = await res.json();

            showToast(data.message);

            setTimeout(() => {
                showPage("loginPage");
            }, 900);

        } catch {
            showToast("Server connection failed");
        }
    }
);

// ================= LOGOUT =================
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/logout`, {
            credentials: "include"
        });
    } catch {}

    const dash = $("dashboardWrapper");
    const auth = $("authWrapper");

    if (dash) {
        dash.classList.remove("active");
        dash.style.display = "none";
    }

    if (auth) {
        auth.style.display = "flex";
    }

    document.body.style.alignItems = "center";

    showPage("loginPage");
    showToast("Logged out successfully");
}

// ================= SEARCH =================
function openSearch() {
    $("searchContainer")?.classList.add("active");
}

function closeSearch() {
    $("searchContainer")?.classList.remove("active");
}

// ================= NOTIFICATIONS =================
function toggleNotifications() {
    $("notificationDropdown")
        ?.classList.toggle("active");
}

function markAllRead() {
    document.querySelectorAll(".notif-item")
        .forEach(item =>
            item.classList.remove("unread")
        );

    showToast("All notifications marked as read");
}

// ================= THEME =================
function toggleTheme() {
    const current =
        document.body.getAttribute("data-theme");

    if (current === "dark") {
        document.body.removeAttribute("data-theme");
    } else {
        document.body.setAttribute(
            "data-theme",
            "dark"
        );
    }
}
// ================= OPPORTUNITY =================
let editingOpportunityId = null;

function openOpportunityModal(id = null) {
    editingOpportunityId = id;

    const modal = $("opportunityModal");
    if (!modal) return;

    modal.style.display = "flex";

    const form = $("opportunityForm");
    if (form) form.reset();

    if (id) {
        editOpportunity(id);
    }
}

function closeOpportunityModal() {
    const modal = $("opportunityModal");
    if (modal) modal.style.display = "none";

    editingOpportunityId = null;
}

async function loadOpportunities() {
    const grid = $("opportunities-grid");
    if (!grid) return;

    try {
        const res = await fetch(
            `${API_BASE}/opportunities`,
            {
                credentials: "include"
            }
        );

        if (!res.ok) {
            grid.innerHTML =
                "<p>Unable to load opportunities</p>";
            return;
        }

        const data = await res.json();

        renderOpportunities(data);

    } catch {
        grid.innerHTML =
            "<p>Server connection failed</p>";
    }
}

function renderOpportunities(data) {
    const grid = $("opportunities-grid");
    if (!grid) return;

    if (!data.length) {
        grid.innerHTML =
            "<p>No opportunities available.</p>";
        return;
    }

    grid.innerHTML = data.map(op => `
        <div class="opportunity-card">
            <h3>${op.opportunity_name}</h3>
            <p>${op.description}</p>
            <small>${op.category}</small>

            <div style="margin-top:12px;display:flex;gap:8px;">
                <button onclick="viewOpportunityDetails(${op.id})">
                    View
                </button>

                <button onclick="openOpportunityModal(${op.id})">
                    Edit
                </button>

                <button onclick="deleteOpportunity(${op.id})">
                    Delete
                </button>
            </div>
        </div>
    `).join("");
}

async function editOpportunity(id) {
    try {
        const res = await fetch(
            `${API_BASE}/opportunities/${id}`,
            {
                credentials: "include"
            }
        );

        const op = await res.json();

        $("oppName").value = op.opportunity_name;
        $("oppDuration").value = op.duration;
        $("oppStartDate").value = op.start_date;
        $("oppDescription").value = op.description;
        $("oppSkills").value = op.skills_to_gain;
        $("oppCategory").value = op.category;
        $("oppFuture").value =
            op.future_opportunities;
        $("oppMaxApplicants").value =
            op.maximum_applicants || "";

    } catch {
        showToast("Failed to load opportunity");
    }
}

async function deleteOpportunity(id) {
    if (!confirm("Delete this opportunity?")) return;

    try {
        const res = await fetch(
            `${API_BASE}/opportunities/${id}`,
            {
                method: "DELETE",
                credentials: "include"
            }
        );

        const data = await res.json();

        showToast(data.message);

        loadOpportunities();

    } catch {
        showToast("Delete failed");
    }
}

function viewOpportunityDetails(id) {
    showToast("Opportunity ID: " + id);
}

// submit
$("opportunityForm")?.addEventListener(
    "submit",
    async function(e) {
        e.preventDefault();

        const payload = {
            opportunity_name: $("oppName").value,
            duration: $("oppDuration").value,
            start_date: $("oppStartDate").value,
            description: $("oppDescription").value,
            skills_to_gain: $("oppSkills").value,
            category: $("oppCategory").value,
            future_opportunities: $("oppFuture").value,
            maximum_applicants:
                $("oppMaxApplicants").value
        };

        const method =
            editingOpportunityId ? "PUT" : "POST";

        const url = editingOpportunityId
            ? `${API_BASE}/opportunities/${editingOpportunityId}`
            : `${API_BASE}/opportunities`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type":
                        "application/json"
                },
                credentials: "include",
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Failed");
                return;
            }

            showToast(
                editingOpportunityId
                    ? "Updated successfully"
                    : "Added successfully"
            );

            closeOpportunityModal();
            loadOpportunities();

        } catch {
            showToast("Server connection failed");
        }
    }
);
// ================= NAVIGATION =================
document.querySelectorAll(".nav-item")
    .forEach(item => {
        item.addEventListener("click", function() {
            document
                .querySelectorAll(".nav-item")
                .forEach(nav =>
                    nav.classList.remove("active")
                );

            this.classList.add("active");

            const page =
                this.getAttribute("data-page");

            const title = $("pageTitle");

            if (title && page) {
                title.textContent =
                    page.charAt(0).toUpperCase() +
                    page.slice(1);
            }
        });
    });

// ================= CLOSE DROPDOWNS =================
document.addEventListener("click", function(e) {
    const notif = $("notificationDropdown");
    const btn = $("notifBtn");

    if (
        notif &&
        btn &&
        !notif.contains(e.target) &&
        !btn.contains(e.target)
    ) {
        notif.classList.remove("active");
    }
});

// ================= INIT =================
window.addEventListener(
    "DOMContentLoaded",
    () => {
        generateCaptcha("login");
        generateCaptcha("signup");
        generateCaptcha("forgot");
        checkSession();
    }
);