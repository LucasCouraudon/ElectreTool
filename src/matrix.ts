import { executeActiveElectre, generateResultTable, type ElectreOutput } from './electre.js';
import { triggerAutosave, loadSavedProject, type ProjectState } from './persistence.js';
import { GraphVisualizer } from './graph.js';

/** Reactive structural indicator tracking the total amount of columns currently drawn. */
export let criterionCount: number = 2;

/** Reactive structural indicator tracking the total amount of alternative rows currently drawn. */
export let alternativeCount: number = 2;

/** Algorithmic operational target type identifier bound to the active decision configuration. */
export let activeMethod: 'ELECTRE_II' | 'ELECTRE_Iv' = 'ELECTRE_II';

let isRestoring = false;

/**
 * Switches the global algorithmic context token, adjusts layout parameters, and re-validates elements.
 * * @param {'ELECTRE_II' | 'ELECTRE_Iv'} method - The targeted ELECTRE methodology variant to assign.
 * @returns {void}
 */
export function setActiveMethod(method: 'ELECTRE_II' | 'ELECTRE_Iv'): void {
    activeMethod = method;
    renderMethodSpecificFields();
    validateMatrix();
}

/**
 * Appends, updates, or hides input rows specific to algorithmic conditions inside the table footer template.
 * Inject structural text inputs for veto limits when switching to ELECTRE Iv.
 * * **Side Effects:**
 * - **DOM Modification**: Appends or modifies table rows inside the footer section element node tree.
 * * @returns {void}
 */
function renderMethodSpecificFields(): void {
    const footer = document.getElementById('matrix-footer') as HTMLTableSectionElement | null;
    if (!footer) return;

    let vetoRow = document.getElementById('veto-weights-row') as HTMLTableRowElement | null;

    if (activeMethod === 'ELECTRE_Iv') {
        if (!vetoRow) {
            vetoRow = document.createElement('tr');
            vetoRow.id = 'veto-weights-row';

            const tdLabel = document.createElement('td');
            tdLabel.innerHTML = '<strong>Threshold (v)</strong>';
            vetoRow.appendChild(tdLabel);

            for (let index = 0; index < criterionCount; index++) {
                const td: HTMLTableCellElement = document.createElement('td');
                const input: HTMLInputElement = document.createElement('input');
                input.type = "text";
                input.value = "0";
                input.className = "threshold-input";
                input.addEventListener('input', validateMatrix);
                td.appendChild(input);
                vetoRow.appendChild(td);
            }

            const tdFiller = document.createElement('td');
            tdFiller.className = "footer-filler";
            vetoRow.appendChild(tdFiller);

            footer.appendChild(vetoRow);
        }
        vetoRow.classList.remove('hidden');
    } else {
        if (vetoRow) {
            vetoRow.classList.add('hidden');
        }
    }
}

/**
 * Controls the visibility toggle of the warning container notifying users of undersized matrices.
 * * **Side Effects:**
 * - **Style Mutation**: Direct modification of the display attribute rules on the error element.
 * * @param {boolean} show - Dictates whether the architectural minimum layout error box becomes visible.
 * @returns {void}
 */
function toggleSizeWarning(show: boolean): void {
    const sizeErrorBox = document.getElementById('size-error-box') as HTMLDivElement | null;
    if (sizeErrorBox) {
        sizeErrorBox.style.display = show ? "block" : "none";
    }
}

/**
 * Scans, evaluates, and filters all input data fields embedded across the active matrix framework grid.
 * Applies conditional validation styles and unlocks mathematical weight normalization blocks if successful.
 * * **Side Effects:**
 * - **CSS Token Mutation**: Appends or tears down `.invalid` and `.hidden` selector classes from tree targets.
 * - **Downstream Trigger**: Automatically runs downstream matrix computations upon clean input runs.
 * * @returns {void}
 */
