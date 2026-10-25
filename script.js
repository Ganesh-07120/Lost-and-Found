/*
 * Lost & Found Management System
 * Frontend demo using localStorage. Not suitable for real passwords or production data.
 */

const STORAGE_KEYS = {
    items: "lf_items_v2",
    claims: "lf_claims_v2",
    notifications: "lf_notifications_v2",
    users: "lf_users_v2",
    currentUser: "lf_current_user_v2",
    theme: "lf_theme_v2"
};

function readStore(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Could not read ${key}`, error);
        return fallback;
    }
}

function writeStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        alert("Browser storage is full. Try removing large images or old reports.");
        return false;
    }
}

function getItems() { return readStore(STORAGE_KEYS.items); }
function saveItems(items) { return writeStore(STORAGE_KEYS.items, items); }
function getClaims() { return readStore(STORAGE_KEYS.claims); }
function saveClaims(claims) { return writeStore(STORAGE_KEYS.claims, claims); }
function getNotifications() { return readStore(STORAGE_KEYS.notifications); }
function saveNotifications(notifications) { return writeStore(STORAGE_KEYS.notifications, notifications); }
function currentUser() { return readStore(STORAGE_KEYS.currentUser, null); }
function isAdmin() { return currentUser()?.role === "admin"; }
function safeText(value) { return String(value ?? ""); }
function makeId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function formatDate(value) {
    if (!value) return "Date not provided";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function createNotification({ recipient, title, message, itemId = null, claimId = null }) {
    const notifications = getNotifications();
    notifications.unshift({
        id: makeId("notification"),
        recipient,
        title,
        message,
        itemId,
        claimId,
        createdAt: new Date().toISOString(),
        read: false
    });
    saveNotifications(notifications);
}

function notifyAdmins(title, message, itemId, claimId) {
    const users = readStore(STORAGE_KEYS.users);
    const admins = [{ username: "admin", role: "admin" }, ...users.filter(user => user.role === "admin")];
    const uniqueNames = [...new Set(admins.map(user => user.username))];
    uniqueNames.forEach(username => createNotification({ recipient: username, title, message, itemId, claimId }));
}

function addThemeControl() {
    const navLinks = document.querySelector(".nav-links");

    if (navLinks && !navLinks.querySelector('a[href="notifications.html"]')) {
        const notificationLink = document.createElement("a");
        notificationLink.href = "notifications.html";
        notificationLink.appendChild(document.createTextNode("Notifications "));
        const badge = document.createElement("span");
        badge.id = "notificationBadge";
        badge.className = "notification-badge";
        notificationLink.appendChild(badge);
        navLinks.appendChild(notificationLink);
    }

    if (navLinks && !navLinks.querySelector('a[href="profile.html"]')) {
        const profileLink = document.createElement("a");
        profileLink.href = "profile.html";
        profileLink.textContent = "Profile";
        navLinks.appendChild(profileLink);
    }

    if (document.querySelector(".theme-toggle")) return;

    const themeButton = document.createElement("button");
    themeButton.className = navLinks ? "theme-toggle" : "theme-toggle theme-toggle-floating";
    themeButton.type = "button";
    themeButton.id = "themeToggle";
    themeButton.setAttribute("aria-label", "Switch color theme");
    (navLinks || document.body).appendChild(themeButton);

    function updateThemeButton() {
        const isDark = document.documentElement.dataset.theme === "dark";
        themeButton.textContent = isDark ? "☀ Light mode" : "☾ Dark mode";
    }

    themeButton.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
        updateThemeButton();
    });

    updateThemeButton();
}

function setupNavigation() {
    const toggle = document.getElementById("menuToggle");
    const links = document.getElementById("navLinks");
    if (toggle && links) {
        toggle.addEventListener("click", () => {
            const isOpen = links.classList.toggle("open");
            toggle.setAttribute("aria-expanded", String(isOpen));
        });
    }

    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(link => {
        if (link.getAttribute("href") === path) link.classList.add("active");
    });

    const user = currentUser();
    const welcome = document.getElementById("welcomeUser");
    if (welcome && user) {
        const registeredUser = readStore(STORAGE_KEYS.users).find(entry => entry.username === user.username);
        welcome.textContent = registeredUser?.fullName || user.fullName || user.username;
    }

    const badge = document.getElementById("notificationBadge");
    if (badge && user) {
        const unread = getNotifications().filter(note => note.recipient === user.username && !note.read).length;
        badge.textContent = unread ? String(unread) : "";
        badge.hidden = !unread;
    }
}

function setupAuth() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", event => {
            event.preventDefault();
            const role = document.getElementById("loginRole").value;
            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const error = document.getElementById("loginError");
            const users = readStore(STORAGE_KEYS.users);

            let matchedUser = null;
            if (role === "admin" && username.toLowerCase() === "admin" && password === "12345") {
                matchedUser = { username: "admin", role: "admin" };
            } else if (role === "user" && username.toLowerCase() === "student" && password === "12345") {
                matchedUser = { username: "student", role: "user" };
            } else {
                matchedUser = users.find(user => user.username.toLowerCase() === username.toLowerCase()
                    && user.password === password && user.role === role) || null;
            }

            if (!matchedUser) {
                error.textContent = "Login details not found. Check your role, username and password.";
                return;
            }

            writeStore(STORAGE_KEYS.currentUser, { username: matchedUser.username, role: matchedUser.role });
            location.href = matchedUser.role === "admin" ? "index.html" : "user.html";
        });
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", event => {
            event.preventDefault();
            const fullName = document.getElementById("signupFullName").value.trim();
            const studentId = document.getElementById("signupStudentId").value.trim();
            const email = document.getElementById("signupEmail").value.trim().toLowerCase();
            const course = document.getElementById("signupCourse").value.trim();
            const department = document.getElementById("signupDepartment").value.trim();
            const phone = document.getElementById("signupPhone").value.trim();
            const username = document.getElementById("signupUsername").value.trim();
            const password = document.getElementById("signupPassword").value;
            const confirmPassword = document.getElementById("signupConfirm").value;
            const message = document.getElementById("signupMessage");
            const users = readStore(STORAGE_KEYS.users);

            if (fullName.length < 2) {
                message.textContent = "Please enter your full name.";
                return;
            }
            if (!studentId || !course || !department || !email) {
                message.textContent = "Please complete all required student details.";
                return;
            }
            if (users.some(user => user.email && user.email.toLowerCase() === email)) {
                message.textContent = "An account with this email is already registered.";
                return;
            }
            if (users.some(user => user.studentId && user.studentId.toLowerCase() === studentId.toLowerCase())) {
                message.textContent = "This student / roll number is already registered.";
                return;
            }
            if (username.length < 3) {
                message.textContent = "Username must be at least 3 characters.";
                return;
            }
            if (password.length < 4) {
                message.textContent = "Password must be at least 4 characters.";
                return;
            }
            if (password !== confirmPassword) {
                message.textContent = "Passwords do not match.";
                return;
            }
            if (username.toLowerCase() === "admin" || users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
                message.textContent = "That username is already taken.";
                return;
            }

            users.push({
                fullName,
                studentId,
                email,
                course,
                department,
                phone,
                username,
                password,
                role: "user",
                registeredAt: new Date().toISOString()
            });
            if (writeStore(STORAGE_KEYS.users, users)) {
                message.textContent = "Account created! Redirecting to login…";
                signupForm.reset();
                setTimeout(() => { location.href = "login.html"; }, 700);
            }
        });
    }
}

function logoutUser() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    location.href = "login.html";
}
window.logoutUser = logoutUser;

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        preview.replaceChildren();
        if (!file) {
            preview.textContent = "No image selected";
            return;
        }
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            input.value = "";
            preview.textContent = "No image selected";
            return;
        }
        if (file.size > 500 * 1024) {
            alert("Please select an image under 500 KB to avoid filling browser storage.");
            input.value = "";
            preview.textContent = "No image selected";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const image = document.createElement("img");
            image.src = reader.result;
            image.alt = "Selected item preview";
            preview.appendChild(image);
        };
        reader.readAsDataURL(file);
    });
}

function setupReportForm(type) {
    const isLost = type === "Lost";
    const form = document.getElementById(isLost ? "lostForm" : "foundForm");
    if (!form) return;

    const fields = isLost
        ? { name: "itemName", category: "category", location: "location", date: "dateLost", image: "itemImage", description: "description", contact: "contact", message: "lostMessage", preview: "imagePreview" }
        : { name: "foundItemName", category: "foundCategory", location: "foundLocation", date: "dateFound", image: "foundItemImage", description: "foundDescription", contact: "foundContact", message: "foundMessage", preview: "foundImagePreview" };

    setupImagePreview(fields.image, fields.preview);
    const dateInput = document.getElementById(fields.date);
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

    form.addEventListener("submit", event => {
        event.preventDefault();
        const message = document.getElementById(fields.message);
        const file = document.getElementById(fields.image).files?.[0];

        const buildReport = image => {
            const user = currentUser();
            const report = {
                id: makeId("item"),
                type,
                name: document.getElementById(fields.name).value.trim(),
                category: document.getElementById(fields.category).value,
                location: document.getElementById(fields.location).value.trim(),
                date: document.getElementById(fields.date).value,
                description: document.getElementById(fields.description).value.trim(),
                contact: document.getElementById(fields.contact).value.trim(),
                image: image || "",
                owner: user?.username || "guest",
                status: "Open",
                createdAt: new Date().toISOString()
            };
            const items = getItems();
            items.unshift(report);
            if (!saveItems(items)) return;
            notifyAdmins(`${type} report added`, `${report.name} was reported by ${report.owner}.`, report.id);
            message.textContent = "Report submitted successfully! You can view it on the items page.";
            form.reset();
            const preview = document.getElementById(fields.preview);
            preview.replaceChildren(document.createTextNode("No image selected"));
            if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
            updateHomeStats();
        };

        if (file) {
            if (file.size > 500 * 1024) {
                alert("Please choose an image smaller than 500 KB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => buildReport(reader.result);
            reader.onerror = () => { alert("The image could not be read. Try another image."); };
            reader.readAsDataURL(file);
        } else {
            buildReport("");
        }
    });
}

function createStatusBadge(item) {
    const badge = document.createElement("span");
    badge.className = "status-pill";
    if (item.status === "Resolved") badge.classList.add("status-resolved");
    else if (item.type === "Found") badge.classList.add("status-found");
    badge.textContent = item.status === "Resolved" ? "Resolved" : `${item.type} · Open`;
    return badge;
}

function makeButton(label, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
}

function createItemCard(item, options = {}) {
    const card = document.createElement("article");
    card.className = "item-card";
    card.appendChild(createStatusBadge(item));

    if (item.image) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.name;
        image.loading = "lazy";
        card.appendChild(image);
    }

    const title = document.createElement("h3");
    title.textContent = item.name;
    card.appendChild(title);

    const details = [
        ["Category", item.category],
        [item.type === "Lost" ? "Lost at" : "Found at", item.location],
        ["Date", formatDate(item.date)],
        ["Description", item.description]
    ];
    details.forEach(([label, value]) => {
        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;
        paragraph.append(strong, document.createTextNode(safeText(value)));
        card.appendChild(paragraph);
    });

    const owner = document.createElement("p");
    owner.className = "item-meta";
    owner.textContent = `Reported by ${item.owner || "guest"} · ${new Date(item.createdAt || Date.now()).toLocaleDateString()}`;
    card.appendChild(owner);

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const user = currentUser();

    if (item.status !== "Resolved" && item.owner !== user?.username && user?.role !== "admin") {
        actions.appendChild(makeButton("Claim item", "claim-btn", () => submitClaim(item)));
    }

    if (options.manage) {
        if (item.status !== "Resolved") {
            actions.appendChild(makeButton("Mark resolved", "resolve-btn", () => resolveItem(item.id)));
        }
        actions.appendChild(makeButton("Delete report", "delete-btn", () => deleteItem(item.id)));
    }

    if (actions.children.length) card.appendChild(actions);
    return card;
}

function showEmpty(container, message) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = message;
    container.appendChild(empty);
}

function renderItemsPage() {
    const container = document.getElementById("itemsList");
    if (!container) return;
    const search = (document.getElementById("searchInput")?.value || "").trim().toLowerCase();
    const type = document.getElementById("typeFilter")?.value || "All";
    const items = getItems().filter(item => {
        const searchable = [item.name, item.category, item.location, item.description, item.type, item.owner].join(" ").toLowerCase();
        return searchable.includes(search) && (type === "All" || item.type === type);
    });
    container.replaceChildren();
    if (!items.length) {
        showEmpty(container, getItems().length ? "No reports match your search." : "No reports yet. Add the first lost or found report!");
        return;
    }
    items.forEach(item => container.appendChild(createItemCard(item)));
}

function submitClaim(item) {
    const user = currentUser();
    if (!user) {
        alert("Please log in or create a user account before claiming an item.");
        location.href = "login.html";
        return;
    }
    const details = prompt("To help the admin verify your claim, describe a detail only the real owner may know:");
    if (!details || !details.trim()) return;

    const claims = getClaims();
    if (claims.some(claim => claim.itemId === item.id && claim.claimant === user.username && claim.status === "Pending")) {
        alert("You already have a pending claim for this item.");
        return;
    }

    const claim = {
        id: makeId("claim"),
        itemId: item.id,
        itemName: item.name,
        claimant: user.username,
        details: details.trim(),
        status: "Pending",
        createdAt: new Date().toISOString()
    };
    claims.unshift(claim);
    if (!saveClaims(claims)) return;

    createNotification({ recipient: user.username, title: "Claim submitted", message: `Your claim for “${item.name}” is waiting for admin review.`, itemId: item.id, claimId: claim.id });
    createNotification({ recipient: item.owner, title: "A claim was submitted", message: `${user.username} submitted a claim for “${item.name}”.`, itemId: item.id, claimId: claim.id });
    notifyAdmins("Claim needs review", `${user.username} wants to claim “${item.name}”.`, item.id, claim.id);
    alert("Claim submitted! You can track the update in Notifications.");
    renderItemsPage();
}

function resolveItem(itemId) {
    const items = getItems();
    const item = items.find(entry => entry.id === itemId);
    if (!item) return;
    item.status = "Resolved";
    item.resolvedAt = new Date().toISOString();
    if (!saveItems(items)) return;
    createNotification({ recipient: item.owner, title: "Report marked resolved", message: `Your report for “${item.name}” was marked resolved.`, itemId });
    renderManagePage();
    updateHomeStats();
}

function deleteItem(itemId) {
    if (!confirm("Delete this report? Related claims will remain in the history.")) return;
    const items = getItems();
    const item = items.find(entry => entry.id === itemId);
    if (!saveItems(items.filter(entry => entry.id !== itemId))) return;
    if (item) createNotification({ recipient: item.owner, title: "Report deleted", message: `Your report for “${item.name}” was deleted by the administrator.`, itemId });
    renderManagePage();
    updateHomeStats();
}

function reviewClaim(claimId, decision) {
    const claims = getClaims();
    const claim = claims.find(entry => entry.id === claimId);
    if (!claim || claim.status !== "Pending") return;
    claim.status = decision;
    claim.reviewedAt = new Date().toISOString();
    if (!saveClaims(claims)) return;

    createNotification({
        recipient: claim.claimant,
        title: decision === "Approved" ? "Claim approved" : "Claim not approved",
        message: decision === "Approved"
            ? `Your claim for “${claim.itemName}” was approved. Please coordinate the return with the reporter.`
            : `Your claim for “${claim.itemName}” was not approved. Please contact the admin if you need clarification.`,
        itemId: claim.itemId,
        claimId: claim.id
    });

    if (decision === "Approved") {
        const items = getItems();
        const item = items.find(entry => entry.id === claim.itemId);
        if (item) {
            item.status = "Resolved";
            item.claimant = claim.claimant;
            item.resolvedAt = new Date().toISOString();
            saveItems(items);
            createNotification({ recipient: item.owner, title: "Claim approved", message: `Admin approved ${claim.claimant}'s claim for “${item.name}”. Please coordinate the return.`, itemId: item.id, claimId: claim.id });
        }
    }

    renderManagePage();
    updateHomeStats();
}

