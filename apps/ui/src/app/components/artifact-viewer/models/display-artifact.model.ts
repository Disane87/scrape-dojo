export type DisplayType =
  | 'auto'
  | 'json'
  | 'table'
  | 'text'
  | 'file'
  | 'image'
  | 'link'
  | 'card';

export interface DisplayArtifact {
  type: DisplayType;
  title?: string;
  description?: string;
  data: any;
  template?: string; // Handlebars template for 'card' type
  renderedItems?: string[]; // Per-item rendered HTML (for array data with template)
  flush?: boolean; // Compact list-style rendering for cards
  metadata?: {
    itemCount?: number;
    dataType?: string;
    timestamp?: number;
  };
}

export interface ArtifactComponentData {
  artifact: DisplayArtifact;
}
