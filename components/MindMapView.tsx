import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CampaignBlueprint, MindMapNode, AdConcept, AwarenessStage, CreativeFormat, PlacementFormat, TargetPersona, BuyingTriggerObject } from '../types';
import { RefreshCwIcon, ZoomInIcon, ZoomOutIcon, LocateIcon, Trash2Icon, UsersIcon, FireIcon } from './icons';
import { CreativeCard } from './CreativeCard';

// Layout Constants
const X_SPACING_PERSONA = 350;
const X_SPACING_AWARENESS = 300;
const X_SPACING_ANGLE = 300;
const X_SPACING_TRIGGER = 300;
const X_SPACING_FORMAT = 300;
const X_SPACING_PLACEMENT = 300;
const X_SPACING_CREATIVE = 380;

const Y_SPACING_PERSONA = 40;
const Y_SPACING_AWARENESS = 30;
const Y_SPACING_ANGLE = 40;
const Y_SPACING_TRIGGER = 30;
const Y_SPACING_FORMAT = 30;
const Y_SPACING_PLACEMENT = 20;
const Y_SPACING_CREATIVE = 30;


// --- Tooltip Component ---
const Tooltip: React.FC<{ content: React.ReactNode; x: number; y: number }> = ({ content, x, y }) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: y + 20, left: x + 20 });

    useEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const newPos = { top: y + 20, left: x + 20 };

            if (newPos.left + rect.width > window.innerWidth - 10) {
                newPos.left = x - rect.width - 20;
            }
            if (newPos.top + rect.height > window.innerHeight - 10) {
                newPos.top = y - rect.height - 20;
            }
            setPosition(newPos);
        }
    }, [x, y, content]);


    return (
        <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed max-w-sm bg-brand-surface/90 backdrop-blur-md border border-gray-600 rounded-lg p-3 shadow-2xl z-50 text-sm text-brand-text-secondary pointer-events-none animate-fadeIn"
            style={{ top: position.top, left: position.left }}
        >
            {content}
        </div>
    );
};


// --- Node Components ---

const DnaNode: React.FC<{ node: MindMapNode }> = ({ node }) => {
    const blueprint = node.content as CampaignBlueprint;
    const appState = (window as any).appState;
    const referenceImage = appState?.referenceImage ?? '';

    return (
        <div className="p-4 bg-brand-surface border-2 border-brand-primary rounded-xl shadow-2xl w-full h-full flex flex-col">
            <h3 className="text-center font-bold text-lg mb-2 uppercase tracking-wider">Campaign Blueprint</h3>
            {referenceImage && (
                <div className="aspect-square bg-gray-900 rounded-md overflow-hidden mb-3">
                    <img src={`data:image/jpeg;base64,${referenceImage}`} alt="Reference Ad" className="w-full h-full object-cover" />
                </div>
            )}
            <div className="text-xs space-y-1.5 text-brand-text-secondary overflow-y-auto pr-2">
                <p><strong className="text-brand-text-primary">Produk:</strong> {blueprint.productAnalysis.name}</p>
                <p><strong className="text-brand-text-primary">Manfaat Utama:</strong> {blueprint.productAnalysis.keyBenefit}</p>
                <p><strong className="text-brand-text-primary">Persona Awal:</strong> {blueprint.targetPersona.description}</p>
            </div>
        </div>
    );
};

const PersonaNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => {
    const { persona } = node.content as { persona: TargetPersona };
    return (
        <div
            onClick={() => onToggle(node.id)}
            className={`relative p-3 w-full h-full rounded-lg shadow-lg flex flex-col justify-between text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-700'
                : 'bg-purple-600 hover:bg-purple-500 border-2 border-purple-600 transform hover:scale-105'}`
            }
        >
            <UsersIcon className="w-5 h-5 absolute top-2 right-2 text-purple-200" />
            <div>
                <h4 className="font-bold text-base line-clamp-2">{persona.description}</h4>
                 <div className="flex justify-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${node.isExpanded ? 'bg-gray-800 text-gray-300' : 'bg-purple-700 text-purple-100'}`}>{persona.age}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${node.isExpanded ? 'bg-gray-800 text-gray-300' : 'bg-purple-700 text-purple-100'}`}>{persona.creatorType}</span>
                </div>
            </div>
            {!node.isExpanded && (
                 <p className="text-xs text-purple-200 mt-2">Klik untuk memilih tahap</p>
            )}
        </div>
    );
};

const AwarenessStageNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => (
    <div
        onClick={() => onToggle(node.id)}
        className={`p-3 w-full h-full rounded-lg shadow-lg flex items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-600'
                : 'bg-yellow-600 hover:bg-yellow-500 border-2 border-yellow-600 transform hover:scale-105'}`
        }
    >
        <div>
            <h4 className="font-semibold text-md">{node.label}</h4>
            {!node.isExpanded && (
                 <p className="text-xs text-yellow-100 mt-1">Klik untuk buat angle</p>
            )}
        </div>
    </div>
);

const AngleNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => (
    <div
        onClick={() => onToggle(node.id)}
        className={`relative p-4 w-full h-full rounded-lg shadow-lg flex items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-700'
                : 'bg-brand-primary hover:bg-indigo-500 border-2 border-brand-primary transform hover:scale-105'}`
        }
    >
        <div>
            <h4 className="font-bold text-lg">{node.label}</h4>
            {!node.isExpanded && <p className="text-xs text-indigo-200 mt-1">Klik untuk buat trigger</p>}
        </div>
    </div>
);

const TriggerNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => (
    <div
        onClick={() => onToggle(node.id)}
        className={`relative p-3 w-full h-full rounded-lg shadow-lg flex items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-600'
                : 'bg-orange-600 hover:bg-orange-500 border-2 border-orange-600 transform hover:scale-105'}`
        }
    >
        <FireIcon className="w-4 h-4 absolute top-2 right-2 text-orange-200" />
        <div>
            <h4 className="font-semibold text-md">{node.label}</h4>
            <p className="text-xs text-orange-200">Buying Trigger</p>
            {!node.isExpanded && (
                 <p className="text-xs text-orange-100 mt-1">Klik untuk buat format</p>
            )}
        </div>
    </div>
);

const FormatNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => (
    <div
        onClick={() => onToggle(node.id)}
        className={`p-3 w-full h-full rounded-lg shadow-lg flex items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-600'
                : 'bg-brand-secondary hover:bg-green-500 border-2 border-brand-secondary transform hover:scale-105'}`
        }
    >
        <div>
            <h4 className="font-semibold text-md">{node.label}</h4>
            {!node.isExpanded && (
                 <p className="text-xs text-green-100 mt-1">Klik untuk buat penempatan</p>
            )}
        </div>
    </div>
);

const PlacementNode: React.FC<{ node: MindMapNode, onToggle: (id: string) => void }> = ({ node, onToggle }) => (
    <div
        onClick={() => onToggle(node.id)}
        className={`p-3 w-full h-full rounded-lg shadow-lg flex items-center justify-center text-center transition-all duration-300 cursor-pointer
            ${node.isExpanded
                ? 'bg-brand-surface border-2 border-gray-600'
                : 'bg-cyan-600 hover:bg-cyan-500 border-2 border-cyan-600 transform hover:scale-105'}`
        }
    >
        <div>
            <h4 className="font-semibold text-md">{node.label}</h4>
            {!node.isExpanded && (
                 <p className="text-xs text-cyan-100 mt-1">Klik untuk buat ide</p>
            )}
        </div>
    </div>
);


