import opentype from "opentype.js";
import Helpers from "../utils/helpers.js";
import OrtypeFontFile from "./OrtypeFontFile.js";
import OrtypePublishedFont from "./OrtypePublishedFont.js";

// This is responsible for loading files as Font Class Objects to enhance their functionality
export default class OpenTypeAPI {
  /**
   * @param context
   * @param options
   */
  constructor(context, options = {}) {
    this.context = context;
    this.options = {
      ...options
    };
    this.fonts = [];
    this.publishedFonts = [];
  }

  /**
   * @param context
   * @param options
   * @returns {Promise<OpenTypeAPI>}
   */
  static async getInstance(context, options = {}) {
    const object = new OpenTypeAPI(context, options);
    return await object.init();
  }

  /**
   * @returns {Promise<OpenTypeAPI>}
   */
  async init() {
    await this.getFonts(true);
    await this.getPublishedFonts(true);
    return this;
  }

  /**
   * @param name
   * @returns OrtypeFontFile
   */
  getFont(name) {
    return this.fonts.find(font => font.name===name);
  }

  /**
   * @param reload
   * @returns {Promise<[]|*[]>}
   */
  async getFonts(reload = false) {
    if (!reload) {
      return this.fonts;
    }
    for (const fontDir of Helpers.getFontDirectories()) {
      for (const fontFile of Helpers.getFontFiles(fontDir)) {
        await this.loadFont(fontFile);
      }
    }
    return this.fonts;
  }

  /**
   * Internal used to load font from filesystem
   * @param fontFile
   * @returns {Promise<OpenTypeAPI>}
   */
  async loadFont(fontFile) {
    const fontName = Helpers.getPathInfo(fontFile).base;
    const font = this.fonts.find(font => font.name===fontName);
    if (font) {
      font.instance = await opentype.load(fontFile);
    } else {
      const font = await OrtypeFontFile.getInstance(fontFile, this.context);
      this.fonts.push(font);
    }
    return this;
  }

  /**
   * This method is fetching all products from Catalog that are published as files in the repo
   * @param reload
   * @returns {Promise<[OrtypePublishedFont]|*[OrtypePublishedFont]>}
   */
  async getPublishedFonts(reload = false) {
    if (!reload) {
      return this.publishedFonts;
    }
    const promises = [];
    for (const font of this.fonts) {
      const catalogProduct = await font.getCatalogProduct();
      // if getCatalogProduct can't find a product `null` is returned
      if (catalogProduct) {
        const publishedFont = OrtypePublishedFont.getInstance(catalogProduct, this.context);
        promises.push(publishedFont);
      }
    }
    this.publishedFonts = await Promise.all(promises);
    return this.publishedFonts;
  }

  getPublishedFontVariant(variantId) {
    for (const publishedFont of this.publishedFonts) {
      const found = publishedFont.getVariant(variantId);
      if (found) {
        return found;
      }
    }
    return {};
  }

  /**
   * @param word
   * @returns {Promise<{width: *, variantId: *, title: *}[]>}
   */
  async getPublishedFontWidths(word) {
    const publishedFonts = await this.getPublishedFonts();
    let widths = [];
    for (const publishedFont of publishedFonts){
      const familyWidths = publishedFont.getWidths(word)
      widths = [...widths, ...familyWidths];
    }
    return widths;
  }
}
