const puppeteer = require("puppeteer");
const readline = require("readline");
const path = require("path");
const { appendFileSync, readFileSync, unlinkSync } = require("fs");

const { BROWSER_CONFIG } = require("../config");
const { getTargetOrder } = require("../utils");

let timer = null,
  cookies = null, // 内部SSO系统 cookies
  UIIDStringEntered = null, //需要打包的uiid str
  UIIDS = null, // uiid数组
  current = null, // 当前打包进程中的uiid
  targetUrl = "",
  branchUrl = "",
  SSO_URL = "",
  CONFIRM_URL = "",
  customs = null; // 内部域名

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 创建浏览器实例
const createBoundle = (cookie, uiid) => {
  return new Promise(async (resolve) => {
    try {
      const browser = await puppeteer.launch(BROWSER_CONFIG);
      const page = await browser.newPage();
      // 收集操作流程异常不抛错的问题～
      timer = setTimeout(() => {
        resolve("error");
      }, 60 * 1000);
      await page.setCookie({
        name: "SSO_USER_TOKEN",
        value: cookie,
        url: targetUrl,
      });
      await page.goto(targetUrl);
      if (page.url().includes(SSO_URL)) {
        console.log("\x1B[31m 无效的cookie，请重新设置cookie \x1B[0m");
        unlinkSync(path.join(__dirname, `../etc/cache.txt`));
        unlinkSync(path.join(__dirname, `../etc/log.txt`));
        process.exit();
      }
      await page.click(".ant-modal-footer > button:nth-child(2)");
      await page.type("input#uiId.ant-input", uiid);
      await page.click(
        ".ant-space.ant-space-horizontal.ant-space-align-center > .ant-space-item > .ant-btn.ant-btn-primary"
      );
      await page.waitForTimeout(3 * 1000);
      await page.click(".ant-btn.ant-btn-link.ant-btn-sm");
      await page.waitForTimeout(10 * 1000);
      await page.click("#rc-tabs-0-tab-ui-package");
      await page.waitForTimeout(3 * 1000);
      await page.click(".ant-space-item > .ant-btn.ant-btn-primary");

      // == branchs
      await page.waitForResponse(async (response) => {
        if (response.url().includes(branchUrl)) {
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
          await page.waitForTimeout(5 * 1000);
          // -------确认上述操作 开始真正的打包-------
          await page.click(".ant-drawer-footer .ant-btn.ant-btn-primary");

          await page.waitForTimeout(10 * 1000);
          clearTimeout(timer);
          await browser.close();
          resolve("ok");
        }
      });
    } catch (e) {
      resolve("error");
    }
  });
};

// 读取进程
const askQuestions = (q) =>
  new Promise((resolve) => rl.question(q, (info) => resolve(info)));

// 创建打包进程
exports.startPipeLine = async () => {
  // ================= 从进程交互中获取目标数据 S =================
  customs = readFileSync(path.join(__dirname, `../etc/custom.txt`), {
    encoding: "utf8",
    flag: "as+",
  });

  cookies = readFileSync(path.join(__dirname, `../etc/cache.txt`), {
    encoding: "utf8",
    flag: "as+",
  });

  // 解决首次启动工具 无配置文件问题
  if (!customs) {
    const handlePath = await askQuestions("请拖拽custom配置文件到此:");
    customs = readFileSync(
      path.relative(`${process.cwd()}/src`, handlePath.replace(/'|"/g, "")),
      {
        encoding: "utf8",
        flag: "as+",
      }
    );
    appendFileSync(path.join(__dirname, `../etc/custom.txt`), customs);
  }

  customs = customs.split("\n");
  targetUrl = customs[0];
  branchUrl = customs[1];
  SSO_URL = customs[2];
  CONFIRM_URL = customs[3];

  while (!cookies) {
    cookies = await askQuestions("请提供cookie:");
    appendFileSync(path.join(__dirname, `../etc/cache.txt`), cookies);
  }
  while (!UIIDStringEntered)
    UIIDStringEntered = await askQuestions(
      "请提供需要打包的uiid(多UIID请以/分隔):"
    );
  rl.close();
  UIIDS = UIIDStringEntered.split("/");
  // ================= 从进程交互中获取目标数据 E =================

  // ================= 创建打包进程 S =================
  while (0 in UIIDS) {
    current = UIIDS.splice(0, 1)[0].trim();
    console.log("\x1B[32m Start simulation packaging... \x1B[0m");
    const result = await createBoundle(cookies, current);
    if (result === "error")
      appendFileSync(path.join(__dirname, `../etc/log.txt`), `${current},`);
  }
  // ================= 创建打包进程 E =================

  // ================= 捕获日志并输出 S =================
  let logs = readFileSync(path.join(__dirname, `../etc/log.txt`), {
    encoding: "utf8",
    flag: "as+",
  });
  if (!!logs) {
    logs = console.log(`\x1B[31m以下UIID未打包成功，请重试: ${logs}\x1B[0m`);
  } else {
    console.log("\x1B[32m Amazing...\x1B[0m");
  }
  unlinkSync(path.join(__dirname, `../etc/log.txt`));
  process.exit();
};