export function validateMatrix(): void {

    if (isRestoring) {
        return;
    }

    const inputs = document.querySelectorAll('.matrix-input') as NodeListOf<HTMLInputElement>;
    const weightsInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
    const thresholdInputs = document.querySelectorAll('.threshold-input') as NodeListOf<HTMLInputElement>;
    const weightsNormalized = document.querySelector('#normalized-weights-row');
    const tresholdRow = document.querySelector('#veto-weights-row'); 
    const matrixFooter = document.querySelector('#matrix-footer');
    let hasError: boolean = false;

    inputs.forEach((input: HTMLInputElement) => {
        const val: string = input.value.trim();
        if (val === "" || isNaN(Number(val))) {
            input.classList.add('invalid');
            hasError = true;
            if (matrixFooter) matrixFooter.classList.add('hidden');
        } else {
            input.classList.remove('invalid');
        }
    });

    weightsInputs.forEach((input: HTMLInputElement) => {
        const val: string = input.value.trim();
        if (val === "" || isNaN(Number(val)) || Number(val) <= 0) {
            input.classList.add('invalid');
            hasError = true;
            if (weightsNormalized) weightsNormalized.classList.add('hidden');
            if (tresholdRow) tresholdRow.classList.add('hidden');
        } else {
            input.classList.remove('invalid');
        }
    });

    if(activeMethod === 'ELECTRE_Iv'){
        thresholdInputs.forEach((input : HTMLInputElement) => {
        const val: string = input.value.trim();
        if (val === "" || isNaN(Number(val)) || Number(val) < 0) {
            input.classList.add('invalid');
            hasError = true;
        } else {
            input.classList.remove('invalid');
        } 
    })
    }

    const errorBox = document.getElementById('error-box') as HTMLDivElement | null;

    if (!hasError) {
        if (errorBox) errorBox.style.display = "none";
        if (matrixFooter) matrixFooter.classList.remove('hidden');   
        if (weightsNormalized) weightsNormalized.classList.remove('hidden');
        if(activeMethod === 'ELECTRE_Iv'){
            if (tresholdRow) tresholdRow.classList.remove('hidden');
        }
        updateWeightsAndNormalize();

        const freshProject = loadSavedProject();
        if (freshProject) {
            const normalizedSpans = document.querySelectorAll('.normalized-weight-display') as NodeListOf<HTMLSpanElement>;
            const normalizedWeights: number[] = [];
            normalizedSpans.forEach(span => normalizedWeights.push(Number(span.textContent)));

            const results = executeActiveElectre(freshProject, normalizedWeights);

            displayElectreResults(results, freshProject.alternativeNames);
        }
    } else {
        if (errorBox) errorBox.style.display = "block";
    }
}

/**
 * Appends an evaluation row to the matrix body. Computes default names or recovers historical labels,
 * structuralizes individual cells with data-bound edit controls, and forces validation.
 * * **Side Effects:**
 * - **DOM Tree Extension**: Injects interactive element chains down into the matrix body branch.
 * * @returns {void}
 */
export function addAlternative(): void {
    alternativeCount++;
    toggleSizeWarning(false);
    
    const tbody = document.getElementById('matrix-body') as HTMLTableSectionElement | null;
    if (!tbody) return;

    const tr: HTMLTableRowElement = document.createElement('tr');
    const tdLabel: HTMLTableCellElement = document.createElement('td');
    const currentIndex = alternativeCount - 1;
    const project = loadSavedProject();
    const altName = project?.alternativeNames[currentIndex] ? project?.alternativeNames[currentIndex] : `A${alternativeCount}`;

    tdLabel.innerHTML = `
        <strong><span class="alt-display-name">${altName}</span></strong>
        <button class="btn-edit-alt-name" data-index="${currentIndex}"><i class="fa-solid fa-pen"></i></button>
    `;
    tr.appendChild(tdLabel);

    for (let i = 0; i < criterionCount; i++) {
        const td: HTMLTableCellElement = document.createElement('td');
        const input: HTMLInputElement = document.createElement('input');
        input.type = "text";
        input.value = "0";
        input.className = "matrix-input";
        input.addEventListener('input', validateMatrix);
        td.appendChild(input);
        tr.appendChild(td);
    }

    const tdFiller = document.createElement('td');
    tdFiller.className = "body-filler";
    tr.appendChild(tdFiller);

    tbody.appendChild(tr);
    validateMatrix();
}

/**
 * Tethers and drops the trailing data row entry from the evaluation matrix layout grid.
 * Implements strict defensive checks preventing downsizing below a 2x2 framework.
 * * **Side Effects:**
 * - **DOM Pruning**: Tears down interactive element child nodes from the evaluation body branch.
 * * @param {boolean} isSilent - Disables or triggers browser confirmation alerts (`confirm()`) before removal operations.
 * @returns {void}
 */
export function removeAlternative(isSilent: boolean): void {
    const tbody = document.getElementById('matrix-body') as HTMLTableSectionElement | null;
    if (alternativeCount <= 2) {
        toggleSizeWarning(!isSilent);
        return;
    }
    const hasConfirmed = isSilent || confirm(`Are you sure you want to remove alternative A${alternativeCount}?`);
    
    if (!hasConfirmed) return;

    if (tbody && tbody.lastChild) {
        alternativeCount--;
        tbody.removeChild(tbody.lastChild as Node);
        toggleSizeWarning(false);
        validateMatrix();
    }
}

