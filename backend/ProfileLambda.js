const https = require('https');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const USDA_API_KEY = process.env.USDA_API_KEY;
const NUTRITION_SUMMARY_TABLE = 'NutritionSummary';

exports.handler = async (event) => {
  try {
    console.log("Incoming event:", JSON.stringify(event));

    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }

    const userId = body.userId;
    const foods = body.parsedFoods;

    if (!userId || !Array.isArray(foods) || foods.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or invalid/missing parsedFoods array' })
      };
    }

    const totalNutrients = {};
    const foodDetails = [];

    for (const item of foods) {
      const { fdcId, food, quantity = 1, unit = null } = item;
      const foodData = await fetchFoodDetail(fdcId);

      if (!foodData.labelNutrients) continue;

      const nutrients = foodData.labelNutrients;
      const scaledNutrients = {};

      for (const [key, val] of Object.entries(nutrients)) {
        const scaledValue = (val.value || 0) * quantity;
        scaledNutrients[key] = parseFloat(scaledValue.toFixed(2));
        totalNutrients[key] = (totalNutrients[key] || 0) + scaledNutrients[key];
      }

      foodDetails.push({
        food,
        fdcId,
        quantity,
        unit,
        labelNutrients: scaledNutrients
      });
    }

    const summary = {
      macros: {
        calories: totalNutrients.calories || 0,
        fat_g: totalNutrients.fat || 0,
        carbohydrates_g: totalNutrients.carbohydrates || 0,
        protein_g: totalNutrients.protein || 0
      },
      vitamins: {
        calcium_mg: totalNutrients.calcium || 0,
        iron_mg: totalNutrients.iron || 0,
        potassium_mg: totalNutrients.potassium || 0
      }
    };

    await saveNutritionSummary(userId, foodDetails, summary);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: "Nutrition breakdown calculated successfully.",
        userId,
        foodDetails,
        totalNutrients,
        summary
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function fetchFoodDetail(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_API_KEY}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function saveNutritionSummary(userId, foodDetails, summary) {
    const timestamp = Date.now().toString();
    const recordDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
    const putParams = {
      TableName: NUTRITION_SUMMARY_TABLE,
      Item: {
        userId,
        timestamp,
        recordDate,
        foodDetails,
        summary
      }
    };
  
    await dynamodb.put(putParams).promise();
}
  
