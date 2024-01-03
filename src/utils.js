const readline = require("readline");
const path = require("path");
const {  readFileSync,appendFileSync, unlinkSync } = require("fs");

const {
  BRO_CONF,
  FILE_CONF,
  QUESTIONS
} = require("./configs")

/**
 * 数组整理 排序 拿到最新的分支名称
 * @param {*} origin 
 * @returns 
 */
const getTargetOrder = (origin) => {
  const target = origin.reduce((target, item) => {
    target.push({
      name: item["name"],
      time: +new Date(item["commit"]["committed_date"]),
    });
    return target;
  }, []);
  target.sort((a, b) => b.time - a.time);
  return target[0]["name"];
};
/**
 * ReadLine实例
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
/**
 * 捕获终端输入的内容
 * @param {*} q  终端显示 string 
 * @returns 采集终端输入；
 */
const askQuestions = (q) =>
  new Promise((resolve) => rl.question(q, (info) => resolve(info)));
/**
 * 读取文件
 * @param {*} p 路径 string
 * @param {*} c 配置
 * @returns 
 */
const readFileSyncFunc = (p, c) => {
  const conf = c || FILE_CONF
  try {
    const result =  readFileSync(path.join(__dirname, p), conf)
    return result
  } catch (e) {
    throw new Error(`readFileSyncFunc Error: ${e}`)
  }
};
/**
 * 写入文件
 * @param {*} p 路径 string
 * @param {*} content 待写入内容
 */
const writeFileSyncFunc = (p, content) => {
  try {
     appendFileSync(path.join(__dirname, p), content);
  } catch (e) {
    throw new Error(`writeFileSyncFunc Error: ${e}`)
  }
}
/**
 * 删除文件
 * @param {*} p 路径 string
 * @returns 
 */
const deleteFileSyncFunc = (p) => {
  try {
    unlinkSync(path.join(__dirname, p));
  } catch (e) {
    throw new Error(`readFileSyncFunc Error: ${e}`)
  }
};
/**
 * 判断一个数据是否为空对象|| 空数组 || false || null || undefined || 空字符串
 * @param {*} data 待判定数据
 * @returns 判断结果
 */
const isEmpty = (data) => {
  return data === null || data === undefined || data === false || (typeof data === 'object' && Object.keys(data).length === 0) || (Array.isArray(data) && data.length === 0) || (typeof data === 'string' && data.trim().length === 0)
}
/**
 * 
 * @param {*} qType 
 * @returns 
 */
const untilDataHasBeenObtained = async (qType) => { 
  let dataShell = null
  try {
    while (isEmpty(dataShell)) {
       dataShell = await askQuestions(QUESTIONS[qType] || QUESTIONS[0])
    }
    switch (qType) {
      case 0:
        break;
      case 1:
        writeFileSyncFunc(`../tmp/cache.txt`,dataShell )
        break;
      case 2:
        break;
      case 3:
        dataShell =  dataShell.split("/").map(v => v.trim())
        break;
    }
    return dataShell
  } catch (e) {
    throw new Error(`writeFileSyncFunc Error: ${e}`)
  }
}
/**
 * 异步函数，获取安全访问对象。
 *
 * @returns {Promise<SecureAccess>} 包含uiids、cookies等属性的安全访问对象。
 */
const getSecureAccess = async() => {
  let customs = readFileSyncFunc(`../tmp/custom.txt`),
      cookies = readFileSyncFunc(`../tmp/cache.txt`);
  // cookie必须提供
  if(isEmpty(cookies)) cookies = await untilDataHasBeenObtained(1)
  // 首次启动工具需要提供安全的url地址（详询开发者）
  if(isEmpty(customs))  {
    // 拖拽过来的文件路径；window系统未测试；
    const handlePath = await untilDataHasBeenObtained(2) 
    // 进程通过绝对路径直接读取文件内容；当前有由开发者提供相关材料，暂不对内容进行校验；
    customs = readFileSyncFunc(path.relative(`${process.cwd()}/src`, handlePath.replace(/'|"/g, "")), FILE_CONF);
    // 缓存
    writeFileSyncFunc(`../tmp/custom.txt`,customs)
  }
  const [PACK_URL,BRANCH_URL ,SSO_URL] = customs.split("\n")
  return {
    PACK_URL,
    BRANCH_URL ,
    SSO_URL,
  }
}
/**
 * 获取cookie
 * @returns cookie
 */
const getCookie = async() => {
  let cookies = readFileSyncFunc(`../tmp/cache.txt`);
  // cookie必须提供
  if(isEmpty(cookies)) cookies = await untilDataHasBeenObtained(1)
 return cookies
}

module.exports = {
  getTargetOrder,
  askQuestions,
  readFileSyncFunc,
  writeFileSyncFunc,
  deleteFileSyncFunc,
  untilDataHasBeenObtained,
  isEmpty,
  getSecureAccess,
  getCookie
};
