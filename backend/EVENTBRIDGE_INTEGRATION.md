# EventBridge Integration for Project Events

## Overview

This document describes the implementation of EventBridge integration for project lifecycle events in the Sachain platform. The implementation provides comprehensive event publishing for all project operations with proper schema validation and error handling.

## Implementation Summary

### Task 17: Add EventBridge integration for project events ✅

**Requirements Addressed:**
- 5.5: Event-driven notifications and downstream processing
- 6.6: Event publishing and schema validation

**Components Implemented:**

1. **ProjectEventPublisher Service** (`src/utils/project-event-publisher.ts`)
   - Comprehensive event publisher for all project lifecycle events
   - Schema validation for all event types
   - Retry logic with exponential backoff
   - Proper error handling and logging

2. **Event Schemas and Types**
   - 8 distinct event types covering complete project lifecycle
   - Strict schema validation with required fields
   - Version management for future compatibility
   - Source validation for event routing

3. **Lambda Integration**
   - Updated project creation Lambda to use new event publisher
   - Updated stock minting Lambda with comprehensive event publishing
   - Updated project management Lambda for status changes and updates
   - Added failure event publishing for error scenarios

4. **Comprehensive Testing**
   - Unit tests for ProjectEventPublisher service (21 tests)
   - Integration tests for complete event workflows (7 tests)
   - Error handling and validation tests
   - Schema compliance verification

## Event Types Implemented

### Project Lifecycle Events

1. **PROJECT_CREATED**
   - Published when a new project is created
   - Source: `sachain.projects`
   - Contains: project details, entrepreneur info, initial configuration

2. **PROJECT_UPDATED**
   - Published when project details are modified
   - Source: `sachain.projects`
   - Contains: change tracking with before/after values

3. **PROJECT_STATUS_CHANGED**
   - Published when project status transitions occur
   - Source: `sachain.projects`
   - Contains: previous status, new status, change reason

4. **PROJECT_DELETED**
   - Published when a project is deleted
   - Source: `sachain.projects`
   - Contains: project info and deletion reason

### Stock Minting Events

5. **STOCK_MINTING_STARTED**
   - Published when stock minting begins
   - Source: `sachain.stock-minting`
   - Contains: project info, wallet address, stock supply

6. **STOCK_MINTING_PROGRESS**
   - Published during minting progress updates
   - Source: `sachain.stock-minting`
   - Contains: completion percentage, batch info, status

7. **STOCK_MINTING_COMPLETED**
   - Published when minting completes successfully
   - Source: `sachain.stock-minting`
   - Contains: token ID, transaction IDs, final counts

8. **STOCK_MINTING_FAILED**
   - Published when minting fails
   - Source: `sachain.stock-minting`
   - Contains: error details, partial completion info

## Key Features

### Schema Validation
- All events validated against predefined schemas
- Required field checking
- Version compatibility verification
- Source validation for proper routing

