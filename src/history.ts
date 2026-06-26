import { activeMethod, restoreMatrix } from './matrix.js';
import { getProjectHistory, type ProjectState } from './persistence.js';

/**
 * Registers sidebar event hooks, orchestrates initial list construction, and sets up reactive
 * observer bindings to redraw version arrays whenever state modifications emit signals.
 * * **Side Effects:**
 * - **Event Interception**: Establishes tracking loops monitoring global state notifications.
 * - **Délégation Mapping**: Binds a single router hook across the history listing root container node.
 * * @returns {void}
 */
export function initHistory(): void {
    const sidebar = document.getElementById('history-sidebar')!;
    const toggleBtn = document.getElementById('sidebar-toggle-btn')!;
    const closeBtn = document.getElementById('sidebar-close-btn')!;
    const overlay = document.getElementById('sidebar-overlay')!;

    const historyList = document.getElementById('history-list')!;

    document.addEventListener('projectUpdated', () => {
        renderHistory();
    });

    renderHistory();

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    });
    closeBtn.addEventListener('click', closeHistory);
    overlay.addEventListener('click', closeHistory);


    historyList.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const history = getProjectHistory();

        if (target.classList.contains('btn-create-new') || target.closest('.btn-create-new')) {
            if (confirm("Are you sure you want to start a new project?")) {
                localStorage.removeItem('electre_current_project'); 

                const baseProject = {
                    id: Date.now().toString(),
                    name: `Project ${history.length + 1}`,
                    updatedAt: new Date().toISOString(),
                    matrix: {
                        rows: 2,
                        cols: 2,
                        data: ['0','0','0','0'],
                    },
                    weights: ['1','1'],
                    alternativeNames: ['A1','A2'], 
                    criterionNames: ['C1','C2'],
                    criterionDirections: ['max', 'max'] as ("max" | "min")[]
                };

                let newProject: ProjectState;

                if (activeMethod === 'ELECTRE_Iv') {
                    newProject = {
                        ...baseProject,
                        method: 'ELECTRE_Iv',
                        thresholds: {
                            minConcordance: 0.6,
                            vetoes: ['0', '0']
                        }
                    };
                } else {
                    newProject = {
                        ...baseProject,
                        method: 'ELECTRE_II',
                        thresholds: {
                            concordanceLevels: [0.7, 0.6, 0.5],
                            discordanceLevels: [0.3, 0.2]
                        }
                    };
                }

                localStorage.setItem('electre_current_project', JSON.stringify(newProject));
                restoreMatrix();
                closeHistory();
            }
            return;
        }
        
        if (target.classList.contains('btn-edit-name') || target.closest('.btn-edit-name')) {
            const button = target.classList.contains('btn-edit-name') ? target : target.closest('.btn-edit-name')!;
            const projectId = button.getAttribute('data-id');

            if (!projectId) return;

            const history = getProjectHistory();
            const projectToRename = history.find(p => p.id === projectId);

            if (projectToRename) {
                const newName = prompt("Rename version:", projectToRename.name);
                if (newName != null && newName.trim().length >= 3 && newName.trim().length < 50) {
                    projectToRename.name = newName;
                    const rawData = localStorage.getItem('electre_current_project');
                    if (rawData){
                        try {
                            const currentProject: ProjectState = JSON.parse(rawData);
                            if(currentProject.id === projectId){
                                currentProject.name = newName;
                                localStorage.setItem('electre_current_project', JSON.stringify(currentProject));
                            }
                        }catch (error){
                            console.log(error);
                        }
                    }
                    localStorage.setItem('electre_projects_history', JSON.stringify(history));
                    renderHistory();
                }
            }
        }

        if (target.classList.contains('btn-restore')) {
            const button = target.classList.contains('btn-restore') ? target : target.closest('.btn-restore')!;
            const projectId = button.getAttribute('data-id');

            if (!projectId) return;
            if (confirm("Do you want to restore this version?")) {
                const history = getProjectHistory();
                const targetProject = history.find(project => project.id === projectId);
                if (targetProject) {
                    localStorage.setItem('electre_current_project', JSON.stringify(targetProject));
                    restoreMatrix();
                    closeHistory();
                }
            }
        }

        if (target.classList.contains('btn-delete') || target.closest('.btn-delete')) {
            const button = target.classList.contains('btn-delete') ? target : target.closest('.btn-delete')!;
            const projectId = button.getAttribute('data-id');
            if (!projectId) return;

            if (confirm("Are you sure you want to permanently delete this version?")) {
                deleteProjectFromHistory(projectId);
            }
        }

    });
}

/**
 * Purges targeted configuration records from the shared storage database arrays.
 * * **Side Effects:**
 * - **Storage Overwrite**: Updates historical cache records inside the host local database index.
 * - **Event Generation**: Dispatches a global signal notifying attached interfaces of the archive mutation.
 * * @param {string} projectId - The tracking timestamp reference string linked to the targeted historical file entry.
 * @returns {void}
 */
export function deleteProjectFromHistory(projectId: string): void {
    const history = getProjectHistory();

    const updatedHistory = history.filter((project) => {
        return project.id != projectId;
    });

    localStorage.setItem('electre_projects_history', JSON.stringify(updatedHistory));
    
    document.dispatchEvent(new Event('projectUpdated'));
}

/**
 * Hides the history navigation drawer view by stripping visibility classes from active components.
 * * **Side Effects:**
 * - **Class List Mutation**: Drops class flags from structural drawer layout boundaries.
 * * @returns {void}
 */
export function closeHistory(): void {
    const sidebar = document.getElementById('history-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

/**
 * Reconstructs the structural history layout index branch. Clears older nodes, builds the
 * permanent "New Project" entry point element, and draws components for saved sessions.
 * * **Side Effects:**
 * - **DOM Destruction & Generation**: Completely rewires and rewrites internal lists using compiled template strings.
 * - **Styling Fallbacks**: Toggles class definitions depending on database index volumes.
 * * @returns {void}
 */
export function renderHistory(): void {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const history = getProjectHistory();
    historyList.innerHTML = '';

    const newProjectLi = document.createElement('li');
    newProjectLi.classList.add('new-project-container');

    newProjectLi.innerHTML = `
        <button class="btn-create-new">
            New Project
        </button>
    `;
    historyList.appendChild(newProjectLi);

    if (history.length === 0) {
        historyList.classList.add('neutral');
        historyList.innerHTML = '<li>No saved version..</li>';
        const newProjectLi = document.createElement('li');
        newProjectLi.classList.add('new-project-container');

        newProjectLi.innerHTML = `
            <button class="btn-create-new">
                New Project
            </button>
        `;
        historyList.appendChild(newProjectLi);
        return;
    }
    historyList.classList.remove('neutral');

    history.forEach((project) => {
        const li = document.createElement('li');
        li.classList.add('history-item');

        li.innerHTML = `
            <div class="history-item-header">
                <div>
                    <strong class="project-name-text">${project.name}</strong>
                    <button class="btn-edit-name" data-id="${project.id}"><i class="fa-solid fa-pen"></i></button>
                </div>
                <span class="badge history-item-badge">${project.method}</span>
            </div>
            <div class="history-item-details">
                ${project.matrix.rows} alts / ${project.matrix.cols} crits
            </div>
            <div class="history-item-footer">
                <small class="history-item-date">${new Date(project.updatedAt).toLocaleString()}</small>
                <div class="history-actions-group">
                    <button class="btn-restore" data-id="${project.id}">Restore</button>
                    <button class="btn-delete" data-id="${project.id}">Delete</button>
                </div>
            </div>
        `;
        historyList.appendChild(li);
    });
}