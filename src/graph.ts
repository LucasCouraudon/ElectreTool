/**
 * @file graph.ts
 * @description Native SVG Outranking Graph Visualizer
 */

interface GraphNode {
    id: number;
    name: string;
    x: number;
    y: number;
}

export class GraphVisualizer {
    private containerId: string;
    
    constructor(containerId: string) {
        this.containerId = containerId;
    }

    /**
     * Renders the outranking relations using dynamic SVG mathematical mapping.
     * @param {string[]} altNames - User-defined names of the alternatives.
     * @param {[number, number][]} edges - Array of directed outranking arcs.
     */
    public render(altNames: string[], edges: [number, number][]): void {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const width = 600;
        const height = 450;
        const radius = 130; 
        const centerX = width / 2;
        const centerY = height / 2;

        const nodes: GraphNode[] = altNames.map((name, index) => {
            const angle = (index * 2 * Math.PI) / altNames.length - Math.PI / 2;
            return {
                id: index,
                name: name,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        svgContent += `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a085"/>
                </marker>
            </defs>`;

        edges.forEach(([sourceId, targetId]) => {
            const source = nodes[sourceId];
            const target = nodes[targetId];

            const isBidirectional = edges.some(([x, y]) => x === targetId && y === sourceId);

            if (isBidirectional) {
                const midX = (source.x + target.x) / 2;
                const midY = (source.y + target.y) / 2;
                
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                
                const controlX = midX + nx * 30;
                const controlY = midY + ny * 30;

                svgContent += `
                    <path d="M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}" 
                          stroke="#16a085" stroke-width="2" fill="none" marker-end="url(#arrow)" />
                `;
            } else {
                svgContent += `
                    <line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" 
                          stroke="#16a085" stroke-width="2" marker-end="url(#arrow)" />
                `;
            }
        });

        nodes.forEach(node => {
            svgContent += `
                <circle cx="${node.x}" cy="${node.y}" r="22" fill="#2c3e50" stroke="#16a085" stroke-width="2" />
                <text x="${node.x}" y="${node.y + 5}" fill="#ffffff" font-size="12" font-weight="bold" text-anchor="middle">
                    A${node.id + 1}
                </text>
                
                <text x="${node.x}" y="${node.y + 38}" fill="#2c3e50" font-size="12" font-weight="bold" text-anchor="middle">
                    ${node.name}
                </text>
            `;
        });

        svgContent += `</svg>`;
        container.innerHTML = svgContent;
    }
}