import OrtypeAbstractFont from "./OrtypeAbstractFont.js";
import OrtypeFontFile from "./OrtypeFontFile.js";
import Helpers from "../utils/helpers.js";
import Logger from "@reactioncommerce/logger";

export default class OrtypePublishedFont extends OrtypeAbstractFont {
  constructor(catalogProduct, context) {
    const file = Helpers.getMetaValue(catalogProduct.product, 'familyFile');
    super(file, context);
    this.catalogProduct = catalogProduct;
    this.variantInstances = [];
  }

  static async getInstance(catalogProduct, context) {
    const object = new this(catalogProduct, context);
    return await object.init();
  }

  async init() {
    await super.init();
    await this.loadVariant();
    return this;
  }

  async loadVariant() {
    for(const variant of this.catalogProduct.product.variants){
      const variantFile = this.getOtfFile(variant.optionTitle);
      if (variantFile && Helpers.exists(variantFile)) {
        // maybe we can create OrtypePublishedFontVariant to enhance this with functions
        // that all our classes use of AbstractFont
        variant.ortypeFontFile = await OrtypeFontFile.getInstance(variantFile, this.context);
        // variant.instance = await this.loadOpenTypeFile(variantFile);
        this.variantInstances.push(variant);
      } else {
        Logger.error(`"${variant.title}" file not found! Expected: ${variantFile}`)
      }
    }
  }

  getVariant(variantId) {
    return this.variantInstances.find(({ _id }) => _id === variantId);
  }

  getWidths(text, fontSize = 1000) {
    return this.variantInstances.map(variant => {
      return {
        "title": variant.title,
        "variantId": variant._id,
        // we all like double instance key :) that's what happens to variants that do not eat their food
        "width": variant.ortypeFontFile.instance.getAdvanceWidth(text, fontSize)
      };
    })
  }
}