const NodeComponent: React.FC<{
    node: MindMapNode;
    onTogglePersona: (id: string) => void;
    onToggleAngle: (id: string) => void;
    onToggleTrigger: (id: string) => void;
    onToggleAwareness: (id: string) => void;
    onToggleFormat: (id: string) => void;
    onTogglePlacement: (id: string) => void;
    onGenerateImage: (id: string) => void;
    onEditConcept: (id: string) => void;
    onEvolveConcept: (id: string) => void;
    onOpenLightbox: (concept: AdConcept, startIndex: number) => void;
    onDeleteNode: (id: string) => void;
    onNodeHover: (id: string | null, event: React.MouseEvent | null) => void;
}> = (props) => {
    const { node, onTogglePersona, onToggleAngle, onToggleTrigger, onToggleAwareness, onToggleFormat, onTogglePlacement, onDeleteNode, onNodeHover } = props;
    
    return (
        <div className="node-container group relative" onMouseEnter={(e) => onNodeHover(node.id, e)} onMouseLeave={() => onNodeHover(null, null)}>
            {node.type === 'dna' && <DnaNode node={node} />}
            {node.type === 'persona' && <PersonaNode node={node} onToggle={onTogglePersona} />}
            {node.type === 'awareness' && <AwarenessStageNode node={node} onToggle={onToggleAwareness} />}
            {node.type === 'angle' && <AngleNode node={node} onToggle={onToggleAngle} />}
            {node.type === 'trigger' && <TriggerNode node={node} onToggle={onToggleTrigger} />}
            {node.type === 'format' && <FormatNode node={node} onToggle={onToggleFormat} />}
            {node.type === 'placement' && <PlacementNode node={node} onToggle={onTogglePlacement} />}
            {node.type === 'creative' && <CreativeCard node={node} onGenerateImage={props.onGenerateImage} onEditConcept={props.onEditConcept} onEvolveConcept={props.onEvolveConcept} onOpenLightbox={props.onOpenLightbox} />}
            
            {node.type !== 'dna' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
                    title="Hapus Node"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                >
                    <Trash2Icon className="w-4 h-4 text-white" />
                </button>
            )}
        </div>
    );
};


// --- Auto-Layout Calculation ---

