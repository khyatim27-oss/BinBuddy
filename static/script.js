// ==========================================
// BINBUDDY - MAIN JAVASCRIPT
// ==========================================

// Safe browser storage helpers
function loadData(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function saveData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        showToast("Browser storage is unavailable. Changes may not persist.");
    }
}

let reports = loadData("binbuddy_reports", []);
let completedChallenges = loadData("binbuddy_challenges", []);
let toastTimer;

// ==========================================
// NAVIGATION
// ==========================================

const pageNames = {
    home: "Overview",
    report: "Report Waste",
    complaints: "Track Complaints",
    scanner: "AI Waste Scanner",
    assistant: "AI Assistant",
    calculator: "Impact Calculator",
    reports: "Progress & Reports",
    community: "Community"
};

function showPage(pageName) {
    const target = document.getElementById("page-" + pageName);

    if (!target) return;

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    document.getElementById("breadcrumbPage").textContent =
        pageNames[pageName] || "Overview";

    document.querySelector(".sidebar").classList.remove("open");

    if (pageName === "home") renderHome();
    if (pageName === "complaints") renderComplaints();
    if (pageName === "reports") renderAnalytics();
    if (pageName === "community") renderChallenges();

    window.scrollTo({ top: 0, behavior: "smooth" });

    refreshIcons();
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("open");
}

// Close the mobile sidebar if the user clicks outside it
document.addEventListener("click", function (event) {
    const sidebar = document.querySelector(".sidebar");
    const menuButton = document.querySelector(".mobile-menu");

    if (
        window.innerWidth <= 760 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        sidebar.classList.remove("open");
    }
});

// ==========================================
// ICONS, DATE AND TOAST
// ==========================================

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function updateDate() {
    document.getElementById("todayDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

// Escape user-entered text before displaying it as HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function makeId() {
    return "BB-" + Date.now().toString(36).toUpperCase() +
        "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatDate(value) {
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function statusClass(status) {
    if (status === "Resolved") return "status-resolved";
    if (status === "In Progress") return "status-progress";
    return "status-submitted";
}

function statusIcon(type) {
    if (type.toLowerCase().includes("bin")) return "trash-2";
    if (type.toLowerCase().includes("dump")) return "alert-triangle";
    if (type.toLowerCase().includes("street")) return "map-pin";
    return "recycle";
}

// ==========================================
// DASHBOARD OVERVIEW
// ==========================================

function renderHome() {
    const total = reports.length;
    const pending = reports.filter(
        report => report.status !== "Resolved"
    ).length;

    const resolved = reports.filter(
        report => report.status === "Resolved"
    ).length;

    document.getElementById("statReports").textContent = total;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statResolved").textContent = resolved;
    document.getElementById("statTips").textContent =
        completedChallenges.length;

    document.getElementById("complaintCount").textContent = total;

    const recent = reports.slice(0, 4);
    const recentContainer = document.getElementById("recentReports");

    if (!recent.length) {
        recentContainer.innerHTML = `
            <div class="empty-state">
                <div style="font-size:30px;margin-bottom:8px">🌱</div>
                <strong>No reports yet</strong>
                <p>Your submitted waste issues will appear here.</p>
                <button class="text-button" onclick="showPage('report')">
                    Create your first report →
                </button>
            </div>
        `;
    } else {
        recentContainer.innerHTML = recent.map(report => `
            <div class="report-row">
                <div class="report-row-icon">
                    <i data-lucide="${statusIcon(report.type)}"></i>
                </div>
                <div class="report-row-info">
                    <strong>${escapeHTML(report.type)}</strong>
                    <small>${escapeHTML(report.id)} · ${escapeHTML(report.location)}</small>
                </div>
                <span class="status-badge ${statusClass(report.status)}">
                    ${escapeHTML(report.status)}
                </span>
            </div>
        `).join("");
    }

    refreshIcons();
}

// ==========================================
// REPORT WASTE ISSUE
// ==========================================

const reportForm = document.getElementById("reportForm");

reportForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const type = document.getElementById("issueType").value.trim();
    const location = document.getElementById("issueLocation").value.trim();
    const description = document.getElementById("issueDescription").value.trim();
    const priority = document.getElementById("issuePriority").value;

    if (!type || !location || !description) {
        showToast("Please complete all required fields.");
        return;
    }

    const newReport = {
        id: makeId(),
        type,
        location,
        description,
        priority,
        status: "Submitted",
        createdAt: new Date().toISOString()
    };

    reports.unshift(newReport);
    saveData("binbuddy_reports", reports);

    reportForm.reset();
    document.getElementById("issueImagePreview").innerHTML = "";

    renderHome();
    renderComplaints();
    renderAnalytics();

    showToast("Report submitted! Your ID is " + newReport.id);

    showPage("complaints");
});

