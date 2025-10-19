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

export function useCustomChatV2(options: UseChatOptions) {
  const { api, body, onError } = options;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const append = async ({ role, content }: { role: "user" | "assistant"; content: string }) => {
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      role,
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus("streaming");

    try {
      abortControllerRef.current = new AbortController();

      // Dodaj timestamp aby uniknąć cache
      const timestamp = Date.now();
      const randomId = Math.random().toString(36);
      
      const response = await fetch(`${api}?_t=${timestamp}&_id=${randomId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          timestamp: timestamp,
          requestId: randomId,
          ...body,
        }),
        signal: abortControllerRef.current.signal,
        cache: "no-store",
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            
            // Przetwarzaj event natychmiast BEZ batching
            if (data.type === "text-delta") {
              const messageId = `text-${data.timestamp || Date.now()}-${Math.random()}`;
              
              if (!currentTextMessageId) {
                currentTextMessageId = messageId;
                const newTextMessage: Message = {
                  id: messageId,
                  role: "assistant",
                  content: data.delta,
                };
                flushSync(() => {
                  setMessages((prev) => [...prev, newTextMessage]);
                });
              } else {
                flushSync(() => {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === currentTextMessageId
                        ? { ...msg, content: msg.content + data.delta }
                        : msg
                    )
                  );
                });
              }
            } else if (data.type === "tool-call-start") {
              currentTextMessageId = null;
              
              const toolMessage: Message = {
                id: `tool-${data.toolCallId}-${Date.now()}`,
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
              flushSync(() => {
                setMessages((prev) => [...prev, toolMessage]);
              });
            } else if (data.type === "tool-name-delta") {
              flushSync(() => {
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id.includes(data.toolCallId) && msg.parts?.[0]?.type === "tool-invocation") {
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
                  })
                );
              });
            } else if (data.type === "tool-argument-delta") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id.includes(data.toolCallId) && msg.parts?.[0]?.type === "tool-invocation") {
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
                })
              );
            } else if (data.type === "tool-input-available") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id.includes(data.toolCallId) && msg.parts?.[0]?.type === "tool-invocation") {
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
                })
              );
            } else if (data.type === "tool-output-available") {
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id.includes(data.toolCallId) && msg.parts?.[0]?.type === "tool-invocation") {
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
                })
              );
            } else if (data.type === "error") {
              throw new Error(data.errorText);
            }
          } catch (e) {
            if (e instanceof SyntaxError) {
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
