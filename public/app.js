const stageLabels = {
  "machine-checks": "Machine Checks",
  tools: "Required Tools",
  workpiece: "Workpiece Setup",
  "ready-review": "Ready Review",
  operation: "Operation"
};

const stageHints = {
  "machine-checks": "Confirm all machine readiness checks before moving ahead.",
  tools: "Load and confirm each required tool for the mock operation.",
  workpiece: "Set up the fixture and workpiece, then confirm each setup item.",
  "ready-review": "Review completed setup before proceeding to operation.",
  operation: "Start or stop the simulated operation."
};

const stageContent = document.getElementById("stageContent");
const stageTitle = document.getElementById("stageTitle");
const stageHint = document.getElementById("stageHint");
const operationStatus = document.getElementById("operationStatus");
const progressBar = document.getElementById("progressBar");
const jobSummary = document.getElementById("jobSummary");
const nextButton = document.getElementById("nextButton");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const resetButton = document.getElementById("resetButton");

let currentState = null;

async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function buildSummary(job) {
  const rows = [
    ["Job ID", job.jobId],
    ["Operation", job.operationName],
    ["Quantity", job.quantity],
    ["Material", job.material],
    ["Drawing", job.drawingRevision],
    ["Program", job.cncProgramRevision],
    ["Fixture", job.fixture],
    ["Work Offset", job.workOffset]
  ];

  jobSummary.innerHTML = rows
    .map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderProgress(state) {
  progressBar.innerHTML = state.stageOrder
    .map((stageKey) => {
      const active = state.appState.activeStage === stageKey ? "active" : "";
      const complete = state.completedStages[stageKey] ? "complete" : "";
      return `<div class="progress-step ${active} ${complete}">${stageLabels[stageKey]}</div>`;
    })
    .join("");
}

function buildConfirmButton(stage, item) {
  if (item.confirmed) {
    return `<div class="item-status done">Confirmed</div>`;
  }

  return `<button class="primary-button" data-stage="${stage}" data-id="${item.id}">Confirm Check</button>`;
}

function renderMachineChecks(state) {
  return state.machineChecks
    .map(
      (item) => `
        <div class="item-row">
          <div>
            <strong>${item.label}</strong>
            <div class="item-meta">Machine readiness confirmation</div>
          </div>
          ${buildConfirmButton("machine-checks", item)}
        </div>
      `
    )
    .join("");
}

function renderTools(state) {
  return state.tools
    .map(
      (tool) => `
        <div class="item-row">
          <div>
            <strong>${tool.toolNumber} - ${tool.toolType}</strong>
            <div class="item-meta">Program revision: ${state.job.cncProgramRevision}</div>
          </div>
          ${buildConfirmButton("tools", tool)}
        </div>
      `
    )
    .join("");
}

function renderWorkpiece(state) {
  return state.workpieceSetup
    .map(
      (item) => `
        <div class="item-row">
          <div>
            <strong>${item.label}</strong>
            <div class="item-meta">Work offset: ${state.job.workOffset}</div>
          </div>
          ${buildConfirmButton("workpiece", item)}
        </div>
      `
    )
    .join("");
}

function renderReadyReview(state) {
  const sections = [
    {
      title: "Machine Checks",
      items: state.machineChecks.map((item) => item.label)
    },
    {
      title: "Required Tools",
      items: state.tools.map((tool) => `${tool.toolNumber} - ${tool.toolType}`)
    },
    {
      title: "Workpiece Setup",
      items: state.workpieceSetup.map((item) => item.label)
    }
  ];

  return `
    <div class="review-box">
      <h3>READY Checklist</h3>
      ${sections
        .map(
          (section) => `
            <div class="review-section">
              <p><strong>${section.title}</strong></p>
              <ul>
                ${section.items.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </div>
          `
        )
        .join("")}
      <p><strong>Machine state:</strong> READY</p>
    </div>
    <p class="empty-copy">Press Next to open the operation screen.</p>
  `;
}

function renderOperation(state) {
  const status = state.appState.operationStatus.toLowerCase();
  return `
    <div class="operation-box ${status}">
      <h3>${state.job.operationName}</h3>
      <p>Current status: <strong>${state.appState.operationStatus}</strong></p>
      <p>Job quantity: <strong>${state.job.quantity}</strong></p>
      <p>Material: <strong>${state.job.material}</strong></p>
    </div>
  `;
}

function renderStage(state) {
  const stageKey = state.appState.activeStage;
  stageTitle.textContent = stageLabels[stageKey];
  stageHint.textContent = stageHints[stageKey];
  operationStatus.textContent = state.appState.operationStatus;

  if (stageKey === "machine-checks") {
    stageContent.innerHTML = renderMachineChecks(state);
  } else if (stageKey === "tools") {
    stageContent.innerHTML = renderTools(state);
  } else if (stageKey === "workpiece") {
    stageContent.innerHTML = renderWorkpiece(state);
  } else if (stageKey === "ready-review") {
    stageContent.innerHTML = renderReadyReview(state);
  } else {
    stageContent.innerHTML = renderOperation(state);
  }

  const currentIndex = state.stageOrder.indexOf(stageKey);
  const currentComplete = state.completedStages[stageKey];

  nextButton.disabled = currentIndex === state.stageOrder.length - 1 || (!currentComplete && currentIndex < 3);
  startButton.disabled = !(stageKey === "operation" && state.appState.operationStatus !== "RUNNING");
  stopButton.disabled = state.appState.operationStatus !== "RUNNING";
}

function attachActionHandlers() {
  stageContent.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextState = await request("/api/confirm", {
        method: "POST",
        body: {
          stage: button.dataset.stage,
          itemId: button.dataset.id
        }
      });

      refresh(nextState);
    });
  });
}

function refresh(state) {
  currentState = state;
  buildSummary(state.job);
  renderProgress(state);
  renderStage(state);
  attachActionHandlers();
}

async function loadState() {
  const state = await request("/api/state");
  refresh(state);
}

nextButton.addEventListener("click", async () => {
  const state = await request("/api/next-stage", { method: "POST" });
  refresh(state);
});

startButton.addEventListener("click", async () => {
  const state = await request("/api/operation/start", { method: "POST" });
  refresh(state);
});

stopButton.addEventListener("click", async () => {
  const state = await request("/api/operation/stop", { method: "POST" });
  refresh(state);
});

resetButton.addEventListener("click", async () => {
  const state = await request("/api/reset", { method: "POST" });
  refresh(state);
});

loadState().catch((error) => {
  stageTitle.textContent = "Unable to load";
  stageContent.innerHTML = `<p class="empty-copy">${error.message}</p>`;
});
