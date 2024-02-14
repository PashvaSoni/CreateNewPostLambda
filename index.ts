import { APIGatewayProxyEvent, APIGatewayProxyResultV2, Handler } from "aws-lambda";
import { randomUUID } from "crypto";
import { DynamoDB } from "aws-sdk";
// Function to validate data and return validation errors
function validateData(data) {
    const errors = [];

    // productName validation
    if (!data.productName || typeof data.productName !== 'string' || data.productName.length < 1 || data.productName.length > 100) {
        errors.push({
            field: "productName",
            message: "ProductName must be between 1 and 100 characters."
        });
    }

    // productType validation
    if (!data.productType || typeof data.productType !== 'string' || data.productType.length < 1 || data.productType.length > 50) {
        errors.push({
            field: "productType",
            message: "ProductType must be between 1 and 50 characters."
        });
    }

    // productDescription validation
    if (!data.productDescription || typeof data.productDescription !== 'string' || data.productDescription.length < 1 || data.productDescription.length > 500) {
        errors.push({
            field: "productDescription",
            message: "ProductDescription must be between 1 and 500 characters."
        });
    }

    // productWeight validation
    if (typeof data.productWeight !== 'number' || data.productWeight < 0) {
        errors.push({
            field: "productWeight",
            message: "ProductWeight must be a non-negative number."
        });
    }

    // productLabour validation
    if (typeof data.productLabour !== 'number' || data.productLabour < 0) {
        errors.push({
            field: "productLabour",
            message: "ProductLabour must be a non-negative number."
        });
    }

    // productMetalType validation
    if (!data.productMetalType || typeof data.productMetalType !== 'string' || !["gold", "silver", "platinum", "imitation", "alloy"].includes(data.productMetalType)) {
        errors.push({
            field: "productMetalType",
            message: "Invalid ProductMetalType. Choose from gold, silver, platinum, imitation or alloy."
        });
    }

    // productExtraCharges validation
    if (typeof data.productExtraCharges !== 'number' || data.productExtraCharges < 0) {
        errors.push({
            field: "productExtraCharges",
            message: "ProductExtraCharges must be a non-negative number."
        });
    }

    // productMediaURLs validation
    if (!Array.isArray(data.productMediaURLs) || data.productMediaURLs.some(url => typeof url !== 'object' || !url.mediaType || !["video", "image"].includes(url.mediaType) || !url.mediaURL || typeof url.mediaURL !== 'string' || url.mediaURL.length < 1 || url.mediaURL.length > 255)) {
        errors.push({
            field: "productMediaURLs",
            message: "Invalid ProductMediaURLs. Check the format of mediaType and mediaURL."
        });
    }

    return errors;
}
export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResultV2> => {
    try {
        // Validate the incoming data
        const validationErrors = validateData(event['body-json']);

        if (validationErrors.length > 0) {
            // If there are validation errors, return a customized error response
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: "VALIDATION_ERROR",
                    message: "Validation failed. See details for specific errors.",
                    details: validationErrors
                })
            };
        }

        // Continue with normal processing if data is valid
        // ...
        let newProductID = randomUUID();
        let newProductCreatedAt = new Date().toISOString();

        // Access stage variable
        const environment = event['stage-variables'] && event['stage-variables']['ENVIRONMENT'];

        if (!environment) {
            throw new Error('ENVIRONMENT stage variable not defined. Please Check the Content-Type Header !');
        }

        const tableName = (environment === 'DEV') ? process.env.DEV_TABLENAME : process.env.PROD_TABLENAME;

        event['productID'] = newProductID;
        event['productCreatedAt'] = newProductCreatedAt;

        const documentClient = new DynamoDB.DocumentClient();
        const params = {
            TableName: tableName,
            Item: {
                "productName": event['body-json'].productName,
                "productType": event['body-json'].productType,
                "productDescription": event['body-json'].productDescription,
                "productWeight": event['body-json'].productWeight,
                "productLabour": event['body-json'].productLabour,
                "productMetalType": event['body-json'].productMetalType,
                "productExtraCharges": event['body-json'].productExtraCharges,
                "productMediaURLs": event['body-json'].productMediaURLs,
                "productID": newProductID,
                "productCreatedAt": newProductCreatedAt
            },
            ReturnValues: "NONE"
        };
        const newData = await documentClient.put(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify(newData)
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                code: "INTERNAL_ERROR",
                message: "Internal Error. See details for specific errors. " + error.message,
                details: error
            })
        };
    }
};