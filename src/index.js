import queries from "./queries/index.js";
import resolvers from "./resolvers/index.js";
import schemas from "./schemas/index.js";
import startup from "./startup.js";

export default async function register(app) {
  await app.registerPlugin({
    label: "OrType Core",
    name: "ortype-core",
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
