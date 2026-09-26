import { AnimatePresence, motion } from 'framer-motion';
import { Camera, ImageUp, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { ContactAvatar } from '@/components/common/bits';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '../api';
import { useUploadAvatar } from '../queries';

function validate(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'Use a PNG, JPG, WebP or GIF image.';
  if (file.size > AVATAR_MAX_BYTES) return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 2 MB.`;
  return null;
}

/** Large avatar with click-or-drop upload, local preview, validation and confirm. */
export function AvatarUploader({ name, src }: { name: string; src: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadAvatar();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const problem = validate(f);
    setError(problem);
    setFile(problem ? null : f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files[0]);
  };

  const cancel = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = () => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () => {
        toast.success('Profile photo updated');
        cancel();
      },
      onError: (err) => {
        const message = getErrorMessage(err, 'Upload failed');
        setError(message);
        toast.error('Could not upload photo', { description: message });
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="relative"
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Change profile photo"
          aria-describedby="avatar-help"
          className={cn(
            'group relative block rounded-full outline-none ring-4 ring-card transition-shadow duration-panel focus-visible:ring-ring',
            dragging && 'ring-primary/60',
          )}
        >
          {preview ? (
            <img src={preview} alt="" className="size-24 rounded-full object-cover sm:size-28" />
          ) : (
            <ContactAvatar name={name} src={src} size="lg" className="size-24 text-3xl sm:size-28" />
          )}
          <span
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 text-[11px] font-medium text-white opacity-0 transition-opacity duration-micro group-hover:opacity-100 group-focus-visible:opacity-100',
              (dragging || upload.isPending) && 'opacity-100',
            )}
            aria-hidden
          >
            {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : dragging ? <ImageUp className="size-5" /> : <Camera className="size-5" />}
            {upload.isPending ? 'Uploading' : dragging ? 'Drop it' : 'Change'}
          </span>
        </button>
        <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-brand-gradient text-white shadow-lift" aria-hidden>
          <Camera className="size-3.5" />
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        {file ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="flex items-center gap-2">
            <Button size="sm" variant="gradient" onClick={save} loading={upload.isPending}>
              Save photo
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={upload.isPending}>
              Cancel
            </Button>
          </motion.div>
        ) : (
          <motion.p key="help" id="avatar-help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-caption text-muted-foreground sm:text-left">
            Click or drop an image · PNG, JPG, WebP or GIF · up to 2 MB
          </motion.p>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="max-w-[16rem] text-center text-caption font-medium text-destructive sm:text-left">
          {error}
        </p>
      )}
    </div>
  );
}
