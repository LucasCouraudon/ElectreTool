import { bindEvents, restoreMatrix } from './matrix.js';
import { initHistory } from './history.js';

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    restoreMatrix();
    initHistory();
});

