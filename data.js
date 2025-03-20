// data.js
export let uploadedData = [];
export let cleaningLog = [];

export function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        uploadedData = jsonData.map(row => row.map(val => (val === "" || val === null || isNaN(parseFloat(val)) ? NaN : parseFloat(val))));
        document.getElementById("dataset").value = uploadedData.map(row => row.join(",")).join(";");
    };
    reader.readAsArrayBuffer(file);
}

export function parseMultiDataset(input) {
    return input.split(";").map(row => row.split(",").map(x => {
        const trimmed = x.trim();
        return (trimmed === "" || isNaN(parseFloat(trimmed))) ? NaN : parseFloat(trimmed);
    }));
}

export function cleanData(data, method) {
    cleaningLog = [];
    const numCols = Math.max(...data.map(row => row.length));
    let cleanedData = data.map(row => {
        const newRow = [...row];
        while (newRow.length < numCols) newRow.push(NaN);
        return newRow.slice(0, numCols);
    });

    if (method === "drop") {
        const originalRows = cleanedData.length;
        cleanedData = cleanedData.filter(row => row.every(val => !isNaN(val)));
        if (cleanedData.length < originalRows) {
            cleaningLog.push(`Dropped ${originalRows - cleanedData.length} rows with non-numeric or missing values.`);
        }
    } else {
        const colMeans = Array(numCols).fill(0).map((_, j) => {
            const validVals = cleanedData.map(row => row[j]).filter(v => !isNaN(v));
            return validVals.length > 0 ? validVals.reduce((a, b) => a + b, 0) / validVals.length : 0;
        });

        let nanCount = 0;
        cleanedData = cleanedData.map(row => row.map((val, j) => {
            if (isNaN(val)) {
                nanCount++;
                return method === "mean" ? colMeans[j] : 0;
            }
            return val;
        }));
        if (nanCount > 0) {
            cleaningLog.push(`Replaced ${nanCount} non-numeric or missing values with ${method === "mean" ? "column means" : "zeros"}.`);
        }
    }

    return cleanedData.length > 0 && cleanedData[0].length > 0 ? cleanedData : [];
}