// Optional image preview for a waste report
document.getElementById("issueImage").addEventListener("change", function () {
    const file = this.files[0];
    const preview = document.getElementById("issueImagePreview");

    preview.innerHTML = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.");
        this.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Please choose an image smaller than 5 MB.");
        this.value = "";
        return;
    }

    const image = document.createElement("img");
    image.alt = "Waste issue photo preview";
    image.src = URL.createObjectURL(file);

    preview.appendChild(image);
});

// ==========================================
// TRACK COMPLAINTS
// ==========================================

function renderComplaints() {
    const search = (
        document.getElementById("complaintSearch").value || ""
    ).toLowerCase();

    const filter = document.getElementById("complaintFilter").value;

    const filteredReports = reports.filter(report => {
        const searchable = [
            report.id,
            report.type,
            report.location,
            report.description
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(search);
        const matchesStatus =
            filter === "All" || report.status === filter;

        return matchesSearch && matchesStatus;
    });

    const container = document.getElementById("complaintList");

    if (!filteredReports.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:30px;margin-bottom:8px">📋</div>
                <strong>No matching complaints</strong>
                <p>Try another search or submit a new report.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredReports.map(report => `
        <article class="complaint-card">
            <div class="report-row-icon">
                <i data-lucide="${statusIcon(report.type)}"></i>
            </div>

            <div class="complaint-main">
                <h3>${escapeHTML(report.type)}</h3>
                <p>${escapeHTML(report.description)}</p>

                <div class="complaint-meta">
                    <span>ID: ${escapeHTML(report.id)}</span>
                    <span>📍 ${escapeHTML(report.location)}</span>
                    <span>${formatDate(report.createdAt)}</span>
                    <span>Urgency: ${escapeHTML(report.priority || "Normal")}</span>
                </div>
            </div>

            <div class="complaint-controls">
                <span class="status-badge ${statusClass(report.status)}">
                    ${escapeHTML(report.status)}
                </span>

                <select aria-label="Update demo status"
                    onchange="updateReportStatus('${report.id}', this.value)">
                    <option value="Submitted" ${report.status === "Submitted" ? "selected" : ""}>Submitted</option>
                    <option value="In Progress" ${report.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Resolved" ${report.status === "Resolved" ? "selected" : ""}>Resolved</option>
                </select>

                <button class="delete-button"
                    onclick="deleteReport('${report.id}')">
                    Delete
                </button>
            </div>
        </article>
    `).join("");

    refreshIcons();
}

document.getElementById("complaintSearch").addEventListener(
    "input", renderComplaints
);

document.getElementById("complaintFilter").addEventListener(
    "change", renderComplaints
);

function updateReportStatus(id, status) {
    const report = reports.find(item => item.id === id);

    if (!report) return;

    report.status = status;

    saveData("binbuddy_reports", reports);

    renderHome();
    renderComplaints();
    renderAnalytics();

    showToast("Demo complaint status updated.");
}

function deleteReport(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this report from this browser?"
    );

    if (!confirmed) return;

    reports = reports.filter(report => report.id !== id);

    saveData("binbuddy_reports", reports);

    renderHome();
    renderComplaints();
    renderAnalytics();

    showToast("Report deleted.");
}

// ==========================================
// AI WASTE SCANNER - DEMONSTRATION
// ==========================================

// These are example rules, not an actual trained AI model.
// Verify local disposal rules before discarding waste.

const wasteGuide = {
    "plastic bottle": {
        category: "Dry recyclable waste",
        emoji: "🧴",
        method: "Empty the bottle and rinse it if needed. Check whether your local recycling service accepts that type of plastic. Keep it separate from food waste.",
        caution: "Do not place chemical containers in ordinary recycling unless your local service accepts them."
    },

    "banana peel": {
        category: "Wet / organic waste",
        emoji: "🍌",
        method: "Put it in your designated wet-waste or food-scrap container. Compost it where a suitable composting system is available.",
        caution: "Keep organic waste separate from dry recyclables."
    },

    "paper": {
        category: "Dry recyclable waste",
        emoji: "📄",
        method: "Keep paper clean and dry. Place accepted paper in the dry recycling stream.",
        caution: "Greasy or food-soiled paper may not be accepted by all paper recyclers."
    },

    "battery": {
        category: "Special / hazardous waste",
        emoji: "🔋",
        method: "Collect used batteries separately and take them to an authorised battery collection or e-waste drop-off point.",
        caution: "Never burn, puncture or dismantle batteries. Damaged lithium batteries need special handling."
    },

    "glass jar": {
        category: "Potentially recyclable glass",
        emoji: "🫙",
        method: "Empty and rinse the jar. Check whether your local collection accepts glass and whether lids should be separated.",
        caution: "Wrap broken glass safely and follow local disposal guidance."
    },

    "food leftovers": {
        category: "Wet / organic waste",
        emoji: "🥗",
        method: "Separate food scraps from paper, plastic and other dry materials. Use an appropriate food-waste collection or composting service.",
        caution: "Avoid mixing food scraps into clean dry recyclables."
    },

    "aluminium can": {
        category: "Dry recyclable metal",
        emoji: "🥫",
        method: "Empty and rinse the can. Keep it separate and check whether local recyclers accept aluminium cans.",
        caution: "Watch for sharp edges when handling crushed cans."
    },

    "old phone": {
        category: "Electronic waste (e-waste)",
        emoji: "📱",
        method: "Take the phone to an authorised e-waste collection centre or an approved electronics take-back programme.",
        caution: "Do not put electronics or their batteries in ordinary household bins."
    }
};

function classifyWaste(item) {
    const key = item.toLowerCase();
    const result = wasteGuide[key];

    if (!result) {
        showToast("No example guide is available for that item yet.");
        return;
    }

    const container = document.getElementById("classificationResult");

    container.innerHTML = `
        <div class="empty-illustration">${result.emoji}</div>
        <h3>${escapeHTML(item)}</h3>
        <span class="category-result">${escapeHTML(result.category)}</span>

        <div class="sorting-details">
            <strong>♻ Recommended disposal</strong>
            <p>${escapeHTML(result.method)}</p>

            <strong>⚠ Safety note</strong>
            <p>${escapeHTML(result.caution)}</p>
        </div>

        <p style="margin-top:15px;font-size:10px;color:#96a096">
            Sample-based guidance. Not verified image recognition.
        </p>
    `;

    refreshIcons();
}

document.getElementById("wasteImage").addEventListener("change", function () {
    const file = this.files[0];
    const preview = document.getElementById("wasteImagePreview");

    preview.innerHTML = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.");
        this.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Please choose an image smaller than 5 MB.");
        this.value = "";
        return;
    }

    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = "Selected waste item";

    preview.appendChild(image);

    showToast("Image preview ready. Select an item below for sample sorting guidance.");
});

