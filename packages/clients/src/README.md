# @driveflow/clients

Typed HTTP client generated from OpenAPI + `openapi-fetch`.

## Generate types

```
pnpm gen
```

This writes `packages/clients/src/types.ts` from `packages/contracts/openapi.json`.

## Use in Web (Next.js)

```ts
import { makeClient } from '@driveflow/clients';

export const api = makeClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  getAuthToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
});
```

## Use in Mobile (Expo)

```ts
import { makeClient } from '@driveflow/clients';
import * as SecureStore from 'expo-secure-store';

export const api = makeClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  getAuthToken: async () => SecureStore.getItemAsync('token')
});
```
