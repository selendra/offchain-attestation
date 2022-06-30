# Offchain Attestation

With Selendra digital identity project document attestion is done by organizations (real lif authority).
To put attestation request into contract is very costly. This project registers attestion requests offchain,
so it is less costly and more convenient for requester and attester. All attesters have to do is to fetch
this to list request and import data to mint in web3. Once the document is created the document here will
be removed.

## Setup

1. Get things ready

```bash
git clone https://github.com/selendra/offchain-attestation.git
cd offchain-attestation
npm install
```

2. Setup datebase

```bash
cd config
cp sample.env .env
nano .env # edit env file and fill in the info needed
sudo ./start_db.sh
cd ..
```

3. Run the project in development mode

```bash
npm run dev
```

4. Run project in production

```bash
sudo npm install -g pm2
pm2 start index.js --name=offchain_attestation
pm2 --save
pm2 startup
```
