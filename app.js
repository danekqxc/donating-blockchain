
// 1. СЮДА НУЖНО ВСТАВИТЬ НОВЫЙ АДРЕС ПОСЛЕ DEPLOY В REMIX
const contractAddress = "0x41aF024C88D21FD2C3723827b3c7E0BE5517Db80";

const contractABI = [
    "function donate() public payable",
    "function investInTarget(uint256 _targetId, uint256 _amount) public",
    "function withdrawInvestment(uint256 _targetId) public",
    "function getTargetsCount() public view returns (uint256)",
    "function targets(uint256) public view returns (string name, uint256 investedAmount)",
    "function userInvestments(uint256, address) public view returns (uint256)",
    "function balanceOf(address) public view returns (uint256)",
    "function totalDonated(address) public view returns (uint256)",
    "function totalSupply() public view returns (uint256)"
];

let provider, signer, contract, userAddress;

window.switchPage = (id) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // Обновляем данные при переключении страниц
    updateData();
};

async function updateData() {
    if (!contract || !userAddress) return;
    try {
        console.log("Обновление данных...");
        const points = await contract.balanceOf(userAddress);
        const pointsFormatted = ethers.utils.formatUnits(points, 18);

        // Обновляем UI баллов
        const up = document.getElementById('userPoints');
        const fp = document.getElementById('freePoints');
        if(up) up.innerText = parseFloat(pointsFormatted).toFixed(0);
        if(fp) fp.innerText = parseFloat(pointsFormatted).toFixed(0);

        const eth = await contract.totalDonated(userAddress);
        const te = document.getElementById('totalEth');
        if(te) te.innerText = ethers.utils.formatEther(eth);

        const ua = document.getElementById('userAddress');
        if(ua) ua.innerText = userAddress;

        await loadTargets();
    } catch (e) {
        console.error("ОШИБКА UPDATE_DATA (Возможно, неверный адрес контракта):", e);
    }
}

async function loadTargets() {
    const list = document.getElementById('targetsList');
    if (!list || !contract) return;

    try {
        console.log("Загрузка целей инвестирования...");
        const count = await contract.getTargetsCount();
        console.log("Найдено целей:", count.toString());

        list.innerHTML = "";
        for (let i = 0; i < count; i++) {
            const t = await contract.targets(i);
            const userInv = await contract.userInvestments(i, userAddress);

            const card = document.createElement('div');
            card.className = 'card';
            card.style.border = "1px solid rgba(139, 92, 246, 0.3)";
            card.innerHTML = `
                <h3 style="margin-top:0; color: #c4b5fd;">${t.name}</h3>
                <div style="font-size:12px; color:#9ca3af; margin-bottom:10px;">Общий фонд: ${parseFloat(ethers.utils.formatUnits(t.investedAmount, 18)).toFixed(0)} DP</div>
                <div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 10px; font-weight:800; color:#10b981; margin-bottom:15px;">
                    Ваш вклад: ${parseFloat(ethers.utils.formatUnits(userInv, 18)).toFixed(0)} DP
                </div>

                <input type="number" id="invAmount_${i}" placeholder="Кол-во DP" style="padding: 10px; font-size: 14px;">
                <button class="btn btn-primary" style="padding: 10px; font-size: 13px;" onclick="invest(${i})">Вложить очки</button>
                ${userInv > 0 ? `<button class="btn btn-danger" style="margin-top:10px; padding: 10px; font-size: 13px;" onclick="revoke(${i})">Забрать вклад</button>` : ""}
            `;
            list.appendChild(card);
        }
    } catch (e) {
        console.error("ОШИБКА ЗАГРУЗКИ ЦЕЛЕЙ:", e);
        list.innerHTML = "<p style='color:red;'>Ошибка загрузки целей. Убедитесь, что вы развернули НОВЫЙ контракт и обновили адрес в app.js</p>";
    }
}

window.invest = async (id) => {
    const input = document.getElementById(`invAmount_${id}`);
    const amt = input.value;
    if (!amt || amt <= 0) return alert("Введите сумму");
    try {
        const tx = await contract.investInTarget(id, ethers.utils.parseUnits(amt, 18));
        await tx.wait();
        input.value = "";
        updateData();
    } catch (e) { alert("Ошибка: " + (e.data?.message || e.message)); }
};

window.revoke = async (id) => {
    try {
        const tx = await contract.withdrawInvestment(id);
        await tx.wait();
        updateData();
    } catch (e) { alert("Ошибка при отзыве"); }
};

window.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connectButton');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const mintButton = document.getElementById('mintButton');
    const ethInput = document.getElementById('ethAmount');

    connectButton.onclick = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                userAddress = accounts[0];
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                contract = new ethers.Contract(contractAddress, contractABI, signer);

                welcomeScreen.style.display = 'none';
                document.getElementById('invest').classList.add('active');
                updateData();
            } catch (e) { console.error(e); }
        } else { alert("Установите MetaMask"); }
    };

    mintButton.onclick = async () => {
        const val = ethInput.value;
        if (!val || val < 0.001) return alert("Минимум 0.001 ETH");
        try {
            const tx = await contract.donate({ value: ethers.utils.parseEther(val) });
            await tx.wait();
            ethInput.value = "";
            updateData();
        } catch (e) { console.error(e); }
    };
});