/**
 * Extends the grid layout by attaching a column branch. Generates header labels with embedded crayon
 * editing targets, distributes text inputs across rows, and maps corresponding weights inside the footer.
 * * **Side Effects:**
 * - **DOM Restructuring**: Appends cells across headers, body rows, and validation layers simultaneously.
 * * @returns {void}
 */
export function addCriterion(): void {
    criterionCount++;
    toggleSizeWarning(false);
    
    const headerRow = document.getElementById('header-row') as HTMLTableRowElement | null;
    const actionsCritCell = document.getElementById('actions-crit-cell');
    if (!headerRow || !actionsCritCell) return;

    const th: HTMLTableCellElement = document.createElement('th');
    const currentIndex = criterionCount - 1;
    const project = loadSavedProject();
    const critName = project?.criterionNames[currentIndex] ? project?.criterionNames[currentIndex] : `C${criterionCount}`;

    th.innerHTML = `
        <span class="crit-display-name">${critName}</span>
        <button class="btn-edit-crit-name" data-index="${currentIndex}"><i class="fa-solid fa-pen"></i></button>
    `;
    
    headerRow.insertBefore(th, actionsCritCell);

    const rows = document.querySelectorAll('#matrix-body tr') as NodeListOf<HTMLTableRowElement>;
    rows.forEach((row: HTMLTableRowElement) => {
        const td: HTMLTableCellElement = document.createElement('td');
        const input: HTMLInputElement = document.createElement('input');
        input.type = "text";
        input.value = "0";
        input.className = "matrix-input";
        input.addEventListener('input', validateMatrix);
        td.appendChild(input);
        
        const bodyFiller = row.lastElementChild;
        row.insertBefore(td, bodyFiller);
    });

    const tdDirection = document.createElement('td');
    tdDirection.innerHTML = `
        <select class="criterion-direction-selector" data-index="${currentIndex}">
            <option value="max"> Gain (Max)</option>
            <option value="min"> Cost (Min)</option>
        </select>
    `;
    tdDirection.addEventListener('change', validateMatrix);
    const directionRow = document.querySelector('#matrix-footer tr#criterion-direction-row')!;
    directionRow.insertBefore(tdDirection, directionRow.lastElementChild);
    
    const rawWeightsRow = document.querySelector('#matrix-footer tr#raw-weights-row')!;
    let td = document.createElement('td');
    const input = document.createElement('input');
    input.type = "text";
    input.value = "1";
    input.className = "weight-input";
    input.addEventListener('input', validateMatrix);
    td.appendChild(input);
    rawWeightsRow.insertBefore(td, rawWeightsRow.lastElementChild);

    const normalizedWeightsRow = document.querySelector('#matrix-footer tr#normalized-weights-row')!;
    td = document.createElement('td');
    const span = document.createElement('span');
    span.textContent = "0.5";
    span.className = "normalized-weight-display";
    td.appendChild(span);
    normalizedWeightsRow.insertBefore(td, normalizedWeightsRow.lastElementChild);

    const vetoRow = document.querySelector('#matrix-footer tr#veto-weights-row');
    if (vetoRow) {
        const tdVeto = document.createElement('td');
        const inputVeto = document.createElement('input');
        inputVeto.type = "text";
        inputVeto.value = "0";
        inputVeto.className = "threshold-input";
        inputVeto.addEventListener('input', validateMatrix);
        tdVeto.appendChild(inputVeto);
        vetoRow.insertBefore(tdVeto, vetoRow.lastElementChild);
    }
    
    validateMatrix();
}

/**
 * Drops the trailing vertical criteria column branch from the layout framework.
 * Implements safe boundaries preventing grid layouts from collapsing below 2 units.
 * * **Side Effects:**
 * - **DOM Pruning**: Remotely isolates and drops trailing cells across every row layer component.
 * * @param {boolean} isSilent - Controls whether confirmation prompts interrupt the runtime sequence execution.
 * @returns {void}
 */
