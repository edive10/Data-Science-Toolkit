const DELAYS = { SHORT: 200, MEDIUM: 300 };
const MESSAGES = { INIT: "Initializing...", DONE: "Finalizing...", READY: "Ready to calculate..." };

export async function processTool({ validate, error, compute, chart, analysis }) {
    const calcBtn = document.getElementById("calc-btn");
    const progressBar = document.getElementById("progress");
    const resultText = document.getElementById("result-text");
    const analysisText = document.getElementById("analysis-text");

    calcBtn.disabled = true;
    progressBar.style.display = "block";
    updateProgress(0, MESSAGES.INIT);

    await delay(DELAYS.SHORT);
    updateProgress(20, "Parsing inputs...");
    if (!validate) {
        resultText.innerText = "Invalid input";
        analysisText.innerText = error;
        return finalize();
    }

    await delay(DELAYS.MEDIUM);
    updateProgress(50, "Computing...");
    const result = compute();

    await delay(DELAYS.MEDIUM);
    updateProgress(80, "Rendering chart...");
    chart();

    resultText.innerText = result.output;
    analysisText.innerText = analysis();
    return finalize();

    function finalize() {
        updateProgress(100, MESSAGES.DONE);
        return delay(DELAYS.SHORT).then(() => {
            progressBar.style.display = "none";
            updateProgress(0, MESSAGES.READY);
            calcBtn.disabled = false;
        });
    }
}

function updateProgress(percentage, message) {
    document.getElementById("progress-fill").style.width = `${percentage}%`;
    document.getElementById("progress-message").innerText = message;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}