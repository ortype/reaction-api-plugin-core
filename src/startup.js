import OpenTypeAPI from "./api/OpenTypeAPI.js";
import syncFonts from "./utils/syncFonts.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default async function startup(context) {
  console.log('OR TYPE CORE!!!! OK OK')
  // init OpenTypeAPI in startup.js because the collections on context aren't ready
  // yet if initialized in the plugin register function
  // @type {OpenTypeAPI}
  context.OpenTypeAPI = await OpenTypeAPI.getInstance(context);
  await syncFonts(context);
}
