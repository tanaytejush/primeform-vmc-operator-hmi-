const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "public");
const statePath = path.join(__dirname, "data", "state.json");
const stageOrder = ["machine-checks", "tools", "workpiece", "ready-review", "operation"];

function readState() {
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "text/plain; charset=utf-8" });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function getStageItems(state, stageKey) {
  if (stageKey === "machine-checks") {
    return state.machineChecks;
  }

  if (stageKey === "tools") {
    return state.tools;
  }

  if (stageKey === "workpiece") {
    return state.workpieceSetup;
  }

  return [];
}

function isStageComplete(state, stageKey) {
  const items = getStageItems(state, stageKey);
  return items.length === 0 || items.every((item) => item.confirmed);
}

function formatResponse(state) {
  return {
    job: state.job,
    machineChecks: state.machineChecks,
    tools: state.tools,
    workpieceSetup: state.workpieceSetup,
    appState: state.appState,
    stageOrder,
    completedStages: {
      "machine-checks": isStageComplete(state, "machine-checks"),
      tools: isStageComplete(state, "tools"),
      workpiece: isStageComplete(state, "workpiece"),
      "ready-review": isStageComplete(state, "machine-checks") && isStageComplete(state, "tools") && isStageComplete(state, "workpiece"),
      operation: false
    }
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, formatResponse(readState()));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/confirm") {
    const { stage, itemId } = await parseBody(req);
    const state = readState();
    const items = getStageItems(state, stage);
    const item = items.find((entry) => entry.id === itemId);

    if (!item) {
      sendJson(res, 404, { error: "Item not found" });
      return;
    }

    item.confirmed = true;
    writeState(state);
    sendJson(res, 200, formatResponse(state));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/next-stage") {
    const state = readState();
    const currentIndex = stageOrder.indexOf(state.appState.activeStage);

    if (currentIndex === -1) {
      sendJson(res, 400, { error: "Invalid current stage" });
      return;
    }

    const currentStage = stageOrder[currentIndex];
    if ((currentStage === "machine-checks" || currentStage === "tools" || currentStage === "workpiece") && !isStageComplete(state, currentStage)) {
      sendJson(res, 400, { error: "Complete all items before moving ahead" });
      return;
    }

    if (currentIndex < stageOrder.length - 1) {
      state.appState.activeStage = stageOrder[currentIndex + 1];
      writeState(state);
    }

    sendJson(res, 200, formatResponse(state));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/operation/start") {
    const state = readState();
    const ready = isStageComplete(state, "machine-checks") && isStageComplete(state, "tools") && isStageComplete(state, "workpiece");

    if (!ready || state.appState.activeStage !== "operation") {
      sendJson(res, 400, { error: "Operation can start only after setup is complete" });
      return;
    }

    state.appState.operationStatus = "RUNNING";
    writeState(state);
    sendJson(res, 200, formatResponse(state));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/operation/stop") {
    const state = readState();
    state.appState.operationStatus = "STOPPED";
    writeState(state);
    sendJson(res, 200, formatResponse(state));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    const state = readState();

    for (const item of state.machineChecks) {
      item.confirmed = false;
    }

    for (const item of state.tools) {
      item.confirmed = false;
    }

    for (const item of state.workpieceSetup) {
      item.confirmed = false;
    }

    state.appState.activeStage = "machine-checks";
    state.appState.operationStatus = "READY";
    writeState(state);
    sendJson(res, 200, formatResponse(state));
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    const requestPath = req.url === "/" ? "/index.html" : req.url;
    const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    sendFile(res, path.join(publicDir, safePath));
  } catch (error) {
    sendJson(res, 500, { error: "Server error", detail: error.message });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`VMC HMI running on http://localhost:${PORT}`);
});

