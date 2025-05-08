const { OpenAI } = require("openai");
const AWS = require("aws-sdk");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  try {
    // Debug log
    console.log("Raw event.body:", event.body);

    // Safely parse event.body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    console.log("Parsed body:", body);

    const inputText = body?.mealDescription;

    if (!inputText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No input provided." }),
      };
    }

    const prompt = `
You are a food parser. Given a meal description, extract the foods with quantity and unit.
Respond ONLY with a JSON array like this:
[
  { "food": "brown rice", "quantity": 1, "unit": "cup" },
  { "food": "egg", "quantity": 2, "unit": null }
]
Description: "${inputText}"
    `;

    const chatResponse = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const gptText = chatResponse.choices[0].message.content.trim();

    // Try to parse the model's JSON response
    let parsedFoods;
    try {
      parsedFoods = JSON.parse(gptText);
    } catch (jsonError) {
      console.error("Failed to parse GPT response as JSON:", gptText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Invalid response from language model." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Meal parsed successfully.",
        parsedFoods,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error." }),
    };
  }
};
