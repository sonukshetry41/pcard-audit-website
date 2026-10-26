
function showTab(tabName) {
    document.querySelectorAll(".tab").forEach(function(tab) {
        tab.hidden = true;
    });

    document.getElementById(tabName).hidden = false;
}

document.getElementById("questionForm").addEventListener("submit", function(event) {
    event.preventDefault();

    document.getElementById("answer").textContent =
        "Your question has been received. Natural-language question answering will be added next.";
});

document.getElementById("searchButton").addEventListener("click", async function() {
    const year = document.getElementById("year").value;
    const vendor = document.getElementById("vendorSearch").value.trim();
const category = document.getElementById("categoryFilter").value;
    const description = document.getElementById("descriptionSearch").value.trim();
    const results = document.getElementById("results");

    results.textContent = "Searching transactions...";

    const params = new URLSearchParams({
        year: year,
        vendor: vendor,
        description: description
    });

    try {
        const response = await fetch("/api/search?" + params.toString());

        if (!response.ok) {
            throw new Error("The server returned an error.");
        }

        const transactions = await response.json();

if (!Array.isArray(transactions)) {
    throw new Error(transactions.error || "Unexpected server response.");
}

const filteredTransactions = category
    ? transactions.filter(transaction => transaction.Category === category)
    : transactions;

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
