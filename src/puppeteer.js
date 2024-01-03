const puppeteer = require("puppeteer");
const {
  BRO_CONF,
} = require("./configs")
const {
  getTargetOrder,
  deleteFileSyncFunc,
  untilDataHasBeenObtained,
  isEmpty,
  getSecureAccess,
  getCookie
} = require("./utils")

class Browser {
  constructor(props) {
    this.browser = null;
    this.page = null;
    this.timer = null;
    this.urls = null
    this.logs = []
    this.waitForResponseFlag = false
    this.initPage.call(this);
  }

  /**
   * 校验cookie
   */
  verifyCookie = async() => {
    const {
      PACK_URL,
      SSO_URL,
    } = this.urls
    await this.page.setCookie({
      name: "SSO_USER_TOKEN",
      value: this.cookie,
      url: PACK_URL,
    });
    if (this.page.url().includes(SSO_URL)) {
      deleteFileSyncFunc('../tmp/cache.txt')
      console.log("\x1B[31m 无效的cookie,请重新设置cookie \x1B[0m");
      process.exit();
    } else {
      this.excute()
    }
  }
  /**
   * 初始化浏览器实例
   */
  initPage = async () => {
    console.log("\x1B[32m Start simulation packaging... \x1B[0m");
    // 1、获取权限及安全地址
    this.urls = await getSecureAccess()
    // 2、创建浏览器实例
    this.browser = await puppeteer.launch(BRO_CONF);
    // 3、创建打包页实例
    this.page = await this.browser.newPage();
    // 4、确认cookie
    this.cookie = await getCookie();
    // 5、获取待打包的uiid，支持单次打包多个uiid；
    this.uiids =  await untilDataHasBeenObtained(3)
    // 6、校验cookie
    this.verifyCookie()
  }
  /**
   * 监听分支请求的事件
   * @param {*} response 分支请求的事件对象
   */
  handleResponse = async (response,resolve) => { 
    try {
      const { page, urls } = this
      const { BRANCH_URL} = urls
      if (response.url().includes(BRANCH_URL)) {
        const { result } = await response.json();
        const target = await getTargetOrder(result);
        await page.click("#branch.ant-select-selection-search-input");
        await page.$$eval(
          ".ant-select-item-option-content",
          (eles, target) => {
            const branch = eles.filter((ele) => ele.innerText === target);
            branch[0].click();
          },
          target
        );
        await page.$$eval(".rr-block", (eles) => {
          eles[0].style.display = "none";
        });
        await page.waitForTimeout(3 * 1000);
        // -------确认上述操作 开始真正的打包-------
        // await page.click(".ant-drawer-footer .ant-btn.ant-btn-primary");
        // clearTimeout(this.timer);
        resolve("ok");
      }
    } catch (e) {
      resolve("error");
    }
  }
  /**
   * 模拟打包
   * @param {*} id 要执行打包的 uiid
   * @returns {Promose}
   */
  simulationPackage = async (id) => {
    const { page,urls } = this
    const { PACK_URL} = urls
    return new Promise(async (resolve) => {
      try {
        // 执行每个uiid的打包操作限时1分钟
        this.timer = setTimeout(() => {
          resolve("error");
        }, 60 * 1000);
        await page.goto(`${PACK_URL}?uiId=${id}&id=${id}&tab=ui-package`);
        await page.waitForTimeout(3 * 1000);
        await page.click(".ant-modal-footer > .ant-btn:nth-child(2)");
        await page.waitForTimeout(3 * 1000);
        await page.click(".ant-space-item > .ant-btn.ant-btn-primary");
        await page.waitForResponse((response) => this.handleResponse(response,resolve));
      } catch (e) {
        resolve("error");
      }
    })
  }
  /**
   * 输出打包日志
   * @param {*} logs uiid数组
   */
  handleLog = () => {
    const { logs } =this
    if (!isEmpty(logs)) {
      console.log(`\x1B[31m以下UIID未打包成功,请重试: ${logs.join('、')}\x1B[0m`);
    } else {
      console.log("\x1B[32m Amazing!!! 全部uiid已经打包好了哈\x1B[0m");
    }
    logs.length = 0
    process.exit()
  }
  /**
   * 启动逐个打包循环
   */
  excute = async () => {
    const { uiids } = this
    while (0 in uiids) {
      let _uiid = uiids.splice(0, 1)[0];
      const result = await this.simulationPackage(_uiid)
          console.log('-----',result);
      if (result === "error") this.logs.push(_uiid)
      else  console.log(`\x1B[32m ----${_uiid}----:已触发打包动作\x1B[0m`);
    }
    this.handleLog()
    
  }
}

module.exports = Browser