import { NodeDefinition, PortType } from './types';

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  'POINT_SCATTER': {
    type: 'procNode',
    label: 'POINT SCATTER',
    category: 'Generator',
    description: 'Generates random point cloud using masks',
    inputs: [
      { name: 'masks', type: PortType.Mask, description: 'Binary constraints (Cutoffs)' },
      { name: 'maps', type: PortType.Map, description: 'Probability Maps (0.0 - 1.0)' }
    ],
    outputs: [
      { name: 'points', type: PortType.Points, description: 'Generated point cloud' }
    ],
    params: {
      count: 50,
      radius: 200,
      centerX: 0,
      centerY: 0,
      seed: 42,
      distribution: 'Uniform',
      gravity: 0.0,
      clumping: 0.0,
      edgeReference: 'Circle', // 'Circle' or 'Mask'
      color: '#fbbf24'
    }
  },
  'IMAGE_MASK': {
    type: 'procNode',
    label: 'IMAGE MASK',
    category: 'Maps & Masks',
    description: 'Loads grayscale image as binary mask',
    inputs: [],
    outputs: [
      { name: 'mask', type: PortType.Mask, description: 'Image-based mask' }
    ],
    params: {
      maskPath: null,
      maskScale: 1.0,
      centerX: 0,
      centerY: 0,
      threshold: 0.1
    }
  },
  'IMAGE_MAP': {
    type: 'procNode',
    label: 'IMAGE MAP',
    category: 'Maps & Masks',
    description: 'Loads grayscale image as a probability map',
    inputs: [],
    outputs: [
      { name: 'map', type: PortType.Map, description: 'Probability Map (0.0-1.0)' }
    ],
    params: {
      mapPath: null,
      mapScale: 1.0,
      centerX: 0,
      centerY: 0
    }
  },
  'MAP_TO_MASK': {
    type: 'procNode',
    label: 'MAP TO MASK',
    category: 'Converter',
    description: 'Converts a Probability Map to a Binary Mask',
    inputs: [
      { name: 'in', type: PortType.Map, description: 'Probability Map' }
    ],
    outputs: [
      { name: 'mask', type: PortType.Mask, description: 'Binary Mask' }
    ],
    params: {
      threshold: 0.1
    }
  },
  'SAT_PHYSICS': {
    type: 'procNode',
    label: 'SAT PHYSICS',
    category: 'Modifier',
    description: 'Separates points using SAT',
    inputs: [
      { name: 'in', type: PortType.Points, description: 'Points to separate' }
    ],
    outputs: [
      { name: 'out', type: PortType.Points, description: 'Separated points' }
    ],
    params: {
      iterations: 20
    }
  },
  'POINTS_TO_POLYGON': {
    type: 'procNode',
    label: 'POINTS TO POLYGON',
    category: 'Converter',
    description: 'Creates polygon from points',
    inputs: [
      { name: 'in', type: PortType.Points, description: 'Points to wrap' }
    ],
    outputs: [
      { name: 'out', type: PortType.Polygons, description: 'Generated polygon' }
    ],
    params: {
      algorithm: 'Convex', // "Convex", "Metaballs", "AlphaShape"
      radius: 50.0,
      resolution: 10.0,
      color: '#3b82f6'
    }
  },
  'POLYGON_TO_MASK': {
    type: 'procNode',
    label: 'POLYGON TO MASK',
    category: 'Converter',
    description: 'Converts a polygon into a mask',
    inputs: [
      { name: 'in', type: PortType.Polygons, description: 'Polygon to use as mask' }
    ],
    outputs: [
      { name: 'mask', type: PortType.Mask, description: 'Polygon Mask' }
    ],
    params: {}
  },
  'POLYGON_SUBTRACT': {
    type: 'procNode',
    label: 'POLYGON SUBTRACT',
    category: 'Modifier',
    description: 'Subtracts one polygon from another',
    inputs: [
      { name: 'base', type: PortType.Polygons, description: 'Base polygon (from which to subtract)' },
      { name: 'subtract', type: PortType.Polygons, description: 'Polygon to subtract' }
    ],
    outputs: [
      { name: 'out', type: PortType.Polygons, description: 'Resulting polygon(s)' }
    ],
    params: {
      color: '#ef4444'
    }
  },
  'VIEWPORT': {
    type: 'viewportNode',
    label: 'VIEWPORT',
    category: 'Output',
    description: 'Final render destination',
    inputs: [
      { name: 'in', type: PortType.Points, description: 'Final data to render' }
    ],
    outputs: [],
    params: {}
  }
};