function renderManagePage() {
    const container = document.getElementById("manageList");
    if (!container) return;
    if (!isAdmin()) {
        container.replaceChildren();
        showEmpty(container, "Admin access is required to manage reports. Demo admin: admin / 12345.");
        return;
    }
    const items = getItems();
    container.replaceChildren();
    if (!items.length) showEmpty(container, "No reports to manage yet.");
    items.forEach(item => container.appendChild(createItemCard(item, { manage: true })));

    const main = document.querySelector(".items-container");
    let section = document.getElementById("claimsSection");
    if (!section && main) {
        section = document.createElement("section");
        section.className = "claims-section";
        section.id = "claimsSection";
        section.innerHTML = '<h2>Claim requests</h2><p class="results-note">Review claim details before approving a return.</p><div id="claimsList" class="item-grid"></div>';
        container.after(section);
    }
    const claimsContainer = document.getElementById("claimsList");
    if (!claimsContainer) return;
    claimsContainer.replaceChildren();
    const claims = getClaims();
    if (!claims.length) showEmpty(claimsContainer, "No claim requests yet.");

    claims.forEach(claim => {
        const card = document.createElement("article");
        card.className = "item-card";
        const badge = document.createElement("span");
        badge.className = `status-pill ${claim.status === "Approved" ? "status-approved" : claim.status === "Rejected" ? "status-rejected" : "status-pending"}`;
        badge.textContent = claim.status;
        card.appendChild(badge);
        const title = document.createElement("h3");
        title.textContent = claim.itemName;
        card.appendChild(title);
        [["Claimant", claim.claimant], ["Verification detail", claim.details], ["Submitted", new Date(claim.createdAt).toLocaleString()]].forEach(([label, value]) => {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = `${label}: `;
            paragraph.append(strong, document.createTextNode(safeText(value)));
            card.appendChild(paragraph);
        });
        if (claim.status === "Pending") {
            const actions = document.createElement("div");
            actions.className = "card-actions";
            actions.appendChild(makeButton("Approve claim", "approve-btn", () => reviewClaim(claim.id, "Approved")));
            actions.appendChild(makeButton("Reject claim", "reject-btn", () => reviewClaim(claim.id, "Rejected")));
            card.appendChild(actions);
        }
        claimsContainer.appendChild(card);
    });
}