// ==========================================
// BINBUDDY CHATBOT
// ==========================================

// Rule-based educational assistant.
// Connect a real AI model through a backend for open-ended answers.

function getBotResponse(question) {
    const q = question.toLowerCase().trim();

    if (/^(hi|hello|hey|hii)\b/.test(q)) {
        return "Hi! 🌿 I'm BinBuddy. Ask me about recycling, waste segregation, composting, e-waste or reducing waste at home.";
    }

    if (q.includes("segregat") || q.includes("separate waste") ||
        q.includes("separate garbage") || q.includes("waste categories")) {
        return "A useful starting point is to separate waste into:\n\n1. Wet or organic waste: food scraps and vegetable peels.\n2. Dry recyclables: clean paper, cardboard, accepted plastics and metals.\n3. Domestic hazardous waste: batteries, chemicals and certain lamps.\n4. E-waste: phones, chargers and electronic devices.\n\nUse your local municipal guidelines because accepted categories and collection arrangements vary.";
    }

    if (q.includes("pizza box") || q.includes("greasy paper")) {
        return "Clean, dry cardboard is often recyclable. A heavily grease-soiled or food-covered pizza box may not be accepted in paper recycling. Separate clean sections when your local service allows it, and check your local collection rules.";
    }

    if (q.includes("battery") || q.includes("cell disposal")) {
        return "Keep used batteries out of ordinary household waste. Store them safely and take them to an authorised battery collection point. Never burn, puncture or dismantle a battery. If a lithium battery is swollen, leaking or damaged, avoid handling it unnecessarily and seek specialist disposal advice.";
    }

    if (q.includes("e-waste") || q.includes("electronic") ||
        q.includes("old phone") || q.includes("charger")) {
        return "Old phones, chargers, computers and other electronics should go to an authorised e-waste collection centre or approved take-back programme. Do not put them in regular bins. Back up and erase your personal data before handing over a device, where possible.";
    }

    if (q.includes("plastic") || q.includes("plastic bottle") ||
        q.includes("plastic bag")) {
        return "Reduce single-use plastic by carrying a reusable bottle and bag. For recycling, empty containers, keep accepted items reasonably clean and check the local rules for plastic types. Not every plastic item can be recycled in every area.";
    }

    if (q.includes("compost") || q.includes("food scrap") ||
        q.includes("banana peel") || q.includes("vegetable peel")) {
        return "Composting can turn suitable fruit and vegetable scraps into useful soil material. Keep scraps separate and use a compost bin or service. Many home systems accept fruit peels, vegetable scraps and dry leaves, but meat, dairy and oily food may require a different system.";
    }

    if (q.includes("glass")) {
        return "Empty and rinse glass containers if your local service accepts them. Keep broken glass safely wrapped or in a designated container according to local rules. Do not assume drinking glasses, mirrors, ceramics and window glass belong in the same stream as glass bottles.";
    }

    if (q.includes("paper") || q.includes("cardboard")) {
        return "Keep recyclable paper and cardboard dry and reasonably clean. Flatten boxes to save space. Greasy, wax-coated or heavily food-soiled paper may not be accepted by your local paper recycler.";
    }

    if (q.includes("reduce waste") || q.includes("zero waste") ||
        q.includes("less waste") || q.includes("sustainable")) {
        return "Try these everyday habits:\n\n• Carry a reusable water bottle and shopping bag.\n• Plan meals to prevent food waste.\n• Reuse containers when safe and practical.\n• Choose products with less packaging.\n• Repair or donate usable items.\n• Sort recyclables correctly.\n• Keep batteries and electronics out of regular bins.\n\nStart with one habit you can maintain consistently.";
    }

    if (q.includes("bin full") || q.includes("overflowing") ||
        q.includes("missed collection") || q.includes("garbage not collected")) {
        return "If a public bin is overflowing or a collection was missed, use BinBuddy's Report Waste page. Add the nearest landmark, describe the issue clearly and choose the appropriate urgency. Save the report ID to track it. This demo records the report in your browser; it does not automatically notify municipal authorities.";
    }

    if (q.includes("report") || q.includes("complaint") ||
        q.includes("track issue")) {
        return "To record a waste issue, open Report Waste, select the issue type, enter a landmark and describe the problem. Submit the form to receive a report ID. Open Track Complaints to review your saved reports. In this demonstration, statuses are managed locally and are not official municipal updates.";
    }

    if (q.includes("organic") || q.includes("wet waste")) {
        return "Wet waste commonly includes suitable food scraps and other biodegradable kitchen waste. Keep it separate from clean paper, plastic and metal. Follow the instructions for your local collection or composting system.";
    }

    if (q.includes("dry waste") || q.includes("recycl")) {
        return "Dry waste may include clean paper, cardboard, accepted plastics and metals. Empty containers and keep recyclables free from food residue where practical. Local services differ, so confirm which materials are accepted before putting them out for collection.";
    }

    if (q.includes("hazard") || q.includes("chemical") ||
        q.includes("paint") || q.includes("pesticide")) {
        return "Some household products, such as certain chemicals, paints and pesticides, need special disposal. Keep them in their original labelled containers where safe, never mix unknown chemicals, and contact your local hazardous-waste collection service for instructions. Do not pour unknown chemicals down drains.";
    }

    if (q.includes("iot") || q.includes("sensor") ||
        q.includes("smart bin") || q.includes("fill level")) {
        return "A basic smart-bin setup can use an ultrasonic distance sensor connected to an ESP32 or ESP8266. The controller estimates how full the bin is and sends readings to a server over Wi-Fi. BinBuddy currently shows a simulated fill level; it is not connected to a physical sensor yet.";
    }

    if (q.includes("energy") || q.includes("calculator") ||
        q.includes("footprint")) {
        return "Open Impact Calculator and adjust the estimated kilograms of food waste, plastic, paper and mixed waste you generate weekly. It estimates weekly, monthly and yearly waste totals. These are estimates, not verified measurements of emissions or environmental impact.";
    }

    if (q.includes("thank")) {
        return "You're welcome! 🌱 Every useful habit helps. Ask me whenever you need guidance on waste sorting or reducing waste.";
    }

    return "I can help with common waste management topics such as:\n\n• Household waste segregation\n• Plastic, paper, glass and metal recycling\n• Food waste and composting\n• Batteries and electronic waste\n• Reducing waste at home\n• Reporting overflowing bins\n• Smart-bin sensors and basic IoT\n\nTry asking a more specific question. For answers to any topic using a real AI model, BinBuddy would need a secure AI API integration.";
}

