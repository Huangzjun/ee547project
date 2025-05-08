const https = require('https');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

const USDA_API_KEY = process.env.USDA_API_KEY;
const FOOD_RECORDS_TABLE = 'FoodRecords';

const PARSE_API_URL = 'https://ms4dunz31k.execute-api.us-west-2.amazonaws.com/stage8/parseMeal';

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const userId = body.userId;
        const inputText = body.mealDescription;

        if (!inputText) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No input provided.' })
            };
        }

        const parseResponse = await httpPostJson(PARSE_API_URL, {
            mealDescription: inputText
        });

        const extractedFoods = parseResponse.parsedFoods;
        if (!Array.isArray(extractedFoods) || extractedFoods.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No food items parsed.' })
            };
        }

        const foodsInfo = [];
        for (const item of extractedFoods) {
            const foodName = item.food;
            const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&api_key=${USDA_API_KEY}`;

            const usdaData = await httpGet(searchUrl);
            if (usdaData.foods && usdaData.foods.length > 0) {
                const topMatch = usdaData.foods[0];
                foodsInfo.push({
                    food: topMatch.description,
                    fdcId: topMatch.fdcId,
                    quantity: item.quantity,
                    unit: item.unit
                });
            }
        }

        const putParams = {
            TableName: FOOD_RECORDS_TABLE,
            Item: {
                userId: userId,
                timestamp: Date.now().toString(),
                mealDescription: inputText,
                foods: foodsInfo
            }
        };
        await dynamodb.put(putParams).promise();

        return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({
              message: 'Meal recorded successfully.',
              userId: userId,
              parsedFoods: foodsInfo
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

function httpGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

function httpPostJson(url, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const parsedUrl = new URL(url);

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}
