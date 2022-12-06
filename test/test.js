const test = require("flug");
const { readFileSync } = require("fs");
const countSubstring = require("../count-substring.js");
const indexOfMatch = require("../index-of-match.js");
const indexOfMatchEnd = require("../index-of-match-end.js");
const findTagByName = require("../find-tag-by-name.js");
const findTagsByName = require("../find-tags-by-name.js");
const findTagByPath = require("../find-tag-by-path.js");
const findTagsByPath = require("../find-tags-by-path.js");
const getAttribute = require("../get-attribute.js");
const removeComments = require("../remove-comments.js");

const iso = readFileSync("test/data/iso.xml", "utf-8");
const mrf = readFileSync("test/data/m_3008501_ne_16_1_20171018.mrf", "utf-8");
const tiffAux = readFileSync("test/data/rgb_raster.tif.aux.xml", "utf-8");
// tmx example from https://en.wikipedia.org/wiki/Translation_Memory_eXchange
const tmx = readFileSync("test/data/tmx.xml", "utf-8");
// svg example from https://en.wikipedia.org/wiki/SVG
const svg = readFileSync("test/data/example.svg", "utf-8");

const nested = "<Thing><Thing attr=1></Thing><Thing attr=2></Thing></Thing>";

const commented = `<Thing>
<!--
  <Thing attr=1></Thing>
-->
<Thing attr=2></Thing>
</Thing>`;

const multiline = `<div
id="container"
>
  <div
    id="inside"
    data-foo="bar"
  </div>
</div>
`;

test("tmx", ({ eq }) => {
  eq(getAttribute(tmx, "version"), "1.4");
  const header = findTagByName(tmx, "header");
  eq(getAttribute(header, "srclang"), "en");
  eq(getAttribute(header, "o-tmf"), "ABCTransMem");
  const tu = findTagByName(tmx, "tu", { debug: false });
  eq(
    tu.inner.trim(),
    '<tuv xml:lang="en">\n        <seg>Hello world!</seg>\n      </tuv>\n      <tuv xml:lang="fr">\n        <seg>Bonjour tout le monde!</seg>\n      </tuv>'
  );
  const tuvs = findTagsByName(tmx, "tuv");
  eq(tuvs.length, 2);
});

test("svg", ({ eq }) => {
  const tag = findTagByName(svg, "svg");
  eq(getAttribute(tag, "height"), "391");
  eq(getAttribute(tag, "width"), "391");
  eq(getAttribute(tag, "viewBox"), "-70.5 -70.5 391 391");
  eq(getAttribute(tag, "xmlns:xlink"), "http://www.w3.org/1999/xlink");
  eq(getAttribute(findTagByPath(svg, ["g"]), "opacity"), "0.8");
  eq(getAttribute(findTagByName(svg, "rect"), "fill"), "#fff");
  const rect = findTagByPath(svg, ["g", "rect"]).outer;
  eq(getAttribute(rect, "x"), "25");
  eq(getAttribute(rect, "stroke-width"), "4");
});

test("support multi-line tags", ({ eq }) => {
  const container = findTagByName(multiline, "div");
  eq(container.outer, `<div\nid="container"\n>\n  <div\n    id="inside"\n    data-foo="bar"\n  </div>\n</div>`);
  eq(container.inner, `\n  <div\n    id="inside"\n    data-foo="bar"\n  </div>\n`);
  eq(getAttribute(container.outer, "id"), "container");
  eq(getAttribute(container.outer, "data-foo"), undefined);
  eq(getAttribute(container.inner.trim(), "data-foo", { debug: false }), "bar");
});

test("removing comments", ({ eq }) => {
  eq(removeComments(commented), "<Thing>\n\n<Thing attr=2></Thing>\n</Thing>");
  eq(removeComments("<A><!--<B/>--><!--<C/>--></A>"), "<A></A>");
});

test("count substring", ({ eq }) => {
  eq(countSubstring(nested, "<namespace:name"), 0);
  eq(countSubstring(nested, "<Test"), 0);
  eq(countSubstring(nested, "<Thing"), 3);
  eq(countSubstring(nested, "/Thing>"), 3);
});

test("should get gmd:code and avoid gmd:codeSpace", ({ eq }) => {
  const index = indexOfMatch(iso, `\<gmd:code[ \>]`, 0);
  eq(iso.slice(index).startsWith("<gmd:code"), true);

  const tag = findTagByName(iso, "gmd:code", { startIndex: index + 1 });
  eq(tag, undefined);
});

test("indexOfMatchEnd", ({ eq }) => {
  const xml = `<items><item><item></items>`;
  const index = indexOfMatchEnd(xml, "[ /]items>", 0);
  eq(index, xml.length - 1);
});