### Error Handling
- Graceful failure handling for event publishing
- Non-blocking event publishing (operations don't fail if events fail)
- Comprehensive error logging for monitoring
- Retry logic with exponential backoff

### Event Structure
```typescript
interface BaseProjectEvent {
  eventId: string;           // Unique event identifier
  eventType: string;         // Event type (e.g., PROJECT_CREATED)
  source: string;           // Event source (sachain.projects, sachain.stock-minting)
  version: string;          // Schema version (1.0)
  timestamp: string;        // ISO timestamp
  projectId: string;        // Project identifier
  entrepreneurId: string;   // Entrepreneur identifier
  // ... event-specific fields
}
```

### Integration Points

1. **Project Creation Lambda**
   - Publishes PROJECT_CREATED events
   - Enhanced with proper event schema validation

2. **Stock Minting Lambda**
   - Publishes STOCK_MINTING_STARTED events
   - Publishes STOCK_MINTING_PROGRESS events during batching
   - Publishes STOCK_MINTING_COMPLETED events on success
   - Publishes STOCK_MINTING_FAILED events on failure

3. **Project Management Lambda**
   - Publishes PROJECT_UPDATED events for changes
   - Publishes PROJECT_STATUS_CHANGED events for status transitions
   - Publishes PROJECT_DELETED events for deletions

## Configuration

### Environment Variables
- `EVENT_BUS_NAME`: EventBridge event bus name (default: "default")
- `AWS_REGION`: AWS region for EventBridge client

### Event Bus Setup
Events are published to the configured EventBridge event bus with proper source routing:
- Project events: `sachain.projects`
- Stock minting events: `sachain.stock-minting`

## Usage Examples

### Publishing Project Created Event
```typescript
import { createProjectEventPublisher } from './utils/project-event-publisher';

const publisher = createProjectEventPublisher({
  eventBusName: process.env.EVENT_BUS_NAME!,
  region: process.env.AWS_REGION,
});

await publisher.publishProjectCreatedEvent({
  projectId: 'proj-123',
  entrepreneurId: 'ent-456',
  projectName: 'My Project',
  category: 'Technology',
  stockSupply: 1000,
  status: 'draft',
  createdAt: '2024-01-01T00:00:00.000Z',
});
```

### Publishing Stock Minting Progress
```typescript
await publisher.publishStockMintingProgressEvent({
  projectId: 'proj-123',
  entrepreneurId: 'ent-456',
  progress: {
    completed: 500,
    total: 1000,
    percentage: 50,
    status: 'in_progress',
    currentBatch: 5,
    totalBatches: 10,
  },
});
```

## Testing

### Unit Tests
- **ProjectEventPublisher**: 21 tests covering all event types and validation
- **Event Schema Validation**: Comprehensive schema compliance testing
- **Error Handling**: Retry logic and failure scenario testing

### Integration Tests
- **Complete Lifecycle**: End-to-end project lifecycle event publishing
- **Error Scenarios**: Event publishing failure handling
- **Schema Validation**: Real-world event structure validation

### Test Coverage
- All event types tested
- Schema validation for all events
- Error handling and retry logic
- EventBridge client integration
- Event structure compliance

## Monitoring and Observability

### Logging
- Structured logging for all event publishing operations
- Success and failure tracking with metrics
- Event validation logging for debugging

### Metrics
Events can be monitored through:
- EventBridge metrics in CloudWatch
- Custom application metrics for event publishing success/failure rates
- Lambda function metrics for event publishing performance

## Future Enhancements

1. **Event Replay**: Implement event replay capabilities for failed downstream processing
2. **Event Filtering**: Add event filtering rules for targeted downstream processing
3. **Dead Letter Queues**: Implement DLQ for failed event processing
4. **Event Archival**: Add long-term event storage for compliance and analytics
5. **Cross-Region Replication**: Implement event replication for disaster recovery

## Compliance and Security

- All events include proper authentication context (entrepreneurId)
- No sensitive data (passwords, tokens) included in events
- Event schemas designed for forward compatibility
- Proper error handling prevents information leakage

## Dependencies

- `@aws-sdk/client-eventbridge`: EventBridge client
- `uuid`: Event ID generation
- Custom retry utility with exponential backoff
- Structured logging utility
- Enhanced error handling system

## Files Modified/Created

### New Files
- `src/utils/project-event-publisher.ts` - Main event publisher service
- `src/utils/__tests__/project-event-publisher.test.ts` - Unit tests
- `src/__tests__/integration/project-eventbridge-integration.test.ts` - Integration tests

### Modified Files
- `src/lambdas/project-creation/index.ts` - Added event publishing
- `src/lambdas/stock-minting/index.ts` - Enhanced event publishing
- `src/lambdas/project-management/index.ts` - Added comprehensive event publishing
- `src/utils/enhanced-error-handler.ts` - Fixed TypeScript errors

## Conclusion

The EventBridge integration provides a robust, scalable foundation for event-driven architecture in the Sachain platform. All project lifecycle events are now properly captured and published with comprehensive validation, error handling, and monitoring capabilities.