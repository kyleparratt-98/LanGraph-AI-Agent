import { ChatOpenAI } from "@langchain/openai";

// Define the shared structured template
const structuredTemplate = `
Design Elements:
- Color scheme:
- Typography:
- Layout preferences:

Performance & Scalability:
- Page load speed targets:
- Caching strategy:
- Scalability requirements:

Security & Privacy:
- Authentication & authorization:
- Data encryption:
- Compliance requirements:
`;

const productManagerModelOne = new ChatOpenAI({
  temperature: 0.6,
});
const productManagerModelTwo = new ChatOpenAI({
  temperature: 0.6,
});
const productManagerModelThree = new ChatOpenAI({
  temperature: 0.6,
});

export const generateProductManagerPrompt = (
  prompt: string,
  latestProductManagerResponse?: string,
  peerFeedbackOne?: string,
  peerFeedbackTwo?: string
) => {
  const result = `
${
  latestProductManagerResponse
    ? `
    You have delivered the following from your last attempt:
    

    [[${latestProductManagerResponse}]]


    
    
    Please carefully review and incorporate the following feedback into your original deliverables. 
    It is critical that you address each point of feedback thoroughly and comprehensively in your next attempt, prioritizing high and medium priority items first.
    
    Peer review 1 feedback:
    ${peerFeedbackOne}

    Peer review 2 feedback: 
    ${peerFeedbackTwo}
    
    As you revise your deliverables, make sure to:
    1. Directly address each piece of feedback, point by point, focusing on high and medium priority items first
    2. Provide additional details, specific examples, and references where requested, prioritizing the most critical aspects
    3. Expand on areas that were noted as lacking or needing more information
    4. Correct any inaccuracies or inconsistencies highlighted by the reviewers
    5. Ensure your revisions are comprehensive and leave no high or medium priority feedback unaddressed
    
    It is essential that your next attempt fully incorporates the provided high and medium priority feedback to the satisfaction of the reviewers. 
    Take the time necessary to thoughtfully address each element in your revisions, ensuring that your deliverables are closely aligned with the task of creating an HTML website for the food delivery app.

    Please provide detailed information for each section of the following template, focusing on the specific requirements for the HTML website:

    ${structuredTemplate}

    IMPORTANT: 
    - YOU SHOULD NOT PRODUCE ANY CODE!!! YOU ARE NOT RESPONSIBLE FOR TECHNICAL DETAILS!

    After revising your deliverables, please include a summary of how you have addressed each point of feedback, 
    referencing the specific changes made and the priority level of the feedback addressed. This will help the reviewers verify that their critical feedback has been fully incorporated.
    `
    : `You are a product manager for a software company. YOU SHOULD NOT PRODUCE ANY CODE!!! YOU ARE NOT RESPONSIBLE FOR TECHNICAL DETAILS!
You are responsible for taking the user requirements and delivering the following:

- Define the requirements for creating an HTML website for the food delivery app
- Define the product acceptance criteria for the HTML website

Here is the user's prompt:

${prompt}

All 2 deliverables need to be delivered and need to be extremely detailed and comprehensive, focusing on the specific requirements for the HTML website! No shortcuts!
Please note the user will not participate or provide any feedback on the deliverables, designs etc. These are to be made without any input from the user.

Please provide detailed information for each section of the following template, ensuring that the content is tailored to the creation of the HTML website for the food delivery app:

${structuredTemplate}

IMPORTANT:
- YOU SHOULD NOT PRODUCE ANY CODE!!! YOU ARE NOT RESPONSIBLE FOR TECHNICAL DETAILS!
- Focus on providing specific details, examples, and references for each section.
`
}
`;

  return result.replace(/\n/g, " ");
};

export const generateProductManagerReviewPrompt = (
  userInput: string,
  productManagerPrompt: string,
  deliverables: string
) => `
You are a product manager for a software company and your job is to review the following deliverables from your peer.

Here is what the user has asked for:

${userInput}


Here is what has been requested of the product manager peer:

${productManagerPrompt}


Here are the deliverables from your peer:

${deliverables}


Please review the deliverables based on the following template:

${structuredTemplate}

Provide feedback on the completeness, clarity, and feasibility of the proposed solutions for each section, focusing on how well they align with the task of creating an HTML website for the food delivery app.

For each feedback point, you MUST assign a priority level wrapped in square brackets:
- [Low]: Minor improvements or clarifications needed, does not significantly impact the overall deliverables
- [Medium]: Important improvements needed, impacts the quality of the deliverables and should be addressed in the current iteration
- [High]: Critical issues or missing information, must be addressed immediately before the deliverables can be considered complete

It is crucial that you assign a priority level to each and every feedback point to help the product manager prioritize their revisions. The priority level should be based on the impact and urgency of each point in relation to the overall goal of creating an HTML website for the food delivery app.

Provide specific and actionable feedback, offering concrete suggestions for improvement or identifying areas that need further elaboration. Avoid general statements and focus on providing tangible guidance to help improve the deliverables.

If you feel the deliverables are adequate, please start your reply simply with "[yes]". 
If you feel the deliverables are inadequate, please start your reply with "[no]" and provide detailed feedback on what is missing or incorrect.

If there are unaddressed items in the deliverables but they are all of [Low] priority, you MUST still pass the review by starting your reply with "[yes]". The review should only fail if there are unaddressed [Medium] or [High] priority items.
YOU SHOULD NOT PRODUCE ANY CODE!!! YOU ARE NOT RESPONSABLE FOR TECHNICAL DETAILS! NEITHER IS THE PRODUCT MANAGER!!!!!
Please be strict in your review, but consider the priority level of each feedback point in your overall assessment. Remember, every single piece of feedback must have a priority level assigned and wrapped in square brackets.
`;

export const generateTechnicalLeadPrompt = (prompt: string) => `
You are a technical lead for a software company.
You are responsible for taking the product manager's requirements and turning them into technical requirements.
You will be given the following deliverables from the product manager:

- The product manager's requirements
- The product manager's acceptance criteria

Here are the product manager's deliverables:

${prompt}

You are now responsible for taking the product manager's requirements and acceptance criteria and deliver the following:

- The technical requirements
- The technical acceptance criteria
- A list of scoped out tasks that are required to deliver the required changes

All 3 deliverables need to be delivered!
Please note the user will not pparticipate or provide any feedback on the deliverables, designs etc. These are to be made without any input from the user.
`;

export const developerPrompt = `
You are a developer for a software company.

You are responsible for taking the technical lead's requirements and turning them into a technical solution.
`;
