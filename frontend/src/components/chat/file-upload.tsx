"use client";

import React, { useRef, useState } from "react";
import { Paperclip, X, File, Image as ImageIcon, Loader2 } from "lucide-react";

export interface AttachedFile {
  id: string;
  file: File;
  previewUrl?: string;
  isUploading: boolean;
  error?: string;
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ onFilesSelected, disabled }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={disabled}
      />
      <button
        className="inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-50"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        type="button"
        title="Attach file"
      >
        <Paperclip className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </>
  );
}

export function FileAttachmentList({
  files,
  onRemove,
}: {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pt-2 pb-1">
      {files.map((file) => {
        const isImage = file.file.type.startsWith("image/");
        
        return (
          <div
            key={file.id}
            className="relative flex items-center gap-2 bg-muted/50 border border-border/50 rounded-md p-2 pr-8 max-w-[200px] group"
          >
            {isImage ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            
            <div className="flex-1 truncate text-xs font-medium">
              {file.file.name}
            </div>

            {file.isUploading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}

            <button
              onClick={() => onRemove(file.id)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
