/**
 * @file electre.ts
 * @description Pure mathematical computation engine for ELECTRE methods.
 */

import type { ElectreIIProjectState, ElectreIvProjectState, ProjectState } from './persistence.js';

/**
 * Extracts a specific cell score from the flattened 1D data array using 2D coordinates.
 * * @param {ProjectState} project - The active project state payload.
 * @param {number} altIndex - The row index of the targeted alternative.
 * @param {number} critIndex - The column index of the targeted criterion.
 * @returns {number} The numerical score value of the calculated cell.
 */
function getMatrixScore(project: ProjectState, altIndex: number, critIndex: number): number {
    const numCrits = project.matrix.cols;
    const flatIndex = (altIndex * numCrits) + critIndex;
    return Number(project.matrix.data[flatIndex]);
}

/**
 * Computes the absolute performance range (Max - Min) for a given criterion index.
 * Prevents zero-division vulnerabilities by fallback scaling.
 * * @param {ProjectState} project - The active project state payload.
 * @param {number} critIndex - The column index of the targeted criterion.
 * @returns {number} The dynamic scale amplitude of the criterion (Minimum fallback of 1).
 */
function getCriterionScale(project: ProjectState, critIndex: number): number {
    const numAlts = project.matrix.rows;
    let maxScore = -Infinity;
    let minScore = Infinity;

    for (let i = 0; i < numAlts; i++) {
        const score = getMatrixScore(project, i, critIndex);
        maxScore = score > maxScore ? score : maxScore;
        minScore = score < minScore ? score : minScore;
    }

    const amplitude = maxScore - minScore;
    
    // DEFENSIVE GATE: If all scores are identical, amplitude is 0. 
    // Returning 1 neutralizes division-by-zero while preserving mathematical safety.
    return amplitude <= 0 ? 1 : amplitude;
}

/**
 * Computes the raw partial concordance matrix by evaluating criteria dominance profiles.
 * * @param {ProjectState} project - The active project state payload.
 * @param {number[]} normalizedWeights - Array of pre-calculated normalized criteria weights.
 * @returns {number[][]} A square matrix representing pairwise concordance indices.
 */
export function computeConcordanceMatrix(project: ProjectState, normalizedWeights: number[]): number[][] {
    const numAlts = project.matrix.rows;
    const numCrits = project.matrix.cols;
    const concordance: number[][] = Array.from({ length: numAlts }, () => Array(numAlts).fill(0));

    for (let a = 0; a < numAlts; a++) {
        for (let b = 0; b < numAlts; b++) {
            if (a === b) continue;
            
            let accumulatedConcordance = 0;

            for (let j = 0; j < numCrits; j++) {
                const scoreA = getMatrixScore(project, a, j);
                const scoreB = getMatrixScore(project, b, j);
                const direction = project.criterionDirections ? project.criterionDirections[j] : 'max';
                let satisfiesDominance = false;

                if (direction === 'max') {
                    satisfiesDominance = scoreA >= scoreB;
                } else {
                    satisfiesDominance = scoreA <= scoreB;
                }

                if (satisfiesDominance) {
                    accumulatedConcordance += normalizedWeights[j];
                }
            }
            concordance[a][b] = accumulatedConcordance;
        }
    }
    return concordance;
}

/**
 * Computes the pairwise discordance matrix for ELECTRE II.
 * Measures the maximum normalized dissatisfaction for criteria where alternative B beats alternative A.
 * * @param {ProjectState} project - The active immutable project state payload.
 * @returns {number[][]} A square matrix of size (numAlts x numAlts) containing discordance indices.
 */
export function computeDiscordanceMatrix(project: ProjectState): number[][] {
    const numAlts = project.matrix.rows;
    const numCrits = project.matrix.cols;
    const discordance: number[][] = Array.from({ length: numAlts }, () => Array(numAlts).fill(0));

    const criterionScales: number[] = [];
    for (let j = 0; j < numCrits; j++) {
        criterionScales.push(getCriterionScale(project, j));
    }

    for (let a = 0; a < numAlts; a++) {
        for (let b = 0; b < numAlts; b++) {
            if (a === b) continue;

            let maxDiscordanceForPair = 0;

            for (let j = 0; j < numCrits; j++) {
                const scoreA = getMatrixScore(project, a, j);
                const scoreB = getMatrixScore(project, b, j);
                const direction = project.criterionDirections ? project.criterionDirections[j] : 'max';
                
                let isDiscordant = false;
                let penalty = 0;

                if (direction === 'max') {
                    isDiscordant = scoreA < scoreB;
                    penalty = scoreB - scoreA;
                } else {
                    isDiscordant = scoreA > scoreB;
                    penalty = scoreA - scoreB;
                }

                if (isDiscordant) {
                    const normalizedPenalty = penalty / criterionScales[j];
                    if (normalizedPenalty > maxDiscordanceForPair) {
                        maxDiscordanceForPair = normalizedPenalty;
                    }
                }
            }
            discordance[a][b] = maxDiscordanceForPair;
        }
    }
    return discordance;
}

/**
 * Structural compilation output containing calculated matrices and identified graph edges.
 */
