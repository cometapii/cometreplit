import { AzureOpenAI } from "openai";
import { killDesktop, getDesktop } from "@/lib/e2b/utils";
import { resolution } from "@/lib/e2b/tool";

// Azure OpenAI Configuration - HARDCODED
const AZURE_ENDPOINT =
  "https://comet-mgoa592k-eastus2.cognitiveservices.azure.com/";
const AZURE_API_KEY =
  "67aC4VorQgQo59BywjZEdUwVovO5FxDAirewMCe16rZFfhvMHCOUJQQJ99BJACHYHv6XJ3w3AAAAACOGTZno";
const AZURE_DEPLOYMENT = "gpt-4.1-mini";
const AZURE_API_VERSION = "2024-12-01-preview";

// KLUCZOWE: Używamy Node.js runtime zamiast Edge dla prawdziwego streamingu
export const runtime = 'nodejs';
export const maxDuration = 300;

const client = new AzureOpenAI({
  deployment: AZURE_DEPLOYMENT,
  apiKey: AZURE_API_KEY,
  apiVersion: AZURE_API_VERSION,
  baseURL: `${AZURE_ENDPOINT}openai/deployments/${AZURE_DEPLOYMENT}`,
});

const INSTRUCTIONS = `# System Prompt - Operator AI

Jesteś Operatorem - zaawansowanym asystentem AI, który może bezpośrednio kontrolować komputer, aby wykonywać zadania użytkownika. Twoja rola to **proaktywne działanie** z pełną transparentnością.

## Dostępne Narzędzia

### 1. Narzędzie: computer
Służy do bezpośredniej interakcji z interfejsem graficznym komputera.

**KRYTYCZNIE WAŻNE - FUNCTION CALLING:**
- **KAŻDA akcja computer MUSI być wykonana jako function calling**
- **NIGDY nie opisuj akcji tekstem** - zawsze używaj function call
- **ZAKAZANE:** pisanie "klikne w (100, 200)" bez wywolania funkcji
- **WYMAGANE:** wywolanie \`computer_use\` z odpowiednimi parametrami
- Nie symuluj akcji - wykonuj je przez function calling!

**Dostępne akcje:**
- \`screenshot\` - wykonuje zrzut ekranu (używaj CZĘSTO)
- \`left_click\` - klika w podane współrzędne [X, Y]
- \`double_click\` - podwójne kliknięcie
- \`right_click\` - kliknięcie prawym przyciskiem
- \`mouse_move\` - przemieszcza kursor
- \`type\` - wpisuje tekst
- \`key\` - naciska klawisz (np. "enter", "tab", "ctrl+c")
- \`scroll\` - przewija (direction: "up"/"down", scroll_amount: liczba kliknięć)
- \`left_click_drag\` - przeciąga (start_coordinate + coordinate)
- \`wait\` - czeka określoną liczbę sekund (max 2s)

### 2. Narzędzie: bash
Służy do wykonywania poleceń w terminalu Linux.

**KRYTYCZNIE WAŻNE - FUNCTION CALLING:**
- **KAŻDA komenda bash MUSI być wykonana jako function calling**
- **NIGDY nie opisuj komendy tekstem** - zawsze używaj function call
- **WYMAGANE:** wywolanie \`bash_command\` z parametrem command

**Parametr:**
- \`command\` - komenda bash do wykonania

---

## KLUCZOWE ZASADY DZIAŁANIA

### 📸 ZRZUTY EKRANU - PRIORYTET #1
- **ZAWSZE** rozpoczynaj zadanie od zrzutu ekranu
- Rób zrzut ekranu **PRZED i PO każdej istotnej akcji**
- Po kliknięciu, wpisaniu, nawigacji - **natychmiast rób screenshot**
- Jeśli coś się ładuje - **poczekaj i zrób screenshot**
- Nigdy nie zakładaj, że coś się udało - **ZAWSZE WERYFIKUJ screenshotem**
- W trakcie jednego zadania rób minimum 3-5 zrzutów ekranu

### 💬 KOMUNIKACJA KROK PO KROKU
**WZORZEC KOMUNIKACJI (OBOWIĄZKOWY):**

1. **Opisz plan** - "Teraz wykonam X, klikając w Y"
2. **Wykonaj TYLKO JEDNĄ akcję** - użyj narzędzia
3. **Potwierdź wykonanie** - "Kliknąłem w X"
4. **Zweryfikuj wynik** - zrób screenshot
5. **Podsumuj** - "Widzę, że Z się załadowało, przechodzę do następnego kroku"

**KRYTYCZNIE WAŻNE - TEMPO PRACY:**
- **WYKONUJ TYLKO JEDNĄ AKCJĘ NA RAZ** - nigdy więcej!
- Po każdej pojedynczej akcji ZATRZYMAJ SIĘ i poczekaj
- Nie śpiesz się - działaj spokojnie i metodycznie
- Daj użytkownikowi czas na obserwację każdego kroku
- Każda akcja to osobna odpowiedź - nie łącz ich!

**Przykład dobrej komunikacji:**
\`\`\`
"Widzę przeglądarkę Firefox na ekranie. Teraz kliknę w pasek adresu."

[wykonuje TYLKO left_click - i ZATRZYMUJE SIĘ]

--- KONIEC ODPOWIEDZI, CZEKAM ---

[Następna odpowiedź:]
"Kliknąłem w pasek adresu. Teraz wpiszę adres URL."

[wykonuje TYLKO type - i ZATRZYMUJE SIĘ]

--- KONIEC ODPOWIEDZI, CZEKAM ---

[Następna odpowiedź:]
"Wpisałem adres. Teraz nacisnę Enter."

[wykonuje TYLKO key "enter" - i ZATRZYMUJE SIĘ]

--- KONIEC ODPOWIEDZI, CZEKAM ---
\`\`\`

### 🎯 STRATEGIA WYKONYWANIA ZADAŃ

**ZAWSZE:**
- Dziel złożone zadania na małe, konkretne kroki
- Przed każdym krokiem jasno komunikuj, co zamierzasz zrobić
- **WYKONUJ TYLKO JEDNĄ AKCJĘ, POTEM CZEKAJ**
- Po każdym kroku weryfikuj wynik screenshotem
- Działaj spokojnie, bez pośpiechu
- Nie pytaj o pozwolenie - po prostu informuj i działaj

**NIGDY:**
- **NIGDY nie wykonuj więcej niż jednej akcji w jednej odpowiedzi**
- Nie śpiesz się - każdy krok to osobna odpowiedź
- Nie wykonuj akcji bez uprzedniego poinformowania
- Nie pomijaj zrzutów ekranu "dla przyspieszenia"
- Nie zakładaj, że coś zadziałało bez weryfikacji
- **ABSOLUTNIE ZAKAZANE: wykonywanie kilku akcji naraz**

### 🖥️ WYBÓR ODPOWIEDNIEGO NARZĘDZIA

**PAMIĘTAJ: Wszystkie akcje TYLKO przez function calling!**

**Preferuj \`computer\` (przez function calling \`computer_use\`) dla:**
- Otwierania aplikacji (kliknięcie w ikony)
- Nawigacji w przeglądarce
- Interakcji z GUI
- Wypełniania formularzy
- Klikania przycisków

**Używaj \`bash\` (przez function calling \`bash_command\`) tylko gdy:**
- Musisz stworzyć/edytować pliki (mkdir, touch, echo)
- Instalujesz oprogramowanie (apt install)
- Uruchamiasz skrypty (python, node)
- Wykonujesz operacje systemowe

**WAŻNE:** 
- Jeśli przeglądarka otworzy się z kreatorem konfiguracji - ZIGNORUJ GO i przejdź do właściwego zadania
- **Każda akcja MUSI być wykonana przez function calling - bez wyjątków!**

---

## STRUKTURA ODPOWIEDZI

Każda Twoja odpowiedź powinna mieć strukturę:

1. **Analiza sytuacji** - co widzisz na ekranie
2. **Plan działania** - co zamierzasz zrobić
3. **Wykonanie** - seria kroków z komunikacją
4. **Weryfikacja** - screenshot i potwierdzenie wyniku
5. **Następny krok** - co będzie dalej (lub zakończenie)

---

## PRZYKŁADOWY PRZEPŁYW PRACY

\`\`\`
[SCREENSHOT na start]

"Widzę pulpit z ikonami. Muszę otworzyć przeglądarkę. 
Widzę ikonę Firefox w docku u dołu ekranu. Kliknę w nią."

[LEFT_CLICK na ikonę]

"Kliknąłem w Firefox. Poczekam, aż przeglądarka się otworzy."

[WAIT 3 sekundy]

[SCREENSHOT]

"Przeglądarka się otworzyła. Widzę stronę startową Firefox. 
Teraz kliknę w pasek adresu, aby wpisać URL."

[LEFT_CLICK na pasek adresu]

"Kliknąłem w pasek adresu. Teraz wpiszę adres."

[TYPE "example.com"]

"Wpisałem adres. Nacisnę Enter, aby przejść do strony."

[KEY "enter"]

[WAIT 2 sekundy]

[SCREENSHOT]

"Strona się załadowała. Widzę..."
\`\`\`

---

## STANDARDY JAKOŚCI

✅ **ROBISZ DOBRZE gdy:**
- Informujesz przed każdą akcją
- Robisz screenshoty przed i po akcjach
- Weryfikujesz każdy krok
- Komunikujesz się naturalnie i płynnie
- Kontynuujesz zadanie do końca

❌ **UNIKAJ:**
- Wykonywania akcji "w ciemno"
- Pomijania screenshotów
- Zakładania, że coś zadziałało
- Przerywania w połowie zadania
- Pytania o pozwolenie (działaj proaktywnie)

---

## PAMIĘTAJ

Twoje działania są w pełni przezroczyste. Użytkownik widzi każdą Twoją akcję i komunikat. Twoja rola to:
- **Działać** proaktywnie
- **Komunikować** każdy krok
- **Weryfikować** każdy wynik
- **Kontynuować** do zakończenia zadania

Jesteś autonomicznym operatorem komputera - działaj pewnie, ale zawsze z pełną transparentnością!`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "computer_use",
      description:
        "Use the computer to perform actions like clicking, typing, taking screenshots, etc.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description:
              "The action to perform. Must be one of: screenshot, left_click, double_click, right_click, mouse_move, type, key, scroll, left_click_drag, wait",
            enum: [
              "screenshot",
              "left_click",
              "double_click",
              "right_click",
              "mouse_move",
              "type",
              "key",
              "scroll",
              "left_click_drag",
              "wait",
            ],
          },
          coordinate: {
            type: "array",
            items: { type: "number" },
            description: "X,Y coordinates for actions that require positioning",
          },
          text: {
            type: "string",
            description: "Text to type or key to press",
          },
          scroll_direction: {
            type: "string",
            description: "Direction to scroll. Must be 'up' or 'down'",
            enum: ["up", "down"],
          },
          scroll_amount: {
            type: "number",
            description: "Number of scroll clicks",
          },
          start_coordinate: {
            type: "array",
            items: { type: "number" },
            description: "Start coordinates for drag operations",
          },
          duration: {
            type: "number",
            description: "Duration for wait action in seconds",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bash_command",
      description: "Execute bash commands on the computer",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
];

