import { activeMethod } from './matrix.js';

const CURRENT_PROJECT_KEY = 'electre_current_project';
const HISTORY_KEY = 'electre_projects_history';

/**
 * Core base blueprint describing the essential metadata and structure of an ELECTRE project session.
 * Shared by all specific algorithmic implementations.
 */
interface BaseProjectState {
    /** Unique tracking identifier (typically a timestamp string or 'current'). */
    id: string;
    /** Human-readable designation of the project snapshot version. */
    name: string;
    /** Simplified ISO 8601 string representation of the last mutation timestamp. */
    updatedAt: string;
    /** Geometric shape properties and serialized raw data elements of the performance matrix. */
    matrix: {
        /** Total number of alternatives (rows) evaluated in the grid. */
        rows: number;
        /** Total number of criteria (columns) evaluated in the grid. */
        cols: number;
        /** Flattened, one-dimensional collection of cell string scores scraped from inputs. */
        data: string[];
    };
    /** Ordered collection of raw weights assigned to each active evaluation criterion. */
    weights: string[]; 
    /** Custom localized designations assigned by the user to the alternative alternatives rows. */
    alternativeNames: string[]; 
    /** Custom localized designations assigned by the user to the evaluation criteria columns. */
    criterionNames: string[];
    criterionDirections: ('max' | 'min')[] | undefined;
}

/**
 * Extended state configuration specialized for running the ELECTRE Iv outranking algorithm.
 * Implements absolute thresholds to filter structural domination profiles.
 */
export interface ElectreIvProjectState extends BaseProjectState {
    /** Discriminator token specifying the ELECTRE Iv operational mode. */
    method: 'ELECTRE_Iv';
    /** Custom performance rejection values. */
    thresholds: {
        /** Minimum acceptable concordance index boundary layer required for outranking. */
        minConcordance: number; 
        /** Column-indexed array of veto configurations preventing outranking if exceeded. */
        vetoes: string[];       
    };
}

/**
 * Extended state configuration specialized for running the ELECTRE II outranking algorithm.
 * Relies on multiple levels of concordance and discordance conditions.
 */
export interface ElectreIIProjectState extends BaseProjectState {
    /** Discriminator token specifying the ELECTRE II operational mode. */
    method: 'ELECTRE_II';
    /** Ordered discrete levels for filtering concordance and discordance sets. */
    thresholds: {
        /** Descending array of concordance compliance benchmarks (e.g., strong, medium, weak). */
        concordanceLevels: number[]; 
        /** Ascending array of discordance filtering compliance benchmarks. */
        discordanceLevels: number[]; 
    };
}

/**
 * Discriminated union matching any valid operational state payload within the application ecosystem.
 */
export type ProjectState = ElectreIIProjectState | ElectreIvProjectState;

/**
 * Retrieves, parses, and arranges the collection of historical project iterations recorded on the host browser.
 * Performs a reverse-chronological sort based on the `updatedAt` metadata parameter.
 * * **Side Effects:**
 * - **Storage Read**: Executes a synchronous read transaction on the `localStorage` engine.
 * * @returns {ProjectState[]} A sorted array containing historical sessions, or an empty array if parsing crashes.
 */
export function getProjectHistory(): ProjectState[] {
    const rawData = localStorage.getItem(HISTORY_KEY);
    if (!rawData) return [];
    try {
        const history: ProjectState[] = JSON.parse(rawData);
        history.sort((a, b) => {
            const timeA = Date.parse(a.updatedAt);
            const timeB = Date.parse(b.updatedAt);
            return timeB - timeA;
        });
        return history;
    } catch {
        return [];
    }
}


/**
 * Coordinates continuous state extraction and continuous automatic persistence operations.
 * Flattens UI grid structures, parses method-specific parameters, and mirrors data to disk.
 * * **Side Effects:**
 * - **DOM Scrape**: Scrapes numerical values, text states, and array lengths directly from layout cells.
 * - **Storage Write**: Flushes updated states down to active cache keys and matching history index rows.
 * - **Event Notification**: Dispatches a global `projectUpdated` event signal across the shared `document` scope.
 * * @returns {void}
 */
