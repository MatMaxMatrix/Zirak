import * as monaco from 'monaco-editor';

/**
 * Interface for an opened file in the editor
 */
export interface OpenedFile {
  path: string;
  content: string;
  hasUnsavedChanges: boolean;
  viewState?: monaco.editor.ICodeEditorViewState;
}

/**
 * Interface for editor tab model data
 */
export interface TabModelData {
  model: monaco.editor.ITextModel | null;
  viewState: monaco.editor.ICodeEditorViewState | null;
  scroll: { scrollTop: number; scrollLeft: number } | null;
}

/**
 * Interface for editor configuration
 */
export interface EditorConfig {
  theme?: string;
  fontSize?: number;
  tabSize?: number;
  lineNumbers?: 'on' | 'off' | 'relative';
  wordWrap?: 'on' | 'off';
  minimap?: boolean;
} 