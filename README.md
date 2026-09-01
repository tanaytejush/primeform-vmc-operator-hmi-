# VMC Operator HMI

A simple React and Node.js web app for a simulated VMC machine startup workflow.

The operator completes the required checks, confirms the tools and workpiece setup, reviews the job, and then starts or stops the simulated operation.

## Live Demo

https://primeform-vmc-operator-hmi.onrender.com

## Main Features

- Machine readiness checklist
- Required tool confirmation
- Workpiece setup confirmation
- Ready review before operation
- Start, stop, and reset controls
- Progress saved in a local JSON file for the demo

## Run Locally

```bash
npm install
npm start
```

Open http://localhost:3000

## Built With

- React
- Node.js
- HTML and CSS
- JSON file for demo state

## Project Structure

- `src/app.jsx` - React interface
- `server.js` - Node.js server and API routes
- `data/state.json` - Mock job data and operator progress
- `public/styles.css` - Page styling