function appendMessage(message, sender) {
    const container = document.getElementById("chatMessages");
    const row = document.createElement("div");

    row.className = "message " +
        (sender === "user" ? "user-message" : "bot-message");

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = sender === "user" ? "You" : "♻";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const content = document.createElement("p");
    content.textContent = message;

    bubble.appendChild(content);
    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);

    container.scrollTop = container.scrollHeight;
}

document.getElementById("chatForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const input = document.getElementById("chatInput");
    const question = input.value.trim();

    if (!question) return;

    appendMessage(question, "user");
    input.value = "";

    const answer = getBotResponse(question);

    // Demo response; replace with a backend AI request for real AI.
    setTimeout(() => {
        appendMessage(answer, "bot");
    }, 250);
});

function askSuggestion(question) {
    document.getElementById("chatInput").value = question;

    document.getElementById("chatForm").dispatchEvent(
        new Event("submit", { cancelable: true })
    );
}

function clearChat() {
    document.getElementById("chatMessages").innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">♻</div>
            <div class="message-bubble">
                <strong>Welcome back!</strong>
                <p>What would you like to know about waste management today?</p>
            </div>
        </div>
    `;

    showToast("Conversation cleared.");
}

// ==========================================
// WASTE IMPACT CALCULATOR
// ==========================================

const wasteInputs = [
    { input: "organicWaste", output: "organicValue" },
    { input: "plasticWaste", output: "plasticValue" },
    { input: "paperWaste", output: "paperValue" },
    { input: "otherWaste", output: "otherValue" }
];

wasteInputs.forEach(item => {
    const input = document.getElementById(item.input);
    const output = document.getElementById(item.output);

    input.addEventListener("input", function () {
        output.textContent = this.value;
        calculateImpact();
    });
});

document.getElementById("calculatorForm").addEventListener(
    "submit", function (event) {
        event.preventDefault();
        calculateImpact();
        showToast("Your waste estimate has been updated.");
    }
);

function calculateImpact() {
    const organic = Number(document.getElementById("organicWaste").value);
    const plastic = Number(document.getElementById("plasticWaste").value);
    const paper = Number(document.getElementById("paperWaste").value);
    const other = Number(document.getElementById("otherWaste").value);

    const weekly = organic + plastic + paper + other;

    document.getElementById("weeklyTotal").textContent =
        weekly.toLocaleString("en-IN", { maximumFractionDigits: 1 });

    document.getElementById("monthlyTotal").textContent =
        (weekly * 4.345).toFixed(1) + " kg";

    document.getElementById("yearlyTotal").textContent =
        (weekly * 52).toFixed(1) + " kg";

    document.getElementById("reductionTotal").textContent =
        (weekly * 0.2).toFixed(1) + " kg/week";

    let insight;

    if (weekly === 0) {
        insight = "Your estimate is zero. Check that your quantities reflect your actual household waste.";
    } else if (organic >= plastic && organic >= paper && organic >= other) {
        insight = "Food and garden waste is your largest category. Meal planning and suitable composting may help reduce the amount sent to mixed waste.";
    } else if (plastic >= paper && plastic >= other) {
        insight = "Plastic is your largest selected category. Consider reusable alternatives and check which plastics your local recycling service accepts.";
    } else if (paper >= other) {
        insight = "Paper is a major part of your estimate. Reuse clean paper when practical and keep recyclable cardboard dry.";
    } else {
        insight = "Mixed waste is your largest category. Sorting suitable recyclables and special waste separately may reduce the amount in this category.";
    }

    document.getElementById("calculatorInsight").textContent = insight;
}

// ==========================================
// PROGRESS AND REPORT EXPORT
// ==========================================

function renderAnalytics() {
    const total = reports.length;
    const submitted = reports.filter(r => r.status === "Submitted").length;
    const inProgress = reports.filter(r => r.status === "In Progress").length;
    const resolved = reports.filter(r => r.status === "Resolved").length;

    document.getElementById("reportTotal").textContent = total;
    document.getElementById("reportSubmitted").textContent = submitted;
    document.getElementById("reportInProgress").textContent = inProgress;
    document.getElementById("reportResolved").textContent = resolved;

    const statuses = [
        { name: "Submitted", count: submitted },
        { name: "In Progress", count: inProgress },
        { name: "Resolved", count: resolved }
    ];

    const chart = document.getElementById("statusChart");

    chart.innerHTML = statuses.map(status => {
        const percent = total ? (status.count / total) * 100 : 0;

        return `
            <div class="chart-row">
                <span class="chart-label">${status.name}</span>
                <div class="chart-track">
                    <div class="chart-bar" style="width:${percent}%"></div>
                </div>
                <span class="chart-count">${status.count}</span>
            </div>
        `;
    }).join("");
}

function exportReports() {
    if (!reports.length) {
        showToast("There are no reports to export yet.");
        return;
    }

    const columns = [
        "Report ID",
        "Issue Type",
        "Location",
        "Description",
        "Priority",
        "Status",
        "Created Date"
    ];

    function csvCell(value) {
        let text = String(value ?? "");

        // Prevent spreadsheet formula injection in exported text.
        if (/^[\s]*[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
    }

    const rows = reports.map(report => [
        report.id,
        report.type,
        report.location,
        report.description,
        report.priority || "Normal",
        report.status,
        formatDate(report.createdAt)
    ]);

    const csv = [columns, ...rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "binbuddy-reports.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Your CSV report has been exported.");
}

// ==========================================
// COMMUNITY CHALLENGES
// ==========================================

const challenges = [
    {
        day: "DAY 01",
        title: "Carry a reusable bottle",
        description: "Use a refillable bottle instead of buying a single-use bottle."
    },
    {
        day: "DAY 02",
        title: "Separate wet and dry waste",
        description: "Set aside food scraps separately from clean recyclables."
    },
    {
        day: "DAY 03",
        title: "Avoid unnecessary packaging",
        description: "Choose a reusable or lower-packaging option where practical."
    },
    {
        day: "DAY 04",
        title: "Reuse an everyday item",
        description: "Give a clean container, bag or other suitable item another use."
    },
    {
        day: "DAY 05",
        title: "Prevent food waste",
        description: "Plan a meal using food you already have at home."
    },
    {
        day: "DAY 06",
        title: "Find an e-waste collection point",
        description: "Learn where batteries and old electronics can be handed in safely."
    },
    {
        day: "DAY 07",
        title: "Share a green habit",
        description: "Encourage a friend or family member to try one useful waste-reduction habit."
    }
];

function renderChallenges() {
    const grid = document.getElementById("challengeGrid");

    grid.innerHTML = challenges.map((challenge, index) => {
        const checked = completedChallenges.includes(index);

        return `
            <label class="challenge-card ${checked ? "completed" : ""}">
                <input
                    class="challenge-check"
                    type="checkbox"
                    ${checked ? "checked" : ""}
                    onchange="toggleChallenge(${index}, this.checked)"
                >

                <div>
                    <span class="challenge-day">${challenge.day}</span>
                    <strong>${challenge.title}</strong>
                    <p>${challenge.description}</p>
                </div>
            </label>
        `;
    }).join("");

    const completed = completedChallenges.length;

    document.getElementById("challengeProgress").textContent =
        completed + " of " + challenges.length + " completed";

    document.getElementById("statTips").textContent = completed;
}

function toggleChallenge(index, checked) {
    if (checked && !completedChallenges.includes(index)) {
        completedChallenges.push(index);
    }

    if (!checked) {
        completedChallenges = completedChallenges.filter(
            item => item !== index
        );
    }

    saveData("binbuddy_challenges", completedChallenges);

    renderChallenges();
    renderHome();

    showToast(
        checked
            ? "Nice work! Green challenge completed."
            : "Challenge marked as incomplete."
    );
}

// ==========================================
// DAILY GREEN TIPS
// ==========================================

const dailyTips = [
    {
        category: "KITCHEN & COMPOSTING",
        emoji: "🥬",
        title: "Give food scraps a second life",
        text: "Keep fruit and vegetable scraps separate from dry recyclables. Compost them where a suitable service is available."
    },
    {
        category: "SMART SHOPPING",
        emoji: "🛍️",
        title: "Bring your reusable bag",
        text: "Keep a reusable bag near your everyday essentials so you are ready when shopping."
    },
    {
        category: "RECYCLING",
        emoji: "📦",
        title: "Keep cardboard clean and dry",
        text: "Flatten clean cardboard boxes and keep them dry before placing them in an accepted recycling stream."
    },
    {
        category: "E-WASTE SAFETY",
        emoji: "🔋",
        title: "Never put batteries in regular bins",
        text: "Keep used batteries separate and take them to an authorised collection point."
    },
    {
        category: "EVERYDAY HABITS",
        emoji: "🥤",
        title: "Refill instead of replacing",
        text: "When practical, use a refillable water bottle and a reusable cup."
    },
    {
        category: "FOOD WASTE",
        emoji: "🥕",
        title: "Plan before you shop",
        text: "Check your fridge and plan meals before shopping to avoid buying food you will not use."
    }
];

let tipIndex = new Date().getDate() % dailyTips.length;

function displayTip() {
    const tip = dailyTips[tipIndex];

    document.querySelector(".tip-category").textContent = tip.category;
    document.querySelector(".tip-illustration").textContent = tip.emoji;
    document.getElementById("dailyTipTitle").textContent = tip.title;
    document.getElementById("dailyTipText").textContent = tip.text;
}

function nextTip() {
    tipIndex = (tipIndex + 1) % dailyTips.length;
    displayTip();
}

// ==========================================
// BASIC IoT SMART-BIN DEMONSTRATION
// ==========================================

// Simulates readings. No physical sensor is connected.

function simulateSensor() {
    const fill = Math.floor(Math.random() * 101);

    document.getElementById("sensorPercent").textContent = fill + "%";
    document.getElementById("sensorProgress").style.width = fill + "%";

    let status;

    if (fill >= 85) {
        status = "High fill level — collection may be needed";
    } else if (fill >= 60) {
        status = "Bin is getting full";
    } else if (fill >= 30) {
        status = "Moderate fill level";
    } else {
        status = "Bin has plenty of space";
    }

    document.getElementById("sensorStatusText").textContent = status;

    const progress = document.getElementById("sensorProgress");

    if (fill >= 85) {
        progress.style.background = "#d66e5e";
    } else if (fill >= 60) {
        progress.style.background = "#d9a452";
    } else {
        progress.style.background = "linear-gradient(90deg,#82ad70,#3c7b4b)";
    }

    showToast("Demo sensor reading refreshed: " + fill + "%.");
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

function initializeDashboard() {
    updateDate();
    displayTip();
    renderHome();
    renderComplaints();
    renderAnalytics();
    renderChallenges();
    calculateImpact();
    refreshIcons();
}

initializeDashboard();