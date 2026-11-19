import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';

interface EditableTextProps {
  path: string;
  value: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote';
  multiline?: boolean;
}

export function EditableText({
  path,
  value,
  className = '',
  as: Tag = 'span',
  multiline = false,
}: EditableTextProps) {
  const { isAuthenticated } = useAuth();
  const { isEditing, updateContent } = useContent();
  const [editValue, setEditValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  if (!isAuthenticated || !isEditing) {
    return <Tag className={className}>{value}</Tag>;
  }

  const handleSave = () => {
    updateContent(path, editValue);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value);
      setIsFocused(false);
    }
  };

  if (isFocused) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`${className} bg-khaki/30 border border-gold/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-gold/30 resize-none min-h-[80px]`}
          rows={4}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`${className} bg-khaki/30 border border-gold/50 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-gold/30`}
      />
    );
  }

  return (
    <Tag
      className={`${className} cursor-pointer hover:bg-gold/10 hover:ring-1 hover:ring-gold/30 rounded px-1 py-0.5 transition-all relative group`}
      onClick={() => setIsFocused(true)}
      title="Нажмите для редактирования"
    >
      {value}
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-dark-green text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        ✎
      </span>
    </Tag>
  );
}