export function removeCriterion(isSilent: boolean): void {
    const headerRow = document.getElementById('header-row') as HTMLTableRowElement | null;
    if (criterionCount <= 2) {
        toggleSizeWarning(!isSilent);
        return;
    }

    const hasConfirmed = isSilent || confirm(`Are you sure you want to remove criterion C${criterionCount}?`);
    if (!hasConfirmed) return;

    if (headerRow) {
        criterionCount--;

        const targetTh = headerRow.children[headerRow.children.length - 2];
        headerRow.removeChild(targetTh);

        const rows = document.querySelectorAll('#matrix-body tr') as NodeListOf<HTMLTableRowElement>;
        rows.forEach((row: HTMLTableRowElement) => {
            const targetTd = row.children[row.children.length - 2];
            row.removeChild(targetTd);
        });

        const criterionDirectionRow = document.querySelector('#matrix-footer tr#criterion-direction-row')!;
        const rawWeightsRow = document.querySelector('#matrix-footer tr#raw-weights-row')!;
        const normalizedWeightsRow = document.querySelector('#matrix-footer tr#normalized-weights-row')!;
        const vetoRow = document.querySelector('#matrix-footer tr#veto-weights-row');

        criterionDirectionRow.removeChild(criterionDirectionRow.children[criterionDirectionRow.children.length - 2]);
        rawWeightsRow.removeChild(rawWeightsRow.children[rawWeightsRow.children.length - 2]);
        normalizedWeightsRow.removeChild(normalizedWeightsRow.children[normalizedWeightsRow.children.length - 2]);
        
        if (vetoRow) {
            vetoRow.removeChild(vetoRow.children[vetoRow.children.length - 2]);
        }
        
        toggleSizeWarning(false);
        validateMatrix();
    }
}

/**
 * Controls the bootstrap cycle and view synchronization sequence. Evaluates data records from storage,
 * injects starting blueprints upon cold boots, and adjusts grid geometry to match historical sizes.
 * * **Side Effects:**
 * - **Total View Re-write**: Rewrites values, inputs, selector indices, and headers across the application layout.
 * - **Storage Bootstrapping**: Flushes structural data down to local caches when profiles are missing.
 * * @returns {void}
 */
export function restoreMatrix(): void {
    let project = loadSavedProject();
    isRestoring = true;
    
    if (!project) {
        const defaultProject: ProjectState = {
            id: "current",
            name: "Project 1",
            updatedAt: new Date().toISOString(),
            method: 'ELECTRE_II',
            matrix: {
                rows: 2,
                cols: 2,
                data: ['0', '0', '0', '0']
            },
            weights: ['1', '1'],
            thresholds: {
                concordanceLevels: [0.7, 0.6, 0.5],
                discordanceLevels: [0.3, 0.2]
            },
            alternativeNames: ['A1', 'A2'],
            criterionNames: ['C1', 'C2'],
            criterionDirections: ['max', 'max']
        };
        localStorage.setItem('electre_current_project', JSON.stringify(defaultProject));
        project = defaultProject;
    }

    try {
        setActiveMethod(project.method);

        const methodSelector = document.getElementById('method-selector') as HTMLSelectElement | null;
        if (methodSelector) {
            methodSelector.value = project.method;
        }

        const tbody = document.getElementById('matrix-body');
        if (tbody) {
            tbody.innerHTML = '';
        }

        const headerRow = document.getElementById('header-row');
        if (headerRow) {
            while (headerRow.children.length > 2) {
                headerRow.removeChild(headerRow.children[1]);
            }
        }

        const footerRows = document.querySelectorAll('#matrix-footer tr');
        footerRows.forEach(row => {
            while (row.children.length > 2) {
                row.removeChild(row.children[1]);
            }
        });

        criterionCount = 0;
        alternativeCount = 0;

        while (alternativeCount !== project.matrix.rows) {
            if (alternativeCount < project.matrix.rows) {
                addAlternative();
            } else {
                removeAlternative(true);
            }
        }

        while (criterionCount !== project.matrix.cols) {
            if (criterionCount < project.matrix.cols) {
                addCriterion();
            } else {
                removeCriterion(true);
            }
        }

        const matrixInputs = document.querySelectorAll('.matrix-input') as NodeListOf<HTMLInputElement>;
        matrixInputs.forEach((input, index) => {
            if (project.matrix.data[index] !== undefined) {
                input.value = project.matrix.data[index];
            }
        });

        const weightInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
        weightInputs.forEach((input, index) => {
            if(project.weights[index] !== undefined){
                input.value = project.weights[index];
            }
        });

        if(project.method === "ELECTRE_Iv"){
            const vetoInputs = document.querySelectorAll('.threshold-input') as NodeListOf<HTMLInputElement>;
            vetoInputs.forEach((input,index) => {
                if(project.thresholds.vetoes[index] !== undefined){
                    input.value = project.thresholds.vetoes[index];
                }
            });
        }

        const altInputs = document.querySelectorAll('.alt-display-name') as NodeListOf<HTMLSpanElement>;
        altInputs.forEach((span, index) => {
            if(project.alternativeNames![index] !== undefined){
                span.textContent = project.alternativeNames![index];
            }
        });

        const critInputs = document.querySelectorAll('.crit-display-name') as NodeListOf<HTMLSpanElement>;
        critInputs.forEach((span, index) => {
            if(project.criterionNames![index] !== undefined){
                span.textContent = project.criterionNames![index];
            }
        });

        const criterionDirectionValue = document.querySelectorAll('.criterion-direction-selector') as NodeListOf<HTMLSelectElement>;
        criterionDirectionValue.forEach((select, index) => {
            if(project.criterionDirections![index] !== undefined){
                select.value = project.criterionDirections![index];
            }
        });

        isRestoring = false;
        validateMatrix(); 
    } catch (error) {
        isRestoring = false;
        console.error("Error during the reconstruction :", error);
    }
}

