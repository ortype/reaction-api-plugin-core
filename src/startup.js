import { createServer } from "http";
import Logger from "@reactioncommerce/logger";
import EventSource from "eventsource";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { getFontsFromGit } from "./utils/fileHelpers.js";
import OpenTypeAPI from "./api/OpenTypeAPI.js";
import syncFonts from "./utils/syncFonts.js";


/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default async function startup(context) {
  // init OpenTypeAPI in startup.js because the collections on context aren't ready
  // yet if initialized in the plugin register function
  // @type {OpenTypeAPI}

  // @TODO: Following 5 steps called in response to a webhook
  // @octokit/webhooks

  const webhooks = new Webhooks({
    secret: "p*8A**U&voq^ANutxl1J" // @TODO: use as .env
  });

  webhooks.on("push", async ({ id, name, payload = {} }) => {
    Logger.info(`handlePushEvent called: ${id} ${name}`);
    Logger.info(`${payload.head_commit.id} ${payload.head_commit.message}`);
    // What kind of things (if any) need to be checked in the payload?

    // STEP 1: Update file system
    getFontsFromGit(process.env.GIT_USER, process.env.GIT_TOKEN);
    context.OpenTypeAPI = await OpenTypeAPI.getInstance(context);

    // STEP 2: Update DB
    await syncFonts(context, true);

    // STEP 3: Update getFonts after sync
    const fonts = await context.OpenTypeAPI.getFonts(true);
    Logger.info(`Fonts: ${fonts}`);

    // STEP 4: Poem bulkUpdate poemEntryWidths
    // via `await context.mutations.setPoemEntryWidths({ perPage: 50 })`
    // @TODO: schedule this task (think about how it runs...)

    // STEP 5: We reload the entryMinMaxByVariant.json
    // this is currently fired from ortype-poem/startup.js and should be converted into
    // and util
  });

  // @TODO: which port??
  createServer(createNodeMiddleware(webhooks, { path: "/github/webhooks" })).listen(5000);
  // can now receive webhook events at /api/github/webhooks
  // https://api.ortype.eu/github/webhooks

  // @TODO: what's this URL become for production?
  const webhookProxyUrl = "https://smee.io/jj50aCFDSdwbErYZ";
  const source = new EventSource(webhookProxyUrl);
  Logger.info("webhooks setup: ", webhooks);
  source.onmessage = async (event) => {
    const webhookEvent = JSON.parse(event.data);
    // 11:26:38.752Z  INFO Reaction: webhook response: undefined
    // https://github.com/octokit/webhooks.js/#webhookson

    webhooks
      .verifyAndReceive({
        id: webhookEvent["x-request-id"],
        name: webhookEvent["x-github-event"],
        signature: webhookEvent["x-hub-signature"],
        payload: webhookEvent.body
      }).catch(console.error);
    // Logger.info(`webhook response: ${response}`);
    // Logger.error(`verifyAndReceive error: ${err}`);
  };


  // STEP 1: Update file system
  getFontsFromGit(process.env.GIT_USER, process.env.GIT_TOKEN);

  context.OpenTypeAPI = await OpenTypeAPI.getInstance(context);

  // STEP 2: Update DB
  await syncFonts(context, true);

  // STEP 3: Update getFonts after sync
  await context.OpenTypeAPI.getFonts(true);

  // STEP 4: Poem bulkUpdate poemEntryWidths
  // via `await context.mutations.setPoemEntryWidths({ perPage: 50 })`

  // STEP 5: Development Only, we reload the entryMinMaxByVariant.json
  // this will be fired from ortype-poem/startup.js

  console.log("OR TYPE CORE!");
}
