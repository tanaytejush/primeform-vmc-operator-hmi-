# Primeform VMC Operator HMI Assignment

This is a small Node.js web app for a single VMC operator workflow.
It guides the operator through machine checks, required tools, workpiece setup, ready review, and a simple operation start/stop flow.

## Folder structure

- `server.js` - Node server, API routes, and static file serving
- `data/state.json` - mock job data and saved operator progress
- `public/index.html` - page structure
- `public/styles.css` - responsive HMI styling
- `public/app.js` - frontend logic and API calls

## How it works

The app loads one mock machining job and guides the operator through:

1. Machine checks
2. Required tools
3. Workpiece setup
4. Ready review
5. Operation

The operator confirms each item. The app only allows moving to the next stage when the current stage is complete.

## Run locally

```bash
npm start
```

Then open `http://localhost:3000`
