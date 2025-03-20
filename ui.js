export function updateInputs() {
    const tool = document.getElementById("tool").value;
    const inputFields = document.getElementById("input-fields");
    const dataInput = document.getElementById("data-input");
    inputFields.innerHTML = "";
    dataInput.style.display = "none";

    const templates = {
        binomial: `
            <input type="number" id="n" placeholder="n (trials)" min="1">
            <input type="number" id="k" placeholder="k (successes)" min="0">
            <input type="number" id="p" placeholder="p (0-1)" min="0" max="1" step="0.01">
        `,
        poisson: `
            <input type="number" id="lambda" placeholder="λ (rate)" min="0" step="0.1">
            <input type="number" id="k" placeholder="k (events)" min="0">
        `,
        normal: `
            <input type="number" id="mu" placeholder="μ (mean)">
            <input type="number" id="sigma" placeholder="σ (std dev)" min="0" step="0.1">
            <input type="number" id="a" placeholder="a (lower)">
            <input type="number" id="b" placeholder="b (upper)">
        `,
        exponential: `
            <input type="number" id="lambda" placeholder="λ (rate)" min="0" step="0.1">
            <input type="number" id="x" placeholder="x (time)" min="0" step="0.1">
        `,
        zscore: `
            <input type="number" id="x" placeholder="x (value)">
            <input type="number" id="mu" placeholder="μ (mean)">
            <input type="number" id="sigma" placeholder="σ (std dev)" min="0" step="0.1">
        `,
        descriptive: "",
        confidence: `
            <input type="number" id="conf-level" placeholder="Confidence Level (e.g., 95)" min="0" max="100" step="1">
        `,
        ttest: `
            <input type="number" id="mu0" placeholder="Hypothesized Mean (μ0)">
        `,
        regression: "",
        heatmap: `
            <label for="matrix-type">Matrix Type:</label>
            <select id="matrix-type">
                <option value="correlation">Correlation</option>
                <option value="covariance">Covariance</option>
                <option value="distance">Euclidean Distance</option>
                <option value="raw">Raw Data</option>
            </select>
        `,
        bayes: `
            <input type="number" id="pba" placeholder="P(B|A) (0-1)" min="0" max="1" step="0.01">
            <input type="number" id="pa" placeholder="P(A) (0-1)" min="0" max="1" step="0.01">
            <input type="number" id="pb" placeholder="P(B) (0-1)" min="0" max="1" step="0.01">
        `,
        categorical: "",
        binary: `
            <input type="number" id="p" placeholder="P(Success) (0-1)" min="0" max="1" step="0.01">
        `,
        discrete: ""
    };

    if (templates[tool]) {
        inputFields.innerHTML = templates[tool];
    }

    if (["descriptive", "confidence", "ttest", "regression", "heatmap", "categorical", "discrete"].includes(tool)) {
        dataInput.style.display = "block";
    }
}

export function handleExcelUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) throw new Error("No file selected");
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                window.uploadedData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
                    .map(row => row.map(val => (val === "" || val === null || isNaN(parseFloat(val)) ? NaN : parseFloat(val))));
                document.getElementById("dataset").value = window.uploadedData.map(row => row.join(",")).join(";");
            } catch (err) {
                console.error("Excel processing failed:", err);
                alert(`Error processing file: ${err.message}`);
            }
        };
        reader.onerror = () => alert("Failed to read file");
        reader.readAsArrayBuffer(file);
    } catch (err) {
        console.error("Upload error:", err);
        alert(`Upload error: ${err.message}`);
    }
}