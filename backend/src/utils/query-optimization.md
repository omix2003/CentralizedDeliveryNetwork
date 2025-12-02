# Database Query Optimization Guide

## Optimizations Implemented

### 1. Use `select` instead of `include`
- Reduces data transfer and query complexity
- Only fetch fields that are actually needed
- Example: `select: { id: true, name: true }` instead of `include: { user: true }`

### 2. Database Indexes
Ensure indexes exist on frequently queried fields:
- `Order.partnerId` - indexed
- `Order.agentId` - indexed
- `Order.status` - indexed
- `Order.createdAt` - indexed
- `Agent.userId` - indexed
- `Agent.isApproved` - indexed
- `Agent.status` - indexed

### 3. Pagination
Always use pagination for list queries:
- `take` and `skip` for offset pagination
- Consider cursor-based pagination for large datasets

### 4. Parallel Queries
Use `Promise.all()` for independent queries:
```typescript
const [orders, total] = await Promise.all([
  prisma.order.findMany({ ... }),
  prisma.order.count({ ... }),
]);
```

### 5. Avoid N+1 Queries
- Use `include` or `select` to fetch related data in a single query
- Batch related queries when possible

### 6. Query Result Caching
- Cache frequently accessed, rarely changing data (e.g., partner profiles)
- Use Redis for caching with appropriate TTL
- Invalidate cache on updates

### 7. Limit Result Sets
- Always set reasonable limits on queries
- Use `take` to limit results
- Consider pagination for large datasets

### 8. Optimize Aggregations
- Use Prisma aggregations (`_count`, `_sum`, `_avg`) instead of fetching all records
- Use `groupBy` for grouped aggregations

### 9. Index Usage
- Ensure WHERE clauses use indexed fields
- Use compound indexes for multi-field queries
- Monitor slow queries and add indexes as needed

### 10. Connection Pooling
- Configure Prisma connection pool size appropriately
- Use connection pooling to reduce connection overhead

