
const options = require('./program')
/**
 * puppeteer 浏览器配置
 */
const BRO_CONF = {
  headless: options.config === '0', // 默认:0不打开;1打开;
  slowMo: 10,
  defaultViewport: null,
}
/**
 * 文件读取配置
 */
const FILE_CONF = {
  encoding: "utf8",
  flag: "as+",
}
const QUESTIONS = [
  "未能正确匹配问题列表",
  "请提供cookie:",
  "请拖拽custom配置文件到此:",
  "请提供需要打包的uiid(多UIID请以/分隔):",
]


module.exports = {
  BRO_CONF,
  FILE_CONF,
  QUESTIONS
}