function renderNotificationsPage() {
    const container = document.getElementById("notificationsList");
    if (!container) return;
    const user = currentUser();
    if (!user) {
        container.replaceChildren();
        showEmpty(container, "Log in to view notifications. Demo user: student / 12345.");
        return;
    }

    const notifications = getNotifications();
    const mine = notifications.filter(note => note.recipient === user.username);
    container.replaceChildren();
    if (!mine.length) {
        showEmpty(container, "You're all caught up. Updates about your reports and claims will appear here.");
        return;
    }

    mine.forEach(note => {
        const card = document.createElement("article");
        card.className = `notification-card ${note.read ? "" : "unread"}`;
        const title = document.createElement("h3");
        title.textContent = note.title;
        const message = document.createElement("p");
        message.textContent = note.message;
        const date = document.createElement("small");
        date.textContent = new Date(note.createdAt).toLocaleString();
        card.append(title, message, date);
        if (!note.read) {
            card.appendChild(makeButton("Mark as read", "secondary-btn", () => {
                const all = getNotifications();
                const target = all.find(entry => entry.id === note.id);
                if (target) target.read = true;
                saveNotifications(all);
                renderNotificationsPage();
                setupNavigation();
            }));
        }
        container.appendChild(card);
    });
}

function setupNotificationControls() {
    const clearButton = document.getElementById("clearNotifications");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            const user = currentUser();
            if (!user) return;
            const remaining = getNotifications().filter(note => note.recipient !== user.username);
            saveNotifications(remaining);
            renderNotificationsPage();
            setupNavigation();
        });
    }
}

