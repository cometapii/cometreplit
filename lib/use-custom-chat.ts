"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { flushSync } from "react-dom";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: any[];
};

type UseChatOptions = {
  api: string;
  id?: string;
  body?: Record<string, any>;
  maxSteps?: number;
  onError?: (error: Error) => void;
};

type ChatStatus = "ready" | "streaming" | "error";

export function useCustomChat(options: UseChatOptions) {
  const { api, body, onError } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const append = async ({ role, content }: { role: "user" | "assistant"; content: string }) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role,
      content,
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      messagesRef.current = updated;
      return updated;
    });
    setStatus("streaming");

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
          ...body,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let currentTextMessageId: string | null = null;
      let buffer = "";

      // Real-time streaming without buffering - process immediately as data arrives
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk immediately - no buffering
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process all complete lines immediately
        const lines = buffer.split('\n');
        // Keep incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // JSON Lines: każda linia to kompletny JSON
            const data = JSON.parse(line);
            
            // Process event immediately - NO BATCHING
            if (data.type === "text-delta") {
              if (!currentTextMessageId) {
                // Nowa wiadomość tekstowa
                const newTextMessage: Message = {
                  id: `text-${Date.now()}-${Math.random()}`,
                  role: "assistant",
                  content: data.delta,
                };
                currentTextMessageId = newTextMessage.id;
                
                // flushSync - WYMUSZA synchroniczne renderowanie BEZ batchingu
                flushSync(() => {
                  setMessages((prev) => {
                    const updated = [...prev, newTextMessage];
                    messagesRef.current = updated;
                    return updated;
                  });
                });
              } else {
                // flushSync - NATYCHMIASTOWA aktualizacja BEZ opóźnień
                flushSync(() => {
                  setMessages((prev) => {
                    const updated = prev.map((msg) =>
                      msg.id === currentTextMessageId
                        ? { ...msg, content: msg.content + data.delta }
                        : msg
                    );
                    messagesRef.current = updated;
                    return updated;
                  });
                });
              }
            } else if (data.type === "tool-call-start") {
              currentTextMessageId = null;
              
              const toolMessage: Message = {
                id: `tool-${data.toolCallId}`,
                role: "assistant",
                content: "",
                parts: [
                  {
                    type: "tool-invocation",
                    toolInvocation: {
                      toolCallId: data.toolCallId,
                      toolName: "",
                      args: {},
                      argsText: "",
                      state: "streaming",
                    },
                  },
                ],
              };
              setMessages((prev) => {
                const updated = [...prev, toolMessage];
                messagesRef.current = updated;
                return updated;
              });
            } else if (data.type === "tool-name-delta") {
              setMessages((prev) => {
                const updated = prev.map((msg) => {
                  if (msg.id === `tool-${data.toolCallId}` && msg.parts?.[0]?.type === "tool-invocation") {
                    return {
                      ...msg,
                      parts: [
                        {
                          ...msg.parts[0],
                          toolInvocation: {
                            ...msg.parts[0].toolInvocation,
                            toolName: data.toolName,
                          },
                        },
                      ],
                    };
                  }
                  return msg;
                });
                messagesRef.current = updated;
                return updated;
              });
            } else if (data.type === "tool-argument-delta") {
              setMessages((prev) => {
                const updated = prev.map((msg) => {
                  if (msg.id === `tool-${data.toolCallId}` && msg.parts?.[0]?.type === "tool-invocation") {
                    const currentArgsText = msg.parts[0].toolInvocation.argsText || "";
                    const newArgsText = currentArgsText + data.delta;
                    let parsedArgs = msg.parts[0].toolInvocation.args;
                    try {
                      parsedArgs = JSON.parse(newArgsText);
                    } catch (e) {
                      // Keep old args until complete JSON
                    }
                    return {
                      ...msg,
                      parts: [
                        {
                          ...msg.parts[0],
                          toolInvocation: {
                            ...msg.parts[0].toolInvocation,
                            argsText: newArgsText,
                            args: parsedArgs,
                          },
                        },
                      ],
                    };
                  }
                  return msg;
                });
                messagesRef.current = updated;
                return updated;
              });
            } else if (data.type === "tool-input-available") {
              setMessages((prev) => {
                const updated = prev.map((msg) => {
                  if (msg.id === `tool-${data.toolCallId}` && msg.parts?.[0]?.type === "tool-invocation") {
                    return {
                      ...msg,
                      parts: [
                        {
                          ...msg.parts[0],
                          toolInvocation: {
                            ...msg.parts[0].toolInvocation,
                            args: data.input,
                            state: "call",
                          },
                        },
                      ],
                    };
                  }
                  return msg;
                });
                messagesRef.current = updated;
                return updated;
              });
            } else if (data.type === "tool-output-available") {
              setMessages((prev) => {
                const updated = prev.map((msg) => {
                  if (msg.id === `tool-${data.toolCallId}` && msg.parts?.[0]?.type === "tool-invocation") {
                    return {
                      ...msg,
                      parts: [
                        {
                          ...msg.parts[0],
                          toolInvocation: {
                            ...msg.parts[0].toolInvocation,
                            state: "result",
                            result: data.output,
                          },
                        },
                      ],
                    };
                  }
                  return msg;
                });
                messagesRef.current = updated;
                return updated;
              });
            } else if (data.type === "screenshot-update") {
              // Screenshot update handled elsewhere
            } else if (data.type === "error") {
              throw new Error(data.errorText);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
              // Incomplete JSON, will be completed in next chunk
              continue;
            }
            throw e;
          }
        }
      }

      setStatus("ready");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setStatus("ready");
        return;
      }
      
      setStatus("error");
      if (onError && error instanceof Error) {
        onError(error);
      }
      console.error("Chat error:", error);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;

    const userInput = input;
    setInput("");
    await append({ role: "user", content: userInput });
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    append,
    setMessages,
  };
}
