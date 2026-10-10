// static/js/app.js

import { loadAllData } from './data_loader.js';

import { initHeader } from '../modules/header/header.js';
import { initSidebar } from '../modules/sidebar/sidebar.js';
import { initDashboard } from '../modules/dash_board/dash_board.js';
import { initMonthlyReport } from '../modules/monthly_report/monthly_report.js';
import { initStatistics } from '../modules/statistics/statistics.js';
import { initTools } from '../modules/tools/tools.js';
import { initTransactionHistory } from '../modules/transaction_history/transaction_history.js';
import { initCustomizedView } from '../modules/customized_view/customized_view.js';

async function bootstrap() {
  console.log('🚀 App starting');

  // 1️⃣ 加载全量数据
  await loadAllData();

  // console.log(' Data ready', window.AppData);

  // 2️⃣ 初始化模块
  initHeader();
  initSidebar();
  initDashboard();
  initMonthlyReport();
  initStatistics();
  initTools();
  initTransactionHistory();
  initCustomizedView();

  console.log('✅ App ready');
}

bootstrap();
