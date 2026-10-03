import { initializeRuntime } from './runtime.js';

const ViewerTracker = initializeRuntime();

if (typeof unsafeWindow !== 'undefined') {
    unsafeWindow.ViewerTracker = ViewerTracker;
} else {
    window.ViewerTracker = ViewerTracker;
}