function renderUserReports() {
    const container = document.getElementById("myReportsList");
    if (!container) return;
    const user = currentUser();
    const items = getItems().filter(item => item.owner === (user?.username || "guest"));
    container.replaceChildren();
    if (!items.length) showEmpty(container, "You haven't submitted any reports yet.");
    items.forEach(item => container.appendChild(createItemCard(item)));
}

function setupProfile() {
    const form = document.getElementById("profileForm");
    if (!form) return;
    const user = currentUser();
    const username = document.getElementById("profileUsername");
    const role = document.getElementById("profileRole");
    const message = document.getElementById("profileMessage");
    if (user) {
        username.value = user.username;
        role.value = user.role;
    } else {
        message.textContent = "Log in to manage your profile.";
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        const activeUser = currentUser();
        if (!activeUser) return;
        const nextName = username.value.trim();
        if (nextName.length < 3) {
            message.textContent = "Username must be at least 3 characters.";
            return;
        }
        const users = readStore(STORAGE_KEYS.users);
        if (users.some(entry => entry.username.toLowerCase() === nextName.toLowerCase() && entry.username !== activeUser.username)) {
            message.textContent = "That username is already in use.";
            return;
        }
        const oldName = activeUser.username;
        const userRecord = users.find(entry => entry.username === oldName);
        if (userRecord) userRecord.username = nextName;
        writeStore(STORAGE_KEYS.users, users);
        writeStore(STORAGE_KEYS.currentUser, { username: nextName, role: activeUser.role });
        saveItems(getItems().map(item => item.owner === oldName ? { ...item, owner: nextName } : item));
        saveClaims(getClaims().map(claim => claim.claimant === oldName ? { ...claim, claimant: nextName } : claim));
        saveNotifications(getNotifications().map(note => note.recipient === oldName ? { ...note, recipient: nextName } : note));
        message.textContent = "Profile updated successfully.";
        setupNavigation();
    });
}

