// agent.ts

// IMPORTANT - Add your API keys here. Be careful not to publish them.
process.env.OPENAI_API_KEY =
  "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";
process.env.TAVILY_API_KEY = "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";

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Define the tools for the agent to use
const agentTools = [new TavilySearchResults({ maxResults: 3 })];
const agentModel = new ChatOpenAI({ temperature: 0 });

// Initialize memory to persist state between graph runs
const agentCheckpointer = new MemorySaver();
const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
});

async function main() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let userInput = "";
  while (userInput.toLowerCase() !== "exit") {
    userInput = await new Promise((resolve) => {
      readline.question("Enter your message (or 'exit' to quit): ", resolve);
    });

    if (userInput.toLowerCase() === "exit") break;

    const agentFinalState = await agent.invoke(
      { messages: [new HumanMessage(userInput as string)] },
      { configurable: { thread_id: "42" } }
    );

    console.log(
      agentFinalState.messages[agentFinalState.messages.length - 1].content
    );
  }

  readline.close();
}

main();
