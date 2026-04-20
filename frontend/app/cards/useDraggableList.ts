import { useRef, useState } from "react";

export function useDraggableList<T>(
  items: T[],
  setItems: (items: T[]) => void,
  onOrderChange?: (newItems: T[]) => void,
) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(index: number) {
    dragItem.current = index;
    setIsDragging(true);
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (
      dragItem.current !== null &&
      dragOverItem.current !== null &&
      dragItem.current !== dragOverItem.current
    ) {
      const updated = [...items];
      const [removed] = updated.splice(dragItem.current, 1);
      updated.splice(dragOverItem.current, 0, removed);
      // Update the order property for immediate UI update
      const updatedWithOrder = updated.map((item, idx) => ({
        ...item,
        order: idx + 1,
      }));
      setItems(updatedWithOrder);
      if (onOrderChange) onOrderChange(updatedWithOrder);
    }
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(false);
  }

  return {
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    isDragging,
  };
}
