import { useEffect, useCallback } from 'react';

/**
 * Hook for handling keyboard shortcuts
 * @param keys Array of key strings for the shortcut (e.g. ['Meta', 's'] for Cmd+S or Ctrl+S)
 * @param callback Function to execute when shortcut is pressed
 * @param node DOM node to attach listener to (defaults to document)
 */
function useKeyboardShortcut(
  keys: string[],
  callback: (e: KeyboardEvent) => void,
  node: HTMLElement | Document = document
) {
  // Convert keys array to a set for O(1) lookups
  const keySet = new Set(keys.map(k => k.toLowerCase()));

  // Keydown event handler that checks for the shortcut
  const keydownHandler = useCallback(
    (event: KeyboardEvent) => {
      // Collect all modifiers and key for comparison
      const pressedKeys = new Set<string>();
      
      // Add pressed modifiers
      if (event.metaKey) pressedKeys.add('meta');
      if (event.ctrlKey) pressedKeys.add('control');
      if (event.altKey) pressedKeys.add('alt');
      if (event.shiftKey) pressedKeys.add('shift');
      
      // Add the main key (non-modifier)
      pressedKeys.add(event.key.toLowerCase());
      
      // Check if all required keys are pressed (and no extra keys)
      const allRequiredKeysPressed = Array.from(keySet).every(k => 
        pressedKeys.has(k.toLowerCase())
      );
      
      const noExtraModifiersPressed = 
        (!event.metaKey || keySet.has('meta')) &&
        (!event.ctrlKey || keySet.has('control')) &&
        (!event.altKey || keySet.has('alt')) && 
        (!event.shiftKey || keySet.has('shift'));
      
      // If the shortcut keys are pressed, execute the callback
      if (allRequiredKeysPressed && noExtraModifiersPressed) {
        callback(event);
      }
    },
    [keySet, callback]
  );

  // Add and remove the event listener
  useEffect(() => {
    node.addEventListener('keydown', keydownHandler as EventListener);
    
    return () => {
      node.removeEventListener('keydown', keydownHandler as EventListener);
    };
  }, [node, keydownHandler]);
}

export default useKeyboardShortcut; 