function updateHomeStats() {
    const items = getItems();
    const total = document.getElementById("totalCount");
    const lost = document.getElementById("lostCount");
    const found = document.getElementById("foundCount");
    if (total) total.textContent = String(items.length);
    if (lost) lost.textContent = String(items.filter(item => item.type === "Lost" && item.status !== "Resolved").length);
    if (found) found.textContent = String(items.filter(item => item.type === "Found" && item.status !== "Resolved").length);
}

function setupHomeSearch() {
    const input = document.getElementById("homeSearch");
    if (!input) return;
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            sessionStorage.setItem("lf_search_query", input.value.trim());
            location.href = "items.html";
        }
    });
}

function applyTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
    document.documentElement.dataset.theme = savedTheme;
}

function initApp() {
    applyTheme();
    addThemeControl();
    setupNavigation();
    setupAuth();
    setupReportForm("Lost");
    setupReportForm("Found");
    setupNotificationControls();
    setupProfile();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        const savedQuery = sessionStorage.getItem("lf_search_query");
        if (savedQuery) {
            searchInput.value = savedQuery;
            sessionStorage.removeItem("lf_search_query");
        }
        searchInput.addEventListener("input", renderItemsPage);
    }
    document.getElementById("typeFilter")?.addEventListener("change", renderItemsPage);

    renderItemsPage();
    renderManagePage();
    renderNotificationsPage();
    renderUserReports();
    updateHomeStats();
    setupHomeSearch();
}

document.addEventListener("DOMContentLoaded", initApp);