/**
 * Event aggregation hub mapping active interface hooks across layout objects.
 * Sets up listeners for selectors, monitors matrix updates via delegation, and captures header edits.
 * * **Side Effects:**
 * - **Listener Registrations**: Attaches persistent input, mutation, and click tracking hooks to core DOM roots.
 * * @returns {void}
 */
export function bindEvents(): void {
    const methodSelector = document.getElementById('method-selector') as HTMLSelectElement | null;
    if (methodSelector) {   
        methodSelector.addEventListener('change', (event: Event) => {
            const method = event.target as HTMLSelectElement;
            const val = method.value;
            if (val === "ELECTRE_II" || val === "ELECTRE_Iv") {
                setActiveMethod(val);
            } else {
                console.error("Invalid method selected:", val);
            }
        });
    }

    const inputs = document.querySelectorAll('.matrix-input') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input: HTMLInputElement) => {
        input.addEventListener('input', validateMatrix);
    });

    
    const criteriondirectionselector = document.querySelectorAll('.criterion-direction-selector') as NodeListOf<HTMLSelectElement>;
    criteriondirectionselector.forEach((select: HTMLSelectElement) => {
        select.addEventListener('change', validateMatrix);
    });
        
    const weightInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
    weightInputs.forEach((input: HTMLInputElement) => {
        input.addEventListener('input', validateMatrix);
    });

    const table = document.getElementById('matrix-table')!;

    table.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.classList.contains('btn-edit-alt-name') || target.closest('.btn-edit-alt-name')) {
            const button = target.classList.contains('btn-edit-alt-name') ? target : target.closest('.btn-edit-alt-name')!;
            const index = parseInt(button.getAttribute('data-index')!, 10);
            
            const project = loadSavedProject();
            if (!project) return;

            const currentName = project.alternativeNames?.[index] || `A${index + 1}`;
            const newName = prompt("Rename alternative:", currentName);
            
            if (newName != null && newName.trim().length > 0) {
                if(!project.alternativeNames) project.alternativeNames = [];
                project.alternativeNames[index] = newName;
                localStorage.setItem('electre_current_project',JSON.stringify(project));
                restoreMatrix();
            }
        }

        if (target.classList.contains('btn-edit-crit-name') || target.closest('.btn-edit-crit-name')) {
            const button = target.classList.contains('btn-edit-crit-name') ? target : target.closest('.btn-edit-crit-name')!;
            const index = parseInt(button.getAttribute('data-index')!, 10);
            
            const project = loadSavedProject();
            if (!project) return;

            const currentName = project.criterionNames?.[index] || `C${index + 1}`;
            const newName = prompt("Rename criterion:", currentName);
            
            if (newName != null && newName.trim().length > 0) {
                if(!project.criterionNames) project.criterionNames = [];
                project.criterionNames[index] = newName;
                localStorage.setItem('electre_current_project',JSON.stringify(project));
                restoreMatrix();
            }
        }
    });

    document.getElementById('btn-add-alt')?.addEventListener('click', addAlternative);
    document.getElementById('btn-rem-alt')?.addEventListener('click', () => {removeAlternative(false)});
    document.getElementById('btn-add-crit')?.addEventListener('click', addCriterion);
    document.getElementById('btn-rem-crit')?.addEventListener('click', () => { removeCriterion(false)});
}

