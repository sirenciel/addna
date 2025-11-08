import React, { useMemo } from 'react';
import { MindMapNode } from '../types';

interface FilterControlsProps {
  nodes: MindMapNode[];
  onFilterChange: (filters: { angle: string }) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({ nodes, onFilterChange }) => {
    
    const angleNodes = useMemo(() => {
        return nodes.filter(node => node.type === 'angle');
    }, [nodes]);

    const handleAngleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ angle: event.target.value });
    };

    return (
        <div className="px-4 md:px-0">
            <div className="flex items-center gap-4">
                <label htmlFor="angleFilter" className="text-sm font-medium text-brand-text-secondary">
                    Filter by Angle:
                </label>
                <select 
                    id="angleFilter"
                    onChange={handleAngleChange}
                    className="bg-gray-900 border border-gray-700 rounded-md py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                    <option value="all">All Angles</option>
                    {angleNodes.map(angle => (
                        <option key={angle.id} value={angle.id}>
                            {angle.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};