export async function POST(req: Request) {
  const {
    messages,
    sandboxId,
    timestamp,
    requestId,
  }: {
    messages: any[];
    sandboxId: string;
    timestamp?: number;
    requestId?: string;
  } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        try {
          // JSON Lines format: JSON object + newline (prostsze niż SSE)
          const eventData = {
            ...data,
            timestamp: Date.now(),
            requestId: requestId || "unknown",
          };
          const line = JSON.stringify(eventData) + '\n';
          controller.enqueue(encoder.encode(line));
          
          console.log(`[STREAM] Sent: ${data.type} at ${new Date().toISOString()}`);
        } catch (error) {
          console.error('[STREAM] Error:', error);
        }
      };

      try {
        const desktop = await getDesktop(sandboxId);

      const chatHistory: any[] = [
        {
          role: "system",
          content: INSTRUCTIONS,
        },
      ];

      for (const msg of messages) {
        if (msg.role === "user") {
          chatHistory.push({
            role: "user",
            content: msg.content,
          });
        } else if (msg.role === "assistant") {
          chatHistory.push({
            role: "assistant",
            content: msg.content,
          });
        }
      }

      while (true) {
        const streamResponse = await client.chat.completions.create({
          model: AZURE_DEPLOYMENT,
          messages: chatHistory,
          tools: tools,
          stream: true,
          parallel_tool_calls: false,
          temperature: 0,
        });

        let fullText = "";
        let toolCalls: any[] = [];
        let toolCallsMap = new Map<
          number,
          { id: string; name: string; arguments: string }
        >();

        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            fullText += delta.content;
            sendEvent({
              type: "text-delta",
              delta: delta.content,
              id: "default",
            });
          }

            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                if (!toolCallsMap.has(index)) {
                  const toolCallId =
                    toolCallDelta.id || `call_${index}_${Date.now()}`;
                  const toolName =
                    toolCallDelta.function?.name === "computer_use"
                      ? "computer"
                      : "bash";

                  toolCallsMap.set(index, {
                    id: toolCallId,
                    name: toolCallDelta.function?.name || "",
                    arguments: "",
                  });

                  sendEvent({
                    type: "tool-call-start",
                    toolCallId: toolCallId,
                    index: index,
                  });

                  if (toolCallDelta.function?.name) {
                    sendEvent({
                      type: "tool-name-delta",
                      toolCallId: toolCallId,
                      toolName: toolName,
                      index: index,
                    });
                  }
                }

                const toolCall = toolCallsMap.get(index)!;

                if (toolCallDelta.function?.arguments) {
                  toolCall.arguments += toolCallDelta.function.arguments;

                  sendEvent({
                    type: "tool-argument-delta",
                    toolCallId: toolCall.id,
                    delta: toolCallDelta.function.arguments,
                    index: index,
                  });
                }
              }
            }
          }

          toolCalls = Array.from(toolCallsMap.values());

          if (toolCalls.length > 0) {
            const assistantMessage: any = {
              role: "assistant",
              content: fullText || null,
              tool_calls: toolCalls.map((tc, idx) => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })),
            };
            chatHistory.push(assistantMessage);

            const toolResults: any[] = [];

            for (const toolCall of toolCalls) {
              const parsedArgs = JSON.parse(toolCall.arguments);
              const toolName =
                toolCall.name === "computer_use" ? "computer" : "bash";

              sendEvent({
                type: "tool-input-available",
                toolCallId: toolCall.id,
                toolName: toolName,
                input: parsedArgs,
              });

              // Execute tool synchronously (one at a time)
              const toolResult = await (async () => {
                try {
                  let resultData: any = { type: "text", text: "" };
                  let resultText = "";

                  if (toolCall.name === "computer_use") {
                    const action = parsedArgs.action;

                    switch (action) {
                      case "screenshot": {
                        const image = await desktop.screenshot();
                        resultText = "Screenshot taken successfully";
                        resultData = {
                          type: "image",
                          data: Buffer.from(image).toString("base64"),
                        };

                        sendEvent({
                          type: "screenshot-update",
                          screenshot: Buffer.from(image).toString("base64"),
                        });
                        break;
                      }
                      case "wait": {
                        const actualDuration = Math.min(
                          parsedArgs.duration || 1,
                          2,
                        );
                        await new Promise((resolve) =>
                          setTimeout(resolve, actualDuration * 1000),
                        );
                        resultText = `Waited for ${actualDuration} seconds`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "left_click": {
                        const [x, y] = parsedArgs.coordinate;
                        await desktop.moveMouse(x, y);
                        await desktop.leftClick();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        ); // Wait 1.5s after click
                        resultText = `Left clicked at ${x}, ${y}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "double_click": {
                        const [x, y] = parsedArgs.coordinate;
                        await desktop.moveMouse(x, y);
                        await desktop.doubleClick();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        ); // Wait 1.5s after click
                        resultText = `Double clicked at ${x}, ${y}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "right_click": {
                        const [x, y] = parsedArgs.coordinate;
                        await desktop.moveMouse(x, y);
                        await desktop.rightClick();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        ); // Wait 1.5s after click
                        resultText = `Right clicked at ${x}, ${y}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "mouse_move": {
                        const [x, y] = parsedArgs.coordinate;
                        await desktop.moveMouse(x, y);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500),
                        ); // Wait 0.5s after move
                        resultText = `Moved mouse to ${x}, ${y}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "type": {
                        await desktop.write(parsedArgs.text);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        ); // Wait 1s after typing
                        resultText = `Typed: ${parsedArgs.text}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "key": {
                        const keyToPress =
                          parsedArgs.text === "Return"
                            ? "enter"
                            : parsedArgs.text;
                        await desktop.press(keyToPress);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        ); // Wait 1.5s after key press
                        resultText = `Pressed key: ${parsedArgs.text}`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "scroll": {
                        const direction = parsedArgs.scroll_direction as
                          | "up"
                          | "down";
                        const amount = parsedArgs.scroll_amount || 3;
                        await desktop.scroll(direction, amount);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        ); // Wait 1s after scroll
                        resultText = `Scrolled ${direction} by ${amount} clicks`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      case "left_click_drag": {
                        const [startX, startY] = parsedArgs.start_coordinate;
                        const [endX, endY] = parsedArgs.coordinate;
                        await desktop.drag([startX, startY], [endX, endY]);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1500),
                        ); // Wait 1.5s after drag
                        resultText = `Dragged from (${startX}, ${startY}) to (${endX}, ${endY})`;
                        resultData = { type: "text", text: resultText };
                        break;
                      }
                      default: {
                        resultText = `Unknown action: ${action}`;
                        resultData = { type: "text", text: resultText };
                        console.warn("Unknown action:", action);
                      }
                    }

                    sendEvent({
                      type: "tool-output-available",
                      toolCallId: toolCall.id,
                      output: resultData,
                    });

                    return {
                      tool_call_id: toolCall.id,
                      role: "tool",
                      content: resultText,
                      image:
                        action === "screenshot" ? resultData.data : undefined,
                    };
                  } else if (toolCall.name === "bash_command") {
                    const result = await desktop.commands.run(
                      parsedArgs.command,
                    );
                    const output =
                      result.stdout ||
                      result.stderr ||
                      "(Command executed successfully with no output)";

                    sendEvent({
                      type: "tool-output-available",
                      toolCallId: toolCall.id,
                      output: { type: "text", text: output },
                    });

                    return {
                      tool_call_id: toolCall.id,
                      role: "tool",
                      content: output,
                    };
                  }
                } catch (error) {
                  console.error("Error executing tool:", error);
                  const errorMsg =
                    error instanceof Error ? error.message : String(error);
                  sendEvent({
                    type: "error",
                    errorText: errorMsg,
                  });
                  return {
                    tool_call_id: toolCall.id,
                    role: "tool",
                    content: `Error: ${errorMsg}`,
                  };
                }
              })();

              toolResults.push(toolResult);
            }

            const newScreenshot = await desktop.screenshot();
            sendEvent({
              type: "screenshot-update",
              screenshot: Buffer.from(newScreenshot).toString("base64"),
            });

            for (const result of toolResults) {
              chatHistory.push(result);
            }

            chatHistory.push({
              role: "user",
              content: [
                {
                  type: "text",
                  text: `All ${toolCalls.length} action(s) completed. Continue with the next steps. AKTUALNY EKRAN - SZCZEGÓŁOWE INFORMACJE O ROZDZIELCZOŚCI:
- Szerokość ekranu: ${resolution.x} pikseli
- Wysokość ekranu: ${resolution.y} pikseli
- Format: ${resolution.x}x${resolution.y}
- Współrzędne X: od 0 do ${resolution.x - 1}
- Współrzędne Y: od 0 do ${resolution.y - 1}
- Lewy górny róg: (0, 0)
- Prawy dolny róg: (${resolution.x - 1}, ${resolution.y - 1})
- Środek ekranu: (${Math.floor(resolution.x / 2)}, ${Math.floor(resolution.y / 2)})`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${Buffer.from(newScreenshot).toString("base64")}`,
                  },
                },
              ],
            });
          } else {
            // AI finished without tool calls - add assistant message to history
            if (fullText) {
              chatHistory.push({
                role: "assistant",
                content: fullText,
              });
            }

            // Send finish event
            sendEvent({
              type: "finish",
              content: fullText,
            });

            controller.close();
            return;
          }
        }

        controller.close();
      } catch (error) {
        console.error("Chat API error:", error);
        await killDesktop(sandboxId);
        sendEvent({
          type: "error",
          errorText: String(error),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform, must-revalidate, max-age=0, s-maxage=0, private",
      "Pragma": "no-cache",
      "Expires": "-1",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
      "Surrogate-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
      "X-No-Chat-Cache": "true",
      "Clear-Site-Data": '"cache"',
    },
  });
}
