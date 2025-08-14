import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { PaginationOptions, QueryResult } from "../models";
import { ExponentialBackoff, defaultRetry } from "../utils/retry";
import {
  DynamoDBLogger,
  ErrorClassifier,
  handleDynamoDBErrors,
} from "../utils/error-handler";

export interface DynamoDBConfig {
  tableName: string;
  region?: string;
}

export abstract class BaseRepository {
  protected readonly client: DynamoDBDocumentClient;
  protected readonly tableName: string;
  protected readonly retry: ExponentialBackoff;

  constructor(config: DynamoDBConfig) {
    const dynamoClient = new DynamoDBClient({
      region: config.region || process.env.AWS_REGION || "us-east-1",
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true, // Remove undefined values from items
        convertEmptyValues: false, // Do not convert empty strings to null
      },
      unmarshallOptions: {
        wrapNumbers: false, // Do not wrap numbers in BigInt
      },
    });
    this.tableName = config.tableName;
    this.retry = defaultRetry;
  }

  /**
   * Put an item into DynamoDB with retry logic
   */
  protected async putItem<T extends Record<string, any>>(
    item: T
  ): Promise<void> {
    const startTime = Date.now();
    const operation = "putItem";

    try {
      const result = await this.retry.execute(async () => {
        const command = new PutCommand({
          TableName: this.tableName,
          Item: item as Record<string, any>,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(operation, this.tableName, item, duration);

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(operation, error, this.tableName, item, {
        duration: `${duration}ms`,
      });

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        item,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Get an item from DynamoDB by primary key with retry logic
   */
  protected async getItem<T>(pk: string, sk: string): Promise<T | null> {
    const startTime = Date.now();
    const operation = "getItem";
    const key = { PK: pk, SK: sk };

    try {
      const result = await this.retry.execute(async () => {
        const command = new GetCommand({
          TableName: this.tableName,
          Key: key,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      // const item = result.result.Item as T;
      // if (item && "status" in item && !item.status) {
      //   // Handle case where status might be empty string or null
      //   console.warn(
      //     "Status field is missing or empty, checking raw item:",
      //     result.result.Item
      //   );
      // }
      // return item || null;

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(operation, this.tableName, key, duration);

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }

      return (result.result.Item as T) || null;
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(operation, error, this.tableName, key, {
        duration: `${duration}ms`,
      });

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        key,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Update an item in DynamoDB with retry logic
   */
  protected async updateItem(
    pk: string,
    sk: string,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();
    const operation = "updateItem";
    const key = { PK: pk, SK: sk };

    try {
      const result = await this.retry.execute(async () => {
        const command = new UpdateCommand({
          TableName: this.tableName,
          Key: key,
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(operation, this.tableName, key, duration);

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(operation, error, this.tableName, key, {
        duration: `${duration}ms`,
        updateExpression,
      });

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        key,
        updateExpression,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Delete an item from DynamoDB with retry logic
   */
  protected async deleteItem(pk: string, sk: string): Promise<void> {
    const startTime = Date.now();
    const operation = "deleteItem";
    const key = { PK: pk, SK: sk };

    try {
      const result = await this.retry.execute(async () => {
        const command = new DeleteCommand({
          TableName: this.tableName,
          Key: key,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(operation, this.tableName, key, duration);

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(operation, error, this.tableName, key, {
        duration: `${duration}ms`,
      });

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        key,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Query items from DynamoDB with retry logic
   */
  protected async queryItems<T>(
    keyConditionExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    indexName?: string,
    options?: PaginationOptions
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const operation = "queryItems";

    try {
      const result = await this.retry.execute(async () => {
        const command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          IndexName: indexName,
          Limit: options?.limit,
          ExclusiveStartKey: options?.exclusiveStartKey,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(
        operation,
        this.tableName,
        { keyConditionExpression, indexName },
        duration
      );

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }

      return {
        items: (result.result.Items as T[]) || [],
        lastEvaluatedKey: result.result.LastEvaluatedKey,
        count: result.result.Count || 0,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(
        operation,
        error,
        this.tableName,
        { keyConditionExpression, indexName },
        {
          duration: `${duration}ms`,
        }
      );

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        keyConditionExpression,
        indexName,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Scan items from DynamoDB (use sparingly) with retry logic
   */
  protected async scanItems<T>(
    filterExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    options?: PaginationOptions
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const operation = "scanItems";

    try {
      const result = await this.retry.execute(async () => {
        const command = new ScanCommand({
          TableName: this.tableName,
          FilterExpression: filterExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: options?.limit,
          ExclusiveStartKey: options?.exclusiveStartKey,
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(
        operation,
        this.tableName,
        { filterExpression },
        duration
      );

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }

      return {
        items: (result.result.Items as T[]) || [],
        lastEvaluatedKey: result.result.LastEvaluatedKey,
        count: result.result.Count || 0,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(
        operation,
        error,
        this.tableName,
        { filterExpression },
        {
          duration: `${duration}ms`,
        }
      );

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        filterExpression,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Batch get items from DynamoDB with retry logic
   */
  protected async batchGetItems<T>(
    keys: Array<{ PK: string; SK: string }>
  ): Promise<T[]> {
    if (keys.length === 0) return [];

    const startTime = Date.now();
    const operation = "batchGetItems";

    try {
      const result = await this.retry.execute(async () => {
        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: keys,
            },
          },
        });

        return await this.client.send(command);
      }, `${this.constructor.name}.${operation}`);

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(
        operation,
        this.tableName,
        { keyCount: keys.length },
        duration
      );

      if (result.attempts > 1) {
        DynamoDBLogger.logSuccess(
          operation,
          this.tableName,
          result.attempts,
          result.totalDelay
        );
      }

      return (result.result.Responses?.[this.tableName] as T[]) || [];
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(
        operation,
        error,
        this.tableName,
        { keyCount: keys.length },
        {
          duration: `${duration}ms`,
        }
      );

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        keyCount: keys.length,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Batch write items to DynamoDB with retry logic
   */
  protected async batchWriteItems<T>(items: T[]): Promise<void> {
    if (items.length === 0) return;

    const startTime = Date.now();
    const operation = "batchWriteItems";

    // DynamoDB batch write has a limit of 25 items
    const batches = this.chunkArray(items, 25);

    try {
      for (const batch of batches) {
        await this.retry.execute(async () => {
          const command = new BatchWriteCommand({
            RequestItems: {
              [this.tableName]: batch.map((item) => ({
                PutRequest: {
                  Item: item as Record<string, any>,
                },
              })),
            },
          });

          return await this.client.send(command);
        }, `${this.constructor.name}.${operation}`);
      }

      const duration = Date.now() - startTime;
      DynamoDBLogger.logOperation(
        operation,
        this.tableName,
        { itemCount: items.length, batchCount: batches.length },
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      DynamoDBLogger.logError(
        operation,
        error,
        this.tableName,
        { itemCount: items.length, batchCount: batches.length },
        {
          duration: `${duration}ms`,
        }
      );

      const errorDetails = ErrorClassifier.classify(error, {
        operation: `${this.constructor.name}.${operation}`,
        tableName: this.tableName,
        itemCount: items.length,
        batchCount: batches.length,
      });

      throw new Error(errorDetails.technicalMessage);
    }
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Generate timestamp in ISO format
   */
  protected generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate UUID v4
   */
  protected generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
