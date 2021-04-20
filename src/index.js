import pkg from "../package.json";
import queries from "./queries/index.js";
import resolvers from "./resolvers/index.js";
import schemas from "./schemas/index.js";
import startup from "./startup.js";

export default async function register(app) {
  await app.registerPlugin({
    label: "Or Type Core",
    name: "ortype-core",
    version: pkg.version,
    functionsByType: {
      startup: [startup]
    },
    graphQL: {
      resolvers,
      schemas
    },
    queries
  });
}
