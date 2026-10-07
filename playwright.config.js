import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45000,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:3013',trace:'retain-on-failure',screenshot:'only-on-failure',bypassCSP:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--disable-dev-shm-usage','--disable-gpu']}},
  webServer:{command:'node server.js',url:'http://127.0.0.1:3013/healthz',timeout:90000,reuseExistingServer:false,env:{NODE_ENV:'development',PORT:'3013',PGLITE_DATA_DIR:':memory:',STANDALONE_SCHEDULER_ENABLED:'false',PUBLIC_APP_URL:'http://127.0.0.1:3013',STANDALONE_DEV_USER_ID:'e2e-audit'}},
});
