# Registration Issue Analysis

## Problem
Users with role `AGENT` were being created without corresponding `Agent` records, resulting in incomplete registrations.

## Root Cause
In `backend/src/services/auth.service.ts`, the `register` function:
- ✅ Creates `User` record for all roles
- ✅ Creates `Partner` record when `role === PARTNER`
- ❌ **Missing**: Does NOT create `Agent` record when `role === AGENT`

## Why This Happened
The `Agent` model requires a `vehicleType` field (non-optional), but:
1. The registration endpoint doesn't accept `vehicleType` in the request body
2. The registration service didn't create agent records at all
3. This left users with `role: AGENT` but no linked `Agent` record

## Solution
Updated `auth.service.ts` to create an `Agent` record during registration with:
- Default `vehicleType: 'BIKE'` (can be updated later via profile endpoint)
- Default `status: 'OFFLINE'`
- Default `isApproved: false` (requires admin approval)
- Default `isBlocked: false`

## Files Changed
- `backend/src/services/auth.service.ts` - Added agent record creation in `register` function

## Testing
After this fix:
1. New agent registrations will automatically create agent records
2. Existing incomplete registrations can be cleaned up using `cleanup-incomplete-users.ts` script


