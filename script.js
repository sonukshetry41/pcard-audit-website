
const PROHIBITED_KEYWORDS = {
    "Alcohol": ["alcohol", "beer", "wine", "liquor", "spirits"],
    "Cash/ATM": ["atm", "cash advance", "cash withdrawal"],
    "Decorations": ["decoration", "decorations", "balloon", "ornament"],
    "Donations/Sponsorships": ["donation", "donations", "sponsorship"],
    "Gasoline": ["gasoline", "fuel", "petrol", "gas station"],
    "Gifts": ["gift", "gifts", "gift card", "gift cards"],
    "Insurance": ["insurance", "insurance premium"],
    "Late Fees": ["late fee", "late fees", "penalty fee"],
    "Mail/Postage": ["postage", "stamps", "mailing", "shipping label"],
    "Moving": ["moving service", "moving company", "relocation"],
    "Personal Purchases": ["personal purchase", "personal use"],
    "Memberships": ["membership", "membership fee", "club dues"],
    "Wages/Benefits": ["wages", "payroll", "employee benefit"],
    "Service/Incentive Awards": [
        "service award", "incentive award", "employee award"
    ]
};

function identifyCategory(vendor, description) {
    const text = `${vendor || ""} ${description || ""}`.toLowerCase();

    for (const [category, keywords] of Object.entries(PROHIBITED_KEYWORDS)) {
        if (keywords.some(keyword => text.includes(keyword))) {
            return category;
        }
    }

    return "Not flagged";
}
function showTab(tabName) {
    document.querySelectorAll(".tab").forEach(function(tab) {
        tab.hidden = true;
    });

    document.getElementById(tabName).hidden = false;
}


document.getElementById("questionForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const answer = document.getElementById("answer");
    const question = document.getElementById("question").value.trim().toLowerCase();
    const year = document.getElementById("year").value;

    answer.replaceChildren();

    if (!question) {
        answer.textContent = "Please enter a question.";
        return;
    }

    answer.textContent = "Searching transaction data...";

    try {
        const response = await fetch("data/transactions-" + year + ".json");

        if (!response.ok) {
            throw new Error("Transaction data could not be loaded.");
        }

        const rows = await response.json();

        // Data columns: Year, Vendor, Description, Amount, Date, MCC
        let transactions = rows.map(row => ({
            Year: row[0],
            Vendor: row[1] || "",
            Description: row[2] || "",
            Amount: Number(row[3]) || 0,
            TransactionDate: row[4] || "",
            MCC: row[5] || ""
        }));

        let title = "Matching transactions";
        let threshold = null;
        let keyword = null;

        const amountMatch = question.match(
            /(?:over|above|greater than|more than|exceed(?:ing)?)\s*\$?\s*([\d,]+(?:\.\d+)?)/i
        );

        if (amountMatch) {
            threshold = Number(amountMatch[1].replace(/,/g, ""));
            transactions = transactions.filter(t => t.Amount > threshold);
            title = "Transactions over $" + threshold.toLocaleString();
        } else {
            const prohibitedKeywords = [
                "alcohol", "beer", "wine", "liquor", "cash",
                "atm", "decoration", "donation", "sponsorship",
                "gasoline", "fuel", "gift", "insurance",
                "late fee", "postage", "moving", "personal",
                "membership", "wages", "payroll", "award"
            ];

            keyword = prohibitedKeywords.find(word => question.includes(word));

            if (keyword) {
                transactions = transactions.filter(t =>
                    (t.Description + " " + t.Vendor)
                        .toLowerCase().includes(keyword)
                );
                title = 'Transactions mentioning "' + keyword + '"';
            } else {
                const vendorMatch = question.match(
                    /(?:from|vendor|at|purchase(?:s)? from)\s+(.+?)(?:\?|$)/
                );

                if (vendorMatch) {
                    keyword = vendorMatch[1]
                        .replace(/[?.!]+$/, "")
                        .trim();

                    transactions = transactions.filter(t =>
                        t.Vendor.toLowerCase().includes(keyword)
                    );
                    title = 'Transactions from "' + keyword + '"';
                } else {
                    answer.textContent =
                        "I couldn't identify that question. Try asking for transactions over a dollar amount, a vendor, or a prohibited-purchase keyword.";
                    return;
                }
            }
        }

        const heading = document.createElement("h3");
        heading.textContent = title + " (" + transactions.length + " found)";
        answer.replaceChildren(heading);

        if (transactions.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No matching transactions were found.";
            answer.appendChild(message);
            return;
        }

        const table = document.createElement("table");
        const header = document.createElement("tr");

        ["Date", "Vendor", "Description", "Amount", "MCC"].forEach(label => {
            const th = document.createElement("th");
            th.textContent = label;
            header.appendChild(th);
        });

        table.appendChild(header);

        transactions.slice(0, 100).forEach(t => {
            const tr = document.createElement("tr");

            [
                t.TransactionDate,
                t.Vendor,
                t.Description,
                t.Amount.toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD"
                }),
                t.MCC
            ].forEach(value => {
                const td = document.createElement("td");
                td.textContent = value;
                tr.appendChild(td);
            });

            table.appendChild(tr);
        });

        answer.appendChild(table);

        if (transactions.length > 100) {
            const note = document.createElement("p");
            note.textContent =
                "Showing the first 100 results. Refine your question to narrow the results.";
            answer.appendChild(note);
        }
    } catch (error) {
        answer.textContent =
            "Unable to search the data. Please check your connection and try again.";
        console.error(error);
    }
});


