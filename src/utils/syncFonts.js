import Helpers from "./helpers.js";
import Random from "@reactioncommerce/random";
import Logger from "@reactioncommerce/logger";

export default syncFonts

async function syncFonts(context, all = false){
  const modifiedProducts = [];
  for (const font of await context.OpenTypeAPI.getFonts()) {
    modifiedProducts.push(...(await font.getReactionProducts(all)));
  }
  const parentProducts = modifiedProducts.filter(item => item.type==='font');
  const variantProducts = modifiedProducts.filter(item => item.type==='variant');
  if (parentProducts.length) {
    await bulk(context, parentProducts);
  }
  if (variantProducts.length) {
    const variantsWithAncestors = [];
    for (const variant of variantProducts) {
      const parent = await context.collections.Products.findOne({
        metafields: { key: 'uid', value: Helpers.getMetaValue(variant, 'parentUid') }
      });
      // maybe need to check if parent exist for total security, maybe overkill
      variant.ancestors = [parent._id];
      variantsWithAncestors.push(variant);
    }
    await bulk(context, variantsWithAncestors);

    if (parentProducts.length || variantProducts.length) {
      const fonts = await context.collections.Products.find({
        type: "font",
        isVisible: true,
        isDeleted: { $ne: true }
      }).toArray();
      const fontIds = fonts.map(font => font._id);
      Logger.info("Publish fontIds: ", fontIds);
      // publish changes made to product variants to the catalog
      await context.mutations.publishProducts(context, fontIds);
    }
  }
}

async function bulk(context, products) {

  const { Products } = context.collections;
  const { ProductFont, ProductVariant } = context.simpleSchemas;
  const bulkOp = Products.initializeOrderedBulkOp();

  for (const product of products) {
    const modifier = {
      $setOnInsert: { _id: Random.id(), createdAt: new Date() },
      $set: product
    };
    const isParent = product.type==='font';

    if (isParent) {
      ProductFont.validate(modifier, { modifier: true });
    } else {
      ProductVariant.validate(modifier, { modifier: true });
    }

    bulkOp.find({
      metafields: { key: "uid", value: Helpers.getMetaValue(product, 'uid') }
    }).upsert().updateOne(modifier);
  }

  // reaction/src/core-services/product/utils/executeBulkOperation.js
  // All of the ops will now be executed
  const logCtx = { name: "bulkCreateProducts", file: " OpenTypeAPI" };
  let response;
  try {
    Logger.trace({ ...logCtx, bulkOp }, "Running bulk operation");
    response = await bulkOp.execute();
  } catch (error) {
    Logger.error({ ...logCtx, error }, "One or more of the bulk update failed");
    response = error; // error object has details about failed & successful operations
  }
  const { nMatched, nUpserted, nModified, result: { writeErrors } } = response;
  const cleanedErrors = writeErrors.map((error) => ({
    documentId: error.op._id,
    errorMsg: error.errmsg
  }));

  return {
    foundCount: nMatched,
    updatedCount: nModified,
    upsertedCount: nUpserted,
    writeErrors: cleanedErrors
  };
}
