"use client";

import { useEffect, useRef } from "react";
import { PreviewMessage, type Message } from "./message";

type RealtimeMessageProps = {
  message: Message;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  isLoading: boolean;
};

export function RealtimeMessage(props: RealtimeMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    // Zwiększ licznik przy każdej aktualizacji
    renderCountRef.current++;
    
    // Wymuś natychmiastowe wyświetlenie przez zmianę GPU layer
    if (containerRef.current) {
      const timestamp = Date.now();
      containerRef.current.style.setProperty('--update-time', String(timestamp));
      
      // Force repaint
      void containerRef.current.offsetHeight;
    }
  }, [props.message, props.status]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        willChange: 'transform',
        transform: 'translateZ(0)',
        contain: 'layout'
      }}
      data-render-count={renderCountRef.current}
    >
      <PreviewMessage {...props} />
    </div>
  );
}
