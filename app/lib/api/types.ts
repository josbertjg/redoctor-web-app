export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Who calls the API with a session: the Firebase uid keys the cache per person. */
export type TokenHolder = {
  id: string;
  getToken: () => Promise<string>;
};