export function triggerAutosave(): void {
    const previousState = loadSavedProject();
    const history = getProjectHistory();

    let activeId = previousState ? previousState.id : "current";
    let activeName = previousState ? previousState.name : "";

    if (activeId === "current") {
        activeId = Date.now().toString();
        activeName = `Project ${history.length + 1}`;
    }

    const matrixInputs = document.querySelectorAll('.matrix-input') as NodeListOf<HTMLInputElement>;
    const matrixData: string[] = [];
    matrixInputs.forEach(input => matrixData.push(input.value.trim()));

    const rows = document.querySelectorAll('#matrix-body tr').length;
    const cols = document.querySelectorAll('#header-row th').length - 2;

    const directionSelectors = document.querySelectorAll('.criterion-direction-selector') as NodeListOf<HTMLSelectElement>;
    const criterionDirectionsData: ('max' | 'min')[] = [];

    directionSelectors.forEach(select => {
        const val = select.value === 'min' ? 'min' : 'max';
        criterionDirectionsData.push(val);
    });

    const weightInputs = document.querySelectorAll('.weight-input') as NodeListOf<HTMLInputElement>;
    const weightsData: string[] = [];
    weightInputs.forEach(input => weightsData.push(input.value.trim()));

    let thresholdsData: any = {};

    if (activeMethod === 'ELECTRE_Iv') {
        const vetoInputs = document.querySelectorAll('.threshold-input') as NodeListOf<HTMLInputElement>;
        const vetoes: string[] = [];
        vetoInputs.forEach(input => vetoes.push(input.value.trim()));
        
        thresholdsData = {
            minConcordance: 0.6,
            vetoes: vetoes
        };
    } else {
        thresholdsData = {
            concordanceLevels: [0.7, 0.6, 0.5],
            discordanceLevels: [0.3, 0.2]
        };
    }

    const altInputs = document.querySelectorAll('.alt-display-name') as NodeListOf<HTMLSpanElement>;
    const alternativeNamesData: string[] = [];
    altInputs.forEach(input => {
        const safeText = input.textContent !== null ? input.textContent.trim() : '';
        alternativeNamesData.push(safeText);
    });

    const critInputs = document.querySelectorAll('.crit-display-name')as NodeListOf<HTMLSpanElement>;
    const criterionNamesData: string[] = [];
    critInputs.forEach(input => {
        const safeText = input.textContent !== null ? input.textContent.trim() : '';
        criterionNamesData.push(safeText);
    });

    const projectState: ProjectState = {
        id: activeId,
        name: activeName,
        updatedAt: new Date().toISOString(),
        method: activeMethod,
        matrix: {
            rows: rows,
            cols: cols,
            data: matrixData
        },
        weights: weightsData,
        alternativeNames: alternativeNamesData,
        criterionNames: criterionNamesData,
        thresholds: thresholdsData,
        criterionDirections: criterionDirectionsData
    };

    const existingIndex = history.findIndex(p => p.id === activeId);
    if (existingIndex !== -1) {
        history[existingIndex] = projectState;
    } else {
        history.push(projectState);
    }

    localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(projectState));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    
    document.dispatchEvent(new Event('projectUpdated'));
}

/**
 * Resolves, isolates, and parses the singular active working session record stored on disk.
 * * **Side Effects:**
 * - **Storage Read**: Extracts string payloads tied to the core active project operational key.
 * * @returns {ProjectState | null} The active parsed `ProjectState` reference instance, or `null` if empty or corrupted.
 */
export function loadSavedProject(): ProjectState | null {
    const storageData = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!storageData) return null;

    try {
        const project: ProjectState = JSON.parse(storageData);
        return project;
    } catch (error) {
        console.error("Erreur de parsing du projet", error);
        return null;
    }
}