const calculateLayout = (nodes: MindMapNode[]): MindMapNode[] => {
    if (nodes.length === 0) return [];
    
    const laidOutNodes = new Map<string, MindMapNode>();
    const childrenMap = new Map<string, MindMapNode[]>();
    nodes.forEach(node => {
        const children = childrenMap.get(node.parentId || 'root') || [];
        children.push(node);
        childrenMap.set(node.parentId || 'root', children);
    });

    const dnaNode = nodes.find(n => n.type === 'dna');
    if (!dnaNode) return nodes;

    const getSubtreeHeight = (nodeId: string): number => {
        const node = nodes.find(n => n.id === nodeId)!;
        if (!node.isExpanded) return node.height || 0;
        
        const children = childrenMap.get(nodeId) || [];
        if (children.length === 0) return node.height || 0;

        const Y_SPACING_MAP: Record<string, number> = {
            'dna': Y_SPACING_PERSONA,
            'persona': Y_SPACING_AWARENESS,
            'awareness': Y_SPACING_ANGLE,
            'angle': Y_SPACING_TRIGGER,
            'trigger': Y_SPACING_FORMAT,
            'format': Y_SPACING_PLACEMENT,
            'placement': Y_SPACING_CREATIVE,
        };
        const spacing = Y_SPACING_MAP[node.type] || 20;

        const totalChildrenHeight = children.reduce((acc, child) => {
            return acc + getSubtreeHeight(child.id) + spacing;
        }, -spacing);

        return Math.max(node.height || 0, totalChildrenHeight);
    };


    dnaNode.position = { x: 50, y: -(dnaNode.height || 0) / 2 };
    laidOutNodes.set(dnaNode.id, { ...dnaNode });
    
    const layoutChildren = (parentId: string, parentX: number, parentY: number, parentHeight: number) => {
        const children = (childrenMap.get(parentId) || []).sort((a, b) => a.label.localeCompare(b.label));
        if (children.length === 0) return;
        
        const parentNode = nodes.find(n => n.id === parentId)!;
        
        const X_SPACING_MAP: Record<string, number> = {
            'dna': X_SPACING_PERSONA,
            'persona': X_SPACING_AWARENESS,
            'awareness': X_SPACING_ANGLE,
            'angle': X_SPACING_TRIGGER,
            'trigger': X_SPACING_FORMAT,
            'format': X_SPACING_PLACEMENT,
            'placement': X_SPACING_CREATIVE,
        };
        const xSpacing = X_SPACING_MAP[parentNode.type] || 300;
        
        const Y_SPACING_MAP: Record<string, number> = {
            'dna': Y_SPACING_PERSONA,
            'persona': Y_SPACING_AWARENESS,
            'awareness': Y_SPACING_ANGLE,
            'angle': Y_SPACING_TRIGGER,
            'trigger': Y_SPACING_FORMAT,
            'format': Y_SPACING_PLACEMENT,
            'placement': Y_SPACING_CREATIVE,
        };
        const ySpacing = Y_SPACING_MAP[parentNode.type] || 20;


        const totalSubtreeHeight = children.reduce((acc, child) => acc + getSubtreeHeight(child.id) + ySpacing, -ySpacing);
        let currentChildY = parentY + parentHeight / 2 - totalSubtreeHeight / 2;

        children.forEach(child => {
            const subtreeHeight = getSubtreeHeight(child.id);
            child.position = {
                x: parentX + xSpacing,
                y: currentChildY + subtreeHeight / 2 - (child.height || 0) / 2
            };
            laidOutNodes.set(child.id, { ...child });
            
            if (child.isExpanded) {
                layoutChildren(child.id, child.position.x, child.position.y, child.height || 0);
            }
            currentChildY += subtreeHeight + ySpacing;
        });
    };
    
    layoutChildren(dnaNode.id, dnaNode.position.x, dnaNode.position.y, dnaNode.height || 0);
    
    const rootSubtreeHeight = getSubtreeHeight(dnaNode.id);
    const dnaNodeRef = laidOutNodes.get(dnaNode.id);
    if(dnaNodeRef) {
        dnaNodeRef.position.y = -rootSubtreeHeight / 2 + (dnaNode.height || 420) / 2;
        layoutChildren(dnaNode.id, dnaNodeRef.position.x, dnaNodeRef.position.y, dnaNode.height || 0);
    }
    
    return Array.from(laidOutNodes.values());
};



// --- Main Mind Map View ---

interface MindMapViewProps {
    nodes: MindMapNode[];
    onTogglePersona: (nodeId: string) => void;
    onToggleAngle: (nodeId: string) => void;
    onToggleTrigger: (nodeId: string) => void;
    onToggleAwareness: (nodeId: string) => void;
    onToggleFormat: (nodeId: string) => void;
    onTogglePlacement: (nodeId: string) => void;
    onGenerateImage: (conceptId: string) => void;
    onEditConcept: (conceptId: string) => void;
    onEvolveConcept: (conceptId: string) => void;
    onOpenLightbox: (concept: AdConcept, startIndex: number) => void;
    onDeleteNode: (nodeId: string) => void;
    onReset: () => void;
    onGenerateMorePersonas: () => void;
    onAddCustomPersona: () => void;
}