document.getElementById("searchButton").addEventListener("click", async function() {
    const year = document.getElementById("year").value;
    const vendor = document.getElementById("vendorSearch").value.trim();
const category = document.getElementById("categoryFilter").value;
    const description = document.getElementById("descriptionSearch").value.trim();
    const results = document.getElementById("results");

        results.textContent = "Loading transactions...";

    try {
        const response = await fetch("data/transactions-" + year + ".json");

        if (!response.ok) {
            throw new Error("Could not load transaction data for " + year);
        }

        const rows = await response.json();

        const transactions = rows.map(function(row) {
            return {
                Year: row[0],
                Vendor: row[1] || "",
                Description: row[2] || "",
                Amount: row[3],
                TransactionDate: row[4] || "",
                MCC: row[5] || "",
                FullName: "",
                Category: identifyCategory(row[1], row[2])
            };
        });

        const filteredTransactions = transactions.filter(function(transaction) {
            const matchesVendor = transaction.Vendor.toLowerCase().includes(vendor.toLowerCase());
            const matchesDescription = transaction.Description.toLowerCase().includes(description.toLowerCase());
            const matchesCategory = !category || transaction.Category === category;

            return matchesVendor && matchesDescription && matchesCategory;
        });

        results.replaceChildren();
const flaggedTransactions = filteredTransactions.filter(
    transaction => transaction.Category !== "Not flagged"
);

const summary = document.createElement("div");
summary.className = "audit-summary";

const summaryText = document.createElement("p");
summaryText.textContent =
    "Potentially flagged transactions: " +
    flaggedTransactions.length +
    " out of " +
    filteredTransactions.length;

summary.appendChild(summaryText);

const bar = document.createElement("div");
bar.className = "audit-summary-bar";

const fill = document.createElement("div");
fill.className = "audit-summary-fill";

const percentage = filteredTransactions.length > 0
    ? (flaggedTransactions.length / filteredTransactions.length) * 100
    : 0;

fill.style.width = percentage + "%";
bar.appendChild(fill);
summary.appendChild(bar);

const percentageText = document.createElement("p");
percentageText.textContent = percentage.toFixed(2) + "% potentially flagged";
summary.appendChild(percentageText);

results.appendChild(summary);



        const heading = document.createElement("h3");
        heading.textContent = filteredTransactions.length + " transaction(s) found";
        results.appendChild(heading);

        if (filteredTransactions.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No matching transactions found.";
    results.appendChild(message);
    return;
}

        const table = document.createElement("table");
        const headerRow = document.createElement("tr");

        [
            "Employee",
            "Date",
            "Vendor",
            "Description",
            "Amount",
            "Potential Category"
        ].forEach(function(label) {
            const th = document.createElement("th");
            th.textContent = label;
            headerRow.appendChild(th);
        });

        table.appendChild(headerRow);

        filteredTransactions.forEach(function(transaction) {
            const row = document.createElement("tr");

            [
                transaction.FullName,
                transaction.TransactionDate,
                transaction.Vendor,
                transaction.Description,
                transaction.Amount,
                transaction.Category
            ].forEach(function(value, index) {
                const cell = document.createElement("td");

                cell.textContent = index === 4
                    ? (Number(value) || 0).toFixed(2)
                    : (value ?? "");

                row.appendChild(cell);
            });

            table.appendChild(row);
        });

        results.appendChild(table);

        const note = document.createElement("p");
        note.textContent =
            "Note: Categories are preliminary keyword flags, not confirmed policy violations.";
        results.appendChild(note);

    } catch (error) {
        results.textContent =
            "Could not retrieve transactions. Check that the Python server is running. Details: " +
            error.message;
    }
});
