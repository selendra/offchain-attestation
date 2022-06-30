const express = require("express");
const bodyParse = require("body-parser");
const { config } = require("dotenv");
const { connect } = require("mongoose");
const path = require("path");
const cors = require("cors");
const { ethers } = require("ethers");
const CLAIM = require("./claims");

config({ path: path.join(__dirname, "./config/.env") });
const { db_name, db_user, db_pass, db_port, secret } = process.env;

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParse.json());

function isAuthorized(req) {
  // get signature from authoriztion header
  const authorization = req.headers.authorization || null;

  // unauthorized if no signature provided
  if (!authorization) {
    return { authorized: false, data: null };
  }

  try {
    // verify signature with secret to get user identity (publicKey)
    const publicKey = ethers.utils.verifyMessage(secret, authorization);

    if (!publicKey) {
      // unauthorized if verification failed
      return { authorized: false, data: null };
    }
    // authorized since all restrictions passed
    return { authorized: true, data: publicKey };
  } catch (error) {
    // authorized if there is an error during verification
    return { authorized: false, data: null };
  }
}

// Generate signature for user for putting in authorization header.
// Only use this if users don't have a signer or a wallet!!!

// Example request with curl:
// curl --location --request POST 'http://localhost:3001/sign' \
//      --header 'Content-Type: application/json' \
//      --data-raw '{
//        "privateKey": "0000000000000000000000000000000000000000000000000000000000000000"
//      }'
// output: > 0xdclkgjas.ldfhglkafngkljdfnglk;sdfhg;lkdjhfblkahdfeouighergkjhdfvkj,bsdfkjglbdfkjbsadfjkhgqeriughasdfjkgbsdfkjhgbdjkfblskjdfhgkjsdf

app.post("/sign", async (req, res) => {
  const { privateKey } = req.body;

  const signer = new ethers.Wallet(privateKey);
  const signature = await signer.signMessage(secret);

  res.json({ signature });
});

// List all attestations requested by a user (publicKey)
// where only the owner can see their data
// Example request with curl:
// curl --location --request GET 'http://localhost:3001/claims/user' \
//      --header 'Authorization: 0xdclkgjas.ldfhglkafngkljdfnglk;sdfhg;lkdjhfblkahdfeouighergkjhdfvkj,bsdfkjglbdfkjbsadfjkhgqeriughasdfjkgbsdfkjhgbdjkfblskjdfhgkjsdf'

app.get("/claims/user", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claims = await CLAIM.find({ to: auth.data });
  res.json(claims);
});

// List all attestations requested by a users
// within a organzation. Only org owner can get
// Example request with curl:
// curl --location --request GET 'http://localhost:3001/claims/org' \
//      --header 'Authorization: 0xdclkgjas.ldfhglkafngkljdfnglk;sdfhg;lkdjhfblkahdfeouighergkjhdfvkj,bsdfkjglbdfkjbsadfjkhgqeriughasdfjkgbsdfkjhgbdjkfblskjdfhgkjsdf'

app.get("/claims/org", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claims = await CLAIM.find({ attester: auth.data });
  res.json(claims);
});

// Create attestation request
// Example request with curl:
// curl --location --request POST 'http://localhost:3001/claims/create' \
//      --header 'Authorization: 0xdclkgjas.ldfhglkafngkljdfnglk;sdfhg;lkdjhfblkahdfeouighergkjhdfvkj,bsdfkjglbdfkjbsadfjkhgqeriughasdfjkgbsdfkjhgbdjkfblskjdfhgkjsdf' \
//      --header 'Content-Type: application/json' \
//      --data-raw '{
//        "ctypeId": 0,
//        "to": "0x0000000000000000000000000000000000000001",
//        "attester": "0x0000000000000000000000000000000000000002",
//        "name": "Staff ID",
//        "propertyURI": "https://gateway.kumandra.org/files/QmYNRH3BGW5pdHEoV9ybRQWt1Y1CYTHAfogBeWNirnN8DC",
//        "propertyURI": "https://gateway.kumandra.org/files/Qmxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
//        "propertyHash": "0x0000000000000000000000000000000000000000"
//      }'

app.post("/claims/create", async (req, res) => {
  const auth = isAuthorized(req);
  console.log(auth);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const body = req.body;

  console.log(req.body);
  if (auth.data !== body.to) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const claim = new CLAIM({ ...body });
  await claim.save();

  res.json(claim);
});

// Remove request. Can be done by both requester and attester
// Example request with curl:
// curl --location --request POST 'http://localhost:3001/claims/delete' \
//      --header 'Authorization: 0xdclkgjas.ldfhglkafngkljdfnglk;sdfhg;lkdjhfblkahdfeouighergkjhdfvkj,bsdfkjglbdfkjbsadfjkhgqeriughasdfjkgbsdfkjhgbdjkfblskjdfhgkjsdf' \
//      --header 'Content-Type: application/json' \
//      --data-raw '{
//          "id": "62bd3173edd35114d96f7c12"
//      }'

app.post("/claims/delete", async (req, res) => {
  const auth = isAuthorized(req);
  if (!auth.authorized) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  const toDelete = await CLAIM.findOne({ _id: req.body.id });

  if (!toDelete) {
    res.json({ status: "Error", message: "Target not found" });
    return;
  }

  if (toDelete.to !== auth.data && toDelete.attester !== auth.data) {
    res.status(401).json({ status: "Error", message: "Unauthorized" });
    return;
  }

  await CLAIM.findByIdAndDelete(req.body.id);

  res.send({ status: "Success", message: "Claim deleted" });
});

function main() {
  try {
    connect(`mongodb://${db_user}:${db_pass}@127.0.0.1:${db_port}/${db_name}`).then(() => {
      app.listen(3001, () => console.log("Server is running at: 3001"));
    });
  } catch (error) {
    console.log(error);
  }
}

main();
