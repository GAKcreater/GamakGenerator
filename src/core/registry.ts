import { NodeDefinition, PortType } from './types';

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  'POINT_SCATTER': {
    type: 'procNode',
    label: 'POINT SCATTER',
    category: 'Generator',
    description: 'Generates random point cloud using masks',
    inputs: [
      { name: 'masks', type: PortType.Mask, description: 'One or more mask constraints' }
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
      color: '#fbbf24'
    }
  },
  'IMAGE_MASK': {
    type: 'procNode',
    label: 'IMAGE MASK',
    category: 'Masks',
    description: 'Loads grayscale image as mask',
    inputs: [],
    outputs: [
      { name: 'mask', type: PortType.Mask, description: 'Image-based mask' }
    ],
    params: {
      maskPath: null,
      maskScale: 1.0,
      centerX: 0,
      centerY: 0
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
  'CONVEX_HULL': {
    type: 'procNode',
    label: 'CONVEX HULL',
    category: 'Converter',
    description: 'Creates polygon from points',
    inputs: [
      { name: 'in', type: PortType.Points, description: 'Points to wrap' }
    ],
    outputs: [
      { name: 'out', type: PortType.Polygons, description: 'Generated hull' }
    ],
    params: {
      color: '#3b82f6'
    }
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
