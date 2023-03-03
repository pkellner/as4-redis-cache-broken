import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import Keyv from "keyv";
import { KeyvAdapter } from "@apollo/utils.keyvadapter";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
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

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    // @ts-ignore
    books: (parent, args, contextValue, info) => {
      console.log("books");
      info.cacheControl.setCacheHint({ maxAge: 60, scope: "PRIVATE" });
      return books;
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const keyV = new Keyv(`redis://localhost:6379`);
const { url } = await startStandaloneServer(server, {
  // @ts-ignore
  cache: new KeyvAdapter(keyV),
  cacheControl: {
    defaultMaxAge: 5,
  },
  listen: { port: 4000 },
});

console.log(`🚀 Server listening at: ${url}`);