export interface ElectreOutput {
    concordanceMatrix: number[][];
    discordanceMatrix?: number[][];
    /** Pairs of indices [[a, b], [b, c]] representing directed outranking edges. */
    outrankingGraph: [number, number][];
}

/**
 * Executes the complete algorithmic synthesis for ELECTRE II by matching matrices against configured thresholds.
 * * @param {ProjectState} project - The active project state payload.
 * @param {number[]} normalizedWeights - Array of pre-calculated normalized criteria weights.
 * @returns {ElectreOutput} Complete structural outranking analysis.
 */
export function calculateElectreII(project: ElectreIIProjectState, normalizedWeights: number[]): ElectreOutput {
    const concordance = computeConcordanceMatrix(project, normalizedWeights);
    const discordance = computeDiscordanceMatrix(project);
    const outrankingGraph: [number, number][] = [];

    const numAlts = project.matrix.rows;

    const minTresholdConcordance = project.thresholds.concordanceLevels[1];
    const maxTresholdDiscordance = project.thresholds.discordanceLevels[0];

    for (let a = 0; a < numAlts; a++) {
        for (let b = 0; b < numAlts; b++) {
            if (a === b) continue;
            if(concordance[a][b] >= minTresholdConcordance && discordance[a][b] <= maxTresholdDiscordance){
                outrankingGraph.push([a,b]);
            }
        }
    }

    return {
        concordanceMatrix: concordance,
        discordanceMatrix: discordance,
        outrankingGraph
    };
}

/**
 * Executes the complete algorithmic synthesis for ELECTRE Iv by evaluating dominance and veto barriers.
 * Omit discordance checks, relying instead on absolute localized criteria veto tolerances.
 * * **Side Effects:** None (Pure mathematical function).
 * * @param {ElectreIvProjectState} project - The active project state payload configured for ELECTRE Iv.
 * @param {number[]} normalizedWeights - Array of pre-calculated normalized criteria weights.
 * @returns {ElectreOutput} Complete structural outranking analysis.
 */
export function calculateElectreIv(project: ElectreIvProjectState, normalizedWeights: number[]): ElectreOutput {
    const concordance = computeConcordanceMatrix(project, normalizedWeights);
    const outrankingGraph: [number, number][] = [];
    const numAlts = project.matrix.rows;
    const numCrits = project.matrix.cols;

    const minConcordance = project.thresholds.minConcordance;

    for (let a = 0; a < numAlts; a++) {
        for (let b = 0; b < numAlts; b++) {
            if (a === b) continue;

            if (concordance[a][b] < minConcordance) {
                continue;
            }

            let isVetoTriggered = false;

            for (let j = 0; j < numCrits; j++) {
                const scoreA = getMatrixScore(project, a, j);
                const scoreB = getMatrixScore(project, b, j);
                const direction = project.criterionDirections ? project.criterionDirections[j] : 'max';
                const vetoThreshold = Number(project.thresholds.vetoes[j]);

                let deficit = 0;
                if (direction === 'max') {
                    deficit = scoreB - scoreA;
                } else {
                    deficit = scoreA - scoreB;
                }

                if (deficit > vetoThreshold) {
                    isVetoTriggered = true;
                    break; 
                }
            }

            if (!isVetoTriggered) {
                outrankingGraph.push([a, b]);
            }
        }
    }

    return {
        concordanceMatrix: concordance,
        outrankingGraph
    };
}

/**
 * Unified calculation router acting as a type guard hub.
 * Resolves the active methodology and delegates execution to the targeted algorithm.
 * * @param {ProjectState} project - The active project state payload.
 * @param {number[]} normalizedWeights - Array of pre-calculated normalized criteria weights.
 * @returns {ElectreOutput} The computed matrices and outranking graph edges.
 */
export function executeActiveElectre(project: ProjectState, normalizedWeights: number[]): ElectreOutput {
    if (project.method === 'ELECTRE_II') {
        const res: ElectreOutput = calculateElectreII(project,normalizedWeights);  
        return res;
    } else {
        const res: ElectreOutput = calculateElectreIv(project,normalizedWeights);  
        return res;
    }
};

/**
 * Generates a square HTML table element representing an ELECTRE matrix.
 * Maps alternative designations onto row and column dimensions while blanking out diagonal conflicts.
 * * @param {number[][]} matrix - The calculated square matrix values (concordance or discordance).
 * @param {string[]} altNames - The localized alternative labels designated by the user.
 * @returns {HTMLTableElement} A fully configured table element ready for DOM attachment.
 */
export function generateResultTable(matrix: number[][], altNames: string[]): HTMLTableElement {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const cornerTh = document.createElement('th');
    cornerTh.textContent = "—";
    headerRow.appendChild(cornerTh);

    altNames.forEach(name => {
        const th = document.createElement('th');
        th.textContent = name;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let i = 0; i < matrix.length; i++) {
        const tr = document.createElement('tr');
        
        const rowHeaderTd = document.createElement('td');
        rowHeaderTd.innerHTML = `<strong>${altNames[i]}</strong>`;
        tr.appendChild(rowHeaderTd);

        for (let j = 0; j < matrix[i].length; j++) {
            const td = document.createElement('td');

            if (i === j) {
                td.textContent = '-';
            } else {        
                td.textContent = matrix[i][j].toFixed(3);
            }
            
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    return table;
}