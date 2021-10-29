import opentype from "opentype.js";
import Helpers from "../utils/helpers.js";

export default class OrtypeAbstractFont {
  /**
   * @param {String} file
   * @param {Object} context Startup context
   */
  constructor(file, context) {
    this.lang = 'en';
    this.file = file;
    this.context = context;
    this.name = Helpers.getPathInfo(file).name;
    this.instance = undefined;
  }

  /**
   * Abstract instantiate any class inheriting this one
   * @param file
   * @param context
   * @returns {Promise<this>}
   */
  static async getInstance(file, context) {
    const object = new this(file, context);
    return await object.init();
  }

  /**
   * Initialize all variables needed to identify a font file as an object/class
   * @returns {Promise<this>}
   */
  async init() {
    const { Shops } = this.context.collections;
    this.shop = await Shops.findOne({ shopType: "primary" });
    this.instance = await opentype.load(this.file);
    this.familyName = this.getInfo().fontFamily[this.lang];
    this.version = this.getInfo().version[this.lang].replace("Version ", "");
    const subVersions = this.version.split(".");
    this.majorVersion = subVersions[0];
    subVersions.shift();
    this.minorVersion = subVersions.join(".");
    this.isVariable = this.getVariations();
    return this;
  }

  /**
   * @param file
   * @returns {Promise<*>}
   */
  async loadOpenTypeFile(file){
    return await opentype.load(file);
  }

  /**
   * Helper function returning fvar table
   * @returns {*}
   */
  getVariations() {
    return this.instance.tables.fvar;
  }

  /**
   * Helper function returning name table
   * @returns {*}
   */
  getInfo() {
    return this.instance.tables.name;
  }

  /**
   * Helper function returning font glyphs
   * @returns {*}
   */
  getGlyphs() {
    return this.instance.glyphs;
  }

  /**
   * Helper function used to get a font's Unique Identifier
   * @returns {*}
   */
  getUid(uidAppend = undefined) {
    return [
      this.familyName,
      this.majorVersion
    ].join(" v") + (uidAppend ? `-${uidAppend}`:"");
  }

  /**
   * Query to get Catalog Font Product based on uid and version loaded from the file
   * it returns parent products only ( i think ) this needs to be tested if need to return children we may need
   * to pass an argument to getUid function
   * @returns {*}
   */
  getCatalogProduct() {
    return this.context.collections.Catalog.findOne({
      $and: [{
        "product.metafields": { key: "uid", value: this.getUid() }
      }, {
        "product.metafields": { key: "version", value: this.version } // maybe we dont need version...whaat happens in updates
      }]
    });
  }

  /**
   * Query to get Font Product based on uid
   * @returns {*}
   */
  getProduct(uidAppend = undefined) {
    return this.context.collections.Products.findOne({
      metafields: {
        key: "uid",
        value: this.getUid(uidAppend)
      }
    });
  }

  getOtfFile(variationName) {
    return Helpers.getFontDirectory(`${this.familyName.replace(/ /g, "")}/otf/${this.familyName.replace(/ /g, "")}-${variationName.replace(/ /g, "")}.otf`);
  }

  getWoffFile(variationName) {
    return Helpers.getFontDirectory(`${this.familyName.replace(/ /g, "")}/woff/${this.familyName.replace(/ /g, "")}-${variationName.replace(/ /g, "")}.woff`);
  }

  getWoff2File(variationName) {
    return Helpers.getFontDirectory(`${this.familyName.replace(/ /g, "")}/woff2/${this.familyName.replace(/ /g, "")}-${variationName.replace(/ /g, "")}.woff2`);
  }

  getSpaceWidth(fontSize) {
    // console.log("this.instance: ", this.instance)
    const width = this.instance.getAdvanceWidth(' ', 1000)
    if (width) {
      return width * fontSize / 1000;
    }
    return 0;
  }
}