test("should find all the urls in iso.xml", ({ eq }) => {
  const urls = findTagsByName(iso, "gmd:URL");
  eq(urls[0].inner, "http://geomap.arpa.veneto.it/layers/geonode%3Aatlanteil");
  eq(urls.length, 29);
});

test("should get only tags with full string match on tag name", ({ eq }) => {
  const urls = findTagsByName(iso, "gmd:code");
  eq(urls.length, 1);
});

test("should get info from iso.xml file", ({ eq }) => {
  const tag = findTagByPath(iso, ["gmd:RS_Identifier", "gmd:code", "gco:CharacterString"]);
  const projection = parseInt(tag.inner);
  eq(projection, 4326);

  const longitude = Number(findTagByPath(iso, ["gmd:westBoundLongitude", "gco:Decimal"]).inner);
  eq(longitude, 10.2822923743907);
});

test("should get raster size from a .mrf file", ({ eq }) => {
  const rasterSize = findTagByPath(mrf, ["MRF_META", "Raster", "Size"], {
    debug: false
  });
  eq(rasterSize.outer, '<Size x="6638" y="7587" c="4" />');
  eq(rasterSize.inner, null);
});

test("should get all character strings", ({ eq }) => {
  const tags = findTagsByPath(iso, ["gmd:RS_Identifier", "gmd:code"]);
  eq(tags.length, 1);
  eq(tags[0].inner === "", false);
});

test("should get all metadata for bands from .tif.aux.xml", ({ eq }) => {
  const debug = false;
  const mdis = findTagsByPath(tiffAux, ["Metadata", "MDI"], { debug });
  eq(mdis.length, 15);
});

test("should get attributes from metadata", ({ eq }) => {
  const mdi = findTagByPath(tiffAux, ["Metadata", "MDI"], { debug: false });
  const key = getAttribute(mdi, "key", { debug: false });
  eq(key, "SourceBandIndex");
});

test("should get raster width from a .mrf file", ({ eq }) => {
  const rasterSize = '<Size x="6638" y="7587" c="4" />';
  eq(getAttribute(rasterSize, "x"), "6638");
  eq(getAttribute(rasterSize, "y"), "7587");
  eq(getAttribute(rasterSize, "c"), "4");
});

test("should get first tag", ({ eq }) => {
  const xml = `<fields> <field datatype="text" name="L101"/> <field datatype="text" name="L101_1"/> <field datatype="text" name="P102"/> <field datatype="text" name="P102_1"> <source></source> <param></param> </field> <field datatype="text" name="P103"></field> </fields>`;
  const tag = findTagByName(xml, "field", { debug: false });
  eq(tag.outer, `<field datatype="text" name="L101"/>`);

  const tag2 = findTagByName(xml, "field", { debug: false, nested: false });
  eq(tag2.outer, `<field datatype="text" name="L101"/>`);
});

test("should get all tags (self-closing and not)", ({ eq }) => {
  const xml = `<fields> <field datatype="text" name="L101"/> <field datatype="text" name="L101_1"/> <field datatype="text" name="P102"/> <field datatype="text" name="P102_1"> <source></source> <param></param> </field> <field datatype="text" name="P103"></field> </fields>`;
  const tags = findTagsByName(xml, "field", { debug: false });
  eq(tags.length, 5);
});

test("should get self-closing with immediate close and without interior space", ({ eq }) => {
  const xml = `<House><Kitchen/></House>`;
  const tag = findTagByName(xml, "Kitchen");
  eq(tag.outer, "<Kitchen/>");
  eq(tag.inner, null);
});

test("should handle nested tags", ({ eq }) => {
  const xml = `<Thing><Thing sub1>A</Thing><Thing sub2>B</Thing></Thing>`;

  eq(findTagByName(xml, "Thing").outer, xml);
  eq(findTagByName(xml, "Thing").outer, xml);

  eq(findTagsByName(xml, "Thing").length, 3);
  eq(findTagsByName(xml, "Thing")[0].outer, xml);
  eq(findTagsByName(xml, "Thing", { nested: true }).length, 3);
  eq(findTagsByName(xml, "Thing", { nested: true })[0].outer, xml);
  eq(findTagsByName(xml, "Thing", { nested: false }).length, 1);
  eq(findTagsByName(xml, "Thing", { nested: false })[0].outer, xml);

  eq(findTagsByPath(xml, ["Thing"]).length, 1);
  eq(findTagsByPath(xml, ["Thing"])[0].outer, xml);
  eq(findTagsByPath(xml, ["Thing", "Thing"]), [
    { inner: "A", outer: "<Thing sub1>A</Thing>", start: 7, end: 28 },
    { inner: "B", outer: "<Thing sub2>B</Thing>", start: 28, end: 49 }
  ]);
  eq(findTagByPath(xml, ["Thing"]).outer, xml);
});
