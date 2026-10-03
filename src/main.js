import { initializeRuntime } from './runtime.js';

// Keep controls inside the userscript sandbox. The panel binds them directly.
const ViewerTracker = initializeRuntime();
