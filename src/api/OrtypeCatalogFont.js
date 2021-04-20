import OrtypeAbstractFont from "./OrtypeAbstractFont.js";
import shit from "@wakamai-fondue/engine";
import util from "util";

export default class OrtypeCatalogFont extends OrtypeAbstractFont {

  async init() {
    await super.init();
    this.fontDue = await shit.fromPath(this.file);
    return this;
  }

  getGlyphByIndex(index) {
    return this.getGlyphs().glyphs[index];
  }

  getBestLayoutFeatures() {
    // Try to return the "best" layout features
    if (
      "DFLT" in this.fontDue.featureChars &&
      "dflt" in this.fontDue.featureChars["DFLT"]
    ) {
      return this.fontDue.featureChars["DFLT"]["dflt"];
    } else if (
      "latn" in this.fontDue.featureChars &&
      "dflt" in this.fontDue.featureChars["latn"]
    ) {
      return this.fontDue.featureChars["latn"]["dflt"];
    }
    // If all else fails, return first
    const first = Object.keys(this.fontDue.featureChars)[0];
    return Object.values(this.fontDue.featureChars[first])[0];
  }

  getFeatureList() {
    const features = this.fontDue.features;
    const featureChars = this.getBestLayoutFeatures();
    return features.map(feature => {
      return {...feature, ...featureChars[feature.tag]}
    });
  }

  async getFontDue() {
    return util.inspect(this.fontDue, { depth: 3, showHidden: true, getters: 'get' });
    return 1;
    return this.fontDue.featureChars.DFLT.dflt.aalt.lookups[1].alternateCount;
    return this.fontDue.featureChars;
    return this.fontDue.features;
    return this.fontDue._font;
  }

  optionalFeatures() {
    return this.fontDue.features.filter(f => f.state !== "fixed");
  }

  requiredFeatures() {
    return this.fontDue.features.filter(f => f.state === "fixed");
  }

  // OLD THINGS
  getFeatures() {
    const tempSet = new Set();
    return this.instance.tables.gsub.features.reduce((array, item) => {
      if (!tempSet.has(item.tag)) {
        tempSet.add(item.tag, item);
        array.push(item);
      }
      return array;
    }, []);
  }

  getFeatureGlyphs() {
    const features = [];
    for (const lookupIndex of this.getFeatures()['aalt'].lookupListIndexes) {
      return this.instance.tables.gsub.lookups[lookupIndex].subtables[0].coverage.glyphs;
    }
    return features;
  }

  getFeatureGlyphsSnaked() {
    return this.getFeatures().map(({ tag, feature }) => {
      return {
        tag,
        lookups: feature.lookupListIndexes.map(lookupIndex => {
          // parse sub tables of a feature AKA alternative feature displays
          return this.instance.tables.gsub.lookups[lookupIndex].subtables.map((subtable, i) => {
            const { substFormat } = subtable;
            switch (substFormat) {
              case 1:
                /**
                 substFormat: 1,
                 coverage: { format: 1, glyphs: [ 243 ] },
                 alternateSets: [ [ 252, 255, 256 ] ]
                 */
                return subtable.alternateSets ? subtable.alternateSets[0]:subtable.coverage.glyphs;
              case 2:
                /**
                 substFormat: 2,
                 coverage: {
                      format: 1,
                      glyphs: [
                          3,  65,  85,  90, 117,
                        154, 181, 201, 207, 244,
                        245, 246, 248, 251
                      ]
                    },
                 substitute: [
                 239, 240,  86,  91, 239,
                 159, 240, 202, 208, 257,
                 258, 259, 253, 254
                 ]
                 */
                return subtable.substitute;
              case 3:
                /**
                 substFormat: 3,
                 backtrackCoverage: [ { format: 2, ranges: [Array] } ],
                 inputCoverage: [ { format: 1, glyphs: [Array] } ],
                 lookaheadCoverage: [],
                 lookupRecords: [ { sequenceIndex: 0, lookupListIndex: 15 } ]
                 */
                return subtable.inputCoverage[0].glyphs;
              default:
                console.log('substFormat:', substFormat);
                console.log(subtable);
                return [239];
            }
            return subtable.coverage ? subtable.coverage.glyphs:subtable.inputCoverage.glyphs;
          });
        })
      };
    });
  }
}
