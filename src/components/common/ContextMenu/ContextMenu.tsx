import { useEffect, useRef } from "react";
import "./ContextMenu.css";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu = ({ visible, position, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible || !ref.current) return;
    const menu = ref.current;
    const rect = menu.getBoundingClientRect();
    const x = position.x + rect.width > window.innerWidth ? position.x - rect.width : position.x;
    const y = position.y + rect.height > window.innerHeight ? position.y - rect.height : position.y;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [visible, position]);

  if (!visible) return null;

  return (
    <div ref={ref} className="context-menu">
      {items.map((item, i) => (
        <button
          key={i}
          className={`context-menu__item ${item.disabled ? "context-menu__item--disabled" : ""}`}
          onClick={() => !item.disabled && (item.onClick(), onClose())}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
