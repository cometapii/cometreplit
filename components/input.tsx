"use client";

import * as React from "react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isInitializing: boolean;
  isLoading: boolean;
  status: string;
  stop: () => void;
}

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const Input = ({
  input,
  handleInputChange,
  isInitializing,
  isLoading,
  status,
  stop,
}: InputProps) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  React.useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  };

  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasValue = input.trim().length > 0 || imagePreview;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasValue && !isInitializing && status !== "streaming" && status !== "submitted") {
        const form = e.currentTarget.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <div className="flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {imagePreview && (
        <div className="relative mb-1 w-fit rounded-[1rem] px-1 pt-1">
          <img
            src={imagePreview}
            alt="Image preview"
            className="h-14 w-14 rounded-[1rem] object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/50 dark:bg-[#303030] text-black dark:text-white hover:bg-accent dark:hover:bg-[#515151]"
            aria-label="Remove image"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Message..."
        disabled={isLoading || isInitializing}
        className="w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12"
      />

      <div className="mt-0.5 p-1 pt-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlusClick}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent dark:hover:bg-[#515151] transition-colors"
          >
            <PlusIcon className="h-6 w-6" />
            <span className="sr-only">Attach image</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {status === "streaming" || status === "submitted" ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 transition-colors"
              >
                <div className="h-3 w-3 bg-white dark:bg-black rounded"></div>
                <span className="sr-only">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!hasValue || isInitializing}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SendIcon className="h-5 w-5" />
                <span className="sr-only">Send message</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
