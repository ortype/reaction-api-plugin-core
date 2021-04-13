import getSlug from "@reactioncommerce/api-utils/getSlug.js";
import OrtypeAbstractFont from "./OrtypeAbstractFont.js";

export default class OrtypeFontFile extends OrtypeAbstractFont {

  getFeatures() {
    const features = [];
    for (const feature of this.instance.tables.gsub.features){
      features[feature.tag] = feature.feature;
    }
    return features;
  }

  getFeatureGlyphs() {
    const features = [];
    for (const lookupIndex of this.getFeatures()['aalt'].lookupListIndexes){
      return this.instance.tables.gsub.lookups[lookupIndex].subtables[0].coverage.glyphs;
    }
    return features;
  }

  getMetaData(variation) {
    const { usWinAscent, usWinDescent, sCapHeight } = this.instance.tables.os2;

    let meta = {
      ascent: usWinAscent,
      descent: usWinDescent,
      capHeight: sCapHeight,
      isDefault: false,
      uid: this.getUid(),
      parentUid: this.getUid(),
      familyFile: this.file,
      version: this.version
    };
    if (variation && this.isVariable) {
      meta = {
        ...meta,
        ...{
          isDefault: variation.name[this.lang]==="Alltaf Var Regular",
          uid: this.getUid(variation.name[this.lang]),
          // these files maybe wrong because we use font name for filename which may be different
          otf: this.getOtfFile(variation.name[this.lang]),
          woff: this.getWoffFile(variation.name[this.lang]),
          woff2: this.getWoff2File(variation.name[this.lang])
        }
      };
    } else if (!this.isVariable) {
      meta = {
        ...meta,
        ...{
          uid: variation ? this.getUid(this.getInfo().fontSubfamily[this.lang]) : this.getUid(),
          // these files maybe wrong because we use font name for filename which may be different
          otf: this.getOtfFile(this.getInfo().fontSubfamily[this.lang]),
          woff: this.getWoffFile(this.getInfo().fontSubfamily[this.lang]),
          woff2: this.getWoff2File(this.getInfo().fontSubfamily[this.lang])
        }
      };
    }

    if (this.isVariable) {
      meta.axesCount = this.getVariations().axes.length;
      this.getVariations().axes.forEach((axe, index) => {
        meta[`axes${index + 1}`] = axe.tag;
      });
    }
    return meta;
  }

  async shouldUpdate() {
    // if(!this.isVariable) return false;
    // if we find the both metafields uid and version that match
    // the version and uid are constructed from data read out of the font file
    // if either of them do not exist in the product metafields, shouldUpdate
    // will return false, and will return true if they do exist
    const product = await this.context.collections.Products.findOne({
      $and: [{
        metafields: { key: "uid", value: this.getUid() }
      }, {
        metafields: { key: "version", value: this.version }
      }]
    });
    if (!product) {
      return true;
    } else if (!this.isVariable) {
      return false;
    }
    for (const [index, variation] of this.getVariations().instances.entries()) {
      const variant = await this.context.collections.Products.findOne({
        $and: [{
          metafields: { key: "uid", value: this.getUid(variation.name[this.lang]) }
        }, {
          metafields: { key: "version", value: this.version }
        }]
      });
      if (!variant) {
        return true;
      }
    }
    return false;
  }

  async getReactionProducts(force = false) {
    const products = [];
    if (!await this.shouldUpdate() && !force) {
      return products;
    }
    const parentProduct = await this.getFontProductData({
      type: "font",
      title: this.familyName,
      handle: getSlug(this.familyName),
    });
    for (const [key, value] of Object.entries(this.getMetaData())) {
      parentProduct.metafields.push({ key, value: value.toString() });
    }
    products.push(parentProduct);

    if (this.isVariable) {
      for (const [index, variation] of this.getVariations().instances.entries()) {
        const variant = await this.getFontProductData({
          type: "variant",
          title: `${this.familyName} ${variation.name[this.lang]}`,
          optionTitle: variation.name[this.lang],
          index,
        });
        for (const [key, value] of Object.entries(this.getMetaData(variation))) {
          variant.metafields.push({ key, value: value.toString() });
        }
        for (const [key, value] of Object.entries(variation.coordinates)) {
          variant.metafields.push({ key, value: value.toString() });
        }
        products.push(variant);
      }
    } else {
      const variant = await this.getFontProductData({
        type: "variant",
        title: this.getInfo().fullName[this.lang],
        optionTitle: this.getInfo().fontSubfamily[this.lang],
        // uid: this.getUid('-child')
      });
      for (const [key, value] of Object.entries(this.getMetaData(variant))) {
        variant.metafields.push({ key, value: value.toString() });
      }
      products.push(variant);
    }
    return products;
  }

  async getFontProductData(product) {
    const defaults = {
      shopId: this.shop._id,
      ancestors: [],
      isDeleted: false,
      isVisible: true,
      updatedAt: new Date(),
      metafields: [],
    };
    let productData = {};
    switch (product.type) {
      case "font":
        productData = {
          ...defaults,
          ...{
            shouldAppearInSitemap: true,
            supportedFulfillmentTypes: ["digital"],
            metaDescription: "FML", // so I can remove this easily
            basePrice: 60,
            metafields: [
              {
                key: "currentVariantId",
                value: ""
              },
              {
                key: "defaultVariantId",
                value: ""
              },
              {
                key: "currentEntry",
                value: ""
              }
            ],
          }
        };
        break;
      case "variant":
        productData = {
          ...defaults,
          ...{
            attributeLabel: "Style", // set as a default in schema
            price: 0,
            isTaxable: false,
          }
        };
        break;
    }
    return { ...productData, ...product };
  }
}
