Website: https://www.r2.money/

Alat tempur
- Install nodejs terbaru (https://nodejs.org/en/download)
- Install npm (https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- Open command/cmd pada folder
- Run npm install

Steps: 
1. Ubah file .env
- Ganti PRIVATE_KEY dengan pake Private Key lu

2. Ubah jumlah token yg mau diswap setiap mau transaksi
- Ganti AMOUNT_IN_USDC dengan jumlah token USDC yang mau lu swap (file swapUSDC-R2.js)
- Ganti AMOUNT_IN_R2 dengan jumlah token R2 yang mau lu swap (file swapR2-R2USD.js)

3. Run command
- node swapUSDC-R2.js
- node swapR2-R2USD.js

Add LP via uniswap (v2) lebih mudah tinggal add new LP lalu cari contract nya (CA ada file Contracts.txt), atau kalo udah Add LP cek aja di https://app.uniswap.org/positions

Misal pool address R2-R2USD: https://app.uniswap.org/positions/v2/ethereum_sepolia/0x9Ae18109692b43e95Ae6BE5350A5Acc5211FE9a1
