const { program } = require('commander');
const pkJson = require("../package.json")

program
  .option('--first')
  .option('-c, --config <0 or 1>', '是否打开浏览器 默认:0关闭;1打开;')
  .version(pkJson.version)
  .parse();


const options = program.opts();

module.exports = options


