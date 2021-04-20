import Query from "./Query/index.js";
import fs from "fs";
import Helpers from "../utils/helpers.js";
import OrtypeCatalogFont from "../api/OrtypeCatalogFont.js";

export default {
  Query,
  CatalogProduct: {
    fontFeatures: async (node, x, context) => {
      node.fontFeatures = [];
      const file = Helpers.getMetaValue(node, 'familyFile');
      if (file) {
        try {
          if (fs.existsSync(file)) {
            const openTypeFont = await OrtypeCatalogFont.getInstance(file, context);
            node.fontFeatures = openTypeFont.getFeatureList();
          }
        } catch (err) {
          console.error(err);
        }
      }
      return node.fontFeatures;
    }
  }
}
