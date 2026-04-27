
const contractAddress = "0x8d3D1399C5A8e7DE513F99f622F2eb46376831c7";

const contractABI = [
    "function donate() public payable",
    "function investInTarget(uint256 _targetId, uint256 _amount) public",
    "function withdrawInvestment(uint256 _targetId) public",
    "function getTargetsCount() public view returns (uint256)",
    "function targets(uint256) public view returns (string name, uint256 investedAmount)",
    "function userInvestments(uint256, address) public view returns (uint256)",
    "function balanceOf(address) public view returns (uint256)",
    "function totalDonated(address) public view returns (uint256)",
    "event DonationReceived(address indexed donor, uint256 ethAmount, uint256 pointsMinted)",
    "event InvestmentMade(address indexed investor, uint256 targetId, uint256 amount)",
    "event InvestmentWithdrawn(address indexed investor, uint256 targetId, uint256 amount)"
];

let provider, signer, contract, userAddress;

window.switchPage = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // Обновляем текущий пункт меню
    const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick').includes(id));
    if (activeLink) activeLink.classList.add('active');
};

function addLog(action, user, hash) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="font-weight:700; color: #c4b5fd;">${action}</td>
        <td style="color:#9ca3af;">${user.substring(0,8)}...</td>
        <td><a href="https://sepolia.etherscan.io/tx/${hash}" target="_blank" class="hash-link">${hash.substring(0,14)}...</a></td>
        <td><span style="color:#10b981; font-size:12px;"><i class="fa-solid fa-circle-check"></i> Success</span></td>
    `;
    tbody.prepend(row);
}

async function updateData() {
    if (!contract || !userAddress) return;
    try {
        const points = await contract.balanceOf(userAddress);
        const pointsFormatted = ethers.utils.formatUnits(points, 18);
        document.getElementById('userPoints').innerText = parseFloat(pointsFormatted).toFixed(0);
        document.getElementById('freePoints').innerText = parseFloat(pointsFormatted).toFixed(0);

        const eth = await contract.totalDonated(userAddress);
        document.getElementById('totalEth').innerText = ethers.utils.formatEther(eth);
        document.getElementById('userAddress').innerText = userAddress;

        loadTargets();
    } catch (e) { console.error(e); }
}

async function loadTargets() {
    const list = document.getElementById('targetsList');
    if (!list) return;
    try {
        const count = await contract.getTargetsCount();
        list.innerHTML = "";
        for (let i = 0; i < count; i++) {
            const t = await contract.targets(i);
            const userInv = await contract.userInvestments(i, userAddress);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h4 style="margin-top:0;">${t.name}</h4>
                <div style="font-size:12px; color:#9ca3af;">Фонд: ${parseFloat(ethers.utils.formatUnits(t.investedAmount, 18)).toFixed(0)} DP</div>
                <div style="margin: 15px 0; font-weight:800; color:var(--accent);">Вы вложили: ${parseFloat(ethers.utils.formatUnits(userInv, 18)).toFixed(0)} DP</div>
                <input type="number" id="invAmount_${i}" placeholder="Сумма DP" style="font-size:14px; padding:10px;">
                <button class="btn btn-primary" style="padding:10px; font-size:13px;" onclick="invest(${i})">Вложить очки</button>
                ${userInv > 0 ? `<button class="btn btn-danger" style="margin-top:10px; padding:10px; font-size:13px;" onclick="revoke(${i})">Отозвать вклад</button>` : ""}
            `;
            list.appendChild(card);
        }
    } catch (e) { console.error(e); }
}

window.invest = async (id) => {
    const input = document.getElementById(`invAmount_${id}`);
    const amt = input.value;
    if (!amt) return;
    try {
        const tx = await contract.investInTarget(id, ethers.utils.parseUnits(amt, 18));
        await tx.wait();
        updateData();
    } catch (e) { alert("Ошибка: " + (e.data?.message || e.message)); }
};

window.revoke = async (id) => {
    try {
        const tx = await contract.withdrawInvestment(id);
        await tx.wait();
        updateData();
    } catch (e) { alert("Ошибка"); }
};

window.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connectButton');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mintButton = document.getElementById('mintButton');
    const ethInput = document.getElementById('ethAmount');

    connectButton.onclick = async () => {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAddress = accounts[0];
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            welcomeScreen.style.display = 'none';
            document.getElementById('invest').classList.add('active');
            updateData();

            // СЛУШАТЕЛИ СОБЫТИЙ ДЛЯ ЛОГОВ
            contract.on("DonationReceived", (donor, eth, points, event) => {
                addLog("Покупка DP", donor, event.transactionHash);
                updateData();
            });
            contract.on("InvestmentMade", (investor, targetId, amount, event) => {
                addLog(`Вклад (Цель #${targetId})`, investor, event.transactionHash);
                updateData();
            });
            contract.on("InvestmentWithdrawn", (investor, targetId, amount, event) => {
                addLog(`Отзыв (Цель #${targetId})`, investor, event.transactionHash);
                updateData();
            });
        }
    };

    mintButton.onclick = async () => {
        const val = ethInput.value;
        if (!val) return;
        try {
            const tx = await contract.donate({ value: ethers.utils.parseEther(val) });
            await tx.wait();
            updateData();
        } catch (e) { console.error(e); }
    };
});
