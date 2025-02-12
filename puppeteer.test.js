const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const express = require('express');
const stoppable = require('stoppable');
const puppeteer = require('puppeteer');

let browser;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
}, 30000);

afterAll(async () => {
  if (browser) {
    await browser.close();
  }
});

async function setApp(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`${directory} does not exist -run \`yarn example\``);
  }

  const app = express();

  app.use(express.static(directory));

  return new Promise(resolve => {
    const server = app.listen(0, () => {
      stoppable(server, 0);

      const stop = promisify(server.stop);

      resolve({ port: server.address().port, stop });
    });
  });
}

test('load dll correctly', async () => {
  const consoleFn = jest.fn();
  const errorFn = jest.fn();
  const server = await setApp(path.resolve(__dirname, './example/dll/dist'));

  const page = await browser.newPage();

  page.on('console', consoleObj => consoleFn(consoleObj.text()));
  page.on('error', errorFn);
  page.on('pageerror', errorFn);

  await page.goto(`http://localhost:${server.port}`);

  try {
    expect(errorFn).not.toHaveBeenCalled();
    expect(consoleFn).toHaveBeenCalledTimes(1);
    expect(consoleFn).toHaveBeenCalledWith('hello some classes');
  } finally {
    await Promise.all([page.close(), server.stop()]);
  }
}, 10000);
