// agent.ts

// IMPORTANT - Add your API keys here. Be careful not to publish them.
import * as dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!OPENAI_API_KEY || !TAVILY_API_KEY) {
  throw new Error("Missing API keys. Please check your .env file.");
}

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { productManagerPrompt, technicalLeadPrompt } from "./prompts";

/*#####################################################################
 # Class and Variable Definitions                                      #
 #####################################################################*/
// Define the tools for the agent to use
const agentTools = [new TavilySearchResults()];
const toolNode = new ToolNode(agentTools);
const developerOrchestratorModel = new ChatOpenAI({ temperature: 0 });
const productManagerModel = new ChatOpenAI({ temperature: 0 });
const PRODUCT_MANAGER_ACTUAL = "product_manager_actual";
const TECHNICAL_LEAD_ACTUAL = "technical_lead_actual";

/*#####################################################################
 # Helper Function Definitions                                        #
 #####################################################################*/

// Function that calls the model
async function callProductManagerModel(state: typeof MessagesAnnotation.State) {
  const response = await productManagerModel.invoke([
    { role: "system", content: productManagerPrompt },
    ...state.messages,
  ]);
  console.log("callProductManagerModel has been called", response.content);

  // We return a list, because this will get added to the existing list
  return { messages: [response] };
}

async function callTechnicalLeadModel(state: typeof MessagesAnnotation.State) {
  const response = await developerOrchestratorModel.invoke([
    { role: "system", content: technicalLeadPrompt },
    ...state.messages,
  ]);
  console.log(
    "callDeveloperOrchestratorModel has been called",
    response.content
  );

  return { messages: [response] };
}

/*#####################################################################
 # Graph Definitions                                                  #
 #####################################################################*/

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode(PRODUCT_MANAGER_ACTUAL, callProductManagerModel)
  .addEdge(START, PRODUCT_MANAGER_ACTUAL) // __start__ is a special name for the entrypoint

  .addNode(TECHNICAL_LEAD_ACTUAL, callTechnicalLeadModel)
  .addEdge(PRODUCT_MANAGER_ACTUAL, TECHNICAL_LEAD_ACTUAL)

  .addEdge(TECHNICAL_LEAD_ACTUAL, END);

// Finally, we compile it into a LangChain Runnable.
const app = workflow.compile();

/*#####################################################################
 # Main Function Definitions                                           #
 #####################################################################*/
// Use the agent
async function main() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let userInput = "";
  let state;
  while (userInput.toLowerCase() !== "exit") {
    userInput = await new Promise((resolve) => {
      readline.question("Enter your message (or 'exit' to quit): ", resolve);
    });
    if (userInput.toLowerCase() === "exit") break;
    state = await app.invoke({
      messages: [new HumanMessage(userInput)],
    });
    console.log(state);
  }
  readline.close();
}

main();

async function printGraph() {
  const fs = require("fs");

  const representation = app.getGraph();
  const image = await representation.drawMermaidPng();
  const arrayBuffer = await image.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  fs.writeFileSync("./graph.png", buffer);
}
