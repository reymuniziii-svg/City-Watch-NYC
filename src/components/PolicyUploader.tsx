import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';

interface PolicyUploaderProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  uploadedFile: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'text/plain'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.txt'];

export default function PolicyUploader({ onUpload, isUploading, uploadedFile }: PolicyUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return 'Only PDF and TXT files are accepted.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File must be under 10MB.';
    }
    return null;
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    await onUpload(file);
  }, [onUpload, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  if (uploadedFile) {
    return (
      <div className="border-editorial bg-white p-6 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-slate-100 shrink-0">
          <FileText className="w-5 h-5 text-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-black truncate">{uploadedFile}</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-black bg-slate-50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-sm font-bold text-black uppercase tracking-widest">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-black">
                Drop your policy platform here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                or click to browse &mdash; PDF or TXT, 10MB max
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-600">
          <X className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
