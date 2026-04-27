from brownie import accounts, DonationToken, network

def deploy_contract():
    # Убедитесь, что вы добавили аккаунт: brownie accounts new my-account
    # Или используйте встроенные для тестов: accounts[0]
    try:
        if network.is_connected():
            print(f"Подключено к сети: {network.show_active()}")
        
        # Загрузка аккаунта
        # dev = accounts.load('my-account') 
        # Для локальных тестов (ganache):
        dev = accounts[0]

        # Деплой контракта DonationToken
        contract = DonationToken.deploy({"from": dev})

        print(f"Контракт успешно развернут по адресу: {contract.address}")
        return contract
    except Exception as e:
        print(f"Ошибка при деплое: {e}")

def main():
    deploy_contract()

if __name__ == "__main__":
    main()
