// agent.ts

// IMPORTANT - Add your API keys here. Be careful not to publish them.
import * as dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!OPENAI_API_KEY || !TAVILY_API_KEY) {
  throw new Error("Missing API keys. Please check your .env file.");
}

import { ChatOpenAI } from "@langchain/openai";
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import {
  generateProductManagerPrompt,
  generateTechnicalLeadPrompt,
} from "./prompts";

/*#####################################################################
 # Class and Variable Definitions                                      #
 #####################################################################*/
const developerOrchestratorModel = new ChatOpenAI({ temperature: 0 });
const productManagerModelOne = new ChatOpenAI({ temperature: 0 });
const productManagerModelTwo = new ChatOpenAI({ temperature: 0 });
const productManagerModelThree = new ChatOpenAI({ temperature: 0 });
const PRODUCT_MANAGER_ACTUAL = "product_manager_actual";
const TECHNICAL_LEAD_ACTUAL = "technical_lead_actual";

/*#####################################################################
 # Helper Function Definitions                                        #
 #####################################################################*/

async function callProductManagerModel(state: typeof MessagesAnnotation.State) {
  const userInput = state.messages[state.messages.length - 1];

  // First call to get the product manager 1's deliverables
  const responseOne = await productManagerModelOne.invoke([
    {
      role: "assistant",
      content: generateProductManagerPrompt(userInput.content as string),
    },
    userInput,
  ]);
  console.log("--------------------------------");
  console.log("--------------------------------");
  console.log("Product Manager 1's deliverables: ", responseOne.content);

  // Second call to get the product manager 2's deliverables
  const responseTwo = await productManagerModelTwo.invoke([
    {
      role: "assistant",
      content: generateProductManagerPrompt(userInput.content as string),
    },
    userInput,
  ]);
  console.log("--------------------------------");
  console.log("--------------------------------");
  console.log("Product Manager 2's deliverables: ", responseTwo.content);

  // Third call to get the product manager 3's deliverables
  const responseThree = await productManagerModelThree.invoke([
    {
      role: "assistant",
      content: generateProductManagerPrompt(userInput.content as string),
    },
    userInput,
  ]);

  console.log("--------------------------------");
  console.log("--------------------------------");
  console.log("Product Manager 3's deliverables: ", responseThree.content);

  return { messages: [responseOne] };
}

async function callTechnicalLeadModel(state: typeof MessagesAnnotation.State) {
  const productManagerDeliverables = state.messages[state.messages.length - 1];
  const response = await developerOrchestratorModel.invoke([
    {
      role: "assistant",
      content: generateTechnicalLeadPrompt(
        productManagerDeliverables.content as string
      ),
    },
    productManagerDeliverables,
  ]);
  console.log("Technical Lead deliverables: ", response.content);

  return { messages: [response] };
}

/*#####################################################################
 # Graph Definitions                                                  #
 #####################################################################*/

const workflow = new StateGraph(MessagesAnnotation)
  // Add the product manager node and link to the start
  .addNode(PRODUCT_MANAGER_ACTUAL, callProductManagerModel)
  .addEdge(START, PRODUCT_MANAGER_ACTUAL)

  // Add the technical lead node and link to the product manager
  .addNode(TECHNICAL_LEAD_ACTUAL, callTechnicalLeadModel)
  .addEdge(PRODUCT_MANAGER_ACTUAL, TECHNICAL_LEAD_ACTUAL)
  // Link the technical lead to the end
  .addEdge(TECHNICAL_LEAD_ACTUAL, END);

// Compile it into a LangChain Runnable.
const app = workflow.compile();

/*#####################################################################
 # Main Function Definitions                                           #
 #####################################################################*/

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
