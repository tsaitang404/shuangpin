const { pinyin, PINYIN_STYLE } = require("@napi-rs/pinyin");
const fs = require("fs");

function convert() {
  const tasks = {
    popular: [
      fs.readFileSync("./hanzi/3500.txt", "utf8"),
      fs.readFileSync("./hanzi/7000.txt", "utf8"),
    ]
      .join("\n")
      .split(/\s/)
      .filter((v) => v.length > 0)
      .filter((v, i, arr) => arr.indexOf(v) === i), // 去重
  };

  const result = {};

  for (const name in tasks) {
    const hanziList = tasks[name];
    console.log(`Converting [${name}]...`);
    const pinyinList = hanziList.map((x) =>
      pinyin(x, {
        style: PINYIN_STYLE.Plain,
        heteronym: true,
      })[0].map((v) => v.replace("ü", "v"))
    );
    result[name] = {
      hanzi: hanziList,
      pinyin: pinyinList,
    };
  }

  fs.writeFileSync("../src/utils/hanzi.json", JSON.stringify(result));
}

convert();
