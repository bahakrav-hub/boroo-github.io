import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  validateFile,
  fileToDataUrl,
  getMediaType,
  saveMedia,
  removeMedia,
  getMediaBySection,
  MediaItem,
} from '../utils/storage';

interface MediaUploadProps {
  section: string;
  type: 'image' | 'video' | 'both';
  label?: string;
}

export function MediaUpload({ section, type, label = 'Загрузить медиа' }: MediaUploadProps) {
  const { isAuthenticated } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>(() => getMediaBySection(section));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshMedia = () => {
    setMedia(getMediaBySection(section));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Ошибка файла');
      return;
    }

    const mediaType = getMediaType(file);
    if (type === 'image' && mediaType !== 'image') {
      setError('Разрешены только изображения');
      return;
    }
    if (type === 'video' && mediaType !== 'video') {
      setError('Разрешены только видео');
      return;
    }

    setIsLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const item: MediaItem = {
        id: `${section}-${Date.now()}`,
        name: file.name,
        type: mediaType,
        dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        section,
      };
      saveMedia(item);
      refreshMedia();
    } catch {
      setError('Ошибка загрузки файла');
    }
    setIsLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    removeMedia(id);
    refreshMedia();
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-4">
        {media.map((item) => (
          <MediaPreview key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const acceptTypes = type === 'image'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : type === 'video'
    ? 'video/mp4,video/webm'
    : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

  return (
    <div className="mt-4 space-y-4">
      <div className="border-2 border-dashed border-gold/30 rounded-lg p-4 text-center hover:border-gold/50 transition-all">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileChange}
          className="hidden"
          id={`upload-${section}`}
        />
        <label
          htmlFor={`upload-${section}`}
          className="cursor-pointer inline-flex flex-col items-center gap-2"
        >
          <span className="text-3xl">📁</span>
          <span className="font-condensed text-gold text-sm uppercase tracking-wider">
            {label}
          </span>
          <span className="text-paper/40 text-xs">
            JPG, PNG, WebP, GIF, MP4, WebM (макс. 5 МБ)
          </span>
        </label>
        {isLoading && (
          <div className="mt-2 text-gold text-sm">Загрузка...</div>
        )}
        {error && (
          <div className="mt-2 text-army-red text-sm">⚠️ {error}</div>
        )}
      </div>

      {media.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-condensed text-gold text-sm uppercase tracking-wider">
            Загруженные файлы:
          </h4>
          {media.map((item) => (
            <div key={item.id} className="relative group">
              <MediaPreview item={item} />
              <button
                onClick={() => handleRemove(item.id)}
                className="absolute top-2 right-2 w-7 h-7 bg-army-red text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                title="Удалить"
              >
                ×
              </button>
              <div className="text-paper/30 text-xs mt-1">
                {item.name} • {(item.size / 1024).toFixed(1)} КБ
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaPreview({ item }: { item: MediaItem }) {
  if (item.type === 'image') {
    return (
      <img
        src={item.dataUrl}
        alt={item.name}
        className="w-full max-h-64 object-contain rounded border border-gold/20 bg-dark-green/50"
        loading="lazy"
      />
    );
  }
  return (
    <video
      src={item.dataUrl}
      controls
      className="w-full max-h-80 rounded border border-gold/20 bg-dark-green/50"
    >
      Ваш браузер не поддерживает видео.
    </video>
  );
}
