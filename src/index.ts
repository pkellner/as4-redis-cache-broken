import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import Keyv from "keyv";
import { KeyvAdapter } from "@apollo/utils.keyvadapter";
import responseCachePlugin from "@apollo/server-plugin-response-cache";
import { InMemoryLRUCache, KeyValueCache } from "@apollo/utils.keyvaluecache";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.
  
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book @cacheControl(maxAge: 240) {
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
    hello: String @cacheControl(maxAge: 240)
  }
`;

const books = [
  {
    title: "The Awakening",
    author: "Kate Chopin",
  },
  {
    title: "City of Glass",
    author: "Paul Auster",
  },
];

class LoggingCache implements KeyValueCache {
  constructor(private cache = new InMemoryLRUCache()) {}

  async get(key: string) {
    const result = await this.cache.get(key);
    console.log("get", result);
    return result;
  }

  async set(key: string, value: string) {
    const result = await this.cache.set(key, value);
    console.log("set", result);
    return result;
  }

  async delete(key: string) {
    const result = await this.cache.delete(key);
    console.log("delete", result);
    return result;
  }
}

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    hello() {
      return "hello world!";
    },
    books: (parent, args, contextValue, info) => {
      info.cacheControl.setCacheHint({ maxAge: 60, scope: "PRIVATE" });
      return books;
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const keyV = new Keyv(`redis://localhost:6379`);
const server = new ApolloServer({
  typeDefs,
  resolvers,
  //cache: new LoggingCache(),
  cache: new KeyvAdapter(keyV),
  plugins: [responseCachePlugin()],
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests

const { url } = await startStandaloneServer(server, {
  listen: { port: 4010 },
});

console.log(`🚀 Server listening at: ${url}`);

// https://github.com/mrdulin/apollo-graphql-tutorial/blob/master/src/stackoverflow/60977550/MyCache.ts
// another example of cache implementation, more simple
/*
import { KeyValueCache, KeyValueCacheSetOptions } from 'apollo-server-caching';

export default class MyCache implements KeyValueCache {
  private cachedInfo = {};

  public async set(key: string, value: string, options?: KeyValueCacheSetOptions): Promise<void> {
    this.cachedInfo[key] = value;
  }

  public async get(key: string): Promise<string | undefined> {
    if (this.cachedInfo[key]) {
      return this.cachedInfo[key];
    }
  }

  public async delete(key: string): Promise<boolean> {
    this.cachedInfo[key] = null;
    return this.cachedInfo[key] === null;
  }
}

 */
