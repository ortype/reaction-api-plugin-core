import fs from "fs";
import path from 'path';
import Logger from "@reactioncommerce/logger";
import opentype from "opentype.js";
import unzipper from 'unzipper';
import { download, getAWSDirectory, getDownloadsDirectory, getFontDirectory } from "./FileUtils.js";

const LOCAL_DIR = "public/custom/";
const AWS_URL = "https://assets.ortype.is/";
const REMOTE_URL = "http://assets.ortype.is/fonts/";

export default class FontAPI {
  /**
   * @param context
   * @param options
   */
  constructor(context, options = {}) {
    this.context = context;
    this.options = {
      loadSpecificFont: undefined,
      ...options
    };
    this.fonts = [];
    this.fontVariants = [];
  }

  /**
   * @param context
   * @param options
   * @returns {Promise<FontAPI>}
   */
  static async getInstance(context, options = {}) {
    const object = new FontAPI(context, options);
    return await object.init();
  }

  /**
   * @returns {Promise<FontAPI>}
   */
  async init() {
    const { Products } = this.context.collections;

    this.fontVariants = await Products.find({ attributeLabel: "Style" }).toArray();
    this.fonts = [{
      variantId: "basefontalltafregular",
      title: "Alltaf Regular",
      otf: "Alltaf-Regular.otf",
      instance: await opentype.load(`${LOCAL_DIR}Alltaf-Regular.otf`) // maybe check if file exists
    }];
    // download all font files forcefully
    await this.getFonts();
    return this;
  }

  /**
   * Retrieve a loaded font and load it if needed
   * @param fontArgument
   * @returns {Promise<{otf: (boolean|*), instance: *, variantId: *, title: *}|T>}
   */
  async getFont(fontArgument) {
    const font = this.fonts.find(font => font.variantId===fontArgument || font.title===fontArgument);
    if (font) {
      return font;
    }
    const variant = this.fontVariants.find(variant => variant._id===fontArgument || variant.title===fontArgument);
    if (variant) {
      const otf = variant.metafields[0].key==="otf" && variant.metafields[0].value;
      if (otf) {
        Logger.info("OpenType loading", otf);
        const newFont = {
          variantId: variant._id,
          title: variant.title,
          otf,
          instance: await opentype.load(`${LOCAL_DIR}${otf}`) // maybe check if file exists
        };
        this.fonts.push(newFont);
        return newFont;
      }
    }
    throw new Error('FontAPI: getFont - Font not found');
  }

  /**
   * @returns {Promise<[]|*[]>}
   */
  async getFonts() {
    const { loadSpecificFont } = this.options;
    if (loadSpecificFont) {
      await this.getFont(loadSpecificFont);
      return this.fonts;
    }

    /* eslint-disable no-await-in-loop */
    for (const variant of this.fontVariants) {
      await this.getFont(variant._id);
    }

    return this.fonts;
  }
}
