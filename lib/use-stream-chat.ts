"use client";

import { useReducer, useRef, FormEvent, ChangeEvent } from "react";
import { flushSync } from "react-dom";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: any[];
};

type ChatState = {
  messages: Message[];
  input: string;
  status: "ready" | "streaming" | "error";
};

type ChatAction = 
  | { type: "SET_INPUT"; payload: string }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: { id: string; updates: Partial<Message> } }
  | { type: "SET_STATUS"; payload: ChatState["status"] }
  | { type: "RESET_INPUT" };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.payload };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "RESET_INPUT":
      return { ...state, input: "" };
    default:
      return state;
  }
}

type UseStreamChatOptions = {
  api: string;
  body?: Record<string, any>;
  onError?: (error: Error) => void;
};

export function useStreamChat(options: UseStreamChatOptions) {
  const { api, body, onError } = options;
  
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    input: "",
    status: "ready",
  });

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = state.messages;

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: "SET_INPUT", payload: e.target.value });
  };

  const append = async ({ role, content }: { role: "user" | "assistant"; content: string }) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
    };

    flushSync(() => {
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });
      dispatch({ type: "SET_STATUS", payload: "streaming" });
    });

    try {
      abortControllerRef.current = new AbortController();
      const timestamp = Date.now();
      
      const response = await fetch(`${api}?_=${timestamp}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store",
          "Pragma": "no-cache",
        },
        body: JSON.stringify({
          messages: [...messagesRef.current, userMessage],
          timestamp,
          ...body,
        }),
        signal: abortControllerRef.current.signal,
        cache: "no-store",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentMsgId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // JSON Lines: każda linia to kompletny JSON
            const data = JSON.parse(line);
            
            if (data.type === "text-delta") {
              if (!currentMsgId) {
                currentMsgId = `stream-${Date.now()}-${Math.random()}`;
                flushSync(() => {
                  dispatch({ 
                    type: "ADD_MESSAGE", 
                    payload: { id: currentMsgId!, role: "assistant", content: data.delta }
                  });
                });
              } else {
                flushSync(() => {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: currentMsgId!,
                      updates: { content: (messagesRef.current.find(m => m.id === currentMsgId)?.content || "") + data.delta }
                    }
                  });
                });
              }
            } else if (data.type === "tool-call-start") {
              currentMsgId = null;
              const toolMsgId = `tool-${data.toolCallId}-${Date.now()}`;
              flushSync(() => {
                dispatch({
                  type: "ADD_MESSAGE",
                  payload: {
                    id: toolMsgId,
                    role: "assistant",
                    content: "",
                    parts: [{
                      type: "tool-invocation",
                      toolInvocation: {
                        toolCallId: data.toolCallId,
                        toolName: "",
                        args: {},
                        state: "streaming",
                      },
                    }],
                  },
                });
              });
            } else if (data.type === "tool-name-delta") {
              const toolMsg = messagesRef.current.find(m => m.id.includes(data.toolCallId));
              if (toolMsg && toolMsg.parts && toolMsg.parts[0]) {
                flushSync(() => {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: toolMsg.id,
                      updates: {
                        parts: [{
                          ...toolMsg.parts![0],
                          toolInvocation: {
                            ...toolMsg.parts![0].toolInvocation,
                            toolName: data.toolName,
                          },
                        }],
                      },
                    },
                  });
                });
              }
            } else if (data.type === "tool-input-available") {
              const toolMsg = messagesRef.current.find(m => m.id.includes(data.toolCallId));
              if (toolMsg && toolMsg.parts && toolMsg.parts[0]) {
                flushSync(() => {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: toolMsg.id,
                      updates: {
                        parts: [{
                          ...toolMsg.parts![0],
                          toolInvocation: {
                            ...toolMsg.parts![0].toolInvocation,
                            args: data.input,
                            state: "call",
                          },
                        }],
                      },
                    },
                  });
                });
              }
            } else if (data.type === "tool-output-available") {
              const toolMsg = messagesRef.current.find(m => m.id.includes(data.toolCallId));
              if (toolMsg && toolMsg.parts && toolMsg.parts[0]) {
                flushSync(() => {
                  dispatch({
                    type: "UPDATE_MESSAGE",
                    payload: {
                      id: toolMsg.id,
                      updates: {
                        parts: [{
                          ...toolMsg.parts![0],
                          toolInvocation: {
                            ...toolMsg.parts![0].toolInvocation,
                            state: "result",
                            result: data.output,
                          },
                        }],
                      },
                    },
                  });
                });
              }
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }

      flushSync(() => {
        dispatch({ type: "SET_STATUS", payload: "ready" });
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        dispatch({ type: "SET_STATUS", payload: "ready" });
        return;
      }
      
      dispatch({ type: "SET_STATUS", payload: "error" });
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!state.input.trim() || state.status === "streaming") return;

    const userInput = state.input;
    dispatch({ type: "RESET_INPUT" });
    await append({ role: "user", content: userInput });
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: "SET_STATUS", payload: "ready" });
  };

  return {
    messages: state.messages,
    input: state.input,
    handleInputChange,
    handleSubmit,
    status: state.status,
    stop,
    append,
    setMessages: (messages: Message[]) => {
      messages.forEach(msg => dispatch({ type: "ADD_MESSAGE", payload: msg }));
    },
  };
}
