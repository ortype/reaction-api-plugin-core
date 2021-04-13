import syncFonts from "./utils/syncFonts.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default async function startup(context) {
  console.log('OR TYPE CORE!!!!')
  await syncFonts(context)
}