export const MindMapView: React.FC<MindMapViewProps> = (props) => {
    const { nodes } = props;
    const [view, setView] = useState({ x: 0, y: 0, k: 0.7 });
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ content: React.ReactNode; x: number; y: number } | null>(null);

    const laidOutNodes = useMemo(() => calculateLayout(nodes), [nodes]);
    const nodesMap = useMemo(() => new Map(laidOutNodes.map(node => [node.id, node])), [laidOutNodes]);

    const isNodeVisible = (node: MindMapNode, map: Map<string, MindMapNode>): boolean => {
        if (!node.parentId) return true;
        let parent = map.get(node.parentId);
        while (parent) {
            if (parent.isExpanded === false) return false;
            parent = parent.parentId ? map.get(parent.parentId) : undefined;
        }
        return true;
    };

    const visibleNodes = useMemo(() => laidOutNodes.filter(node => isNodeVisible(node, nodesMap)), [laidOutNodes, nodesMap]);
    
    const highlightedPathIds = useMemo(() => {
        if (!hoveredNodeId) return new Set();
        const path = new Set<string>();
        
        let currentNode = nodesMap.get(hoveredNodeId);
        while (currentNode) {
            path.add(currentNode.id);
            currentNode = currentNode.parentId ? nodesMap.get(currentNode.parentId) : undefined;
        }

        const queue: string[] = [hoveredNodeId];
        const visited = new Set<string>([hoveredNodeId]);
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            path.add(currentId);
            const children = laidOutNodes.filter(n => n.parentId === currentId);
            for (const child of children) {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    queue.push(child.id);
                }
            }
        }
        return path;
    }, [hoveredNodeId, nodesMap, laidOutNodes]);

    const handleNodeHover = (nodeId: string | null, event: React.MouseEvent | null) => {
        setHoveredNodeId(nodeId);

        if (!nodeId || !event) {
            setTooltip(null);
            return;
        }
        
        const node = nodesMap.get(nodeId);
        if (!node) {
            setTooltip(null);
            return;
        }

        let content: React.ReactNode = null;
        switch (node.type) {
            case 'persona':
                const { persona } = node.content as { persona: TargetPersona };
                content = (
                     <div>
                        <strong className="text-brand-text-primary block">{persona.description}</strong>
                        <p className="mt-1"><strong>Usia:</strong> {persona.age} | <strong>Tipe:</strong> {persona.creatorType}</p>
                        <p><strong>Pains:</strong> {persona.painPoints.join(', ')}</p>
                        <p><strong>Outcomes:</strong> {persona.desiredOutcomes.join(', ')}</p>
                    </div>
                );
                break;
            case 'angle':
                content = <strong className="text-brand-text-primary">{node.label}</strong>;
                break;
            case 'trigger':
                const { trigger } = node.content as { trigger: BuyingTriggerObject };
                content = (
                    <div>
                        <strong className="text-brand-text-primary block">🔥 {trigger.name}</strong>
                        <p className="mt-1 border-t border-gray-600 pt-1">{trigger.description}</p>
                        <p className="mt-2 text-xs italic bg-gray-900 p-2 rounded-md"><strong className="text-brand-text-primary/80 not-italic">Contoh:</strong> {trigger.example}</p>
                    </div>
                );
                break;
            case 'creative':
                const { concept } = node.content as { concept: AdConcept };
                 content = (
                    <div>
                        <strong className="text-brand-text-primary block">{concept.headline}</strong>
                        <p className="mt-1">{concept.hook}</p>
                    </div>
                );
                break;
            default:
                 content = <strong className="text-brand-text-primary">{node.label}</strong>;
        }

        if (content) {
            setTooltip({ content, x: event.clientX, y: event.clientY });
        }
    };
    
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('foreignObject')) return;
            isDragging.current = true;
            lastPos.current = { x: e.clientX, y: e.clientY };
            el.style.cursor = 'grabbing';
        };
        const handleMouseUp = () => { isDragging.current = false; el.style.cursor = 'grab'; };
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
            lastPos.current = { x: e.clientX, y: e.clientY };
        };
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const scaleAmount = 1 - e.deltaY * 0.001;
            const rect = el.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            setView(v => {
                const newK = Math.max(0.2, Math.min(2, v.k * scaleAmount));
                const newX = v.x - (mouseX - v.x) * (newK / v.k - 1);
                const newY = v.y - (mouseY - v.y) * (newK / v.k - 1);
                return { x: newX, y: newY, k: newK };
            });
        };
        el.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousemove', handleMouseMove);
        el.addEventListener('wheel', handleWheel);
        el.style.cursor = 'grab';
        return () => {
            el.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousemove', handleMouseMove);
            el.removeEventListener('wheel', handleWheel);
        };
    }, []);

     useEffect(() => {
        // Center view on initial load
        if(containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setView(v => ({...v, x: width / 2 - 400, y: height / 2}));
        }
    }, []);

    const centerView = () => {
       if(containerRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            setView(v => ({...v, x: width / 2 - 400, y: height / 2, k: 0.7}));
        }
    };

    return (
        <div ref={containerRef} className="w-full h-screen relative overflow-hidden bg-brand-background" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #374151 1px, transparent 0)',
            backgroundSize: '25px 25px',
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }

                @keyframes fadeInScaleUp {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .node-container { animation: fadeInScaleUp 0.3s ease-out forwards; }
            `}</style>

            <header className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                <button onClick={props.onReset} className="px-3 py-2 bg-brand-surface rounded-md shadow-lg text-sm font-semibold hover:bg-gray-700">Mulai dari Awal</button>
                <button onClick={props.onGenerateMorePersonas} className="px-3 py-2 bg-purple-600 rounded-md shadow-lg text-sm font-bold text-white hover:bg-purple-500 flex items-center gap-2">
                    <RefreshCwIcon className="w-4 h-4" /> Buat Persona Baru
                </button>
                <button onClick={props.onAddCustomPersona} className="px-3 py-2 bg-brand-surface rounded-md shadow-lg text-sm font-semibold hover:bg-gray-700">+ Tambah Persona Sendiri</button>
            </header>

            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="bg-brand-surface p-1 rounded-md shadow-lg flex flex-col">
                    <button onClick={() => setView(v => ({ ...v, k: Math.min(2, v.k * 1.2) }))} title="Perbesar" className="p-1.5 hover:bg-gray-700 rounded-md"><ZoomInIcon className="w-5 h-5"/></button>
                    <button onClick={() => setView(v => ({ ...v, k: Math.max(0.2, v.k / 1.2) }))} title="Perkecil" className="p-1.5 hover:bg-gray-700 rounded-md"><ZoomOutIcon className="w-5 h-5"/></button>
                    <button onClick={centerView} title="Pusatkan Tampilan" className="p-1.5 hover:bg-gray-700 rounded-md"><LocateIcon className="w-5 h-5"/></button>
                </div>
            </div>
             
             <svg className="w-full h-full">
                <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
                    <g>
                        {visibleNodes.map(node => {
                            if (!node.parentId) return null;
                            const parent = nodesMap.get(node.parentId!);
                            if (!parent || !parent.position || !node.position) return null;
                            
                            const sx = parent.position.x + (parent.width || 0);
                            const sy = parent.position.y + (parent.height || 0) / 2;
                            const ex = node.position.x;
                            const ey = node.position.y + (node.height || 0) / 2;
                            const cx1 = sx + (ex - sx) * 0.5;
                            const cx2 = ex - (ex - sx) * 0.5;
                            const isHighlighted = highlightedPathIds.has(node.id) && highlightedPathIds.has(parent.id);

                            return (
                                <path
                                    key={`${parent.id}-${node.id}`}
                                    d={`M ${sx} ${sy} C ${cx1} ${sy}, ${cx2} ${ey}, ${ex} ${ey}`}
                                    stroke={isHighlighted ? '#4F46E5' : '#4A5568'}
                                    strokeWidth={isHighlighted ? 3 : 2}
                                    fill="none"
                                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                                />
                            );
                        })}
                    </g>
                    {visibleNodes.map(node => (
                        <foreignObject key={node.id} x={node.position.x} y={node.position.y} width={node.width} height={node.height} style={{pointerEvents: "auto"}}>
                            <NodeComponent 
                                {...props} 
                                node={node} 
                                onNodeHover={handleNodeHover}
                            />
                        </foreignObject>
                    ))}
                </g>
             </svg>
             
             {tooltip && <Tooltip content={tooltip.content} x={tooltip.x} y={tooltip.y} />}
        </div>
    );
}