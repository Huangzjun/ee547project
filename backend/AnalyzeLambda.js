const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const NUTRITION_SUMMARY_TABLE = 'NutritionSummary';

exports.handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId parameter' })
      };
    }

    const params = {
      TableName: NUTRITION_SUMMARY_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      },
      ScanIndexForward: false // optional: reverse chronological order
    };

    const result = await dynamodb.query(params).promise();
    const records = result.Items || [];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",  // 或 "http://localhost:5173"
        "Access-Control-Allow-Credentials": true
      },
      body: JSON.stringify({
        message: "Nutrition history retrieved successfully.",
        records: records
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
