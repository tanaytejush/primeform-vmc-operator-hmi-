import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const stageLabels = {
  "machine-checks": "Machine Checks",
  tools: "Required Tools",
  workpiece: "Workpiece Setup",
  "ready-review": "Ready Review",
  operation: "Operation",
};

const stageHints = {
  "machine-checks": "Confirm all machine readiness checks before moving ahead.",
  tools: "Load and confirm each required tool for the mock operation.",
  workpiece: "Set up the fixture and workpiece, then confirm each setup item.",
  "ready-review": "Review completed setup before proceeding to operation.",
  operation: "Start or stop the simulated operation.",
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function SummaryPanel({ job, onReset }) {
  const rows = [
    ["Job ID", job.jobId],
    ["Operation", job.operationName],
    ["Quantity", job.quantity],
    ["Material", job.material],
    ["Drawing", job.drawingRevision],
    ["Program", job.cncProgramRevision],
    ["Fixture", job.fixture],
    ["Work Offset", job.workOffset],
  ];

  return (
    <aside className="panel summary-panel">
      <h2>Mock Job</h2>
      <div className="summary-list">
        {rows.map(([label, value]) => (
          <div className="summary-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <button className="secondary-button" onClick={onReset}>
        Reset Demo
      </button>
    </aside>
  );
}

function ProgressBar({ state }) {
  return (
    <div className="progress-bar">
      {state.stageOrder.map((stageKey) => {
        const active = state.appState.activeStage === stageKey ? "active" : "";
        const complete = state.completedStages[stageKey] ? "complete" : "";
        return (
          <div className={`progress-step ${active} ${complete}`} key={stageKey}>
            {stageLabels[stageKey]}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmButton({ item, stage, onConfirm }) {
  if (item.confirmed) {
    return <div className="item-status done">Confirmed</div>;
  }

  return (
    <button className="primary-button" onClick={() => onConfirm(stage, item.id)}>
      Confirm Check
    </button>
  );
}

function MachineChecksStage({ state, onConfirm }) {
  return state.machineChecks.map((item) => (
    <div className="item-row" key={item.id}>
      <div>
        <strong>{item.label}</strong>
        <div className="item-meta">Machine readiness confirmation</div>
      </div>
      <ConfirmButton item={item} stage="machine-checks" onConfirm={onConfirm} />
    </div>
  ));
}

function ToolsStage({ state, onConfirm }) {
  return state.tools.map((tool) => (
    <div className="item-row" key={tool.id}>
      <div>
        <strong>
          {tool.toolNumber} - {tool.toolType}
        </strong>
        <div className="item-meta">Program revision: {state.job.cncProgramRevision}</div>
      </div>
      <ConfirmButton item={tool} stage="tools" onConfirm={onConfirm} />
    </div>
  ));
}

function WorkpieceStage({ state, onConfirm }) {
  return state.workpieceSetup.map((item) => (
    <div className="item-row" key={item.id}>
      <div>
        <strong>{item.label}</strong>
        <div className="item-meta">Work offset: {state.job.workOffset}</div>
      </div>
      <ConfirmButton item={item} stage="workpiece" onConfirm={onConfirm} />
    </div>
  ));
}

function ReadyReviewStage({ state }) {
  const sections = [
    {
      title: "Machine Checks",
      items: state.machineChecks.map((item) => item.label),
    },
    {
      title: "Required Tools",
      items: state.tools.map((tool) => `${tool.toolNumber} - ${tool.toolType}`),
    },
    {
      title: "Workpiece Setup",
      items: state.workpieceSetup.map((item) => item.label),
    },
  ];

  return (
    <>
      <div className="review-box">
        <h3>READY Checklist</h3>
        {sections.map((section) => (
          <div className="review-section" key={section.title}>
            <p>
              <strong>{section.title}</strong>
            </p>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <p>
          <strong>Machine state:</strong> READY
        </p>
      </div>
      <p className="empty-copy">Press Next to open the operation screen.</p>
    </>
  );
}

function OperationStage({ state }) {
  const status = state.appState.operationStatus.toLowerCase();
  return (
    <div className={`operation-box ${status}`}>
      <h3>{state.job.operationName}</h3>
      <p>
        Current status: <strong>{state.appState.operationStatus}</strong>
      </p>
      <p>
        Job quantity: <strong>{state.job.quantity}</strong>
      </p>
      <p>
        Material: <strong>{state.job.material}</strong>
      </p>
    </div>
  );
}

function StageContent({ state, onConfirm }) {
  const stageKey = state.appState.activeStage;

  if (stageKey === "machine-checks") {
    return <MachineChecksStage state={state} onConfirm={onConfirm} />;
  }

  if (stageKey === "tools") {
    return <ToolsStage state={state} onConfirm={onConfirm} />;
  }

  if (stageKey === "workpiece") {
    return <WorkpieceStage state={state} onConfirm={onConfirm} />;
  }

  if (stageKey === "ready-review") {
    return <ReadyReviewStage state={state} />;
  }

  return <OperationStage state={state} />;
}

function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadState() {
      try {
        const nextState = await request("/api/state");
        if (active) {
          setState(nextState);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      }
    }

    loadState();

    return () => {
      active = false;
    };
  }, []);

  async function runAction(action, options) {
    try {
      const nextState = await request(action, options);
      setState(nextState);
    } catch (actionError) {
      setError(actionError.message);
    }
  }

  async function confirmItem(stage, itemId) {
    await runAction("/api/confirm", {
      method: "POST",
      body: { stage, itemId },
    });
  }

  async function nextStage() {
    await runAction("/api/next-stage", { method: "POST" });
  }

  async function startOperation() {
    await runAction("/api/operation/start", { method: "POST" });
  }

  async function stopOperation() {
    await runAction("/api/operation/stop", { method: "POST" });
  }

  async function resetDemo() {
    await runAction("/api/reset", { method: "POST" });
  }

  if (error && !state) {
    return (
      <div className="app-shell">
        <div className="panel">
          <h1>Unable to load</h1>
          <p className="empty-copy">{error}</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-shell">
        <div className="panel">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  const stageKey = state.appState.activeStage;
  const currentIndex = state.stageOrder.indexOf(stageKey);
  const currentComplete = state.completedStages[stageKey];
  const nextDisabled =
    currentIndex === state.stageOrder.length - 1 || (!currentComplete && currentIndex < 3);
  const startDisabled = !(stageKey === "operation" && state.appState.operationStatus !== "RUNNING");
  const stopDisabled = state.appState.operationStatus !== "RUNNING";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Primeform Labs</p>
          <h1>VMC Operator HMI</h1>
        </div>
        <div className="status-block">
          <span className="status-label">Operation Status</span>
          <strong id="operationStatus" className="status-pill">
            {state.appState.operationStatus}
          </strong>
        </div>
      </header>

      <main className="layout">
        <SummaryPanel job={state.job} onReset={resetDemo} />

        <section className="panel main-panel">
          <div className="stage-header">
            <div>
              <p className="eyebrow">Current Stage</p>
              <h2>{stageLabels[stageKey]}</h2>
            </div>
            <p className="stage-hint">{stageHints[stageKey]}</p>
          </div>

          <ProgressBar state={state} />

          <div className="stage-content">
            <StageContent state={state} onConfirm={confirmItem} />
          </div>

          <div className="actions">
            <button className="primary-button" disabled={nextDisabled} onClick={nextStage}>
              Next
            </button>
            <button
              className="primary-button accent-button"
              disabled={startDisabled}
              onClick={startOperation}
            >
              Start Operation
            </button>
            <button className="secondary-button" disabled={stopDisabled} onClick={stopOperation}>
              Stop Operation
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
