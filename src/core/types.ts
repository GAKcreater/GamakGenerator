export enum PortType {
  Points = 'POINTS',
  Polygons = 'POLYGONS',
  Objects = 'OBJECTS',
  Mask = 'MASK',
  Scalar = 'SCALAR'
}

export const PortColors: Record<PortType, string> = {
  [PortType.Points]: '#facc15',   // Желтый
  [PortType.Polygons]: '#3b82f6', // Синий
  [PortType.Objects]: '#a855f7',  // Фиолетовый
  [PortType.Mask]: '#10b981',     // Зеленый
  [PortType.Scalar]: '#94a3b8'    // Серый
};

export interface NodeSocket {
  name: string;
  type: PortType;
  description?: string;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: 'Generator' | 'Modifier' | 'Output' | 'Converter';
  description: string;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  params: Record<string, any>;
}
