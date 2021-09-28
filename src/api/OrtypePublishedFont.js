import OrtypeAbstractFont from "./OrtypeAbstractFont.js";
import shit from "@wakamai-fondue/engine";
import Helpers from "../utils/helpers.js";

export default class OrtypePublishedFont extends OrtypeAbstractFont {
  constructor(catalogProduct, context) {
    const file = Helpers.getMetaValue(catalogProduct.product, 'familyFile');
    super(file, context);
    this.catalogProduct = catalogProduct;
    this.variants = [];
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
      if (variantFile) {
        variant.instance = await this.loadOpenTypeFile(variantFile);
        this.variants.push(variant);
      }
    }
    console.log(this.variants.map(i => i.instance.tables.name.fontFamily[this.lang]))
  }
}
