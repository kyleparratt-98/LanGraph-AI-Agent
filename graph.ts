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
  generateProductManagerReviewPrompt,
  generateTechnicalLeadPrompt,
} from "./prompts";

/*#####################################################################
 # Class and Variable Definitions                                      #
 #####################################################################*/
const developerOrchestratorModel = new ChatOpenAI({ temperature: 0 });
const productManagerModelOne = new ChatOpenAI({
  temperature: 0.8,
});
const productManagerModelTwo = new ChatOpenAI({
  temperature: 1,
});
const productManagerModelThree = new ChatOpenAI({
  temperature: 1,
});
const PRODUCT_MANAGER_ACTUAL = "product_manager_actual";
const TECHNICAL_LEAD_ACTUAL = "technical_lead_actual";

/*#####################################################################
 # Helper Function Definitions                                        #
 #####################################################################*/

async function callProductManagerModel(state: typeof MessagesAnnotation.State) {
  let adequate = false;
  let attempt = 0;
  const userInput = state.messages[state.messages.length - 1];
  let peerOneApproval = false;
  let peerTwoApproval = false;
  let peerFeedbackOne: string | undefined = undefined;
  let peerFeedbackTwo: string | undefined = undefined;
  let latestProductManagerResponse: string | undefined = undefined;

  while (!adequate) {
    const productManagerPrompt = generateProductManagerPrompt(
      userInput.content as string,
      latestProductManagerResponse,
      peerFeedbackOne,
      peerFeedbackTwo
    );
    // Call to get the product manager 1's deliverables
    const responseOne = await productManagerModelOne.invoke([
      {
        role: "assistant",
        content: productManagerPrompt,
      },
      ...state.messages,
    ]);
    latestProductManagerResponse = responseOne.content as string;

    // Review by product manager 2
    let reviewOne;
    if (!peerOneApproval)
      reviewOne = await productManagerModelTwo.invoke([
        {
          role: "assistant",
          content: generateProductManagerReviewPrompt(
            userInput.content as string,
            productManagerPrompt,
            responseOne.content as string
          ).replace(/\n/g, " "),
        },
        userInput,
      ]);

    // Review by product manager 3
    let reviewTwo;
    if (!peerTwoApproval)
      reviewTwo = await productManagerModelThree.invoke([
        {
          role: "assistant",
          content: generateProductManagerReviewPrompt(
            userInput.content as string,
            productManagerPrompt,
            responseOne.content as string
          ).replace(/\n/g, " "),
        },
        userInput,
      ]);

    //Write the product manager's deliverables and the reviews to a file
    const fs = require("fs");
    const path = require("path");
    const attemptFilePath = path.join(
      __dirname,
      "debug",
      "attempt" + attempt + ".txt"
    );
    const attemptFileContent =
      "product manager response:\n" +
      latestProductManagerResponse +
      "\n\n" +
      "reviewer 1 response:\n" +
      (peerOneApproval === false ? reviewOne.content : "approved") +
      "\n\n" +
      "reviewer 2 response:\n" +
      (peerTwoApproval === false ? reviewTwo.content : "approved");
    fs.writeFileSync(attemptFilePath, attemptFileContent);

    if (!peerOneApproval)
      peerOneApproval = (reviewOne.content as string)
        .toLowerCase()
        .includes("[yes]");

    if (!peerTwoApproval)
      peerTwoApproval = (reviewTwo.content as string)
        .toLowerCase()
        .includes("[yes]");

    if (peerOneApproval && peerTwoApproval) {
      adequate = true;
      console.log("--------------------------------");
      console.log("success!", responseOne.content);
      console.log("--------------------------------");
      return { messages: [responseOne] };
    } else {
      attempt++;
      if (peerOneApproval) {
        peerFeedbackOne = undefined;
      } else {
        const lowPriorityOnly =
          !(reviewOne.content as string).toLowerCase().includes("[medium]") &&
          !(reviewOne.content as string).toLowerCase().includes("[high]");
        if (lowPriorityOnly) {
          peerFeedbackOne = undefined;
        } else {
          peerFeedbackOne = reviewOne.content as string;
        }
      }
      if (peerTwoApproval) {
        peerFeedbackTwo = undefined;
      } else {
        const lowPriorityOnly =
          !(reviewTwo.content as string).toLowerCase().includes("[medium]") &&
          !(reviewTwo.content as string).toLowerCase().includes("[high]");
        if (lowPriorityOnly) {
          peerFeedbackTwo = undefined;
        } else {
          peerFeedbackTwo = reviewTwo.content as string;
        }
      }

      console.log(
        `Attempt ${attempt}: Feedback suggests revisions are needed. [${peerOneApproval}, ${peerTwoApproval}]`
      );
      state.messages.push(
        new HumanMessage(
          "INCORPORATE THE FEEDBACK AND MAKE THE NECESSARY CHANGES. DO NOT FORGET TO INCORPORATE THE FEEDBACK."
        )
      );
    }
  }
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