/**
 * Computes individual proportional ratios for all user weight metrics. Updates display tokens
 * inside the layout grid footer block and passes control down to the database persistence routine.
 * * **Side Effects:**
 * - **DOM Update**: Overwrites text content values across normalized evaluation display blocks.
 * - **Persistence Flush**: Commands an immediate data flash down to storage via `triggerAutosave()`.
 * * @returns {void}
 */
export function updateWeightsAndNormalize(): void {
    const rawInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
    const normalizedDisplays = document.querySelectorAll('.normalized-weight-display') as NodeListOf<HTMLSpanElement>;

    let totalSum = 0;
    const weights: number[] = [];

    rawInputs.forEach((input) => {
        const val = Number(input.value.trim());
        weights.push(val);
        totalSum+= val;
    });

    if (totalSum > 0) {
        weights.forEach((w, index) => {
            const normalizedValue = w/totalSum;
            if (normalizedDisplays[index]) {
                normalizedDisplays[index].textContent = normalizedValue.toFixed(3);
            }
        });
    }

    if(isRestoring){
        return;
    }
    triggerAutosave();
}

/**
 * Resets structural values back to baseline states.
 * Reverts fields to '0', establishes baseline weights of '1', and runs layout error filtering.
 * * **Side Effects:**
 * - **UI Overwrite**: Re-inserts standard baseline numbers across all drawn input layers.
 * * @returns {void}
 */
export function resetMatrix(): void {
    const inputs = document.querySelectorAll('.matrix-input') as NodeListOf<HTMLInputElement>;
    const weightsInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
    const thresholdInputs = document.querySelectorAll('.threshold-input') as NodeListOf<HTMLInputElement>;

    inputs.forEach((input: HTMLInputElement) => {
        input.value='0';
    });

    weightsInputs.forEach((input: HTMLInputElement) => {
        input.value='1';
    });

    if(activeMethod === 'ELECTRE_Iv'){
        thresholdInputs.forEach((input : HTMLInputElement) => {
            input.value='0';
    })
    }
    validateMatrix();
}

/**
 * Renders the calculated ELECTRE decision results directly into the DOM container spaces.
 * * @param {ElectreOutput} results - The computed structural data sheets from the math engine.
 * @param {string[]} altNames - User-defined names of the alternatives for text translation.
 * @returns {void}
 */
export function displayElectreResults(results: ElectreOutput, altNames: string[]): void {
    const concordanceContainer = document.getElementById('concordance-results-container');
    const discordanceContainer = document.getElementById('discordance-results-container');
    const discordanceBlock = document.getElementById('discordance-block');
    const graphList = document.getElementById('outranking-graph-list');

    if (!concordanceContainer || !discordanceContainer || !discordanceBlock || !graphList) return;

    if (results.discordanceMatrix) {
        discordanceBlock.classList.remove('hidden');
        discordanceContainer.innerHTML = '';
        const discordanceTable = generateResultTable(results.discordanceMatrix, altNames);
        discordanceContainer.appendChild(discordanceTable);
    } else {
        discordanceBlock.classList.add('hidden');
    }

    concordanceContainer.innerHTML = '';
    const concordanceTable = generateResultTable(results.concordanceMatrix, altNames);
    concordanceContainer.appendChild(concordanceTable);

    graphList.innerHTML = '';

    if (results.outrankingGraph.length === 0) {
        graphList.innerHTML = '<li class="neutral">No outranking relations identified with current thresholds.</li>';
    } else {
        const graph = results.outrankingGraph;
        const equivalents: [number, number][] = [];
        const stricts: [number, number][] = [];

        graph.forEach(([a, b]) => {
            const isMutual = graph.some(([x, y]) => x === b && y === a);
            if (isMutual) {
                equivalents.push([a, b]);
            } else {
                stricts.push([a, b]);
            }
        });

        equivalents.forEach(([a, b]) => {
            const li = document.createElement('li');
            li.className = "equivalence-item"; 
            li.textContent = `Alternative ${altNames[a]} is equivalent to Alternative ${altNames[b]}`;
            graphList.appendChild(li);
        });

        stricts.forEach(([a, b]) => {
            const li = document.createElement('li');
            li.textContent = `Alternative ${altNames[a]} strictly outranks Alternative ${altNames[b]}`;
            graphList.appendChild(li);
        });
    }

    // Déclenchement automatique du rendu du graphe SVG
    const visualizer = new GraphVisualizer('graph-vector-container');
    visualizer.render(altNames, results.outrankingGraph);
}

